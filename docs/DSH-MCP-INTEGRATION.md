# NvwaX × DeepSeek Harness MCP 接入指南

> 目标：让 DSH 的 Agent 通过标准 MCP 协议调用 NvwaX 的 6 个能力工具。
> 交付物：`examples/dsh/nvwax-mcp.cordis.patch.yml`（DSH 侧配置）、`examples/dsh/nvwax-standard-mcp-server.ts`（NvwaX 侧标准 MCP 适配层模板）。
>
> ✅ **状态：NvwaX 侧已落地并验证通过**（见 [6. 实施记录](#6-实施记录)）；剩余步骤是 DSH 侧激活（[3. DSH 侧配置](#3-dsh-侧配置)）。

---

## 1. 先说结论：现状存在协议缺口

NvwaX 声称"遵循 Model Context Protocol 规范"（README v2.2.0），但实际实现（`packages/nvwax-server/src/mcp/nvwax-mcp-server.ts`）暴露的是**自定义 HTTP JSON 端点**：

| 端点 | 协议 |
|---|---|
| `POST /api/mcp/tools/list` | 自定义 JSON（非 MCP） |
| `POST /api/mcp/tools/call` | 自定义 JSON（非 MCP） |
| `GET /api/mcp/health` | 自定义 JSON |

而 DSH 的 `@deepseek-ai/dsh-mcp-client` 是**标准 MCP 客户端**，只支持两种标准传输：

- `stdio`（JSON-RPC over 子进程 stdio）
- `streamable-http`（JSON-RPC over HTTP POST，MCP 2025-03-26 规范）

**因此 DSH 无法直连 NvwaX 现有的 `/api/mcp/*`，必须在 NvwaX 侧加一层标准 MCP 适配。** 这是本指南的核心内容。

### 架构图

```
┌───────────────────────── DSH ─────────────────────────┐
│  dsh --profile web（或 headless）                      │
│   ├─ cordis.patch.yml: mcp-nvwax 条目                 │
│   │    └─ @deepseek-ai/dsh-mcp-client                 │
│   │         └─ serverName: nvwax                     │
│   └─ ctx.tools: mcp__nvwax__search_agents ...         │
└──────────────┬────────────────────────────────────────┘
               │ stdio / streamable-http（标准 MCP JSON-RPC）
┌──────────────▼────────────────────────────────────────┐
│  NvwaX nvwax-server（Express）                         │
│   ├─ /api/mcp/standard  ← 新增：standard-mcp-server.ts │
│   │    └─ McpServer (SDK) → MCPToolExecutor（复用）    │
│   └─ /api/mcp/*           ← 现有自定义端点（保留不动） │
│         └─ agent-registry / skill-matching / nvwax-agent / nvwax-memory │
└───────────────────────────────────────────────────────┘
```

---

## 2. NvwaX 侧改动（✅ 已实现）

> 以下改动已全部落地到 `packages/nvwax-server`，`pnpm --filter nvwax-server build` 通过，
> 端到端验证结果见 [6. 实施记录](#6-实施记录)。若在干净分支重做，按 2.1~2.5 执行即可。

### 2.1 安装标准 MCP SDK

```bash
pnpm --filter nvwax-server add @modelcontextprotocol/sdk   # 已装：^1.30.0
```

### 2.2 导出执行器（已改）

`packages/nvwax-server/src/mcp/nvwax-mcp-server.ts` 第 35 行：

```diff
- class MCPToolExecutor {
+ export class MCPToolExecutor {
```

### 2.3 标准 MCP 适配层（已创建）

`packages/nvwax-server/src/mcp/standard-mcp-server.ts`（完整实现；模板见
`examples/dsh/nvwax-standard-mcp-server.ts`）。两个关键实现要点：

1. **stateless 模式必须每请求新建 server + transport**（与 SDK 官方示例
   `simpleStatelessStreamableHttp` 一致）。复用单个 transport 实例会导致第一个请求
   之后的全部请求 500（本实现第一版踩过此坑）。
2. **SDK 1.x 的 `registerTool` 只接受 zod schema**（裸 JSON Schema 会类型报错），且
   `ZodRawShapeCompat` 是 zod3/zod4 双体系联合，直接传 shape 触发 TS2589
   （type instantiation excessively deep）→ 用 `z.object(shape)` + config 局部 `as any` 收敛。

### 2.4 挂载路由（已改）

`packages/nvwax-server/src/app.ts`：

```diff
  import { createMCPRouter } from './mcp/nvwax-mcp-server.js';
+ import { createStandardMCPRouter } from './mcp/standard-mcp-server.js';
  ...
  // v2.2.0 — MCP (Model Context Protocol) 端点，支持外部 Agent 框架调用
  app.use('/api/mcp', createMCPRouter());
+ // DSH 集成 — 标准 MCP streamable-http 端点
+ app.use('/api/mcp/standard', createStandardMCPRouter());
```

### 2.5 构建

```bash
pnpm --filter nvwax-server build
```

---

## 3. DSH 侧配置

### 3.1 在 profile 中安装 MCP 客户端插件

```bash
dsh plugin --profile web add @deepseek-ai/dsh-mcp-client
```

> `dsh plugin --profile <name> <pnpm args>` 会把 pnpm 命令转发到该 profile 目录
> （`%DSH_HOME%\profiles\web\`），插件装在 profile 自己的 node_modules 里。

### 3.2 写入 patch 配置

把 [`examples/dsh/nvwax-mcp.cordis.patch.yml`](../examples/dsh/nvwax-mcp.cordis.patch.yml) 的内容
追加到 `%DSH_HOME%\profiles\web\cordis.patch.yml`，或作为覆盖层临时加载：

```bash
dsh --profile web --patch ./examples/dsh/nvwax-mcp.cordis.patch.yml
```

核心条目（streamable-http 模式）：

```yaml
- insert:
    - id: mcp-nvwax
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: nvwax
        transport: streamable-http
        url: http://localhost:3001/api/mcp/standard
        toolCallTimeoutMs: 120000
        failOnStartupError: false
        reconnect:
          enabled: true
          initialDelayMs: 500
          maxDelayMs: 30000
          maxAttempts: 10
```

### 3.3 生效与验证

- **热更新**：保存 `cordis.patch.yml` 后 DSH 自动断连/重连 MCP server，无需重启进程（`serverName` 不变则工具名不变）。
- **工具命名**：模型看到的工具名为 `mcp__nvwax__search_agents`、`mcp__nvwax__design_team` 等，共 6 个。
- **日志**：应出现 `mcp-nvwax` 连接成功 + 工具同步条数。
- **端到端**：在 DSH Web GUI 发一条消息，如"用 nvwax_search_agents 帮我找内容策略类 Agent"，观察模型调用 `mcp__nvwax__*`。

---

## 4. 配置项速查（dsh-mcp-client）

| 字段 | 传输 | 必填 | 说明 |
|---|---|---|---|
| `transport` | 两者 | 是 | `stdio` 或 `streamable-http` |
| `serverName` | 两者 | 是 | 工具名前缀 `mcp__<serverName>__<rawName>`；`[A-Za-z0-9_-]{1,32}`，实例间唯一 |
| `command` | stdio | 是 | 子进程可执行文件（如 `node`） |
| `args` | stdio | 否 | 子进程参数（如 NvwaX 的 mcp-stdio 入口路径） |
| `env` | stdio | 否 | 合并到子进程环境的额外变量（`!!js process.env.X`） |
| `cwd` | stdio | 否 | 子进程工作目录 |
| `url` | http | 是 | MCP 端点 URL |
| `headers` | http | 否 | 额外请求头（如 `Authorization: !!js '`Bearer ${process.env.X}`'`） |
| `toolCallTimeoutMs` | 两者 | 否 | 单次 callTool 超时（默认 60000；NvwaX 建议 120000） |
| `failOnStartupError` | 两者 | 否 | 连接失败是否拒绝插件激活（默认 false：失败仅缺工具，DSH 照常可用） |
| `reconnect.*` | 两者 | 否 | 断线自动重连与指数退避（默认开启，上限 30s / 10 次） |

---

## 5. 常见问题

- **`mcp-nvwax` 日志报连接失败但 DSH 正常**：`failOnStartupError: false` 的预期行为；确认 NvwaX 服务已启动、URL/端口正确。
- **工具名重复**：同一 profile 下 `serverName` 必须唯一；两个 server 发布同名 raw tool 会在各自命名空间共存。
- **鉴权**：NvwaX 侧若给标准 MCP 端点加了 API Key 校验，DSH 侧用 `headers.Authorization` 传 Bearer token（token 放 `process.env.NVWAX_MCP_TOKEN`，不要写死在 yml）。
- **为什么不能直连现有 `/api/mcp/tools/call`**：那是自定义协议；标准 MCP 客户端只认 JSON-RPC 消息。协议缺口只能由 NvwaX 侧适配层补齐（步骤 2），没有捷径。
- **stdio 模式注意**：子进程生命周期由 DSH 管理，NvwaX server 与 DSH 需同机；进程崩溃后按 `reconnect.maxAttempts` 预算自动重启（连续失败 10 次后放弃并注销工具）。

---

## 6. 实施记录（NvwaX 侧已完成并验证）

### 6.1 改动的文件

| 文件 | 改动 |
|---|---|
| `packages/nvwax-server/package.json` | 新增依赖 `@modelcontextprotocol/sdk@^1.30.0` |
| `packages/nvwax-server/src/mcp/nvwax-mcp-server.ts` | `MCPToolExecutor` 加 `export`（一行） |
| `packages/nvwax-server/src/mcp/standard-mcp-server.ts` | **新增**：标准 MCP 适配层（zod 映射 + stateless router） |
| `packages/nvwax-server/src/app.ts` | 挂载 `/api/mcp/standard`（`createStandardMCPRouter`） |
| `packages/nvwax-server/src/types/express.d.ts` | 全局 Request 增强补 `sessionUser`（修复预存类型错误） |
| `packages/nvwax-server/src/services/payment.service.ts` | `apiVersion` 字符串对齐已安装 stripe 类型的联合（修复依赖漂移导致的类型错误） |
| `examples/dsh/nvwax-standard-mcp-server.ts` | 同步为最终实现（stateless + zod），作为独立模板 |

> 后两处是本次全量重装依赖（仓库 lockfile 与当前 pnpm 8.15 不兼容，被忽略后重新解析，
> 依赖版本发生漂移）暴露的**预存**类型错误，与 MCP 功能无关，但修掉后 `tsc` 才全绿。

### 6.2 端到端验证结果（标准 MCP 协议，HTTP）

启动 `node packages/nvwax-server/dist/app.js` 后，按 MCP streamable-http 协议实测：

| 调用 | 结果 |
|---|---|
| `GET /api/mcp/standard/health` | ✅ 200 `{"status":"ok","server":"nvwax-mcp","toolCount":6}` |
| `POST initialize`（2025-03-26） | ✅ 200 `{"result":{"protocolVersion":"2025-03-26","capabilities":{"tools":{"listChanged":true}},"serverInfo":{"name":"nvwax-mcp","version":"1.0.0"}}}` |
| `POST notifications/initialized` | ✅ 202 Accepted |
| `POST tools/list` | ✅ 200，返回 6 个工具（`nvwax_search_agents` / `nvwax_design_team` / `nvwax_match_skills` / `nvwax_analyze_requirements` / `nvwax_get_best_practices` / `nvwax_register_agent`），inputSchema 为标准 JSON Schema |
| `POST tools/call nvwax_search_agents` | ✅ 200，`{"result":{"content":[...],"jsonrpc":"2.0"}}`，真实调用 agent-registry 检索 |

### 6.3 DSH 侧激活（✅ 已在本机执行）

1. ✅ 插件已装入 profile：`C:\Users\Administrator\.dsh\profiles\web\node_modules\@deepseek-ai\dsh-mcp-client`（`0.1.0-rc.6`），`package.json` 已声明依赖。
2. ✅ `cordis.patch.yml` 已写入 `mcp-nvwax` 条目（`serverName: nvwax` → `http://localhost:3001/api/mcp/standard`），HMR 自动生效。
3. ✅ NvwaX server 已启动，且用 **MCP 官方 SDK 客户端**实测：`CONNECT OK` → 列出 6 个工具（`nvwax_search_agents` / `nvwax_design_team` / `nvwax_match_skills` / `nvwax_analyze_requirements` / `nvwax_get_best_practices` / `nvwax_register_agent`）→ `tools/call` 真实调用成功。

**使用**：在 DSH Web GUI 新建会话，模型即可调用 `mcp__nvwax__*` 工具；若在插件清单中未看到，检查 NvwaX server 是否在 3001 端口运行（`dsh plugin` 会话日志应有 `mcp-nvwax` 连接与 6 个工具同步记录）。
