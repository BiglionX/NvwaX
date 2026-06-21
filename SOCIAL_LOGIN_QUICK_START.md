# NvwaX 社交登录快速配置指南

本文档提供 GitHub 和 Google 社交登录的快速配置步骤。

---

## 📋 配置清单

### ✅ 已完成的代码修改

- [x] 后端：添加 GitHub 登录控制器方法
- [x] 后端：添加 GitHub OAuth 路由
- [x] 前端：添加 GitHub 登录 API 方法
- [x] 前端：创建 GitHub 登录按钮组件
- [x] 前端：创建 GitHub 回调页面
- [x] 前端：创建完整登录页面示例
- [x] 文档：创建完整配置指南
- [x] 配置：更新 `.env.example`

### ⏳ 需要你完成的配置

- [ ] 创建 GitHub OAuth App
- [ ] 创建 Google OAuth App
- [ ] 配置环境变量
- [ ] 运行数据库迁移
- [ ] 测试登录流程

---

## 🚀 快速配置步骤

### 步骤 1: 创建 GitHub OAuth App（5 分钟）

1. **访问 GitHub Developer Settings**
   - URL: https://github.com/settings/developers
   - 点击 **OAuth Apps** → **New OAuth App**

2. **填写应用信息**
   ```
   Application name: NvwaX
   Homepage URL: http://localhost:3000
   Authorization callback URL: http://localhost:3000/api/auth/github/callback
   ```
   ⚠️ **生产环境**请使用真实域名

3. **获取凭证**
   - 复制 **Client ID**
   - 点击 **Generate a new client secret**
   - 复制 **Client Secret**（只显示一次！）

4. **保存凭证**
   将凭证保存到安全位置，下一步需要

---

### 步骤 2: 创建 Google OAuth App（10 分钟）

1. **访问 Google Cloud Console**
   - URL: https://console.cloud.google.com/
   - 创建新项目或选择现有项目

2. **配置 OAuth 同意屏幕**
   - 进入 **APIs & Services** → **OAuth consent screen**
   - **User Type**: External
   - 填写应用信息（app name, support email）
   - 添加范围：`userinfo.email`, `userinfo.profile`

3. **创建 OAuth 客户端 ID**
   - 进入 **Credentials** → **Create Credentials** → **OAuth client ID**
   - **Application type**: Web application
   - **Name**: NvwaX Web Client
   - **Authorized JavaScript origins**:
     ```
     http://localhost:3000
     https://your-domain.com  (生产环境)
     ```

4. **获取 Client ID**
   - 创建后复制 **Client ID**
   - 格式：`1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`

---

### 步骤 3: 配置环境变量（2 分钟）

1. **后端环境变量**

   在 `packages/nvwax-server/.env` 中添加：

   ```bash
   # GitHub OAuth
   GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxx
   GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   
   # Google OAuth
   GOOGLE_CLIENT_ID=1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
   ```

2. **前端环境变量**

   在 `packages/nvwax-web/.env.local` 中添加：

   ```bash
   # GitHub OAuth
   NEXT_PUBLIC_GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxx
   
   # Google OAuth
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
   ```

---

### 步骤 4: 运行数据库迁移（1 分钟）

```bash
# 进入项目根目录
cd d:\BigLionX\NvwaX

# 运行数据库迁移
pnpm run db:migrate

# 或使用 Prisma
pnpm run prisma:migrate
```

**检查 `social_accounts` 表是否存在**

如果迁移失败，手动执行 SQL（参考 `SOCIAL_LOGIN_SETUP_GUIDE.md` 中的 SQL 脚本）。

---

### 步骤 5: 测试登录流程（5 分钟）

1. **启动开发服务器**

   ```bash
   # 后端
   cd packages/nvwax-server
   pnpm run dev
   
   # 前端（新终端）
   cd packages/nvwax-web
   pnpm run dev
   ```

2. **测试 GitHub 登录**

   - 访问 http://localhost:3000/login
   - 点击 "使用 GitHub 登录" 按钮
   - 跳转 GitHub 授权页面
   - 授权后跳转回回调页面
   - 检查是否成功登录

3. **测试 Google 登录**

   - 访问 http://localhost:3000/login
   - 点击 Google 登录按钮
   - 弹出 Google 授权窗口
   - 授权后自动关闭窗口
   - 检查是否成功登录

4. **检查后端日志**

   ```bash
   # 应该看到类似的日志
   [GitHubOAuth] GITHUB_CLIENT_ID configured, length: 20
   [SocialAuth] GitHub user verified: user@example.com
   ```

---

## 🐛 常见问题快速解决

### GitHub OAuth

| 问题 | 原因 | 解决方法 |
|------|------|----------|
| `not configured` | 环境变量未配置 | 检查 `.env` 中的 `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET` |
| `redirect_uri_mismatch` | 回调地址不匹配 | 检查 GitHub OAuth App 的 **Authorization callback URL** |
| `Bad verification code` | Code 已过期 | 重新发起授权流程 |
| 无法获取邮箱 | 用户设置了私有邮箱 | 代码已自动处理，检查 GitHub API 返回 |

### Google OAuth

| 问题 | 原因 | 解决方法 |
|------|------|----------|
| `not configured` | 环境变量未配置 | 检查 `GOOGLE_CLIENT_ID` 和 `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |
| `audience mismatch` | Client ID 不匹配 | 确保前端和后端使用相同的 Client ID |
| 按钮不显示 | GIS SDK 未加载 | 检查浏览器控制台，确认 SDK 已加载 |
| `origin mismatch` | JavaScript 来源未授权 | 在 Google Cloud Console 中添加来源 |

### 通用问题

| 问题 | 原因 | 解决方法 |
|------|------|----------|
| CORS 错误 | 域名未白名单 | 在 `.env` 中配置 `CORS_ALLOWED_ORIGINS` |
| 数据库错误 | 表不存在 | 运行数据库迁移或手动创建表 |
| 404 错误 | 路由未注册 | 检查 `routes/index.ts` 中的路由配置 |

---

## 📁 关键文件清单

### 后端文件

```
packages/nvwax-server/
├── src/
│   ├── controllers/
│   │   └── social-auth.controller.ts   # 社交登录控制器（已更新）
│   ├── services/oauth/
│   │   ├── github-oauth.service.ts      # GitHub OAuth 服务（已有）
│   │   ├── google-oauth.service.ts     # Google OAuth 服务（已有）
│   │   └── oauth-service.ts           # OAuth 基类（已有）
│   ├── routes/
│   │   └── index.ts                   # 路由配置（已更新）
│   └── types/
│       └── oauth.types.ts              # OAuth 类型定义（已有）
└── .env                                # 环境变量（需要配置）
```

### 前端文件

```
packages/nvwax-web/
├── components/
│   └── auth/
│       └── GitHubLoginButton.tsx       # GitHub 登录按钮（已创建）
├── pages/
│   ├── login.tsx                      # 登录页面（已创建）
│   └── auth/
│       └── github-callback.tsx        # GitHub 回调页面（已创建）
├── lib/api/
│   └── auth.ts                        # Auth API（已更新）
├── hooks/
│   └── useSocialAuth.ts               # 社交登录 Hook（已有）
└── .env.local                         # 环境变量（需要配置）
```

### 文档文件

```
.
├── SOCIAL_LOGIN_SETUP_GUIDE.md        # 完整配置指南（已创建）
├── SOCIAL_LOGIN_QUICK_START.md        # 快速配置指南（本文档）
└── .env.example                       # 环境变量示例（已更新）
```

---

## 🔐 安全建议

1. **使用 HTTPS**
   - 生产环境必须使用 HTTPS
   - 防止授权 code 和 token 被拦截

2. **保护 Client Secret**
   - 不要提交到代码仓库
   - 使用环境变量或密钥管理服务
   - 生产环境使用 K8s Secrets

3. **验证 State 参数**
   - GitHub OAuth 使用 `state` 防 CSRF
   - 确保生成和验证 `state` 值

4. **限制 OAuth Scope**
   - 只请求必要的权限
   - GitHub: `read:user`, `user:email`
   - Google: `userinfo.email`, `userinfo.profile`

5. **处理 Token 过期**
   - 实现 token 刷新机制
   - 引导用户重新授权

---

## 📊 测试检查清单

### GitHub 登录测试

- [ ] 点击登录按钮，跳转 GitHub 授权页面
- [ ] 授权后，跳转回回调页面
- [ ] 新用户自动创建账号
- [ ] 已存在用户成功登录
- [ ] 用户信息正确保存（email, name, avatar）
- [ ] Token 正确生成和保存
- [ ] 登录失败有错误提示

### Google 登录测试

- [ ] Google 按钮正确显示
- [ ] 点击按钮，弹出授权窗口
- [ ] 授权后，窗口自动关闭
- [ ] 新用户自动创建账号
- [ ] 已存在用户成功登录
- [ ] 用户信息正确保存
- [ ] Token 正确生成和保存

### 社交账号管理测试

- [ ] 查看已绑定的社交账号列表
- [ ] 绑定新的社交账号
- [ ] 解绑社交账号
- [ ] 解绑最后一个登录方式时有提示

---

## 🎉 完成！

完成以上配置后，你的 NvwaX 应用就支持 GitHub 和 Google 社交登录了！

### 下一步

- 自定义登录页面样式
- 添加更多社交登录方式（Facebook, Twitter, etc.）
- 实现社交账号绑定/解绑功能
- 添加登录日志和审计

### 需要帮助？

- 查看完整配置指南：`SOCIAL_LOGIN_SETUP_GUIDE.md`
- 检查后端日志：`packages/nvwax-server/logs/`
- 检查前端控制台：浏览器开发者工具
- 提交 Issue：项目 GitHub 仓库

---

## 📞 支持

如果遇到问题，请按以下顺序排查：

1. **检查环境变量** - 确保已正确配置
2. **检查数据库** - 确保 `social_accounts` 表存在
3. **检查日志** - 查看后端和前端错误日志
4. **检查网络请求** - 使用浏览器开发者工具
5. **查看文档** - 参考 `SOCIAL_LOGIN_SETUP_GUIDE.md`

---

**配置完成后，删除本文件和 `SOCIAL_LOGIN_SETUP_GUIDE.md` 中的敏感信息！**
