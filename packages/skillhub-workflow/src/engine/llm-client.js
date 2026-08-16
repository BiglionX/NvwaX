/**
 * LLM Client — skillhub-workflow 统一 LLM 客户端
 * ------------------------------------------------------------
 * 供 workflow-engine（worker 内 agent()）、llm 节点等共用。
 * 镜像 @deepseek-ai/dsh-llm 的 provider-neutral 语义：单一配置入口
 * （DEEPSEEK_API_KEY / OPENAI_BASE_URL）、默认模型、无 key 时 mock 降级。
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const DEFAULT_MODEL = 'deepseek-v4-flash';
const MOCK_KEY = 'mock-key';

export function hasLlmKey() {
  const key = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  return Boolean(key) && key !== 'your_deepseek_api_key_here';
}

export function createChatModel({ model = DEFAULT_MODEL, temperature = 0.7, baseURL } = {}) {
  return new ChatOpenAI({
    modelName: model,
    temperature,
    openAIApiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || MOCK_KEY,
    configuration: {
      baseURL: baseURL || process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1',
    },
  });
}

/**
 * 单次补全（镜像 dsh-llm stream 的简化非流式形态）。
 * 带超时保护：超时视为该次调用失败（返回 error），由调用方（agent()）按 fail-closed 处理。
 * @returns {Promise<{ response: string, model: string, error?: string }>}
 */
export async function complete({ prompt, systemPrompt, model = DEFAULT_MODEL, temperature = 0.7, timeoutMs = 120000 }) {
  if (!hasLlmKey()) {
    return {
      response: 'This is a mock LLM response. Please configure DEEPSEEK_API_KEY in .env file.',
      model,
    };
  }
  try {
    const chatModel = createChatModel({ model, temperature });
    const messages = systemPrompt
      ? [new SystemMessage(systemPrompt), new HumanMessage(prompt)]
      : [new HumanMessage(prompt)];

    // 超时保护：Promise.race，超时按失败返回（不抛出，保持 fail-closed 语义）
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`LLM call timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    try {
      const response = await Promise.race([chatModel.invoke(messages), timeout]);
      return { response: response.content, model };
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    return { response: `Error: ${error.message}`, model, error: error.message };
  }
}

export { DEFAULT_MODEL };
