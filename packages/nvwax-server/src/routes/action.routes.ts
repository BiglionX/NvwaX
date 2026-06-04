/**
 * Action Routes
 * 
 * Agent Action 验证相关 API 路由
 * 对应 PRD v2.0 章节 2.5.2
 * 
 * 基础路径: /v2/agents
 * 完整路径: /api/v2/agents/{id}/validate_action
 */

import { Router } from 'express';
import { pluginActionService } from '../services/plugin-action.service.js';
import { pluginCapabilitiesService } from '../services/plugin-capabilities.service.js';
import { presetService } from '../services/preset.service.js';
import {
  ActionValidationRequest
} from '../types/plugin-capabilities.types.js';

const router = Router();

/**
 * GET /api/v2/agents/:id/presets
 * 根据插件能力返回 Agent 预设提示词
 * 对应 PRD 2.5
 */
router.get('/:id/presets', async (req, res) => {
  try {
    const { id } = req.params;
    const pluginIds = req.query.plugin_ids 
      ? (req.query.plugin_ids as string).split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Agent ID is required'
      });
    }

    console.log(`📥 Generating preset for agent: ${id}${pluginIds ? ` with plugins: ${pluginIds.join(', ')}` : ''}`);

    const preset = await presetService.generatePreset(id as string, pluginIds);

    res.json({
      success: true,
      data: preset
    });
  } catch (error: any) {
    console.error('❌ Preset generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate preset'
    });
  }
});

/**
 * POST /api/v2/agents/:id/validate_action
 * 验证动作名称和参数是否符合插件定义
 * 对应 PRD 2.5.2
 */
router.post('/:id/validate_action', async (req, res) => {
  try {
    const { action_name, parameters, plugin_id } = req.body;

    if (!action_name) {
      return res.status(400).json({
        success: false,
        error: 'action_name is required'
      });
    }

    console.log(`📥 Validating action: ${action_name} for agent ${req.params.id}`);

    // 查找插件能力定义
    let capability = null;
    if (plugin_id) {
      const record = await pluginCapabilitiesService.getCapability(plugin_id);
      if (record) {
        capability = pluginCapabilitiesService.toCapabilityResponse(record);
      }
    } else {
      // 尝试从所有注册的能力中查找
      const allRecords = await pluginCapabilitiesService.getAllCapabilities();
      for (const record of allRecords) {
        const cap = pluginCapabilitiesService.toCapabilityResponse(record);
        const actionExists = cap.actions.some(a => a.name === action_name);
        if (actionExists) {
          capability = cap;
          break;
        }
      }
    }

    if (!capability) {
      return res.status(404).json({
        success: false,
        error: `No plugin capability found for action: ${action_name}${plugin_id ? ` (plugin: ${plugin_id})` : ''}`
      });
    }

    const validationRequest: ActionValidationRequest = {
      action_name,
      parameters: parameters || {},
      plugin_id: capability.plugin_id
    };

    const validationResult = await pluginActionService.validateAction(
      validationRequest,
      capability
    );

    res.json({
      success: true,
      data: validationResult
    });
  } catch (error: any) {
    console.error('❌ Action validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate action'
    });
  }
});

export default router;
