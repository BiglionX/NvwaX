import type { Agent } from './agent-search.service.js';
import { tokenQuotaService } from './token-quota.service.js';
import { llmService } from './llm/llm.service.js';

// 用户ID常量 - 翻译服务作为系统级操作，使用内部服务账户
const SYSTEM_USER_ID_FOR_TRANSLATION = 'system-translation-service';

/**
 * Agent 翻译服务
 * 
 * 当用户使用中文模式时，将爬虫获取的英文 Agent 名称、描述、标签自动翻译为中文
 * 使用 DeepSeek API 批量翻译，带内存缓存避免重复翻译
 */
class AgentTranslationService {
  /** 翻译缓存: key = agentId:field, value = translatedText */
  private translationCache = new Map<string, string>();
  
  /** 正在进行的翻译请求，避免并发重复翻译相同内容 */
  private pendingRequests = new Map<string, Promise<(string | null)[]>>();

  constructor() {
    if (llmService.isConfigured) {
      console.log('✅ Agent Translation: DeepSeek API configured (via LlmService)');
    } else {
      console.warn('⚠️ Agent Translation: DEEPSEEK_API_KEY not configured. Translations disabled.');
    }
  }

  /**
   * 批量翻译 Agent 列表中的英文字段
   * @param agents 原始 Agent 列表（会原地修改）
   * @param locale 目标语言 ('zh')
   */
  async translateAgents(agents: Agent[], locale: string): Promise<void> {
    if (locale !== 'zh' || !llmService.isConfigured || agents.length === 0) {
      return;
    }

    // 收集需要翻译的文本，按字段类型分组
    const nameTexts: Array<{ agentIndex: number; text: string }> = [];
    const descTexts: Array<{ agentIndex: number; text: string }> = [];
    const tagTexts: Array<{ agentIndex: number; tagIndex: number; text: string }> = [];

    agents.forEach((agent, index) => {
      if (agent.name && this.isEnglishText(agent.name)) {
        nameTexts.push({ agentIndex: index, text: agent.name });
      }
      if (agent.description && this.isEnglishText(agent.description)) {
        descTexts.push({ agentIndex: index, text: agent.description });
      }
      if (agent.tags && agent.tags.length > 0) {
        agent.tags.forEach((tag, tagIndex) => {
          if (this.isEnglishText(tag)) {
            tagTexts.push({ agentIndex: index, tagIndex, text: tag });
          }
        });
      }
    });

    console.log(`  📝 Need to translate: ${nameTexts.length} names, ${descTexts.length} descriptions, ${tagTexts.length} tags`);

    // 并行翻译三种字段类型
    await Promise.all([
      this.translateField(agents, nameTexts, 'name'),
      this.translateField(agents, descTexts, 'description'),
      this.translateField(agents, tagTexts, 'tag'),
    ]);
  }

  /**
   * 翻译特定字段类型
   */
  private async translateField(
    agents: Agent[],
    items: Array<{ agentIndex: number; text: string; tagIndex?: number }>,
    fieldType: 'name' | 'description' | 'tag'
  ): Promise<void> {
    if (items.length === 0) return;

    // 先检查缓存
    const uncachedItems: typeof items = [];
    for (const item of items) {
      const agent = agents[item.agentIndex];
      if (!agent) continue;
      const cacheKey = `${agent.id}:${fieldType}${item.tagIndex !== undefined ? `:${item.tagIndex}` : ''}`;
      const cached = this.translationCache.get(cacheKey);
      if (cached) {
        this.applyTranslation(agent, fieldType, cached, item.tagIndex);
      } else {
        uncachedItems.push(item);
      }
    }

    if (uncachedItems.length === 0) return;

    // 分批次翻译（每批最多 15 段文本）
    const batchSize = 15;
    for (let i = 0; i < uncachedItems.length; i += batchSize) {
      const batch = uncachedItems.slice(i, i + batchSize);
      await this.batchTranslateSingleField(agents, batch, fieldType);
    }
  }

  /**
   * 批量翻译单个字段类型
   */
  private async batchTranslateSingleField(
    agents: Agent[],
    items: Array<{ agentIndex: number; text: string; tagIndex?: number }>,
    fieldType: 'name' | 'description' | 'tag'
  ): Promise<void> {
    if (!llmService.isConfigured) return;

    // 构建翻译对
    const pairs = items.map((item, idx) => ({
      id: `${fieldType}_${idx}`,
      text: item.text,
    }));

    // 去重文本（避免相同内容重复翻译）
    const uniqueTexts = [...new Set(pairs.map(p => p.text))];
    const requestId = `translate_${fieldType}_${uniqueTexts.join('_')}`;

    // 检查是否有正在进行中的相同请求
    if (this.pendingRequests.has(requestId)) {
      const results = await this.pendingRequests.get(requestId);
      if (results) {
        for (let i = 0; i < pairs.length && i < results.length; i++) {
          const translated = results[i];
          if (translated && items[i]) {
            const agent = agents[items[i].agentIndex];
            if (agent) {
              const cacheKey = `${agent.id}:${fieldType}${items[i].tagIndex !== undefined ? `:${items[i].tagIndex}` : ''}`;
              this.translationCache.set(cacheKey, translated);
              this.applyTranslation(agent, fieldType, translated, items[i].tagIndex);
            }
          }
        }
      }
      return;
    }

    const requestPromise = this.doBatchTranslate(pairs, fieldType);
    this.pendingRequests.set(requestId, requestPromise);

    try {
      const translations = await requestPromise;
      if (!translations) return;

      for (let i = 0; i < translations.length && i < items.length; i++) {
        const translated = translations[i];
        if (translated && items[i]) {
          const agent = agents[items[i].agentIndex];
          if (agent) {
            const cacheKey = `${agent.id}:${fieldType}${items[i].tagIndex !== undefined ? `:${items[i].tagIndex}` : ''}`;
            this.translationCache.set(cacheKey, translated);
            this.applyTranslation(agent, fieldType, translated, items[i].tagIndex);
          }
        }
      }
    } finally {
      this.pendingRequests.delete(requestId);
    }
  }

  /**
   * 执行实际的 LLM 翻译调用
   */
  private async doBatchTranslate(
    pairs: Array<{ id: string; text: string }>,
    fieldType: 'name' | 'description' | 'tag'
  ): Promise<(string | null)[]> {
    if (!llmService.isConfigured) return pairs.map(() => null);

    try {
      const textsJson = JSON.stringify(pairs.map(p => ({ id: p.id, text: p.text })), null, 2);

      const instructionMap: Record<string, string> = {
        name: `这些是 AI Agent 的名称(name)，请翻译为简洁精炼的中文名称（不超过15个字），保持专业术语不翻译（如 Agent、API、LLM、GPT 等）。`,
        description: `这些是 AI Agent 的描述(description)，请翻译为通顺自然的中文描述。保持技术术语（如 Agent、API、LLM、RAG 等）不翻译。`,
        tag: `这些是 AI Agent 的标签(tags)，请翻译为简洁的中文标签（不超过8个字）。`,
      };

      const completion = await llmService.createCompletion({
        model: 'deepseek-v4-flash',
        messages: [
          {
            role: 'system',
            content: `你是一个专业的 AI Agent 信息翻译助手。${instructionMap[fieldType] || '请将英文翻译为中文。'}
            
要求：
1. 只返回 JSON 格式的结果，不要添加任何说明文字
2. 格式: [{"id": "xxx", "translation": "翻译后的文本"}]
3. 如果原文已经是中文则返回原文
4. 翻译要简洁准确，不要过度意译`
          },
          {
            role: 'user',
            content: `请翻译以下内容为中文：\n${textsJson}`
          }
        ],
        temperature: 0.3,
        maxTokens: 2000,
        purpose: 'translation'
      });

      // 记录Token消耗
      const totalTokens = completion.usage?.totalTokens || 0;
      if (totalTokens > 0) {
        tokenQuotaService.checkAndDeductTokens(SYSTEM_USER_ID_FOR_TRANSLATION, totalTokens, {
          endpoint: '/api/agent-translation/batch',
          sourceType: 'agent_translation',
          description: `Agent翻译 - ${fieldType}字段批量翻译`,
          model: 'deepseek-v4-flash',
          metadata: {
            batchSize: pairs.length,
            fieldType,
            prompt_tokens: completion.usage?.promptTokens || 0,
            completion_tokens: completion.usage?.completionTokens || 0
          }
        }).catch(err => console.error('[TokenQuota] Failed to record translation tokens:', err));
      }

      const content = completion.content;
      if (!content) return pairs.map(() => null);

      // 解析 JSON 响应，兼容各种格式
      let jsonStr = content;

      // 尝试从 markdown 代码块中提取
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        // 尝试从文本中提取数组
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          jsonStr = arrayMatch[0];
        }
      }

      const result = JSON.parse(jsonStr) as Array<{ id: string; translation: string }>;

      // 按原始顺序返回翻译结果
      return pairs.map(p => {
        const found = result.find(r => r.id === p.id);
        return found?.translation || null;
      });
    } catch (error) {
      console.error(`❌ Agent translation batch error (${fieldType}):`, error);
      return pairs.map(() => null);
    }
  }

  /**
   * 将翻译结果应用到 Agent 对象（原地修改）
   */
  private applyTranslation(
    agent: Agent,
    fieldType: 'name' | 'description' | 'tag',
    translated: string,
    tagIndex?: number
  ): void {
    const translatedTrimmed = translated.trim();
    if (!translatedTrimmed) return;

    if (fieldType === 'name') {
      agent._nameEn = agent.name; // 保留原始英文
      agent.name = translatedTrimmed;
    } else if (fieldType === 'description') {
      if (!agent._descEn) {
        agent._descriptionEn = agent.description;
      }
      agent.description = translatedTrimmed;
    } else if (fieldType === 'tag' && tagIndex !== undefined && agent.tags) {
      // 将原始 tag 替换为翻译后的 tag
      if (agent.tags[tagIndex] !== translatedTrimmed) {
        agent.tags[tagIndex] = translatedTrimmed;
      }
    }
  }

  /**
   * 判断文本是否主要是英文内容
   */
  private isEnglishText(text: string): boolean {
    if (!text || text.length < 2) return false;
    
    const chineseChars = text.match(/[\u4e00-\u9fff]/g);
    const chineseRatio = chineseChars ? chineseChars.length / text.length : 0;
    
    return chineseRatio < 0.3;
  }
}

export const agentTranslationService = new AgentTranslationService();
