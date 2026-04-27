# NvwaX Docker 部署指南

本指南介绍如何使用 Docker 和 Docker Compose 部署 NvwaX 平台。

---

## 📋 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- Git

---

## 🚀 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/BigLionX/NvwaX.git
cd NvwaX
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件,修改以下配置:

```bash
# 数据库密码 (必须修改)
DB_PASSWORD=your-secure-password

# JWT Secret (必须修改)
JWT_SECRET=your-random-secret-key-minimum-32-characters
```

### 3. 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 4. 访问应用

- **前端**: http://localhost:3000
- **后端 API**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

---

## 🔧 常用命令

### 管理服务

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启特定服务
docker-compose restart backend

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 数据库管理

```bash
# 进入 PostgreSQL shell
docker-compose exec postgres psql -U nvwax -d nvwax

# 备份数据库
docker-compose exec postgres pg_dump -U nvwax nvwax > backup.sql

# 恢复数据库
cat backup.sql | docker-compose exec -T postgres psql -U nvwax -d nvwax
```

### 更新应用

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

---

## 🏗️ 架构说明

### 服务组件

| 服务 | 端口 | 说明 |
|------|------|------|
| postgres | 5432 | PostgreSQL 数据库 |
| redis | 6379 | Redis 缓存和速率限制 |
| backend | 3001 | Node.js API 服务器 |
| frontend | 3000 | Next.js Web 应用 |
| nginx | 80/443 | 反向代理 (可选) |

### 数据卷

- `postgres_data`: PostgreSQL 数据持久化
- `redis_data`: Redis 数据持久化

---

## 🔐 生产环境部署

### 1. 启用 HTTPS

取消 `docker/nginx/nginx.conf` 中的 SSL 配置注释:

```nginx
listen 443 ssl http2;
ssl_certificate /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/key.pem;
```

将证书文件放入 `docker/nginx/ssl/` 目录。

### 2. 启用 Nginx

```bash
docker-compose --profile production up -d
```

### 3. 强化安全

- 修改默认密码
- 使用强随机 JWT_SECRET
- 限制数据库访问IP
- 启用防火墙规则

### 4. 资源限制

在 `docker-compose.yml` 中添加资源限制:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## 📊 监控与日志

### 查看日志

```bash
# 所有服务日志
docker-compose logs -f

# 特定服务日志
docker-compose logs -f backend

# 最近100行
docker-compose logs --tail=100 backend
```

### 健康检查

```bash
# 检查服务健康状态
curl http://localhost:3001/health
curl http://localhost:3000/api/health
```

---

## 🔄 备份与恢复

### 备份

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
docker-compose exec postgres pg_dump -U nvwax nvwax > \
  $BACKUP_DIR/db_$TIMESTAMP.sql

# 备份 uploads
tar -czf $BACKUP_DIR/uploads_$TIMESTAMP.tar.gz ./uploads

echo "Backup completed: $TIMESTAMP"
```

### 恢复

```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore.sh <backup-file>"
  exit 1
fi

# 恢复数据库
cat $BACKUP_FILE | docker-compose exec -T postgres psql -U nvwax -d nvwax

echo "Restore completed"
```

---

## ⚙️ 自定义配置

### 修改端口

编辑 `.env` 文件:

```bash
BACKEND_PORT=8080
FRONTEND_PORT=80
DB_PORT=5433
```

### 添加额外服务

在 `docker-compose.yml` 中添加新服务:

```yaml
services:
  your-service:
    image: your-image
    ports:
      - "port:port"
    networks:
      - nvwax-network
```

---

## 🐛 故障排查

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs backend

# 检查容器状态
docker-compose ps

# 重新启动
docker-compose restart backend
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 是否运行
docker-compose ps postgres

# 查看 PostgreSQL 日志
docker-compose logs postgres

# 测试连接
docker-compose exec postgres psql -U nvwax -d nvwax -c "SELECT 1"
```

### 端口冲突

```bash
# 查看端口占用
lsof -i :3000
lsof -i :3001

# 修改 .env 中的端口配置
```

---

## 📝 环境变量参考

| 变量 | 默认值 | 说明 |
|------|--------|------|
| DB_NAME | nvwax | 数据库名称 |
| DB_USER | nvwax | 数据库用户 |
| DB_PASSWORD | changeme | 数据库密码 (必须修改) |
| DB_PORT | 5432 | 数据库端口 |
| BACKEND_PORT | 3001 | 后端端口 |
| FRONTEND_PORT | 3000 | 前端端口 |
| JWT_SECRET | - | JWT 密钥 (必须修改) |
| REDIS_PORT | 6379 | Redis 端口 |

---

## 🎯 性能优化

### 1. 使用多阶段构建

Dockerfile 已使用多阶段构建,减小镜像体积。

### 2. 启用缓存

```bash
# 使用 build cache
docker-compose build --no-cache
```

### 3. 资源限制

为每个服务设置合理的 CPU 和内存限制。

### 4. 日志轮转

在 `docker-compose.yml` 中配置:

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

---

## 🚀 下一步

- [Kubernetes 部署](./KUBERNETES-DEPLOYMENT.md)
- [CI/CD 配置](./CI-CD-SETUP.md)
- [监控告警](./MONITORING-SETUP.md)

---

© 2026 NvwaX Team. All rights reserved.
