#!/usr/bin/env node
/**
 * Leader Skill MCP Server
 *
 * 通过 Model Context Protocol (MCP) 暴露 Leader Skill 给外部 Agent。
 *
 * 用法：
 *   npx nvwax-mcp-server --bundle marketing-bundle
 *   或
 *   node leader-skill-mcp.js
 *
 * 通信协议：stdin/stdout 上的 JSON-RPC 2.0
 *
 * 支持的方法（MCP 标准）：
 *   - initialize：握手
 *   - tools/list：列出可用 tools（每个 skill 对应一个 tool）
 *   - tools/call：调用某个 tool
 *
 * 工具：
 *   - route_leader_skill：根据需求路由到最匹配的 leader skill
 *   - get_leader_skill：获取 leader skill 详情
 *   - list_leader_skills：列出所有可用 leader skills
 *   - execute_leader_skill：执行编排（返回 leader 的决策）
 *
 * 设计参考：
 * - docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md §5.1
 * - https://modelcontextprotocol.io
 */

import { createInterface } from 'readline';
import { leaderSkillService } from '../agents/hermes-leader-agent.js';

// ============================================================
// 配置
// ============================================================

const LEADER_BACKEND_URL = process.env.LEADER_BACKEND_URL || 'http://localhost:3001';
const SERVER_NAME = 'nvwax-leader-skill-mcp';
const SERVER_VERSION = '1.0.0';
const PROTOCOL_VERSION = '2024-11-05';

// ============================================================
// JSON-RPC 2.0 处理
// ============================================================

/**
 * 处理 JSON-RPC 请求
 */
async function handleRequest(request) {
  const { id, method, params } = request;

  try {
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: PROTOCOL_VERSION,
            serverInfo: {
              name: SERVER_NAME,
              version: SERVER_VERSION
            },
            capabilities: {
              tools: {}
            }
          }
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              {
                name: 'route_leader_skill',
                description: '根据用户需求描述，从 Leader Skills 中路由出最匹配的一个。返回 skillId、name、matchScore、matchReason。',
                inputSchema: {
                  type: 'object',
                  properties: {
                    requirement: {
                      type: 'string',
                      description: '用户需求描述'
                    },
                    topK: {
                      type: 'number',
                      description: '返回前 K 个候选，默认 3'
                    },
                    category: {
                      type: 'string',
                      description: '可选的分类过滤（marketing / development / design / customer-service / analysis / general）'
                    }
                  },
                  required: ['requirement']
                }
              },
              {
                name: 'get_leader_skill',
                description: '获取指定 leader skill 的详细信息（含 system prompt、职责、决策规则等）',
                inputSchema: {
                  type: 'object',
                  properties: {
                    skillId: {
                      type: 'string',
                      description: 'Leader Skill 的 skillId'
                    }
                  },
                  required: ['skillId']
                }
              },
              {
                name: 'list_leader_skills',
                description: '列出所有可用的 Leader Skills（按 category / bundle 过滤）',
                inputSchema: {
                  type: 'object',
                  properties: {
                    category: { type: 'string' },
                    bundle: { type: 'string' },
                    limit: { type: 'number', default: 20 }
                  }
                }
              },
              {
                name: 'execute_leader_skill',
                description: '执行编排：给定需求，调用 leader skill 并返回完整响应（包含 system prompt 注入 + LLM 决策）',
                inputSchema: {
                  type: 'object',
                  properties: {
                    requirement: {
                      type: 'string',
                      description: '用户需求描述'
                    },
                    sessionId: {
                      type: 'string',
                      description: '会话 ID（可选，用于轨迹追踪）'
                    },
                    teamContext: {
                      type: 'object',
                      description: '团队上下文（如团队名、行业等）'
                    }
                  },
                  required: ['requirement']
                }
              }
            ]
          }
        };

      case 'tools/call':
        return await handleToolCall(id, params);

      case 'ping':
        return {
          jsonrpc: '2.0',
          id,
          result: {}
        };

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          }
        };
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: `Internal error: ${error.message}`,
        data: { stack: error.stack }
      }
    };
  }
}

/**
 * 处理 tool 调用
 */
async function handleToolCall(id, params) {
  const { name, arguments: args = {} } = params;

  try {
    switch (name) {
      case 'route_leader_skill':
        return await callBackend(id, '/api/leader-skills/route', {
          requirement: args.requirement,
          topK: args.topK || 3,
          category: args.category,
          useLLMReranking: true
        });

      case 'get_leader_skill':
        return await callBackend(id, `/api/leader-skills/${args.skillId}`, {}, 'GET');

      case 'list_leader_skills':
        const queryParams = new URLSearchParams();
        if (args.category) queryParams.set('category', args.category);
        if (args.bundle) queryParams.set('bundle', args.bundle);
        if (args.limit) queryParams.set('limit', String(args.limit));
        return await callBackend(id, `/api/leader-skills?${queryParams}`, {}, 'GET');

      case 'execute_leader_skill':
        return await executeLeaderSkill(id, args);

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32602,
            message: `Unknown tool: ${name}`
          }
        };
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: `Tool execution failed: ${error.message}`
      }
    };
  }
}

/**
 * 执行 leader skill 编排
 */
async function executeLeaderSkill(id, args) {
  // 通过 hermes-leader-agent 的 orchestrate 方法
  const result = await leaderSkillService.orchestrate({
    requirement: args.requirement,
    sessionId: args.sessionId || `mcp-${Date.now()}`,
    teamContext: args.teamContext || {}
  });

  return {
    jsonrpc: '2.0',
    id,
    result: {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            selectedSkillId: result.selectedSkillId,
            selectedSkillName: result.selectedSkillName,
            matchScore: result.matchScore,
            matchReason: result.matchReason,
            leaderDecision: result.leaderDecision,
            candidates: result.candidates,
            reflectionsUsed: result.reflectionsUsed,
            latencyMs: result.latencyMs
          }, null, 2)
        }
      ]
    }
  };
}

/**
 * 调用后端 API
 */
async function callBackend(id, path, body = {}, method = 'POST') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const fetchOptions = {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    };
    if (method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${LEADER_BACKEND_URL}${path}`, fetchOptions);
    clearTimeout(timer);

    if (!response.ok) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: `Backend ${path} failed: ${response.status}`
        }
      };
    }

    const data = await response.json();
    return {
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data.data || data, null, 2)
          }
        ]
      }
    };
  } catch (error) {
    clearTimeout(timer);
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: `Backend call failed: ${error.message}`
      }
    };
  }
}

// ============================================================
// stdin/stdout 通信
// ============================================================

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

console.error(`[MCP] ${SERVER_NAME} v ${SERVER_VERSION} starting...`);
console.error(`[MCP] Backend: ${LEADER_BACKEND_URL}`);

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const request = JSON.parse(trimmed);
    const response = await handleRequest(request);
    console.log(JSON.stringify(response));
  } catch (error) {
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: `Parse error: ${error.message}`
      }
    };
    console.log(JSON.stringify(errorResponse));
  }
});

rl.on('close', () => {
  console.error('[MCP] stdin closed, exiting...');
  process.exit(0);
});

// 导出供测试用
export { handleRequest, handleToolCall, SERVER_NAME, SERVER_VERSION };