/**
 * PluginActionService
 * 
 * Agent Action 输出处理服务
 * 负责解析 LLM 输出的 Action、验证动作参数、生成插件感知提示词
 * 对应 PRD v2.0 章节 2.1、2.6
 */

import {
  AgentActionOutput,
  AgentDataQueryOutput,
  AgentMixedOutput,
  AgentOutput,
  PluginAction,
  PluginCapability,
  ActionValidationRequest,
  ActionValidationResponse
} from '../types/plugin-capabilities.types.js';
import { PLUGIN_ACTION_CONSTRAINT_PROMPT } from '../prompts/nvwax-agent-prompt.js';

export class PluginActionService {

  /**
   * 将插件能力列表注入系统提示词
   * 对应 PRD 2.2.2
   */
  injectPluginContext(systemPrompt: string, capabilities: PluginCapability[]): string {
    if (!capabilities || capabilities.length === 0) {
      return systemPrompt;
    }

    const actionDescriptions = this.buildActionListText(capabilities);
    const constraintPrompt = PLUGIN_ACTION_CONSTRAINT_PROMPT.replace(
      '{{availableActions}}',
      actionDescriptions
    );

    return `${systemPrompt}\n\n${constraintPrompt}`;
  }

  /**
   * 构建可供 LLM 识别的动作列表文本
   */
  private buildActionListText(capabilities: PluginCapability[]): string {
    return capabilities.map(cap => {
      const actionsText = cap.actions.map(action =>
        `  - ${action.name}: ${action.description || action.label}
    参数: ${this.formatParameters(action.parameters)}
    确认需要: ${action.confirm_required !== false ? '是' : '否'}`
      ).join('\n');

      const queriesText = (cap.data_queries || []).map(query =>
        `  - ${query.name}: ${query.description || ''}
    参数: ${this.formatParameters(query.parameters)}`
      ).join('\n');

      let text = `### ${cap.plugin_name} (${cap.plugin_id})`;

      if (actionsText) {
        text += `\n\n可用动作:\n${actionsText}`;
      }

      if (queriesText) {
        text += `\n\n数据查询:\n${queriesText}`;
      }

      return text;
    }).join('\n\n---\n\n');
  }

  /**
   * 格式化参数列表为 LLM 可读文本
   */
  private formatParameters(params: Record<string, any>): string {
    const entries = Object.entries(params || {});
    if (entries.length === 0) return '无';

    return entries.map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        const type = value.type || 'any';
        const desc = value.description || '';
        const required = value.required !== false ? '（必填）' : '（可选）';
        return `${key}(${type})${required}${desc ? ': ' + desc : ''}`;
      }
      return `${key}: ${value}`;
    }).join(', ');
  }

  /**
   * 从 LLM 回复文本中解析 Action 输出
   * 支持解析被 ```json ``` 包裹的 JSON、纯 JSON 或标记块
   */
  parseActionOutput(llmResponse: string): { text: string; outputs: AgentOutput[] } {
    const outputs: AgentOutput[] = [];
    let remainingText = llmResponse;

    // 尝试匹配 JSON 代码块
    const jsonBlockRegex = /```(?:json)?\s*({[\s\S]*?})\s*```/g;
    let match;

    while ((match = jsonBlockRegex.exec(llmResponse)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        const output = this.normalizeOutput(parsed);
        if (output) {
          outputs.push(output);
          // 从剩余文本中移除已解析的 JSON 块
          remainingText = remainingText.replace(match[0], '');
        }
      } catch (e) {
        console.warn('Failed to parse JSON block:', e);
      }
    }

    // 如果没有找到 JSON 块，尝试直接解析整个回复
    if (outputs.length === 0) {
      try {
        const parsed = JSON.parse(llmResponse.trim());
        const output = this.normalizeOutput(parsed);
        if (output) {
          outputs.push(output);
          remainingText = '';
        }
      } catch (e) {
        // 不是纯 JSON，视为文本回复
      }
    }

    return {
      text: remainingText.trim(),
      outputs
    };
  }

  /**
   * 将原始 JSON 归一化为标准 AgentOutput 类型
   */
  private normalizeOutput(parsed: any): AgentOutput | null {
    if (!parsed || !parsed.type) return null;

    switch (parsed.type) {
      case 'action':
        return {
          type: 'action',
          action_name: parsed.action_name || '',
          plugin_id: parsed.plugin_id,
          label: parsed.label || parsed.action_name || '',
          description: parsed.description,
          parameters: parsed.parameters || {},
          confirm_required: parsed.confirm_required,
          confirm_message: parsed.confirm_message,
          timeout_seconds: parsed.timeout_seconds,
          fallback_text: parsed.fallback_text
        } as AgentActionOutput;

      case 'data_query':
        return {
          type: 'data_query',
          query_name: parsed.query_name || '',
          parameters: parsed.parameters || {},
          reason: parsed.reason,
          plugin_id: parsed.plugin_id
        } as AgentDataQueryOutput;

      case 'mixed':
        if (parsed.parts && Array.isArray(parsed.parts)) {
          const normalizedParts = parsed.parts
            .map((part: any) => this.normalizeOutput(part))
            .filter((p: any): p is AgentOutput => p !== null);
          return {
            type: 'mixed',
            parts: normalizedParts
          } as AgentMixedOutput;
        }
        return null;

      case 'card':
        return {
          type: 'card',
          title: parsed.title || '',
          description: parsed.description,
          fields: parsed.fields,
          image_url: parsed.image_url,
          actions: parsed.actions
        };

      case 'text':
        return {
          type: 'text',
          content: parsed.content || ''
        };

      default:
        return null;
    }
  }

  /**
   * 验证动作是否符合插件能力定义
   * 对应 PRD 2.5.2
   */
  async validateAction(
    request: ActionValidationRequest,
    capability?: PluginCapability
  ): Promise<ActionValidationResponse> {
    const { action_name, parameters, plugin_id } = request;

    // 查找匹配的动作定义
    const matchedAction = capability?.actions.find(a => a.name === action_name);

    if (!matchedAction) {
      return {
        valid: false,
        action_name,
        plugin_id: plugin_id || capability?.plugin_id,
        required_params: [],
        provided_params: Object.keys(parameters || {}),
        missing_params: [],
        suggestions: [`动作 "${action_name}" 不在已注册的插件能力列表中`]
      };
    }

    // 验证必填参数
    const requiredParams = Object.entries(matchedAction.parameters || {})
      .filter(([_, def]) => {
        if (typeof def === 'object' && def !== null) {
          return def.required !== false;
        }
        return true;
      })
      .map(([key]) => key);

    const providedParams = Object.keys(parameters || {});
    const missingParams = requiredParams.filter(p => !providedParams.includes(p));

    // 生成建议
    const suggestions: string[] = [];
    if (missingParams.length > 0) {
      missingParams.forEach(p => {
        const paramDef = matchedAction.parameters[p];
        if (typeof paramDef === 'object' && paramDef !== null) {
          const type = paramDef.type || 'any';
          const desc = paramDef.description || '';
          suggestions.push(`请补充 ${p}（${type}）${desc ? ': ' + desc : ''}`);
        } else {
          suggestions.push(`请补充参数: ${p}`);
        }
      });
    }

    return {
      valid: missingParams.length === 0,
      plugin_id: plugin_id || capability?.plugin_id,
      action_name,
      required_params: requiredParams,
      provided_params: providedParams,
      missing_params: missingParams,
      suggestions
    };
  }

  /**
   * 生成 Function Calling 工具定义（供 OpenAI/DeepSeek API 使用）
   */
  generateFunctionTools(capabilities: PluginCapability[]): any[] {
    const tools: any[] = [];

    for (const cap of capabilities) {
      for (const action of cap.actions) {
        const properties: Record<string, any> = {};
        
        for (const [key, param] of Object.entries(action.parameters || {})) {
          if (typeof param === 'object' && param !== null) {
            properties[key] = {
              type: param.type || 'string',
              description: param.description || '',
              ...(param.enum ? { enum: param.enum } : {})
            };
          } else {
            properties[key] = { type: 'string', description: String(param) };
          }
        }

        tools.push({
          type: 'function',
          function: {
            name: `${cap.plugin_id}__${action.name}`,
            description: `[${cap.plugin_name}] ${action.description || action.label}`,
            parameters: {
              type: 'object',
              properties,
              required: Object.entries(action.parameters || {})
                .filter(([_, def]) => {
                  if (typeof def === 'object' && def !== null) {
                    return def.required !== false;
                  }
                  return true;
                })
                .map(([key]) => key)
            }
          }
        });
      }
    }

    return tools;
  }
}

export const pluginActionService = new PluginActionService();
