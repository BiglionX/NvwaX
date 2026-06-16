#!/bin/bash
# Fix OIDC key file permissions and restart backend
set -e

echo "=== Step 1: Fix permissions ==="
chmod 644 /opt/nvwax/secrets/oidc/private.pem
chmod 644 /opt/nvwax/secrets/oidc/private.pem.pub.pem
ls -la /opt/nvwax/secrets/oidc/

echo ""
echo "=== Step 2: Force-recreate backend ==="
cd /opt/nvwax && docker-compose up -d --force-recreate backend

echo ""
echo "=== Step 3: Wait 25s ==="
sleep 25

echo ""
echo "=== Step 4: Container status ==="
docker ps -a --filter name=nvwax-backend

echo ""
echo "=== Step 5: Backend log (last 35 lines) ==="
docker logs --tail 35 nvwax-backend 2>&1

echo ""
echo "=== Step 6: Health check (5 tries) ==="
for i in 1 2 3 4 5; do
  if curl -sf http://localhost:3001/health 2>/dev/null; then
    echo ""
    echo "  Backend OK at try $i"
    exit 0
  else
    echo "  try $i failed, waiting 10s..."
    sleep 10
  fi
done
echo "Backend health check failed"
exit 1
