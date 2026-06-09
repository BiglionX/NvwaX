# NvwaX 环境变量配置清单

## 必需环境变量

| 变量名 | 说明 | 示例值 | 部署位置 |
|--------|------|--------|----------|
| `DATABASE_URL` | PostgreSQL 数据库连接字符串 | `postgresql://nvwax:NvwaX@2024...@43.156.133.180:5432/nvwax` | 服务器 `.env` 或 Docker Compose |
| `JWT_SECRET` | JWT 签名密钥（至少32字符） | `your-secure-32-char-secret-key-here` | 服务器 `.env` 或 Docker Compose |
| `CROSS_AUTH_SECRET` | 与 ProClaw 跨服务认证的共享密钥 | `proclaw-nvwax-bridge-secret` | 服务器 `.env` 或 Docker Compose |

## 推荐设置的环境变量

| 变量名 | 说明 | 示例值 | 部署位置 |
|--------|------|--------|----------|
| `ADMIN_JWT_SECRET` | Admin 专属 JWT 签名（优先级高于 JWT_SECRET） | `admin-jwt-secret-key` | 服务器 `.env` 或 Docker Compose |
| `NODE_ENV` | 运行环境 | `production` | 服务器 `.env` 或 Docker Compose |
| `PORT` | 服务监听端口（默认 3001） | `3001` | 服务器 `.env` 或 Docker Compose |

## 可选环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `CORS_ALLOWED_ORIGINS` | CORS 白名单（逗号分隔） | `https://nvwax.proclaw.cc` |
| `FRONTEND_URL` | 前端 URL（用于 CORS） | `http://43.156.133.180:3000` |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | - |
| `DEEPSEEK_MODEL` | DeepSeek 模型名称 | `deepseek-v4-flash` |
| `REDIS_URL` | Redis 连接字符串 | `redis://redis:6379` |

## 腾讯云服务器部署配置步骤

项目部署在腾讯云服务器（IP: `43.156.133.180`），使用 Docker Compose 管理服务。

### 方法一：直接修改服务器上的 `.env` 文件

1. SSH 登录服务器：
   ```bash
   ssh ubuntu@43.156.133.180
   ```

2. 编辑项目目录下的 `.env` 文件：
   ```bash
   cd /opt/nvwax
   nano .env  # 或使用 vim
   ```

3. 确保以下变量已正确设置：
   ```env
   DATABASE_URL=postgresql://nvwax:NvwaX@2024Secure!@43.156.133.180:5432/nvwax
   JWT_SECRET=your-secure-32-char-secret-key-here
   CROSS_AUTH_SECRET=your-cross-auth-secret-here
   ADMIN_JWT_SECRET=your-admin-jwt-secret-here
   ```

4. 重启服务：
   ```bash
   cd /opt/nvwax
   docker-compose down && docker-compose up -d --build
   ```

### 方法二：使用部署包中的配置

项目根目录的 `deploy_package/.env` 包含最新的环境变量配置：

```bash
# 在服务器上
cd /opt/nvwax
cp deploy_package/.env .env
# 编辑实际值
nano .env
docker-compose down && docker-compose up -d --build
```

## 生成安全密钥的方法

```bash
# 方法1: 使用 openssl
openssl rand -base64 32

# 方法2: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 方法3: 使用 Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

## 验证部署

部署后检查服务状态：

```bash
# 检查容器状态
docker-compose ps

# 检查后端日志
docker-compose logs -f nvwax-server

# 测试健康检查
curl http://localhost:3001/health
```

## 常见问题

### Q: 服务无法启动？
A: 检查 Docker 日志中是否有 `FATAL: Missing required environment variables` 错误。

### Q: Admin 登录失败？
A: 新 token 格式需要有效的 JWT 签名。确保 `JWT_SECRET` 或 `ADMIN_JWT_SECRET` 设置正确，且与之前登录时的密钥一致（否则旧 token 会失效）。

### Q: CORS 错误？
A: 在 `CORS_ALLOWED_ORIGINS` 中添加你的前端域名。

### Q: 数据库连接失败？
A: 检查 `DATABASE_URL` 中的 IP 地址、端口、用户名密码是否正确。
