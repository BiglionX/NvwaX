# Admin 后台 OIDC 集成部署指南

**Sprint 2.11 — 将 account-portal 认证功能集成到 admin 后台**

## 📋 更改概述

### 问题
- Admin 后台使用传统用户名/密码登录，然后提示用户走 OIDC 流程
- 用户体验不流畅：需要"登录两次"
- 代码中存在技术债务（`Sprint 2.4: 老 admin 登录成功后引导走 OIDC`）

### 解决方案
- **移除传统登录表单**，直接使用 OIDC 认证
- Admin 后台复用 account.proclaw.cc 的统一认证系统
- 支持 Social Login（Google、GitHub、Discord）
- 实现真正的 SSO（Single Sign-On）

## 🔧 技术变更

### 1. 前端变更

#### 1.1 重写 Admin 登录页面
**文件**: `packages/nvwax-web/app/[locale]/admin/login/page.tsx`

**变更内容**:
- ❌ 移除传统登录表单（username/password）
- ✅ 直接使用 OIDC 认证
- ✅ 检查 OIDC session，已登录则重定向到 dashboard
- ✅ 未登录则显示 OIDC 登录按钮
- ✅ 支持 Social Login

**关键代码**:
```typescript
// 跳转到 OIDC 授权端点
const handleOidcLogin = () => {
  const issuer = process.env.NEXT_PUBLIC_OIDC_ISSUER || 'https://account.proclaw.cc';
  const clientId = process.env.NEXT_PUBLIC_OIDC_ADMIN_CLIENT_ID || 'nvwax-admin';
  const redirectUri = encodeURIComponent(`${window.location.origin}/oauth/callback`);
  
  const authUrl = `${issuer}/oidc/auth?` +
    `client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('openid profile email')}` +
    `&state=${state}` +
    `&prompt=login`;
  
  window.location.href = authUrl;
};
```

#### 1.2 更新环境变数
**文件**: `packages/nvwax-web/.env.local`

**新增变数**:
```bash
# Admin 后台专用 OIDC 客户端 ID
NEXT_PUBLIC_OIDC_ADMIN_CLIENT_ID=nvwax-admin
```

### 2. 后端变更

#### 2.1 创建 OIDC 客户端
**文件**: `packages/nvwax-server/migrations/029_nvwax_admin_client.sql`

**SQL 脚本**:
```sql
INSERT INTO oidc_clients (
  client_id, client_secret_hash, name,
  redirect_uris, allowed_scopes, allowed_grant_types,
  require_pkce, token_endpoint_auth_method, is_active
)
VALUES (
  'nvwax-admin',
  NULL,
  'NvwaX Admin Backend',
  ARRAY[
    'https://account.proclaw.cc/oauth/callback',
    'https://nvwax.proclaw.cc/oauth/callback',
    'http://localhost:3000/oauth/callback'
  ],
  ARRAY['openid','profile','email'],
  ARRAY['authorization_code','refresh_token'],
  TRUE,
  'none',
  TRUE
)
ON CONFLICT (client_id) DO UPDATE SET
  redirect_uris = EXCLUDED.redirect_uris,
  allowed_scopes = EXCLUDED.allowed_scopes,
  is_active = EXCLUDED.is_active;
```

#### 2.2 OIDC IdP 自动注入 `is_admin` 声明
**已有功能**（无需修改）:
- `packages/nvwax-server/src/services/oidc/oidc-token.service.ts` 中已有 `is_admin?: boolean` 字段
- `packages/nvwax-server/src/services/admin.service.ts` 中已有检查 email 是否在 admins 表中的方法
- OIDC IdP 在签发 id_token 和 userinfo 端点时自动注入 `is_admin: true`

## 🚀 部署步骤

### 步骤 1: 数据库迁移

#### 1.1 应用 SQL 迁移脚本
```bash
# 连接到数据库
psql -d nvwax

# 应用迁移脚本
\i packages/nvwax-server/migrations/029_nvwax_admin_client.sql

# 验证客户端是否创建成功
SELECT client_id, name, redirect_uris FROM oidc_clients WHERE client_id = 'nvwax-admin';
```

#### 1.2 或使用 Docker 容器执行
```bash
# 进入 nvwax-server 容器
docker exec -it nvwax-server bash

# 连接到数据库
psql -d nvwax -c "SELECT client_id, name FROM oidc_clients;"

# 手动插入 nvwax-admin 客户端（如果迁移脚本未自动应用）
psql -d nvwax -c "
INSERT INTO oidc_clients (
  client_id, name, redirect_uris, allowed_scopes, 
  allowed_grant_types, require_pkce, 
  token_endpoint_auth_method, is_active
) VALUES (
  'nvwax-admin',
  'NvwaX Admin Backend',
  ARRAY['https://account.proclaw.cc/oauth/callback', 'https://nvwax.proclaw.cc/oauth/callback', 'http://localhost:3000/oauth/callback'],
  ARRAY['openid','profile','email'],
  ARRAY['authorization_code','refresh_token'],
  TRUE,
  'none',
  TRUE
) ON CONFLICT (client_id) DO NOTHING;
"
```

### 步骤 2: 更新前端环境变数

#### 2.1 本地开发环境
**文件**: `packages/nvwax-web/.env.local`

```bash
# 添加以下内容
NEXT_PUBLIC_OIDC_ADMIN_CLIENT_ID=nvwax-admin
```

#### 2.2 生产环境（Vercel）
在 Vercel 项目后台添加环境变数：
```
NEXT_PUBLIC_OIDC_ADMIN_CLIENT_ID=nvwax-admin
```

### 步骤 3: 构建并部署前端

```bash
# 进入前端目录
cd packages/nvwax-web

# 安装依赖（如需要）
pnpm install

# 构建
pnpm build

# 启动（本地测试）
pnpm dev
```

### 步骤 4: 重启后端服务（如需要）

```bash
# 重启 nvwax-server 容器
docker restart nvwax-server

# 检查日志
docker logs -f nvwax-server
```

## ✅ 验证方法

### 1. 功能测试

#### 1.1 访问 Admin 登录页面
```bash
# 打开浏览器访问
http://localhost:3000/admin/login
```

**预期结果**:
- ✅ 显示 OIDC 登录界面（不再有用户名/密码表单）
- ✅ 显示"管理员登录"按钮
- ✅ 显示"社交登录"链接

#### 1.2 点击"管理员登录"按钮
**预期结果**:
- ✅ 跳转到 `https://account.proclaw.cc/oidc/auth?...`
- ✅ URL 中包含 `client_id=nvwax-admin`
- ✅ URL 中包含 `redirect_uri=.../oauth/callback`

#### 1.3 完成 OIDC 登录
**预期结果**:
- ✅ 跳回 `/oauth/callback`
- ✅ 自动重定向到 `/admin/dashboard`
- ✅ 右上角显示用户邮箱
- ✅ `userInfo.is_admin === true`

#### 1.4 访问受保护的管理页面
```bash
# 访问用户管理页面
http://localhost:3000/admin/users

# 访问系统设置页面
http://localhost:3000/admin/settings
```

**预期结果**:
- ✅ 无需重新登录
- ✅ `ProtectedAdminRoute` 通过 `useAuth()` 检查
- ✅ 正常显示管理功能

### 2. API 测试

#### 2.1 检查 Session API
```bash
# 浏览器控制台执行
fetch('/api/auth/session').then(r => r.json()).then(console.log)

// 预期输出：
// {
//   "isLoggedIn": true,
//   "userInfo": {
//     "id": "...",
//     "email": "...",
//     "is_admin": true,  // ⬅️ 关键：OIDC IdP 自动注入
//     ...
//   },
//   "expiresAt": ...
// }
```

#### 2.2 检查 OIDC userinfo 端点
```bash
# 获取 access_token
const token = ...; // 从 httpOnly cookie 中自动管理

# 调用 userinfo 端点
curl https://account.proclaw.cc/oidc/userinfo \
  -H "Authorization: Bearer <access_token>"
```

**预期输出**:
```json
{
  "sub": "...",
  "email": "...",
  "is_admin": true,  // ⬅️ 关键：OIDC IdP 自动注入
  ...
}
```

### 3. 权限测试

#### 3.1 非管理员用户尝试访问 admin 后台
```bash
# 使用普通用户账号登录
# 然后访问
http://localhost:3000/admin/dashboard
```

**预期结果**:
- ✅ 自动重定向到 `/admin/login`
- ✅ 显示"权限不足"错误提示
- ✅ 不显示管理功能

#### 3.2 已登录管理员访问前台页面
```bash
# 管理员账号登录后
# 访问前台页面
http://localhost:3000/
```

**预期结果**:
- ✅ 可以正常访问前台页面
- ✅ 右上角显示管理员邮箱
- ✅ 可以无缝切换到 admin 后台

## 🔄 回滚计划

如果部署后出现问题，可以按以下步骤回滚：

### 1. 回滚前端代码
```bash
# 回滚 admin/login/page.tsx
git revert <commit-hash>
git push origin main
```

### 2. 回滚数据库变更
```bash
# 禁用 nvwax-admin 客户端（软删）
psql -d nvwax -c "
UPDATE oidc_clients 
SET is_active = FALSE 
WHERE client_id = 'nvwax-admin';
"
```

### 3. 清理环境变数
```bash
# 移除 NEXT_PUBLIC_OIDC_ADMIN_CLIENT_ID
# 在 .env.local 和 Vercel 后台删除此变数
```

## 📝 注意事项

### 1. OIDC 客户端配置
- ✅ `nvwax-admin` 客户端已创建
- ✅ `redirect_uris` 包含生产环境和本地开发环境
- ✅ `token_endpoint_auth_method=none`（public client）
- ✅ `require_pkce=TRUE`（强制 PKCE）

### 2. 管理员权限注入
- ✅ OIDC IdP 自动检查用户 email 是否在 `admins` 表中
- ✅ 如果在，自动注入 `is_admin: true`
- ✅ 前端通过 `useAuth().userInfo.is_admin` 读取

### 3. 安全性
- ✅ 使用 httpOnly cookie（防 XSS）
- ✅ 使用 PKCE（防 CSRF）
- ✅ 使用 state 参数（防 CSRF）
- ✅ 强制重新登录（`prompt=login`）

## 🎉 完成标志

- [x] 移除传统登录表单
- [x] 直接使用 OIDC 认证
- [x] 创建 `nvwax-admin` OIDC 客户端
- [x] 更新前端环境变数
- [x] 功能测试通过
- [x] 权限测试通过
- [x] 文档创建完成

## 📚 相关文档

- [OIDC 集成指南](./API_GUIDE.md)
- [Admin 后台使用指南](./ADMIN-GUIDE.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)
- [Postman Collection 使用指南](./POSTMAN_GUIDE.md)

---

**创建时间**: 2026-06-21  
**作者**: AI Assistant  
**Sprint**: 2.11  
**状态**: ✅ 已完成
