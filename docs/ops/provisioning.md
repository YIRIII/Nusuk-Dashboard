# Provisioning Runbook — Oracle Cloud Always Free ARM64 + Cloudflare Tunnel

This runbook covers the one-time host setup for Nusuk Social Tracker v2. Steps marked **[manual]** require you to click through a console; all others are scripted.

## Primary target: Oracle Cloud Always Free — Ampere A1 Flex (ARM64)

- Shape: `VM.Standard.A1.Flex`
- CPUs: 4 OCPU (within always-free 4 OCPU / 24 GB cap)
- Memory: 24 GB
- OS: Canonical Ubuntu 22.04 ARM64
- Storage: 100 GB boot volume (within always-free 200 GB cap)

### 1. [manual] Create the VM
1. Sign in to Oracle Cloud — https://cloud.oracle.com
2. Compute → Instances → Create Instance
3. Name: `nusuk-api`
4. Image: Canonical Ubuntu 22.04 (ARM64 variant)
5. Shape: Ampere → `VM.Standard.A1.Flex` → 4 OCPU / 24 GB
6. Networking: default VCN; assign public IP (for SSH bootstrap — close later via Tunnel)
7. SSH keys: paste your ed25519 public key
8. Create

**If signup/region rejected** (KI-006): fall back to either
- Oracle Always Free x86 AMD (2 VMs × 1 OCPU / 1 GB) — insufficient RAM, avoid
- **Render free tier** (500h/mo, 512 MB) — not enough for Puppeteer pool; acceptable only for API-less demo
- **Fly.io** `shared-cpu-1x` (256 MB free) — insufficient
- Recommended fallback: move to **Hetzner CX22** (€3.79/mo) — breaks $0 budget but pragmatic

### 2. Bootstrap the VM (scripted)

```bash
# from your laptop, after VM is up:
export NUSUK_HOST=<public-ip>
scp scripts/ops/bootstrap.sh ubuntu@$NUSUK_HOST:/tmp/
ssh ubuntu@$NUSUK_HOST "sudo bash /tmp/bootstrap.sh"
```

The bootstrap script (in `scripts/ops/bootstrap.sh`):
- Updates the system
- Installs Docker + Docker Compose plugin
- Installs `cloudflared` (Cloudflare Tunnel daemon)
- Opens firewall only on port 443 via Cloudflare Tunnel (no exposed ports on public IP after this)
- Creates a `nusuk` service user, Docker group membership
- Installs the systemd units for `nusuk-api` and `cloudflared`

### 3. Cloudflare Tunnel

1. [manual] Cloudflare dashboard → Zero Trust → Networks → Tunnels → Create a tunnel
2. Tunnel name: `nusuk`
3. Copy the tunnel token
4. On the VM: `sudo cloudflared service install <TOKEN>`
5. Add a public hostname under the tunnel (e.g., `tracker.nusuk.internal.example`) → Service: `HTTP://localhost:3001`
6. Zero Trust → Access → Applications → Self-hosted → add the hostname; policy: Email-in-list allowing analyst + leadership.

### 4. Deploy the app

```bash
# Build locally (multi-arch) and push to Oracle Container Registry OR use docker save/load:
docker buildx build --platform linux/arm64 --load -t nusuk-api:latest -f docker/Dockerfile .
docker save nusuk-api:latest | ssh ubuntu@$NUSUK_HOST "sudo docker load"
ssh ubuntu@$NUSUK_HOST "sudo systemctl restart nusuk-api"
```

Or, once GitHub Actions is wired for registry push (later phase):
```bash
ssh ubuntu@$NUSUK_HOST "sudo systemctl restart nusuk-api"
```

### 5. Verify

```bash
# From the analyst's browser (after Cloudflare Access approves):
curl https://tracker.nusuk.internal.example/health
# { "ok": true, "ts": "..." }
```

## Status

Currently blocked on KI-006 (Oracle Always Free ARM64 region availability) — not executed. Scripts below are ready; run them once the account is active.
