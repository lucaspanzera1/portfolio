#!/usr/bin/env bash
# Roda no LXC lucaspanzera (10.0.0.32) como root, disparado pelo usuário `deploy`
# via forced command + sudo. Instalar em /usr/local/bin/deploy.sh (root:root, 755).
set -euo pipefail

REPO_DIR=/root/ong
BRANCH=main

exec 9>/var/lock/deploy-ong.lock
flock -n 9 || { echo "deploy já em andamento"; exit 1; }

export NVM_DIR=/root/.nvm
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"

cd "$REPO_DIR"
git fetch --prune origin "$BRANCH"
git reset --hard "origin/$BRANCH"

pnpm install --frozen-lockfile
# web: build + cópia pra /var/www/lucaspanzera | api: nest build
NODE_OPTIONS=--max-old-space-size=512 pnpm build:prod

systemctl restart ong-api.service
sleep 3
systemctl is-active --quiet ong-api.service || { journalctl -u ong-api.service -n 50 --no-pager; exit 1; }

echo "deploy ok: $(git rev-parse --short HEAD)"
