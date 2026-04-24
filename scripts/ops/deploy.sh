#!/usr/bin/env bash
set -euo pipefail

REMOTE="ubuntu@141.147.134.176"
KEY="$HOME/.ssh/nusuk-oracle"
PROJECT="/Users/yiri/Desktop/Projects/Nusuk-Dashboard"

echo "→ Packaging project..."
tar czf /tmp/hadaq.tar.gz --exclude=node_modules --exclude=.git --exclude=dist -C "$(dirname "$PROJECT")" "$(basename "$PROJECT")"

echo "→ Uploading..."
scp -i "$KEY" /tmp/hadaq.tar.gz "$REMOTE":/tmp/

echo "→ Extracting & rebuilding on server..."
ssh -i "$KEY" "$REMOTE" bash -s << 'REMOTE_SCRIPT'
set -euo pipefail
rm -rf /home/ubuntu/hadaq
mkdir -p /home/ubuntu/hadaq
tar xzf /tmp/hadaq.tar.gz -C /home/ubuntu/hadaq --strip-components=1 2>/dev/null || true
cd /home/ubuntu/hadaq
sudo docker stop hadaq-api 2>/dev/null || true
sudo docker rm hadaq-api 2>/dev/null || true
sudo docker build -t hadaq-api:latest -f docker/Dockerfile .
sudo docker run -d --name hadaq-api -p 3001:3001 --restart=always --env-file /tmp/hadaq.env hadaq-api:latest
echo "✓ Deploy complete"
sudo docker logs hadaq-api --tail 5
REMOTE_SCRIPT

echo "→ Done! Check http://141.147.134.176:3001"
