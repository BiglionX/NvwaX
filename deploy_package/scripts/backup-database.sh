#!/bin/bash
# NvwaX 数据库自动备份脚本
# 用法：添加到 crontab 中定时执行

set -e

# 配置
BACKUP_DIR="/home/ubuntu/NvwaX/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/nvwax_backup_$DATE.sql.gz"
RETENTION_DAYS=30  # 保留30天的备份

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 执行备份
echo "[$(date)] 开始备份数据库..."
docker exec nvwax-postgres pg_dump -U nvwax nvwax | gzip > "$BACKUP_FILE"

# 检查备份是否成功
if [ $? -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] 备份成功: $BACKUP_FILE ($BACKUP_SIZE)"
else
    echo "[$(date)] 备份失败!" | tee -a "$BACKUP_DIR/backup_errors.log"
    exit 1
fi

# 清理旧备份（保留最近30天）
echo "[$(date)] 清理 ${RETENTION_DAYS} 天前的备份..."
find "$BACKUP_DIR" -name "nvwax_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] 清理完成"

# 记录备份日志
echo "$DATE - $BACKUP_FILE ($BACKUP_SIZE)" >> "$BACKUP_DIR/backup_history.log"

echo "[$(date)] 备份任务完成"
