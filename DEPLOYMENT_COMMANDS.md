# 🚀 NvwaX 社交登录部署命令参考

本文档提供部署 NvwaX 社交登录功能的快速命令参考。

---

## 📋 部署流程概览

```
1. 配置环境变量
   ↓
2. 构建 Docker 镜像
   ↓
3. 运行数据库迁移
   ↓
4. 启动所有服务
   ↓
5. 验证部署
   ↓
6. 测试社交登录
```

---

## 🔧 1. 配置环境变量

### 后端配置

```bash
# 复制环境变量示例
cp .env.example packages/nvwax-server/.env

# 编辑 .env 文件，配置以下变量
nano packages/nvwax-server/.env
```

**必需配置的变量**:

```bash
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/nvwax

# JWT Secret（必须修改！）
JWT_SECRET=your-super-secure-jwt-secret-key

# Cross Auth Secret（必须修改！）
CROSS_AUTH_SECRET=your-cross-auth-secret

# GitHub OAuth
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Google OAuth
GOOGLE_CLIENT_ID=1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

---

### 前端配置

```bash
# 创建前端环境变量文件
nano packages/nvwax-web/.env.production
```

**文件内容**:

```bash
# GitHub OAuth
NEXT_PUBLIC_GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxx

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

# API URL
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

---

### Docker Compose 配置

```bash
# 复制环境变量示例
cp .env.example .env

# 编辑 .env 文件
nano .env
```

**必需配置的变量**:

```bash
# 数据库
DB_NAME=nvwax
DB_USER=nvwax
DB_PASSWORD=your-secure-password

# JWT Secret
JWT_SECRET=your-super-secure-jwt-secret-key

# GitHub OAuth
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxx

# Google OAuth
GOOGLE_CLIENT_ID=1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

---

## 🏗️ 2. 构建 Docker 镜像

### 完整构建

```bash
# 构建所有服务
docker-compose build

# 构建时禁用缓存（强制重新构建）
docker-compose build --no-cache
```

### 单独构建

```bash
# 只构建后端
docker-compose build backend

# 只构建前端
docker-compose build frontend

# 只构建数据库
docker-compose build postgres
```

### 查看镜像

```bash
# 查看所有镜像
docker images

# 查看 NvwaX 相关镜像
docker images | grep nvwax
```

---

## 🗄️ 3. 运行数据库迁移

### 启动数据库服务

```bash
# 启动数据库和 Redis
docker-compose up -d postgres redis

# 查看数据库日志
docker-compose logs -f postgres
```

### 等待数据库启动

```bash
# 检查数据库健康状态
docker-compose ps postgres

# 手动检查数据库连接
docker-compose exec postgres pg_isready -U nvwax
```

### 运行迁移

```bash
# 方法 1: 直接运行迁移命令
docker-compose exec backend pnpm run db:migrate

# 方法 2: 进入容器后运行
docker-compose exec backend sh
cd packages/nvwax-server
pnpm run db:migrate

# 方法 3: 使用 Prisma
docker-compose exec backend pnpm run prisma:migrate
```

### 验证迁移

```bash
# 检查迁移状态
docker-compose exec backend pnpm run db:migrate:status

# 连接到数据库查看表
docker-compose exec postgres psql -U nvwax -d nvwax -c "\dt"
```

---

## 🚀 4. 启动所有服务

### 启动所有服务

```bash
# 启动所有服务（后台运行）
docker-compose up -d

# 启动所有服务（前台运行，查看日志）
docker-compose up

# 启动特定服务
docker-compose up -d backend frontend
```

### 查看服务状态

```bash
# 查看所有服务状态
docker-compose ps

# 查看特定服务状态
docker-compose ps backend
docker-compose ps frontend
```

### 查看服务日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看后端日志
docker-compose logs -f backend

# 查看前端日志
docker-compose logs -f frontend

# 查看数据库日志
docker-compose logs -f postgres

# 查看 Redis 日志
docker-compose logs -f redis
```

---

## 🔍 5. 验证部署

### 健康检查

```bash
# 检查后端健康状态
curl http://localhost:3001/health

# 检查前端是否可访问
curl http://localhost:3000

# 检查 API 是否可访问
curl http://localhost:3001/api/health
```

### 测试 GitHub OAuth 端点

```bash
# 测试授权 URL 生成
curl "http://localhost:3001/api/auth/github/authorize?redirectUri=http://localhost:3000/callback"

# 预期返回：
# {
#   "success": true,
#   "data": {
#     "authorizeUrl": "https://github.com/login/oauth/authorize?...",
#     "state": "..."
#   }
# }
```

### 测试 Google OAuth 端点

```bash
# 检查前端是否正确加载 Google Client ID
curl http://localhost:3000 | grep "google"

# 预期在 HTML 源代码中看到 NEXT_PUBLIC_GOOGLE_CLIENT_ID
```

---

## 🧪 6. 测试社交登录

### 测试 GitHub 登录

```bash
# 1. 访问登录页面
open http://localhost:3000/login

# 2. 点击 "使用 GitHub 登录" 按钮

# 3. 检查浏览器控制台（F12）
#    - 查看网络请求
#    - 查看是否有错误

# 4. 检查后端日志
docker-compose logs -f backend | grep GitHub
```

### 测试 Google 登录

```bash
# 1. 访问登录页面
open http://localhost:3000/login

# 2. 点击 Google 登录按钮

# 3. 检查浏览器控制台（F12）
#    - 查看是否加载 Google GIS SDK
#    - 查看是否有错误

# 4. 检查后端日志
docker-compose logs -f backend | grep Google
```

### 使用测试页面

```bash
# 访问测试页面
open http://localhost:3000/test/social-login

# 点击 "🚀 运行所有测试"
# 查看测试结果和日志
```

---

## 🛠️ 常用维护命令

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
docker-compose restart frontend

# 重启并重新构建
docker-compose up -d --build
```

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止所有服务并删除卷
docker-compose down -v

# 停止所有服务并删除镜像
docker-compose down --rmi all
```

### 进入容器

```bash
# 进入后端容器
docker-compose exec backend sh

# 进入前端容器
docker-compose exec frontend sh

# 进入数据库容器
docker-compose exec postgres psql -U nvwax -d nvwax
```

### 查看环境变量

```bash
# 查看后端环境变量
docker-compose exec backend env

# 查看前端环境变量
docker-compose exec frontend env

# 查看特定环境变量
docker-compose exec backend env | grep GITHUB
docker-compose exec frontend env | grep NEXT_PUBLIC
```

---

## 🐛 故障排查命令

### 检查容器日志

```bash
# 查看后端错误日志
docker-compose logs backend | grep -i error

# 查看前端错误日志
docker-compose logs frontend | grep -i error

# 查看数据库错误日志
docker-compose logs postgres | grep -i error
```

### 检查网络连接

```bash
# 检查后端是否可访问
ping localhost -p 3001

# 检查前端是否可访问
ping localhost -p 3000

# 检查数据库连接
docker-compose exec backend ping postgres
```

### 检查环境变量

```bash
# 验证后端环境变量
docker-compose exec backend printenv | grep -E "(GITHUB|GOOGLE|JWT)"

# 验证前端环境变量
docker-compose exec frontend printenv | grep NEXT_PUBLIC
```

### 重新构建前端（环境变量有变化）

```bash
# 重新构建前端镜像
docker-compose build --no-cache frontend

# 重启前端服务
docker-compose up -d --build frontend
```

---

## 📊 性能监控命令

### 查看资源使用

```bash
# 查看容器资源使用
docker stats

# 查看特定容器资源使用
docker stats nvwax-backend nvwax-frontend
```

### 查看容器详情

```bash
# 查看容器详情
docker inspect nvwax-backend

# 查看容器网络
docker network ls
docker network inspect nvwax_nvwa-network

# 查看容器卷
docker volume ls
```

---

## 🔐 生产环境部署命令

### 使用 Nginx 反向代理

```bash
# 构建生产镜像
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# 启动生产服务
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 查看生产服务状态
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

### 配置 SSL 证书

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 测试自动续期
sudo certbot renew --dry-run
```

### 备份数据库

```bash
# 备份数据库
docker-compose exec postgres pg_dump -U nvwax nvwax > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker-compose exec -T postgres psql -U nvwax nvwax < backup_20240621.sql
```

---

## 📋 部署检查清单

### 部署前

- [ ] 环境变量已配置
- [ ] OAuth App 已创建（GitHub 和 Google）
- [ ] 数据库凭证已设置
- [ ] JWT_SECRET 已修改为安全随机字符串

### 部署中

- [ ] Docker 镜像构建成功
- [ ] 数据库迁移运行成功
- [ ] 所有服务启动成功
- [ ] 健康检查通过

### 部署后

- [ ] GitHub 登录测试通过
- [ ] Google 登录测试通过
- [ ] 数据库备份已设置
- [ ] 日志监控已配置
- [ ] SSL 证书已配置（生产环境）

---

## 🆘 紧急回滚

```bash
# 停止当前版本
docker-compose down

# 回滚到上一个版本
git checkout <previous-commit>
docker-compose build
docker-compose up -d

# 或者使用镜像标签回滚
docker-compose down
docker-compose up -d --no-build
```

---

## 📚 相关文档

- **完整部署指南**: `DEPLOYMENT_GUIDE.md`
- **快速配置指南**: `SOCIAL_LOGIN_QUICK_START.md`
- **完整配置指南**: `SOCIAL_LOGIN_SETUP_GUIDE.md`
- **下一步行动清单**: `NEXT_STEPS.md`

---

## 🔗 快速链接

- **GitHub OAuth App 创建**: https://github.com/settings/developers
- **Google OAuth App 创建**: https://console.cloud.google.com/
- **Docker 文档**: https://docs.docker.com/
- **Docker Compose 文档**: https://docs.docker.com/compose/

---

**🎉 使用这些命令完成你的 NvwaX 社交登录部署！**
