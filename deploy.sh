#!/bin/bash
# NvwaX 本地部署脚本
# 用法: ./deploy.sh

set -e

# 配置
SERVER_USER="ubuntu"
SERVER_HOST="43.156.133.180"
SERVER_DIR="/opt/nvwax"

echo "======================================"
echo "  NvwaX 本地部署脚本"
echo "======================================"
echo ""

# 1. 构建前端和后端
echo " Building project..."
npm run build

# 2. 同步代码到服务器
echo " Syncing code to server..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'dist' \
  --exclude '.git' \
  --exclude '.env' \
  ./ ${SERVER_USER}@${SERVER_HOST}:${SERVER_DIR}/

# 3. SSH 执行部署命令
echo "🚀 Deploying on server..."
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
  cd /opt/nvwax
  
  echo "📥 Pulling latest changes..."
  git pull origin main || echo "Not a git repo, skipping..."
  
  echo " Installing dependencies..."
  npm install --production
  
  echo "🧹 Cleaning old Docker resources..."
  docker system prune -a -f --volumes 2>/dev/null || true
  docker builder prune -a -f 2>/dev/null || true
  
  echo " Stopping old containers..."
  docker-compose down
  
  echo " Building and starting containers..."
  docker-compose up -d --build
  
  echo " Waiting for services..."
  sleep 15
  
  echo " Checking services..."
  docker-compose ps
  
  echo " Health check..."
  curl -f http://localhost:3001/health || echo " Backend not ready yet"
  curl -f http://localhost:3000/api/health || echo " Frontend not ready yet"
  
  echo "✅ Deployment completed!"
EOF

echo ""
echo "======================================"
echo "  部署完成！"
echo "  访问: http://${SERVER_HOST}:3000"
echo "======================================"
