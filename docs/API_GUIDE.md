# NvwaX 统一登录认证中心 - API 接入指南

> **目标**：帮助合作项目快速接入 `account.proclaw.cc` 统一登录认证中心
>
> **适用对象**：合作项目开发者、前端开发者、后端开发者

---

## 📋 目录

1. [概述](#1-概述)
2. [OIDC 标准协议接入](#2-oidc-标准协议接入)
3. [前端集成（JavaScript/TypeScript）](#3-前端集成javascripttypescript)
4. [后端集成（Node.js/Python/Java）](#4-后端集成nodejspythonjava)
5. [Social Login 接入](#5-social-login-接入)
6. [API 参考](#6-api-参考)
7. [示例代码](#7-示例代码)
8. [常见问题](#8-常见问题)

---

## 1. 概述

### 1.1 什么是统一登录认证中心？

NvwaX 统一登录认证中心（`account.proclaw.cc`）是一个基于 **OIDC (OpenID Connect)** 标准的身份认证服务，为多个合作项目提供：

- ✅ **统一登录**：用户只需注册一次，即可登录所有合作项目
- ✅ **SSO (Single Sign-n)**：用户在一个项目登录后，访问其他项目时自动登录
- ✅ **Social Login**：支持 GitHub、Google、Facebook 登录
- ✅ **标准协议**：基于 OIDC/OAuth 2.0，兼容所有主流编程语言和框架

### 1.2 接入方式对比

| 接入方式 | 适用场景 | 难度 | 推荐指数 |
|---------|---------|------|-----------|
| **OIDC 标准协议** | 任何项目（推荐） | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **前端 SDK** | JavaScript/TypeScript 前端项目 | ⭐⭐ | ⭐⭐⭐⭐ |
| **后端 SDK** | Node.js/Python/Java 后端项目 | ⭐⭐ | ⭐⭐⭐ |

### 1.3 获取 OIDC 客户端凭证

在接入前，你需要向 NvwaX 团队申请 OIDC 客户端凭证：

**所需信息**：
1. **项目名称**：你的合作项目名称
2. **重定向 URI**：登录成功后的回调地址（例如：`https://your-project.com/callback`）
3. **允许的 Scope**：需要获取的用户信息（`openid`, `profile`, `email`）

**申请方式**：
- 📧 发送邮件到：admin@proclaw.cc
- 或联系 NvwaX 管理员在数据库中直接创建

**获取到的凭证**：
```json
{
  "client_id": "your-partner-client-id",
  "name": "Your Partner Project",
  "redirect_uris": ["https://your-project.com/callback"],
  "allowed_scopes": ["openid", "profile", "email"]
}
```

> **注意**：本项目使用 **PKCE 流程**，不需要 `client_secret`（更安全）！

---

## 2. OIDC 标准协议接入

### 2.1 OIDC 授权码流程（Authorization Code Flow + PKCE）

这是 **推荐** 的接入方式，适用于：
- ✅ 前端 SPA（React、Vue、Angular）
- ✅ 移动应用（React Native、Flutter）
- ✅ 后端 Web 应用（需要用户登录）

### 2.2 流程概览

```
┌─────────┐                    ┌─────────────────────┐
│  你的   │                    │  account.proclaw.cc  │
│  项目   │                    │   (OIDC IdP)        │
└────┬────┘                    └──────────┬──────────┘
     │                                  │
     │  1. 用户点击"登录"               │
     ├─────────────────────────────────>│
     │                                  │
     │  2. 重定向到授权端点              │
     │     (附带 code_challenge)        │
     ├─────────────────────────────────>│
     │                                  │
     │  3. 用户登录/授权                │
     │     (输入邮箱密码 或 Social Login) │
     │                                  │
     │  4. 重定向回你的项目              │
     │     (附带 authorization_code)     │
     │<─────────────────────────────────┤
     │                                  │
     │  5. 后端交换 code 获取 token     │
     │     (附带 code_verifier)         │
     ├─────────────────────────────────>│
     │                                  │
     │  6. 返回 token (access_token,   │
     │     refresh_token, id_token)     │
     │<─────────────────────────────────┤
     │                                  │
     │  7. 使用 access_token 获取用户信息│
     ├─────────────────────────────────>│
     │                                  │
     │  8. 返回用户信息                 │
     │<─────────────────────────────────┤
```

### 2.3 步骤 1：生成 PKCE 参数

**PKCE (Proof Key for Code Exchange)** 是一种安全机制，防止授权码被拦截。

```javascript
// JavaScript/TypeScript
function generatePKCE() {
  // 生成 code_verifier (随机字符串，43-128 字符)
  const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
  
  // 生成 code_challenge (SHA256 hash of code_verifier, base64url encoded)
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return {
    codeVerifier,
    codeChallenge
  };
}
```

**或使用现有库**：

```bash
# Node.js
npm install oidc-client-ts

# Python
pip install authlib

# Java
<dependency>
  <groupId>com.nimbusds</groupId>
  <artifactId>oauth2-oidc-sdk</artifactId>
</dependency>
```

### 2.4 步骤 2：重定向到授权端点

**授权端点 URL**：
```
https://account.proclaw.cc/oauth/authorize
```

**必需参数**：

| 参数 | 说明 | 示例 |
|------|------|------|
| `response_type` | 固定值：`code` | `code` |
| `client_id` | 你的客户端 ID | `your-partner-client-id` |
| `redirect_uri` | 回调地址（必须和注册时一致） | `https://your-project.com/callback` |
| `scope` | 请求的 Scope | `openid profile email` |
| `state` | 随机字符串（防 CSRF 攻击） | `random_state_12345` |
| `code_challenge` | PKCE code challenge | `E9Mel...（Base64URL 编码）` |
| `code_challenge_method` | 固定值：`S256` | `S256` |

**构造授权 URL**：

```javascript
// JavaScript
const { codeVerifier, codeChallenge } = await generatePKCE();
const state = crypto.randomUUID();

// 保存 code_verifier 和 state（后续步骤需要）
sessionStorage.setItem('pkce_code_verifier', codeVerifier);
sessionStorage.setItem('oauth_state', state);

// 构造授权 URL
const authUrl = new URL('https://account.proclaw.cc/oauth/authorize');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', 'your-partner-client-id');
authUrl.searchParams.set('redirect_uri', 'https://your-project.com/callback');
authUrl.searchParams.set('scope', 'openid profile email');
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

// 重定向到授权 URL
window.location.href = authUrl.toString();
```

### 2.5 步骤 3：处理回调（获取 authorization_code）

用户登录成功后，OIDC IdP 会重定向回你的 `redirect_uri`，并附带 `code` 和 `state` 参数：

```
https://your-project.com/callback?
  code=4/0Aeb....（authorization_code）
  &state=random_state_12345
```

**验证 state（重要！防 CSRF 攻击）**：

```javascript
// 在回调页面（例如 /callback）
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

// 验证 state
const savedState = sessionStorage.getItem('oauth_state');
if (state !== savedState) {
  throw new Error('State 不匹配，可能存在 CSRF 攻击！');
}

// 获取之前保存的 code_verifier
const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
```

### 2.6 步骤 4：交换 Token

**Token 端点 URL**：
```
https://account.proclaw.cc/oauth/token
```

**必需参数**：

| 参数 | 说明 | 示例 |
|------|------|------|
| `grant_type` | 固定值：`authorization_code` | `authorization_code` |
| `client_id` | 你的客户端 ID | `your-partner-client-id` |
| `code` | 上一步获取到的 authorization_code | `4/0Aeb...` |
| `redirect_uri` | 回调地址（必须和之前一致） | `https://your-project.com/callback` |
| `code_verifier` | PKCE code verifier | `dBjftJeZ4CVP...` |

**发送请求**：

```javascript
// JavaScript（前端项目）
const response = await fetch('https://account.proclaw.cc/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: 'your-partner-client-id',
    code: code,
    redirect_uri: 'https://your-project.com/callback',
    code_verifier: codeVerifier
  })
});

const tokens = await response.json();
console.log(tokens);
```

**响应示例**：

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**保存 Token**：

```javascript
// 保存 token（根据实际情况选择存储方式）
localStorage.setItem('access_token', tokens.access_token);
localStorage.setItem('refresh_token', tokens.refresh_token);
localStorage.setItem('id_token', tokens.id_token);

// 解析 id_token（可选，用于获取用户信息）
const idTokenPayload = JSON.parse(atob(tokens.id_token.split('.')[1]));
console.log(idTokenPayload);
// 输出：{ sub: 'user-id', email: '...', name: '...', ... }
```

### 2.7 步骤 5：获取用户信息

**UserInfo 端点 URL**：
```
https://account.proclaw.cc/oauth/userinfo
```

**发送请求**：

```javascript
const accessToken = localStorage.getItem('access_token');

const response = await fetch('https://account.proclaw.cc/oauth/userinfo', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const userInfo = await response.json();
console.log(userInfo);
```

**响应示例**：

```json
{
  "sub": "user-id-123",
  "iss": "https://account.proclaw.cc",
  "aud": "your-partner-client-id",
  "exp": 1764000000,
  "iat": 1763996400,
  "email": "user@example.com",
  "name": "User Name",
  "picture": "https://account.proclaw.cc/avatars/123.png",
  "email_verified": true
}
```

### 2.8 步骤 6：刷新 Token（可选）

当 `access_token` 过期后，可以使用 `refresh_token` 获取新的 `access_token`：

**Token 端点 URL**（同上）：
```
https://account.proclaw.cc/oauth/token
```

**必需参数**：

| 参数 | 说明 | 示例 |
|------|------|------|
| `grant_type` | 固定值：`refresh_token` | `refresh_token` |
| `client_id` | 你的客户端 ID | `your-partner-client-id` |
| `refresh_token` | 之前获取到的 refresh_token | `eyJhbGciOiJSUzI1NiIs...` |

**发送请求**：

```javascript
const refreshToken = localStorage.getItem('refresh_token');

const response = await fetch('https://account.proclaw.cc/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: 'your-partner-client-id',
    refresh_token: refreshToken
  })
});

const newTokens = await response.json();
console.log(newTokens);

// 保存新的 token
localStorage.setItem('access_token', newTokens.access_token);
localStorage.setItem('refresh_token', newTokens.refresh_token);
```

---

## 3. 前端集成（JavaScript/TypeScript）

### 3.1 使用 oidc-client-ts 库（推荐）

`oidc-client-ts` 是一个流行的 OIDC 客户端库，支持浏览器和 Node.js。

**安装**：

```bash
npm install oidc-client-ts
```

**配置**：

```typescript
// src/auth/oidc-config.ts
import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

const oidcConfig = {
  authority: 'https://account.proclaw.cc',
  client_id: 'your-partner-client-id',
  redirect_uri: 'https://your-project.com/callback',
  post_logout_redirect_uri: 'https://your-project.com/',
  response_type: 'code',
  scope: 'openid profile email',
  loadUserInfo: true,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
};

export const userManager = new UserManager(oidcConfig);
```

**登录**：

```typescript
// src/auth/login.ts
import { userManager } from './oidc-config';

export async function login() {
  try {
    await userManager.signinRedirect();
  } catch (error) {
    console.error('登录失败：', error);
  }
}
```

**处理回调**：

```typescript
// src/pages/CallbackPage.tsx
import { useEffect } from 'react';
import { userManager } from '../auth/oidc-config';

export function CallbackPage() {
  useEffect(() => {
    userManager.signinRedirectCallback().then(user => {
      console.log('登录成功：', user);
      // 重定向到首页或其他页面
      window.location.href = '/';
    }).catch(error => {
      console.error('回调处理失败：', error);
    });
  }, []);

  return <div>正在登录...</div>;
}
```

**获取用户信息**：

```typescript
// src/auth/get-user.ts
import { userManager } from './oidc-config';

export async function getUser() {
  const user = await userManager.getUser();
  if (user && !user.expired) {
    return user;
  }
  return null;
}

// 使用示例
const user = await getUser();
console.log(user?.profile.email);  // 用户邮箱
console.log(user?.profile.name);   // 用户名称
```

**退出登录**：

```typescript
// src/auth/logout.ts
import { userManager } from './oidc-config';

export async function logout() {
  try {
    await userManager.signoutRedirect();
  } catch (error) {
    console.error('退出登录失败：', error);
  }
}
```

### 3.2 完整示例（React）

**1. 安装依赖**：

```bash
npm install oidc-client-ts react-router-dom
```

**2. 创建 Auth Context**：

```typescript
// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'oidc-client-ts';
import { userManager } from './oidc-config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userManager.getUser().then(user => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  const login = async () => {
    await userManager.signinRedirect();
  };

  const logout = async () => {
    await userManager.signoutRedirect();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

**3. 创建登录按钮和用户信息展示**：

```typescript
// src/components/Header.tsx
import { useAuth } from '../auth/AuthContext';

export function Header() {
  const { user, loading, login, logout } = useAuth();

  if (loading) {
    return <div>加载中...</div>;
  }

  return (
    <header>
      {user ? (
        <div>
          <img src={user.profile.picture} alt="头像" />
          <span>{user.profile.name}</span>
          <button onClick={logout}>退出登录</button>
        </div>
      ) : (
        <button onClick={login}>登录</button>
      )}
    </header>
  );
}
```

**4. 配置路由**：

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { Header } from './components/Header';
import { CallbackPage } from './pages/CallbackPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Header />
        <Routes>
          <Route path="/callback" element={<CallbackPage />} />
          <Route path="/" element={<div>首页</div>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

**5. 创建回调页面**：

```typescript
// src/pages/CallbackPage.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userManager } from '../auth/oidc-config';

export function CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    userManager.signinRedirectCallback().then(() => {
      navigate('/');
    }).catch(error => {
      console.error('回调处理失败：', error);
    });
  }, []);

  return <div>正在登录...</div>;
}
```

---

## 4. 后端集成（Node.js/Python/Java）

### 4.1 Node.js (Express)

**安装依赖**：

```bash
npm install express openid-client
```

**验证 ID Token**：

```javascript
// src/auth/verify-token.js
const { Issuer } = require('openid-client');

async function verifyIdToken(idToken) {
  // 发现 OIDC 配置
  const issuer = await Issuer.discover('https://account.proclaw.cc');
  
  // 获取 JWKS
  const jwks = issuer.metadata.jwks_uri;
  
  // 验证 ID Token
  const client = new issuer.Client({
    client_id: 'your-partner-client-id',
  });
  
  const tokenClaims = client.validateIdToken(idToken, 'RS256');
  console.log(tokenClaims);
  // 输出：{ sub: '...', email: '...', ... }
  
  return tokenClaims;
}
```

**使用 Access Token 访问 API**：

```javascript
// src/auth/fetch-user-info.js
async function fetchUserInfo(accessToken) {
  const response = await fetch('https://account.proclaw.cc/oauth/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const userInfo = await response.json();
  return userInfo;
}
```

### 4.2 Python (Flask/Django)

**安装依赖**：

```bash
pip install authlib requests
```

**验证 ID Token**：

```python
# auth/verify_token.py
from authlib.jose import jwt
import requests

def verify_id_token(id_token):
    # 获取 JWKS
    jwks = requests.get('https://account.proclaw.cc/.well-known/jwks.json').json()
    
    # 解码 ID Token
    claims = jwt.decode(id_token, jwks)
    claims.validate()
    
    print(claims)
    # 输出：{ 'sub': '...', 'email': '...', ... }
    
    return claims
```

**使用 Access Token 访问 API**：

```python
# auth/fetch_user_info.py
import requests

def fetch_user_info(access_token):
    response = requests.get(
        'https://account.proclaw.cc/oauth/userinfo',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    
    user_info = response.json()
    return user_info
```

### 4.3 Java (Spring Boot)

**添加依赖**（pom.xml）：

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-oauth2-client</artifactId>
</dependency>
```

**配置 application.yml**：

```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          nvwax:
            client-id: your-partner-client-id
            client-secret: ''  # PKCE 流程不需要 secret
            scope: openid,profile,email
            redirect-uri: '{baseUrl}/login/oauth2/code/{registrationId}'
            authorization-grant-type: authorization_code
        provider:
          nvwax:
            issuer-uri: https://account.proclaw.cc
```

**获取用户信息**：

```java
// controller/UserController.java
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {
    
    @GetMapping("/user")
    public Map<String, Object> getUser(OAuth2User user) {
        return user.getAttributes();
    }
}
```

---

## 5. Social Login 接入

### 5.1 概述

NvwaX 统一登录认证中心支持以下 Social Login 方式：

- ✅ **GitHub**
- ✅ **Google**
- ✅ **Facebook**（待上线）

用户点击 Social Login 按钮后，会跳转到对应的 OAuth 授权页面，授权成功后自动创建账号并登录。

### 5.2 前端集成

**方法 1：直接使用 OIDC 授权端点**（推荐）

在 `scope` 参数中添加 `social:<provider>`：

```javascript
const authUrl = new URL('https://account.proclaw.cc/oauth/authorize');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', 'your-partner-client-id');
authUrl.searchParams.set('redirect_uri', 'https://your-project.com/callback');
authUrl.searchParams.set('scope', 'openid profile email social:github social:google');
// ... 其他参数

window.location.href = authUrl.toString();
```

**方法 2：使用专用 Social Login 端点**

```javascript
// GitHub 登录
window.location.href = 'https://account.proclaw.cc/api/auth/github?client_id=your-partner-client-id&redirect_uri=https://your-project.com/callback';

// Google 登录
window.location.href = 'https://account.proclaw.cc/api/auth/google?client_id=your-partner-client-id&redirect_uri=https://your-project.com/callback';
```

### 5.3 后端集成

如果需要在后端服务器发起 Social Login，可以使用 OAuth 2.0 授权码流程：

**GitHub OAuth 示例**：

```javascript
// 1. 重定向到 GitHub 授权页面
app.get('/auth/github', (req, res) => {
  const state = crypto.randomUUID();
  sessionStorage.setItem('oauth_state', state);
  
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.set('redirect_uri', 'http://your-project.com/auth/github/callback');
  githubAuthUrl.searchParams.set('scope', 'user:email');
  githubAuthUrl.searchParams.set('state', state);
  
  res.redirect(githubAuthUrl.toString());
});

// 2. 处理 GitHub 回调
app.get('/auth/github/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // 验证 state
  const savedState = sessionStorage.getItem('oauth_state');
  if (state !== savedState) {
    return res.status(400).send('State 不匹配');
  }
  
  // 交换 access_token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code
    })
  });
  
  const { access_token } = await tokenResponse.json();
  
  // 使用 access_token 获取用户信息
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${access_token}`
    }
  });
  
  const userInfo = await userResponse.json();
  
  // 在这里处理用户信息（创建账号、登录等）
  console.log(userInfo);
  
  res.redirect('/');
});
```

---

## 6. API 参考

### 6.1 OIDC 标准端点

| 端点 | URL | 说明 |
|------|-----|------|
| **Discovery** | `https://account.proclaw.cc/.well-known/openid-configuration` | 获取 OIDC 配置信息 |
| **JWKS** | `https://account.proclaw.cc/.well-known/jwks.json` | 获取 JWT 验证公钥 |
| **Authorization** | `https://account.proclaw.cc/oauth/authorize` | 发起授权请求 |
| **Token** | `https://account.proclaw.cc/oauth/token` | 交换/刷新 Token |
| **UserInfo** | `https://account.proclaw.cc/oauth/userinfo` | 获取用户信息 |
| **End Session** | `https://account.proclaw.cc/oauth/logout` | 退出登录 |

### 6.2 请求参数说明

#### Authorization 端点（GET /oauth/authorize）

| 参数 | 必需 | 说明 | 示例 |
|------|------|------|------|
| `response_type` | ✅ | 固定值：`code` | `code` |
| `client_id` | ✅ | 客户端 ID | `your-partner-client-id` |
| `redirect_uri` | ✅ | 回调地址 | `https://your-project.com/callback` |
| `scope` | ✅ | 请求的 Scope | `openid profile email` |
| `state` | ✅ | 随机字符串（防 CSRF） | `random_state_123` |
| `code_challenge` | ✅ | PKCE code challenge | `E9Mel...` |
| `code_challenge_method` | ✅ | 固定值：`S256` | `S256` |
| `login_hint` | ❌ | 预填充邮箱（可选） | `user@example.com` |
| `prompt` | ❌ | 强制重新认证（可选） | `login`, `consent`, `select_account` |

#### Token 端点（POST /oauth/token）

| 参数 | 必需 | 说明 | 示例 |
|------|------|------|------|
| `grant_type` | ✅ | 授权类型 | `authorization_code`, `refresh_token` |
| `client_id` | ✅ | 客户端 ID | `your-partner-client-id` |
| `code` | ✅* | 授权码（`grant_type=authorization_code` 时必需） | `4/0Aeb...` |
| `refresh_token` | ✅* | 刷新令牌（`grant_type=refresh_token` 时必需） | `eyJhbG...` |
| `redirect_uri` | ✅ | 回调地址（必须和之前一致） | `https://your-project.com/callback` |
| `code_verifier` | ✅ | PKCE code verifier | `dBjftJeZ4CVP...` |

### 6.3 Scope 说明

| Scope | 说明 | 返回的 Claims |
|-------|------|----------------|
| `openid` | 必需（OIDC 标准） | `sub`, `iss`, `aud`, `exp`, `iat` |
| `profile` | 用户基本信息 | `name`, `picture` |
| `email` | 用户邮箱 | `email`, `email_verified` |
| `admin` | 管理员权限（可选） | `is_admin` |

### 6.4 错误码

| HTTP 状态码 | 错误码 | 说明 |
|------------|--------|------|
| 400 | `invalid_request` | 请求参数缺失或格式错误 |
| 400 | `invalid_client` | 客户端 ID 不存在或已禁用 |
| 400 | `invalid_grant` | 授权码无效或已过期 |
| 400 | `invalid_scope` | Scope 不被允许 |
| 401 | `unauthorized_client` | 客户端未授权 |
| 403 | `access_denied` | 用户拒绝授权 |
| 500 | `server_error` | 服务器内部错误 |

**错误响应示例**：

```json
{
  "error": "invalid_grant",
  "error_description": "Authorization code has expired"
}
```

---

## 7. 示例代码

### 7.1 完整的 Node.js 示例

```javascript
// server.js
const express = require('express');
const crypto = require('crypto');
const session = require('express-session');

const app = express();
app.use(session({ secret: 'your-session-secret', resave: false, saveUninitialized: false }));

// 1. 登录路由
app.get('/login', (req, res) => {
  // 生成 PKCE 参数
  const codeVerifier = crypto.randomBytes(64).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomUUID();
  
  // 保存到 session
  req.session.codeVerifier = codeVerifier;
  req.session.state = state;
  
  // 构造授权 URL
  const authUrl = new URL('https://account.proclaw.cc/oauth/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', 'your-partner-client-id');
  authUrl.searchParams.set('redirect_uri', 'http://localhost:3000/callback');
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  
  // 重定向到授权 URL
  res.redirect(authUrl.toString());
});

// 2. 回调路由
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // 验证 state
  if (state !== req.session.state) {
    return res.status(400).send('State 不匹配');
  }
  
  // 交换 Token
  const tokenResponse = await fetch('https://account.proclaw.cc/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: 'your-partner-client-id',
      code: code,
      redirect_uri: 'http://localhost:3000/callback',
      code_verifier: req.session.codeVerifier
    })
  });
  
  const tokens = await tokenResponse.json();
  
  // 获取用户信息
  const userInfoResponse = await fetch('https://account.proclaw.cc/oauth/userinfo', {
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`
    }
  });
  
  const userInfo = await userInfoResponse.json();
  
  // 保存到 session
  req.session.user = userInfo;
  
  // 清除临时数据
  delete req.session.codeVerifier;
  delete req.session.state;
  
  res.redirect('/profile');
});

// 3. 用户信息页面
app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  res.json(req.session.user);
});

// 4. 退出登录
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('https://account.proclaw.cc/oauth/logout?post_logout_redirect_uri=http://localhost:3000');
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### 7.2 完整的 Python (Flask) 示例

```python
# app.py
from flask import Flask, session, redirect, request, url_for
import requests
import base64
import hashlib
import secrets

app = Flask(__name__)
app.secret_key = 'your-session-secret'

# 1. 登录路由
@app.route('/login')
def login():
    # 生成 PKCE 参数
    code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(64)).decode('utf-8').rstrip('=')
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode('utf-8')).digest()
    ).decode('utf-8').rstrip('=')
    
    state = secrets.token_urlsafe(32)
    
    # 保存到 session
    session['code_verifier'] = code_verifier
    session['state'] = state
    
    # 构造授权 URL
    auth_url = 'https://account.proclaw.cc/oauth/authorize'
    params = {
        'response_type': 'code',
        'client_id': 'your-partner-client-id',
        'redirect_uri': 'http://localhost:5000/callback',
        'scope': 'openid profile email',
        'state': state,
        'code_challenge': code_challenge,
        'code_challenge_method': 'S256'
    }
    
    # 重定向到授权 URL
    return redirect(f'{auth_url}?{requests.compat.urlencode(params)}')

# 2. 回调路由
@app.route('/callback')
def callback():
    code = request.args.get('code')
    state = request.args.get('state')
    
    # 验证 state
    if state != session.get('state'):
        return 'State 不匹配', 400
    
    # 交换 Token
    token_response = requests.post(
        'https://account.proclaw.cc/oauth/token',
        data={
            'grant_type': 'authorization_code',
            'client_id': 'your-partner-client-id',
            'code': code,
            'redirect_uri': 'http://localhost:5000/callback',
            'code_verifier': session.get('code_verifier')
        }
    )
    
    tokens = token_response.json()
    
    # 获取用户信息
    user_info_response = requests.get(
        'https://account.proclaw.cc/oauth/userinfo',
        headers={'Authorization': f'Bearer {tokens["access_token"]}'}
    )
    
    user_info = user_info_response.json()
    
    # 保存到 session
    session['user'] = user_info
    
    # 清除临时数据
    session.pop('code_verifier', None)
    session.pop('state', None)
    
    return redirect(url_for('profile'))

# 3. 用户信息页面
@app.route('/profile')
def profile():
    if 'user' not in session:
        return redirect(url_for('login'))
    
    return session['user']

# 4. 退出登录
@app.route('/logout')
def logout():
    session.clear()
    return redirect('https://account.proclaw.cc/oauth/logout?post_logout_redirect_uri=http://localhost:5000')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

---

## 8. 常见问题

### 8.1 `redirect_uri` 不匹配

**问题**：登录时返回错误 `redirect_uri_mismatch`

**原因**：`redirect_uri` 必须和注册 OIDC 客户端时填写的完全一致（包括协议、域名、端口、路径）

**解决方法**：
1. 检查 `redirect_uri` 是否和注册时一致
2. 如果需要添加多个 `redirect_uri`，联系 NvwaX 管理员更新数据库

### 8.2 `state` 参数验证失败

**问题**：回调时 `state` 参数不匹配

**原因**：`state` 参数用于防 CSRF 攻击，必须和之前发送的一致

**解决方法**：
1. 在发送授权请求时，生成一个随机 `state` 并保存到 session
2. 在处理回调时，验证 `state` 是否和 session 中保存的一致

### 8.3 Token 过期

**问题**：API 请求返回 `401 Unauthorized`

**原因**：`access_token` 已过期（默认 1 小时）

**解决方法**：
1. 使用 `refresh_token` 获取新的 `access_token`（参考 2.8 节）
2. 在实现中自动处理 token 刷新

### 8.4 Social Login 无法使用

**问题**：点击 Social Login 按钮后报错

**原因**：
1. Social Login 未启用（需要管理员在 `.env` 中配置 `GITHUB_CLIENT_ID` 等）
2. OAuth App 配置错误（Callback URL 不匹配）

**解决方法**：
1. 联系 NvwaX 管理员确认 Social Login 是否已启用
2. 检查 OAuth App 的 Callback URL 是否配置正确

### 8.5 如何调试 OIDC 流程？

**推荐工具**：
1. **OIDC Debugger**：https://oidcdebugger.com/
2. **Postman**：支持 OIDC 授权码流程
3. **浏览器开发者工具**：查看 Network 请求和 Cookie

**调试步骤**：
1. 打开浏览器开发者工具（F12）
2. 访问授权 URL
3. 查看 Network 面板，检查请求参数和响应
4. 查看 Application 面板，检查 Cookie 和 LocalStorage

---

## 📞 支持与反馈

如果你在接入过程中遇到问题，可以：

1. **查看文档**：
   - 部署指南：`docs/DEPLOYMENT_GUIDE.md`
   - OIDC 标准：https://openid.net/specs/

2. **联系支持**：
   - 📧 Email：admin@proclaw.cc
   - 💬 微信群：NvwaX 开发者交流群

3. **提交 Issue**：
   - GitHub：https://github.com/BiglionX/NvwaX/issues

---

**文档版本**：1.0  
**最后更新**：2026-06-21  
**适用版本**：NvwaX v1.3.0+
