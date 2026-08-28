/**
 * DeepSeekAgent — agent-squad 子代理的 DeepSeek 实现
 * ------------------------------------------------------------
 * 继承 agent-squad 的 Agent 抽象类，processRequest 统一委托 LlmService
 * （复用其重试 / 退避 / 用量计量语义），确保编排层不旁路现有 LLM 底座。
 */

import { Agent, type AgentOptions, ParticipantRole, type ConversationMessage } from 'agent-squad';
import type { LlmService } from '../llm/llm.service.js';
import type { LlmMessage } from '../llm/llm.service.js';

export interface DeepSeekAgentOptions extends AgentOptions {
  /** 显式 id（agent-squad 默认由 name 生成，中文名会生成空串，必须显式指定） */
  id?: string;
  systemPrompt: string;
  llm: LlmService;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/** 将 agent-squad 的 content 数组（Bedrock 风格）归一化为纯文本 */
export function contentToText(content: any[] | undefined): string {
  if (!content) return '';
  return content
    .map((c) => {
      if (typeof c === 'string') return c;
      if (c && typeof c === 'object' && typeof c.text === 'string') return c.text;
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

export class DeepSeekAgent extends Agent {
  private readonly systemPrompt: string;
  private readonly llm: LlmService;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(options: DeepSeekAgentOptions) {
    super(options);
    if (options.id) {
      this.id = options.id; // 覆盖 name 生成的 id（中文名场景必须）
    }
    this.systemPrompt = options.systemPrompt;
    this.llm = options.llm;
    this.model = options.model ?? 'deepseek-v4-flash';
    this.temperature = options.temperature ?? 0.7;
    this.maxTokens = options.maxTokens ?? 2048;
  }

  async processRequest(
    inputText: string,
    _userId: string,
    _sessionId: string,
    chatHistory: ConversationMessage[],
    additionalParams?: Record<string, string>
  ): Promise<ConversationMessage> {
    const history: LlmMessage[] = chatHistory
      .filter((m) => m.role === ParticipantRole.USER || m.role === ParticipantRole.ASSISTANT)
      .map((m) => ({
        role: m.role === ParticipantRole.USER ? 'user' : 'assistant',
        content: contentToText(m.content),
      }));

    const contextNote = additionalParams?.context
      ? `\n\n[创建会话上下文]\n${additionalParams.context}`
      : '';

    const messages: LlmMessage[] = [
      { role: 'system', content: this.systemPrompt + contextNote },
      ...history,
      { role: 'user', content: inputText },
    ];

    const result = await this.llm.createCompletion({
      model: this.model,
      messages,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      purpose: 'team-generation',
    });

    return { role: ParticipantRole.ASSISTANT, content: [{ text: result.content }] };
  }
}
