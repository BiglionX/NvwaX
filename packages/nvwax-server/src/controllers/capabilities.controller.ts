/**
 * CapabilitiesController
 * 
 * 插件能力注册/注销/查询 API 控制器
 * 对应 PRD v2.0 章节 2.2.3
 */

import { Request, Response } from 'express';
import { pluginCapabilitiesService } from '../services/plugin-capabilities.service.js';

export class CapabilitiesController {
  /**
   * POST /v2/capabilities/register
   * 注册插件能力列表
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { plugin_id, plugin_name, actions, data_queries, skill_ids } = req.body;

      // 参数验证
      if (!plugin_id || !plugin_name) {
        res.status(400).json({
          success: false,
          error: 'plugin_id and plugin_name are required'
        });
        return;
      }

      if (!actions || !Array.isArray(actions)) {
        res.status(400).json({
          success: false,
          error: 'actions array is required'
        });
        return;
      }

      console.log(`📥 Registering plugin capability: ${plugin_id} (${plugin_name})`);

      const record = await pluginCapabilitiesService.registerCapability({
        plugin_id,
        plugin_name,
        actions,
        data_queries: data_queries || [],
        skill_ids: skill_ids || []
      });

      res.json({
        success: true,
        data: pluginCapabilitiesService.toCapabilityResponse(record)
      });
    } catch (error: any) {
      console.error('❌ Capability registration error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to register plugin capability'
      });
    }
  }

  /**
   * POST /v2/capabilities/unregister
   * 注销插件能力
   */
  async unregister(req: Request, res: Response): Promise<void> {
    try {
      const { plugin_id } = req.body;

      if (!plugin_id) {
        res.status(400).json({
          success: false,
          error: 'plugin_id is required'
        });
        return;
      }

      console.log(`📥 Unregistering plugin capability: ${plugin_id}`);

      const success = await pluginCapabilitiesService.unregisterCapability(plugin_id);

      if (success) {
        res.json({
          success: true,
          message: `Plugin ${plugin_id} capability unregistered`
        });
      } else {
        res.status(404).json({
          success: false,
          error: `Plugin ${plugin_id} not found`
        });
      }
    } catch (error: any) {
      console.error('❌ Capability unregister error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to unregister plugin capability'
      });
    }
  }

  /**
   * GET /v2/capabilities/:plugin_id
   * 查询已注册的插件能力
   */
  async getCapability(req: Request, res: Response): Promise<void> {
    try {
      const pluginId = req.params.plugin_id as string;

      if (!pluginId) {
        res.status(400).json({
          success: false,
          error: 'plugin_id is required'
        });
        return;
      }

      console.log(`📥 Querying plugin capability: ${pluginId}`);

      const record = await pluginCapabilitiesService.getCapability(pluginId);

      if (record) {
        res.json({
          success: true,
          data: pluginCapabilitiesService.toCapabilityResponse(record)
        });
      } else {
        res.status(404).json({
          success: false,
          error: `Plugin capability not found: ${pluginId}`
        });
      }
    } catch (error: any) {
      console.error('❌ Capability query error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to query plugin capability'
      });
    }
  }

  /**
   * GET /v2/capabilities
   * 查询所有已注册的插件能力
   */
  async getAllCapabilities(req: Request, res: Response): Promise<void> {
    try {
      console.log('📥 Querying all plugin capabilities');

      const records = await pluginCapabilitiesService.getAllCapabilities();
      const capabilities = records.map(r => pluginCapabilitiesService.toCapabilityResponse(r));

      res.json({
        success: true,
        data: capabilities,
        total: capabilities.length
      });
    } catch (error: any) {
      console.error('❌ Capabilities list query error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to query plugin capabilities'
      });
    }
  }
}

export const capabilitiesController = new CapabilitiesController();
