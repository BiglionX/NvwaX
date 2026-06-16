#!/usr/bin/env bash
# ==============================================================================
# scripts/deploy-account.sh
# 一键部署 account.proclaw.cc (OIDC IdP) 到现有 nvwax.proclaw.cc 所在服务器
# 幂等：可重复跑，已完成的步骤会跳过
# ==============================================================================
# 前置条件：
#   1. DNS 已解析 account.proclaw.cc → 本机公网 IP（43.156.133.180）
#   2. 本仓库已 git pull 到 /opt/nvwax（含本次预修改的 3 个文件）
#   3. .env 已含 OIDC_* / PC_SESSION_* / SMTP_* 变量
# 用法：
#   sudo EXPECTED_IP=43.156.133.180 LE_EMAIL=you@example.com bash scripts/deploy-account.sh
# ==============================================================================

set -euo pipefail

DOMAIN="account.proclaw.cc"
EXPECTED_IP="${EXPECTED_IP:-43.156.133.180}"
LE_EMAIL="${LE_EMAIL:-admin@proclaw.cc}"
PROJECT_DIR="${PROJECT_DIR:-/opt/nvwax}"
LE_DIR="/etc/letsencrypt/live/${DOMAIN}"
NGINX_CONF="${PROJECT_DIR}/docker/nginx/nginx.conf"
TEMP_CERT_DIR="/opt/nvwax/secrets/oidc"  # OIDC 私钥目录（生成式 OIDC_RSA_KEYPAIR 同位置）

# ---- 颜色输出 ----
RED='\033[1;31m'; GRN='\033[1;32m'; CYN='\033[1;36m'; YLW='\033[1;33m'; RST='\033[0m'
log() { printf "${CYN}▶ %s${RST}\n" "$*"; }
ok()  { printf "${GRN}✓ %s${RST}\n" "$*"; }
warn(){ printf "${YLW}⚠ %s${RST}\n" "$*"; }
err() { printf "${RED}✗ %s${RST}\n" "$*" >&2; exit 1; }

# ---- 0. 基础校验 ----
[ "$EUID" -ne 0 ] && err "请用 sudo 运行：sudo EXPECTED_IP=... LE_EMAIL=... bash $0"
cd "$PROJECT_DIR" || err "找不到项目目录 $PROJECT_DIR"
[ -f .env ] || err "缺少 .env 文件（应含 OIDC_*/SMTP_* 变量）"
grep -q "^OIDC_ISSUER=" .env || err ".env 缺少 OIDC_ISSUER 变量"
grep -q "^OIDC_PRIVATE_KEY_PATH=" .env || err ".env 缺少 OIDC_PRIVATE_KEY_PATH 变量"
grep -q "^SMTP_PASS=" .env && ! grep -q "^SMTP_PASS=<" .env \
  || err ".env 中 SMTP_PASS 仍是占位符 <REPLACE_WITH_QQ_16CHAR_AUTH_CODE>，请先填入真实授权码"

# ---- 1. DNS 校验 ----
log "[1/7] 校验 DNS 解析 ${DOMAIN} → ${EXPECTED_IP}"
RESOLVED_IP=""
for cmd in "dig +short ${DOMAIN} A" "getent hosts ${DOMAIN}"; do
  RESOLVED_IP=$(eval "$cmd" 2>/dev/null | head -1) || true
  [ -n "$RESOLVED_IP" ] && break
done
[ -z "$RESOLVED_IP" ] && err "${DOMAIN} 未解析，请先在 DNS 控制台加 A 记录 → ${EXPECTED_IP}"
[ "$RESOLVED_IP" != "$EXPECTED_IP" ] && err "${DOMAIN} 解析到 ${RESOLVED_IP}，与期望 ${EXPECTED_IP} 不一致"
ok "DNS 解析正确：${DOMAIN} → ${RESOLVED_IP}"

# ---- 2. 生成 OIDC 私钥对（幂等） ----
log "[2/7] 生成 OIDC RSA-2048 密钥对"
mkdir -p "$TEMP_CERT_DIR"
chmod 755 "$TEMP_CERT_DIR"
bash scripts/generate-oidc-keys.sh
[ -f "$TEMP_CERT_DIR/private.pem" ] || err "OIDC 私钥生成失败"
ok "OIDC 私钥：${TEMP_CERT_DIR}/private.pem (chmod 644)"

# ---- 3. 申请 Let's Encrypt 证书（幂等） ----
log "[3/7] 申请 Let's Encrypt 证书"
if [ -f "$LE_DIR/fullchain.pem" ] && [ -f "$LE_DIR/privkey.pem" ]; then
  ok "LE 证书已存在：${LE_DIR}"
else
  warn "未检测到 LE 证书，需先安装 certbot（如已装则跳过）"
  if ! command -v certbot >/dev/null 2>&1; then
    apt-get update -y >/dev/null
    apt-get install -y certbot >/dev/null
  fi

  log "申请证书（certbot --standalone，需临时占用 80 端口）"
  # 先停掉占用 80 端口的 nginx 容器（如果存在）
  if docker ps -a --format '{{.Names}}' | grep -q '^nvwax-nginx$'; then
    log "停止 nvwax-nginx 以释放 80 端口（certbot standalone 需要）"
    docker compose stop nginx || true
    NGINX_WAS_RUNNING=1
  else
    NGINX_WAS_RUNNING=0
  fi

  trap '[ "$NGINX_WAS_RUNNING" = "1" ] && docker compose start nginx || true' EXIT
  certbot certonly --standalone -d "$DOMAIN" \
    --email "$LE_EMAIL" --agree-tos --no-eff-email
  trap - EXIT
  [ "$NGINX_WAS_RUNNING" = "1" ] && docker compose start nginx || true

  [ -f "$LE_DIR/fullchain.pem" ] || err "LE 证书申请失败，请看 certbot 输出"
  ok "LE 证书就位：${LE_DIR}"
fi

# ---- 4. 切换 nginx.conf 证书路径（幂等：检查是否已经指向 LE） ----
log "[4/7] 切换 nginx.conf 证书路径到 LE"
if grep -q "$LE_DIR/fullchain.pem" "$NGINX_CONF"; then
  ok "nginx.conf 已指向 LE 证书，无需修改"
else
  cp "$NGINX_CONF" "${NGINX_CONF}.bak.$(date +%Y%m%d_%H%M%S)"
  sed -i \
    -e "s|ssl_certificate     /etc/nginx/ssl/cert.pem;|ssl_certificate     $LE_DIR/fullchain.pem;|" \
    -e "s|ssl_certificate_key /etc/nginx/ssl/key.pem;|ssl_certificate_key $LE_DIR/privkey.pem;|" \
    "$NGINX_CONF"
  ok "nginx.conf 证书路径已切换（备份：${NGINX_CONF}.bak.*）"
fi

# ---- 5. 启动 / 重启 docker compose ----
log "[5/7] docker compose up -d"
docker compose --env-file .env up -d
ok "容器已启动"

# ---- 6. 重启 nginx 让新配置生效 ----
log "[6/7] docker compose restart nginx"
docker compose restart nginx
sleep 3
ok "nginx 已重启"

# ---- 7. 健康检查 ----
log "[7/7] 健康检查"
echo "--- 1) nginx /health ---"
docker compose exec -T nginx wget -qO- http://localhost/health 2>/dev/null \
  || warn "nginx /health 未响应（不影响 HTTPS）"

echo "--- 2) OIDC Discovery ---"
if ! curl -sfk "https://${DOMAIN}/.well-known/openid-configuration" -o /tmp/oidc.json; then
  err "OIDC Discovery 失败：https://${DOMAIN}/.well-known/openid-configuration"
fi
head -c 400 /tmp/oidc.json
echo
ISSUER=$(grep -o '"issuer":"[^"]*"' /tmp/oidc.json | head -1 | cut -d'"' -f4)
[ "$ISSUER" = "https://${DOMAIN}" ] || warn "issuer 不匹配：${ISSUER}"
ok "OIDC Discovery 正常：issuer=${ISSUER}"

echo "--- 3) JWKS ---"
JWKS_URI=$(grep -o '"jwks_uri":"[^"]*"' /tmp/oidc.json | cut -d'"' -f4)
echo "JWKS URI: ${JWKS_URI}"
curl -sfk "$JWKS_URI" | head -c 200
echo

# ---- 收尾 ----
ok "✅ account.proclaw.cc 部署完成"
cat <<EOF

${GRN}================ 收尾信息 ================${RST}
• 访问入口：https://${DOMAIN}
• Discovery：https://${DOMAIN}/.well-known/openid-configuration
• JWKS：${JWKS_URI}
• 证书路径：${LE_DIR}（certbot 续期到 /etc/letsencrypt/live/）

${YLW}---------------- 后续 TODO ----------------${RST}
1. ${CYN}配置 certbot 自动续期${RST}
   echo "0 3 * * * root certbot renew --quiet --deploy-hook 'docker compose -f ${PROJECT_DIR}/docker-compose.yml restart nginx'" \
     > /etc/cron.d/certbot-nvwax
2. ${CYN}创建首个 OIDC 客户端${RST}（nvwax.proclaw.cc 自己作为 RP 登录 account）
   跑 scripts/create-oidc-client.sh（未提供，需要时再写）
3. ${CYN}前端接入 pc_session${RST}（nvwax-web 跳转到 account.proclaw.cc/oauth/authorize）
EOF
