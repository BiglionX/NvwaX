# NvwaX 服务器维护指南

## 📋 服务器信息

- **IP地址**: 43.156.133.180
- **用户名**: ubuntu
- **SSH密钥**: `~/.ssh/id_ed25519`
- **项目目录**: `/home/ubuntu/NvwaX`

---

##  快速访问

### Web访问
- **主页**: http://43.156.133.180 (通过Nginx)
- **前端**: http://43.156.133.180:3000
- **后端API**: http://43.156.133.180:3001
- **API文档**: http://43.156.133.180/api/team-skills

### SSH连接
```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@43.156.133.180
```

---

## 📊 服务状态检查

### 查看所有容器
```bash
cd ~/NvwaX
docker compose ps
```

### 查看服务日志
```bash
# 后端日志
docker logs nvwax-backend --tail 100

# 前端日志
docker logs nvwax-frontend --tail 100

# 数据库日志
docker logs nvwax-postgres --tail 50
```

### 检查数据库
```bash
# 连接数据库
docker exec -it nvwax-postgres psql -U nvwax -d nvwax

# 查看团队数量
SELECT COUNT(*) FROM team_skills;

# 查看团队分类
SELECT category, COUNT(*) FROM team_skills GROUP BY category;

# 退出
\q
```

---

##  服务管理

### 重启服务
```bash
cd ~/NvwaX

# 重启所有服务
docker compose restart

# 重启单个服务
docker compose restart backend
docker compose restart frontend
docker compose restart postgres
```

### 停止/启动服务
```bash
# 停止所有服务
docker compose down

# 启动所有服务
docker compose up -d

# 查看实时日志
docker compose logs -f
```

### 更新服务
```bash
# 拉取最新代码
cd ~/NvwaX
git pull

# 重新构建并启动
docker compose up -d --build

# 查看更新日志
docker compose logs -f backend
```

---

## 💾 数据库备份与恢复

### 手动备份
```bash
# 执行备份脚本
~/NvwaX/scripts/backup-database.sh

# 查看备份文件
ls -lh ~/NvwaX/backups/

# 查看备份历史
cat ~/NvwaX/backups/backup_history.log
```

### 自动备份
- **时间**: 每天凌晨 2:00
- **保留**: 30天
- **位置**: `~/NvwaX/backups/`

查看定时任务：
```bash
crontab -l
```

### 恢复数据库
```bash
# 1. 停止应用（可选，避免写入冲突）
docker compose stop backend frontend

# 2. 恢复备份（替换 YOUR_BACKUP_FILE）
gunzip ~/NvwaX/backups/YOUR_BACKUP_FILE.sql.gz
docker exec -i nvwax-postgres psql -U nvwax -d nvwax < ~/NvwaX/backups/YOUR_BACKUP_FILE.sql

# 3. 重新启动应用
docker compose start backend frontend
```

---

## 🔧 故障排查

### 常见问题

#### 1. 前端服务显示 unhealthy
**原因**: Next.js缓存权限问题  
**解决**:
```bash
docker compose restart frontend
# 等待1-2分钟让健康检查通过
```

#### 2. 无法访问服务
**检查步骤**:
```bash
# 1. 检查容器状态
docker compose ps

# 2. 检查防火墙
sudo ufw status

# 3. 检查Nginx状态
sudo systemctl status nginx
sudo nginx -t

# 4. 查看Nginx日志
sudo tail -f /var/log/nginx/nvwax_error.log
```

#### 3. 数据库连接失败
**解决**:
```bash
# 重启数据库
docker compose restart postgres

# 检查数据库日志
docker logs nvwax-postgres --tail 50

# 测试连接
docker exec nvwax-postgres pg_isready
```

#### 4. 磁盘空间不足
**检查**:
```bash
# 查看磁盘使用
df -h

# 查看Docker占用
docker system df

# 清理未使用的资源
docker system prune -a --volumes
```

---

## 🔐 安全配置

### 防火墙规则
当前开放端口：
- **22/tcp**: SSH
- **80/tcp**: HTTP (Nginx)
- **443/tcp**: HTTPS (准备中)

查看防火墙状态：
```bash
sudo ufw status
```

### 密码管理
**重要文件**（在本地电脑）：
- `.env.production` - 生产环境配置
- `PASSWORD_RECORD.md` - 密码记录

**不要将这些文件上传到服务器或Git仓库！**

### 配置HTTPS（待配置）
当准备好域名后：
```bash
# 1. 安装Certbot
sudo apt-get install certbot python3-certbot-nginx

# 2. 申请证书（替换 yourdomain.com）
sudo certbot --nginx -d yourdomain.com

# 3. 自动续期
sudo certbot renew --dry-run
```

---

## 📈 监控与维护

### 资源监控
```bash
# 查看容器资源使用
docker stats

# 查看系统资源
htop  # 或 top

# 查看磁盘I/O
iostat -x 1
```

### 日志管理
```bash
# 查看应用日志
docker logs nvwax-backend --tail 200

# 查看Nginx访问日志
sudo tail -f /var/log/nginx/nvwax_access.log

# 查看Nginx错误日志
sudo tail -f /var/log/nginx/nvwax_error.log
```

### 定期维护任务
- [ ] **每周**: 检查磁盘空间和日志大小
- [ ] **每月**: 检查系统更新和Docker镜像更新
- [ ] **每季度**: 审查备份文件，确认备份有效
- [ ] **每半年**: 更新SSL证书（如已配置）

---

##  常用命令速查

```bash
# SSH连接
ssh -i ~/.ssh/id_ed25519 ubuntu@43.156.133.180

# 查看服务状态
cd ~/NvwaX && docker compose ps

# 重启服务
docker compose restart

# 查看日志
docker logs -f nvwax-backend

# 手动备份
~/NvwaX/scripts/backup-database.sh

# 检查数据库
docker exec nvwax-postgres psql -U nvwax -d nvwax -c "SELECT COUNT(*) FROM team_skills;"

# 更新代码并重新部署
cd ~/NvwaX && git pull && docker compose up -d --build
```

---

## 📞 紧急联系

### 关键信息
- **服务器IP**: 43.156.133.180
- **数据库端口**: 5432
- **后端端口**: 3001
- **前端端口**: 3000
- **Nginx端口**: 80, 443

### 备份位置
- **本地备份**: `~/NvwaX/backups/`
- **备份历史**: `~/NvwaX/backups/backup_history.log`
- **错误日志**: `~/NvwaX/backups/backup_errors.log`

---

## 📝 变更记录

### 2026-05-23
- ✅ 部署20个Agent团队冷启动数据
- ✅ 配置Nginx反向代理
- ✅ 配置数据库自动备份（每天凌晨2点）
- ✅ 启用防火墙（端口22, 80, 443）
- ✅ 将ubuntu用户加入docker组

---

**最后更新**: 2026-05-23  
**维护人员**: 请在此记录您的联系信息
