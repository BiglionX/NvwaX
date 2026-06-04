/**
 * Plugin Context Middleware
 * 
 * 解析 X-Plugin-Capabilities HTTP Header 并将插件上下文注入到请求中
 * 对应 PRD v2.0 章节 2.2.1
 */

import { Request, Response, NextFunction } from 'express';
import { pluginContextService } from '../services/plugin-context.service.js';
import { PluginCapability } from '../types/plugin-capabilities.types.js';

/**
 * 插件上下文中间件
 * 
 * 从 X-Plugin-Capabilities header 中读取插件能力信息
 * 并将其挂载到 req.pluginContext 上供后续 handler 使用
 * 
 * ProClaw 端请求格式（对应 PRD 2.2.1）：
 * X-Plugin-Capabilities: [{ plugin_id, plugin_name, actions, data_queries }]
 */
export function pluginContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const headerValue = req.headers['x-plugin-capabilities'] as string | undefined;

  if (!headerValue) {
    req.pluginContext = { capabilities: [] };
    next();
    return;
  }

  try {
    const capabilities: PluginCapability[] = pluginContextService.parseHeaderValue(headerValue);

    req.pluginContext = {
      capabilities,
      rawHeader: headerValue
    };

    if (capabilities.length > 0) {
      const names = capabilities.map(c => c.plugin_name).join(', ');
      console.log(`📦 Plugin context injected: ${names} (${capabilities.length} plugins)`);
    }

    next();
  } catch (error) {
    console.warn('⚠️ Failed to parse X-Plugin-Capabilities header:', error);
    req.pluginContext = { capabilities: [] };
    next();
  }
}
