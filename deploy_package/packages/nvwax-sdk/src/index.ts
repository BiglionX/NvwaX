import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model?: string;
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
  finish_reason: string;
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

export interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  permissions: string[];
  rate_limit: number;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
}

export interface CreateApiKeyRequest {
  name: string;
  tenantId: string;
  permissions?: string[];
  rateLimit?: number;
  expiresInDays?: number;
}

export interface UsageStats {
  period: string;
  requests: number;
  tokens_used: number;
  cost: number;
  avg_response_time_ms: number;
}

export interface NvwaXClientOptions {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
}

/**
 * NvwaX SDK Client
 * 
 * Provides easy access to NvwaX AI services
 */
export class NvwaXClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(options: NvwaXClientOptions) {
    this.apiKey = options.apiKey;
    
    this.client = axios.create({
      baseURL: options.baseURL || 'http://localhost:3001',
      timeout: options.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response: any) => response,
      (error: any) => {
        if (error.response) {
          const { status, data } = error.response;
          
          switch (status) {
            case 401:
              throw new NvwaXError('Invalid API key or authentication failed', 'AUTH_ERROR', status);
            case 403:
              throw new NvwaXError('Insufficient permissions', 'FORBIDDEN', status);
            case 429:
              const retryAfter = error.response.headers['retry-after'];
              throw new NvwaXError(
                `Rate limit exceeded. Retry after ${retryAfter} seconds`,
                'RATE_LIMIT_EXCEEDED',
                status,
                { retryAfter }
              );
            case 500:
              throw new NvwaXError('Internal server error', 'SERVER_ERROR', status);
            default:
              throw new NvwaXError(
                data?.error?.message || 'An unexpected error occurred',
                'API_ERROR',
                status,
                data
              );
          }
        } else if (error.request) {
          throw new NvwaXError('No response received from server', 'NETWORK_ERROR', 0);
        } else {
          throw new NvwaXError(error.message, 'REQUEST_ERROR', 0);
        }
      }
    );
  }

  /**
   * Send a chat completion request
   * 
   * @param request - Chat completion parameters
   * @returns Chat completion response
   * 
   * @example
   * ```typescript
   * const response = await client.chat.completions.create({
   *   model: 'marketing-team-v1',
   *   messages: [
   *     { role: 'user', content: 'How to improve conversion rates?' }
   *   ]
   * });
   * console.log(response.choices[0].message.content);
   * ```
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await this.client.post('/v1/chat/completions', request);
    return response.data;
  }

  /**
   * Convenience method for simple chat
   * 
   * @param message - User message
   * @param model - Model to use (optional)
   * @returns Assistant's response text
   * 
   * @example
   * ```typescript
   * const answer = await client.chat('What is AI?');
   * console.log(answer);
   * ```
   */
  async chat(message: string, model?: string): Promise<string> {
    const response = await this.createChatCompletion({
      model: model || 'general-assistant-v1',
      messages: [
        { role: 'user', content: message }
      ]
    });
    
    return response.choices[0].message.content;
  }

  /**
   * List all API keys for the current user
   * 
   * @returns Array of API key info
   */
  async listApiKeys(): Promise<ApiKeyInfo[]> {
    const response = await this.client.get('/api/sdk/api-keys');
    return response.data.data;
  }

  /**
   * Create a new API key
   * 
   * @param params - API key creation parameters
   * @returns API key info with secret key (shown only once)
   * 
   * @example
   * ```typescript
   * const result = await client.apiKeys.create({
   *   name: 'Production Key',
   *   tenantId: 'tenant-uuid',
   *   permissions: ['sdk:*'],
   *   expiresInDays: 90
   * });
   * console.log('Secret:', result.secret_key); // Store securely!
   * ```
   */
  async createApiKey(params: CreateApiKeyRequest): Promise<{
    success: boolean;
    data: ApiKeyInfo & { secret_key: string };
    warning: string;
  }> {
    const response = await this.client.post('/api/sdk/api-keys', params);
    return response.data;
  }

  /**
   * Delete an API key
   * 
   * @param keyId - API key ID to delete
   */
  async deleteApiKey(keyId: string): Promise<void> {
    await this.client.delete(`/api/sdk/api-keys/${keyId}`);
  }

  /**
   * Get usage statistics
   * 
   * @param period - Time period ('day', 'week', 'month')
   * @returns Usage statistics
   */
  async getUsage(period: 'day' | 'week' | 'month' = 'month'): Promise<UsageStats> {
    const response = await this.client.get('/api/sdk/usage', {
      params: { period }
    });
    return response.data.data;
  }

  /**
   * Check if user has a specific permission
   * 
   * @param userId - User ID to check
   * @param permission - Permission string
   * @returns Whether user has the permission
   */
  async checkPermission(userId: string, permission: string): Promise<boolean> {
    const response = await this.client.post('/api/sdk/permissions/check', {
      userId,
      permission
    });
    return response.data.data.hasPermission;
  }

  /**
   * Set custom headers for future requests
   * 
   * @param headers - Custom headers to add
   */
  setHeaders(headers: Record<string, string>): void {
    Object.entries(headers).forEach(([key, value]) => {
      this.client.defaults.headers.common[key] = value;
    });
  }

  /**
   * Set base URL for API requests
   * 
   * @param baseURL - New base URL
   */
  setBaseURL(baseURL: string): void {
    this.client.defaults.baseURL = baseURL;
  }
}

/**
 * Custom error class for NvwaX SDK
 */
export class NvwaXError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'NvwaXError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Factory function to create NvwaX client
 * 
 * @param apiKey - Your NvwaX API key
 * @param options - Optional configuration
 * @returns Configured NvwaX client instance
 * 
 * @example
 * ```typescript
 * import { createClient } from '@nvwax/sdk';
 * 
 * const client = createClient('nvwx_your_api_key_here');
 * ```
 */
export function createClient(apiKey: string, options?: Partial<NvwaXClientOptions>): NvwaXClient {
  return new NvwaXClient({
    apiKey,
    ...options
  });
}

// Re-export types for convenience
export type {
  ChatMessage as ChatMessageType,
  ChatCompletionRequest as ChatCompletionRequestType,
  ChatCompletionResponse as ChatCompletionResponseType,
  ApiKeyInfo as ApiKeyInfoType,
  CreateApiKeyRequest as CreateApiKeyRequestType,
  UsageStats as UsageStatsType,
  NvwaXClientOptions as NvwaXClientOptionsType
};
