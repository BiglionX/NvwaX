# 前端 API 说明文档

> **目标**：帮助前端开发者理解和使用 NvwaX 统一登录认证中心的前端 API
>
> **适用对象**：前端开发者、UI/UX 设计师

---

## 📋 目录

1. [概述](#1-概述)
2. [AuthPortalClient 组件](#2-authportalclient-组件)
3. [SocialButtons 组件](#3-socialbuttons-组件)
4. [API 函数说明](#4-api-函数说明)
5. [状态管理](#5-状态管理)
6. [样式定制](#6-样式定制)
7. [示例代码](#7-示例代码)

---

## 1. 概述

### 1.1 前端架构

NvwaX 统一登录认证中心的前端部分位于 `packages/account-portal/`，使用 **Next.js 14** 框架构建。

**主要组件**：

| 组件 | 说明 | 位置 |
|------|------|------|
| `AuthPortalClient` | 主登录/注册组件 | `components/AuthPortalClient.tsx` |
| `SocialButtons` | Social Login 按钮组件 | `components/SocialButtons.tsx` |
| `LoginPage` | 登录页面 | `app/login/page.tsx` |
| `RegisterPage` | 注册页面 | `app/register/page.tsx` |
| `ActivatePage` | 邮箱验证页面 | `app/activate/page.tsx` |

### 1.2 API 基础配置

前端通过环境变量配置后端 API 地址：

```bash
# .env.local (前端)
NEXT_PUBLIC_API_URL=https://account.proclaw.cc
```

**API 基础 URL**：
```
https://account.proclaw.cc/api
```

---

## 2. AuthPortalClient 组件

### 2.1 组件说明

`AuthPortalClient` 是一个 **客户端组件**（使用 `'use client'` 指令），提供登录和注册功能。

**主要功能**：
- ✅ 邮箱/密码登录
- ✅ 邮箱/密码注册
- ✅ 表单验证（邮箱格式、密码强度）
- ✅ 错误提示
- ✅ 加载状态

### 2.2 Props 接口

```typescript
interface AuthPortalClientProps {
  mode: 'login' | 'register';  // 模式：登录或注册
}
```

### 2.3 使用示例

```tsx
// app/login/page.tsx
import AuthPortalClient from '@/components/AuthPortalClient';

export default function LoginPage() {
  return (
    <div>
      <h1>登录</h1>
      <AuthPortalClient mode="login" />
    </div>
  );
}
```

```tsx
// app/register/page.tsx
import AuthPortalClient from '@/components/AuthPortalClient';

export default function RegisterPage() {
  return (
    <div>
      <h1>注册</h1>
      <AuthPortalClient mode="register" />
    </div>
  );
}
```

### 2.4 状态管理

组件内部使用 `useState` 管理表单状态：

```typescript
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [error, setError] = useState('');
const [loading, setLoading] = useState(false);
```

### 2.5 表单提交流程

**登录流程**：

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || '登录失败');
    }

    // 登录成功，保存 token 并重定向
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    router.push('/dashboard');
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

**注册流程**：

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || '注册失败');
    }

    // 注册成功，显示验证邮件提示
    router.push('/activate?email=' + encodeURIComponent(email));
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

---

## 3. SocialButtons 组件

### 3.1 组件说明

`SocialButtons` 是一个 **客户端组件**，提供 Social Login 按钮（GitHub、Google、Facebook）。

**主要功能**：
- ✅ GitHub 登录按钮
- ✅ Google 登录按钮
- ✅ Facebook 登录按钮（待上线）
- ✅ 加载状态

### 3.2 Props 接口

```typescript
interface SocialButtonsProps {
  // 当前无 Props，未来可扩展（例如：callbackUrl、scope 等）
}
```

### 3.3 使用示例

```tsx
// components/AuthPortalClient.tsx
import SocialButtons from '@/components/SocialButtons';

export default function AuthPortalClient({ mode }: AuthPortalClientProps) {
  return (
    <div>
      {/* 邮箱/密码表单 */}
      <form onSubmit={handleSubmit}>
        {/* ... */}
      </form>

      {/* Social Login 分隔线 */}
      <div className="divider">或使用以下方式登录</div>

      {/* Social Login 按钮 */}
      <SocialButtons />
    </div>
  );
}
```

### 3.4 实现细节

**GitHub 登录**：

```typescript
const handleGitHubLogin = () => {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const redirectUri = `${window.location.origin}/api/auth/github/callback`;
  const state = crypto.randomUUID();

  // 保存 state（防 CSRF 攻击）
  sessionStorage.setItem('oauth_state', state);

  // 重定向到 GitHub 授权页面
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&state=${state}`;
  window.location.href = githubAuthUrl;
};
```

**Google 登录**：

```typescript
const handleGoogleLogin = () => {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = `${window.location.origin}/api/auth/google/callback`;
  const state = crypto.randomUUID();

  // 保存 state
  sessionStorage.setItem('oauth_state', state);

  // 重定向到 Google 授权页面
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20profile%20email&state=${state}`;
  window.location.href = googleAuthUrl;
};
```

---

## 4. API 函数说明

### 4.1 登录 API

**端点**：`POST /api/auth/login`

**请求体**：

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应示例**（成功）：

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

**响应示例**（失败）：

```json
{
  "message": "邮箱或密码错误"
}
```

### 4.2 注册 API

**端点**：`POST /api/auth/register`

**请求体**：

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应示例**（成功）：

```json
{
  "message": "注册成功，请查收验证邮件"
}
```

**响应示例**（失败）：

```json
{
  "message": "该邮箱已被注册"
}
```

### 4.3 邮箱验证 API

**端点**：`POST /api/auth/activate`

**请求体**：

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**响应示例**（成功）：

```json
{
  "message": "邮箱验证成功",
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

### 4.4 刷新 Token API

**端点**：`POST /api/auth/refresh`

**请求体**：

```json
{
  "refresh_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

**响应示例**（成功）：

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
  "expires_in": 3600
}
```

### 4.5 获取用户信息 API

**端点**：`GET /api/auth/me`

**请求头**：

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

**响应示例**（成功）：

```json
{
  "id": "user-id-123",
  "email": "user@example.com",
  "name": "User Name",
  "picture": "https://account.proclaw.cc/avatars/123.png",
  "email_verified": true,
  "created_at": "2026-01-01T00:00:00.000Z"
}
```

---

## 5. 状态管理

### 5.1 Token 存储

**推荐方式**：使用 `localStorage` 存储 token

```typescript
// 保存 token
localStorage.setItem('access_token', data.access_token);
localStorage.setItem('refresh_token', data.refresh_token);

// 获取 token
const accessToken = localStorage.getItem('access_token');

// 清除 token（退出登录）
localStorage.removeItem('access_token');
localStorage.removeItem('refresh_token');
```

### 5.2 自动刷新 Token

在 API 请求前，检查 `access_token` 是否过期，如果过期则自动刷新：

```typescript
// utils/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/api',
});

// 请求拦截器：自动添加 Authorization header
api.interceptors.request.use(async (config) => {
  const accessToken = localStorage.getItem('access_token');
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 响应拦截器：自动刷新 token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 如果是 401 错误，且未重试过
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // 刷新 token
      const refreshToken = localStorage.getItem('refresh_token');
      const response = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
      
      const { access_token, refresh_token } = response.data;
      
      // 保存新的 token
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      
      // 重试原请求
      originalRequest.headers.Authorization = `Bearer ${access_token}`;
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default api;
```

### 5.3 用户状态管理（React Context）

创建一个 `AuthContext` 来管理全局用户状态：

```typescript
// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 检查是否已登录
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      // 获取用户信息
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          setUser(data);
          setLoading(false);
        })
        .catch(() => {
          setUser(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);

    // 获取用户信息
    const userResponse = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const user = await userResponse.json();

    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
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

**使用示例**：

```tsx
// pages/dashboard.tsx
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div>加载中...</div>;
  }

  if (!user) {
    return <div>请先登录</div>;
  }

  return (
    <div>
      <h1>欢迎，{user.name}！</h1>
      <img src={user.picture} alt="头像" />
      <button onClick={logout}>退出登录</button>
    </div>
  );
}
```

---

## 6. 样式定制

### 6.1 全局样式

全局样式位于 `styles/globals.css`，使用 **CSS Modules** 和 **Tailwind CSS**。

**主要样式类**：

| 类名 | 说明 |
|------|------|
| `.auth-container` | 登录/注册容器 |
| `.auth-form` | 表单 |
| `.auth-input` | 输入框 |
| `.auth-button` | 按钮 |
| `.social-buttons` | Social Login 按钮容器 |
| `.error-message` | 错误提示 |

### 6.2 定制主题

**修改主色调**：

```css
/* styles/globals.css */
:root {
  --primary-color: #4A90E2;  /* 主色调 */
  --secondary-color: #7ED321;  /* 辅助色 */
  --error-color: #D0021B;  /* 错误色 */
}
```

**修改按钮样式**：

```css
/* styles/globals.css */
.auth-button {
  background-color: var(--primary-color);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
}

.auth-button:hover {
  background-color: darken(var(--primary-color), 10%);
}
```

### 6.3 响应式设计

前端已支持响应式设计，适配桌面、平板、手机。

**断点**：

| 断点 | 宽度 |
|------|------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |

**使用示例**：

```tsx
<div className="auth-container">
  <div className="max-w-md mx-auto p-4 md:p-8">
    {/* 内容 */}
  </div>
</div>
```

---

## 7. 示例代码

### 7.1 完整的登录页面

```tsx
// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthPortalClient from '@/components/AuthPortalClient';
import SocialButtons from '@/components/SocialButtons';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">登录</h1>
          <p className="mt-2 text-sm text-gray-600">
            或使用 Social Login 快速登录
          </p>
        </div>

        <AuthPortalClient mode="login" />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">其他方式</span>
          </div>
        </div>

        <SocialButtons />

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            还没有账号？
            <a href="/register" className="text-blue-600 hover:text-blue-800">
              立即注册
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
```

### 7.2 受保护的路由

```tsx
// app/dashboard/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div>加载中...</div>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
```

---

## 📞 支持与反馈

如果你在开发过程中遇到问题，可以：

1. **查看文档**：
   - 部署指南：`docs/DEPLOYMENT_GUIDE.md`
   - API 接入指南：`docs/API_GUIDE.md`

2. **联系支持**：
   - 📧 Email：admin@proclaw.cc

3. **提交 Issue**：
   - GitHub：https://github.com/BiglionX/NvwaX/issues

---

**文档版本**：1.0  
**最后更新**：2026-06-21  
**适用版本**：NvwaX v1.3.0+
