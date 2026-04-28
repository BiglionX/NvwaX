# Vercel 部署 404 问题修复指南

## 🔍 问题描述

Vercel 部署后访问网站显示 404 错误，浏览器控制台显示：
```
/favicon.ico:1 Failed to load resource: the server responded with a status of 404 ()
(索引):1 Failed to load resource: the server responded with a status of 404 ()
```

## ✅ 已应用的修复

### 1. 修复 next.config.ts

**问题**: API rewrite 配置在生产环境指向 `localhost:3001`，导致构建失败或运行时错误。

**修复**: 
```typescript
// packages/nvwax-web/next.config.ts
async rewrites() {
  // 只在开发环境使用 API 代理
  if (process.env.NODE_ENV === 'development') {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*'
      }
    ];
  }
  return [];
}
```

### 2. 添加图片远程模式配置

**修复**:
```typescript
images: {
  formats: ['image/avif', 'image/webp'],
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**',
    },
  ],
}
```

### 3. 简化 vercel.json 配置

**修复**:
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "outputDirectory": ".next"
}
```

## 🛠️ 手动修复步骤

如果您已经部署了项目，请按以下步骤操作：

### 方案一：通过 Vercel Dashboard 重新配置（推荐）

1. **删除现有部署**
   - 访问 https://vercel.com/dashboard
   - 找到您的项目
   - 点击 "Settings" > "General" > "Delete Project"

2. **重新导入项目**
   - 点击 "Add New Project"
   - 选择您的 GitHub 仓库
   - **关键配置**：
     ```
     Framework Preset: Next.js
     Root Directory: packages/nvwax-web  ← 必须设置！
     Build Command: npm run build
     Output Directory: .next
     Install Command: npm install
     ```

3. **配置环境变量**
   - 在 "Environment Variables" 部分添加：
     ```
     NEXT_PUBLIC_API_URL=https://your-backend-api.com
     ```
   - ⚠️ 如果没有后端 API，可以先设置为空或占位符

4. **部署**
   - 点击 "Deploy"
   - 等待构建完成（2-5 分钟）

### 方案二：使用 Vercel CLI 重新部署

```bash
# 1. 进入前端目录
cd packages/nvwax-web

# 2. 删除现有项目（如果需要）
vercel rm <your-project-name>

# 3. 重新部署
vercel --project-name nvwax-web

# 4. 设置环境变量
vercel env add NEXT_PUBLIC_API_URL production
# 输入您的后端 API URL，例如：https://api.example.com

# 5. 生产部署
vercel --prod
```

### 方案三：推送代码触发自动重新部署

如果您已将修复后的代码推送到 GitHub：

1. 访问 Vercel Dashboard
2. 找到您的项目
3. 点击 "Deployments" 标签
4. 点击最新的部署
5. 如果部署失败，点击 "Redeploy"

## 🔧 验证修复

### 1. 检查构建日志

在 Vercel Dashboard 中：
- 进入项目 > Deployments
- 点击最新部署
- 查看 "Build Logs"

**应该看到**：
```
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages (X/X)
✓ Finalizing page optimization
```

**不应该看到**：
```
✗ Failed to compile
✗ Error occurred prerendering page
```

### 2. 测试访问

访问您的 Vercel 域名，应该看到：
- ✅ 首页正常加载
- ✅ 没有 404 错误
- ✅ favicon.ico 正确加载（或使用默认图标）

### 3. 检查浏览器控制台

打开浏览器开发者工具（F12）：
- Console 标签：应该没有红色错误
- Network 标签：所有请求应该返回 200 或 304

## 📋 常见问题排查

### Q1: 仍然显示 404

**可能原因**：
1. Root Directory 未正确设置为 `packages/nvwax-web`
2. 构建失败但未注意到
3. 环境变量配置错误

**解决方案**：
```bash
# 本地测试构建
cd packages/nvwax-web
npm install
npm run build

# 如果本地构建成功，检查 Vercel 配置
# 确保 Root Directory 设置为 packages/nvwax-web
```

### Q2: API 请求失败

**可能原因**：
1. 后端 API 未部署
2. `NEXT_PUBLIC_API_URL` 未配置或配置错误
3. CORS 未配置

**解决方案**：
1. 先部署后端 API（Railway/Render）
2. 在 Vercel 中设置正确的 `NEXT_PUBLIC_API_URL`
3. 在后端配置 CORS 允许前端域名

### Q3: 页面加载但样式丢失

**可能原因**：
Tailwind CSS 未正确构建

**解决方案**：
```bash
# 检查是否安装了 Tailwind
cd packages/nvwax-web
npm list tailwindcss

# 重新安装依赖
npm install

# 重新构建
npm run build
```

### Q4: favicon.ico 404

**说明**：
这不是严重问题。Next.js 会自动处理 favicon。

**可选修复**：
在 `app/layout.tsx` 中已配置：
```typescript
export const metadata: Metadata = {
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
    ],
  },
};
```

确保 `public/logo.png` 文件存在。

## 🎯 完整的部署检查清单

部署前：
- [ ] 代码已推送到 GitHub
- [ ] 本地构建测试通过 (`npm run build`)
- [ ] 后端 API 已部署（如果需要）
- [ ] 获取后端 API URL

Vercel 配置：
- [ ] Root Directory: `packages/nvwax-web`
- [ ] Framework: Next.js
- [ ] Build Command: `npm run build`
- [ ] Install Command: `npm install`
- [ ] Environment Variables: `NEXT_PUBLIC_API_URL` 已设置

部署后：
- [ ] 构建成功（查看日志）
- [ ] 首页可访问
- [ ] 无 404 错误
- [ ] API 调用正常（如有后端）
- [ ] 移动端响应式正常

## 📞 需要更多帮助？

如果以上步骤都无法解决问题：

1. **查看详细日志**
   ```bash
   vercel logs
   ```

2. **检查 Vercel Dashboard**
   - 查看 Build Logs
   - 查看 Function Logs

3. **提供以下信息寻求帮助**：
   - Vercel 项目名称
   - 构建日志截图
   - 浏览器控制台错误截图
   - `next.config.ts` 内容
   - `package.json` 内容

## 🔗 相关资源

- [Vercel Next.js 部署文档](https://vercel.com/docs/frameworks/nextjs)
- [Next.js 部署指南](https://nextjs.org/docs/app/building-your-application/deploying)
- [Monorepo 部署最佳实践](https://vercel.com/guides/monorepo-best-practices)

---

**最后更新**: 2026-04-28  
**适用版本**: NvwaX v1.3.0
