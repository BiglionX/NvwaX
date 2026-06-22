/**
 * NvwaX MCP Server
 * 
 * MCP (Model Context Protocol) 服务端适配器
 * 将 NvwaX 的核心能力暴露为标准 MCP Tools
 * 
 * 支持的调用方式：
 * - HTTP POST /api/mcp/tools/list → 列出所有工具
 * - HTTP POST /api/mcp/tools/call → 调用指定工具
 */

import { Router, type Request, type Response } from 'express';
import { NVWAX_MCP_TOOLS, getToolByName } from './tool-definitions.js';
import { agentRegistryService } from '../services/agent-registry.service.js';
import { nvwaxAgentService } from '../services/nvwax-agent.service.js';
import { skillMatchingService } from '../services/skill-matching.service.js';
import { nvwaxMemoryService } from '../services/nvwax-memory.service.js';

// ============================================================
// MCP 响应格式
// ============================================================

interface MCPToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

// ============================================================
// Tool 执行器
// ============================================================

class MCPToolExecutor {
  
  /**
   * 执行 MCP Tool 调用
   */
  async execute(toolName: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    try {
      switch (toolName) {
        case 'nvwax_search_agents':
          return await this.executeSearchAgents(args);
        case 'nvwax_design_team':
          return await this.executeDesignTeam(args);
        case 'nvwax_match_skills':
          return await this.executeMatchSkills(args);
        case 'nvwax_analyze_requirements':
          return await this.executeAnalyzeRequirements(args);
        case 'nvwax_get_best_practices':
          return await this.executeGetBestPractices(args);
        case 'nvwax_register_agent':
          return await this.executeRegisterAgent(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
            isError: true
          };
      }
    } catch (error: any) {
      console.error(`[MCP] Tool execution failed: ${toolName}`, error);
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }

  // ============================================================
  // 各 Tool 执行实现
  // ============================================================

  /** nvwax_search_agents */
  private async executeSearchAgents(args: Record<string, unknown>): Promise<MCPToolResult> {
    const query = args.query as string;
    const capabilities = (args.capabilities as string[]) || [];
    const topK = (args.top_k as number) || 5;

    const results = await agentRegistryService.searchMatching(query, capabilities, topK);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          query,
          results: results.map(r => ({
            id: r.agent.id,
            name: r.agent.name,
            description: r.agent.description,
            capabilities: r.agent.capabilities,
            score: r.score,
            matchReason: r.matchReason
          }))
        }, null, 2)
      }]
    };
  }

  /** nvwax_design_team */
  private async executeDesignTeam(args: Record<string, unknown>): Promise<MCPToolResult> {
    const teamType = args.team_type as string;
    const responsibilities = (args.responsibilities as string[]) || [];
    const expectedOutputs = (args.expected_outputs as string[]) || [];
    const industry = args.industry as string | undefined;

    // 构建 RequirementAnalysis
    const requirements = {
      companyType: teamType,
      industry,
      responsibilities,
      expectedOutputs,
      scale: 'medium' as const,
      confidence: 0.9
    };

    const design = await nvwaxAgentService.designTeam(requirements);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          teamDesign: {
            roles: design.roles.map(r => ({
              roleName: r.roleName,
              description: r.description,
              responsibilities: r.responsibilities,
              requiredSkills: r.requiredSkills,
              priority: r.priority
            })),
            collaborationFlow: design.collaborationFlow,
            estimatedSize: design.estimatedSize,
            rationale: design.rationale
          }
        }, null, 2)
      }]
    };
  }

  /** nvwax_match_skills */
  private async executeMatchSkills(args: Record<string, unknown>): Promise<MCPToolResult> {
    const requiredSkills = (args.required_skills as string[]) || [];

    const results: Record<string, any> = {};
    
    // 并行搜索所有 skills
    const searchPromises = requiredSkills.map(async (skillName) => {
      try {
        const match = await skillMatchingService.searchSkill(skillName);
        return { skillName, match: match as any };
      } catch {
        return { skillName, match: { found: false, url: undefined, version: undefined } };
      }
    });

    const searchResults = await Promise.all(searchPromises);
    
    for (const { skillName, match } of searchResults) {
      results[skillName] = {
        found: match.found,
        url: match.url,
        version: match.version
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ success: true, skillMatches: results }, null, 2)
      }]
    };
  }

  /** nvwax_analyze_requirements */
  private async executeAnalyzeRequirements(args: Record<string, unknown>): Promise<MCPToolResult> {
    const userInput = args.user_input as string;

    const analysis = await nvwaxAgentService.analyzeRequirements(userInput);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          analysis: {
            companyType: analysis.companyType,
            industry: analysis.industry,
            responsibilities: analysis.responsibilities,
            expectedOutputs: analysis.expectedOutputs,
            targetUsers: analysis.targetUsers,
            specialRequirements: analysis.specialRequirements,
            scale: analysis.scale,
            confidence: analysis.confidence
          }
        }, null, 2)
      }]
    };
  }

  /** nvwax_get_best_practices */
  private async executeGetBestPractices(args: Record<string, unknown>): Promise<MCPToolResult> {
    const teamType = args.team_type as string;
    const limit = (args.limit as number) || 3;

    const practices = await nvwaxMemoryService.getBestPractices(teamType, limit);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          bestPractices: practices.map(p => ({
            teamType: p.teamType,
            pattern: p.pattern,
            description: p.description,
            confidence: p.confidence,
            occurrences: p.occurrences,
            avgSuccessScore: p.avgSuccessScore
          }))
        }, null, 2)
      }]
    };
  }

  /** nvwax_register_agent */
  private async executeRegisterAgent(args: Record<string, unknown>): Promise<MCPToolResult> {
    const agent = await agentRegistryService.register({
      id: args.id as string,
      name: args.name as string,
      description: args.description as string,
      capabilities: (args.capabilities as string[]) || [],
      keywords: (args.keywords as string[]) || [],
      source: 'api'
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          agent: {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            capabilities: agent.capabilities,
            source: agent.source
          }
        }, null, 2)
      }]
    };
  }
}

// ============================================================
// Express Router
// ============================================================

const executor = new MCPToolExecutor();

export function createMCPRouter(): Router {
  const router = Router();

  /**
   * POST /api/mcp/tools/list
   * 列出所有可用的 MCP Tools
   */
  router.post('/tools/list', (_req: Request, res: Response) => {
    res.json({
      tools: NVWAX_MCP_TOOLS.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema
      }))
    });
  });

  /**
   * POST /api/mcp/tools/call
   * 调用指定的 MCP Tool
   */
  router.post('/tools/call', async (req: Request, res: Response) => {
    const { name, arguments: args } = req.body;

    if (!name) {
      res.status(400).json({
        error: 'Missing tool name',
        availableTools: NVWAX_MCP_TOOLS.map(t => t.name)
      });
      return;
    }

    const tool = getToolByName(name);
    if (!tool) {
      res.status(404).json({
        error: `Tool not found: ${name}`,
        availableTools: NVWAX_MCP_TOOLS.map(t => t.name)
      });
      return;
    }

    // 验证必需参数
    if (tool.inputSchema.required) {
      for (const requiredParam of tool.inputSchema.required) {
        if (!args || !(requiredParam in args)) {
          res.status(400).json({
            error: `Missing required parameter: ${requiredParam}`,
            tool: name,
            requiredParams: tool.inputSchema.required
          });
          return;
        }
      }
    }

    // 执行 Tool
    const result = await executor.execute(name, args || {});
    
    if (result.isError) {
      res.status(500).json(result);
    } else {
      res.json(result);
    }
  });

  /**
   * GET /api/mcp/health
   * MCP 服务健康检查
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      toolCount: NVWAX_MCP_TOOLS.length,
      tools: NVWAX_MCP_TOOLS.map(t => t.name),
      timestamp: new Date().toISOString()
    });
  });

  return router;
}

export default createMCPRouter;
