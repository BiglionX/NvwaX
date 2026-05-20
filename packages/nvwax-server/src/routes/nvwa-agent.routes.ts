/**
 * Nvwa Agent Routes
 * 
 * API routes for Nvwa single agent creation workflow
 */

import { Router } from 'express';
import { nvwaAgentService } from '../services/nvwa-agent.service.js';

const router = Router();

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
