/**
 * DeepSeekClassifier — agent-squad 意图路由分类器的 DeepSeek 实现
 * ------------------------------------------------------------
 * 继承 agent-squad 的 Classifier 抽象类。classify() 父类流程：
 *   setHistory → updateSystemPrompt → processRequest
 *
 * 本实现不依赖框架的 XML 协议，直接让 DeepSeek 输出 JSON：
 *   {"agentId": "<子代理 id>", "confidence": 0-1}
 * 全部 LLM 调用委托 LlmService（统一重试/计量），LLM 不可用或解析失败时
 * 返回 selectedAgent=null，由 OrchestratorExecutor 走降级路径（A3 验收项）。
 */

import { Classifier, type ClassifierResult, type ConversationMessage } from 'agent-squad';
import type { LlmService } from '../llm/llm.service.js';
import { contentToText } from './deepseek-agent.service.js';

export interface DeepSeekClassifierOptions {
  llm: LlmService;
  modelId?: string;
  temperature?: number;
  /** 低于该置信度的匹配视为未命中（默认 0.5） */
  minConfidence?: number;
}

const SYSTEM_PROMPT_TEMPLATE = `你是 NvwaX「智能体创建流程」的路由分类器。

任务：根据用户输入，从下方候选子代理中选择最合适的一个，并评估置信度。

候选子代理：
{{AGENTS}}

路由决策规则（按优先级）：

【A. 强信号词 → team_architect】
当用户消息中包含以下"建/搭/创建/设计"等动作词之一，且与"公司/团队/Agent/虚拟公司/方案"等对象词搭配时，无论是否提及其他细节（包括"从零开始/什么还没做/整套/门店"等），都应判定为 team_architect（团队架构师），confidence ≥ 0.8：
- 动作词：建 / 搭建 / 创建 / 设计 / 组建 / 规划 / 成立 / 开（公司）
- 对象词：公司 / 团队 / 集团 / Agent / 智能体 / 虚拟公司 / 角色矩阵 / AiTeam

【B. 强需求不清 → requirements_analyst】
仅当用户输入完全没有"建团队"的明确动作，且需求信息明显残缺（不知道做什么、不知道需要几个 Agent、只知道有想法），才归为 requirements_analyst（需求分析员）。

【C. 闲聊 / 完全无法识别 → requirements_analyst】
当用户输入是闲聊（"你好/嗯嗯/hi/在吗"等），或属于任何候选子代理能力范围之外，输出 agentId 为 requirements_analyst（视为"需进一步澄清"），confidence 0.3-0.5。不要输出 agentId: null（null 会导致流程无路可走，requirements_analyst 作为兜底更友好）。

【D. 已有团队设计/匹配结果 → agent_matcher / document_writer】
当用户提到"团队设计好了/帮我匹配/找匹配的 Agent"等，归为 agent_matcher；提到"整理成文档/生成文档/交付说明"等，归为 document_writer。

输出规则：
1. 仅输出一个 JSON 对象：{"agentId": "...", "confidence": 0.0-1.0}
2. agentId 必须来自候选子代理的 id，不得捏造
3. 不得输出 JSON 以外的任何内容`;

export class DeepSeekClassifier extends Classifier {
  private readonly llm: LlmService;
  private readonly temperature: number;
  private readonly minConfidence: number;

  constructor(options: DeepSeekClassifierOptions) {
    super();
    this.llm = options.llm;
    this.modelId = options.modelId ?? 'deepseek-v4-flash';
    this.temperature = options.temperature ?? 0;
    this.minConfidence = options.minConfidence ?? 0.4;
  }

  async processRequest(
    inputText: string,
    chatHistory: ConversationMessage[]
  ): Promise<ClassifierResult> {
    const agentList = Object.values(this.agents)
      .map((a) => `- id: ${a.id}\n  名称: ${a.name}\n  职责: ${a.description}`)
      .join('\n');

    const historyText = chatHistory
      .map((m) => `${m.role === 'user' ? '用户' : '助手'}: ${contentToText(m.content)}`)
      .filter((s) => s.length > 0)
      .join('\n');

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT_TEMPLATE.replace('{{AGENTS}}', agentList) },
      ...(historyText
        ? [{ role: 'user' as const, content: `[对话历史]\n${historyText}` }]
        : []),
      { role: 'user' as const, content: `[用户输入]\n${inputText}\n\n请输出 JSON。` },
    ];

    let raw = '';
    try {
      const result = await this.llm.createCompletion({
        model: this.modelId,
        messages,
        temperature: this.temperature,
        responseFormat: { type: 'json_object' },
        purpose: 'structured',
      });
      raw = result.content;
    } catch (error: any) {
      console.warn(
        `[DeepSeekClassifier] LLM unavailable, degraded routing: ${error?.message ?? error}`
      );
      return { selectedAgent: null, confidence: 0 };
    }

    const parsed = safeParseJson(raw);
    const agentId = parsed && typeof parsed.agentId === 'string' ? parsed.agentId : null;
    const confidence =
      parsed && typeof parsed.confidence === 'number' ? clamp(parsed.confidence, 0, 1) : 0;

    if (!agentId || confidence < this.minConfidence) {
      // 低置信度 fallback：归到 requirements_analyst（"需进一步澄清"），避免流程无路可走
      // （除非 agentId 显式为 null 且 confidence 极低 < 0.2 才彻底视为未匹配）
      const fallback = this.getAgentById('requirements_analyst');
      if (fallback && (agentId === 'requirements_analyst' || confidence >= 0.2)) {
        if (agentId && agentId !== 'requirements_analyst') {
          console.warn(
            `[DeepSeekClassifier] agent "${agentId}" below minConfidence (${confidence.toFixed(2)}), fallback to requirements_analyst`
          );
        }
        return { selectedAgent: fallback, confidence };
      }
      return { selectedAgent: null, confidence };
    }

    const selectedAgent = this.getAgentById(agentId);
    if (!selectedAgent) {
      console.warn(`[DeepSeekClassifier] agentId "${agentId}" not registered, degraded`);
      return { selectedAgent: null, confidence: 0 };
    }

    return { selectedAgent, confidence };
  }
}

function safeParseJson(raw: string): { agentId?: unknown; confidence?: unknown } | null {
  const trimmed = raw.trim();
  // 容忍模型偶尔包裹 ```json ... ``` 或前后多余文本
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as { agentId?: unknown; confidence?: unknown };
  } catch {
    return null;
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
