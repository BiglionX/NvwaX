# NvwaX 完整部署架构指南

本文档详细说明如何将 NvwaX 全栈应用部署到云平台，采用最佳实践架构。

---

## 🏗️ 推荐架构

```
┌─────────────────────────────────────────────────────┐
│                   用户浏览器                          │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ HTTPS
                   ▼
┌─────────────────────────────────────────────────────┐
│              Vercel (前端)                           │
│  - Next.js 应用                                      │
│  - 全球 CDN                                          │
│  - 自动 HTTPS                                        │
│  - 域名: nvwax-web.vercel.app                        │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ API 请求
                   ▼
┌─────────────────────────────────────────────────────┐
│         Railway / Render (后端 API)                  │
│  - Express.js 服务器                                 │
│  - RESTful API                                       │
│  - JWT 认证                                          │
│  - 域名: nvwax-api.railway.app                       │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ 数据库连接
                   ▼
┌─────────────────────────────────────────────────────┐
│      Railway PostgreSQL / Supabase (数据库)          │
│  - PostgreSQL 16                                     │
│  - 自动备份                                          │
│  - 高可用                                            │
└─────────────────────────────────────────────────────┘
```

---

## 📋 部署步骤总览

### 阶段 1: 准备阶段

1. ✅ 代码清理和构建验证（已完成）
2. ⏳ 选择部署平台
3. ⏳ 配置环境变量
4. ⏳ 设置版本控制

### 阶段 2: 后端部署

1. ⏳ 部署 PostgreSQL 数据库
2. ⏳ 部署后端 API 服务
3. ⏳ 运行数据库迁移
4. ⏳ 测试 API 端点

### 阶段 3: 前端部署

1. ⏳ 配置 Vercel 项目
2. ⏳ 设置环境变量
3. ⏳ 部署前端应用
4. ⏳ 配置自定义域名（可选）

### 阶段 4: 验证和优化

1. ⏳ 端到端测试
2. ⏳ 性能优化
3. ⏳ 监控配置
4. ⏳ 安全加固

---

## 🚀 快速开始（使用 Railway + Vercel）

这是最简单、最快速的部署方案，适合个人项目和小型应用。

### 前置条件

- [ ] GitHub 账户
- [ ] Vercel 账户（免费）
- [ ] Railway 账户（有免费额度）
- [ ] Git 已安装
- [ ] Node.js 20+ 已安装

### 步骤 1: 部署后端到 Railway

#### 1.1 创建 Railway 项目

```bash
# 访问 https://railway.app
# 点击 "New Project" > "Deploy from GitHub repo"
# 选择您的 NvwaX 仓库
```

#### 1.2 添加 PostgreSQL 数据库

在 Railway Dashboard:
1. 点击 "+ New"
2. 选择 "Database" > "PostgreSQL"
3. 等待数据库创建完成
4. 复制 DATABASE_URL（点击变量图标查看）

#### 1.3 配置后端服务

1. 点击 "+ New" > "GitHub Repo"
2. 选择您的仓库
3. 设置 Root Directory: `packages/nvwax-server`
4. Railway 会自动检测 Node.js 项目

#### 1.4 设置环境变量

在 Railway Dashboard 的后端服务中，添加以下变量：

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=<从 PostgreSQL 服务复制的连接字符串>
JWT_SECRET=<生成一个至少32字符的随机字符串>
REDIS_URL=redis://default:password@host:6379  # 可选
```

**生成 JWT_SECRET**:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### 1.5 运行数据库迁移

选项 A: 通过 Railway Shell
```bash
# 在 Railway Dashboard 中打开 Shell
npm run db:migrate
```

选项 B: 在代码中自动执行
修改 `packages/nvwax-server/src/index.ts`:

```typescript
import { runMigrations } from './database/migrations';

async function start() {
  try {
    // 自动运行迁移
    await runMigrations();
    console.log('Database migrations completed');
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
```

#### 1.6 获取后端 API URL

Railway 会提供一个公共 URL，例如：
```
https://nvwax-server-production.up.railway.app
```

测试 API：
```bash
curl https://nvwax-server-production.up.railway.app/api/health
```

应该返回：
```json
{
  "status": "ok",
  "timestamp": "2026-04-26T...",
  "uptime": 123.456,
  "environment": "production"
}
```

### 步骤 2: 部署前端到 Vercel

#### 2.1 安装 Vercel CLI（可选）

```bash
npm install -g vercel
```

#### 2.2 通过 Vercel Dashboard 部署

1. **访问 Vercel**
   - 打开 https://vercel.com
   - 登录并点击 "Add New Project"

2. **导入仓库**
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
   
   添加以下环境变量：
   
   | 变量名 | 值 | 环境 |
   |--------|-----|------|
   | `NEXT_PUBLIC_API_URL` | `https://nvwax-server-production.up.railway.app` | Production |

5. **部署**
   - 点击 "Deploy"
   - 等待 2-5 分钟
   - 获取域名，例如: `nvwax-web.vercel.app`

#### 2.3 或通过 CLI 部署

```bash
cd packages/nvwax-web

# 首次部署
vercel --project-name nvwax-web

# 设置环境变量
vercel env add NEXT_PUBLIC_API_URL production
# 输入您的 Railway API URL

# 生产环境部署
vercel --prod
```

### 步骤 3: 配置 CORS

在后端代码中配置允许前端域名：

```typescript
// packages/nvwax-server/src/app.ts
import cors from 'cors';

const corsOptions = {
  origin: [
    'https://nvwax-web.vercel.app',  // Vercel 域名
    'http://localhost:3000',          // 本地开发
    process.env.FRONTEND_URL          // 可从环境变量读取
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

添加环境变量到 Railway：
```env
FRONTEND_URL=https://nvwax-web.vercel.app
```

### 步骤 4: 端到端测试

1. **访问前端**
   ```
   https://nvwax-web.vercel.app
   ```

2. **测试功能**
   - [ ] 首页加载正常
   - [ ] 注册新用户
   - [ ] 登录功能
   - [ ] 创建项目
   - [ ] 浏览市场
   - [ ] API 调用成功

3. **检查浏览器控制台**
   - 无 CORS 错误
   - 无 404 错误
   - API 请求成功

---

## 🔧 高级配置

### 自定义域名

#### Vercel 自定义域名

1. 在 Vercel Dashboard 进入项目设置
2. 选择 "Domains"
3. 添加域名，例如: `app.nvwax.com`
4. 按照提示配置 DNS:
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```

#### Railway 自定义域名

1. 在 Railway Dashboard 进入服务设置
2. 选择 "Settings" > "Domains"
3. 添加域名，例如: `api.nvwax.com`
4. 配置 DNS:
   ```
   Type: CNAME
   Name: api
   Value: <Railway 提供的域名>
   ```

更新前端环境变量：
```env
NEXT_PUBLIC_API_URL=https://api.nvwax.com
```

### SSL/TLS 证书

- ✅ Vercel 自动提供 HTTPS
- ✅ Railway 自动提供 HTTPS
- 无需手动配置证书

### 环境变量管理

#### 开发环境 (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

#### 预览环境 (Vercel Preview)

```env
NEXT_PUBLIC_API_URL=https://nvwax-api-staging.railway.app
```

#### 生产环境 (Vercel Production)

```env
NEXT_PUBLIC_API_URL=https://api.nvwax.com
```

---

## 📊 监控和维护

### 1. 日志查看

#### Vercel 日志
```bash
vercel logs
```

或在 Dashboard 中查看实时日志。

#### Railway 日志
在 Railway Dashboard 中点击 "Deployments" > 查看实时日志。

### 2. 性能监控

#### Vercel Analytics
- 在 Dashboard 中启用 "Analytics"
- 跟踪页面加载时间
- 监控核心 Web 指标

#### Railway Metrics
- CPU 使用率
- 内存使用
- 磁盘空间
- 网络流量

### 3. 错误追踪

集成 Sentry:

```bash
# 前端
cd packages/nvwax-web
npm install @sentry/nextjs

# 后端
cd packages/nvwax-server
npm install @sentry/node
```

配置 Sentry:
```typescript
// packages/nvwax-web/sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

---

## 🔄 CI/CD 自动化

### GitHub Actions 工作流

创建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy Full Stack

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.message, '[backend]')
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm install
        working-directory: packages/nvwax-server
        
      - name: Run tests
        run: npm test
        working-directory: packages/nvwax-server
        
      - name: Build
        run: npm run build
        working-directory: packages/nvwax-server
        
      - name: Deploy to Railway
        uses: railwayapp/cli-action@v2
        with:
          railwayToken: ${{ secrets.RAILWAY_TOKEN }}
          command: up --service nvwax-server

  deploy-frontend:
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.message, '[frontend]')
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install Vercel CLI
        run: npm install -g vercel
        
      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: packages/nvwax-web
        
      - name: Build
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: packages/nvwax-web
        
      - name: Deploy
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: packages/nvwax-web
```

### 设置 GitHub Secrets

在 GitHub 仓库设置中添加：
- `RAILWAY_TOKEN`: Railway API Token
- `VERCEL_TOKEN`: Vercel API Token

获取 Token:
- Railway: Settings > Tokens
- Vercel: Settings > Tokens

---

## 🔒 安全最佳实践

### 1. 环境变量安全

- ✅ 永远不要将 `.env` 文件提交到 Git
- ✅ 使用平台的加密环境变量功能
- ✅ 定期轮换密钥

### 2. API 安全

```typescript
// 速率限制
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100,
  message: 'Too many requests'
});

app.use('/api/', apiLimiter);

// Helmet 安全头
import helmet from 'helmet';
app.use(helmet());
```

### 3. 数据库安全

- 使用强密码
- 限制数据库访问 IP
- 定期备份
- 启用 SSL 连接

### 4. HTTPS 强制

所有平台都自动提供 HTTPS，确保：
- 前端使用 `https://`
- API 使用 `https://`
- 不使用混合内容

---

## 💰 成本估算

### 方案一：完全免费（适合学习和小型项目）

- Vercel Hobby: **$0/月**
- Railway Starter: **$5/月**（含 $5 信用额度）
- PostgreSQL: **包含在 Railway 中**
- **总计: ~$0-5/月**

### 方案二：生产环境（推荐）

- Vercel Pro: **$20/月**
- Railway Pro: **$10/月**
- PostgreSQL (2GB): **$10/月**
- **总计: ~$40/月**

### 方案三：企业级

- Vercel Enterprise: **自定义**
- Railway Business: **自定义**
- 专用数据库: **$50+/月**
- **总计: $100+/月**

---

## ✅ 部署检查清单

### 部署前

- [ ] 代码已推送到 GitHub
- [ ] 所有包构建成功
- [ ] 本地测试通过
- [ ] 环境变量清单完成
- [ ] 数据库迁移脚本就绪

### 后端部署

- [ ] PostgreSQL 数据库创建
- [ ] 后端服务部署
- [ ] 环境变量配置
- [ ] 数据库迁移执行
- [ ] API 健康检查通过
- [ ] CORS 配置正确

### 前端部署

- [ ] Vercel 项目创建
- [ ] 环境变量配置
- [ ] 前端部署成功
- [ ] 网站可访问
- [ ] API 连接正常

### 部署后

- [ ] 端到端功能测试
- [ ] 移动端响应式测试
- [ ] 性能测试
- [ ] 安全扫描
- [ ] 监控配置
- [ ] 备份策略设置
- [ ] 文档更新

---

## 🐛 故障排查

### 问题 1: 前端无法连接后端

**症状**: CORS 错误或网络错误

**解决**:
1. 检查 `NEXT_PUBLIC_API_URL` 是否正确
2. 确认后端 CORS 配置包含前端域名
3. 检查浏览器控制台错误信息

### 问题 2: 数据库连接失败

**症状**: 500 错误，日志显示数据库连接错误

**解决**:
1. 检查 `DATABASE_URL` 格式
2. 确认 PostgreSQL 服务正在运行
3. 检查防火墙/网络设置

### 问题 3: 构建失败

**症状**: Vercel/Railway 构建失败

**解决**:
1. 查看构建日志
2. 本地运行 `npm run build` 测试
3. 检查依赖是否完整
4. 清除缓存重新部署

---

## 📞 获取帮助

- 📖 查看各平台官方文档
- 💬 GitHub Issues
- 📧 联系技术支持
- 👥 社区论坛

---

## 🔗 相关文档

- [VERCEL-DEPLOYMENT-GUIDE.md](./VERCEL-DEPLOYMENT-GUIDE.md) - Vercel 详细指南
- [BACKEND-DEPLOYMENT-GUIDE.md](./BACKEND-DEPLOYMENT-GUIDE.md) - 后端部署详细指南
- [DEPLOYMENT-PREPARATION-COMPLETE.md](./DEPLOYMENT-PREPARATION-COMPLETE.md) - 部署准备报告
- [ENV-CONFIGURATION-GUIDE.md](./ENV-CONFIGURATION-GUIDE.md) - 环境配置指南

---

**最后更新**: 2026-04-26  
**适用版本**: NvwaX v1.3.0  
**维护者**: NvwaX Team
