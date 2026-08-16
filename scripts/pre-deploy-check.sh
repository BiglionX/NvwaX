#!/usr/bin/env bash
# =======================================
# NvwaX 部署前预检查脚本
# 在服务器上运行：bash scripts/pre-deploy-check.sh
# =======================================

set -euo pipefail

# ---- 颜色输出 ----
RED='\033[1;31m'
GRN='\033[1;32m'
CYN='\033[1;36m'
YLW='\033[1;33m'
RST='\033[0m'

log()  { printf "${CYN}▶ %s${RST}\n" "$*"; }
ok()   { printf "${GRN}✓ %s${RST}\n" "$*"; }
warn(){ printf "${YLW}⚠ %s${RST}\n" "$*"; }
err()  { printf "${RED}✗ %s${RST}\n" "$*" >&2; }

# ---- 配置 ----
SERVER_IP="43.156.133.180"
PROJECT_DIR="${PROJECT_DIR:-/opt/nvwax}"

# =======================================
# 开始检查
# =======================================
echo ""
echo "=========================================="
echo "  NvwaX 部署前预检查"
echo "=========================================="
echo ""

# ---- 0. 基础校验 ----
log "[0/8] 基础校验"
if [ "$EUID" -ne 0 ]; then
    warn "建议用 sudo 运行：sudo bash $0"
fi

if [ ! -d "$PROJECT_DIR" ]; then
    err "项目目录 $PROJECT_DIR 不存在"
    echo "  请先克隆仓库："
    echo "    sudo mkdir -p $PROJECT_DIR"
    echo "    sudo chown ubuntu:ubuntu $PROJECT_DIR"
    echo "    git clone https://github.com/BiglionX/NvwaX.git $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR" || err "无法进入目录 $PROJECT_DIR"
ok "项目目录检查通过"

# ---- 1. 检查代码版本 ----
log "[1/8] 检查代码版本"
if [ ! -d ".git" ]; then
    err "不是 Git 仓库"
fi

CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
REMOTE_COMMIT=$(git fetch origin main >/dev/null 2>&1; git rev-parse --short origin/main 2>/dev/null || echo "unknown")

echo "  本地提交: $CURRENT_COMMIT"
echo "  远程提交: $REMOTE_COMMIT"

if [ "$CURRENT_COMMIT" != "$REMOTE_COMMIT" ]; then
    warn "本地代码不是最新版本"
    echo "  运行：git pull origin main"
    echo ""
    read -p "是否现在拉取最新代码？(y/n) " -n 1 -r
    echo ""
    if [ "$REPLY" = "y" ] || [ "$REPLY" = "Y" ]; then
        log "拉取最新代码..."
        git fetch origin main
        git reset --hard origin/main
        git pull origin main
        ok "代码已更新到最新版本"
    fi
else
    ok "代码已是最新版本"
fi

# ---- 2. 检查环境变量 ----
log "[2/8] 检查环境变量配置"

REQUIRED_VARS=(
    "JWT_SECRET"
    "CROSS_AUTH_SECRET"
    "DATABASE_URL"
    "GITHUB_CLIENT_ID"
    "GITHUB_CLIENT_SECRET"
    "GOOGLE_CLIENT_ID"
    "NEXT_PUBLIC_GITHUB_CLIENT_ID"
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID"
)

MISSING_VARS=()
WEAK_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    # 检查 .env 文件
    value=$(grep "^${var}=" .env 2>/dev/null | cut -d'=' -f2- | sed 's/^["'"'"'"']//;s/["'"'"'"']$//')
    
    if [ -z "$value" ]; then
        MISSING_VARS+=("${var}")
    elif [[ "$value" == *"your-"* ]] || [[ "$value" == *"change-me"* ]] || [[ "$value" == *"replace-me"* ]]; then
        WEAK_VARS+=("${var}")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    err "以下环境变量未配置："
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "  请编辑 $PROJECT_DIR/.env 文件并配置这些变量"
    exit 1
fi

if [ ${#WEAK_VARS[@]} -gt 0 ]; then
    warn "以下环境变量可能使用了示例值："
    for var in "${WEAK_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    read -p "是否继续部署？(y/n) " -n 1 -r
    echo ""
    if [ "$REPLY" != "y" ] && [ "$REPLY" != "Y" ]; then
        err "请先修改示例值为真实值"
    fi
fi

ok "环境变量检查通过"

# ---- 3. 检查 Docker ----
log "[3/8] 检查 Docker 状态"

if ! command -v docker &> /dev/null; then
    err "Docker 未安装"
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    err "Docker Compose 未安装"
fi

# 检查 Docker 服务
if ! systemctl is-active --quiet docker; then
    warn "Docker 服务未运行，正在启动..."
    systemctl start docker
    sleep 3
fi

ok "Docker 检查通过"

# ---- 4. 检查磁盘空间 ----
log "[4/8] 检查磁盘空间"

DISK_USAGE=$(df -h "$PROJECT_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
AVAILABLE=$(df -h "$PROJECT_DIR" | awk 'NR==2 {print $4}')

echo "  磁盘使用率: ${DISK_USAGE}%"
echo "  可用空间: ${AVAILABLE}"

if [ "$DISK_USAGE" -gt 85 ]; then
    warn "磁盘空间不足（使用率 ${DISK_USAGE}%）"
    echo "  建议清理 Docker 缓存："
    echo "    docker system prune -af"
    echo "    docker builder prune -af"
    
    read -p "是否现在清理 Docker 缓存？(y/n) " -n 1 -r
    echo ""
    if [ "$REPLY" = "y" ] || [ "$REPLY" = "Y" ]; then
        log "清理 Docker 缓存..."
        docker system prune -af
        docker builder prune -af
        ok "Docker 缓存已清理"
    fi
else
    ok "磁盘空间充足（使用率 ${DISK_USAGE}%，可用 ${AVAILABLE}）"
fi

# ---- 5. 检查端口占用 ----
log "[5/8] 检查端口占用"

PORTS=(3000 3001 5432 6379)

for port in "${PORTS[@]}"; do
    if netstat -tuln 2>/dev/null | grep -q ":${port} "; then
        # 检查是否是我们的容器占用
        if docker ps --format '{{.Ports}}' 2>/dev/null | grep -q ":${port}->"; then
            ok "端口 ${port} 被 Docker 容器占用（正常）"
        else
            warn "端口 ${port} 被其他进程占用"
            netstat -tuln | grep ":${port} "
        fi
    else
        ok "端口 ${port} 未被占用"
    fi
done

# ---- 6. 检查数据库连接 ----
log "[6/8] 检查数据库连接"

# 从 .env 文件读取数据库配置
DB_HOST=$(grep "^DB_HOST=" .env 2>/dev/null | cut -d'=' -f2 || echo "localhost")
DB_PORT=$(grep "^DB_PORT=" .env 2>/dev/null | cut -d'=' -f2 || echo "5432")
DB_USER=$(grep "^DB_USER=" .env 2>/dev/null | cut -d'=' -f2 || echo "nvwax")
DB_NAME=$(grep "^DB_NAME=" .env 2>/dev/null | cut -d'=' -f2 || echo "nvwax")

echo "  数据库: ${DB_HOST}:${DB_PORT}/${DB_NAME} (用户: ${DB_USER})"

# 检查 PostgreSQL 容器
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "postgres"; then
    ok "PostgreSQL 容器正在运行"
    
    # 测试连接
    if docker exec $(docker ps --format '{{.Names}}' | grep postgres) pg_isready -U "$DB_USER" >/dev/null 2>&1; then
        ok "数据库连接正常"
    else
        warn "数据库连接失败，但容器正在运行"
    fi
else
    warn "PostgreSQL 容器未运行（部署时会自动启动）"
fi

# ---- 7. 检查 OIDC 密钥 ----
log "[7/8] 检查 OIDC 密钥"

OIDC_KEY_DIR="/etc/oidc/keys"
if [ ! -d "$OIDC_KEY_DIR" ]; then
    warn "OIDC 密钥目录不存在：$OIDC_KEY_DIR"
    echo "  部署时会自动生成"
else
    if [ -f "$OIDC_KEY_DIR/private.pem" ] && [ -f "$OIDC_KEY_DIR/public.pem" ]; then
        ok "OIDC 密钥对已存在"
    else
        warn "OIDC 密钥对不完整"
        echo "  部署时会自动生成"
    fi
fi

# ---- 8. 生成部署命令 ----
log "[8/8] 生成部署命令"

echo ""
echo "=========================================="
echo "  预检查完成！"
echo "=========================================="
echo ""

# 检查是否所有检查都通过
if [ ${#MISSING_VARS[@]} -eq 0 ] && [ "$CURRENT_COMMIT" = "$REMOTE_COMMIT" ]; then
    ok "✅ 所有检查通过，可以开始部署！"
    echo ""
    echo "部署命令："
    echo "  cd $PROJECT_DIR"
    echo "  docker compose down"
    echo "  docker compose up -d --build"
    echo ""
    echo "查看日志："
    echo "  docker compose logs -f"
    echo ""
    
    read -p "是否现在开始部署？(y/n) " -n 1 -r
    echo ""
    if [ "$REPLY" = "y" ] || [ "$REPLY" = "Y" ]; then
        log "开始部署..."
        docker compose down
        docker compose up -d --build
        
        log "等待服务启动..."
        sleep 30
        
        log "检查服务状态..."
        docker compose ps
        
        log "查看日志（Ctrl+C 退出）..."
        docker compose logs -f
    fi
else
    warn "请先解决上面的问题，然后再部署"
fi

echo ""
echo "=========================================="
echo "  预检查脚本执行完成"
echo "=========================================="
echo ""
