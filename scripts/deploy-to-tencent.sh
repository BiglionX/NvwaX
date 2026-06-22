#!/usr/bin/env bash
# =======================================
# NvwaX 腾讯云服务器部署脚本
# 使用方法：
#   1. 在本地运行：bash scripts/deploy-to-tencent.sh
#   2. 或 SSH 到服务器后运行：bash /opt/nvwax/scripts/deploy-to-tencent.sh
# =======================================

set -euo pipefail

# ---- 颜色输出 ----
RED='\033[1;31m'
GRN='\033[1;32m'
CYN='\033[1;36m'
YLW='\033[1;33m'
RST='\033[0m'

log() { printf "${CYN}▶ %s${RST}\n" "$*"; }
ok()  { printf "${GRN}✓ %s${RST}\n" "$*"; }
warn(){ printf "${YLW}⚠ %s${RST}\n" "$*"; }
err() { printf "${RED}✗ %s${RST}\n" "$*" >&2; exit 1; }

# ---- 配置 ----
SERVER_IP="43.156.133.180"
SERVER_USER="ubuntu"
SERVER_DIR="/opt/nvwax"
PROJECT_NAME="NvwaX v2.2.0"

# =======================================
# 本地操作（可选）
# =======================================
DEPLOY_FROM_LOCAL=${DEPLOY_FROM_LOCAL:-false}

if [ "$DEPLOY_FROM_LOCAL" = "true" ]; then
    log "从本地部署到腾讯云服务器..."
    
    # 检查 SSH 连通性
    log "检查 SSH 连接..."
    if ! ssh -q -o ConnectTimeout=5 ${SERVER_USER}@${SERVER_IP} exit; then
        err "无法连接到服务器 ${SERVER_IP}，请检查网络连接和 SSH 配置"
    fi
    ok "SSH 连接正常"
    
    # 在远程服务器上运行部署
    log "在远程服务器上运行部署脚本..."
    ssh ${SERVER_USER}@${SERVER_IP} "bash ${SERVER_DIR}/scripts/deploy-to-tencent.sh"
    
    exit 0
fi

# =======================================
# 服务器端操作
# =======================================

log "开始部署 ${PROJECT_NAME} 到服务器..."

# ---- 1. 检查目录 ----
log "[1/8] 检查项目目录"
if [ ! -d "${SERVER_DIR}" ]; then
    err "项目目录 ${SERVER_DIR} 不存在，请先克隆仓库"
fi

cd ${SERVER_DIR} || err "无法进入目录 ${SERVER_DIR}"

ok "项目目录检查通过"

# ---- 2. 拉取最新代码 ----
log "[2/8] 拉取最新代码"
git fetch origin main
git reset --hard origin/main
git pull origin main

ok "代码已更新到最新版本"

# ---- 3. 检查环境变量 ----
log "[3/8] 检查环境变量配置"

# 必需的环境变量
REQUIRED_VARS=(
    "JWT_SECRET"
    "CROSS_AUTH_SECRET"
    "DATABASE_URL"
    "GITHUB_CLIENT_ID"
    "GITHUB_CLIENT_SECRET"
    "GOOGLE_CLIENT_ID"
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env 2>/dev/null; then
        MISSING_VARS+=("${var}")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    warn "以下环境变量未配置："
    for var in "${MISSING_VARS[@]}"; do
        echo "  - ${var}"
    done
    echo ""
    warn "请编辑 ${SERVER_DIR}/.env 文件并配置这些变量"
    echo ""
    echo "是否现在编辑 .env 文件？(y/n)"
    read -t 30 -n 1 EDIT_NOW
    echo ""
    
    if [ "$EDIT_NOW" = "y" ] || [ "$EDIT_NOW" = "Y" ]; then
        nano .env
    else
        err "请先配置环境变量后再运行部署"
    fi
fi

ok "环境变量检查通过"

# ---- 4. 生成 OIDC 密钥（如果需要） ----
log "[4/8] 检查 OIDC 密钥"
if [ ! -f "/etc/oidc/keys/private.pem" ]; then
    log "生成 OIDC RSA-2048 密钥对..."
    bash scripts/generate-oidc-keys.sh
    ok "OIDC 密钥已生成"
else
    ok "OIDC 密钥已存在"
fi

# ---- 5. 执行数据库迁移（v2.2.0 新增） ----
log "[5/8] 执行数据库迁移"

# 检查迁移脚本是否存在
MIGRATION_FILE="packages/nvwax-server/migrations/030_creation_state_machine.sql"
if [ -f "${MIGRATION_FILE}" ]; then
    log "发现 v2.2.0 数据库迁移文件"
    
    # 从 .env 获取数据库连接字符串
    if grep -q "^DATABASE_URL=" .env; then
        DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2-)
        
        # 提取 PostgreSQL 连接参数
        DB_HOST=$(echo ${DATABASE_URL} | sed -n 's|.*://[^@]*@\([^:]*\):.*|\1|p')
        DB_PORT=$(echo ${DATABASE_URL} | sed -n 's|.*://[^@]*@[^:]*:\([0-9]*\)/.*|\1|p')
        DB_NAME=$(echo ${DATABASE_URL} | sed -n 's|.*/\([^?]*\).*|\1|p')
        DB_USER=$(echo ${DATABASE_URL} | sed -n 's|.*://\([^:]*\):.*|\1|p')
        DB_PASS=$(echo ${DATABASE_URL} | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
        
        log "执行迁移: ${MIGRATION_FILE}"
        PGPASSWORD=${DB_PASS} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f ${MIGRATION_FILE} 2>&1 | grep -v "^$" || true
        
        ok "数据库迁移完成"
    else
        warn "未找到 DATABASE_URL，跳过数据库迁移"
    fi
else
    log "未发现数据库迁移文件，跳过"
fi

# ---- 6. 停止旧容器 ----
log "[6/8] 停止旧容器"
docker compose down || true

ok "旧容器已停止"

# ---- 7. 构建并启动新容器 ----
log "[7/8] 构建并启动新容器"
log "（这可能需要几分钟，请耐心等待...）"

# 构建前端时传入 GitHub OAuth 环境变量
export NEXT_PUBLIC_GITHUB_CLIENT_ID=$(grep "^NEXT_PUBLIC_GITHUB_CLIENT_ID=" .env | cut -d'=' -f2)

docker compose --env-file .env up -d --build

ok "容器已启动"

# ---- 8. 健康检查 ----
log "[8/8] 健康检查"

# 等待服务启动
log "等待服务启动..."
sleep 30

# 检查容器状态
log "检查容器状态..."
docker compose ps

# 检查后端健康状态
log "检查后端健康状态..."
for i in {1..5}; do
    if curl -f http://localhost:3001/health 2>/dev/null; then
        ok "后端健康检查通过"
        break
    else
        if [ $i -eq 5 ]; then
            warn "后端健康检查失败，请查看日志"
            docker compose logs backend --tail 100
        else
            log "等待后端启动... ($i/5)"
            sleep 10
        fi
    fi
done

# 检查 v2.2.0 MCP 端点
log "检查 v2.2.0 MCP 端点..."
if curl -f http://localhost:3001/api/mcp/health 2>/dev/null; then
    ok "MCP 端点正常"
else
    warn "MCP 端点不可用（可选功能）"
fi

# 检查 v2.2.0 状态机路由
log "检查 v2.2.0 状态机路由..."
if curl -f http://localhost:3001/api/aiteam-state-machine/graph 2>/dev/null; then
    ok "状态机路由正常"
else
    warn "状态机路由不可用（可选功能）"
fi

# 检查前端是否可访问
log "检查前端是否可访问..."
for i in {1..5}; do
    if curl -f http://localhost:3000 2>/dev/null; then
        ok "前端可访问"
        break
    else
        if [ $i -eq 5 ]; then
            warn "前端健康检查失败，请查看日志"
            docker compose logs frontend --tail 100
        else
            log "等待前端启动... ($i/5)"
            sleep 10
        fi
    fi
done

# =======================================
# 部署完成
# =======================================

ok "✅ ${PROJECT_NAME} 部署完成！"

echo ""
echo "=========================================="
echo "部署信息："
echo "  前端: http://${SERVER_IP}:3000"
echo "  后端: http://${SERVER_IP}:3001"
echo "  数据库: postgresql://localhost:5432/nvwax"
echo "  Redis: localhost:6379"
echo ""
echo "v2.2.0 新功能："
echo "  Agent 向导: http://${SERVER_IP}:3000/marketplace (点击'创建智能体')"
echo "  状态机模式: http://${SERVER_IP}:3000/nvwa (切换到'状态机'模式)"
echo "  测试页面:   http://${SERVER_IP}:3000/test-v22 (仅开发环境)"
echo ""
echo "API 端点："
echo "  MCP 健康检查: http://${SERVER_IP}:3001/api/mcp/health"
echo "  状态机图定义: http://${SERVER_IP}:3001/api/aiteam-state-machine/graph"
echo ""
echo "测试社交登录："
echo "  1. 访问 http://${SERVER_IP}:3000/login"
echo "  2. 点击 '使用 GitHub 登录' 按钮"
echo "  3. 点击 '使用 Google 登录' 按钮"
echo ""
echo "查看日志："
echo "  docker compose logs -f"
echo "  docker compose logs -f backend"
echo "  docker compose logs -f frontend"
echo "=========================================="

exit 0
