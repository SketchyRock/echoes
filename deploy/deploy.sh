#!/usr/bin/env bash
# Deploys Echoes to a Docker host over SSH.
#
#   deploy/deploy.sh <ssh-host> <domain>        e.g. deploy/deploy.sh my-droplet example.com
#
# The frontend is built and the Go binary cross-compiled here (the droplet
# has too little RAM to build the frontend). The binary, compose file and
# nginx template are copied to /opt/echoes; the host builds a tiny runtime
# image and runs app + nginx + certbot. Only the "echoes" compose project is
# touched; nothing else on the host is stopped or changed.
set -euo pipefail

HOST=${1:?ssh host}
DOMAIN=${2:?domain}
REMOTE_DIR=/opt/echoes
ROOT=$(cd "$(dirname "$0")/.." && pwd)

echo "==> building frontend + linux/amd64 binary"
(cd "$ROOT" && task build:linux)

echo "==> syncing to $HOST:$REMOTE_DIR"
ssh "$HOST" "mkdir -p $REMOTE_DIR/deploy/nginx/templates"
scp -q "$ROOT/docker-compose.yml" "$HOST:$REMOTE_DIR/"
scp -q "$ROOT/deploy/Dockerfile.runtime" "$HOST:$REMOTE_DIR/deploy/"
scp -q "$ROOT/deploy/nginx/templates/default.conf.template" "$HOST:$REMOTE_DIR/deploy/nginx/templates/"
scp -q "$ROOT/bin/echoes-linux-amd64" "$HOST:$REMOTE_DIR/echoes"
ssh "$HOST" "printf 'DOMAIN=%s\n' '$DOMAIN' > $REMOTE_DIR/.env"

scp -q "$ROOT/deploy/remote.sh" "$HOST:$REMOTE_DIR/deploy/"

echo "==> building runtime image and starting the stack"
ssh "$HOST" bash "$REMOTE_DIR/deploy/remote.sh" "$DOMAIN"

echo "==> done: https://$DOMAIN"
