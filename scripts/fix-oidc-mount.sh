#!/bin/bash
# Fix OIDC key volume mounts in docker-compose.yml on remote host
set -e

echo "=== Step 1: Backup docker-compose.yml ==="
cp /opt/nvwax/docker-compose.yml /opt/nvwax/docker-compose.yml.bak-oidc
echo "backup done"

echo ""
echo "=== Step 2: Check OIDC keys ==="
ls -la /opt/nvwax/secrets/oidc/

echo ""
echo "=== Step 3: Inject OIDC volume mounts via python ==="
python3 - <<'PYEOF'
import sys
path = "/opt/nvwax/docker-compose.yml"
with open(path, "r") as f:
    content = f.read()

old = "      - ./uploads:/app/uploads"
new_mounts = (
    "      - ./uploads:/app/uploads\n"
    "      - /opt/nvwax/secrets/oidc/private.pem:/etc/oidc/keys/private.pem:ro\n"
    "      - /opt/nvwax/secrets/oidc/private.pem.pub.pem:/etc/oidc/keys/private.pem.pub.pem:ro"
)

if "oidc/keys/private.pem" in content:
    print("Already injected, skipping")
    sys.exit(0)

if old not in content:
    print("ERROR: anchor not found:", repr(old))
    sys.exit(1)

new_content = content.replace(old, new_mounts)
with open(path, "w") as f:
    f.write(new_content)
print("Injected successfully")
PYEOF

echo ""
echo "=== Step 4: Verify injection ==="
grep -A 3 'uploads:/app/uploads' /opt/nvwax/docker-compose.yml

echo ""
echo "=== Step 5: Force-recreate backend with new volumes ==="
cd /opt/nvwax && docker-compose up -d --force-recreate backend

echo ""
echo "=== Step 6: Wait 20s for backend to start ==="
sleep 20

echo ""
echo "=== Step 7: Check backend status ==="
docker ps -a --filter name=nvwax-backend

echo ""
echo "=== Step 8: Backend log (last 25 lines) ==="
docker logs --tail 25 nvwax-backend 2>&1

echo ""
echo "=== Step 9: Backend health check ==="
for i in 1 2 3 4 5; do
  if curl -sf http://localhost:3001/health 2>/dev/null; then
    echo ""
    echo "  Backend OK at try $i"
    break
  else
    echo "  try $i failed, waiting 10s..."
    sleep 10
  fi
done
