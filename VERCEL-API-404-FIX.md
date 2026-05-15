# Vercel API 404 错误修复指南

## 🔍 问题描述

前端页面可以正常访问，但所有 API 请求返回 404 错误：

```
GET https://nvwax-production.up.railway.app/team-skills/marketplace?page=1&limit=30 404 (Not Found)
GET https://nvwax-production.up.railway.app/search/agents?q=ai+agent&page=1&limit=30 404 (Not Found)
```

**注意**：URL 中缺少 `/api` 前缀！

## 🎯 问题原因

前端 API 客户端配置为：
```typescript
// packages/nvwax-web/lib/api/client.ts
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  // ...
});
```

API 调用时使用相对路径：
```typescript
// packages/nvwax-web/lib/api/team-skills.ts
await apiClient.get('/team-skills/marketplace', { params });
```

**期望的完整 URL**：`https://your-backend.com/api/team-skills/marketplace`  
**实际的 URL**：`https://your-backend.com/team-skills/marketplace` ← 缺少 `/api`

这说明 `NEXT_PUBLIC_API_URL` 环境变量在 Vercel 上：
1. **未设置** - 使用了默认值（但默认值包含 `/api`）
2. **或设置错误** - 设置的值不包含 `/api` 前缀

## ✅ 解决方案

### 方案一：通过 Vercel Dashboard 设置环境变量（推荐）

1. **访问 Vercel Dashboard**
   ```
   https://vercel.com/dashboard
   ```

2. **选择您的项目**
   - 找到 `nvwax-web` 项目

3. **进入设置**
   - 点击 "Settings" 标签
   - 选择 "Environment Variables"

4. **添加/更新环境变量**
   
   **变量名**: `NEXT_PUBLIC_API_URL`
   
   **变量值**: 您的后端 API 基础 URL（**必须包含 `/api` 前缀**）
   
   示例：
   ```
   https://nvwax-production.up.railway.app/api
   ```
   
   或者如果您使用其他后端服务：
   ```
   https://your-backend-api.com/api
   ```

5. **选择环境**
   - ✅ Production
   - ✅ Preview（可选）
   - ✅ Development（可选）

6. **保存并重新部署**
   - 点击 "Save"
   - Vercel 会自动触发重新部署
   - 或者手动触发：Deployments > Redeploy

### 方案二：使用 Vercel CLI

```bash
# 进入前端目录
cd packages/nvwax-web

# 设置生产环境变量
vercel env add NEXT_PUBLIC_API_URL production

# 输入值（注意：必须包含 /api）
# https://nvwax-production.up.railway.app/api

# 重新部署
vercel --prod
```

### 方案三：检查 Railway 后端是否正常运行

在设置环境变量之前，先确认后端 API 是否正常：

```bash
# 测试健康检查端点
curl https://nvwax-production.up.railway.app/api/health

# 应该返回类似：
{
  "status": "ok",
  "timestamp": "2026-04-28T...",
  "uptime": 123.456
}
```

如果健康检查也返回 404，说明：
1. 后端未正确部署
2. 或路由配置有问题

## 🔧 验证修复

### 1. 检查环境变量是否正确设置

在 Vercel Dashboard 中：
- Settings > Environment Variables
- 确认 `NEXT_PUBLIC_API_URL` 的值包含 `/api` 前缀

### 2. 清除浏览器缓存

```
Ctrl + Shift + Delete（Windows）
Cmd + Shift + Delete（Mac）
```

或者使用无痕模式测试。

### 3. 测试 API 请求

打开浏览器开发者工具（F12）：
- Network 标签
- 刷新页面
- 查看 API 请求的完整 URL

**正确的 URL 应该是**：
```
https://nvwax-production.up.railway.app/api/team-skills/marketplace?page=1&limit=30
https://nvwax-production.up.railway.app/api/search/agents?q=ai+agent&page=1&limit=30
```

### 4. 检查控制台

Console 标签应该没有 404 错误。

## 📋 常见错误

### ❌ 错误配置示例

```env
# 错误 1: 缺少 /api 前缀
NEXT_PUBLIC_API_URL=https://nvwax-production.up.railway.app

# 错误 2: 末尾有斜杠
NEXT_PUBLIC_API_URL=https://nvwax-production.up.railway.app/api/

# 错误 3: 完全未设置（会使用 localhost）
# （Vercel 上没有这个变量）
```

### ✅ 正确配置示例

```env
# 正确：包含 /api 前缀，无末尾斜杠
NEXT_PUBLIC_API_URL=https://nvwax-production.up.railway.app/api
```

## 🚀 完整的部署检查清单

### 后端部署（Railway）

- [ ] 后端代码已推送到 GitHub
- [ ] Railway 项目已创建
- [ ] PostgreSQL 数据库已配置
- [ ] 环境变量已设置：
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=3001`
  - [ ] `DATABASE_URL=<postgresql_url>`
  - [ ] `JWT_SECRET=<secret>`
- [ ] 健康检查端点可访问：`https://your-api.railway.app/api/health`

### 前端部署（Vercel）

- [ ] 前端代码已推送到 GitHub
- [ ] Vercel 项目 Root Directory 设置为 `packages/nvwax-web`
- [ ] 环境变量已设置：
  - [ ] `NEXT_PUBLIC_API_URL=https://your-api.railway.app/api` ← **关键！**
- [ ] 构建成功
- [ ] 首页可访问
- [ ] API 请求正常（无 404 错误）

## 🔍 故障排查

### Q1: 设置了环境变量但仍然 404

**可能原因**：
1. 环境变量未应用到当前部署
2. 浏览器缓存了旧配置

**解决方案**：
```bash
# 1. 在 Vercel Dashboard 中手动重新部署
Deployments > Latest Deployment > Redeploy

# 2. 清除浏览器缓存或使用无痕模式

# 3. 检查构建日志，确认环境变量已加载
```

### Q2: 后端 API 也返回 404

**可能原因**：
1. 后端未正确部署
2. 路由配置错误
3. 端口配置错误

**解决方案**：
```bash
# 1. 检查 Railway 日志
railway logs

# 2. 测试健康检查
curl https://your-api.railway.app/api/health

# 3. 检查后端路由配置
# packages/nvwax-server/src/routes/index.ts
# 确认有：router.use('/team-skills', teamSkillRouter);
```

### Q3: CORS 错误

如果看到 CORS 错误，需要在后端配置允许前端域名：

```typescript
// packages/nvwax-server/src/app.ts
import cors from 'cors';

app.use(cors({
  origin: [
    'https://nvwax-web.vercel.app',  // 您的 Vercel 域名
    'http://localhost:3000'
  ],
  credentials: true
}));
```

## 📞 需要更多帮助？

如果以上步骤都无法解决问题，请提供：

1. **Vercel 项目名称**
2. **Railway 项目名称**
3. **浏览器控制台截图**（显示完整的错误信息）
4. **Network 标签截图**（显示失败的 API 请求）
5. **Vercel 环境变量截图**（隐藏敏感信息）
6. **Railway 日志**（最后 50 行）

---

**最后更新**: 2026-04-28  
**适用版本**: NvwaX v1.3.0
