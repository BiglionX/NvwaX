# NvwaX 社交登录配置指南

本文档介绍如何配置 GitHub 和 Google 社交登录功能。

## 目录

1. [功能概述](#功能概述)
2. [GitHub OAuth 配置](#github-oauth-配置)
3. [Google OAuth 配置](#google-oauth-配置)
4. [环境变量配置](#环境变量配置)
5. [数据库配置](#数据库配置)
6. [前端集成](#前端集成)
7. [测试流程](#测试流程)
8. [故障排查](#故障排查)

---

## 功能概述

NvwaX 支持以下社交登录方式：

- ✅ **GitHub OAuth** - 使用 OAuth 2.0 标准流程
- ✅ **Google OAuth** - 使用 Google Identity Services (GIS)
- ✅ **Facebook OAuth** - 使用 Facebook SDK
- 🔜 **微信登录** - 预留，即将上线

### 登录流程

#### GitHub OAuth 流程

1. 前端调用 `GET /auth/github/authorize?redirectUri=...` 获取授权 URL
2. 前端跳转 GitHub 授权页面
3. 用户授权后，GitHub 回调到 `redirectUri?code=...&state=...`
4. 前端用 code 调用 `POST /auth/github/login` 完成登录
5. 后端返回 JWT token 和用户信息

#### Google OAuth 流程

1. 前端加载 Google Identity Services SDK
2. 用户点击 Google 登录按钮，SDK 弹出授权窗口
3. 授权成功后，SDK 返回 credential (ID Token)
4. 前端用 credential 调用 `POST /auth/google/login` 完成登录
5. 后端返回 JWT token 和用户信息

---

## GitHub OAuth 配置

### 步骤 1: 创建 GitHub OAuth App

1. 登录 GitHub，进入 **Settings** → **Developer settings** → **OAuth Apps**
   - 或直接访问：https://github.com/settings/developers

2. 点击 **New OAuth App** 创建应用

3. 填写应用信息：

   ```
   Application name: NvwaX
   Homepage URL: https://your-domain.com
   Authorization callback URL: https://your-domain.com/api/auth/github/callback
   ```

   ⚠️ **注意**：
   - `Authorization callback URL` 必须与实际回调地址一致
   - 开发环境可以使用：`http://localhost:3000/api/auth/github/callback`

4. 点击 **Register application** 创建应用

5. 创建成功后，复制 **Client ID**

6. 点击 **Generate a new client secret** 生成 **Client Secret**

7. 保存 `Client ID` 和 `Client Secret`，后续配置需要

### 步骤 2: 配置环境变量

在 `.env` 文件中添加：

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=你的_GitHub_Client_ID
GITHUB_CLIENT_SECRET=你的_GitHub_Client_Secret
```

### 步骤 3: 授权范围 (Scopes)

默认授权范围：

- `read:user` - 读取用户基本信息
- `user:email` - 读取用户邮箱（用于获取私有邮箱）

这些范围在 `github-oauth.service.ts` 中配置，可以根据需要调整。

---

## Google OAuth 配置

### 步骤 1: 创建 Google Cloud Project

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)

2. 创建新项目或选择现有项目

3. 启用 **Google+ API** 或 **Google Identity Services**

### 步骤 2: 创建 OAuth 2.0 凭证

1. 进入 **APIs & Services** → **Credentials**

2. 点击 **Create Credentials** → **OAuth client ID**

3. 配置同意屏幕（OAuth consent screen）：
   - **User Type**: External
   - **App name**: NvwaX
   - **User support email**: 你的邮箱
   - **Developer contact email**: 你的邮箱
   - 添加范围：`.../auth/userinfo.email`, `.../auth/userinfo.profile`
   - 添加测试用户（开发阶段）

4. 创建 OAuth client ID：
   - **Application type**: Web application
   - **Name**: NvwaX Web Client

5. 配置授权的 JavaScript 来源：
   ```
   http://localhost:3000          # 开发环境
   https://your-domain.com         # 生产环境
   ```

6. 配置授权的重定向 URI（可选，GIS 不需要）：
   ```
   http://localhost:3000
   https://your-domain.com
   ```

7. 点击 **Create**，复制 **Client ID**

### 步骤 3: 配置环境变量

在 `.env` 文件中添加：

```bash
# Google OAuth
GOOGLE_CLIENT_ID=你的_Google_Client_ID.apps.googleusercontent.com
```

在前端 `.env.local` 或 `next.config.js` 中添加：

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=你的_Google_Client_ID.apps.googleusercontent.com
```

---

## 环境变量配置

### 后端环境变量 (`.env`)

```bash
# ========== Social Login Configuration ==========

# GitHub OAuth
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxx

# Google OAuth
GOOGLE_CLIENT_ID=1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

# Facebook OAuth (可选)
FACEBOOK_APP_ID=xxxxxxxxxxxxxxxx
FACEBOOK_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_FACEBOOK_APP_ID=xxxxxxxxxxxxxxxx
```

### 前端环境变量 (`packages/nvwax-web/.env.local`)

```bash
# Social Login
NEXT_PUBLIC_GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
NEXT_PUBLIC_FACEBOOK_APP_ID=xxxxxxxxxxxxxxxx
```

---

## 数据库配置

### 检查 social_accounts 表

社交登录需要在数据库中创建 `social_accounts` 表，用于绑定用户和社交账号。

#### 运行数据库迁移

```bash
# 进入项目根目录
cd d:\BigLionX\NvwaX

# 运行数据库迁移
pnpm run db:migrate
```

#### 手动创建表（如果没有迁移）

如果迁移没有自动创建表，可以手动执行以下 SQL：

```sql
-- 创建社交账号绑定表
CREATE TABLE IF NOT EXISTS social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,  -- 'github', 'google', 'facebook', 'wechat'
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    display_name VARCHAR(255),
    avatar_url TEXT,
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

-- 创建索引
CREATE INDEX idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX idx_social_accounts_provider ON social_accounts(provider, provider_user_id);

-- 添加注释
COMMENT ON TABLE social_accounts IS '社交账号绑定表';
COMMENT ON COLUMN social_accounts.provider IS '社交登录提供商';
COMMENT ON COLUMN social_accounts.provider_user_id IS '提供商的用户 ID';
COMMENT ON COLUMN social_accounts.provider_email IS '提供商的用户邮箱';
```

---

## 前端集成

### GitHub 登录按钮

#### 方法 1: 使用 OIDC 标准流程（推荐）

```typescript
// packages/nvwax-web/components/LoginForm.tsx
import { useState } from 'react';

export function GitHubLoginButton() {
  const handleGitHubLogin = async () => {
    // 1. 获取授权 URL
    const redirectUri = `${window.location.origin}/api/auth/github/callback`;
    
    const response = await fetch(
      `/api/auth/github/authorize?redirectUri=${encodeURIComponent(redirectUri)}`
    );
    const { data } = await response.json();
    
    // 2. 跳转 GitHub 授权页面
    window.location.href = data.authorizeUrl;
  };

  return (
    <button
      onClick={handleGitHubLogin}
      className="btn btn-github"
    >
      <GitHubIcon />
      使用 GitHub 登录
    </button>
  );
}
```

#### GitHub 回调页面

```typescript
// packages/nvwax-web/pages/api/auth/github/callback.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { authApi } from '@/lib/api/auth';

export default function GitHubCallback() {
  const router = useRouter();
  const { code, state } = router.query;

  useEffect(() => {
    if (code) {
      handleGitHubCallback(code as string);
    }
  }, [code]);

  const handleGitHubCallback = async (code: string) => {
    try {
      // 用 code 完成登录
      const result = await authApi.githubLogin(code);
      
      if (result.success) {
        // 保存 token 到 cookie 或 localStorage
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        
        // 跳转到首页或返回页
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('GitHub login failed:', error);
      router.push('/login?error=github_login_failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2>正在处理 GitHub 登录...</h2>
        <div className="spinner"></div>
      </div>
    </div>
  );
}
```

### Google 登录按钮

#### 使用 Google Identity Services (GIS)

```typescript
// packages/nvwax-web/components/LoginForm.tsx
import { useEffect, useRef } from 'react';
import { authApi } from '@/lib/api/auth';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export function GoogleLoginButton() {
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 加载 Google GIS SDK
    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = initializeGoogleLogin;
      document.body.appendChild(script);
    } else {
      initializeGoogleLogin();
    }
  }, []);

  const initializeGoogleLogin = () => {
    if (!window.google || !googleButtonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: handleGoogleCallback,
    });

    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
    });
  };

  const handleGoogleCallback = async (response: any) => {
    try {
      const result = await authApi.googleLogin(response.credential);
      
      if (result.success) {
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Google login failed:', error);
    }
  };

  return (
    <div>
      <div ref={googleButtonRef}></div>
    </div>
  );
}
```

### 使用 useSocialAuth Hook

项目已经提供了 `useSocialAuth` Hook，可以直接使用：

```typescript
// packages/nvwax-web/pages/login.tsx
import { useSocialAuth } from '@/hooks/useSocialAuth';
import { authApi } from '@/lib/api/auth';

export default function LoginPage() {
  const {
    googleStatus,
    isLoggingIn,
    loginError,
    loginWithGoogle,
    clearError,
  } = useSocialAuth();

  const handleGoogleLogin = async () => {
    try {
      const result = await loginWithGoogle();
      // 登录成功，处理结果
      console.log('Login success:', result);
    } catch (error) {
      // 登录失败，错误信息已在 loginError 中
      console.error('Login failed:', error);
    }
  };

  return (
    <div>
      <button
        onClick={handleGoogleLogin}
        disabled={googleStatus !== 'ready' || isLoggingIn}
      >
        {isLoggingIn ? '登录中...' : '使用 Google 登录'}
      </button>
      
      {loginError && (
        <div className="error-message">
          {loginError}
          <button onClick={clearError}>×</button>
        </div>
      )}
    </div>
  );
}
```

---

## 测试流程

### 1. 本地开发测试

#### 启动开发服务器

```bash
# 后端
cd packages/nvwax-server
pnpm run dev

# 前端
cd packages/nvwax-web
pnpm run dev
```

#### 测试 GitHub 登录

1. 访问 http://localhost:3000/login
2. 点击 "使用 GitHub 登录" 按钮
3. 跳转 GitHub 授权页面
4. 授权后跳转回回调页面
5. 检查是否成功登录

#### 测试 Google 登录

1. 访问 http://localhost:3000/login
2. 点击 Google 登录按钮
3. 弹出 Google 授权窗口
4. 授权后自动关闭窗口
5. 检查是否成功登录

### 2. 检查日志

#### 后端日志

```bash
# 查看 GitHub OAuth 日志
[GitHubOAuth] GITHUB_CLIENT_ID configured, length: 20
[SocialAuth] GitHub login: GITHUB_CLIENT_ID has value: true
[SocialAuth] GitHub user verified: user@example.com
```

#### 前端日志

```javascript
// 打开浏览器开发者工具 Console
[oidc] buildAuthorizationUrl opts: {...}
[oidc] buildAuthorizationUrl cfg: {...}
```

---

## 故障排查

### GitHub OAuth 常见问题

#### 1. `GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not configured`

**原因**：环境变量未配置或配置错误

**解决**：
- 检查 `.env` 文件中的 `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET`
- 重启后端服务器

#### 2. `redirect_uri_mismatch`

**原因**：回调地址与 GitHub OAuth App 配置不一致

**解决**：
- 检查 GitHub OAuth App 的 **Authorization callback URL**
- 确保与前端实际使用的回调地址一致

#### 3. `Bad verification code`

**原因**：授权 code 已过期或已被使用

**解决**：
- Code 只能使用一次，且有效期很短（约 10 分钟）
- 重新发起授权流程

#### 4. 无法获取用户邮箱

**原因**：用户设置了私有邮箱

**解决**：
- 代码已处理此情况，会自动调用 `/user/emails` 接口获取主邮箱
- 检查 GitHub API 返回是否正确

### Google OAuth 常见问题

#### 1. `GOOGLE_CLIENT_ID not configured`

**原因**：环境变量未配置

**解决**：
- 检查后端 `.env` 中的 `GOOGLE_CLIENT_ID`
- 检查前端 `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

#### 2. `Token audience does not match client ID`

**原因**：ID Token 的 aud 字段与配置的 Client ID 不匹配

**解决**：
- 检查 `GOOGLE_CLIENT_ID` 是否正确
- 确保前端和后端使用相同的 Client ID

#### 3. Google 按钮不显示

**原因**：GIS SDK 未加载或 Client ID 错误

**解决**：
- 检查浏览器控制台是否有 JavaScript 错误
- 确认 `NEXT_PUBLIC_GOOGLE_CLIENT_ID` 已正确设置
- 检查网络请求，确认 GIS SDK 已加载

### 通用问题

#### 1. CORS 错误

**原因**：前端和后端不在同一域名

**解决**：
- 检查后端 CORS 配置
- 在 `.env` 中配置 `CORS_ALLOWED_ORIGINS`

```bash
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com
```

#### 2. 数据库错误

**原因**：`social_accounts` 表不存在或字段不匹配

**解决**：
- 运行数据库迁移：`pnpm run db:migrate`
- 手动创建表（参考 [数据库配置](#数据库配置)）

---

## API 端点文档

### GitHub OAuth

#### GET `/auth/github/authorize`

获取 GitHub 授权 URL

**Query 参数**：
- `redirectUri` (required): 回调地址
- `state` (optional): 防 CSRF 状态值

**响应**：
```json
{
  "success": true,
  "data": {
    "authorizeUrl": "https://github.com/login/oauth/authorize?...",
    "state": "random-state-string"
  }
}
```

#### POST `/auth/github/login`

使用授权 code 完成登录

**Request Body**：
```json
{
  "code": "xxxxxxxxxxxxxxxxxxxx",
  "redirectUri": "http://localhost:3000/api/auth/github/callback"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name"
    },
    "isNewUser": false
  }
}
```

#### GET `/auth/github/callback`

GitHub OAuth 回调端点（用于处理 GitHub 的回调）

**Query 参数**：
- `code` (required): 授权 code
- `state` (required): 防 CSRF 状态值
- `redirectUri` (optional): 回调地址

### Google OAuth

#### POST `/auth/google/login`

使用 Google ID Token 完成登录

**Request Body**：
```json
{
  "credential": "google-id-token-here"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "uuid",
      "email": "user@gmail.com",
      "name": "User Name"
    },
    "isNewUser": true
  }
}
```

### 社交账号管理

#### GET `/auth/social/accounts`

获取当前用户绑定的社交账号列表（需要认证）

**Headers**：
```
Authorization: Bearer <jwt-token>
```

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "provider": "github",
      "providerUserId": "123456",
      "providerEmail": "user@example.com",
      "displayName": "User Name",
      "avatarUrl": "https://...",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST `/auth/social/bind`

绑定社交账号到当前用户（需要认证）

**Request Body**：
```json
{
  "provider": "github",
  "accessToken": "github-access-token"
}
```

#### POST `/auth/social/unbind`

解绑社交账号（需要认证）

**Request Body**：
```json
{
  "provider": "github",
  "providerUserId": "123456"
}
```

---

## 安全建议

### 1. 使用 HTTPS

生产环境必须使用 HTTPS，防止授权 code 和 token 被拦截。

### 2. 验证 State 参数

GitHub OAuth 使用 `state` 参数防 CSRF 攻击，确保：
- 生成随机的 `state` 值
- 回调时验证 `state` 值是否匹配

### 3. 安全存储 Secret

- 不要将 `GITHUB_CLIENT_SECRET` 和 `GOOGLE_CLIENT_ID` 提交到代码仓库
- 使用环境变量或密钥管理服务
- 生产环境使用 K8s Secrets 或类似服务

### 4. 限制 OAuth Scope

只请求必要的权限范围，避免过度授权。

### 5. 处理 Token 过期

- 实现 token 刷新机制
- 引导用户重新授权

---

## 参考资料

- [GitHub OAuth App 文档](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [Google Identity Services 文档](https://developers.google.com/identity/gsi/web/guides/overview)
- [OAuth 2.0 规范](https://oauth.net/2/)
- [OpenID Connect 规范](https://openid.net/connect/)

---

## 更新日志

- **2026-06-21**: 初始版本，支持 GitHub 和 Google 社交登录
