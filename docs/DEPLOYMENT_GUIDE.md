# NvwaX 统一登录认证中心部署指南

> **目标**：帮助开发者快速部署 `account.proclaw.cc` (OIDC IdP) 到腾讯云或其他云服务器
>
> **适用场景**：合作项目需要接入统一登录、本地测试、生产环境部署

---

## 📋 目录

1. [前置要求](#1-前置要求)
2. [快速部署（推荐使用脚本）](#2-快速部署推荐使用脚本)
3. [手动部署（详细步骤）](#3-手动部署详细步骤)
4. [配置 OIDC 客户端](#4-配置-oidc-客户端)
5. [验证部署](#5-验证部署)
6. [常见问题](#6-常见问题)
7. [附录](#7-附录)

---

## 1. 前置要求

### 1.1 服务器要求

| 项目 | 最低配置 | 推荐配置 |
|------|----------|----------|
| **CPU** | 2 核 | 4 核 |
| **内存** | 4 GB | 8 GB |
| **磁盘** | 50 GB | 100 GB |
| **操作系统** | Ubuntu 20.04+ | Ubuntu 22.04 LTS |
| **网络** | 公网 IP + 开放 80/443 端口 | 同上 |

### 1.2 必需软件

在服务器上安装以下软件：

```bash
# Docker (推荐使用官方脚本安装)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# 验证安装
docker --version
docker compose version
```

### 1.3 域名和 DNS

如果需要生产环境部署（Let's Encrypt 证书），需要：

1. **域名**：例如 `account.yourdomain.com`
2. **DNS A 记录**：指向服务器公网 IP
3. **验证 DNS 解析**：
   ```bash
   dig +short account.yourdomain.com A
   # 应该返回你的服务器 IP
   ```

### 1.4 环境变量准备

在部署前，准备好以下配置（保存到 `.env` 文件）：

```bash
# ========== 基础配置 ==========
NODE_ENV=production
DOMAIN=account.yourdomain.com

# ========== 数据库 ==========
DB_NAME=nvwax
DB_USER=nvwax
DB_PASSWORD=<生成强密码，至少 16 字符>
DB_PORT=5432

# ========== JWT 和加密 ==========
JWT_SECRET=<生成强密钥，至少 32 字符随机字符串>
CROSS_AUTH_SECRET=<生成强密钥，至少 32 字符随机字符串>
ADMIN_JWT_SECRET=<生成强密钥，至少 32 字符随机字符串>
PC_SESSION_SECRET=<生成强密钥，至少 32 字符随机字符串>

# ========== OIDC IdP ==========
OIDC_ISSUER=https://account.yourdomain.com
OIDC_PRIVATE_KEY_PATH=/etc/oidc/keys/private.pem

# ========== 邮件服务（用于验证码） ==========
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your-email@qq.com
SMTP_PASS=<QQ 邮箱授权码，16 字符>
SMTP_FROM=NvwaX <noreply@yourdomain.com>

# ========== Google OAuth（可选） ==========
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<从 Google Cloud Console 获取>
GOOGLE_CLIENT_ID=<同上>
GOOGLE_CLIENT_SECRET=<从 Google Cloud Console 获取>

# ========== GitHub OAuth（可选） ==========
GITHUB_CLIENT_ID=<从 GitHub Developer Settings 获取>
GITHUB_CLIENT_SECRET=<从 GitHub Developer Settings 获取>

# ========== Facebook OAuth（可选） ==========
FACEBOOK_APP_ID=<从 Facebook Developers 获取>
FACEBOOK_APP_SECRET=<从 Facebook Developers 获取>

# ========== 其他 ==========
PORTAL_STATIC_DIR=/app/account-portal-out
DEEPSEEK_API_KEY=<可选，用于 AI 功能>
STRIPE_SECRET_KEY=<可选，用于支付功能>
```

**生成强密码/密钥的方法**：

```bash
# 生成 32 字符随机字符串
openssl rand -base64 32

# 生成 16 字符随机密码
openssl rand -base64 16 | tr -d '=+/' | cut -c1-16
```

---

## 2. 快速部署（推荐使用脚本）

### 2.1 首次完整部署

适用场景：服务器上还没有部署过 NvwaX

```bash
# 1. SSH 登录服务器
ssh root@your-server-ip

# 2. 克隆仓库（或上传代码）
git clone https://github.com/your-org/NvwaX.git /opt/nvwax
cd /opt/nvwax

# 3. 创建 .env 文件（填入步骤 1.4 中的配置）
nano .env

# 4. 运行一键部署脚本
sudo EXPECTED_IP=your-server-ip LE_EMAIL=admin@yourdomain.com bash scripts/deploy-account.sh
```

**脚本功能**：
- ✅ 校验 DNS 解析
- ✅ 生成 OIDC RSA 密钥对
- ✅ 申请 Let's Encrypt SSL 证书（如果不存在）
- ✅ 启动 Docker 容器
- ✅ 健康检查

### 2.2 增量更新部署

适用场景：服务器已部署过，只需更新代码

**步骤 1：在本地构建更新包**

```bash
# 在本地开发机器上执行

# 构建后端
cd packages/nvwax-server
pnpm build
cd ../..

# 打包后端
cd packages/nvwax-server/dist
zip -r ../../../backend-dist-new.zip .
cd ../../..

# 构建 Portal
cd packages/account-portal
pnpm build
cd ../..

# 打包 Portal
cd packages/account-portal/out
zip -r ../../../portal-out-new.zip .
cd ../../..
```

**步骤 2：上传更新包到服务器**

```bash
# 上传到服务器
scp backend-dist-new.zip root@your-server-ip:/tmp/
scp portal-out-new.zip root@your-server-ip:/tmp/
```

**步骤 3：在服务器上执行部署**

```bash
# SSH 登录服务器
ssh root@your-server-ip

# 执行部署
cd /opt/nvwax
bash -c '
set -e
echo "=== 开始部署 ==="

# 解压后端文件
echo "[1/4] 解压后端更新包..."
cd /tmp
rm -rf backend-dist-new
mkdir backend-dist-new
cd backend-dist-new
unzip -oq /tmp/backend-dist-new.zip

# 复制到 Docker 容器
echo "[2/4] 更新后端容器..."
docker cp /tmp/backend-dist-new/. nvwax-backend:/app/packages/nvwax-server/dist/

# 解压 Portal 文件
echo "[3/4] 解压 Portal 更新包..."
cd /opt/nvwax
rm -rf account-portal-out-new
mkdir -p account-portal-out-new
cd account-portal-out-new
unzip -oq /tmp/portal-out-new.zip

# 备份并替换
echo "[4/4] 替换 Portal 文件..."
cd /opt/nvwax
TS=$(date +%Y%m%d_%H%M%S)
if [ -d account-portal-out ]; then
  mv account-portal-out account-portal-out.bak.$TS
fi
mv account-portal-out-new account-portal-out

# 重启后端容器
echo "重启后端容器..."
docker compose restart backend

echo "=== 部署完成 ==="
'
```

---

## 3. 手动部署（详细步骤）

如果你需要更精细的控制，或者脚本执行失败，可以参考以下手动步骤。

### 3.1 安装 Docker 和 Docker Compose

```bash
# 更新软件包
sudo apt-get update
sudo apt-get upgrade -y

# 安装 Docker (官方脚本)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo apt-get install -y docker-compose-plugin

# 验证安装
docker --version
docker compose version

# 允许非 root 用户使用 Docker (可选)
sudo usermod -aG docker $USER
newgrp docker
```

### 3.2 配置防火墙

```bash
# 开放必需端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 3.3 上传项目代码

**方法 A：从 Git 仓库克隆**

```bash
# 安装 Git (如果没有)
sudo apt-get install -y git

# 克隆仓库
sudo git clone https://github.com/your-org/NvwaX.git /opt/nvwax
cd /opt/nvwax

# 切换到指定分支/tag
git checkout main
```

**方法 B：上传本地代码**

```bash
# 在本地打包项目（排除 node_modules, .git 等）
tar --exclude='node_modules' --exclude='.git' --exclude='dist' \
    -czf nvwax.tar.gz NvwaX/

# 上传到服务器
scp nvwax.tar.gz root@your-server-ip:/opt/

# 在服务器上解压
ssh root@your-server-ip
cd /opt
tar -xzf nvwax.tar.gz
mv NvwaX nvwax
cd nvwax
```

### 3.4 创建环境变量文件

```bash
# 复制示例文件
cp .env.example .env

# 编辑配置文件
nano .env

# 填入所有必需的环境变量（参考 1.4 节）
```

### 3.5 生成 OIDC 密钥对

OIDC IdP 需要 RSA 密钥对来签名 JWT。

```bash
# 创建密钥目录
sudo mkdir -p /opt/nvwax/secrets/oidc

# 生成私钥
openssl genrsa -out /opt/nvwax/secrets/oidc/private.pem 2048

# 生成公钥
openssl rsa -in /opt/nvwax/secrets/oidc/private.pem \
    -pubout -out /opt/nvwax/secrets/oidc/private.pem.pub.pem

# 设置权限
sudo chmod 644 /opt/nvwax/secrets/oidc/private.pem
sudo chmod 644 /opt/nvwax/secrets/oidc/private.pem.pub.pem
```

### 3.6 申请 Let's Encrypt SSL 证书

**前置条件**：
- 域名已解析到服务器 IP
- 80 端口未被占用

```bash
# 安装 certbot
sudo apt-get update
sudo apt-get install -y certbot

# 停止占用 80 端口的服务（如果有）
sudo docker compose stop nginx || true

# 申请证书（standalone 模式）
sudo certbot certonly --standalone \
    -d account.yourdomain.com \
    --email admin@yourdomain.com \
    --agree-tos \
    --no-eff-email

# 验证证书生成成功
sudo ls -la /etc/letsencrypt/live/account.yourdomain.com/
```

**配置自动续期**（重要！）：

```bash
# 测试自动续期
sudo certbot renew --dry-run

# 添加 cron 任务
echo "0 3 * * * root certbot renew --quiet --deploy-hook 'docker compose -f /opt/nvwax/docker-compose.yml restart nginx'" | sudo tee /etc/cron.d/certbot-nvwax
```

### 3.7 启动 Docker 容器

```bash
cd /opt/nvwax

# 启动所有服务
sudo docker compose --env-file .env up -d

# 查看容器状态
sudo docker compose ps

# 查看日志
sudo docker compose logs -f
```

**预期输出**：

```
CONTAINER ID   IMAGE                    STATUS
d962dfafa7b2   nginx:alpine             Up 1 minutes
85098650eafd   nvwax-frontend           Up 1 minutes (healthy)
fe4a2d868e76   nvwax-backend            Up 1 minutes (healthy)
7be34362d88f   axllent/mailpit:latest  Up 1 minutes (healthy)
06c7cdb5bc26   postgres:16-alpine       Up 1 minutes (healthy)
9175bc944f14   redis:7-alpine           Up 1 minutes (healthy)
```

### 3.8 运行数据库迁移

```bash
# 进入后端容器
sudo docker exec -it nvwax-backend sh

# 运行 Prisma 迁移
cd /app/packages/nvwax-server
npx prisma migrate deploy

# 运行 OIDC 相关迁移（如果有的话）
node scripts/run-oidc-migrations.js

# 退出容器
exit
```

---

## 4. 配置 OIDC 客户端

要让合作项目接入统一登录，需要在 `oidc_clients` 表中创建客户端记录。

### 4.1 使用 SQL 直接插入

```bash
# SSH 登录服务器
ssh root@your-server-ip

# 连接到数据库
sudo docker exec -it nvwax-postgres psql -U nvwax -d nvwax

# 在 psql 提示符下执行：
INSERT INTO oidc_clients (
  client_id,
  name,
  redirect_uris,
  allowed_scopes,
  allowed_grant_types,
  require_pkce,
  token_endpoint_auth_method,
  is_active,
  created_at,
  updated_at
) VALUES (
  'your-partner-client-id',
  'Your Partner Project Name',
  ARRAY['https://your-partner-domain.com/callback'],
  ARRAY['openid', 'profile', 'email'],
  ARRAY['authorization_code', 'refresh_token'],
  true,
  'none',
  true,
  NOW(),
  NOW()
);

# 验证插入成功
SELECT client_id, name, redirect_uris FROM oidc_clients;

# 退出 psql
\q
```

### 4.2 使用管理界面（如果已实现）

```bash
# 访问管理界面（需要管理员登录）
https://account.yourdomain.com/admin/clients

# 点击 "Create New Client"
# 填写表单：
#   - Client ID: your-partner-client-id
#   - Name: Your Partner Project Name
#   - Redirect URIs: https://your-partner-domain.com/callback
#   - Scopes: openid, profile, email
#   - Require PKCE: Yes
```

### 4.3 客户端配置参数说明

| 参数 | 说明 | 推荐值 |
|------|------|--------|
| `client_id` | 客户端唯一标识 | 使用小写字母、数字、连字符 |
| `name` | 客户端名称（用于显示） | 合作项目名称 |
| `redirect_uris` | 授权后的重定向 URI（回调地址） | 必须是 HTTPS（生产环境） |
| `allowed_scopes` | 允许的 Scope | `openid`, `profile`, `email` |
| `require_pkce` | 是否要求 PKCE | `true`（推荐，更安全） |
| `token_endpoint_auth_method` | Token 端点的认证方法 | `none`（PKCE 流程不需要 secret） |

---

## 5. 验证部署

### 5.1 基础健康检查

```bash
# 1. 检查容器状态
ssh root@your-server-ip
cd /opt/nvwax
sudo docker compose ps

# 所有容器应该显示 "Up" 状态，且健康检查通过

# 2. 检查后端 API
curl http://localhost:3001/health
# 预期输出：{"status":"ok"}

# 3. 检查前端
curl http://localhost:3000
# 预期输出：HTML 内容

# 4. 检查 Nginx（如果配置了）
curl http://localhost:80
# 应该重定向到 HTTPS
```

### 5.2 OIDC Discovery 端点测试

```bash
# 测试 Discovery 文档
curl https://account.yourdomain.com/.well-known/openid-configuration

# 预期输出（JSON）：
{
  "issuer": "https://account.yourdomain.com",
  "authorization_endpoint": "https://account.yourdomain.com/oauth/authorize",
  "token_endpoint": "https://account.yourdomain.com/oauth/token",
  "userinfo_endpoint": "https://account.yourdomain.com/oauth/userinfo",
  "jwks_uri": "https://account.yourdomain.com/.well-known/jwks.json",
  "response_types_supported": ["code"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  ...
}
```

### 5.3 JWKS 端点测试

```bash
# 测试 JWKS（获取公钥）
curl https://account.yourdomain.com/.well-known/jwks.json

# 预期输出（JSON）：
{
  "keys": [
    {
      "kty": "RSA",
      "n": "...",  // 公钥模数
      "e": "AQAB", // 公钥指数
      "kid": "...", // 密钥 ID
      "use": "sig",
      "alg": "RS256"
    }
  ]
}
```

### 5.4 完整的 OIDC 授权码流程测试

**步骤 1：生成 PKCE 参数**

```bash
# 生成 code_verifier
code_verifier=$(openssl rand -base64 64 | tr -d '\n' | tr '+/' '-_' | tr -d '=')

# 生成 code_challenge
code_challenge=$(echo -n "$code_verifier" | openssl dgst -sha256 -binary | base64 | tr '+/' '-_' | tr -d '=')

echo "code_verifier: $code_verifier"
echo "code_challenge: $code_challenge"
```

**步骤 2：构造授权 URL**

在浏览器中打开（替换 `code_challenge` 为实际值）：

```
https://account.yourdomain.com/oauth/authorize?
  response_type=code&
  client_id=your-partner-client-id&
  redirect_uri=https://your-partner-domain.com/callback&
  scope=openid%20profile%20email&
  state=random_state_12345&
  code_challenge=YOUR_CODE_CHALLENGE&
  code_challenge_method=S256
```

**步骤 3：用户登录**

- 浏览器会显示登录页面
- 输入邮箱/密码，或使用 Social Login
- 登录成功后，浏览器会重定向到 `redirect_uri`，并附带 `code` 参数

**步骤 4：交换 Token**

```bash
# 使用获取到的 code 和 code_verifier 交换 token
curl -X POST https://account.yourdomain.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=your-partner-client-id" \
  -d "code=YOUR_AUTHORIZATION_CODE" \
  -d "redirect_uri=https://your-partner-domain.com/callback" \
  -d "code_verifier=YOUR_CODE_VERIFIER"
```

**预期输出（JSON）**：

```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJ...",
  "id_token": "eyJ..."
}
```

**步骤 5：获取用户信息**

```bash
curl https://account.yourdomain.com/oauth/userinfo \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**预期输出（JSON）**：

```json
{
  "sub": "user-id-123",
  "email": "user@example.com",
  "name": "User Name",
  "picture": "https://..."
}
```

---

## 6. 常见问题

### 6.1 Docker 容器无法启动

**问题**：`docker compose up -d` 后，某些容器状态为 `Exited` 或 `Restarting`

**排查步骤**：

```bash
# 查看容器日志
sudo docker compose logs <container_name>

# 常见原因：
# 1. 环境变量缺失或错误
#    解决：检查 .env 文件，确保所有必需变量都已设置

# 2. 端口冲突
#    解决：检查端口占用情况
sudo netstat -tulpn | grep :3001

# 3. 数据库迁移未运行
#    解决：运行数据库迁移（参考 3.8 节）
```

### 6.2 OIDC Discovery 端点返回 404

**问题**：访问 `https://account.yourdomain.com/.well-known/openid-configuration` 返回 404

**排查步骤**：

```bash
# 1. 检查后端容器是否正常运行
sudo docker compose ps backend

# 2. 检查 OIDC 路由是否已注册
sudo docker exec nvwax-backend curl http://localhost:3001/.well-known/openid-configuration

# 3. 如果后端正常，但 Nginx 返回 404，检查 Nginx 配置
sudo docker exec nvwax-nginx cat /etc/nginx/conf.d/account.proclaw.cc.conf

# 4. 重启 Nginx
sudo docker compose restart nginx
```

### 6.3 Let's Encrypt 证书申请失败

**问题**：`certbot` 申请证书时失败

**常见原因**：

1. **DNS 未解析**：确保域名已解析到服务器 IP
   ```bash
   dig +short account.yourdomain.com A
   ```

2. **80 端口被占用**：certbot standalone 模式需要临时占用 80 端口
   ```bash
   # 停止 Nginx 容器
   sudo docker compose stop nginx
   
   # 申请证书
   sudo certbot certonly --standalone -d account.yourdomain.com
   
   # 重启 Nginx
   sudo docker compose start nginx
   ```

3. **防火墙未开放 80 端口**：
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw reload
   ```

### 6.4 Social Login 无法使用

**问题**：点击 GitHub/Google 登录按钮后报错

**排查步骤**：

1. **检查 OAuth App 配置**：
   - 确保 `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET` 已正确设置
   - 确保 GitHub OAuth App 的 Callback URL 配置正确：
     ```
     https://account.yourdomain.com/api/auth/github/callback
     ```

2. **检查后端日志**：
   ```bash
   sudo docker compose logs -f backend
   ```

3. **测试 OAuth 流程**：
   ```bash
   # 访问 GitHub OAuth 授权 URL
   # 应该重定向到 GitHub 登录页面
   https://account.yourdomain.com/api/auth/github
   ```

### 6.5 数据库迁移失败

**问题**：运行 `npx prisma migrate deploy` 时报错

**解决方法**：

```bash
# 1. 检查数据库连接
sudo docker exec nvwax-backend curl http://localhost:3001/health

# 2. 检查 DATABASE_URL 环境变量
sudo docker exec nvwax-backend echo $DATABASE_URL

# 3. 手动运行迁移 SQL
sudo docker exec -i nvwax-postgres psql -U nvwax -d nvwax < packages/nvwax-server/migrations/001_do_something.sql

# 4. 重置数据库（慎用！会丢失数据）
sudo docker compose down -v
sudo docker compose up -d
```

---

## 7. 附录

### 7.1 有用的命令速查表

```bash
# ========== 容器管理 ==========

# 查看所有容器状态
sudo docker compose ps

# 查看容器日志
sudo docker compose logs -f <service_name>
sudo docker compose logs -f backend

# 重启单个服务
sudo docker compose restart backend

# 停止所有服务
sudo docker compose down

# 启动所有服务
sudo docker compose up -d

# 重新构建并启动
sudo docker compose up -d --build

# ========== 数据库操作 ==========

# 连接到数据库
sudo docker exec -it nvwax-postgres psql -U nvwax -d nvwax

# 备份数据库
sudo docker exec nvwax-postgres pg_dump -U nvwax nvwax > backup_$(date +%Y%m%d).sql

# 恢复数据库
sudo docker exec -i nvwax-postgres psql -U nvwax -d nvwax < backup_20260621.sql

# ========== 文件操作 ==========

# 从容器复制文件到宿主机
sudo docker cp nvwax-backend:/app/packages/nvwax-server/dist ./dist

# 从宿主机复制文件到容器
sudo docker cp ./dist nvwax-backend:/app/packages/nvwax-server/dist

# ========== 调试 ==========

# 进入容器 shell
sudo docker exec -it nvwax-backend sh

# 查看容器环境变量
sudo docker exec nvwax-backend env

# 查看容器进程
sudo docker exec nvwax-backend ps aux
```

### 7.2 环境变量完整列表

> **注意**：以下所有带有 `< >` 的变量都需要替换为实际值

```bash
# ========== 必需变量 ==========

# 基础
NODE_ENV=production
PORT=3001                            # 后端端口
DATABASE_URL=postgresql://nvwax:<DB_PASSWORD>@postgres:5432/nvwax?sslmode=disable

# 安全（必须修改默认值！）
JWT_SECRET=<32 字符随机字符串>
CROSS_AUTH_SECRET=<32 字符随机字符串>
ADMIN_JWT_SECRET=<32 字符随机字符串>
PC_SESSION_SECRET=<32 字符随机字符串>

# OIDC
OIDC_ISSUER=https://account.yourdomain.com
OIDC_PRIVATE_KEY_PATH=/etc/oidc/keys/private.pem

# 邮件
SMTP_HOST=<SMTP 服务器>
SMTP_PORT=587
SMTP_USER=<邮箱地址>
SMTP_PASS=<邮箱授权码>
SMTP_FROM=NvwaX <noreply@yourdomain.com>

# ========== 可选变量 ==========

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<Google Client ID>
GOOGLE_CLIENT_ID=<同上>
GOOGLE_CLIENT_SECRET=<Google Client Secret>

# GitHub OAuth
GITHUB_CLIENT_ID=<GitHub Client ID>
GITHUB_CLIENT_SECRET=<GitHub Client Secret>

# Facebook OAuth
FACEBOOK_APP_ID=<Facebook App ID>
FACEBOOK_APP_SECRET=<Facebook App Secret>

# AI 功能
DEEPSEEK_API_KEY=<DeepSeek API Key>

# 支付功能
STRIPE_SECRET_KEY=<Stripe Secret Key>

# ========== 高级配置 ==========

# Redis
REDIS_URL=redis://redis:6379

# Portal 静态文件目录
PORTAL_STATIC_DIR=/app/account-portal-out

# Cookie 配置（用于 SSO）
PC_SESSION_COOKIE_DOMAIN=.yourdomain.com

# Nginx 配置
NGINX_PORT=80
NGINX_SSL_PORT=443
```

### 7.3 目录结构说明

```
/opt/nvwax/                          # 项目根目录
├── .env                             # 环境变量配置文件
├── docker-compose.yml               # Docker Compose 配置
├── packages/
│   ├── nvwax-server/               # 后端代码
│   │   ├── src/                    # TypeScript 源码
│   │   ├── dist/                   # 编译后的 JavaScript
│   │   └── prisma/                 # 数据库 Schema
│   └── account-portal/             # Portal 前端代码
│       ├── src/                     # React 源码
│       └── out/                    # 静态导出文件
├── secrets/
│   └── oidc/                       # OIDC 密钥对
│       ├── private.pem             # 私钥（用于签名 JWT）
│       └── private.pem.pub.pem     # 公钥（用于验证 JWT）
├── account-portal-out/              # Portal 静态文件（部署后）
├── uploads/                         # 用户上传文件
└── docker/                         # Docker 相关配置
    └── nginx/
        └── conf.d/
            └── account.proclaw.cc.conf  # Nginx 站点配置
```

### 7.4 性能优化建议

1. **启用 Redis 缓存**：
   ```bash
   # 在 .env 中设置
   REDIS_URL=redis://redis:6379
   
   # 重启后端
   sudo docker compose restart backend
   ```

2. **配置 Nginx 缓存**：
   ```nginx
   # 在 Nginx 配置文件中添加
   proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=oidc_cache:10m max_size=1g;
   
   server {
     location /oauth/ {
       proxy_cache oidc_cache;
       proxy_cache_valid 200 5m;
       ...
     }
   }
   ```

3. **数据库优化**：
   ```bash
   # 定期清理过期数据
   sudo docker exec nvwax-postgres psql -U nvwax -d nvwax -c "
     DELETE FROM oidc_authorization_codes WHERE expires_at < NOW();
     DELETE FROM oidc_refresh_tokens WHERE expires_at < NOW();
   "
   ```

### 7.5 安全加固建议

1. **修改默认密码**：
   - 确保 `.env` 中所有密码/密钥都是强随机数
   - 不要提交 `.env` 文件到 Git

2. **启用 HTTPS**：
   - 使用 Let's Encrypt 证书（参考 3.6 节）
   - 配置 HTTP 到 HTTPS 重定向

3. **限制数据库访问**：
   ```bash
   # 修改 postgres 容器配置，只允许本地连接
   # 在 docker-compose.yml 中：
   postgres:
     ports:
       - "127.0.0.1:5432:5432"  # 只监听 localhost
   ```

4. **定期备份**：
   ```bash
   # 创建备份脚本
   cat > /opt/nvwax/scripts/backup.sh << 'EOF'
   #!/bin/bash
   BACKUP_DIR="/opt/backups"
   mkdir -p $BACKUP_DIR
   docker exec nvwax-postgres pg_dump -U nvwax nvwax | gzip > $BACKUP_DIR/db_$(date +%Y%m%d).sql.gz
   EOF
   
   chmod +x /opt/nvwax/scripts/backup.sh
   
   # 添加到 cron
   echo "0 2 * * * root /opt/nvwax/scripts/backup.sh" | sudo tee /etc/cron.d/nvwax-backup
   ```

5. **监控和告警**：
   - 使用 `docker compose ps` 定期检查容器状态
   - 配置日志收集（如 ELK、Loki）

---

## 📞 支持与反馈

如果你在部署过程中遇到问题，可以：

1. **查看日志**：
   ```bash
   sudo docker compose logs -f
   ```

2. **检查 GitHub Issues**：
   - 访问项目仓库，查看是否有类似问题

3. **联系维护团队**：
   - Email: admin@proclaw.cc
   - 或在项目仓库提交 Issue

---

**文档版本**：1.0  
**最后更新**：2026-06-21  
**适用版本**：NvwaX v1.3.0+
