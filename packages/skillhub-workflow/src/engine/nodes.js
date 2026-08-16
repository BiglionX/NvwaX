/**
 * nodes.js — skillhub-workflow 节点实现（从 server.js 抽取，保持行为兼容）
 * ------------------------------------------------------------
 * 变更点（相对原 server.js 内联实现）：
 * 1. conditionNode：`eval(condition)` → sandbox.evaluateCondition（受限 vm 求值，fail-closed）；
 * 2. llmNode：LangChain 直调 → engine/llm-client.js 的统一客户端（mock 降级语义一致）。
 */

import { skillhubClient } from '../nodes/skillhub-client.js';
import { generateReviewPrompt } from '../nodes/reviewer-prompts.js';
import { evaluateCondition } from './sandbox.js';
import { complete } from './llm-client.js';

// SkillHub Search Node
export async function skillhubSearchNode(params) {
  const { query, limit = 10, page = 1 } = params;
  console.log('🔍 Searching SkillHub for:', query);
  try {
    return await skillhubClient.searchSkills({ query, limit, page });
  } catch (error) {
    console.error('SkillHub search failed:', error.message);
    return { success: false, error: error.message, skills: [] };
  }
}

// SkillHub Detail Node
export async function skillhubDetailNode(params) {
  const { skillId } = params;
  console.log('📋 Getting skill detail:', skillId);
  try {
    return await skillhubClient.getSkillDetail(skillId);
  } catch (error) {
    console.error('SkillHub detail failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Text Processing Node
export async function textProcessNode(params) {
  const { text, operation } = params;
  switch (operation) {
    case 'uppercase': return { result: text.toUpperCase() };
    case 'lowercase': return { result: text.toLowerCase() };
    case 'trim': return { result: text.trim() };
    default: return { result: text };
  }
}

// Condition Node（安全求值，替代裸 eval）
export async function conditionNode(params) {
  const { condition, value } = params;
  try {
    return { passed: evaluateCondition(condition, { value }) };
  } catch (error) {
    console.error('Condition evaluation failed (fail-closed):', error.message);
    return { passed: false, error: error.message };
  }
}

// Semantic Search Node
export async function semanticSearchNode(params) {
  const { query } = params;
  console.log('🔍 Semantic searching for:', query);
  try {
    return await skillhubClient.semanticSearch(query);
  } catch (error) {
    console.error('Semantic search failed:', error.message);
    return { success: false, error: error.message, skills: [] };
  }
}

// Tool Discovery Node
export async function toolDiscoveryNode(params) {
  console.log('🛠️ Discovering available tools...');
  try {
    return await skillhubClient.discoverTools();
  } catch (error) {
    console.error('Tool discovery failed:', error.message);
    return { success: false, error: error.message, tools: [] };
  }
}

// Related Skills Node
export async function relatedSkillsNode(params) {
  const { skillSlug, limit = 5 } = params;
  console.log('🔗 Getting related skills for:', skillSlug);
  try {
    return await skillhubClient.getRelatedSkills(skillSlug, limit);
  } catch (error) {
    console.error('Related skills failed:', error.message);
    return { success: false, error: error.message, skills: [] };
  }
}

// LLM Node（统一走 engine/llm-client）
export async function llmNode(params) {
  const { prompt, temperature = 0.7 } = params;
  const model = 'deepseek-v4-flash';
  console.log('🤖 Calling LLM with model:', model);
  return complete({ prompt, model, temperature });
}

// Agent Router Node
export async function agentRouterNode(params) {
  const { input, agents = ['frontend', 'backend', 'database'] } = params;
  console.log('🎯 Routing task to appropriate agent...');
  const routerPrompt = `
    Analyze the following task and determine which specialized agent should handle it:
    Task: ${input}
    
    Available agents: ${agents.join(', ')}
    
    Return only the most suitable agent name (one of: ${agents.join(', ')}).
  `;
  try {
    const llmResult = await llmNode({ prompt: routerPrompt });
    return { selectedAgent: llmResult.response.trim().toLowerCase(), originalInput: input };
  } catch (error) {
    console.error('Agent routing failed:', error.message);
    return { selectedAgent: agents[0], originalInput: input, error: error.message };
  }
}

// Data Transform Node
export async function dataTransformNode(params) {
  const { data, operation } = params;
  console.log('🔄 Transforming data with operation:', operation);
  try {
    switch (operation) {
      case 'json_parse':
        return { result: typeof data === 'string' ? JSON.parse(data) : data };
      case 'json_stringify':
        return { result: typeof data === 'object' ? JSON.stringify(data, null, 2) : data };
      case 'extract_field': {
        const { field } = params;
        return { result: data && data[field] !== undefined ? data[field] : null };
      }
      case 'uppercase':
        return { result: typeof data === 'string' ? data.toUpperCase() : data };
      case 'lowercase':
        return { result: typeof data === 'string' ? data.toLowerCase() : data };
      case 'trim':
        return { result: typeof data === 'string' ? data.trim() : data };
      default:
        return { result: data };
    }
  } catch (error) {
    console.error('Data transform failed:', error.message);
    return { result: null, error: error.message };
  }
}

// Reviewer Node - Quality Gate
export async function reviewerNode(params) {
  const { reviewType, dataToReview, qualityCriteria } = params;
  console.log(`🔍 Reviewing ${reviewType}...`);
  const prompt = generateReviewPrompt(reviewType, dataToReview, qualityCriteria);
  try {
    const llmResult = await llmNode({
      prompt,
      temperature: parseFloat(process.env.REVIEWER_TEMPERATURE) || 0.2,
    });
    let review;
    try {
      const jsonMatch = llmResult.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        review = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse review response:', parseError);
      return {
        reviewPassed: false,
        issues: ['审查结果解析失败'],
        suggestions: ['请重试或联系管理员'],
        confidence: 0.0,
        reviewDetails: { raw_response: llmResult.response },
      };
    }
    return {
      reviewPassed: review.passed,
      issues: review.issues || [],
      suggestions: review.suggestions || [],
      confidence: review.confidence || 0.8,
      reviewDetails: review,
    };
  } catch (error) {
    console.error('Review failed:', error.message);
    return {
      reviewPassed: false,
      issues: ['审查过程出错'],
      suggestions: ['请重试或联系管理员'],
      confidence: 0.0,
    };
  }
}

// Parallel Search Node - Fan-out Pattern
export async function parallelSearchNode(params) {
  const { searchTasks, timeout = parseInt(process.env.PARALLEL_SEARCH_TIMEOUT) || 30000 } = params;
  console.log(`⚡ Starting parallel search with ${searchTasks.length} tasks...`);
  const promises = searchTasks.map(async (task) => {
    try {
      const result = await Promise.race([
        executeSearchTask(task),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
      ]);
      return { taskId: task.id, success: true, result };
    } catch (error) {
      console.warn(`⚠️ Search task ${task.id} failed:`, error.message);
      return { taskId: task.id, success: false, error: error.message };
    }
  });
  const results = await Promise.all(promises);
  return {
    totalTasks: searchTasks.length,
    successfulTasks: results.filter((r) => r.success).length,
    failedTasks: results.filter((r) => !r.success).length,
    results: results.reduce((acc, r) => { acc[r.taskId] = r; return acc; }, {}),
  };
}

// Helper to execute individual search tasks
export async function executeSearchTask(task) {
  switch (task.type) {
    case 'github_search':
      console.log('Searching GitHub for:', task.query);
      return { source: 'github', query: task.query, results: [] };
    case 'huggingface_search':
      console.log('Searching HuggingFace for:', task.query);
      return { source: 'huggingface', query: task.query, results: [] };
    case 'skill_search':
      return await skillhubClient.searchSkills({
        query: task.query,
        limit: task.limit || 10,
        page: task.page || 1,
      });
    default:
      throw new Error(`Unknown search type: ${task.type}`);
  }
}

// Node registry
export const nodeRegistry = {
  'skillhub_search': skillhubSearchNode,
  'skillhub_detail': skillhubDetailNode,
  'semantic_search': semanticSearchNode,
  'tool_discovery': toolDiscoveryNode,
  'related_skills': relatedSkillsNode,
  'llm': llmNode,
  'text_process': textProcessNode,
  'condition': conditionNode,
  'agent_router': agentRouterNode,
  'data_transform': dataTransformNode,
  'reviewer': reviewerNode,
  'parallel_search': parallelSearchNode,
};
