import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { agentSearchService, Agent } from './agent-search.service.js';
import { AiTeam, aiteamService } from './aiteam.service.js';

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
  /** AiTeam 搜索结果 */
  aiteamResults?: AiTeam[];
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
  /** AiTeam 搜索结果 */
  aiteamResults?: AiTeam[];
  suggestions?: string[];
  canGenerate: boolean;
  messageId: string;
}

/**
 * AI 意图分析结果
 */
interface IntentAnalysis {
  intent: string;
  /** 意图类型: search-搜索, clarify-细化搜索, non_search-非搜索(翻译/追问等), generate-想创建Agent */
  intentType: 'search' | 'clarify' | 'non_search' | 'generate';
  keywords: string[];
  clarificationNeeded: boolean;
  clarificationQuestions: string[];
  searchStrategy: string;
  /** 非搜索场景的直接回复内容 */
  nonSearchReply?: string;
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
    
    // === 非搜索意图分发 ===
    if (intentAnalysis.intentType === 'non_search') {
      // 非搜索请求（翻译、追问推荐理由、闲聊等）— 直接回复，不执行搜索
      const reply = intentAnalysis.nonSearchReply || `好的，我理解您的意思是：**${intentAnalysis.intent}**。请告诉我更多具体需求，我来帮您搜索合适的 Agent！`;
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

    if (intentAnalysis.intentType === 'generate') {
      // 用户想创建Agent — 引导到AI生成流程
      const reply = `明白了，您想创建一个定制化的 Agent！作为 AI Agent 工厂，我们可以直接用 AI 为您自动生成。\n\n点击下方按钮，AI 将根据您的需求自动创建：`;
      const assistantMessage: SearchMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: reply,
        suggestions: [],
        canGenerate: true,
        timestamp: new Date()
      };
      session.messages.push(assistantMessage);
      session.updatedAt = new Date();
      return {
        reply,
        results: [],
        suggestions: [],
        canGenerate: true,
        messageId: assistantMessage.id
      };
    }

    // === 搜索/细化意图：执行搜索 ===
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

    // 第二步：执行搜索（并行搜索 Agent + AiTeam）
    const keywords = intentAnalysis.keywords;
    session.context.searchedKeywords.push(...keywords);
    session.context.refinedQueries.push(message);

    console.log(`AI Search Agent: Searching for keywords: ${keywords.join(', ')}`);
    
    // 使用前 3 个关键词组合搜索
    const searchQuery = keywords.slice(0, 3).join(' ');
    
    // 并行搜索 Agent 和 AiTeam
    const [searchResult, aiteamSearchResult] = await Promise.all([
      agentSearchService.searchAgents(searchQuery, 1, 20),
      aiteamService.searchPublishedAiTeams({
        query: searchQuery,
        limit: 10
      }).catch(err => {
        console.error('AiTeam search error:', err);
        return { aiteams: [], total: 0 };
      })
    ]);
    
    const agents = searchResult.data || [];
    const aiteams = aiteamSearchResult.aiteams || [];
    session.context.totalResults = agents.length + aiteams.length;

    // 第三步：AI 整理结果（传入完整对话上下文，包含 AiTeam 数据）
    const chatResponse = await this.generateSearchReply(
      message, 
      agents,
      aiteams,
      intentAnalysis, 
      session
    );

    const assistantMessage: SearchMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: chatResponse.reply,
      results: chatResponse.results,
      aiteamResults: chatResponse.aiteamResults,
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
    const systemPrompt = `你是一个专业的对话式 Agent 搜索助手（AI Search Agent），运行在 AI Agent 工厂（NvwaX）平台，帮助用户从全球开源社区（GitHub、Gitee、ModelScope）搜索 AI Agent / AiTeam，或回答关于搜索结果的问题。

**核心任务：判断用户意图类型并返回 JSON。**

意图类型（intentType）：
1. "search" — 用户要搜索 Agent/AiTeam（如"找一个文案写作 Agent"）。提取3-5个英文搜索关键词。
2. "clarify" — 用户在已有搜索结果的基础上细化需求（如"侧重'ai-agents'方向"、"要python写的"）。关键词应为细化维度。
3. "non_search" — 用户问的是非搜索类问题（如"翻译成中文"、"哪个适合做外贸推广"、"帮我比较一下"、"这是什么"等）。此时需要直接回复用户，不需要提取关键词搜索。设置 nonSearchReply 为回答内容。
4. "generate" — 用户明确表示想创建/生成 Agent（如"帮我创建一个"、"我要自己做一个"）。引导用户使用 AI 生成功能。

**对话上下文规则**：
- 如果用户说"之前推荐的"、"翻译一下"、"这个怎么用"等包含指代的问题，这些属于 non_search 类型
- 如果用户说"还要别的吗"、"有xxx方向的吗"、"侧重xxx"，结合对话历史判断

请严格返回以下 JSON 格式（不要包含 markdown 代码块标记）：
{
  "intent": "用户意图的简短描述",
  "intentType": "search|clarify|non_search|generate",
  "keywords": ["关键词1", "关键词2"],
  "clarificationNeeded": true/false,
  "clarificationQuestions": ["追问1"],
  "searchStrategy": "搜索策略说明",
  "nonSearchReply": "仅在intentType为non_search时提供直接回复内容"
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
   * 解析 AI 意图响应（带智能提取和重试）
   */
  private parseIntentResponse(response: string, originalMessage: string): IntentAnalysis {
    try {
      // 尝试1: 从 markdown 代码块中提取 JSON
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      let jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim();
      
      // 尝试2: 如果外层不是JSON，尝试从文本中提取 {} 包裹的 JSON
      if (!jsonStr.startsWith('{')) {
        const braceMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          jsonStr = braceMatch[0];
        }
      }

      const parsed = JSON.parse(jsonStr);
      return {
        intent: parsed.intent || '搜索 Agent',
        intentType: parsed.intentType || 'search',
        keywords: parsed.keywords || [originalMessage],
        clarificationNeeded: parsed.clarificationNeeded || false,
        clarificationQuestions: parsed.clarificationQuestions || [],
        searchStrategy: parsed.searchStrategy || '通用搜索',
        nonSearchReply: parsed.nonSearchReply || undefined
      };
    } catch {
      // 智能降级：从非JSON文本中提取关键信息
      return this.extractIntentFromText(response, originalMessage);
    }
  }

  /**
   * 从非JSON文本中智能提取意图信息
   */
  private extractIntentFromText(text: string, originalMessage: string): IntentAnalysis {
    // 检查文本中包含的意图关键词
    const textLower = text.toLowerCase();
    
    // 判断是否可能是 non_search（包含翻译、比较、推荐理由等关键词）
    const nonSearchKeywords = ['翻译', '翻译成', '比较', '对比', '哪个', '适合', '推荐理由', '为什么', '说明', '解释', '是做什么', '怎么用', '这是什么'];
    const hasNonSearchIntent = nonSearchKeywords.some(k => originalMessage.includes(k));

    if (hasNonSearchIntent) {
      // 从文本中提取核心回复内容（排除JSON字段描述）
      const lines = text.split('\n').filter(l => {
        const trimmed = l.trim();
        return trimmed.length > 0 && !trimmed.startsWith('{') && !trimmed.startsWith('"') && !trimmed.includes('intentType') && !trimmed.includes('keywords');
      });
      const replyText = lines.slice(0, 3).join('\n') || `好的，我来帮您解答关于 "${originalMessage}" 的问题。`;
      
      return {
        intent: `回答: ${originalMessage}`,
        intentType: 'non_search',
        keywords: [],
        clarificationNeeded: false,
        clarificationQuestions: ['还需要了解其他信息吗？', '想看看其他领域的 Agent 吗？'],
        searchStrategy: '无需搜索',
        nonSearchReply: replyText
      };
    }

    // 默认降级：关键词提取
    return this.extractIntentFallback(originalMessage);
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
      intentType: 'search',
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
   * 构建对话历史上下文文本
   */
  private buildConversationContext(session: SearchSession): string {
    const recentMessages = session.messages.slice(-6); // 最近6条消息
    if (recentMessages.length <= 1) return '';

    const contextLines: string[] = [];
    contextLines.push('以下是本轮对话的历史记录（从旧到新）：');
    
    for (const msg of recentMessages) {
      if (msg.role === 'user') {
        contextLines.push(`用户: ${msg.content}`);
      } else if (msg.role === 'assistant') {
        // AI回复中截取前100字符作为摘要
        const summary = msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content;
        contextLines.push(`助手: ${summary}`);
        // 如果有历史搜索结果，记录推荐了哪些Agent
        if (msg.results && msg.results.length > 0) {
          const agentNames = msg.results.slice(0, 3).map(r => r.name).join(', ');
          contextLines.push(`  (当时推荐了: ${agentNames})`);
        }
      }
    }
    
    return contextLines.join('\n');
  }

  /**
   * 格式化搜索结果数据为JSON字符串（给LLM看的简要数据）
   */
  private formatSearchResultsForLLM(results: Agent[]): string {
    const top10 = results.slice(0, 10).map(r => ({
      name: r.name,
      description: (r.description || '').substring(0, 200),
      source: r.source,
      stars: r.stars || 0,
      tags: (r.tags || []).slice(0, 5),
      url: r.url
    }));
    return JSON.stringify(top10, null, 2);
  }

  /**
   * 格式化 AiTeam 搜索结果数据为 JSON 字符串（给 LLM 看）
   */
  private formatAiTeamResultsForLLM(aiteams: AiTeam[]): string {
    const top10 = aiteams.slice(0, 10).map(a => ({
      name: a.name,
      description: (a.description || '').substring(0, 200),
      members: a.members.length,
      category: a.category || '',
      tags: (a.tags || []).slice(0, 5),
      rating: a.rating,
      publishStatus: a.publishStatus
    }));
    return JSON.stringify(top10, null, 2);
  }

  /**
   * 生成搜索结果回复
   */
  private async generateSearchReply(
    userMessage: string,
    results: Agent[],
    aiteamResults: AiTeam[],
    analysis: IntentAnalysis,
    session: SearchSession
  ): Promise<ChatResponse> {
    const hasResults = results.length > 0 || aiteamResults.length > 0;

    if (hasResults) {
      // 有搜索结果 — 让 AI 整理呈现（传入完整搜索数据和对话上下文）
      return this.formatResultsReply(results, aiteamResults, analysis, userMessage, session);
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
   * 格式化搜索结果回复（传入完整搜索结果数据和对话历史）
   */
  private async formatResultsReply(
    results: Agent[],
    aiteamResults: AiTeam[],
    analysis: IntentAnalysis,
    userMessage: string,
    session: SearchSession
  ): Promise<ChatResponse> {
    const topResults = results.slice(0, 6);
    const totalCount = results.length;

    // 构建对话历史上下文
    const conversationContext = this.buildConversationContext(session);

    // 格式化搜索结果数据
    const searchDataJson = this.formatSearchResultsForLLM(results);
    const aiteamDataJson = this.formatAiTeamResultsForLLM(aiteamResults);

    // AI 生成回复内容
    let reply: string;
    const hasAiteams = aiteamResults.length > 0;
    const systemPrompt = `你是一个专业的 AI Agent 搜索助手，运行在 NvwaX AI Agent 工厂平台。你的任务是根据实际搜索结果数据，为用户提供深入的分析和推荐。

搜索关键词：${analysis.keywords.join(', ')}
Agent 搜索结果总数：${totalCount}
${hasAiteams ? `AiTeam（虚拟公司）搜索结果数：${aiteamResults.length}` : ''}

以下是 Agent 搜索结果的详细数据（JSON格式，前10条）：
${searchDataJson}
${hasAiteams ? `
以下是 AiTeam（虚拟公司）搜索结果的详细数据（JSON格式）：
${aiteamDataJson}
` : ''}
${conversationContext ? `对话历史上下文：
${conversationContext}` : ''}

**现在用户的最新问题是**：${userMessage}

请基于以上搜索结果数据，用中文提供有深度、个性化的回复：
1. 首先根据结果分析是否与用户需求匹配
2. 推荐最相关的 2-3 个 Agent 或 AiTeam（虚拟公司），并说明**推荐理由**（基于描述、Stars、标签、成员数量等）
3. ${hasAiteams ? '注意区分 Agent（单个智能体）和 AiTeam（虚拟公司/团队）的区别，用户可能需要的是团队协作方案' : '如果用户是细化需求（如"侧重xx方向"），基于已有的搜索结果进行筛选推荐'}
4. 回复要热情、有实质性内容，不要只说"找到X个结果"这种机械的统计
5. 最后询问是否需要进一步细化`;

    if (this.openai && (totalCount > 0 || hasAiteams)) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
          messages: [
            { role: 'system', content: systemPrompt }
          ],
          temperature: 0.6,
          max_tokens: 1000
        });
        reply = completion.choices[0]?.message?.content || this.getDefaultResultsReply(results, analysis);
      } catch {
        reply = this.getDefaultResultsReply(results, analysis);
      }
    } else {
      reply = this.getDefaultResultsReply(results, analysis);
    }

    // 生成追问建议
    const suggestions = this.generateFollowUpSuggestions(results, analysis);

    return {
      reply,
      results: topResults,
      aiteamResults: aiteamResults.slice(0, 6),
      suggestions,
      canGenerate: false,
      messageId: ''
    };
  }

  /**
   * 默认结果回复（当 AI 不可用时）
   */
  private getDefaultResultsReply(results: Agent[], analysis: IntentAnalysis): string {
    const topNames = results.slice(0, 3).map(r => `**${r.name}**`).join('、');
    return `我找到了 ${results.length} 个相关 Agent。\n\n推荐关注：${topNames}\n\n您可以查看下方卡片获取更多信息，或者告诉我更具体的需求来进一步筛选。`;
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
