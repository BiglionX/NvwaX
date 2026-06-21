#!/bin/bash
# ==============================================================================
# quick-deploy.sh - 快速部署脚本（适用于首次部署）
# ==============================================================================
# 用法：
#   sudo DOMAIN=account.yourdomain.com \
#        EMAIL=admin@yourdomain.com \
#        DB_PASSWORD=<密码> \
#        JWT_SECRET=<密钥> \
#        bash quick-deploy.sh
# ==============================================================================

set -euo pipefail

# ---- 颜色输出 ----
RED='\033[1;31m'; GRN='\033[1;32m'; CYN='\033[1;36m'; YLW='\033[1;33m'; RST='\033[0m'
log() { printf "${CYN}▶ %s${RST}\n" "$*"; }
ok()  { printf "${GRN}✓ %s${RST}\n" "$*"; }
warn(){ printf "${YLW}⚠ %s${RST}\n" "$*"; }
err() { printf "${RED}✗ %s${RST}\n" "$*" >&2; exit 1; }

# ---- 参数检查 ----
log "检查必需参数..."

[ -z "${DOMAIN:-}" ] && err "请设置 DOMAIN 环境变量（例如：DOMAIN=account.yourdomain.com）"
[ -z "${EMAIL:-}" ] && err "请设置 EMAIL 环境变量（用于 Let's Encrypt）"
[ -z "${DB_PASSWORD:-}" ] && warn "未设置 DB_PASSWORD，将使用默认值（不安全！）"
[ -z "${JWT_SECRET:-}" ] && warn "未设置 JWT_SECRET，将使用默认值（不安全！）"

PROJECT_DIR="${PROJECT_DIR:-/opt/nvwax}"
LE_EMAIL="${EMAIL}"

log "部署配置："
echo "  域名: ${DOMAIN}"
echo "  邮箱: ${EMAIL}"
echo "  项目目录: ${PROJECT_DIR}"

# ---- 1. 安装 Docker ----
log "[1/8] 安装 Docker 和 Docker Compose"

if ! command -v docker &> /dev/null; then
  log "Docker 未安装，正在安装..."
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sh /tmp/get-docker.sh
  rm /tmp/get-docker.sh
  ok "Docker 安装完成"
else
  ok "Docker 已安装: $(docker --version)"
fi

if ! docker compose version &> /dev/null; then
  log "安装 Docker Compose 插件..."
  apt-get update -y
  apt-get install -y docker-compose-plugin
  ok "Docker Compose 安装完成"
else
  ok "Docker Compose 已安装: $(docker compose version)"
fi

# ---- 2. 克隆/更新代码 ----
log "[2/8] 准备项目代码"

if [ ! -d "$PROJECT_DIR" ]; then
  log "克隆仓库..."
  git clone https://github.com/your-org/NvwaX.git "$PROJECT_DIR"
  cd "$PROJECT_DIR"
else
  log "更新仓库..."
  cd "$PROJECT_DIR"
  git pull origin main
fi

ok "项目代码准备完成"

# ---- 3. 创建 .env 文件 ----
log "[3/8] 创建环境变量文件"

if [ ! -f "$PROJECT_DIR/.env" ]; then
  log "从模板创建 .env 文件..."
  cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
  
  # 替换变量（使用 sed）
  sed -i "s|^DOMAIN=.*|DOMAIN=${DOMAIN}|g" "$PROJECT_DIR/.env"
  sed -i "s|^OIDC_ISSUER=.*|OIDC_ISSUER=https://${DOMAIN}|g" "$PROJECT_DIR/.env"
  sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD:-changeme}|g" "$PROJECT_DIR/.env"
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET:-change-this-secret}|g" "$PROJECT_DIR/.env"
  sed -i "s|^SMTP_FROM=.*|SMTP_FROM=NvwaX <noreply@${DOMAIN}>|g" "$PROJECT_DIR/.env"
  
  warn ".env 文件已创建，请编辑并填入所有必需变量！"
  warn "特别是：SMTP_PASS, GOOGLE_CLIENT_ID/SECRET, GITHUB_CLIENT_ID/SECRET"
  read -p "按 Enter 继续（或 Ctrl+C 取消并手动编辑 .env）..."
else
  ok ".env 文件已存在"
fi

# ---- 4. 生成 OIDC 密钥对 ----
log "[4/8] 生成 OIDC RSA 密钥对"

OIDC_KEY_DIR="$PROJECT_DIR/secrets/oidc"
mkdir -p "$OIDC_KEY_DIR"

if [ ! -f "$OIDC_KEY_DIR/private.pem" ]; then
  log "生成 RSA-2048 密钥对..."
  openssl genrsa -out "$OIDC_KEY_DIR/private.pem" 2048
  openssl rsa -in "$OIDC_KEY_DIR/private.pem" -pubout -out "$OIDC_KEY_DIR/private.pem.pub.pem"
  chmod 644 "$OIDC_KEY_DIR/private.pem"
  ok "OIDC 密钥对生成完成"
else
  ok "OIDC 密钥对已存在"
fi

# ---- 5. 配置防火墙 ----
log "[5/8] 配置防火墙"

if command -v ufw &> /dev/null; then
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  echo "y" | ufw enable
  ok "防火墙配置完成"
else
  warn "ufw 未安装，跳过防火墙配置"
fi

# ---- 6. 申请 Let's Encrypt 证书 ----
log "[6/8] 申请 Let's Encrypt SSL 证书"

LE_DIR="/etc/letsencrypt/live/${DOMAIN}"

if [ ! -f "$LE_DIR/fullchain.pem" ]; then
  log "安装 certbot..."
  apt-get update -y
  apt-get install -y certbot
  
  log "停止 Nginx（如果需要）..."
  cd "$PROJECT_DIR"
  docker compose stop nginx 2>/dev/null || true
  
  log "申请证书..."
  certbot certonly --standalone -d "$DOMAIN" \
    --email "$LE_EMAIL" --agree-tos --no-eff-email
  
  ok "Let's Encrypt 证书申请完成"
else
  ok "Let's Encrypt 证书已存在"
fi

# ---- 7. 启动 Docker 容器 ----
log "[7/8] 启动 Docker 容器"

cd "$PROJECT_DIR"
docker compose --env-file .env up -d

log "等待容器启动（最多 60 秒）..."
timeout=60
while [ $timeout -gt 0 ]; do
  if docker compose ps | grep -q "healthy"; then
    ok "容器已启动并健康"
    break
  fi
  sleep 5
  timeout=$((timeout - 5))
done

if [ $timeout -le 0 ]; then
  warn "部分容器可能未正常启动，请检查日志：docker compose logs -f"
fi

# ---- 8. 创建初始 OIDC 客户端 ----
log "[8/8] 创建初始 OIDC 客户端"

cat > /tmp/init-clients.sql << 'EOSQL'
INSERT INTO oidc_clients (
  client_id, name, redirect_uris, allowed_scopes,
  allowed_grant_types, require_pkce, token_endpoint_auth_method,
  is_active, created_at, updated_at
) VALUES 
  ('test-client', 'Test Client', ARRAY['http://localhost:3000/callback'], 
   ARRAY['openid', 'profile', 'email'],
   ARRAY['authorization_code', 'refresh_token'],
   true, 'none', true, NOW(), NOW())
ON CONFLICT (client_id) DO NOTHING;
EOSQL

log "执行 SQL 初始化..."
docker exec -i $(docker compose ps -q postgres) psql -U nvwax -d nvwax -f /dev/stdin < /tmp/init-clients.sql 2>/dev/null || true

ok "初始 OIDC 客户端创建完成"

# ---- 完成 ----
echo ""
echo "${GRN}================ 部署完成 ================${RST}"
echo ""
echo "✅ 访问地址："
echo "   Portal: https://${DOMAIN}"
echo "   Discovery: https://${DOMAIN}/.well-known/openid-configuration"
echo "   JWKS: https://${DOMAIN}/.well-known/jwks.json"
echo ""
echo "📋 后续步骤："
echo "   1. 验证服务正常："
echo "      curl https://${DOMAIN}/.well-known/openid-configuration"
echo ""
echo "   2. 创建更多 OIDC 客户端（供合作项目使用）："
echo "      docker exec -it \$(docker compose ps -q postgres) psql -U nvwax -d nvwax"
echo "      INSERT INTO oidc_clients (...);"
echo ""
echo "   3. 配置 certbot 自动续期："
echo "      echo '0 3 * * * root certbot renew --quiet --deploy-hook \"docker compose -f $PROJECT_DIR/docker-compose.yml restart nginx\"' > /etc/cron.d/certbot-nvwax"
echo ""
echo "${YLW}⚠ 重要提醒：${RST}"
echo "   - 请定期检查 Docker 容器状态：docker compose ps"
echo "   - 请定期备份数据库：docker exec nvwax-postgres pg_dump -U nvwax nvwax > backup.sql"
echo "   - 如有问题，查看日志：docker compose logs -f"
echo ""
