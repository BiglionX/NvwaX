# Runbook — `account.proclaw.cc` (Sprint 2 公网部署)

> **Owner:** ProClaw SRE
> **Last verified:** Sprint 2 Day 8
> **Rollback time target:** < 5 min

## 0. 一次性初始化

| 资源 | 创建方式 | 说明 |
|------|----------|------|
| Cloudflare `account.proclaw.cc` A 记录 | Cloudflare 控制台 | 指向 K8s LB 公网 IP（由 nginx-ingress Service 暴露） |
| `cloudflare-api-token` K8s Secret | `kubectl create secret generic cloudflare-api-token --from-literal=api-token=***` | cert-manager DNS-01 用 |
| `proclaw-account-secrets` K8s Secret | `kubectl create secret generic proclaw-account-secrets --from-literal=database-url=... --from-literal=jwt-secret=... --from-literal=cross-auth-secret=... --from-literal=pc-session-secret=$(openssl rand -hex 32)` | backend 运行时密钥 |
| `aws-ses-credentials` K8s Secret | SRE 工单生成 SMTP IAM user | 邮件通道 |
| `proclaw-oidc-keys` K8s Secret | `kubectl create secret generic proclaw-oidc-keys --from-file=private.pem --from-file=public.pem` | RS256 JWT 私钥（生产不复用 dev 自动生成） |
| `letsencrypt-prod` ClusterIssuer | `kubectl apply -f k8s/account-portal/cert-issuer.yaml` | 一次性 apply |

## 1. 部署顺序

```bash
# 1) DB migrations
kubectl -n proclaw exec -it deploy/proclaw-account-backend -- \
  node dist/scripts/run-sprint2-migrations.js
# 或：
pnpm --filter nvwax-server migrate:sprint2

# 2) 部署 backend
kubectl -n proclaw apply -f k8s/account-portal/backend-deploy.yaml

# 3) 等到 ready
kubectl -n proclaw rollout status deploy/proclaw-account-backend

# 4) Ingress + cert
kubectl -n proclaw apply -f k8s/account-portal/ingress.yaml

# 5) 等待证书签发
kubectl -n proclaw describe certificate proclaw-account-tls
# 期望：Type:   Ready  Reason:  Ready
```

## 2. 公网 DoD 验证

```bash
# A1 — DNS 解析
dig +short account.proclaw.cc A
# 期望：返回 Cloudflare 代理 IP（或 K8s LB 公网 IP）

# A2 — Discovery 端点
curl -I https://account.proclaw.cc/.well-known/openid-configuration
# 期望：HTTP/2 200；server: nginx；content-type: application/json

# A3 — TLS 证书
echo | openssl s_client -servername account.proclaw.cc -connect account.proclaw.cc:443 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
# 期望：issuer = Let's Encrypt Authority X3/O=R3
```

## 3. 注册 → 邮件 → 激活 < 30s 验证

```bash
# 注册（dev 流程；生产用真实 SES 邮箱）
curl -X POST https://account.proclaw.cc/api/portal/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke@proclaw.cc","password":"Prower1234!"}'

# 查 SES 收件箱（或 dev MailPit UI：http://localhost:8025）
# 复制激活链接：
#   https://account.proclaw.cc/portal/activate/<token>/
# curl 该链接 → 应返回 200 + Set-Cookie: pc_session=...; Domain=.proclaw.cc
```

## 4. 4 RP 注册状态

```bash
PGPASSWORD=$DB_PASSWORD psql -h <db> -U nvwax -d nvwax \
  -c "SELECT client_id, name, is_active, array_length(redirect_uris, 1) AS n_redirects FROM oidc_clients ORDER BY client_id;"
# 期望：5 行（1 dev + 4 ProClaw RP）
```

## 5. 密钥轮换

| 密钥 | 命令 | 备注 |
|------|------|------|
| `PC_SESSION_SECRET` | `kubectl -n proclaw create secret new proclaw-account-secrets --from-literal=...` 然后滚动重启 | 会让所有现存 session 失效（用户需重新登录） |
| `JWT_SECRET` | 同上 | 会让存量 bearer token 失效 |
| OIDC 私钥 | `kubectl -n proclaw create secret new proclaw-oidc-keys --from-file=private.pem` | 同时更新 RP 端 JWKS（IdP 是 source of truth） |

## 6. 故障排查

| 症状 | 排查命令 |
|------|----------|
| cert-manager 不签发 | `kubectl -n proclaw describe challenge` / `kubectl -n proclaw logs deploy/cert-manager` |
| 邮件未发出 | `kubectl -n proclaw logs deploy/proclaw-account-backend \| grep -i 'portal.register\|portal.activate'` |
| pc_session 跨域丢失 | DevTools → Application → Cookies；确认 Domain=`.proclaw.cc` 且 Secure |
| authorizeGet 一直渲染登录 form | `kubectl -n proclaw logs ... \| grep 'sessionUser'`；可能 pcSessionService.middleware 未挂载 |
| 504 from Nginx | 后端 readinessProbe 失败：`kubectl -n proclaw describe pod proclaw-account-backend-***` |
