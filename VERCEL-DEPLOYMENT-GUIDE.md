# NvwaX Vercel 部署指南

本文档详细说明如何将 NvwaX 前端应用部署到 Vercel 平台。

---

## 📋 部署架构说明

### 重要提示

NvwaX 是一个全栈应用，包含：
- **前端** (Next.js) - 可以部署在 Vercel ✅
- **后端** (Express + PostgreSQL) - 需要单独部署 ⚠️

**推荐的部署方案**：
- 前端 → Vercel（免费、快速、自动 HTTPS）
- 后端 → Railway / Render / Fly.io（支持数据库和长时间运行）
- 数据库 → Supabase / Neon / Railway PostgreSQL

---

## 🚀 方式一：通过 Vercel Dashboard 部署（推荐）

### 步骤 1: 准备后端 API

在部署前端之前，您需要先部署后端 API。

#### 选项 A: 使用 Railway（推荐）

1. 访问 https://railway.app
2. 创建新项目
3. 选择 "Deploy from GitHub"
4. 选择 `nvwax-server` 目录
5. 添加 PostgreSQL 插件
6. 配置环境变量（参考 `.env.example`）
7. 获取 API URL（例如: `https://nvwax-api.railway.app`）

#### 选项 B: 使用 Render

1. 访问 https://render.com
2. 创建新的 Web Service
3. 连接 GitHub 仓库
4. 设置根目录为 `packages/nvwax-server`
5. 配置环境变量
6. 获取 API URL

#### 选项 C: 其他后端托管服务

- Fly.io
- Heroku
- DigitalOcean App Platform
- AWS Elastic Beanstalk

### 步骤 2: 部署前端到 Vercel

#### 方法 A: 通过 Vercel Dashboard

1. **访问 Vercel**
   - 打开 https://vercel.com
   - 登录您的账户（支持 GitHub/GitLab/Bitbucket）

2. **导入项目**
   - 点击 "Add New Project"
   - 选择 "Import Git Repository"
   - 选择您的 NvwaX 仓库

3. **配置项目**
   ```
   Framework Preset: Next.js
   Root Directory: packages/nvwax-web
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

4. **配置环境变量**
   
   在 "Environment Variables" 部分添加：
   
   | 变量名 | 值 | 说明 |
   |--------|-----|------|
   | `NEXT_PUBLIC_API_URL` | `https://your-backend-url.com` | 后端 API 地址 |

   **示例**：
   ```
   NEXT_PUBLIC_API_URL=https://nvwax-api.railway.app
   ```

5. **部署**
   - 点击 "Deploy"
   - 等待构建完成（约 2-5 分钟）
   - 获取分配的域名（例如: `nvwax-web.vercel.app`）

#### 方法 B: 使用 Vercel CLI

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录 Vercel
vercel login

# 3. 进入前端目录
cd packages/nvwax-web

# 4. 部署（首次）
vercel --project-name nvwax-web

# 5. 设置环境变量
vercel env add NEXT_PUBLIC_API_URL production
# 输入您的后端 API URL

# 6. 重新部署
vercel --prod
```

### 步骤 3: 配置自定义域名（可选）

1. 在 Vercel Dashboard 中进入项目设置
2. 选择 "Domains"
3. 添加您的域名（例如: `app.nvwax.com`）
4. 按照提示配置 DNS 记录

---

## 🔧 方式二：通过 GitHub Actions 自动部署

### 创建 GitHub Actions 工作流

创建文件 `.github/workflows/deploy-vercel.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
    paths:
      - 'packages/nvwax-web/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
        
      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: packages/nvwax-web
        
      - name: Build Project Artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: packages/nvwax-web
        
      - name: Deploy Project Artifacts to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: packages/nvwax-web
```

### 配置 GitHub Secrets

1. 在 GitHub 仓库设置中，进入 "Settings" > "Secrets and variables" > "Actions"
2. 添加新 secret:
   - Name: `VERCEL_TOKEN`
   - Value: 从 Vercel Dashboard 获取（Settings > Tokens）

---

## ⚙️ 环境变量配置

### 必需的环境变量

```env
# 后端 API 地址（必须配置）
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

### 可选的环境变量

```env
# Google Analytics ID（如果使用）
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Sentry DSN（错误追踪）
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

# 其他第三方服务配置
NEXT_PUBLIC_STRIPE_KEY=pk_test_xxx
```

### 如何在 Vercel 中设置

1. **通过 Dashboard**:
   - 进入项目 > Settings > Environment Variables
   - 添加变量并选择环境（Production/Preview/Development）

2. **通过 CLI**:
   ```bash
   vercel env add NEXT_PUBLIC_API_URL production
   vercel env add NEXT_PUBLIC_API_URL preview
   vercel env add NEXT_PUBLIC_API_URL development
   ```

3. **通过 vercel.json**:
   ```json
   {
     "env": {
       "NEXT_PUBLIC_API_URL": "@next_public_api_url"
     }
   }
   ```

---

## 🔍 部署后验证

### 1. 检查构建日志

在 Vercel Dashboard 中查看部署日志，确保：
- ✅ 构建成功
- ✅ 没有 TypeScript 错误
- ✅ 所有页面生成成功

### 2. 测试 API 连接

访问您的 Vercel 部署地址，测试：
- 首页加载
- 登录/注册功能
- API 调用是否正常

### 3. 检查浏览器控制台

打开浏览器开发者工具，检查：
- 没有 CORS 错误
- API 请求成功
- 没有 404 错误

---

## 🐛 常见问题排查

### Q1: 构建失败 - "Module not found"

**原因**: 依赖未正确安装

**解决方案**:
```bash
# 在本地测试构建
cd packages/nvwax-web
npm install
npm run build
```

### Q2: API 请求失败 - CORS 错误

**原因**: 后端未配置 CORS

**解决方案**:
在后端代码中添加 CORS 配置：

```typescript
// packages/nvwax-server/src/app.ts
import cors from 'cors';

app.use(cors({
  origin: ['https://nvwax-web.vercel.app', 'https://your-domain.com'],
  credentials: true
}));
```

### Q3: 环境变量未生效

**原因**: 环境变量未正确配置或需要重新部署

**解决方案**:
1. 检查 Vercel Dashboard 中的环境变量
2. 触发新的部署（推送空提交或手动重新部署）
3. 清除浏览器缓存

### Q4: 图片加载失败

**原因**: Next.js Image 组件需要配置允许的域名

**解决方案**:
在 `next.config.ts` 中添加：

```typescript
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};
```

### Q5: 路由 404

**原因**: Next.js 动态路由问题

**解决方案**:
确保所有动态路由页面存在：
- `app/projects/[projectId]/page.tsx`
- `app/bounties/[id]/page.tsx`
- 等等

---

## 🎯 优化建议

### 1. 启用增量静态再生成 (ISR)

对于不经常变化的页面，使用 ISR：

```typescript
export const revalidate = 3600; // 每小时重新生成
```

### 2. 配置 Edge Functions

对于需要低延迟的页面：

```typescript
export const runtime = 'edge';
```

### 3. 优化图片

使用 Next.js Image 组件：

```tsx
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={100}
  priority
/>
```

### 4. 添加分析

在 Vercel Dashboard 中启用：
- Web Analytics
- Speed Insights

---

## 📊 监控和维护

### 1. 设置告警

在 Vercel Dashboard 中：
- 启用部署失败通知
- 配置性能告警

### 2. 查看分析

- 访问量统计
- 性能指标
- 错误日志

### 3. 定期更新

```bash
# 更新依赖
cd packages/nvwax-web
npm update

# 测试构建
npm run build

# 推送到 Git 触发自动部署
git add .
git commit -m "Update dependencies"
git push
```

---

## 💰 成本估算

### Vercel Hobby Plan（免费）

- ✅ 个人项目
- ✅ 无限部署
- ✅ 自动 HTTPS
- ✅ 全球 CDN
- ⚠️ 每月 100GB 带宽限制
- ⚠️ 无团队协作

### Vercel Pro Plan（$20/月）

- ✅ 商业项目
- ✅ 更高带宽限制
- ✅ 团队协作
- ✅ 优先支持

**对于大多数个人项目，免费计划足够使用。**

---

## 🔗 相关资源

- [Vercel 官方文档](https://vercel.com/docs)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)
- [Vercel CLI 文档](https://vercel.com/docs/cli)

---

## ✅ 部署检查清单

部署前确认：

- [ ] 后端 API 已部署并可访问
- [ ] `NEXT_PUBLIC_API_URL` 已正确配置
- [ ] 本地构建测试通过 (`npm run build`)
- [ ] 所有环境变量已设置
- [ ] CORS 已在后端配置
- [ ] 自定义域名已配置（如需要）

部署后验证：

- [ ] 网站可正常访问
- [ ] 所有页面加载正常
- [ ] API 调用成功
- [ ] 登录/注册功能正常
- [ ] 移动端响应式正常
- [ ] 性能指标良好

---

**最后更新**: 2026-04-26  
**适用版本**: NvwaX v1.3.0
