#!/usr/bin/env bash
# Chatly deploy script — run on the server inside the cloned repo
# Usage: ./deploy.sh
set -euo pipefail

TARGET="/var/www/apexes.click/chats-product/index.html"
SOURCE="dist-single/index.html"

echo "==> git pull"
git pull --ff-only

echo "==> npm install (clean)"
npm ci --no-audit --no-fund --silent

echo "==> build single-file bundle"
npm run build:single

if [ ! -f "$SOURCE" ]; then
  echo "ERROR: build did not produce $SOURCE"
  exit 1
fi

echo "==> copy to web root"
cp "$SOURCE" "$TARGET"

echo "==> done. site: https://chats-product.apexes.click/"
ls -la "$TARGET"
