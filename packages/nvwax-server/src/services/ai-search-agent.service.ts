import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { agentSearchService, Agent } from './agent-search.service.js';

/**
 * AI 搜索会话
 */
export interface SearchSession {
  id: string;
  messages: SearchMessage[];
  context: SearchContext;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 搜索对话消息
 */
export interface SearchMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  results?: Agent[];
  suggestions?: string[];
  canGenerate?: boolean;
  timestamp: Date;
}

/**
 * 搜索上下文
 */
export interface SearchContext {
  originalQuery: string;
  refinedQueries: string[];
  searchedKeywords: string[];
  totalResults: number;
}

/**
 * Chat 响应
 */
export interface ChatResponse {
  reply: string;
  results?: Agent[];
  suggestions?: string[];
  canGenerate: boolean;
  messageId: string;
}

/**
 * AI 意图分析结果
 */
interface IntentAnalysis {
  intent: string;
  keywords: string[];
  clarificationNeeded: boolean;
  clarificationQuestions: string[];
  searchStrategy: string;
}

/**
 * AI Search Agent Service
 * 
 * 对话式 AI Agent 搜索服务
 * 用户通过自然语言描述需求，AI 理解意图后搜索多源 Agent 市场
 * 支持多轮对话细化需求
 */
class AiSearchAgentService {
  private sessions: Map<string, SearchSession> = new Map();
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
        baseURL: 'https://api.deepseek.com/v1'
      });
      console.log('✅ AI Search Agent: DeepSeek API configured');
    } else {
      console.warn('⚠️ AI Search Agent: DEEPSEEK_API_KEY not configured. Using mock responses.');
    }
  }

  /**
   * 创建新的搜索会话
   */
  async createSession(): Promise<string> {
    const sessionId = `search-${uuidv4()}`;
    this.sessions.set(sessionId, {
      id: sessionId,
      messages: [],
      context: {
        originalQuery: '',
        refinedQueries: [],
        searchedKeywords: [],
        totalResults: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`AI Search Agent: Created session ${sessionId}`);
    return sessionId;
  }

  /**
   * 处理用户消息
   */
  async chat(sessionId: string, message: string): Promise<ChatResponse> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // 存储用户消息
    const userMessage: SearchMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    session.messages.push(userMessage);

    // 更新首次查询
    if (!session.context.originalQuery) {
      session.context.originalQuery = message;
    }

    // 第一步：AI 分析意图
    const intentAnalysis = await this.analyzeIntent(message, session);
    
    if (intentAnalysis.clarificationNeeded && session.messages.length <= 2) {
      // 首次查询且需要澄清 — 直接问用户
      const reply = await this.generateClarificationReply(intentAnalysis);
      const assistantMessage: SearchMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: reply,
        suggestions: intentAnalysis.clarificationQuestions,
        canGenerate: false,
        timestamp: new Date()
      };
      session.messages.push(assistantMessage);
      session.updatedAt = new Date();

      return {
        reply,
        suggestions: intentAnalysis.clarificationQuestions,
        canGenerate: false,
        messageId: assistantMessage.id
      };
    }

    // 第二步：执行搜索
    const keywords = intentAnalysis.keywords;
    session.context.searchedKeywords.push(...keywords);
    session.context.refinedQueries.push(message);

    console.log(`AI Search Agent: Searching for keywords: ${keywords.join(', ')}`);
    
    // 使用前 3 个关键词组合搜索
    const searchQuery = keywords.slice(0, 3).join(' ');
    const searchResult = await agentSearchService.searchAgents(searchQuery, 1, 20);
    
    session.context.totalResults = searchResult.data.length;

    // 第三步：AI 整理结果
    const chatResponse = await this.generateSearchReply(
      message, 
      searchResult.data, 
      intentAnalysis, 
      session
    );

    const assistantMessage: SearchMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: chatResponse.reply,
      results: chatResponse.results,
      suggestions: chatResponse.suggestions,
      canGenerate: chatResponse.canGenerate,
      timestamp: new Date()
    };
    session.messages.push(assistantMessage);
    session.updatedAt = new Date();

    return chatResponse;
  }

  /**
   * 获取会话信息
   */
  getSession(sessionId: string): SearchSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * 清理过期会话（超过1小时）
   */
  cleanExpiredSessions(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [id, session] of this.sessions) {
      if (session.updatedAt < oneHourAgo) {
        this.sessions.delete(id);
        console.log(`AI Search Agent: Cleaned expired session ${id}`);
      }
    }
  }

  /**
   * AI 分析用户意图
   */
  private async analyzeIntent(message: string, session: SearchSession): Promise<IntentAnalysis> {
    const systemPrompt = `你是一个专业的 Agent 搜索助手（AI Search Agent），帮助用户从全球开源社区（包括 GitHub、Gitee、ModelScope 等）搜索 AI Agent。

你的职责：
1. 解析用户需求，提取搜索关键词（用英文关键词效果更好）
2. 判断需求是否明确，是否需要追问
3. 设计搜索策略

请严格返回 JSON 格式：
{
  "intent": "用户意图的简短描述",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "clarificationNeeded": true/false,
  "clarificationQuestions": ["追问1", "追问2"],
  "searchStrategy": "搜索策略的简要说明"
}`;

    const historyMessages: Array<{role: 'user' | 'assistant' | 'system', content: string}> = session.messages.slice(-4).map(m => ({
      role: m.role === 'user' ? 'user' as const : 'assistant' as const,
      content: m.content
    }));

    try {
      if (this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            ...historyMessages.slice(0, -1),
            { role: 'user', content: `用户的搜索需求: ${message}` }
          ],
          temperature: 0.3,
          max_tokens: 500
        });

        const response = completion.choices[0]?.message?.content || '';
        return this.parseIntentResponse(response, message);
      }
    } catch (error) {
      console.error('AI Search Agent: Intent analysis error:', error);
    }

    // 降级：从消息中提取关键词
    return this.extractIntentFallback(message);
  }

  /**
   * 解析 AI 意图响应
   */
  private parseIntentResponse(response: string, originalMessage: string): IntentAnalysis {
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      const parsed = JSON.parse(jsonStr);
      return {
        intent: parsed.intent || '搜索 Agent',
        keywords: parsed.keywords || [originalMessage],
        clarificationNeeded: parsed.clarificationNeeded || false,
        clarificationQuestions: parsed.clarificationQuestions || [],
        searchStrategy: parsed.searchStrategy || '通用搜索'
      };
    } catch {
      return this.extractIntentFallback(originalMessage);
    }
  }

  /**
   * 降级意图提取
   */
  private extractIntentFallback(message: string): IntentAnalysis {
    // 提取中英文关键词
    const englishWords = message.match(/[a-zA-Z]+/g) || [];
    const chineseChars = message.match(/[\u4e00-\u9fff]+/g) || [];
    
    const keywords: string[] = [];
    // 英文关键词优先
    if (englishWords.length > 0) {
      keywords.push(...englishWords.slice(0, 5));
    }
    // 补充中文关键词
    if (chineseChars.length > 0) {
      keywords.push(...chineseChars.slice(0, 3));
    }
    
    // 默认加上 agent/ai 关键词
    if (!keywords.some(k => k.toLowerCase().includes('agent'))) {
      keywords.push('agent');
    }

    return {
      intent: `搜索 ${keywords.join(' ')} 相关 Agent`,
      keywords: keywords.slice(0, 5),
      clarificationNeeded: false,
      clarificationQuestions: [
        '需要哪个领域的 Agent？',
        '希望 Agent 有什么特殊能力？',
        '对开源协议有要求吗？'
      ],
      searchStrategy: '关键词搜索'
    };
  }

  /**
   * 生成需求澄清回复
   */
  private async generateClarificationReply(analysis: IntentAnalysis): Promise<string> {
    const questions = analysis.clarificationQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n');
    return `好的，我已经理解了您的需求大致方向：**${analysis.intent}**\n\n不过还有一些细节需要确认，以便更精准地搜索：\n\n${questions}\n\n请告诉我更多细节，我来帮您找到最合适的 Agent！`;
  }

  /**
   * 生成搜索结果回复
   */
  private async generateSearchReply(
    userMessage: string,
    results: Agent[],
    analysis: IntentAnalysis,
    session: SearchSession
  ): Promise<ChatResponse> {
    const hasResults = results.length > 0;

    if (hasResults) {
      // 有搜索结果 — 让 AI 整理呈现
      return this.formatResultsReply(results, analysis, userMessage);
    } else {
      // 无结果 — 建议 AI 生成
      const reply = `我搜索了 GitHub、Gitee 和 ModelScope，但目前没有找到与"**${analysis.intent}**"完全匹配的 Agent。\n\n不过别担心！作为 AI Agent 工厂，我们可以直接用 AI 为您生成一个定制的 Agent。\n\n点击下方按钮，AI 将根据您的需求自动创建：`;
      return {
        reply,
        results: [],
        suggestions: [],
        canGenerate: true,
        messageId: ''
      };
    }
  }

  /**
   * 格式化搜索结果回复
   */
  private async formatResultsReply(
    results: Agent[],
    analysis: IntentAnalysis,
    userMessage: string
  ): Promise<ChatResponse> {
    // 按来源分组
    const groupedBySource = new Map<string, Agent[]>();
    results.forEach(agent => {
      const source = agent.source || 'unknown';
      if (!groupedBySource.has(source)) {
        groupedBySource.set(source, []);
      }
      groupedBySource.get(source)!.push(agent);
    });

    // 格式化来源统计
    const sourceCounts = Array.from(groupedBySource.entries())
      .map(([source, agents]) => `${source}: ${agents.length} 个`)
      .join('、');

    const topResults = results.slice(0, 6);
    const totalCount = results.length;

    // AI 生成回复内容
    let reply: string;
    const systemPrompt = `你是一个专业的 AI Agent 搜索助手。根据搜索结果，用友好、自然的语言回复用户。
搜索结果来源包括：GitHub（开源代码仓库）、Gitee（国内代码托管平台）、ModelScope（阿里达摩院 AI 模型平台）。

搜索关键词：${analysis.keywords.join(', ')}
搜索结果数量：${totalCount}
来源分布：${sourceCounts}

请：
1. 用 1-2 句话概括搜索结果
2. 推荐最相关的 2-3 个 Agent（只需说名称和来源）
3. 询问是否需要进一步细化
回复要热情、有帮助性，使用中文。`;

    if (this.openai && totalCount > 0) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `用户搜索: ${userMessage}` }
          ],
          temperature: 0.5,
          max_tokens: 300
        });
        reply = completion.choices[0]?.message?.content || this.getDefaultResultsReply(results, sourceCounts, analysis);
      } catch {
        reply = this.getDefaultResultsReply(results, sourceCounts, analysis);
      }
    } else {
      reply = this.getDefaultResultsReply(results, sourceCounts, analysis);
    }

    // 生成追问建议
    const suggestions = this.generateFollowUpSuggestions(results, analysis);

    return {
      reply,
      results: topResults,
      suggestions,
      canGenerate: false,
      messageId: ''
    };
  }

  /**
   * 默认结果回复（当 AI 不可用时）
   */
  private getDefaultResultsReply(results: Agent[], sourceCounts: string, analysis: IntentAnalysis): string {
    const topNames = results.slice(0, 3).map(r => `**${r.name}**`).join('、');
    return `我找到了 ${results.length} 个相关 Agent（来源：${sourceCounts}）。\n\n推荐关注：${topNames}\n\n您可以查看下方卡片获取更多信息，或者告诉我更具体的需求来进一步筛选。`;
  }

  /**
   * 生成追问建议
   */
  private generateFollowUpSuggestions(results: Agent[], analysis: IntentAnalysis): string[] {
    // 从结果中提取标签来生成追问
    const allTags = new Set<string>();
    results.forEach(r => r.tags?.forEach(t => allTags.add(t)));

    const suggestions: string[] = [
      '需要更具体的能力？',
      '对编程语言有要求吗？'
    ];

    // 如果有标签，基于标签生成建议
    const tagArray = Array.from(allTags);
    if (tagArray.length > 0) {
      const relevantTags = tagArray.slice(0, 4);
      suggestions.unshift(...relevantTags.map(t => `侧重"${t}"方向`));
    }

    return suggestions.slice(0, 5);
  }

  /**
   * 清理会话
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
}

export const aiSearchAgentService = new AiSearchAgentService();
