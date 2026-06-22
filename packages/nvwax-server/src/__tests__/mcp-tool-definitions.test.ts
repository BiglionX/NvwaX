/**
 * MCP 工具定义单元测试
 * 
 * 测试 NvwaX MCP Tools 的：
 * 1. Tool Schema 完整性
 * 2. Tool 数量和命名
 * 3. Schema 字段有效性
 * 4. 必要参数验证
 */

/// <reference types="jest" />

import { NVWAX_MCP_TOOLS, getToolByName, getToolNames } from '../mcp/tool-definitions.js';

describe('Nvwax MCP Tool Definitions', () => {
  // ============================================================
  // 1. 基本结构测试
  // ============================================================
  describe('Tool List Structure', () => {
    test('should expose 6 MCP tools', () => {
      expect(NVWAX_MCP_TOOLS.length).toBe(6);
    });

    test('should have unique tool names', () => {
      const names = NVWAX_MCP_TOOLS.map(t => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    test('all tools should follow nvwax_ naming convention', () => {
      for (const tool of NVWAX_MCP_TOOLS) {
        expect(tool.name).toMatch(/^nvwax_/);
      }
    });
  });

  // ============================================================
  // 2. 单个 Tool 验证
  // ============================================================
  describe('Individual Tools', () => {
    test.each([
      'nvwax_search_agents',
      'nvwax_design_team',
      'nvwax_match_skills',
      'nvwax_analyze_requirements',
      'nvwax_get_best_practices',
      'nvwax_register_agent'
    ])('should define tool %s', (toolName: string) => {
      const tool = getToolByName(toolName);
      expect(tool).toBeDefined();
      expect(tool!.name).toBe(toolName);
      expect(tool!.description).toBeDefined();
      expect(tool!.inputSchema.type).toBe('object');
    });

    test('nvwax_search_agents should have query parameter as required', () => {
      const tool = getToolByName('nvwax_search_agents');
      expect(tool!.inputSchema.required).toContain('query');
    });

    test('nvwax_design_team should require team_type and responsibilities', () => {
      const tool = getToolByName('nvwax_design_team');
      expect(tool!.inputSchema.required).toContain('team_type');
      expect(tool!.inputSchema.required).toContain('responsibilities');
    });

    test('nvwax_match_skills should require required_skills array', () => {
      const tool = getToolByName('nvwax_match_skills');
      expect(tool!.inputSchema.required).toContain('required_skills');
    });

    test('nvwax_analyze_requirements should require user_input', () => {
      const tool = getToolByName('nvwax_analyze_requirements');
      expect(tool!.inputSchema.required).toContain('user_input');
    });

    test('nvwax_get_best_practices should require team_type', () => {
      const tool = getToolByName('nvwax_get_best_practices');
      expect(tool!.inputSchema.required).toContain('team_type');
    });

    test('nvwax_register_agent should require id, name, description, capabilities', () => {
      const tool = getToolByName('nvwax_register_agent');
      const required = tool!.inputSchema.required || [];
      expect(required).toContain('id');
      expect(required).toContain('name');
      expect(required).toContain('description');
      expect(required).toContain('capabilities');
    });
  });

  // ============================================================
  // 3. Schema 字段类型验证
  // ============================================================
  describe('Schema Field Types', () => {
    test('all properties should have type and description', () => {
      for (const tool of NVWAX_MCP_TOOLS) {
        for (const [propName, propSchema] of Object.entries(tool.inputSchema.properties)) {
          expect(propSchema.type).toBeDefined();
          expect(propSchema.description).toBeDefined();
          expect(['string', 'number', 'boolean', 'array', 'object']).toContain(propSchema.type);
        }
      }
    });

    test('array properties should have items schema', () => {
      for (const tool of NVWAX_MCP_TOOLS) {
        for (const [propName, propSchema] of Object.entries(tool.inputSchema.properties)) {
          if (propSchema.type === 'array') {
            expect(propSchema.items).toBeDefined();
            expect(propSchema.items!.type).toBeDefined();
          }
        }
      }
    });
  });

  // ============================================================
  // 4. 工具查询函数测试
  // ============================================================
  describe('Tool Query Functions', () => {
    test('getToolByName should return undefined for unknown tool', () => {
      const tool = getToolByName('unknown_tool');
      expect(tool).toBeUndefined();
    });

    test('getToolNames should return all tool names', () => {
      const names = getToolNames();
      expect(names.length).toBe(6);
      expect(names).toContain('nvwax_search_agents');
      expect(names).toContain('nvwax_design_team');
    });
  });

  // ============================================================
  // 5. 描述质量检查
  // ============================================================
  describe('Description Quality', () => {
    test('all tool descriptions should be in Chinese', () => {
      for (const tool of NVWAX_MCP_TOOLS) {
        // 至少包含一个中文字符
        expect(tool.description).toMatch(/[\u4e00-\u9fa5]/);
      }
    });

    test('all tool descriptions should be meaningful (>= 20 chars)', () => {
      for (const tool of NVWAX_MCP_TOOLS) {
        expect(tool.description.length).toBeGreaterThanOrEqual(20);
      }
    });

    test('all parameter descriptions should be in Chinese', () => {
      for (const tool of NVWAX_MCP_TOOLS) {
        for (const [propName, propSchema] of Object.entries(tool.inputSchema.properties)) {
          expect(propSchema.description).toMatch(/[\u4e00-\u9fa5]/);
        }
      }
    });
  });
});
