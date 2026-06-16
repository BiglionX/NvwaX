#!/bin/bash
# Fix public key mount path (jose expects /etc/oidc/keys/private.pub.pem)
set -e

echo "=== Step 1: Fix mount path in docker-compose.yml ==="
sed -i 's|private.pem.pub.pem:ro|private.pub.pem:ro|' /opt/nvwax/docker-compose.yml

echo ""
echo "=== Step 2: Verify mount path ==="
grep -n 'private' /opt/nvwax/docker-compose.yml

echo ""
echo "=== Step 3: Force-recreate backend ==="
cd /opt/nvwax && docker-compose up -d --force-recreate backend

echo ""
echo "=== Step 4: Wait 25s ==="
sleep 25

echo ""
echo "=== Step 5: Container status ==="
docker ps -a --filter name=nvwax-backend

echo ""
echo "=== Step 6: Backend log (last 20 lines) ==="
docker logs --tail 20 nvwax-backend 2>&1

echo ""
echo "=== Step 7: Health check ==="
if curl -sf http://localhost:3001/health 2>/dev/null; then
  echo ""
  echo "  Backend OK"
else
  echo "  Backend not healthy yet"
  exit 1
fi
