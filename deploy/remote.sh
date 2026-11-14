#!/usr/bin/env bash
# Runs ON the host, from /opt/echoes, invoked by deploy/deploy.sh:
#   bash /opt/echoes/deploy/remote.sh <domain>
# Builds the runtime image, bootstraps a cert if needed, starts the stack.
set -euo pipefail

DOMAIN=${1:?domain}
cd "$(dirname "$0")/.."
LIVE=/etc/letsencrypt/live/$DOMAIN
dc() { docker compose --progress quiet "$@" < /dev/null; }

IP=$(curl -4 -s --max-time 5 https://api.ipify.org || hostname -I | awk '{print $1}')

# Cover www. too when it points at this host.
NAMES=(-d "$DOMAIN")
if [ "$(getent ahostsv4 "www.$DOMAIN" | awk 'NR==1{print $1}')" = "$IP" ]; then
  NAMES+=(-d "www.$DOMAIN")
fi

echo "    building runtime image"
dc build app

# nginx refuses to start without a cert at the configured path. Before the
# first issuance, drop in a throwaway self-signed one so nginx can come up
# and answer the ACME http-01 challenge.
# renewal/<domain>.conf only exists for a real Let's Encrypt cert, never for
# the self-signed bootstrap one.
HAVE_CERT=$(dc run --rm -T --entrypoint sh certbot -c "test -f /etc/letsencrypt/renewal/$DOMAIN.conf && echo yes || echo no" | tr -d '\r' | tail -1)
if [ "$HAVE_CERT" != yes ]; then
  echo "    no cert yet: creating temporary self-signed cert"
  dc run --rm -T --entrypoint sh certbot -c "
    rm -rf $LIVE && mkdir -p $LIVE &&
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
      -keyout $LIVE/privkey.pem -out $LIVE/fullchain.pem -subj '/CN=$DOMAIN' >/dev/null 2>&1"
fi

echo "    starting app + nginx"
dc up -d app nginx

if [ "$HAVE_CERT" != yes ]; then
  echo "    requesting Let's Encrypt certificate: ${NAMES[*]}"
  dc run --rm -T --entrypoint sh certbot -c "rm -rf $LIVE /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf"
  # --entrypoint: the compose service overrides the image entrypoint with the
  # renew loop, which would otherwise swallow these args and run forever.
  dc run --rm -T --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
    "${NAMES[@]}" --register-unsafely-without-email --agree-tos --no-eff-email --non-interactive
  dc exec -T nginx nginx -s reload
fi

echo "    starting certbot renewer"
dc up -d certbot
echo
dc ps
