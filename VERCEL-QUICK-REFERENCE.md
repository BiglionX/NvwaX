# NvwaX Vercel 部署快速参考

> ⚡ 5 分钟快速部署指南

---

## 🎯 架构概览

```
前端 (Vercel) → 后端 API (Railway) → 数据库 (PostgreSQL)
```

---

## 📋 前置条件

- [ ] GitHub 账户
- [ ] Vercel 账户（免费注册）
- [ ] Railway 账户（$5 免费信用额度）
- [ ] 代码已推送到 GitHub

---

## 🚀 快速部署步骤

### 第 1 步：部署后端到 Railway（5 分钟）

1. **访问 Railway**
   ```
   https://railway.app
   ```

2. **创建 PostgreSQL 数据库**
   - 点击 "New Project"
   - 选择 "Database" > "PostgreSQL"
   - 复制 `DATABASE_URL`

3. **部署后端服务**
   - 点击 "+ New" > "GitHub Repo"
   - 选择您的仓库
   - Root Directory: `packages/nvwax-server`

4. **配置环境变量**
   ```env
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=<从步骤2复制>
   JWT_SECRET=<运行命令生成>
   ```

   生成 JWT_SECRET:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

5. **获取 API URL**
   ```
   https://your-app.up.railway.app
   ```

### 第 2 步：部署前端到 Vercel（3 分钟）

1. **安装 Vercel CLI**（可选）
   ```bash
   npm install -g vercel
   ```

2. **部署**
   ```bash
   cd packages/nvwax-web
   vercel --project-name nvwax-web
   ```

3. **设置环境变量**
   ```bash
   vercel env add NEXT_PUBLIC_API_URL production
   # 输入 Railway API URL
   ```

4. **生产环境部署**
   ```bash
   vercel --prod
   ```

### 第 3 步：配置 CORS（2 分钟）

在后端添加前端域名到 CORS 配置：

```typescript
// packages/nvwax-server/src/app.ts
const corsOptions = {
  origin: [
    'https://nvwax-web.vercel.app',  // 您的 Vercel 域名
    'http://localhost:3000'
  ]
};
```

重新部署后端。

---

## ✅ 验证部署

### 测试清单

- [ ] 访问 Vercel 域名
- [ ] 首页加载正常
- [ ] 注册新用户
- [ ] 登录功能正常
- [ ] API 调用成功（检查浏览器控制台）

### 健康检查

```bash
# 测试后端 API
curl https://your-api.railway.app/api/health

# 应该返回
{
  "status": "ok",
  "timestamp": "...",
  "uptime": 123.456
}
```

---

## 🔧 常用命令

### Vercel

```bash
# 查看部署状态
vercel ls

# 查看日志
vercel logs

# 添加环境变量
vercel env add KEY production

# 列出环境变量
vercel env ls

# 删除部署
vercel rm <deployment-url>
```

### Railway

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 查看日志
railway logs

# 打开 Dashboard
railway open
```

---

## 🐛 常见问题

### Q: CORS 错误？

**解决**: 
1. 检查后端 CORS 配置包含前端域名
2. 重新部署后端
3. 清除浏览器缓存

### Q: 环境变量未生效？

**解决**:
1. 检查 Vercel Dashboard 中的变量
2. 触发新部署（推送空提交）
3. 清除浏览器缓存

### Q: 构建失败？

**解决**:
```bash
# 本地测试构建
cd packages/nvwax-web
npm run build

# 查看错误并修复
```

---

## 💰 成本

| 服务 | 费用 |
|------|------|
| Vercel Hobby | $0/月 |
| Railway Starter | $5/月（含信用额度） |
| **总计** | **~$0-5/月** |

---

## 📚 详细文档

- [完整部署指南](./FULL-STACK-DEPLOYMENT-ARCHITECTURE.md)
- [Vercel 详细指南](./VERCEL-DEPLOYMENT-GUIDE.md)
- [后端部署指南](./BACKEND-DEPLOYMENT-GUIDE.md)

---

## 🆘 需要帮助？

1. 查看详细文档
2. 检查平台日志
3. 搜索 GitHub Issues
4. 联系技术支持

---

**提示**: 首次部署可能需要 10-15 分钟，包括学习和配置时间。后续更新只需推送代码即可自动部署！🚀
