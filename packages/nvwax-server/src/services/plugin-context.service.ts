/**
 * PluginContextService
 * 
 * 插件上下文处理服务
 * 负责将插件能力信息转换为 LLM 可读的系统提示词和 function calling 工具
 * 对应 PRD v2.0 章节 2.2
 */

import { PluginCapability, PluginAction, PluginDataQuery } from '../types/plugin-capabilities.types.js';

export class PluginContextService {

  /**
   * 将插件能力列表转换为系统提示词文本
   * 对应 PRD 2.2.2
   */
  generateSystemPrompt(capabilities: PluginCapability[]): string {
    if (!capabilities || capabilities.length === 0) {
      return '';
    }

    const sections = capabilities.map((cap, index) => {
      return this.generateCapabilitySection(cap, index + 1);
    });

    return [
      '## 已安装的行业插件',
      '',
      '你所在的环境已安装以下行业插件，你可以使用这些插件提供的能力来帮助用户：',
      '',
      sections.join('\n\n'),
      '',
      '### 使用规则',
      '',
      '1. 当用户的需求涉及上述插件功能时，使用 action 或 data_query 输出类型',
      '2. 动作参数必须填写完整，缺少必填参数时需要先向用户询问',
      '3. 对用户有财务影响的操作（如创建订单、付款等），请将 confirm_required 设为 true',
      '4. 如果需要查询插件中的数据，使用 data_query 类型',
      '5. 可以在同一轮回复中混合使用文本、action、data_query',
      '6. 切勿捏造不存在的动作名称或参数'
    ].join('\n');
  }

  /**
   * 生成单个插件的能力描述段落
   */
  private generateCapabilitySection(cap: PluginCapability, index: number): string {
    const lines: string[] = [
      `### ${index}. ${cap.plugin_name} (${cap.plugin_id})`,
      ''
    ];

    if (cap.actions.length > 0) {
      lines.push('**可执行动作：**');
      cap.actions.forEach(action => {
        lines.push(`- **${action.name}**: ${action.description || action.label}`);
        const paramKeys = Object.keys(action.parameters || {});
        if (paramKeys.length > 0) {
          lines.push(`  - 参数: ${paramKeys.map(k => {
            const def = action.parameters[k];
            if (typeof def === 'object' && def !== null) {
              const type = (def as any).type || 'string';
              const required = (def as any).required !== false ? '必填' : '可选';
              const desc = (def as any).description || '';
              return `${k}(${type}, ${required})${desc ? ': ' + desc : ''}`;
            }
            return `${k}: ${String(def)}`;
          }).join('; ')}`);
        }
      });
    }

    if (cap.data_queries && cap.data_queries.length > 0) {
      lines.push('');
      lines.push('**数据查询：**');
      cap.data_queries.forEach(query => {
        lines.push(`- **${query.name}**: ${query.description || ''}`);
        if (query.returns) {
          lines.push(`  - 返回: ${query.returns}`);
        }
      });
    }

    return lines.join('\n');
  }

  /**
   * 生成 Function Calling 可用的 action 列表
   * 返回 OpenAI/DeepSeek 兼容的 tool 定义
   */
  generateActionList(capabilities: PluginCapability[]): any[] {
    const tools: any[] = [];

    for (const cap of capabilities) {
      for (const action of cap.actions) {
        tools.push({
          type: 'function',
          function: {
            name: `${cap.plugin_id}.${action.name}`,
            description: `[${cap.plugin_name}] ${action.description || action.label}`,
            parameters: {
              type: 'object',
              properties: this.buildParameterProperties(action.parameters),
              required: this.getRequiredParams(action.parameters)
            }
          }
        });
      }
    }

    return tools;
  }

  /**
   * 生成输出格式约束文本
   */
  buildOutputConstraints(): string {
    return [
      '## 输出格式约束',
      '',
      '你的回复可以包含以下输出类型（使用 ```json 代码块包裹）：',
      '',
      '### 1. Action 输出',
      '```json',
      JSON.stringify({
        type: 'action',
        action_name: '动作名称',
        plugin_id: '插件ID',
        label: 'UI标签',
        description: '描述',
        parameters: { key: 'value' },
        confirm_required: true,
        confirm_message: '确认消息'
      }, null, 2),
      '```',
      '',
      '### 2. 数据查询输出',
      '```json',
      JSON.stringify({
        type: 'data_query',
        query_name: '查询名称',
        parameters: {},
        reason: '查询原因'
      }, null, 2),
      '```',
      '',
      '### 3. 组合输出',
      '```json',
      JSON.stringify({
        type: 'mixed',
        parts: [
          { type: 'text', content: '说明文字' },
          { type: 'action', action_name: '...', plugin_id: '...', parameters: {} }
        ]
      }, null, 2),
      '```'
    ].join('\n');
  }

  /**
   * 解析 X-Plugin-Capabilities header 值
   * 从 JSON 字符串解析为 PluginCapability 数组
   */
  parseHeaderValue(headerValue: string): PluginCapability[] {
    if (!headerValue || headerValue.trim() === '') {
      return [];
    }

    try {
      const parsed = JSON.parse(headerValue);
      if (Array.isArray(parsed)) {
        return parsed as PluginCapability[];
      }
      // 如果 header 直接包含单个能力对象，包装成数组
      if (parsed.plugin_id) {
        return [parsed as PluginCapability];
      }
      console.warn('X-Plugin-Capabilities header format invalid: expected array or object with plugin_id');
      return [];
    } catch (e) {
      console.warn('Failed to parse X-Plugin-Capabilities header:', e);
      return [];
    }
  }

  /**
   * 构建参数属性（供 OpenAI function calling 使用）
   */
  private buildParameterProperties(parameters: Record<string, any>): Record<string, any> {
    const properties: Record<string, any> = {};

    for (const [key, param] of Object.entries(parameters || {})) {
      if (typeof param === 'object' && param !== null) {
        properties[key] = {
          type: param.type || 'string',
          description: param.description || '',
          ...(param.enum ? { enum: param.enum } : {}),
          ...(param.default !== undefined ? { default: param.default } : {})
        };
      } else {
        properties[key] = { type: 'string', description: String(param) };
      }
    }

    return properties;
  }

  /**
   * 获取必填参数列表
   */
  private getRequiredParams(parameters: Record<string, any>): string[] {
    return Object.entries(parameters || {})
      .filter(([_, def]) => {
        if (typeof def === 'object' && def !== null) {
          return def.required !== false;
        }
        return true;
      })
      .map(([key]) => key);
  }
}

export const pluginContextService = new PluginContextService();
