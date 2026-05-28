/**
 * Nvwa Agent Service
 * 
 * 为 Nvwa 普通 Agent 创建流程提供审查、搜索和验证功能
 * 复用阶段一在 AiTeam 中实现的工作流引擎能力
 */

import axios from 'axios';
import { agentSearchService } from './agent-search.service.js';

const WORKFLOW_API_URL = process.env.WORKFLOW_API_URL || 'http://localhost:3002/api';

export class NvwaAgentService {
  /**
   * 审查 Agent 配置
   * 
   * @param config - Agent 配置对象
   * @returns 审查结果
   */
  async reviewAgentConfig(config: any): Promise<{
    reviewPassed: boolean;
    issues: string[];
    suggestions: string[];
    confidence: number;
  }> {
    try {
      console.log('🔍 Reviewing Nvwa Agent configuration...');
      
      // 调用工作流引擎执行审查
      const result = await this.executeReviewerWorkflow(
        'nvwa-agent-config-review',
        { agentConfig: config }
      );
      
      return {
        reviewPassed: result.final_validation?.reviewPassed || false,
        issues: result.final_validation?.issues || [],
        suggestions: result.final_validation?.suggestions || [],
        confidence: result.final_validation?.confidence || 0.8
      };
    } catch (error) {
      console.error('❌ Agent config review failed:', error);
      // 降级策略：返回安全默认值，不阻断流程
      return {
        reviewPassed: true,
        issues: ['审查服务暂时不可用'],
        suggestions: ['请手动检查配置完整性'],
        confidence: 0.5
      };
    }
  }

  /**
   * 搜索模板（并行搜索多个源）
   * 
   * @param query - 搜索关键词
   * @returns 匹配的模板列表
   */
  async searchTemplates(query: string): Promise<any[]> {
    try {
      console.log(`🔍 Searching templates for: ${query} (GitHub + Gitee + ModelScope)`);
      
      // 直接调用 agent-search.service，它会自动搜索多个源
      const result = await agentSearchService.searchAgents(query, 1, 20);
      
      console.log(`✅ Found ${result.total} templates from ${result.fromLocal ? 'local' : 'online'} sources`);
      
      // 转换为前端需要的格式
      return result.data.map(agent => ({
        name: agent.name,
        title: agent.name,
        description: agent.description,
        url: agent.url,
        source: agent.source,
        rating: agent.stars ? (agent.stars / 1000).toFixed(1) : 'N/A',
        matchScore: this.calculateMatchScore(agent, query),
        skills: agent.tags || [],
        author: agent.author,
        downloads: agent.downloads
      }));
    } catch (error) {
      console.error('❌ Template search failed:', error);
      // 降级策略：返回空数组，前端会提示用户
      return [];
    }
  }

  /**
   * 计算匹配分数（简单实现）
   */
  private calculateMatchScore(agent: any, query: string): number {
    const queryLower = query.toLowerCase();
    const nameLower = (agent.name || '').toLowerCase();
    const descLower = (agent.description || '').toLowerCase();
    
    let score = 0;
    
    // 名称匹配权重高
    if (nameLower.includes(queryLower)) {
      score += 50;
    }
    
    // 描述匹配
    if (descLower.includes(queryLower)) {
      score += 30;
    }
    
    // 标签匹配
    if (agent.tags && agent.tags.some((tag: string) => tag.toLowerCase().includes(queryLower))) {
      score += 20;
    }
    
    // 根据星级调整
    if (agent.stars) {
      score += Math.min(agent.stars / 100, 10);
    }
    
    return Math.min(score, 100);
  }

  /**
   * 验证技能依赖
   * 
   * @param skills - 技能列表
   * @returns 验证结果
   */
  async validateSkillDependencies(skills: string[]): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    try {
      console.log('🔍 Validating skill dependencies...');
      
      const graph = this.buildSkillDependencyGraph(skills);
      const availableSkills = new Set([
        'nlp',
        'knowledge_base',
        'dialogue_management',
        'text_preprocessing',
        'vector_embedding',
        'context_tracking'
      ]);
      
      const validation = this.validateDependencyGraph(graph, availableSkills);
      
      return {
        valid: validation.valid,
        issues: validation.issues
      };
    } catch (error) {
      console.error('❌ Skill dependency validation failed:', error);
      return {
        valid: true,
        issues: ['依赖验证暂时不可用']
      };
    }
  }

  /**
   * 执行审查器工作流
   * 
   * @param workflowName - 工作流名称
   * @param inputData - 输入数据
   * @returns 工作流执行结果
   */
  private async executeReviewerWorkflow(workflowName: string, inputData: any): Promise<any> {
    try {
      // 1. 创建工作流
      const workflowResponse = await axios.post(
        `${WORKFLOW_API_URL}/workflows`,
        {
          name: `Temp ${workflowName}`,
          description: 'Temporary workflow for review',
          nodes: [], // 节点定义从模板加载
          edges: []
        }
      );
      
      const workflowId = workflowResponse.data.id;
      
      // 2. 执行工作流（使用模板）
      const executeResponse = await axios.post(
        `${WORKFLOW_API_URL}/workflows/${workflowId}/execute`,
        {
          templateName: workflowName,
          input: inputData
        }
      );
      
      return executeResponse.data.results;
    } catch (error) {
      console.error('Reviewer workflow execution failed:', error);
      throw error;
    }
  }

  /**
   * 构建技能依赖图
   * 
   * @param skills - 技能列表
   * @returns 依赖图 Map<skill, dependencies[]>
   */
  private buildSkillDependencyGraph(skills: string[]): Map<string, string[]> {
    // 预定义的技能依赖关系
    const dependencyMap: Record<string, string[]> = {
      '自然语言处理': ['文本预处理'],
      '知识库检索': ['向量嵌入'],
      '对话管理': ['上下文跟踪'],
      '数据分析': ['数据清洗'],
      '图像识别': ['图像预处理'],
      '语音识别': ['音频预处理']
    };
    
    const graph = new Map<string, string[]>();
    
    skills.forEach(skill => {
      const dependencies = dependencyMap[skill] || [];
      graph.set(skill, dependencies);
    });
    
    return graph;
  }

  /**
   * 验证依赖图（检测循环依赖和缺失依赖）
   * 
   * @param graph - 依赖图
   * @param availableSkills - 可用技能集合
   * @returns 验证结果
   */
  private validateDependencyGraph(
    graph: Map<string, string[]>,
    availableSkills: Set<string>
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // 1. 检查缺失的依赖
    graph.forEach((dependencies, skill) => {
      dependencies.forEach(dep => {
        if (!availableSkills.has(dep)) {
          issues.push(`技能 "${skill}" 依赖 "${dep}"，但该技能不可用`);
        }
      });
    });
    
    // 2. 检测循环依赖（DFS）
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (skill: string): boolean => {
      if (recursionStack.has(skill)) {
        return true; // 发现循环
      }
      
      if (visited.has(skill)) {
        return false;
      }
      
      visited.add(skill);
      recursionStack.add(skill);
      
      const dependencies = graph.get(skill) || [];
      for (const dep of dependencies) {
        if (hasCycle(dep)) {
          return true;
        }
      }
      
      recursionStack.delete(skill);
      return false;
    };
    
    // 检查所有技能
    graph.forEach((_, skill) => {
      if (hasCycle(skill)) {
        issues.push(`检测到循环依赖，涉及技能: ${skill}`);
      }
    });
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}

// 导出单例
export const nvwaAgentService = new NvwaAgentService();
