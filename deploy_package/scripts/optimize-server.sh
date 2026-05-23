#!/bin/bash
# NvwaX 服务器优化脚本
# 执行：ssh ubuntu@43.156.133.180 'bash -s' < optimize-server.sh

set -e

echo "========================================="
echo "  NvwaX 服务器优化脚本"
echo "========================================="
echo ""

# 1. Docker权限配置
echo "[1/5] 配置Docker权限..."
sudo usermod -aG docker ubuntu 2>/dev/null || echo "用户已在docker组中"
echo "✅ Docker权限配置完成"
echo ""

# 2. Nginx配置
echo "[2/5] 配置Nginx反向代理..."
if [ ! -f /etc/nginx/sites-available/nvwax ]; then
    cat > /tmp/nvwax.conf << 'EOF'
server {
    listen 80;
    server_name _;
    
    access_log /var/log/nginx/nvwax_access.log;
    error_log /var/log/nginx/nvwax_error.log;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    client_max_body_size 50M;
}
EOF
    
    sudo cp /tmp/nvwax.conf /etc/nginx/sites-available/nvwax
    sudo ln -sf /etc/nginx/sites-available/nvwax /etc/nginx/sites-enabled/nvwax
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl reload nginx
    echo "✅ Nginx配置完成"
else
    echo "️  Nginx配置已存在，跳过"
fi
echo ""

# 3. 数据库备份配置
echo "[3/5] 配置数据库自动备份..."
mkdir -p ~/NvwaX/backups ~/NvwaX/scripts

cat > ~/NvwaX/scripts/backup-database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/NvwaX/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/nvwax_backup_$DATE.sql.gz"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[$(date)] 开始备份数据库..."
docker exec nvwax-postgres pg_dump -U nvwax nvwax | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] 备份成功: $BACKUP_FILE ($BACKUP_SIZE)"
else
    echo "[$(date)] 备份失败!" | tee -a "$BACKUP_DIR/backup_errors.log"
    exit 1
fi

find "$BACKUP_DIR" -name "nvwax_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "$DATE - $BACKUP_FILE ($BACKUP_SIZE)" >> "$BACKUP_DIR/backup_history.log"
echo "[$(date)] 备份任务完成"
EOF

chmod +x ~/NvwaX/scripts/backup-database.sh

# 设置定时任务（如果还没有）
if ! crontab -l 2>/dev/null | grep -q "backup-database.sh"; then
    (crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/NvwaX/scripts/backup-database.sh >> /home/ubuntu/NvwaX/backups/cron_backup.log 2>&1") | crontab -
    echo "✅ 定时备份任务已配置（每天凌晨2点）"
else
    echo "⚠️  定时备份任务已存在，跳过"
fi
echo ""

# 4. 防火墙配置
echo "[4/5] 配置防火墙..."
if ! sudo ufw status | grep -q "Status: active"; then
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw --force enable
    echo "✅ 防火墙已启用（允许端口: 22, 80, 443）"
else
    echo "⚠️  防火墙已启用，跳过"
fi
echo ""

# 5. 服务状态检查
echo "[5/5] 检查服务状态..."
echo ""
echo "Docker容器状态："
docker compose -f ~/NvwaX/docker-compose.yml ps
echo ""
echo "数据库团队数量："
docker exec nvwax-postgres psql -U nvwax -d nvwax -t -c "SELECT COUNT(*) FROM team_skills;"
echo ""

# 总结
echo "========================================="
echo "✅ 优化完成！"
echo "========================================="
echo ""
echo "访问地址："
echo "  - HTTP: http://43.156.133.180"
echo "  - 前端: http://43.156.133.180:3000"
echo "  - API:  http://43.156.133.180:3001"
echo ""
echo "备份位置: ~/NvwaX/backups/"
echo "备份日志: ~/NvwaX/backups/backup_history.log"
echo ""
echo "下次需要重新登录SSH以应用docker组权限"
echo "========================================="
