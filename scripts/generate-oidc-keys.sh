#!/bin/bash
# Auto-generate OIDC RSA-2048 keypair for production deployment
# Used by deploy.yml to ensure /opt/nvwax/secrets/oidc/ exists with correct perms
#
# Why this script exists:
# - backend/src/services/oidc/oidc-token.service.ts requires OIDC_PRIVATE_KEY_PATH
#   to point to a PKCS8 PEM file in production
# - the matching public key must be at <keypath>.pub.pem (jose convention)
# - these files cannot be stored in Git (sensitive), so we generate them
#   on the deploy server, persisted in /opt/nvwax/secrets/oidc/
# - container mounts these via docker-compose.yml (read-only)

set -e

SECRETS_DIR="/opt/nvwax/secrets/oidc"
PRIVATE_KEY="$SECRETS_DIR/private.pem"
PUBLIC_KEY="$SECRETS_DIR/private.pem.pub.pem"

mkdir -p "$SECRETS_DIR"

if [ ! -f "$PRIVATE_KEY" ]; then
  echo "🔐 Generating OIDC RSA-2048 keypair..."
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$PRIVATE_KEY"
fi

if [ ! -f "$PUBLIC_KEY" ]; then
  echo "🔑 Extracting public key..."
  openssl rsa -pubout -in "$PRIVATE_KEY" -out "$PUBLIC_KEY"
fi

# container user nvwax (uid 1001) needs read access
chmod 644 "$PRIVATE_KEY" "$PUBLIC_KEY"

ls -la "$SECRETS_DIR"
echo "✅ OIDC keys ready"
