# NvwaX 部署指南

## 📋 当前状态

- ✅ 本地开发环境已就绪
- ✅ 20个Agent团队冷启动数据已导入本地数据库
- ❌ 尚未部署到生产服务器

## 🚀 部署选项

### 选项一：使用 Docker Compose 部署（推荐）

#### 1. 准备生产环境配置

创建 `.env.production` 文件：

```bash
# 数据库配置
DB_NAME=nvwax
DB_USER=nvwax
DB_PASSWORD=your_secure_password_here  # ⚠️ 必须修改为强密码！建议使用生成的随机密码
DB_PORT=5432

# 后端配置
BACKEND_PORT=3001
JWT_SECRET=your_production_jwt_secret_here  # ⚠️ 必须修改为随机字符串！
REDIS_URL=redis://redis:6379

# 前端配置
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=https://your-domain.com/api

# AI配置
DEEPSEEK_API_KEY=your_deepseek_api_key  # 如果使用DeepSeek API，需要填写真实密钥
```

**⚠️ 重要安全提示：**

1. **数据库密码** (`DB_PASSWORD`)：
   - 不要使用默认密码
   - 建议生成强密码：`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
   - 示例生成的密码：`QjWZM45tA5vWWbPO8j5jfUdFAL7Xo1WLam+OQO2oMb8=`

2. **JWT密钥** (`JWT_SECRET`)：
   - 必须使用随机字符串
   - 建议生成：`node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
   - 示例生成的密钥：`aKSv+L48Htop9ohkW9AEPExMzWLK4j6Sm+dtKKSmiS27NzaGn+bYJo5mkEnui9xW`

3. **保存好这些密码**：
   - 将生成的密码保存到安全的地方（如密码管理器）
   - 不要将 `.env.production` 文件提交到Git仓库

#### 2. 执行部署

```bash
# 构建并启动所有服务
docker-compose -f docker-compose.yml up -d --build

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 3. 导入冷启动数据

```bash
# 等待数据库启动
sleep 15

# 执行初始化脚本
docker-compose exec backend node scripts/init-database.js

# 导入团队数据
docker-compose exec backend node scripts/simple-import-teams.js
```

---

### 选项二：部署到远程服务器 (43.156.133.180)

#### 前提条件
1. 确保可以SSH连接到服务器
2. 服务器上已安装Docker和Docker Compose
3. 防火墙允许必要端口（5432, 3000, 3001）

#### 部署步骤

**步骤1：上传代码到服务器**

```bash
# 方法1：使用Git
ssh user@43.156.133.180
cd /opt
git clone https://github.com/your-repo/NvwaX.git
cd NvwaX

# 方法2：使用SCP上传
scp -r . user@43.156.133.180:/opt/NvwaX
```

**步骤2：配置环境变量**

```bash
ssh user@43.156.133.180
cd /opt/NvwaX
cp .env.example .env
# 编辑 .env 文件，设置正确的配置
nano .env
```

**步骤3：启动服务**

```bash
# 在服务器上执行
docker-compose up -d --build

# 等待服务启动
docker-compose ps
```

**步骤4：导入数据**

```bash
# 从本地导出数据
docker exec nvwax-postgres pg_dump -U nvwax nvwax > nvwax_backup.sql

# 上传到服务器
scp nvwax_backup.sql user@43.156.133.180:/opt/NvwaX/

# 在服务器上导入
ssh user@43.156.133.180
cd /opt/NvwaX
docker-compose exec postgres psql -U nvwax -d nvwax < nvwax_backup.sql
```

---

### 选项三：使用云平台部署

#### Railway 部署

1. 连接GitHub仓库到Railway
2. 配置环境变量
3. 添加PostgreSQL插件
4. 部署会自动进行

#### Render 部署

1. 创建Web Service
2. 配置构建命令：`pnpm install && pnpm build`
3. 配置启动命令：`pnpm start`
4. 添加PostgreSQL数据库

#### Vercel + Neon 部署

1. 前端部署到Vercel
2. 后端部署到Render/Railway
3. 数据库使用Neon PostgreSQL

---

## 🔧 部署后验证

### 1. 检查服务状态

```bash
# 检查所有容器运行状态
docker-compose ps

# 应该看到：
# - nvwax-postgres: running
# - nvwax-backend: running  
# - nvwax-frontend: running
```

### 2. 验证数据库

```bash
# 连接数据库
docker-compose exec postgres psql -U nvwax -d nvwax

# 检查团队数据
SELECT COUNT(*) FROM team_skills;
-- 应该返回 20

SELECT category, COUNT(*) FROM team_skills GROUP BY category;
-- 应该显示5个分类
```

### 3. 测试API

```bash
# 测试后端API
curl http://localhost:3001/api/health

# 测试团队列表API
curl http://localhost:3001/api/team-skills
```

### 4. 访问前端

打开浏览器访问：
- 本地：http://localhost:3000
- 服务器：http://your-server-ip:3000

---

## 📝 重要提示

### 安全建议

1. **修改默认密码**：
   ```bash
   # 生成强密码
   openssl rand -base64 32
   ```

2. **配置HTTPS**：
   - 使用Let's Encrypt免费证书
   - 配置Nginx反向代理

3. **防火墙设置**：
   ```bash
   # 只开放必要端口
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw allow 22/tcp
   ufw enable
   ```

### 备份策略

```bash
# 创建备份脚本 backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec nvwax-postgres pg_dump -U nvwax nvwax > backup_$DATE.sql
gzip backup_$DATE.sql

# 设置定时任务（每天凌晨2点备份）
crontab -e
0 2 * * * /path/to/backup.sh
```

### 监控和维护

```bash
# 查看资源使用情况
docker stats

# 清理未使用的资源
docker system prune -a

# 更新服务
docker-compose pull
docker-compose up -d
```

---

## 🆘 故障排查

### 问题1：容器无法启动

```bash
# 查看日志
docker-compose logs [service-name]

# 检查端口占用
netstat -tulpn | grep :5432
```

### 问题2：数据库连接失败

```bash
# 检查数据库是否运行
docker-compose exec postgres pg_isready

# 重启数据库
docker-compose restart postgres
```

### 问题3：数据丢失

```bash
# 从备份恢复
gunzip backup_20260523.sql.gz
docker-compose exec -T postgres psql -U nvwax -d nvwax < backup_20260523.sql
```

---

## 🎯 推荐部署方案

对于您的情况，我建议：

1. **短期**：继续使用本地Docker开发和测试
2. **中期**：部署到云服务器（如阿里云、腾讯云）
3. **长期**：考虑使用云平台（Railway/Render）简化运维

需要我帮您执行具体的部署操作吗？
