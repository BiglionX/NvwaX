# 🎯 下一步行动清单

本文档提供配置 GitHub 和 Google 社交登录的具体步骤。

---

## ✅ 已完成的代码工作

### 后端 (packages/nvwax-server)

- ✅ 添加 GitHub 登录控制器方法 (`social-auth.controller.ts`)
- ✅ 添加 GitHub OAuth 路由 (`routes/index.ts`)
- ✅ GitHub OAuth 服务已实现 (`services/oauth/github-oauth.service.ts`)

### 前端 (packages/nvwax-web)

- ✅ 添加 GitHub 登录 API 方法 (`lib/api/auth.ts`)
- ✅ 创建 GitHub 登录按钮组件 (`components/auth/GitHubLoginButton.tsx`)
- ✅ 创建 GitHub 回调页面 (`pages/auth/github-callback.tsx`)
- ✅ 创建完整登录页面 (`pages/login.tsx`)
- ✅ 创建测试页面 (`pages/test/social-login.tsx`)

### 文档和工具

- ✅ 完整配置指南 (`SOCIAL_LOGIN_SETUP_GUIDE.md`)
- ✅ 快速配置指南 (`SOCIAL_LOGIN_QUICK_START.md`)
- ✅ 配置验证脚本 (`scripts/validate-social-login-config.js`)
- ✅ 配置向导脚本 (`scripts/social-login-setup-wizard.js`)
- ✅ Windows 配置脚本 (`scripts/setup-social-login.ps1`)
- ✅ 更新环境变量示例 (`.env.example`)

---

## 📋 你需要完成的配置（按优先级排序）

### 🔥 优先级 1: 创建 OAuth App（必须完成）

#### 1.1 创建 GitHub OAuth App

**时间估计**: 5 分钟

**步骤**:

1. **访问 GitHub Developer Settings**
   - URL: https://github.com/settings/developers
   - 点击 **OAuth Apps** 标签
   - 点击 **New OAuth App** 按钮

2. **填写应用信息**
   ```
   Application name: NvwaX
   Homepage URL: http://localhost:3000
   Authorization callback URL: http://localhost:3001/api/auth/github/callback
   ```
   ⚠️ **生产环境**请替换为真实域名

3. **获取凭证**
   - 点击 **Register application**
   - 复制 **Client ID** (格式: `Iv1.xxxxxxxxxxxxxxxxxxxx`)
   - 点击 **Generate a new client secret**
   - 复制 **Client Secret** (只显示一次！)
   - 保存到安全位置

**检查点**: 你现在应该有：
- [ ] GitHub Client ID
- [ ] GitHub Client Secret

---

#### 1.2 创建 Google OAuth App

**时间估计**: 10 分钟

**步骤**:

1. **访问 Google Cloud Console**
   - URL: https://console.cloud.google.com/
   - 创建新项目或选择现有项目

2. **启用 Google+ API**
   - 进入 **APIs & Services** → **Library**
   - 搜索 "Google+ API" 或 "Google Identity Services"
   - 点击 **Enable**

3. **配置 OAuth 同意屏幕**
   - 进入 **APIs & Services** → **OAuth consent screen**
   - 选择 **User Type**: External
   - 点击 **Create**
   - 填写应用信息:
     - **App name**: NvwaX
     - **User support email**: 你的邮箱
     - **Developer contact email**: 你的邮箱
   - 点击 **Save and Continue**
   - **Scopes**: 添加 `userinfo.email`, `userinfo.profile`
   - 点击 **Save and Continue**
   - **Test users**: 添加你的邮箱（开发阶段）
   - 点击 **Save and Continue**

4. **创建 OAuth 客户端 ID**
   - 进入 **Credentials** 标签
   - 点击 **Create Credentials** → **OAuth client ID**
   - **Application type**: Web application
   - **Name**: NvwaX Web Client
   - **Authorized JavaScript origins**:
     ```
     http://localhost:3000
     https://your-domain.com  (生产环境)
     ```
   - **Authorized redirect URIs** (可选):
     ```
     http://localhost:3000
     https://your-domain.com
     ```
   - 点击 **Create**
   - 复制 **Client ID** (格式: `1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`)
   - 保存到安全位置

**检查点**: 你现在应该有：
- [ ] Google Client ID

---

### 🔥 优先级 2: 配置环境变量（必须完成）

#### 2.1 后端环境变量

**文件**: `packages/nvwax-server/.env`

**操作**:

1. 如果 `.env` 文件不存在，复制 `.env.example`:
   ```bash
   cp .env.example packages/nvwax-server/.env
   ```

2. 编辑 `packages/nvwax-server/.env`，添加以下配置:
   ```bash
   # GitHub OAuth
   GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxx
   GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   
   # Google OAuth
   GOOGLE_CLIENT_ID=1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
   ```

**检查点**:
- [ ] 已编辑 `packages/nvwax-server/.env`
- [ ] `GITHUB_CLIENT_ID` 已设置
- [ ] `GITHUB_CLIENT_SECRET` 已设置
- [ ] `GOOGLE_CLIENT_ID` 已设置

---

#### 2.2 前端环境变量

**文件**: `packages/nvwax-web/.env.local`

**操作**:

1. 创建或编辑 `packages/nvwax-web/.env.local`
2. 添加以下配置:
   ```bash
   # GitHub OAuth
   NEXT_PUBLIC_GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxx
   
   # Google OAuth
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
   ```

**检查点**:
- [ ] 已创建/编辑 `packages/nvwax-web/.env.local`
- [ ] `NEXT_PUBLIC_GITHUB_CLIENT_ID` 已设置
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` 已设置

---

### 🔥 优先级 3: 运行数据库迁移（必须完成）

**时间估计**: 1 分钟

**步骤**:

1. **进入项目根目录**
   ```bash
   cd d:\BigLionX\NvwaX
   ```

2. **运行数据库迁移**
   ```bash
   pnpm run db:migrate
   ```
   或
   ```bash
   pnpm run prisma:migrate
   ```

3. **验证 `social_accounts` 表已创建**
   - 连接到你的数据库
   - 检查是否存在 `social_accounts` 表
   - 如果不存在，手动执行 `SOCIAL_LOGIN_SETUP_GUIDE.md` 中的 SQL 脚本

**检查点**:
- [ ] 数据库迁移已运行
- [ ] `social_accounts` 表已创建

---

### 🔥 优先级 4: 测试登录流程（必须完成）

#### 4.1 启动开发服务器

**终端 1 - 后端**:
```bash
cd d:\BigLionX\NvwaX\packages\nvwax-server
pnpm run dev
```

**终端 2 - 前端**:
```bash
cd d:\BigLionX\NvwaX\packages\nvwax-web
pnpm run dev
```

**检查点**:
- [ ] 后端已启动 (http://localhost:3001)
- [ ] 前端已启动 (http://localhost:3000)

---

#### 4.2 运行配置验证

**方法 1: 使用验证脚本**
```bash
node scripts/validate-social-login-config.js
```

**方法 2: 使用配置向导**
```bash
node scripts/social-login-setup-wizard.js
```

**方法 3: 使用 PowerShell 脚本 (Windows)**
```powershell
.\scripts\setup-social-login.ps1
```

**方法 4: 使用测试页面**
1. 访问 http://localhost:3000/test/social-login
2. 点击 "🚀 运行所有测试"
3. 检查测试结果

**检查点**:
- [ ] 配置验证通过
- [ ] 没有错误（警告可以忽略）

---

#### 4.3 测试 GitHub 登录

1. **访问登录页面**
   - URL: http://localhost:3000/login
   - 或: http://localhost:3000/test/social-login

2. **点击 "使用 GitHub 登录" 按钮**

3. **跳转 GitHub 授权页面**
   - 确认 URL 是 `https://github.com/login/oauth/authorize?...`
   - 检查 `client_id` 是否正确
   - 检查 `redirect_uri` 是否正确

4. **点击 "Authorize" 授权**

5. **跳转回回调页面**
   - URL: http://localhost:3001/api/auth/github/callback?code=...&state=...
   - 应该自动跳转回前端

6. **检查登录状态**
   - 检查 `localStorage` 中是否有 `nvwax_token` 和 `nvwax_user`
   - 检查是否跳转到 `/dashboard`

**检查点**:
- [ ] GitHub 授权页面正常显示
- [ ] 授权后成功回调
- [ ] 用户信息正确保存
- [ ] Token 正确生成

---

#### 4.4 测试 Google 登录

1. **访问登录页面**
   - URL: http://localhost:3000/login

2. **点击 Google 登录按钮**
   - 应该弹出 Google 授权窗口

3. **选择 Google 账号授权**

4. **授权窗口自动关闭**

5. **检查登录状态**
   - 检查 `localStorage` 中是否有 `nvwax_token` 和 `nvwax_user`
   - 检查是否跳转到 `/dashboard`

**检查点**:
- [ ] Google 按钮正常显示
- [ ] 授权窗口正常弹出
- [ ] 授权后成功登录
- [ ] 用户信息正确保存

---

## 🐛 常见问题排查

### GitHub OAuth

| 问题 | 解决方案 |
|------|----------|
| `redirect_uri_mismatch` | 检查 GitHub OAuth App 的 **Authorization callback URL** 是否与代码中一致 |
| `Bad verification code` | Code 已过期，重新发起授权流程 |
| 无法获取邮箱 | 代码已自动处理私有邮箱，检查 GitHub API 返回 |
| `not configured` 错误 | 检查 `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET` 是否已设置 |

### Google OAuth

| 问题 | 解决方案 |
|------|----------|
| `audience mismatch` | 检查 `GOOGLE_CLIENT_ID` 是否正确 |
| 按钮不显示 | 检查浏览器控制台，确认 GIS SDK 已加载 |
| `origin mismatch` | 在 Google Cloud Console 中添加 JavaScript 来源 |
| `not configured` 错误 | 检查 `GOOGLE_CLIENT_ID` 和 `NEXT_PUBLIC_GOOGLE_CLIENT_ID` 是否已设置 |

### 通用问题

| 问题 | 解决方案 |
|------|----------|
| CORS 错误 | 在 `.env` 中配置 `CORS_ALLOWED_ORIGINS` |
| 404 错误 | 检查路由是否已注册 (`routes/index.ts`) |
| 数据库错误 | 运行数据库迁移或手动创建表 |
| 后端启动失败 | 检查环境变量是否正确，查看错误日志 |

---

## 📁 关键文件位置

### 需要配置的文件

```
d:\BigLionX\NvwaX\
├── packages\nvwax-server\
│   └── .env                        ← 配置后端环境变量
├── packages\nvwax-web\
│   └── .env.local                  ← 配置前端环境变量
└── .env.example                     ← 参考此文件
```

### 已完成的代码文件

```
d:\BigLionX\NvwaX\
├── packages\nvwax-server\
│   ├── src\controllers\
│   │   └── social-auth.controller.ts
│   └── src\routes\
│       └── index.ts
└── packages\nvwax-web\
    ├── components\auth\
    │   └── GitHubLoginButton.tsx
    ├── pages\
    │   ├── login.tsx
    │   ├── test\social-login.tsx
    │   └── auth\github-callback.tsx
    └── lib\api\
        └── auth.ts
```

### 文档和工具

```
d:\BigLionX\NvwaX\
├── SOCIAL_LOGIN_SETUP_GUIDE.md          ← 完整配置指南
├── SOCIAL_LOGIN_QUICK_START.md          ← 快速配置指南
├── NEXT_STEPS.md                        ← 本文档
├── scripts\
│   ├── validate-social-login-config.js  ← 配置验证脚本
│   ├── social-login-setup-wizard.js     ← 配置向导脚本
│   └── setup-social-login.ps1          ← Windows 配置脚本
└── .env.example                         ← 环境变量示例
```

---

## 🎉 完成！

完成以上所有步骤后，你的 NvwaX 应用就支持 GitHub 和 Google 社交登录了！

### 下一步建议

1. **自定义登录页面样式**
   - 编辑 `packages/nvwax-web/pages/login.tsx`
   - 编辑 `packages/nvwax-web/components/auth/GitHubLoginButton.tsx`

2. **添加更多社交登录方式**
   - Facebook (已有基础实现)
   - Twitter
   - 微信 (预留)

3. **实现社交账号管理**
   - 绑定社交账号
   - 解绑社交账号
   - 查看已绑定的社交账号

4. **添加登录日志和审计**
   - 记录社交登录成功/失败
   - 记录异常登录尝试

---

## 🆘 需要帮助？

### 查看文档

- **完整配置指南**: `SOCIAL_LOGIN_SETUP_GUIDE.md`
- **快速配置指南**: `SOCIAL_LOGIN_QUICK_START.md`
- **本文档**: `NEXT_STEPS.md`

### 使用测试工具

- **配置验证脚本**: `node scripts/validate-social-login-config.js`
- **配置向导脚本**: `node scripts/social-login-setup-wizard.js`
- **测试页面**: http://localhost:3000/test/social-login

### 检查日志

- **后端日志**: 查看终端输出
- **前端日志**: 打开浏览器开发者工具 Console
- **网络请求**: 使用浏览器开发者工具 Network 标签

### 提交 Issue

如果遇到无法解决的问题，请提交 Issue 到项目 GitHub 仓库，并包含以下信息：
- 错误截图
- 错误日志
- 环境信息 (OS, Node.js 版本, etc.)
- 已尝试的解决方法

---

**祝配置顺利！** 🚀
