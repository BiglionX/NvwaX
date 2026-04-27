# 🚀 悬赏系统 - 生产环境部署指南

**版本**: 1.0  
**更新日期**: 2026-04-25

---

## 📋 部署前检查清单

### 环境要求

- ✅ Node.js 18+ 
- ✅ PostgreSQL 14+
- ✅ npm 或 pnpm
- ✅ 至少 2GB 内存
- ✅ 稳定的网络连接

### 配置文件

- [ ] `.env.production` - 环境变量
- [ ] `docker-compose.prod.yml` - Docker 配置
- [ ] `nginx.conf` - Nginx 配置（可选）
- [ ] SSL 证书（推荐）

---

## 🔧 环境变量配置

### 创建生产环境文件

在项目根目录创建 `.env.production`:

```bash
# 服务器配置
NODE_ENV=production
PORT=3001

# 数据库配置（使用 Neon PostgreSQL）
DATABASE_URL=postgresql://user:password@host:5432/nvwax?sslmode=require

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS 配置
CORS_ORIGIN=https://your-domain.com

# 前端配置
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

### 安全注意事项

⚠️ **重要**:
- 不要将 `.env.production` 提交到 Git
- 使用强密码和密钥
- 定期更换 JWT_SECRET
- 启用数据库 SSL 连接

---

## 🐳 Docker 部署（推荐）

### 1. 创建生产 Docker Compose

创建 `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  # 后端服务
  nvwax-server:
    build:
      context: .
      dockerfile: Dockerfile.server
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    ports:
      - "3001:3001"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # 前端服务
  nvwax-web:
    build:
      context: .
      dockerfile: Dockerfile.web
    environment:
      - NEXT_PUBLIC_API_URL=https://api.your-domain.com
    ports:
      - "3000:3000"
    depends_on:
      - nvwax-server
    restart: unless-stopped

  # 工作流引擎（可选）
  skillhub-workflow:
    build:
      context: ./packages/skillhub-workflow
    ports:
      - "3002:3002"
    restart: unless-stopped

networks:
  default:
    driver: bridge
```

### 2. 创建后端 Dockerfile

创建 `Dockerfile.server`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package.json
COPY packages/nvwax-server/package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY packages/nvwax-server/src ./src
COPY packages/nvwax-server/tsconfig.json ./

# 构建
RUN npm run build

# 生产镜像
FROM node:18-alpine

WORKDIR /app

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# 启动
CMD ["node", "dist/index.js"]
```

### 3. 创建前端 Dockerfile

创建 `Dockerfile.web`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package.json
COPY packages/nvwax-web/package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY packages/nvwax-web ./

# 构建
RUN npm run build

# 生产镜像
FROM node:18-alpine

WORKDIR /app

# 复制构建产物
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.js ./

# 暴露端口
EXPOSE 3000

# 启动
CMD ["npm", "start"]
```

### 4. 启动服务

```bash
# 构建并启动
docker-compose -f docker-compose.prod.yml up -d

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 停止服务
docker-compose -f docker-compose.prod.yml down
```

---

## 🌐 Nginx 反向代理（推荐）

### 创建 Nginx 配置

创建 `nginx.conf`:

```nginx
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    # 日志
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # 上游服务器
    upstream backend {
        server nvwax-server:3001;
    }

    upstream frontend {
        server nvwax-web:3000;
    }

    # HTTPS 重定向
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS 配置
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL 证书
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # 前端
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # 后端 API
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket 支持
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        # 静态文件缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### 启动 Nginx

```bash
# 测试配置
nginx -t

# 重启 Nginx
nginx -s reload
```

---

## 🔒 SSL 证书配置

### 使用 Let's Encrypt（免费）

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 手动配置证书

```bash
# 创建 SSL 目录
mkdir -p /etc/nginx/ssl

# 复制证书文件
cp cert.pem /etc/nginx/ssl/
cp key.pem /etc/nginx/ssl/

# 设置权限
chmod 600 /etc/nginx/ssl/*
```

---

## 📊 性能优化

### 1. 数据库优化

**添加索引**:
```sql
-- 搜索优化
CREATE INDEX idx_bounties_title_search ON bounties USING gin(to_tsvector('simple', title));
CREATE INDEX idx_bounties_description_search ON bounties USING gin(to_tsvector('simple', description));

-- 状态过滤优化
CREATE INDEX idx_bounties_status ON bounties(status);

-- 时间排序优化
CREATE INDEX idx_bounties_created_at ON bounties(created_at DESC);
```

**连接池配置**:
```typescript
// 生产环境连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

### 2. 缓存策略

**Redis 缓存（可选）**:

```bash
# 安装 Redis
docker run -d --name redis -p 6379:6379 redis:alpine
```

```typescript
// 缓存热门搜索
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

async function getPopularSearches() {
  const cached = await redis.get('popular-searches');
  if (cached) return JSON.parse(cached);
  
  const data = await calculatePopularSearches();
  await redis.setex('popular-searches', 300, JSON.stringify(data)); // 5分钟
  return data;
}
```

---

### 3. CDN 配置

**静态资源 CDN**:

```javascript
// next.config.js
module.exports = {
  assetPrefix: process.env.NODE_ENV === 'production' 
    ? 'https://cdn.your-domain.com' 
    : '',
};
```

---

## 🛡️ 安全加固

### 1. 防火墙配置

```bash
# 只开放必要端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. 速率限制

**Nginx 速率限制**:
```nginx
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    server {
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
        }
    }
}
```

### 3. CORS 配置

```typescript
// 后端 CORS 配置
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

## 📈 监控和日志

### 1. 应用监控

**PM2 进程管理**:

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start packages/nvwax-server/dist/index.js --name "nvwax-server"
pm2 start packages/nvwax-web/.next/standalone/server.js --name "nvwax-web"

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 开机自启
pm2 startup
pm2 save
```

---

### 2. 日志收集

**Winston 日志**:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

---

### 3. 健康检查

**添加健康检查端点**:

```typescript
// 后端
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
```

---

## 🔄 CI/CD 自动化部署

### GitHub Actions 示例

创建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: |
          cd packages/nvwax-server && npm run build
          cd ../nvwax-web && npm run build
          
      - name: Deploy to server
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          source: "."
          target: "/opt/nvwax"
          
      - name: Restart services
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/nvwax
            docker-compose -f docker-compose.prod.yml up -d
            docker system prune -f
```

---

## 📝 部署检查清单

### 部署前

- [ ] 代码已合并到 main 分支
- [ ] 所有测试通过
- [ ] 环境变量已配置
- [ ] 数据库迁移已完成
- [ ] SSL 证书已配置
- [ ] 域名 DNS 已解析

### 部署中

- [ ] 拉取最新代码
- [ ] 安装依赖
- [ ] 构建项目
- [ ] 运行数据库迁移
- [ ] 重启服务
- [ ] 检查日志

### 部署后

- [ ] 访问网站验证功能
- [ ] 测试 API 端点
- [ ] 检查错误日志
- [ ] 监控性能指标
- [ ] 备份数据库

---

## 🆘 故障排除

### 常见问题

**1. 服务无法启动**
```bash
# 检查日志
docker-compose logs -f

# 检查端口占用
netstat -tulpn | grep :3001
```

**2. 数据库连接失败**
```bash
# 测试连接
psql $DATABASE_URL

# 检查防火墙
sudo ufw status
```

**3. 内存不足**
```bash
# 查看内存使用
free -h

# 增加 swap
sudo fallocate -l 2G /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

**4. 性能问题**
```bash
# 查看 CPU 使用
top

# 查看磁盘 IO
iostat -x 1

# 查看网络
iftop
```

---

## 📞 技术支持

遇到问题？

- 📧 邮件: support@nvwax.com
- 📖 文档: https://docs.nvwax.com
- 💬 Discord: https://discord.gg/nvwax

---

**祝部署顺利！🚀**
