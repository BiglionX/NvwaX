# K8s account-portal manifests
# Sprint 2 — 公网部署
#
# Apply order:
#   kubectl apply -f cert-issuer.yaml            # ClusterIssuer (cluster-scoped)
#   kubectl apply -f backend-deploy.yaml          # Deployment + Service
#   kubectl apply -f ingress.yaml                 # Ingress + cert-manager annotation
#
# 依赖：
#   - cert-manager ≥ v1.13 (letsencrypt-prod ClusterIssuer)
#   - nginx-ingress-controller
#   - Cloudflare DNS A 记录：account.proclaw.cc → LB IP
