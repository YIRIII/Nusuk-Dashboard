#!/usr/bin/env bash
set -euo pipefail

REMOTE="ubuntu@141.147.134.176"
KEY="$HOME/.ssh/nusuk-oracle"
PROJECT="/Users/yiri/Desktop/Projects/Nusuk-Dashboard"

echo "→ Packaging project..."
tar czf /tmp/nusuk.tar.gz --exclude=node_modules --exclude=.git --exclude=dist -C "$(dirname "$PROJECT")" "$(basename "$PROJECT")"

echo "→ Uploading..."
scp -i "$KEY" /tmp/nusuk.tar.gz "$REMOTE":/tmp/

echo "→ Extracting & rebuilding on server..."
ssh -i "$KEY" "$REMOTE" bash -s << 'REMOTE_SCRIPT'
set -euo pipefail
rm -rf /home/ubuntu/nusuk
mkdir -p /home/ubuntu/nusuk
tar xzf /tmp/nusuk.tar.gz -C /home/ubuntu/nusuk --strip-components=1 2>/dev/null || true
cd /home/ubuntu/nusuk
sudo docker stop nusuk-api 2>/dev/null || true
sudo docker rm nusuk-api 2>/dev/null || true
sudo docker build -t nusuk-api:latest -f docker/Dockerfile .
sudo docker run -d --name nusuk-api -p 3001:3001 --restart=always --env-file /tmp/nusuk.env nusuk-api:latest
echo "✓ Deploy complete"
sudo docker logs nusuk-api --tail 5
REMOTE_SCRIPT

echo "→ Done! Check http://141.147.134.176:3001"
