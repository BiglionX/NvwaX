# NvwaX 环境配置指南

本文档详细说明如何配置 NvwaX 项目的环境变量。

---

## 📋 快速开始

### 1. 创建 .env 文件

```powershell
# PowerShell
Copy-Item .env.example .env
```

### 2. 编辑 .env 文件

使用文本编辑器打开 `.env` 文件，修改以下关键配置。

---

## 🔑 必须配置的关键变量

### 数据库配置

```env
# 数据库名称（可保持默认）
DB_NAME=nvwax

# 数据库用户名（可保持默认）
DB_USER=nvwax

# ⚠️ 数据库密码 - 必须修改为强密码
DB_PASSWORD=your-secure-password-here
```

**密码要求**:
- 至少 12 个字符
- 包含大小写字母、数字和特殊字符
- 示例: `NvwaX@2026#Secure!Pass`

### JWT 密钥配置

```env
# ⚠️ JWT 密钥 - 必须修改为强随机字符串
JWT_SECRET=change-this-to-a-secure-random-string-minimum-32-characters
```

**生成安全密钥的方法**:

#### 方法 1: 使用 Node.js
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### 方法 2: 使用 PowerShell
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

#### 方法 3: 在线生成器
访问 https://generate-secret.vercel.app/64

**密钥要求**:
- 至少 32 个字符
- 完全随机
- 不要使用有意义的单词

### API URL 配置

```env
# 前端访问后端的地址
# 开发环境: http://localhost:3001
# 生产环境: https://api.yourdomain.com
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 🔧 可选配置

### 端口配置

```env
# 后端 API 端口（默认 3001）
BACKEND_PORT=3001

# 前端应用端口（默认 3000）
FRONTEND_PORT=3000

# 数据库端口（默认 5432）
DB_PORT=5432

# Redis 端口（默认 6379）
REDIS_PORT=6379
```

**注意**: 如果端口被占用，可以修改为其他可用端口。

### Redis 配置

```env
# Redis 连接字符串（Docker 内部网络）
REDIS_URL=redis://redis:6379
```

---

## 🌍 不同环境的配置示例

### 开发环境 (.env.development)

```env
DB_NAME=nvwax_dev
DB_USER=nvwax
DB_PASSWORD=dev_password_123
JWT_SECRET=dev-jwt-secret-key-for-development-only-not-for-production
NEXT_PUBLIC_API_URL=http://localhost:3001
BACKEND_PORT=3001
FRONTEND_PORT=3000
```

### 测试环境 (.env.test)

```env
DB_NAME=nvwax_test
DB_USER=nvwax
DB_PASSWORD=test_password_456
JWT_SECRET=test-jwt-secret-key-for-testing-only-not-for-production
NEXT_PUBLIC_API_URL=http://localhost:3001
BACKEND_PORT=3001
FRONTEND_PORT=3000
```

### 生产环境 (.env.production)

```env
DB_NAME=nvwax_prod
DB_USER=nvwax_prod_user
DB_PASSWORD=SuperSecureP@ssw0rd!2026#Prod
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0
NEXT_PUBLIC_API_URL=https://api.nvwax.com
BACKEND_PORT=3001
FRONTEND_PORT=3000
```

---

## 🔒 安全最佳实践

### 1. 永远不要提交 .env 文件

`.env` 文件已在 `.gitignore` 中，确保不要手动移除。

```bash
# 检查 .env 是否被忽略
git check-ignore .env
```

### 2. 使用不同的密钥

- 开发、测试、生产环境使用不同的密钥
- 定期轮换密钥（建议每 90 天）

### 3. 限制环境变量访问

在 Docker Compose 中，只传递必要的环境变量：

```yaml
environment:
  - DATABASE_URL
  - JWT_SECRET
  # 不要传递不必要的变量
```

### 4. 使用密钥管理服务（生产环境）

对于生产环境，考虑使用：
- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault
- Docker Secrets

---

## 🐳 Docker 环境变量

### 方式 1: 使用 .env 文件（推荐）

Docker Compose 会自动读取项目根目录的 `.env` 文件。

### 方式 2: 使用 docker-compose.yml 中的 environment

```yaml
services:
  backend:
    environment:
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
```

### 方式 3: 使用 docker run 的 -e 参数

```bash
docker run -e DB_PASSWORD=secret -e JWT_SECRET=key ...
```

---

## ✅ 验证配置

### 1. 检查 .env 文件格式

确保没有语法错误：
- 每行一个变量
- 使用 `KEY=value` 格式
- 值不需要引号（除非包含空格）
- 注释使用 `#`

### 2. 测试数据库连接

```bash
docker-compose up postgres
docker-compose exec postgres pg_isready -U nvwax -d nvwax
```

### 3. 测试后端启动

```bash
docker-compose up backend
docker-compose logs backend
```

应该看到类似输出：
```
Server running on port 3001
Database connected successfully
```

### 4. 测试前端连接

访问 http://localhost:3000，检查是否能正常加载。

---

## ❓ 常见问题

### Q1: 如何生成安全的随机密码？

**PowerShell**:
```powershell
Add-Type -AssemblyName System.Web
[System.Web.Security.Membership]::GeneratePassword(16, 4)
```

**Node.js**:
```bash
node -e "console.log(require('crypto').randomBytes(12).toString('base64'))"
```

### Q2: 忘记了 JWT 密钥怎么办？

重新生成一个新密钥并更新 `.env` 文件：
```bash
# 所有已登录用户需要重新登录
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Q3: 端口被占用怎么办？

修改 `.env` 中的端口配置：
```env
BACKEND_PORT=3002
FRONTEND_PORT=3003
DB_PORT=5433
REDIS_PORT=6380
```

### Q4: 如何在多个环境间切换？

创建不同的环境文件：
```
.env.development
.env.staging
.env.production
```

使用时复制对应的文件：
```powershell
Copy-Item .env.production .env
```

---

## 📞 需要帮助？

- 查看 `DEPLOYMENT-PREPARATION-COMPLETE.md` 获取完整部署指南
- 查看 `docker-compose.yml` 了解服务配置
- 检查 Docker 日志: `docker-compose logs [service-name]`

---

**最后更新**: 2026-04-26  
**版本**: 1.0.0
