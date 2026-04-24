#!/usr/bin/env bash
# Bootstrap a fresh Ubuntu 22.04 ARM64 VM for Hadaq Tracker v2.
# Run as root (or via sudo). Idempotent.

set -euo pipefail

log() { echo "[bootstrap] $*"; }

log "Updating base system…"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

log "Installing Docker…"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | tee /etc/apt/sources.list.d/docker.list >/dev/null
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

log "Installing cloudflared…"
if ! command -v cloudflared >/dev/null 2>&1; then
  ARCH=$(dpkg --print-architecture)
  curl -fsSL -o /tmp/cloudflared.deb "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${ARCH}.deb"
  dpkg -i /tmp/cloudflared.deb
  rm -f /tmp/cloudflared.deb
fi

log "Creating hadaq service user…"
if ! id hadaq >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin hadaq
  usermod -aG docker hadaq
fi

log "Installing systemd unit for hadaq-api…"
cat >/etc/systemd/system/hadaq-api.service <<'UNIT'
[Unit]
Description=Hadaq Tracker API
After=docker.service network-online.target
Requires=docker.service

[Service]
Restart=always
RestartSec=5
ExecStartPre=-/usr/bin/docker rm -f hadaq-api
ExecStart=/usr/bin/docker run --rm --name hadaq-api \
  -p 127.0.0.1:3001:3001 \
  -e NODE_ENV=production -e PORT=3001 -e LOG_LEVEL=info \
  --memory=8g --cpus=3 \
  hadaq-api:latest
ExecStop=/usr/bin/docker stop hadaq-api

[Install]
WantedBy=multi-user.target
UNIT

log "Firewall: only allow SSH + cloudflared-initiated egress…"
if command -v ufw >/dev/null 2>&1; then
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow 22/tcp
  yes | ufw enable
fi

systemctl daemon-reload
systemctl enable hadaq-api.service || true

log "Done. Next: install cloudflared service with your tunnel token:"
log "  sudo cloudflared service install <TOKEN>"
