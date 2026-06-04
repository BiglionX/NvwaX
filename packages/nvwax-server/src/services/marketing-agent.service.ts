import { Pool } from 'pg';
import OpenAI from 'openai';
import { databaseService } from './database.service.js';
import { apiKeyService } from './api-key.service.js';
import { tokenQuotaService } from './token-quota.service.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: 'stop' | 'length' | 'content_filter';
}

export interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: ChatCompletionUsage;
}

export class MarketingAgentService {
  private pool: Pool;
  private openai: OpenAI | null;

  constructor() {
    this.pool = databaseService.getPool();
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
        baseURL: 'https://api.deepseek.com/v1'
      });
    } else {
      this.openai = null;
      console.log('⚠️ No DeepSeek/OpenAI API key configured. Marketing agent will use mock responses.');
    }
  }

  /**
   * Process chat completion request
   * This integrates with the Leader Agent to handle multi-agent collaboration
   */
  async createChatCompletion(
    request: ChatCompletionRequest,
    tenantId: string,
    apiKeyId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ChatCompletionResponse> {
    const startTime = Date.now();
    
    try {
      // Step 1: Extract user's query from messages
      const userMessage = this.extractUserMessage(request.messages);
      
      if (!userMessage) {
        throw new Error('No user message found in request');
      }

      console.log(`🤖 Processing chat completion for tenant ${tenantId}`);
      console.log(`   Model: ${request.model}`);
      console.log(`   Query: ${userMessage.substring(0, 100)}...`);

      // Step 2: Select team based on the query
      // For now, use a simple category detection
      // In production, integrate with Leader Agent for intelligent team selection
      const teamConfig = this.selectTeamByQuery(userMessage);
      
      console.log(`✅ Selected team: ${teamConfig.name}`);
      console.log(`   Category: ${teamConfig.category}`);
      console.log(`   Members: ${teamConfig.members.length}`);

      // Step 3 & 4: 执行团队工作流并从 DeepSeek 响应获取真实 Token 消耗
      const result = await this.executeTeamWorkflow(
        teamConfig,
        userMessage,
        request
      );
      const { response, promptTokens, completionTokens, totalTokens } = result;

      // Step 5: Record API usage
      const responseTime = Date.now() - startTime;
      await apiKeyService.recordUsage({
        apiKeyId,
        tenantId,
        endpoint: '/v1/chat/completions',
        method: 'POST',
        tokensUsed: totalTokens,
        cost: this.calculateCost(totalTokens),
        status: 'success',
        responseTimeMs: responseTime,
        ipAddress,
        userAgent,
        metadata: {
          model: request.model,
          team_name: teamConfig.name,
          team_category: teamConfig.category
        }
      });

      // Step 5.5: Deduct tokens from user quota
      try {
        // Get user_id from api_key
        const userResult = await this.pool.query(
          'SELECT user_id FROM api_keys WHERE id = $1', [apiKeyId]
        );
        if (userResult.rows.length > 0) {
          const userId = userResult.rows[0].user_id;
          await tokenQuotaService.checkAndDeductTokens(userId, totalTokens, {
            endpoint: '/v1/chat/completions',
            sourceType: 'api_call',
            description: `Chat completion with model: ${request.model}`,
            model: request.model,
            metadata: {
              team_name: teamConfig.name,
              team_category: teamConfig.category
            }
          });
        }
      } catch (quotaErr) {
        console.error('Failed to deduct token quota:', quotaErr);
        // Don't block the response if quota deduction fails
      }

      // Step 6: Format response in OpenAI-compatible format
      const chatResponse: ChatCompletionResponse = {
        id: `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: response
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens
        }
      };

      return chatResponse;
    } catch (error) {
      console.error('Chat completion error:', error);
      
      // Record failed request
      const responseTime = Date.now() - startTime;
      await apiKeyService.recordUsage({
        apiKeyId,
        tenantId,
        endpoint: '/v1/chat/completions',
        method: 'POST',
        tokensUsed: 0,
        cost: 0,
        status: 'error',
        responseTimeMs: responseTime,
        ipAddress,
        userAgent,
        metadata: {
          model: request.model,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw error;
    }
  }

  /**
   * Select team based on user query (simple keyword matching)
   * In production, replace with AI-powered team selection
   */
  private selectTeamByQuery(query: string): {
    name: string;
    category: string;
    members: Array<{ role: string; specialty: string }>;
  } {
    const lowerQuery = query.toLowerCase();
    
    // Simple keyword-based team selection
    if (lowerQuery.includes('market') || lowerQuery.includes('campaign') || lowerQuery.includes('conversion')) {
      return {
        name: 'Marketing Team',
        category: 'marketing',
        members: [
          { role: 'Marketing Strategist', specialty: 'Campaign planning' },
          { role: 'Content Creator', specialty: 'Copywriting' },
          { role: 'Data Analyst', specialty: 'Performance tracking' }
        ]
      };
    } else if (lowerQuery.includes('customer') || lowerQuery.includes('support') || lowerQuery.includes('help')) {
      return {
        name: 'Customer Service Team',
        category: 'customer-service',
        members: [
          { role: 'Support Agent', specialty: 'Issue resolution' },
          { role: 'Technical Specialist', specialty: 'Technical support' }
        ]
      };
    } else if (lowerQuery.includes('code') || lowerQuery.includes('develop') || lowerQuery.includes('program')) {
      return {
        name: 'Development Team',
        category: 'development',
        members: [
          { role: 'Software Engineer', specialty: 'Backend development' },
          { role: 'Frontend Developer', specialty: 'UI implementation' },
          { role: 'QA Engineer', specialty: 'Testing' }
        ]
      };
    } else if (lowerQuery.includes('data') || lowerQuery.includes('analyz') || lowerQuery.includes('report')) {
      return {
        name: 'Data Analysis Team',
        category: 'analysis',
        members: [
          { role: 'Data Scientist', specialty: 'Statistical analysis' },
          { role: 'Business Analyst', specialty: 'Insights generation' }
        ]
      };
    } else {
      return {
        name: 'General Assistant Team',
        category: 'general',
        members: [
          { role: 'AI Assistant', specialty: 'General queries' }
        ]
      };
    }
  }

  /**
   * Extract the last user message from the conversation
   */
  private extractUserMessage(messages: ChatMessage[]): string | null {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i].content;
      }
    }
    return null;
  }

  /**
   * Execute team workflow to generate response
   * This is a simplified implementation - in production, this would orchestrate multiple agents
   */
  private async executeTeamWorkflow(
    teamConfig: any,
    userQuery: string,
    request: ChatCompletionRequest
  ): Promise<{ response: string; promptTokens: number; completionTokens: number; totalTokens: number }> {
    console.log(`🔄 Executing workflow for team: ${teamConfig.name}`);

    // For now, we'll use a mock response based on the team type
    // In production, this would:
    // 1. Decompose the task into subtasks
    // 2. Assign subtasks to different agents
    // 3. Collect and synthesize results
    
    const category = teamConfig.category || 'general';
    
    // Generate system prompt based on team category
    const systemPrompts: Record<string, string> = {
      'marketing': `You are a professional AI Marketing Team consisting of a Marketing Strategist, Content Creator, and Data Analyst. Your task is to provide comprehensive marketing advice and strategies.

User query: ${userQuery}

Provide:
1. A detailed strategy overview
2. Key recommendations
3. Next steps`,
      'customer-service': `You are a professional AI Customer Service Team consisting of a Support Agent and Technical Specialist. Your task is to help resolve customer inquiries.

User query: ${userQuery}

Provide:
1. A clear, helpful response
2. Additional support options`,
      'development': `You are a professional AI Development Team consisting of a Software Engineer, Frontend Developer, and QA Engineer. Your task is to provide technical solutions.

User query: ${userQuery}

Provide:
1. A detailed technical solution
2. Implementation steps
3. Best practices`,
      'analysis': `You are a professional AI Data Analysis Team consisting of a Data Scientist and Business Analyst. Your task is to analyze data and provide insights.

User query: ${userQuery}

Provide:
1. A detailed analysis
2. Key insights
3. Recommendations`,
      'general': `You are a professional AI Assistant Team. Your task is to help answer user queries comprehensively.

User query: ${userQuery}

Provide:
1. A comprehensive answer
2. Relevant details and context`
    };

    const systemContent = systemPrompts[category] || systemPrompts['general'];
    const messages = [
      { role: 'system' as const, content: systemContent },
      ...request.messages
    ];

    try {
      if (!this.openai) {
        throw new Error('OpenAI client not configured - no API key available');
      }
      const completion = await this.openai.chat.completions.create({
        model: request.model || 'deepseek-v4-flash',
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens ?? 2000
      });

      const response = completion.choices[0]?.message?.content || '';
      const promptTokens = completion.usage?.prompt_tokens || 0;
      const completionTokens = completion.usage?.completion_tokens || 0;
      const totalTokens = completion.usage?.total_tokens || 0;

      return { response, promptTokens, completionTokens, totalTokens };
    } catch (error) {
      console.error(`[MarketingAgent] DeepSeek call failed for category ${category}:`, error);
      // 降级：返回 mock 响应，使用估算 token
      const fallbackResponse = this.getFallbackResponse(category, userQuery);
      return { 
        response: fallbackResponse, 
        promptTokens: Math.ceil(userQuery.length / 4),
        completionTokens: Math.ceil(fallbackResponse.length / 4),
        totalTokens: Math.ceil((userQuery.length + fallbackResponse.length) / 4)
      };
    }
  }

  /**
   * Generate marketing-focused response
   */
  private getFallbackResponse(category: string, userQuery: string): string {
    switch (category) {
      case 'marketing':
        return `Based on your marketing query, our AI Marketing Team suggests:

**Strategy Overview:**
For "${userQuery.substring(0, 50)}...", consider implementing a data-driven marketing strategy.

**Key Recommendations:**
1. Focus on customer segmentation and personalized messaging
2. Leverage data analytics to optimize campaign performance
3. Implement A/B testing for continuous improvement

Would you like me to elaborate on any of these points?`;
      case 'customer-service':
        return `I understand your concern. Let me help you with that.

**Response:**
I've reviewed your inquiry about "${userQuery.substring(0, 50)}..." and I'm here to provide you with the best possible assistance.

Is there anything else I can help you with today?`;
      case 'development':
        return `Here's a technical solution for your development question:

**Solution:**
For your technical question about "${userQuery.substring(0, 50)}...", here's a robust solution following industry best practices.

**Implementation Steps:**
1. Analyze requirements and design architecture
2. Set up development environment
3. Implement core functionality

Would you like me to provide code examples?`;
      case 'analysis':
        return `Let me analyze this for you:

**Analysis:**
After analyzing "${userQuery.substring(0, 50)}...", I've identified several key patterns and insights.

**Key Insights:**
1. Identify patterns and trends in the data
2. Look for correlations and anomalies
3. Validate findings with statistical methods

Would you like me to perform a more detailed analysis?`;
      default:
        return `Thank you for your question. Here's my response:

Regarding your question about "${userQuery.substring(0, 50)}...", I've compiled a comprehensive response based on best practices and industry standards.

Is there anything else I can help you with?`;
    }
  }

  /**
   * Estimate token count (simplified, only used as fallback)
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate cost based on token usage
   * Pricing can be configured per tenant/plan
   */
  private calculateCost(tokens: number): number {
    // Default pricing: $0.002 per 1000 tokens
    const pricePerToken = 0.000002;
    return tokens * pricePerToken;
  }
}

export const marketingAgentService = new MarketingAgentService();
