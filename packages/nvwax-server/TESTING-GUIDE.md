# 虚拟公司模块 - 认证集成与单元测试

## 📋 概述

本文档说明虚拟公司创建模块的认证系统集成和单元测试配置。

---

## ✅ 已完成的改进

### 1. 真实认证系统集成

#### 修改内容

**路由层** (`src/routes/virtual-company.routes.ts`):
```typescript
import { userAuthMiddleware } from '../middleware/user-auth.middleware.js';

// 所有虚拟公司路由都需要用户认证
router.use(userAuthMiddleware);
```

**控制器层** (`src/controllers/virtual-company-creation.controller.ts`):
- ✅ 移除了所有 `test-user-dev` 和 `user-123` fallback
- ✅ 添加了严格的认证检查
- ✅ 未认证请求返回 401 错误

**受影响的 API 端点**:
- `POST /api/virtual-company/sessions` - 创建会话
- `GET /api/virtual-company/sessions` - 获取用户会话列表
- `DELETE /api/virtual-company/sessions/:id` - 删除会话
- `POST /api/virtual-company/sessions/:id/decide-agents` - Agent 决策
- `POST /api/virtual-company/sessions/:id/confirm-agent` - 确认 Agent 决策

#### 认证流程

1. 客户端在请求头中携带 JWT Token:
   ```
   Authorization: Bearer <jwt_token>
   ```

2. `userAuthMiddleware` 验证 token:
   - 检查 token 格式
   - 验证 JWT 签名
   - 解码用户信息
   - 将用户 ID 附加到 `req.user`

3. 控制器从 `req.user.id` 获取用户 ID
   - 如果不存在，返回 401 错误
   - 如果存在，继续处理业务逻辑

---

### 2. 自动化单元测试

#### 测试框架配置

**Jest 配置** (`jest.config.js`):
- ESM 模块支持
- TypeScript 编译 (ts-jest)
- 覆盖率阈值: 80% statements, 80% lines, 75% functions, 70% branches
- 测试超时: 30秒

**测试环境** (`.env.test`):
```env
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nvwax_test
JWT_SECRET=test-jwt-secret-key-for-testing-only
PORT=3002
```

#### 测试文件结构

```
packages/nvwax-server/
├── __tests__/
│   └── virtual-company-creation.service.test.ts  # Service 层测试
├── jest.config.js                                  # Jest 配置
├── jest.setup.ts                                   # 测试初始化
└── .env.test                                       # 测试环境变量
```

#### 运行测试

```bash
# 运行所有测试
npm test

# 监听模式（开发时使用）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

#### 覆盖率目标

| 指标 | 目标 | 当前状态 |
|------|------|---------|
| Statements | 80% | ⏳ 待运行 |
| Lines | 80% | ⏳ 待运行 |
| Functions | 75% | ⏳ 待运行 |
| Branches | 70% | ⏳ 待运行 |

---

## 🔧 使用指南

### 前端集成认证

前端需要在调用虚拟公司 API 时携带 JWT Token：

```typescript
// packages/nvwax-web/components/virtual-company-chat-modal.tsx

const createSession = async () => {
  const token = localStorage.getItem('user_token');
  
  const response = await fetch('/api/virtual-company/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`  // 添加认证头
    },
  });
  
  // ... 处理响应
};
```

### 测试认证流程

1. **注册用户** (如果还没有账号):
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
   ```

2. **登录获取 Token**:
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

3. **使用 Token 调用虚拟公司 API**:
   ```bash
   curl -X POST http://localhost:3001/api/virtual-company/sessions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <your_jwt_token>" \
     -d '{}'
   ```

---

## 🧪 测试最佳实践

### Mock 策略

测试中使用 Mock 隔离外部依赖：

```typescript
// Mock 数据库服务
jest.mock('../src/services/database.service.js', () => ({
  databaseService: {
    getPool: jest.fn()
  }
}));

// Mock CEO Agent 服务
jest.mock('../src/services/ceo-agent.service.js', () => ({
  ceoAgentService: {
    processMessage: jest.fn()
  }
}));
```

### 测试用例设计

每个测试应该：
1. ✅ 有清晰的描述（中文）
2. ✅ 独立的 mock 数据
3. ✅ 明确的断言
4. ✅ 覆盖正常和异常路径

示例：
```typescript
it('应该成功创建新会话', async () => {
  const userId = 'test-user-123';
  const mockSessionId = 'session-test-id';
  
  mockPool.query
    .mockResolvedValueOnce({ rows: [{ id: mockSessionId }] })
    .mockResolvedValueOnce({ rows: [] });
    
  const session = await service.createSession(userId);
  
  expect(session).toBeDefined();
  expect(session.userId).toBe(userId);
  expect(session.status).toBe('initiated');
});
```

---

## 📊 测试报告

运行 `npm run test:coverage` 后会生成：

1. **控制台输出**: 实时显示测试结果
2. **HTML 报告**: `coverage/lcov-report/index.html`
3. **LCOV 文件**: `coverage/lcov.info` (用于 CI/CD)

查看 HTML 报告：
```bash
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html # Windows
```

---

## 🚀 下一步计划

### P0 - 立即执行

1. **补充更多测试用例**
   - Controller 层测试
   - SSE 进度服务测试
   - Agent 复用服务测试

2. **修复测试失败**
   - 根据实际运行结果调整 mock
   - 确保所有测试通过

### P1 - 本周完成

3. **提高测试覆盖率**
   - 目标: 80%+ 整体覆盖率
   - 重点关注核心业务逻辑

4. **集成 CI/CD**
   - GitHub Actions 自动运行测试
   - 覆盖率门槛检查

### P2 - 本月完成

5. **E2E 测试**
   - Playwright/Cypress 浏览器自动化
   - 完整用户流程测试

6. **性能测试**
   - 负载测试
   - 压力测试

---

## ❓ 常见问题

### Q: 测试失败 "Cannot find module"

**A**: 确保使用了正确的模块路径和 `.js` 扩展名：
```typescript
import { service } from '../src/services/my-service.js'; // ✅
import { service } from '../src/services/my-service';    // ❌
```

### Q: Mock 不生效

**A**: 确保在导入之前设置 mock：
```typescript
// ✅ 正确顺序
jest.mock('../src/services/db.js');
import { service } from '../src/services/my-service.js';

// ❌ 错误顺序
import { service } from '../src/services/my-service.js';
jest.mock('../src/services/db.js');
```

### Q: 如何调试测试？

**A**: 使用 `--inspect-brk` 标志：
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

然后在 Chrome DevTools 中连接调试器。

---

## 📚 相关文档

- [Jest 官方文档](https://jestjs.io/docs/getting-started)
- [ts-jest 配置指南](https://kulshekhar.github.io/ts-jest/docs/)
- [Express 中间件测试](https://expressjs.com/en/guide/testing.html)
- [JWT 认证最佳实践](https://jwt.io/introduction)

---

**最后更新**: 2026-05-16  
**维护者**: AI Assistant  
**版本**: v1.0.0
