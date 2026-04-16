# Phase 5: MVP Hardening & Launch

**Generated:** 2026-04-15 | **Source:** idea-forge/nusuk-social-tracker-v2 | **Tier:** A
**Status:** planned

## Research Links
- **BRD Section:** NFR-1 (0 process kills on 100-URL batch), NFR-2 (latency), NFR-3 (correctness)
- **PRD Section:** Phase 1 MVP go/no-go criteria
- **Constraint Validation:** C-10 (timeline WARNING — 15% headroom)

## Recommended Tech Stack
No new dependencies. Uses everything from Phases 0–4.

## Estimated Cost
$0 recurring. Founder time: ~40–60h for hardening + dry-run.

## Budget Context
- **Phase cost vs. budget:** 0%. PASS.

## Prerequisites
- Phases 0–4 all complete.
- Hajz target date confirmed (KI-005) — this drives the launch decision.

## Regulatory Deadlines
- Hajz target date — binding launch deadline. PDPL + X ToS docs must be finalized before exposing data to analyst.

## Constraint Validation
- **Affected constraints:** C-10 (WARNING — timeline headroom).
- **Warnings:** If Phases 0–4 slip, defer Phase 6 entirely; launch with MVP.

## Implementation Steps
- [ ] **5.1:** Run 10× consecutive 100-URL batches against a curated corpus. Log RSS, duration, success rate per stage. **Pass bar:** 0 process kills across all 10 runs.
- [ ] **5.2:** Measure p50 and p95 single-capture latency on 200 URLs. **Pass bar:** p50 <20s, p95 <40s (NFR-2).
- [ ] **5.3:** Full golden-file suite run on CI (ARM64 QEMU) + prod. **Pass bar:** 0 regressions.
- [ ] **5.4:** Analyst dry-run: one complete weekly cycle (paste URLs → review → export Excel + PDF + ZIP → deliver to stakeholders). Capture feedback, fix P1 blockers.
- [ ] **5.5:** Launch checklist:
  - [ ] Cloudflare Tunnel access list locked to analyst + leadership IPs/emails.
  - [ ] Supabase daily backup enabled (free tier supports this).
  - [ ] Runbook documenting: pod restart, VM reboot, Chromium crash recovery, Supabase connection loss.
  - [ ] CLAUDE.md updated with "production" status + on-call contact.
  - [ ] Golden-file baseline frozen at launch commit; refresh cadence documented.

## Key Decisions (from research)
- Go/no-go gates are BRD-derived NFRs, not arbitrary. If any fails, defer launch rather than ship broken — v1's reputation damage from failure is the reason v2 exists.
- Phase 6 items explicitly excluded from launch gate: launching "complete enough" is better than a 2-month delay to ship Sentry.
- Golden-file baseline freeze at launch commit: future Chromium updates may shift shaping slightly; we refresh baselines deliberately, not automatically.

## Acceptance Criteria
- All 5 NFRs (reliability, latency, correctness, cost, type-safety) verified by measurement.
- Analyst signs off on dry-run weekly cycle.
- Runbook + launch checklist checked in to `PROJECT_STATUS/docs/technical/runbook.md`.

## Competitive Context
N/A for this phase — launch gate, not a feature.

## Research Gaps
None.
