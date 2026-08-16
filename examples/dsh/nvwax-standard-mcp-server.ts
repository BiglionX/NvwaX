/**
 * NvwaX 标准 MCP 适配层（示例）
 * ------------------------------------------------------------
 * 背景：packages/nvwax-server/src/mcp/nvwax-mcp-server.ts 暴露的
 *   POST /api/mcp/tools/list、POST /api/mcp/tools/call 是【自定义 HTTP JSON 协议】，
 *   不是 Model Context Protocol 标准传输。DeepSeek Harness 的 dsh-mcp-client
 *   是标准 MCP 客户端（stdio / streamable-http + JSON-RPC），无法直连现有端点。
 *
 * 本文件把现有的 MCPToolExecutor（6 个 NvwaX 能力工具）包装成标准 MCP server：
 *   - HTTP 模式：StreamableHTTPServerTransport，挂载为 POST/GET/DELETE /api/mcp/standard
 *   - stdio 模式：StdioServerTransport，供 dsh-mcp-client 以子进程方式拉起
 *
 * ⚠ 已落地：本文件的完整版已实现于
 *   packages/nvwax-server/src/mcp/standard-mcp-server.ts（已挂载 /api/mcp/standard
 *   并验证通过），此示例保留为独立模板/参考。两处关键实现要点：
 *   1. stateless 模式必须【每请求新建 server + transport】（复用单实例会导致后续请求 500）；
 *   2. SDK 1.x 的 registerTool 只接受 zod schema（不接受裸 JSON Schema），且
 *      ZodRawShapeCompat 是 zod3/zod4 双体系联合，直接传 shape 会触发 TS2589，
 *      需用 z.object(shape) + config 局部 as any 收敛。
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Router, type Request, type Response } from 'express';
import { NVWAX_MCP_TOOLS, type MCPPropertySchema } from './tool-definitions.js';
import { MCPToolExecutor } from './nvwax-mcp-server.js';

// ============================================================
// 标准 MCP Server（一次构建，HTTP / stdio 两个入口共用）
// ============================================================

const MCP_SERVER_NAME = 'nvwax-mcp';
const MCP_SERVER_VERSION = '1.0.0';

/**
 * 把 tool-definitions.ts 的 JSON Schema（MCPPropertySchema）映射为 zod schema。
 * SDK 1.x 的 registerTool 只接受 zod schema 或「值为 zod schema 的对象」（ZodRawShapeCompat），
 * 不接受裸 JSON Schema 对象，因此需要这一层映射（保留 required / enum / 嵌套结构）。
 */
function zodFromPropertySchema(prop: MCPPropertySchema): z.ZodTypeAny {
  switch (prop.type) {
    case 'string':
      return prop.enum && prop.enum.length > 0
        ? z.enum(prop.enum as [string, ...string[]])
        : z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'array':
      return z.array(prop.items ? zodFromPropertySchema(prop.items) : z.unknown());
    case 'object':
      return z.object(
        Object.fromEntries(
          Object.entries(prop.properties ?? {}).map(([key, value]) => [key, zodFromPropertySchema(value)])
        )
      );
    default:
      return z.unknown();
  }
}

function zodShapeFromToolSchema(
  tool: (typeof NVWAX_MCP_TOOLS)[number]
): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, prop] of Object.entries(tool.inputSchema.properties ?? {})) {
    const schema = zodFromPropertySchema(prop);
    shape[key] = tool.inputSchema.required?.includes(key) ? schema : schema.optional();
  }
  return shape;
}

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });

  const executor = new MCPToolExecutor();

  // 把 6 个 NvwaX 能力工具注册为标准 MCP Tools（inputSchema 为 zod object schema）。
  // 注：SDK 的 registerTool 泛型基于 zod3/zod4 双体系联合（AnySchema），对
  // z.object(shape) 推断会触发 TS2589（type instantiation excessively deep），
  // 故对 config 做局部 as any 收敛推断；运行时行为不受影响。
  for (const tool of NVWAX_MCP_TOOLS) {
    const toolConfig = {
      title: tool.name,
      description: tool.description,
      inputSchema: z.object(zodShapeFromToolSchema(tool)),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    server.registerTool(
      tool.name,
      toolConfig,
      async (args: Record<string, unknown>) => {
        const result = await executor.execute(tool.name, args ?? {});
        // MCPToolExecutor 的返回结构（content: [{type:'text',text}]）与标准
        // CallToolResult 兼容；isError 缺省时按 false 处理。
        return {
          content: result.content as Array<{ type: 'text'; text: string }>,
          ...(result.isError ? { isError: true as const } : {}),
        };
      }
    );
  }

  return server;
}

// ============================================================
// HTTP 入口：StreamableHTTPServerTransport（推荐，跨机器可用）
// ============================================================

export function createStandardMCPRouter(): Router {
  const router = Router();

  // stateless 模式：每个请求新建 server + transport（与 SDK 官方示例
  // simpleStatelessStreamableHttp 一致）。复用单个实例会导致后续请求 500。
  const handle = async (req: Request, res: Response) => {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless：无会话 ID
      enableJsonResponse: true,
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on('close', () => {
        void transport.close().catch(() => undefined);
        void server.close().catch(() => undefined);
      });
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: err?.message ?? 'MCP transport error' },
          id: null,
        });
      }
    }
  };

  // MCP streamable-http：POST 承载全部 JSON-RPC 消息；
  // GET/DELETE 官方 stateless 示例返回 405（本端点不提供 SSE 流）。
  router.post('/', handle);
  router.get('/', (_req: Request, res: Response) => {
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    }));
  });
  router.delete('/', (_req: Request, res: Response) => {
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    }));
  });

  // 健康检查（便于排查）
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', server: MCP_SERVER_NAME, toolCount: NVWAX_MCP_TOOLS.length });
  });

  return router;
}

// ============================================================
// stdio 入口：StdioServerTransport（同机部署备选）
// ------------------------------------------------------------
// 如需 stdio 模式，创建 packages/nvwax-server/src/mcp/mcp-stdio.ts：
//
//   import { createMcpServer } from './standard-mcp-server.js';
//   import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
//
//   const server = createMcpServer();
//   await server.connect(new StdioServerTransport());
//
// 构建后 DSH 侧用 stdio 传输拉起（配置见 examples/dsh/nvwax-mcp.cordis.patch.yml 方案二）。
// ============================================================

export { StdioServerTransport };
