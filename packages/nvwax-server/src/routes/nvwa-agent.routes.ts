/**
 * Nvwa Agent Routes
 * 
 * API routes for Nvwa single agent creation workflow
 */

import { Router } from 'express';
import { nvwaAgentService } from '../services/nvwa-agent.service.js';
import { pluginContextMiddleware } from '../middleware/plugin-context.middleware.js';
import { pluginContextService } from '../services/plugin-context.service.js';
import { pluginActionService } from '../services/plugin-action.service.js';

const router = Router();

/**
 * POST /api/nvwa-agent/plugin-aware-chat
 * 插件感知的对话处理
 * 接收 X-Plugin-Capabilities header，将插件上下文注入到 Agent 处理中
 */
router.post('/plugin-aware-chat', pluginContextMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required'
      });
    }
    
    const capabilities = req.pluginContext?.capabilities || [];
    
    console.log(`📥 Plugin-aware chat request with ${capabilities.length} plugin(s):`, 
      capabilities.map(c => c.plugin_name).join(', '));
    
    // 生成插件上下文的系统提示词
    const pluginPrompt = capabilities.length > 0 
      ? pluginContextService.generateSystemPrompt(capabilities)
      : '';
    
    // 生成 function calling 工具
    const functionTools = capabilities.length > 0
      ? pluginContextService.generateActionList(capabilities)
      : [];
    
    res.json({
      success: true,
      data: {
        message: `Received message: ${message}`,
        plugin_context: {
          active: capabilities.length > 0,
          plugin_count: capabilities.length,
          plugin_names: capabilities.map(c => c.plugin_name),
          system_prompt: pluginPrompt,
          function_tools: functionTools
        }
      }
    });
  } catch (error: any) {
    console.error('❌ Plugin-aware chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process plugin-aware chat'
    });
  }
});

/**
 * POST /api/nvwa-agent/parse-action-output
 * 解析 LLM 回复中的 Action 输出
 */
router.post('/parse-action-output', async (req, res) => {
  try {
    const { llm_response } = req.body;
    
    if (!llm_response) {
      return res.status(400).json({
        success: false,
        error: 'llm_response is required'
      });
    }
    
    console.log('📥 Parsing action output from LLM response');
    
    const result = pluginActionService.parseActionOutput(llm_response);
    
    res.json({
      success: true,
      data: {
        text: result.text,
        outputs: result.outputs,
        output_count: result.outputs.length
      }
    });
  } catch (error: any) {
    console.error('❌ Action output parsing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to parse action output'
    });
  }
});

/**
 * POST /api/nvwa-agent/review-config
 * 审查 Agent 配置
 */
router.post('/review-config', async (req, res) => {
  try {
    const { agentConfig, reviewType } = req.body;
    
    if (!agentConfig) {
      return res.status(400).json({
        success: false,
        error: 'agentConfig is required'
      });
    }
    
    console.log('📥 Received config review request');
    
    const result = await nvwaAgentService.reviewAgentConfig(agentConfig);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('❌ Config review error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to review configuration'
    });
  }
});

/**
 * POST /api/nvwa-agent/search-templates
 * 搜索模板（并行搜索）
 */
router.post('/search-templates', async (req, res) => {
  try {
    const { description, implementation } = req.body;
    
    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'description is required'
      });
    }
    
    console.log(`📥 Received template search for: ${description}`);
    
    const templates = await nvwaAgentService.searchTemplates(description);
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error: any) {
    console.error('❌ Template search error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search templates'
    });
  }
});

/**
 * POST /api/nvwa-agent/validate-skills
 * 验证技能依赖
 */
router.post('/validate-skills', async (req, res) => {
  try {
    const { skills } = req.body;
    
    if (!skills || !Array.isArray(skills)) {
      return res.status(400).json({
        success: false,
        error: 'skills array is required'
      });
    }
    
    console.log(`📥 Received skill validation for ${skills.length} skills`);
    
    const result = await nvwaAgentService.validateSkillDependencies(skills);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('❌ Skill validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate skills'
    });
  }
});

export default router;
