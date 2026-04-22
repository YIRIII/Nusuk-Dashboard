# Nusuk Dashboard — Infrastructure Guide

## Architecture Overview

```
User's Browser
     ↓ HTTPS
Cloudflare (CDN + SSL)
     ↓ Cloudflare Tunnel (encrypted)
Oracle Cloud VM (141.147.134.176)
     ↓ localhost:3001
Docker Container (nusuk-api)
     ├── Express API (backend)
     ├── React Frontend (static files)
     ├── Puppeteer + Chromium (screenshots)
     └── Connects to → Supabase (database + storage)
```

## What Each Service Does

### Domain: nusuk-social.com (Namecheap, ~$10/year)
- The custom domain name people type in their browser
- Nameservers point to Cloudflare (kira.ns.cloudflare.com, langston.ns.cloudflare.com)

### Cloudflare (free)
- **SSL/HTTPS** — Free SSL certificate, so the site shows the lock icon
- **CDN** — Caches static files globally for faster loading
- **DDoS protection** — Blocks malicious traffic automatically
- **Cloudflare Tunnel** — Secure encrypted connection between Cloudflare and your server, so the server's IP is never exposed to the public
- **DNS** — Manages domain records

### Oracle Cloud VM (free tier)
- **What:** Virtual machine running Ubuntu 22.04 (1 OCPU, 12 GB RAM)
- **Where:** Saudi Arabia West (Jeddah) region
- **Cost:** Using trial credits (30 days). Keep retrying for Always Free Ampere A1 (ARM64, 4 OCPU, 24 GB) for $0/month permanently
- **IP:** 141.147.134.176 (but users never see this — they go through Cloudflare)

### Docker Container (on the VM)
- Packages the entire app (Node.js, Chromium, Arabic fonts) into one container
- Restarts automatically if it crashes (--restart=always)
- Runs the Express API on port 3001

### Supabase (free tier)
- **Database:** PostgreSQL — stores all posts, captures, metadata
- **Storage:** Stores screenshot images (captures bucket)
- **URL:** https://dwbpykdltqsehqeextjq.supabase.co

## Access Control

| Page | Public | Admin (login required) |
|------|--------|----------------------|
| Dashboard | ✅ | ✅ |
| Posts | ✅ | ✅ |
| Weekly Report | ✅ | ✅ |
| Capture | ❌ | ✅ |
| Monitor | ❌ | ✅ |
| Backup | ❌ | ✅ |
| Recently Deleted | ❌ | ✅ |

**Admin login:** r.endargiri@gmail.com (token expires after 7 days)

## Key Files & Credentials

| What | Where |
|------|-------|
| SSH key | `~/.ssh/nusuk-oracle` (your Mac) |
| Server env vars | `/tmp/nusuk.env` (on the VM) |
| Cloudflare Tunnel config | `/etc/cloudflared/config.yml` (on the VM) |
| Tunnel credentials | `/root/.cloudflared/46886459-...json` (on the VM) |
| Docker image | `nusuk-api:latest` (on the VM) |
| Supabase keys | In `.env` file (local) and `/tmp/nusuk.env` (VM) |

## How to Deploy Changes

After making code changes locally, run one command:

```bash
bash /Users/yiri/Desktop/Projects/Nusuk-Dashboard/scripts/ops/deploy.sh
```

This script automatically:
1. Packages the project (excluding node_modules, .git)
2. Uploads it to the server
3. Stops the old container
4. Builds a new Docker image
5. Starts the new container with env vars

## How to SSH into the Server

```bash
ssh -i ~/.ssh/nusuk-oracle ubuntu@141.147.134.176
```

Useful commands on the server:
```bash
sudo docker ps                          # Check if container is running
sudo docker logs nusuk-api --tail 30    # View app logs
sudo docker restart nusuk-api           # Restart without rebuilding
sudo systemctl status cloudflared       # Check tunnel status
sudo systemctl restart cloudflared      # Restart tunnel
```

## URLs

| URL | What |
|-----|------|
| https://nusuk-social.com | Production site (via Cloudflare) |
| http://141.147.134.176:3001 | Direct server access (backup) |
| https://dash.cloudflare.com | Cloudflare dashboard |
| https://cloud.oracle.com | Oracle Cloud console |
| https://supabase.com/dashboard | Supabase dashboard |
| https://github.com/YIRIII/Nusuk-Dashboard | Source code |

## Monthly Costs

| Service | Cost |
|---------|------|
| Oracle Cloud VM | $0 (trial, then free tier if Ampere available) |
| Cloudflare | $0 (free plan) |
| Supabase | $0 (free tier) |
| Domain (nusuk-social.com) | ~$10/year |
| **Total** | **~$0.83/month** |

## What to Do if Something Breaks

### Site is down
1. SSH into the server
2. Run `sudo docker ps` — is the container running?
3. If not: `sudo docker start nusuk-api`
4. Check logs: `sudo docker logs nusuk-api --tail 50`

### Tunnel is down (site loads but shows Cloudflare error)
1. SSH into the server
2. `sudo systemctl status cloudflared`
3. If not running: `sudo systemctl restart cloudflared`

### Need to redeploy
1. Make changes locally
2. Run `bash /Users/yiri/Desktop/Projects/Nusuk-Dashboard/scripts/ops/deploy.sh`

### Oracle trial expires
- Try creating a VM.Standard.A1.Flex (Always Free ARM64) instance
- If successful, migrate using the same deploy script (update IP in deploy.sh)
- Delete the paid E5 instance
