# PDPL Processing Activity Record — Hadaq Tracker v2

**Regulation:** Saudi Personal Data Protection Law (PDPL), effective September 2024
**Record Version:** 1.0 | **Date:** 2026-04-15
**Owner:** Nusuk Card program (PR/comms analyst + program leadership)

## Controller
Nusuk Card program — public communications function.

## Purpose of processing
Archival of public mentions of the Nusuk Card across Twitter/X and publicly accessible news articles, for the purpose of weekly PR/comms reporting to program leadership.

## Lawful basis
**Archival basis** (PDPL archival / public-interest grounds) + **legitimate interest** of the Nusuk Card program to monitor and report on public perception of a government program. Only public data from public URLs is captured.

## Data subjects
- Members of the public who have posted on Twitter/X in reference to the Nusuk Card (usernames + post content visible publicly)
- Authors of news articles referencing the Nusuk Card

## Categories of personal data
- Public social handles / usernames
- Post text / article text (public)
- Timestamp of the public post
- Publicly attached media (images, videos, GIFs)
- Public URL of the original post or article

**Not collected:** email, phone, geolocation beyond what is published publicly, inferred sensitive attributes, IP addresses of data subjects, any private-message or DM content.

## Recipients
- Internal: PR/comms analyst (primary user), program leadership (recipients of weekly reports)
- External: none. Reports are not published externally; exports are shared only within the Nusuk Card program.

## Cross-border transfers
**Supabase region:** `ap-northeast-1` (Tokyo, Japan).

This is a cross-border transfer outside KSA. Documented basis:
- The tool captures **only already-public data** (public tweets, public news articles). No non-public personal data is transferred.
- Data subjects have not submitted any data to the Nusuk Card program through this tool; the program acts as the controller of a public-monitoring archive.
- Supabase Inc. provides SOC 2 Type II attestation and AES-256 encryption at rest.
- Access from outside the Nusuk Card program is blocked at the network layer (Cloudflare Tunnel access list).

If PDPL guidance tightens to require KSA residency for even public-data archives, migrate to a Supabase region inside or adjacent to KSA (currently `eu-central-1` Frankfurt is the closest offered region; Saudi-resident Postgres hosting evaluated as fallback).

## Retention
- Captured rows: kept indefinitely while analyst references them for reporting
- Soft-deleted rows: hard-deleted 30 days after `deleted_at` (enforced by `pg_cron` job `purge_expired_posts`, see `supabase/migrations/20260415000001_init.sql`)
- Backups (Phase 6): weekly ZIP retained for 12 months on GitHub Releases; older releases deleted manually or via rotation script

## Security measures
- Network perimeter: Cloudflare Tunnel with access list restricted to analyst + leadership
- Transport: TLS 1.3 end-to-end via Cloudflare
- At-rest: Supabase-managed encryption (AES-256)
- Application: TypeScript strict + Zod boundary validation; structured logging with trace IDs for auditability
- Secrets: environment variables only; no secrets in repo
- Authentication: network-layer (Cloudflare Access); no in-app accounts (single-tenant internal tool)

## Data subject rights
Because the tool captures only public data and does not offer a service to data subjects, rights are exercised via the underlying platform (Twitter/X, news publisher). If a data subject contacts the Nusuk Card program directly requesting deletion of their captured record, the analyst performs a soft-delete; the 30-day purge finalizes erasure.

## Breach response
Incident handling routed via program leadership; logs (pino → stdout, Phase 6 Axiom) provide forensic trail with trace IDs.

## Review cadence
Annually, or when processing purposes change.
