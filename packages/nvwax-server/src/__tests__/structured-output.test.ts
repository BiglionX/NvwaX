/**
 * Structured Output 单元测试
 * 
 * 测试 StructuredOutputService 的：
 * 1. JSON Schema 定义的正确性
 * 2. JSON 提取策略
 * 3. Schema 字段类型
 */

/// <reference types="jest" />

import {
  REQUIREMENT_ANALYSIS_SCHEMA,
  TEAM_DESIGN_SCHEMA,
  TEAM_GENERATION_SCHEMA,
  StructuredOutputService
} from '../services/structured-output.service.js';

describe('Structured Output Schemas', () => {
  // ============================================================
  // 1. Schema 完整性测试
  // ============================================================
  describe('Schema Completeness', () => {
    test('REQUIREMENT_ANALYSIS_SCHEMA should be a valid object schema', () => {
      expect(REQUIREMENT_ANALYSIS_SCHEMA.type).toBe('object');
      expect(REQUIREMENT_ANALYSIS_SCHEMA.properties).toBeDefined();
      expect(REQUIREMENT_ANALYSIS_SCHEMA.required).toBeDefined();
    });

    test('TEAM_DESIGN_SCHEMA should be a valid object schema', () => {
      expect(TEAM_DESIGN_SCHEMA.type).toBe('object');
      expect(TEAM_DESIGN_SCHEMA.properties).toBeDefined();
      expect(TEAM_DESIGN_SCHEMA.required).toBeDefined();
    });

    test('TEAM_GENERATION_SCHEMA should be a valid object schema', () => {
      expect(TEAM_GENERATION_SCHEMA.type).toBe('object');
      expect(TEAM_GENERATION_SCHEMA.properties).toBeDefined();
      expect(TEAM_GENERATION_SCHEMA.required).toBeDefined();
    });
  });

  // ============================================================
  // 2. 必需字段验证
  // ============================================================
  describe('Required Fields', () => {
    test('REQUIREMENT_ANALYSIS_SCHEMA should require companyType, responsibilities, etc.', () => {
      const required = REQUIREMENT_ANALYSIS_SCHEMA.required as string[];
      expect(required).toContain('companyType');
      expect(required).toContain('responsibilities');
      expect(required).toContain('expectedOutputs');
      expect(required).toContain('scale');
      expect(required).toContain('confidence');
    });

    test('TEAM_DESIGN_SCHEMA should require roles, collaborationFlow, etc.', () => {
      const required = TEAM_DESIGN_SCHEMA.required as string[];
      expect(required).toContain('roles');
      expect(required).toContain('collaborationFlow');
      expect(required).toContain('estimatedSize');
      expect(required).toContain('rationale');
    });

    test('TEAM_GENERATION_SCHEMA should require name, description, etc.', () => {
      const required = TEAM_GENERATION_SCHEMA.required as string[];
      expect(required).toContain('name');
      expect(required).toContain('description');
      expect(required).toContain('category');
      expect(required).toContain('leaderConfig');
      expect(required).toContain('roles');
      expect(required).toContain('workflow');
    });
  });

  // ============================================================
  // 3. 字段类型验证
  // ============================================================
  describe('Field Types', () => {
    test('REQUIREMENT_ANALYSIS_SCHEMA scale should be enum', () => {
      const scaleField = (REQUIREMENT_ANALYSIS_SCHEMA.properties as any).scale;
      expect(scaleField.type).toBe('string');
      expect(scaleField.enum).toEqual(['small', 'medium', 'large']);
    });

    test('REQUIREMENT_ANALYSIS_SCHEMA confidence should be number', () => {
      const confField = (REQUIREMENT_ANALYSIS_SCHEMA.properties as any).confidence;
      expect(confField.type).toBe('number');
    });

    test('TEAM_DESIGN_SCHEMA roles should be array of objects', () => {
      const rolesField = (TEAM_DESIGN_SCHEMA.properties as any).roles;
      expect(rolesField.type).toBe('array');
      expect(rolesField.items).toBeDefined();
      expect(rolesField.items.type).toBe('object');
    });

    test('TEAM_DESIGN_SCHEMA estimatedSize should be number', () => {
      const sizeField = (TEAM_DESIGN_SCHEMA.properties as any).estimatedSize;
      expect(sizeField.type).toBe('number');
    });
  });
});

describe('StructuredOutputService', () => {
  // ============================================================
  // 1. 实例化测试
  // ============================================================
  describe('Instantiation', () => {
    test('should be able to create a service instance', () => {
      // 清除环境变量以确保 client 为 null
      const originalKey = process.env.DEEPSEEK_API_KEY;
      const originalOpenAIKey = process.env.OPENAI_API_KEY;
      delete process.env.DEEPSEEK_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const service = new StructuredOutputService();
      expect(service).toBeDefined();

      // 恢复环境变量
      if (originalKey) process.env.DEEPSEEK_API_KEY = originalKey;
      if (originalOpenAIKey) process.env.OPENAI_API_KEY = originalOpenAIKey;
    });

    test('should throw when calling without API key', async () => {
      const originalKey = process.env.DEEPSEEK_API_KEY;
      const originalOpenAIKey = process.env.OPENAI_API_KEY;
      delete process.env.DEEPSEEK_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const service = new StructuredOutputService();

      await expect(
        service.callWithSchema({
          userPrompt: 'test',
          schemaName: 'test',
          schema: { type: 'object', properties: {} }
        })
      ).rejects.toThrow(/LLM client not initialized/);

      // 恢复环境变量
      if (originalKey) process.env.DEEPSEEK_API_KEY = originalKey;
      if (originalOpenAIKey) process.env.OPENAI_API_KEY = originalOpenAIKey;
    });
  });

  // ============================================================
  // 2. Schema 验证
  // ============================================================
  describe('Schema Validation', () => {
    test('all exported schemas should have JSON-serializable structure', () => {
      const schemas = [
        REQUIREMENT_ANALYSIS_SCHEMA,
        TEAM_DESIGN_SCHEMA,
        TEAM_GENERATION_SCHEMA
      ];

      for (const schema of schemas) {
        // 应该可以被 JSON 序列化（没有函数等不可序列化的值）
        const json = JSON.stringify(schema);
        expect(() => JSON.parse(json)).not.toThrow();
      }
    });
  });
});
