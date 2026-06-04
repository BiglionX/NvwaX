/**
 * Capabilities Routes
 * 
 * 插件能力注册/注销/查询 API 路由
 * 对应 PRD v2.0 章节 2.2.3
 * 
 * 基础路径: /v2/capabilities
 * 完整路径: /api/v2/capabilities/*
 */

import { Router } from 'express';
import { capabilitiesController } from '../controllers/capabilities.controller.js';

const router = Router();

/**
 * GET /api/v2/capabilities
 * 查询所有已注册的插件能力（需在 :plugin_id 路由之前注册）
 */
router.get('/', capabilitiesController.getAllCapabilities.bind(capabilitiesController));

/**
 * POST /api/v2/capabilities/register
 * 注册插件能力列表
 */
router.post('/register', capabilitiesController.register.bind(capabilitiesController));

/**
 * POST /api/v2/capabilities/unregister
 * 卸载插件能力
 */
router.post('/unregister', capabilitiesController.unregister.bind(capabilitiesController));

/**
 * GET /api/v2/capabilities/:plugin_id
 * 查询已注册的插件能力
 */
router.get('/:plugin_id', capabilitiesController.getCapability.bind(capabilitiesController));

export default router;
