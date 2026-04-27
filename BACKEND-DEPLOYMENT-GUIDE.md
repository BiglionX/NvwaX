# NvwaX 后端部署指南

由于 Vercel 仅支持静态网站和 Serverless 函数，NvwaX 的后端（Express + PostgreSQL）需要部署在其他平台。

---

## 🎯 推荐的后端部署方案

### 方案对比

| 平台 | 优点 | 缺点 | 价格 |
|------|------|------|------|
| **Railway** | 简单易用、内置数据库、自动部署 | 免费额度有限 | $5/月起 |
| **Render** | 免费层级、易于配置 | 冷启动较慢 | 免费/$7/月起 |
| **Fly.io** | 全球分布、性能好 | 配置复杂 | 免费额度/$2.94/月起 |
| **Heroku** | 成熟稳定、生态丰富 | 无免费层 | $7/月起 |
| **DigitalOcean** | 性价比高、可控性强 | 需要手动配置 | $5/月起 |

---

## 🚀 方案一：Railway（最推荐）

### 优势
- ✅ 一键部署 PostgreSQL
- ✅ 自动从 GitHub 部署
- ✅ 简单的环境变量配置
- ✅ 良好的免费额度

### 部署步骤

#### 1. 准备项目

确保您的仓库结构清晰：
```
NvwaX/
├── packages/
│   ├── nvwax-server/    # 后端代码
│   └── nvwax-web/       # 前端代码
```

#### 2. 创建 Railway 项目

1. 访问 https://railway.app
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 授权并选择您的 NvwaX 仓库

#### 3. 配置服务

##### 添加 PostgreSQL 数据库

1. 点击 "+ New"
2. 选择 "Database" > "PostgreSQL"
3. Railway 会自动创建数据库并提供连接字符串

##### 配置后端服务

1. 点击 "+ New"
2. 选择 "GitHub Repo"
3. 选择您的仓库
4. 设置 Root Directory: `packages/nvwax-server`

#### 4. 配置环境变量

在 Railway Dashboard 中，为后端服务添加以下变量：

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=your-super-secret-jwt-key-here
REDIS_URL=redis://default:password@redis-host:6379
```

**获取 DATABASE_URL**:
- 点击 PostgreSQL 服务
- 复制 "Connection String"
- 格式: `postgresql://user:password@host:port/database`

#### 5. 配置构建和启动命令

Railway 会自动检测，但您可以手动设置：

```json
// packages/nvwax-server/package.json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts"
  }
}
```

#### 6. 运行数据库迁移

通过 Railway Shell 或本地执行：

```bash
# 连接到 Railway Shell
railway shell

# 运行迁移
npm run db:migrate
```

或者在代码中添加自动迁移：

```typescript
// packages/nvwax-server/src/index.ts
import { runMigrations } from './database/migrations';

async function start() {
  await runMigrations();
  // ... 启动服务器
}
```

#### 7. 获取 API URL

- Railway 会提供一个公共 URL
- 格式: `https://nvwax-server-production.up.railway.app`
- 将此 URL 用于前端的 `NEXT_PUBLIC_API_URL`

---

## 🚀 方案二：Render

### 优势
- ✅ 有免费层级
- ✅ 自动 HTTPS
- ✅ 简单的配置

### 部署步骤

#### 1. 创建 Web Service

1. 访问 https://render.com
2. 点击 "New +" > "Web Service"
3. 连接 GitHub 仓库
4. 配置服务：
   - Name: `nvwax-api`
   - Root Directory: `packages/nvwax-server`
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

#### 2. 创建 PostgreSQL 数据库

1. 点击 "New +" > "PostgreSQL"
2. 配置数据库名称和区域
3. 获取连接字符串

#### 3. 配置环境变量

在 Render Dashboard 中添加：

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your-secret-key
```

#### 4. 部署

- Render 会自动构建和部署
- 获取 API URL: `https://nvwax-api.onrender.com`

---

## 🚀 方案三：Fly.io

### 优势
- ✅ 全球边缘部署
- ✅ 良好的免费额度
- ✅ 高性能

### 部署步骤

#### 1. 安装 Fly CLI

```bash
# macOS
brew install flyctl

# Windows
scoop install flyctl

# Linux
curl -L https://fly.io/install.sh | sh
```

#### 2. 登录 Fly

```bash
fly auth login
```

#### 3. 初始化应用

```bash
cd packages/nvwax-server
fly launch
```

回答提示问题：
- App name: `nvwax-api`
- Region: 选择最近的区域
- Database: 选择 PostgreSQL

#### 4. 配置环境变量

```bash
fly secrets set JWT_SECRET=your-secret-key
fly secrets set NODE_ENV=production
```

#### 5. 部署

```bash
fly deploy
```

#### 6. 获取 URL

```bash
fly info
# 输出: https://nvwax-api.fly.dev
```

---

## 🔧 后端配置优化

### 1. 生产环境配置

创建 `packages/nvwax-server/.env.production`:

```env
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
ENABLE_CORS=true
CORS_ORIGINS=https://nvwax-web.vercel.app,https://your-domain.com
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. CORS 配置

确保后端正确配置 CORS：

```typescript
// packages/nvwax-server/src/app.ts
import cors from 'cors';

const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

### 3. 健康检查端点

```typescript
// packages/nvwax-server/src/routes/health.ts
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});
```

### 4. 错误处理

```typescript
// packages/nvwax-server/src/middleware/errorHandler.ts
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});
```

---

## 📊 数据库管理

### 使用 Prisma Migrate

```bash
# 生成迁移文件
npx prisma migrate dev --name init

# 应用迁移到生产环境
npx prisma migrate deploy
```

### 数据库备份策略

#### Railway 自动备份
- Railway 提供自动每日备份
- 可在 Dashboard 中恢复

#### 手动备份脚本

```bash
#!/bin/bash
# backup.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_$TIMESTAMP.sql"

pg_dump $DATABASE_URL > $BACKUP_FILE

# 上传到云存储（可选）
aws s3 cp $BACKUP_FILE s3://your-bucket/backups/

echo "Backup completed: $BACKUP_FILE"
```

---

## 🔒 安全配置

### 1. 环境变量加密

所有敏感信息都应通过平台的环境变量功能设置，不要硬编码。

### 2. HTTPS 强制

```typescript
// 在生产环境中强制 HTTPS
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

### 3. 速率限制

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 最多 100 次请求
  message: 'Too many requests, please try again later'
});

app.use('/api/', limiter);
```

### 4. Helmet 安全头

```typescript
import helmet from 'helmet';

app.use(helmet());
```

---

## 📈 监控和日志

### 1. 集成 Sentry

```bash
npm install @sentry/node
```

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});
```

### 2. 日志记录

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});
```

### 3. 性能监控

大多数平台（Railway、Render）都提供基本的性能指标：
- CPU 使用率
- 内存使用
- 响应时间
- 请求数量

---

## 🔄 CI/CD 自动化

### GitHub Actions 示例

```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'packages/nvwax-server/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
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
```

---

## 💰 成本估算

### Railway
- PostgreSQL: $5/月（含 1GB 存储）
- Backend Service: $5/月（基础配置）
- **总计**: ~$10/月

### Render
- PostgreSQL: 免费（90 天后过期）或 $7/月
- Web Service: 免费（有休眠）或 $7/月
- **总计**: 免费 - $14/月

### Fly.io
- PostgreSQL: 免费（1GB 存储）
- App: 免费额度内
- **总计**: 免费 - $5/月

---

## ✅ 部署检查清单

部署前：
- [ ] 后端代码已测试
- [ ] 数据库迁移脚本就绪
- [ ] 环境变量清单完成
- [ ] CORS 配置正确
- [ ] 健康检查端点可用

部署后：
- [ ] API 可访问
- [ ] 数据库连接成功
- [ ] 所有路由正常工作
- [ ] 错误处理正常
- [ ] 日志记录正常
- [ ] 性能指标合理

---

## 🔗 相关资源

- [Railway 文档](https://docs.railway.app)
- [Render 文档](https://render.com/docs)
- [Fly.io 文档](https://fly.io/docs)
- [Express 最佳实践](https://expressjs.com/en/advanced/best-practice-performance.html)

---

**最后更新**: 2026-04-26  
**适用版本**: NvwaX v1.3.0
