import { Router } from 'express';
import { chatController } from '../controllers/chat.controller.js';
import { apiKeyAuthMiddleware } from '../middleware/api-key-auth.middleware.js';
import { apiKeyService } from '../services/api-key.service.js';
import v1Routes from './v1/index.js';

const router = Router();

// All v1 API routes require API key authentication
router.use(apiKeyAuthMiddleware);

// API 调用记录中间件（记录每次成功/失败的 API 调用到 api_usage 表）
// 注意：chat/completions 由 chatController 内部自行记录 token 消耗
router.use((req, res, next) => {
  // chat/completions 有独立的 token 计费逻辑
  if (req.path === '/chat/completions') {
    next();
    return;
  }

  // 拦截 res.json 以在响应后记录调用
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    if (req.apiKey) {
      const isError = res.statusCode >= 400;
      apiKeyService.recordUsage({
        apiKeyId: req.apiKey.id,
        tenantId: req.apiKey.tenant_id,
        endpoint: req.originalUrl || req.path,
        method: req.method,
        tokensUsed: 0,
        cost: 0,
        status: isError ? 'error' : 'success',
        ipAddress: req.ip || undefined,
        userAgent: req.get('User-Agent')
      }).catch((err: Error) => console.error('Failed to record API usage:', err));
    }
    return originalJson(body);
  };
  next();
});

// Chat Completions API (OpenAI-compatible)
router.post('/chat/completions', chatController.createCompletion.bind(chatController));

// Developer API v1 routes
router.use('/', v1Routes);

export default router;
