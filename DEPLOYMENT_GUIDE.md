# 🚀 NvwaX 社交登录部署指南

本文档介绍如何部署支持 GitHub/Google 社交登录的 NvwaX 应用。

---

## 📋 部署前检查清单

### ✅ 代码已更新

- [x] 后端控制器已添加 GitHub 登录方法
- [x] 后端路由已添加 GitHub OAuth 端点
- [x] 前端 API 已添加 GitHub 登录方法
- [x] 前端组件已创建（GitHub 登录按钮、回调页面）
- [x] Docker 配置已更新（添加环境变量）

### ⏳ 需要配置

- [ ] 后端环境变量（`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`）
- [ ] 前端环境变量（`NEXT_PUBLIC_GITHUB_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`）
- [ ] GitHub OAuth App 已创建
- [ ] Google OAuth App 已创建
- [ ] 数据库迁移已运行（`social_accounts` 表）

---

## 🔧 环境变量配置

### 方法 1: 使用 `.env` 文件（推荐）

#### 1. 后端环境变量

**文件**: `packages/nvwax-server/.env`

```bash
# ===== 必需配置 =====

# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/nvwax

# JWT Secret（必须修改！）
JWT_SECRET=your-super-secure-jwt-secret-key-32-chars-min

# Cross Auth Secret（必须修改！）
CROSS_AUTH_SECRET=your-cross-auth-secret-change-in-production

# ===== GitHub OAuth =====
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ===== Google OAuth =====
GOOGLE_CLIENT_ID=1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

# ===== 前端 URL =====
NEXT_PUBLIC_API_URL=https://your-domain.com/api
FRONTEND_URL=https://your-domain.com

# ===== 其他配置 =====
# DeepSeek API (可选)
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Stripe (可选)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 2. 前端环境变量

**文件**: `packages/nvwax-web/.env.production`

```bash
# GitHub OAuth
NEXT_PUBLIC_GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxx

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

# API URL
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

---

### 方法 2: 使用 Docker Compose 环境变量

**文件**: `.env` (项目根目录)

```bash
# ===== 数据库配置 =====
DB_NAME=nvwax
DB_USER=nvwax
DB_PASSWORD=your-secure-password
DB_PORT=5432

# ===== 后端配置 =====
BACKEND_PORT=3001
JWT_SECRET=your-super-secure-jwt-secret-key-32-chars-min
CROSS_AUTH_SECRET=your-cross-auth-secret-change-in-production

# ===== 前端配置 =====
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=https://your-domain.com/api
FRONTEND_URL=https://your-domain.com

# ===== GitHub OAuth =====
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxx

# ===== Google OAuth =====
GOOGLE_CLIENT_ID=1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

# ===== 其他配置 =====
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🐋 Docker 部署

### 步骤 1: 构建 Docker 镜像

```bash
# 进入项目根目录
cd d:\BigLionX\NvwaX

# 构建所有服务
docker-compose build

# 或者分别构建
docker-compose build backend
docker-compose build frontend
```

---

### 步骤 2: 运行数据库迁移

```bash
# 启动数据库服务
docker-compose up -d postgres

# 等待数据库启动完成
docker-compose ps

# 运行数据库迁移
docker-compose exec backend pnpm run db:migrate

# 或者手动进入容器运行
docker-compose exec backend sh
cd packages/nvwax-server
pnpm run db:migrate
```

---

### 步骤 3: 启动所有服务

```bash
# 启动所有服务（后台运行）
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

### 步骤 4: 验证部署

```bash
# 检查后端健康状态
curl http://localhost:3001/health

# 检查前端是否可访问
curl http://localhost:3000

# 测试 GitHub 授权 URL 生成
curl "http://localhost:3001/api/auth/github/authorize?redirectUri=http://localhost:3000/callback"
```

---

## 🌐 生产环境部署

### 使用 Nginx 反向代理

#### Nginx 配置示例

```nginx
# /etc/nginx/sites-available/nvwax
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # 前端
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 健康检查
    location /health {
        proxy_pass http://localhost:3001/health;
    }
}
```

---

### 使用 Let's Encrypt SSL 证书

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

### GitHub OAuth App 生产环境配置

1. **访问 GitHub Developer Settings**
   - URL: https://github.com/settings/developers

2. **编辑 OAuth App**
   - 修改 **Homepage URL**: `https://your-domain.com`
   - 修改 **Authorization callback URL**: `https://your-domain.com/api/auth/github/callback`

3. **保存更改**

---

### Google OAuth App 生产环境配置

1. **访问 Google Cloud Console**
   - URL: https://console.cloud.google.com/

2. **编辑 OAuth 客户端**
   - 添加授权的 JavaScript 来源: `https://your-domain.com`
   - 添加授权的重定向 URI: `https://your-domain.com`

3. **保存更改**

---

## 🧪 测试部署

### 1. 访问登录页面

```
https://your-domain.com/login
```

### 2. 测试 GitHub 登录

1. 点击 "使用 GitHub 登录" 按钮
2. 跳转 GitHub 授权页面
3. 授权后跳转回回调页面
4. 检查是否成功登录

### 3. 测试 Google 登录

1. 点击 Google 登录按钮
2. 弹出 Google 授权窗口
3. 授权后自动关闭窗口
4. 检查是否成功登录

---

## 📊 监控和日志

### 查看 Docker 日志

```bash
# 所有服务
docker-compose logs -f

# 后端
docker-compose logs -f backend

# 前端
docker-compose logs -f frontend

# 数据库
docker-compose logs -f postgres
```

### 查看应用日志

```bash
# 进入后端容器
docker-compose exec backend sh

# 查看应用日志
tail -f logs/app.log
```

---

## 🔧 故障排查

### 问题 1: GitHub 登录失败

**检查清单**:
- [ ] `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET` 是否正确
- [ ] GitHub OAuth App 的回调 URL 是否匹配
- [ ] 后端日志是否有错误

**解决方法**:
```bash
# 检查环境变量
docker-compose exec backend env | grep GITHUB

# 测试 GitHub OAuth 配置
curl "http://localhost:3001/api/auth/github/authorize?redirectUri=http://localhost:3000/callback"
```

---

### 问题 2: Google 登录失败

**检查清单**:
- [ ] `GOOGLE_CLIENT_ID` 是否正确
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` 是否正确
- [ ] Google Cloud Console 中的 JavaScript 来源是否包含你的域名

**解决方法**:
```bash
# 检查前端环境变量
docker-compose exec frontend env | grep GOOGLE

# 重新构建前端（如果环境变量有变化）
docker-compose build frontend
docker-compose up -d frontend
```

---

### 问题 3: 数据库迁移失败

**解决方法**:
```bash
# 检查数据库连接
docker-compose exec backend ping postgres

# 手动运行迁移
docker-compose exec backend pnpm run db:migrate

# 检查迁移状态
docker-compose exec backend pnpm run db:migrate:status
```

---

### 问题 4: 前端无法访问后端 API

**检查清单**:
- [ ] `NEXT_PUBLIC_API_URL` 是否正确
- [ ] 后端服务是否正在运行
- [ ] CORS 配置是否正确

**解决方法**:
```bash
# 检查后端健康状态
curl http://localhost:3001/health

# 检查 CORS 配置
# 在 `.env` 中添加前端域名到 CORS_ALLOWED_ORIGINS
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

---

## 🔐 安全建议

### 1. 使用 HTTPS

生产环境必须使用 HTTPS，防止授权 code 和 token 被拦截。

### 2. 保护环境变量

- 不要将 `.env` 文件提交到代码仓库
- 使用 Docker Secrets 或 Kubernetes Secrets 管理敏感信息
- 定期轮换密钥和 Secret

### 3. 配置 CORS

在 `.env` 中配置允许的域名：

```bash
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

### 4. 限制 OAuth Scope

只请求必要的权限范围：
- GitHub: `read:user`, `user:email`
- Google: `userinfo.email`, `userinfo.profile`

---

## 📚 相关文档

- **快速配置指南**: `SOCIAL_LOGIN_QUICK_START.md`
- **完整配置指南**: `SOCIAL_LOGIN_SETUP_GUIDE.md`
- **下一步行动清单**: `NEXT_STEPS.md`
- **环境变量示例**: `.env.example`

---

## 🆘 需要帮助？

### 查看日志

```bash
# 后端日志
docker-compose logs -f backend

# 前端日志
docker-compose logs -f frontend

# Nginx 日志
tail -f /var/log/nginx/error.log
```

### 运行诊断脚本

```bash
# 验证配置
node scripts/validate-social-login-config.js

# 运行配置向导
node scripts/social-login-setup-wizard.js
```

### 访问测试页面

```
https://your-domain.com/test/social-login
```

---

## ✅ 部署完成检查清单

- [ ] 环境变量已配置
- [ ] Docker 镜像已构建
- [ ] 数据库迁移已运行
- [ ] 所有服务已启动
- [ ] 健康检查通过
- [ ] GitHub 登录测试通过
- [ ] Google 登录测试通过
- [ ] SSL 证书已配置（生产环境）
- [ ] CORS 已配置
- [ ] 日志监控已设置

---

**🎉 恭喜！你的 NvwaX 应用已成功部署，并支持 GitHub 和 Google 社交登录！**
