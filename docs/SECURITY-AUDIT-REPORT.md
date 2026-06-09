# NvwaX 安全与代码质量审计报告

**审计日期**: $(date +%Y-%m-%d)
**审计范围**: `packages/nvwax-server/src`
**审计维度**: 安全性、认证授权、输入验证、并发安全、API设计、敏感信息、配置管理

---

## 📊 审计摘要

| 类别 | 已修复 (本次) | 新发现问题 | 风险等级 |
|------|--------------|------------|----------|
| 安全性 | 2 | 4 | P1-P2 |
| 认证授权 | 1 | 1 | P1 |
| 输入验证 | 1 | 1 | P2 |
| 并发安全 | 1 | 1 | P2 |
| API设计 | 0 | 2 | P2 |
| 敏感信息 | 1 | 2 | P1 |
| 配置管理 | 1 | 1 | P1 |

---

## 🔴 P1 - 高优先级问题

### 1. 【已修复】硬编码密钥 - JWT_SECRET 和 CROSS_AUTH_SECRET

**状态**: ✅ 已修复  
**位置**: `src/services/user.service.ts`  
**问题**: 密钥使用默认值 fallback，存在安全风险  
**修复**: 构造函数中验证必需，未设置则抛出致命错误

---

### 2. 【已修复】Admin 中间件使用不安全 token 格式

**状态**: ✅ 已修复  
**位置**: `src/middleware/auth.middleware.ts`  
**问题**: 使用简单字符串格式验证 token，易被伪造  
**修复**: 改用 JWT 标准签名验证

---

### 3. 【新发现】登录端点缺少速率限制

**严重程度**: 🔴 高  
**位置**: `src/routes/index.ts` (行 88-95)  
**问题描述**: `/auth/login`、`/auth/google/login` 等登录端点没有速率限制，容易遭受暴力破解攻击

**受影响端点**:
```typescript
router.post('/auth/login', userAuthController.login);
router.post('/auth/facebook/login', socialAuthController.facebookLogin.bind(socialAuthController));
router.post('/auth/google/login', socialAuthController.googleLogin.bind(socialAuthController));
router.post('/auth/wechat/login', socialAuthController.wechatLogin.bind(socialAuthController));
router.post('/admin/login', adminController.login);
```

**建议修复**:
- 对登录端点添加速率限制（如 5分钟内最多5次尝试）
- 添加账户锁定机制（连续失败5次后锁定15分钟）
- 记录失败的登录尝试用于监控

---

### 4. 【新发现】生产环境 .env 包含真实数据库密码

**严重程度**: 🔴 高  
**位置**: `.env` (行 4-6)  
**问题描述**: .env 文件中包含真实的数据库连接凭证，不应提交到版本控制

```env
DB_PASSWORD=NvwaX@2024Secure!
DATABASE_URL=postgresql://nvwax:NvwaX@2024Secure!@43.156.133.180:5432/nvwax
```

**建议修复**:
1. 将 `.env` 添加到 `.gitignore`
2. 创建 `.env.example` 包含占位符值
3. 使用密码管理器存储真实凭证
4. 生产环境使用环境变量注入而非文件

---

### 5. 【已修复】Token 配额扣减竞态条件

**状态**: ✅ 已修复  
**位置**: `src/services/token-quota.service.ts` (行 173-175)  
**问题**: 扣减 Token 时存在竞态窗口，可能导致超额消费  
**修复**: 使用 FOR UPDATE 锁在整个事务期间保持锁

---

## 🟠 P2 - 中优先级问题

### 6. 【新发现】敏感信息日志泄露

**严重程度**: 🟠 中  
**位置**: `src/services/admin.service.ts` (行 75-88)  
**问题描述**: 管理员登录过程中记录了敏感信息

**问题代码**:
```typescript
console.log('[AdminService] Login attempt:', { username, passwordLength: password.length });
console.log('[AdminService] Stored password hash:', admin.password.substring(0, 20) + '...');
console.log('[AdminService] Password match:', passwordMatch);
```

**建议修复**: 移除或脱敏敏感日志
```typescript
console.log('[AdminService] Login attempt:', { username, hasPassword: !!password });
// 移除 password hash 日志
```

---

### 7. 【新发现】API 响应格式不一致

**严重程度**: 🟠 中  
**位置**: 多处  
**问题描述**: API 响应格式不统一，部分使用 `{ error: ... }`，部分使用 `{ success: false, error: { code, message } }`

**示例**:
```typescript
// 格式1
res.status(400).json({ error: 'userId is required' });

// 格式2
res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'userId is required' } });
```

**建议修复**: 统一使用 `{ success, data?, error? }` 格式

---

### 8. 【新发现】分页参数未验证上限

**严重程度**: 🟠 中  
**位置**: `src/controllers/admin.controller.ts` (行 209-210)  
**问题描述**: 虽然已添加分页上限，但某些端点仍可能缺少验证

**问题代码**:
```typescript
const page = parseInt(req.query.page as string) || 1;
const limit = parseInt(req.query.limit as string) || 20;
```

**建议修复**: 添加上限检查
```typescript
const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 100);
```

---

### 9. 【新发现】支付确认缺少事务包装

**严重程度**: 🟠 中  
**位置**: `src/services/payment.service.ts` (行 390-391)  
**问题描述**: `confirmOrder` 方法中，订单状态更新和 Token 增加不在同一事务中

**问题代码**:
```typescript
// 订单状态更新在事务中
await client.query('BEGIN');
// ... 更新订单状态 ...
await client.query('COMMIT');

// Token 增加在事务外 - 如果失败会导致状态不一致
await tokenQuotaService.addPurchasedTokens(order.user_id, order.tokens);
```

**建议修复**: 将 Token 增加也纳入同一事务，或使用补偿机制

---

### 10. 【已修复】用户 ID 生成不唯一

**状态**: ✅ 已修复  
**位置**: `src/services/user.service.ts`  
**问题**: 使用 `Date.now() + Math.random()` 生成 ID  
**修复**: 改用 UUID v4

---

### 11. 【已修复】社交账号邮箱生成包含 @ 符号

**状态**: ✅ 已修复  
**位置**: `src/services/user.service.ts`  
**问题**: 社交账号邮箱可能包含 @ 导致格式错误  
**修复**: 过滤 @ 符号

---

### 12. 【已修复】用户配额初始化失败处理

**状态**: ✅ 已修复  
**位置**: `src/services/user.service.ts`  
**问题**: 配额创建失败时静默继续  
**修复**: 创建失败时回滚并抛出错误

---

### 13. 【已修复】CORS 无限制

**状态**: ✅ 已修复  
**位置**: `src/app.ts`  
**问题**: CORS 允许所有来源  
**修复**: 配置白名单

---

## ✅ 已修复问题汇总 (本轮)

| # | 问题 | 优先级 | 状态 |
|---|------|--------|------|
| 1 | 硬编码 JWT_SECRET 默认值 | P0 | ✅ |
| 2 | Admin 中间件不安全 token 格式 | P0 | ✅ |
| 3 | 用户 ID 生成不唯一 | P1 | ✅ |
| 4 | Token 配额扣减竞态条件 | P1 | ✅ |
| 5 | CORS 无限制 | P1 | ✅ |
| 6 | 分页参数无上限 | P2 | ✅ |
| 7 | 社交账号邮箱格式错误 | P2 | ✅ |
| 8 | 用户配额初始化失败静默 | P3 | ✅ |
| 9 | Admin 密码 hash 日志 | P2 | ⚠️ 待修复 |

---

## 🔧 建议修复清单

### 立即修复 (P1)
1. 添加登录端点速率限制
2. 从版本控制中移除真实凭证

### 短期修复 (P2)
3. 移除敏感信息日志
4. 统一 API 响应格式
5. 添加分页参数上限验证
6. 修复支付确认事务问题

### 长期改进 (P3)
7. 统一错误处理模式
8. 添加更多集成测试
9. 实施依赖安全扫描

---

## 📝 附录：审计工具使用

- **SQL注入检测**: grep_code 搜索参数化查询模式
- **敏感信息检测**: grep_code 搜索日志中的密码/API密钥
- **认证检查**: 审查中间件配置和路由保护
- **并发安全**: 检查 FOR UPDATE/SERIALIZABLE 使用

---

*本报告由 Lingma 代码审计工具生成*
