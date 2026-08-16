/**
 * Structured Output Service
 * 
 * 替代 JSON 正则解析，使用 OpenAI/DeepSeek 的 response_format 能力
 * 确保 LLM 输出始终为合法 JSON 并符合预定义的 JSON Schema
 * 
 * 支持三种模式（按优先级降级）：
 * 1. json_schema mode - 最严格，API 强制输出符合 schema
 * 2. json_object mode - 中等，API 保证输出 JSON 但不约束 schema
 * 3. fallback mode - 兼容，正则提取 + 重试
 */

import { llmService } from './llm/llm.service.js';

// ============================================================
// JSON Schema 定义
// ============================================================

/** RequirementAnalysis 的 JSON Schema */
export const REQUIREMENT_ANALYSIS_SCHEMA = {
  type: 'object' as const,
  properties: {
    companyType: { type: 'string', description: '团队类型，如"小红书运营团队"、"营销团队"' },
    industry: { type: 'string', description: '行业背景' },
    responsibilities: {
      type: 'array',
      items: { type: 'string' },
      description: '主要职责列表'
    },
    expectedOutputs: {
      type: 'array',
      items: { type: 'string' },
      description: '期望产出类型列表'
    },
    targetUsers: { type: 'string', description: '目标用户群体' },
    specialRequirements: { type: 'string', description: '特殊要求和约束' },
    scale: { type: 'string', enum: ['small', 'medium', 'large'], description: '团队规模' },
    confidence: { type: 'number', description: '分析置信度 0-1' }
  },
  required: ['companyType', 'responsibilities', 'expectedOutputs', 'scale', 'confidence']
};

/** TeamRole 的 JSON Schema */
const TEAM_ROLE_SCHEMA = {
  type: 'object' as const,
  properties: {
    roleName: { type: 'string', description: '角色名称' },
    description: { type: 'string', description: '角色描述' },
    responsibilities: {
      type: 'array',
      items: { type: 'string' },
      description: '职责列表'
    },
    requiredSkills: {
      type: 'array',
      items: { type: 'string' },
      description: '所需技能列表'
    },
    priority: { type: 'string', enum: ['required', 'recommended', 'optional'], description: '优先级' }
  },
  required: ['roleName', 'description', 'responsibilities', 'requiredSkills', 'priority']
};

/** TeamDesign 的 JSON Schema */
export const TEAM_DESIGN_SCHEMA = {
  type: 'object' as const,
  properties: {
    roles: {
      type: 'array',
      items: TEAM_ROLE_SCHEMA,
      description: '团队角色列表，3-5 个核心角色'
    },
    collaborationFlow: { type: 'string', description: '协作流程描述' },
    estimatedSize: { type: 'number', description: '预估团队规模' },
    rationale: { type: 'string', description: '设计理由' }
  },
  required: ['roles', 'collaborationFlow', 'estimatedSize', 'rationale']
};

/** Team Generation (NvwaLeader) 的 JSON Schema */
export const TEAM_GENERATION_SCHEMA = {
  type: 'object' as const,
  properties: {
    name: { type: 'string', description: '团队名称' },
    description: { type: 'string', description: '团队描述' },
    category: { type: 'string', description: '团队类别' },
    leaderConfig: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        responsibilities: { type: 'array', items: { type: 'string' } }
      },
      required: ['name', 'responsibilities']
    },
    roles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          role: { type: 'string' },
          specialty: { type: 'string' },
          responsibilities: { type: 'array', items: { type: 'string' } },
          agent_type: { type: 'string' }
        },
        required: ['role', 'specialty', 'responsibilities']
      }
    },
    workflow: {
      type: 'object',
      properties: {
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              step: { type: 'number' },
              action: { type: 'string' },
              performed_by: { type: 'string' },
              output: { type: 'string' }
            },
            required: ['step', 'action', 'performed_by', 'output']
          }
        }
      },
      required: ['steps']
    },
    bindingRules: {
      type: 'object',
      properties: {
        communication_protocol: { type: 'string' },
        conflict_resolution: { type: 'string' },
        quality_standards: { type: 'string' }
      }
    }
  },
  required: ['name', 'description', 'category', 'leaderConfig', 'roles', 'workflow']
};

// ============================================================
// Structured Output 调用器
// ============================================================

export interface StructuredCallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  userPrompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
  userId?: string;
  maxRetries?: number;
}

export interface StructuredCallResult<T> {
  data: T;
  tokensUsed: number;
  model: string;
  mode: 'json_schema' | 'json_object' | 'fallback';
}

/**
 * Structured Output Service
 * 
 * 封装 LLM 调用 + JSON Schema 约束 + 自动重试逻辑
 */
export class StructuredOutputService {
  constructor() {
    if (llmService.isConfigured) {
      console.log('✅ StructuredOutput: DeepSeek API configured (via LlmService)');
    } else {
      console.warn('⚠️ StructuredOutput: DEEPSEEK_API_KEY not configured. Structured output disabled.');
    }
  }

  /**
   * 使用 JSON Schema 约束调用 LLM
   * 
   * 自动降级策略：
   * 1. json_schema mode（最严格）
   * 2. json_object mode（中等）
   * 3. fallback（正则提取 + 重试）
   */
  async callWithSchema<T>(options: StructuredCallOptions): Promise<StructuredCallResult<T>> {
    if (!llmService.isConfigured) {
      throw new Error('LLM client not initialized. Check DEEPSEEK_API_KEY or OPENAI_API_KEY.');
    }

    const {
      model = 'deepseek-v4-flash',
      temperature = 0.3,
      maxTokens = 2000,
      systemPrompt = '你是一个专业的 AI 助手，请严格按照要求的 JSON 格式输出。',
      userPrompt,
      schemaName,
      schema,
      maxRetries = 2
    } = options;

    // 尝试 json_schema 模式
    try {
      return await this.callJsonSchemaMode<T>({
        model, temperature, maxTokens,
        systemPrompt, userPrompt, schemaName, schema
      });
    } catch (error: any) {
      console.warn(`[StructuredOutput] json_schema mode failed: ${error.message}, trying json_object mode`);
    }

    // 降级到 json_object 模式
    try {
      return await this.callJsonObjectMode<T>({
        model, temperature, maxTokens,
        systemPrompt, userPrompt, schema
      });
    } catch (error: any) {
      console.warn(`[StructuredOutput] json_object mode failed: ${error.message}, trying fallback mode`);
    }

    // 最终降级：正则提取 + 重试
    return await this.callFallbackMode<T>({
      model, temperature, maxTokens,
      systemPrompt, userPrompt, schema,
      maxRetries
    });
  }

  /**
   * Mode 1: json_schema（API 强制输出符合 schema）
   */
  private async callJsonSchemaMode<T>(opts: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    userPrompt: string;
    schemaName: string;
    schema: Record<string, unknown>;
  }): Promise<StructuredCallResult<T>> {
    const result = await llmService.createCompletion({
      model: opts.model,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userPrompt }
      ],
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
      responseFormat: {
        type: 'json_schema',
        json_schema: {
          name: opts.schemaName,
          schema: opts.schema,
          strict: true
        }
      },
      purpose: 'structured'
    });

    const content = result.content;
    const tokensUsed = result.usage?.totalTokens || 0;

    if (!content) {
      throw new Error('Empty response from json_schema mode');
    }

    const data = JSON.parse(content) as T;

    return { data, tokensUsed, model: opts.model, mode: 'json_schema' };
  }

  /**
   * Mode 2: json_object（API 保证输出 JSON 但不约束 schema）
   */
  private async callJsonObjectMode<T>(opts: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    userPrompt: string;
    schema: Record<string, unknown>;
  }): Promise<StructuredCallResult<T>> {
    // 在 system prompt 中注入 schema 描述，引导 LLM 输出正确结构
    const schemaHint = `\n\n请严格按照以下 JSON 结构输出，不要包含任何额外文字：\n${JSON.stringify(opts.schema, null, 2)}`;

    const result = await llmService.createCompletion({
      model: opts.model,
      messages: [
        { role: 'system', content: opts.systemPrompt + schemaHint },
        { role: 'user', content: opts.userPrompt }
      ],
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
      responseFormat: { type: 'json_object' },
      purpose: 'structured'
    });

    const content = result.content;
    const tokensUsed = result.usage?.totalTokens || 0;

    if (!content) {
      throw new Error('Empty response from json_object mode');
    }

    const data = JSON.parse(content) as T;

    return { data, tokensUsed, model: opts.model, mode: 'json_object' };
  }

  /**
   * Mode 3: fallback（正则提取 + 重试）
   * 用于 API 完全不支持 response_format 的情况
   */
  private async callFallbackMode<T>(opts: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    userPrompt: string;
    schema: Record<string, unknown>;
    maxRetries: number;
  }): Promise<StructuredCallResult<T>> {
    const schemaHint = `\n\n你必须以合法的 JSON 格式输出，不要包含任何其他文字。JSON 结构示例：\n${JSON.stringify(opts.schema, null, 2)}`;
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: opts.systemPrompt + schemaHint },
      { role: 'user', content: opts.userPrompt }
    ];

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        const result = await llmService.createCompletion({
          model: opts.model,
          messages,
          temperature: opts.temperature,
          maxTokens: opts.maxTokens,
          purpose: 'structured'
        });

        const content = result.content;
        const tokensUsed = result.usage?.totalTokens || 0;

        if (!content) {
          throw new Error('Empty response');
        }

        // 多种 JSON 提取策略
        const jsonStr = this.extractJson(content);
        const data = JSON.parse(jsonStr) as T;

        if (attempt > 0) {
          console.log(`[StructuredOutput] Fallback succeeded on attempt ${attempt + 1}`);
        }

        return { data, tokensUsed, model: opts.model, mode: 'fallback' };
      } catch (error: any) {
        lastError = error;
        console.warn(`[StructuredOutput] Fallback attempt ${attempt + 1} failed: ${error.message}`);

        // 重试时在 user message 中追加纠正提示
        if (attempt < opts.maxRetries) {
          messages.push(
            { role: 'user', content: `之前的输出有错误: ${error.message}。请修正后重新输出，确保是合法的 JSON 格式。` }
          );
        }
      }
    }

    throw new Error(`[StructuredOutput] All ${opts.maxRetries + 1} attempts failed. Last error: ${lastError?.message}`);
  }

  /**
   * 从 LLM 响应中提取 JSON 字符串
   * 支持多种格式：纯 JSON、```json ... ```、``` ... ```
   */
  private extractJson(content: string): string {
    const trimmed = content.trim();

    // 策略 1：纯 JSON（以 { 或 [ 开头）
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return trimmed;
    }

    // 策略 2：```json ... ```
    const jsonBlockMatch = trimmed.match(/```json\s*\n?([\s\S]*?)\n?\s*```/);
    if (jsonBlockMatch) {
      return jsonBlockMatch[1].trim();
    }

    // 策略 3：``` ... ```
    const codeBlockMatch = trimmed.match(/```\s*\n?([\s\S]*?)\n?\s*```/);
    if (codeBlockMatch) {
      const inner = codeBlockMatch[1].trim();
      if (inner.startsWith('{') || inner.startsWith('[')) {
        return inner;
      }
    }

    // 策略 4：查找第一个 { 到最后一个 } 之间的内容
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return trimmed.substring(firstBrace, lastBrace + 1);
    }

    // 策略 5：查找第一个 [ 到最后一个 ] 之间的内容
    const firstBracket = trimmed.indexOf('[');
    const lastBracket = trimmed.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      return trimmed.substring(firstBracket, lastBracket + 1);
    }

    throw new Error('Could not extract JSON from response');
  }
}

// 导出单例
export const structuredOutputService = new StructuredOutputService();
