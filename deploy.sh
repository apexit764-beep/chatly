#!/bin/bash
# Apex Sekaa - one-shot build+deploy script
# Builds the production bundle then pushes to both subdomain web roots.
set -e
SRC=/var/www/source.apexes.click
cd "$SRC"

echo ">>> [$(date '+%H:%M:%S')] Building production bundle..."
npm run build 2>&1 | tail -8

echo ">>> [$(date '+%H:%M:%S')] Deploying to chat-admin.apexes.click..."
rsync -a --delete dist/ /var/www/chat-admin.apexes.click/

echo ">>> [$(date '+%H:%M:%S')] Deploying to chat-client.apexes.click..."
rsync -a --delete dist/ /var/www/chat-client.apexes.click/

echo ">>> [$(date '+%H:%M:%S')] Done! Live URLs updated:"
echo "    https://chat-admin.apexes.click"
echo "    https://chat-client.apexes.click"
