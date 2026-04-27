import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AGENT_TYPES, findAgentsByKeywords } from './agent-definitions.js';
import { executeWorkflow } from '../server.js';
import { leaderAgent } from './leader-agent.js';

/**
 * 多 Agent 协调器
 * 负责任务分解、Agent 分配和结果整合
 */
class AgentOrchestrator {
  constructor() {
    this.llm = new ChatOpenAI({
      modelName: process.env.OPENAI_API_KEY ? 'gpt-4' : 'gpt-3.5-turbo',
      temperature: 0.3,
      openAIApiKey: process.env.OPENAI_API_KEY || 'mock-key'
    });
  }

  /**
   * 分析任务并分解为子任务
   * @param {string} taskDescription - 任务描述
   * @returns {Promise<Object>} 分解后的子任务列表
   */
  async decomposeTask(taskDescription) {
    const prompt = `
你是一个任务分解专家。请分析以下任务，并将其分解为独立的子任务。

任务描述: ${taskDescription}

请按照以下 JSON 格式返回结果（只返回 JSON，不要包含其他文字）：
{
  "subtasks": [
    {
      "id": "task_1",
      "description": "子任务描述",
      "agent_type": "frontend-agent|backend-agent|database-agent|test-agent|docs-agent",
      "dependencies": [],
      "estimated_complexity": "low|medium|high"
    }
  ],
  "execution_strategy": "parallel|sequential|hybrid"
}
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      
      // 尝试解析 JSON
      const content = response.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.error('Task decomposition failed:', error.message);
      
      // 如果 LLM 调用失败，使用简单的默认分解
      return {
        subtasks: [
          {
            id: 'task_1',
            description: taskDescription,
            agent_type: 'backend-agent',
            dependencies: [],
            estimated_complexity: 'medium'
          }
        ],
        execution_strategy: 'sequential'
      };
    }
  }

  /**
   * 为子任务分配合适的 Agent
   * @param {Object} subtask - 子任务对象
   * @returns {Object} 分配的 Agent
   */
  assignAgentToSubtask(subtask) {
    // 首先尝试从 agent_type 字段获取
    if (subtask.agent_type) {
      const agentType = Object.values(AGENT_TYPES).find(
        agent => agent.id === subtask.agent_type
      );
      if (agentType) {
        return agentType;
      }
    }
    
    // 否则根据关键词匹配
    const keywords = subtask.description.split(/[\s,，]+/).filter(k => k.length > 0);
    const matchedAgents = findAgentsByKeywords(keywords);
    
    if (matchedAgents.length > 0) {
      return matchedAgents[0];
    }
    
    // 默认返回 backend agent
    return AGENT_TYPES.BACKEND;
  }

  /**
   * 执行单个 Agent 任务
   * @param {Object} agent - Agent 定义
   * @param {Object} subtask - 子任务
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} 执行结果
   */
  async executeAgentTask(agent, subtask, context = {}) {
    console.log(`🤖 Executing ${agent.name} for task: ${subtask.description}`);
    
    // 构建 Agent 专属的工作流
    const workflow = {
      id: `workflow_${agent.id}_${Date.now()}`,
      name: `${agent.name} Task`,
      nodes: [
        {
          id: 'agent_llm',
          type: 'llm',
          params: {
            prompt: `
你是 ${agent.name}。
专长领域: ${agent.description}

任务: ${subtask.description}

上下文信息: ${JSON.stringify(context, null, 2)}

请提供专业的解决方案，包括：
1. 实现思路
2. 关键代码示例
3. 注意事项和建议

请用中文回答。
`,
            model: 'gpt-3.5-turbo',
            temperature: 0.7
          }
        }
      ],
      edges: []
    };
    
    try {
      const result = await executeWorkflow(workflow, context);
      
      return {
        agent: agent.id,
        agentName: agent.name,
        task: subtask.id,
        taskDescription: subtask.description,
        status: 'completed',
        result: result.results.agent_llm?.response || 'No response',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Agent task execution failed:`, error.message);
      
      return {
        agent: agent.id,
        agentName: agent.name,
        task: subtask.id,
        taskDescription: subtask.description,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 协调整个多 Agent 任务执行（原有方法，保持向后兼容）
   * @param {string} taskDescription - 任务描述
   * @returns {Promise<Object>} 完整的执行结果
   */
  async orchestrate(taskDescription) {
    console.log('🎯 Starting multi-agent orchestration');
    console.log('Task:', taskDescription);
    
    const startTime = Date.now();
    
    try {
      // 步骤 1: 分解任务
      const decomposition = await this.decomposeTask(taskDescription);
      console.log('📋 Task decomposed into', decomposition.subtasks.length, 'subtasks');
      console.log('Execution strategy:', decomposition.execution_strategy);
      
      // 步骤 2: 为每个子任务分配 Agent
      const assignedTasks = decomposition.subtasks.map(subtask => ({
        ...subtask,
        assignedAgent: this.assignAgentToSubtask(subtask)
      }));
      
      console.log('🤖 Agents assigned:');
      assignedTasks.forEach(task => {
        console.log(`  - ${task.taskDescription} → ${task.assignedAgent.name}`);
      });
      
      // 步骤 3: 根据执行策略执行任务
      const results = [];
      
      if (decomposition.execution_strategy === 'parallel') {
        // 并行执行所有任务
        console.log('\n⚡ Executing tasks in parallel...');
        const promises = assignedTasks.map(task => 
          this.executeAgentTask(task.assignedAgent, task)
        );
        const parallelResults = await Promise.all(promises);
        results.push(...parallelResults);
        
      } else if (decomposition.execution_strategy === 'sequential') {
        // 串行执行任务
        console.log('\n📝 Executing tasks sequentially...');
        for (const task of assignedTasks) {
          const result = await this.executeAgentTask(task.assignedAgent, task, {
            previousResults: results
          });
          results.push(result);
        }
        
      } else {
        // 混合执行：根据依赖关系分组并行
        console.log('\n🔄 Executing tasks with hybrid strategy...');
        const completedTaskIds = new Set();
        const pendingTasks = [...assignedTasks];
        
        while (pendingTasks.length > 0) {
          // 找出可以执行的任务（依赖已满足）
          const readyTasks = pendingTasks.filter(task => 
            task.dependencies.every(dep => completedTaskIds.has(dep))
          );
          
          if (readyTasks.length === 0) {
            console.warn('⚠️ Circular dependency detected or unmet dependencies');
            break;
          }
          
          console.log(`\nExecuting batch of ${readyTasks.length} task(s)...`);
          
          // 并行执行就绪的任务
          const promises = readyTasks.map(task => 
            this.executeAgentTask(task.assignedAgent, task, {
              previousResults: results
            })
          );
          
          const batchResults = await Promise.all(promises);
          results.push(...batchResults);
          
          // 标记已完成的任务
          readyTasks.forEach(task => completedTaskIds.add(task.id));
          
          // 从待处理列表中移除已完成的任务
          const completedIds = new Set(readyTasks.map(t => t.id));
          pendingTasks.splice(0, pendingTasks.length, 
            ...pendingTasks.filter(t => !completedIds.has(t.id))
          );
        }
      }
      
      // 步骤 4: 生成摘要
      const summary = await this.generateSummary(taskDescription, results);
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      
      // 步骤 5: 整合结果
      const finalResult = {
        success: true,
        taskDescription,
        executionStrategy: decomposition.execution_strategy,
        totalSubtasks: assignedTasks.length,
        completedSubtasks: results.filter(r => r.status === 'completed').length,
        failedSubtasks: results.filter(r => r.status === 'failed').length,
        results: results,
        summary: summary,
        elapsedTime: `${elapsed}s`,
        completedAt: new Date().toISOString()
      };
      
      console.log('\n✅ Multi-agent orchestration completed');
      console.log(`Total time: ${elapsed}s`);
      
      return finalResult;
      
    } catch (error) {
      console.error('❌ Orchestration failed:', error.message);
      
      return {
        success: false,
        taskDescription,
        error: error.message,
        completedAt: new Date().toISOString()
      };
    }
  }

  /**
   * 生成执行摘要
   * @param {string} taskDescription - 原始任务描述
   * @param {Array} results - 各 Agent 的执行结果
   * @returns {Promise<string>} 摘要文本
   */
  async generateSummary(taskDescription, results) {
    const completedResults = results.filter(r => r.status === 'completed');
    
    if (completedResults.length === 0) {
      return '所有任务执行失败，请检查错误信息。';
    }
    
    const prompt = `
任务: ${taskDescription}

各 Agent 执行结果:
${completedResults.map(r => `- ${r.agentName}: ${r.result.substring(0, 200)}...`).join('\n')}

请总结整体执行情况，包括：
1. 完成的主要工作
2. 关键决策和建议
3. 下一步行动

用简洁的中文回答（200字以内）。
`;
    
    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      return response.content;
    } catch (error) {
      console.error('Summary generation failed:', error.message);
      
      // 返回简单摘要
      return `任务已完成。共执行 ${completedResults.length} 个子任务。`;
    }
  }

  /**
   * 使用 Leader Agent 进行智能团队编排（新增方法）
   * @param {string} requirement - 用户需求
   * @param {Object} options - 可选配置
   * @returns {Promise<Object>} 团队执行结果
   */
  async orchestrateWithLeader(requirement, options = {}) {
    console.log('👑 Starting Leader Agent orchestration');
    console.log('Requirement:', requirement);
    
    const startTime = Date.now();
    
    try {
      // Step 1: Leader Agent 选择或创建 Team Skill
      const teamConfig = await leaderAgent.selectOrCreateTeamSkill(requirement);
      console.log('✅ Team configuration ready:', teamConfig.name);
      
      // Step 2: 执行团队任务
      const result = await leaderAgent.executeTeamTask(
        teamConfig,
        requirement,
        options.workspace || {}
      );
      
      const executionTime = Date.now() - startTime;
      
      console.log(`\n🎉 Leader Agent orchestration completed in ${executionTime}ms`);
      
      return {
        success: true,
        mode: 'leader-agent',
        teamName: teamConfig.name,
        teamDescription: teamConfig.description,
        category: teamConfig.category,
        teammates: teamConfig.teammates.map(t => ({
          role: t.role,
          specialty: t.specialty
        })),
        workflowSteps: teamConfig.workflow.steps.length,
        executionResult: result,
        executionTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Leader Agent orchestration failed:', error);
      
      return {
        success: false,
        mode: 'leader-agent',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// 创建单例实例
export const orchestrator = new AgentOrchestrator();
export default AgentOrchestrator;
