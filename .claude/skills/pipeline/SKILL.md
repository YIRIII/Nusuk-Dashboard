---
name: pipeline
description: >
  Project implementation pipeline — setup, continue, update, plan, or check status.
  Use when: (1) user invokes /pipeline, (2) user says "continue pipeline",
  "continue", "next step", or similar, (3) at the start of a new session
  to pick up where the last session left off. This skill detects the current project,
  reads its pipeline config, determines what step to work on next, implements it,
  and documents progress. If no pipeline exists, it bootstraps one.
  Modifiers: `/pipeline` (continue), `/pipeline update` (sync docs),
  `/pipeline setup` (force setup), `/pipeline status` (show state),
  `/pipeline plan <idea-path>` (generate pipeline plan from idea-forge research),
  `/pipeline extend <description>` (add new features to existing pipeline).
---

# /pipeline — Universal Project Pipeline Skill

## Modifiers

| Command | Mode | Description |
|---------|------|-------------|
| `/pipeline` | Continue | Find next step, implement it, update docs (default) |
| `/pipeline update` | Update | Sync all tracking documents to reality — no code changes |
| `/pipeline setup` | Setup | Force first-time setup even if partially configured |
| `/pipeline status` | Status | Show current state (what's done, next step, blockers) — read-only |
| `/pipeline plan <idea-path>` | Plan | Generate roadmap + detailed planning docs from idea-forge research |
| `/pipeline extend <description>` | Extend | Add new features/systems to an existing pipeline with full project context |
| `/pipeline help` | Help | Show skill description and available modifiers |

---

## Step 0: Project Detection (ALWAYS runs first)

Determine which project you're in and load ONLY that project's data.

### 0.1 Identify the Project

Use the current working directory. Do NOT read files from other projects.

### 0.2 Find the Pipeline Config

Look in this order:

1. `PROJECT_STATUS/pipeline-config.md` — standard location
2. `temp/PIPELINE_STATUS/pipeline-config.md` — legacy location (will be migrated)
3. `PROJECT_STATUS/roadmap.md` — pipeline exists but may need config file
4. `temp/PIPELINE_STATUS/roadmap.md` — legacy location (will be migrated)

**Pipeline found in `PROJECT_STATUS/`** → Proceed to requested mode.
**Pipeline found in `temp/PIPELINE_STATUS/` only** → Run "Legacy Migration" first.
**No pipeline found** → Run "Idea-Forge Detection" (0.3), then "First-Time Setup".
**`/pipeline setup` invoked** → Run "First-Time Setup" regardless.
**`/pipeline plan <path>` invoked** → Run "Plan Mode" directly.
**Idea-forge path provided via `@` context** (e.g., `/pipeline @"path/to/ideas/joween"` or `/pipeline plan @"path/..."`) → The `@` syntax attaches a folder as IDE context but does NOT appear as a text argument. Check the conversation context for any attached paths containing idea-forge research files (IDEA.md, BRD.md, PRD.md, TECHNICAL_OPTIONS/, etc.). If found, treat it as `/pipeline plan <that-path>` and run Plan Mode directly.

### 0.3 Idea-Forge Detection (runs when no pipeline found AND plan mode was NOT explicitly invoked)

Before running First-Time Setup, check if the current project contains idea-forge research documents. Scan the project root for:

```
Check for these idea-forge signatures:
- IDEA.md (idea concept file)
- preparation/INITIAL-BRD.md (initial BRD)
- BUDGET_CONTEXT.md (budget envelope and tier thresholds)
- CUSTOMER_VALIDATION/ (directory with README.md + numbered .md files)
- BUSINESS_RESEARCH/ (directory with README.md + numbered .md files)
- SUPPORTING_SYSTEMS/ (directory with README.md + numbered .md files)
- MARKETING_STRATEGY/ (directory with README.md + numbered .md files)
- TECHNICAL_OPTIONS/ (directory with README.md + numbered .md files)
- PRICING_STRATEGY/ (directory with README.md + numbered .md files)
- CONSTRAINT_VALIDATION/ (directory with README.md + numbered .md files)
- RISK_ASSESSMENT/ (directory with README.md + numbered .md files)
- BRD.md (final BRD)
- PRD.md (product requirements document)
- RESEARCH.md (raw research notes)
```

**Classify into tiers based on what's found:**

**Tier A — Full Research** (all present):
  `IDEA.md` + `BRD.md` + `PRD.md` + `BUSINESS_RESEARCH/` + `TECHNICAL_OPTIONS/` + `PRICING_STRATEGY/` + `CONSTRAINT_VALIDATION/`
  *(bonus: `SUPPORTING_SYSTEMS/`, `MARKETING_STRATEGY/`, `RISK_ASSESSMENT/`, `CUSTOMER_VALIDATION/`, `BUDGET_CONTEXT.md` — extract during Phase 2 if present)*

**Tier B — Partial Research** (core + at least 2 research folders):
  `IDEA.md` + (`preparation/INITIAL-BRD.md` OR `BRD.md`) + at least 2 of [`BUSINESS_RESEARCH/`, `SUPPORTING_SYSTEMS/`, `MARKETING_STRATEGY/`, `TECHNICAL_OPTIONS/`, `PRICING_STRATEGY/`, `CONSTRAINT_VALIDATION/`, `RISK_ASSESSMENT/`, `CUSTOMER_VALIDATION/`]

**Tier C — Minimal** (BRD/PRD but no deep research):
  `IDEA.md` + `BRD.md` + `PRD.md` (but missing research folders)

**Tier D — Insufficient**:
  Only `IDEA.md` or none of the above → skip detection, proceed to normal First-Time Setup.

**When Tier A detected, prompt:**
```
Detected complete idea-forge research:
  - IDEA.md, BRD.md, PRD.md
  - BUSINESS_RESEARCH/ (N feature analyses)
  - SUPPORTING_SYSTEMS/ (N system analyses) [if present]
  - MARKETING_STRATEGY/ (N phase analyses) [if present]
  - TECHNICAL_OPTIONS/ (N capability analyses)
  - PRICING_STRATEGY/ (N phase analyses)
  - CONSTRAINT_VALIDATION/ — Verdict: [PASS/CONDITIONAL PASS/FAIL]
  - RISK_ASSESSMENT/ (N risk categories) — [Go/Conditional-Go/No-Go] [if present]
  - CUSTOMER_VALIDATION/ (validation score: N/40) [if present]
  - BUDGET_CONTEXT.md (tier: [Bootstrap/Growth/Scale]) [if present]

(a) Generate a comprehensive pipeline plan from this research
(b) Skip — set up an empty pipeline and plan manually
```

**When Tier B detected, prompt:**
```
Detected partial idea-forge research:
  - Found: [list what exists]
  - Missing: [list what's missing]

Missing research affects plan quality:
  - [specific impact per missing item, e.g., "No PRICING_STRATEGY/ → can't determine MVP tier features"]
  - No CONSTRAINT_VALIDATION/ → can't verify combined feasibility or catch cross-capability conflicts
  - No RISK_ASSESSMENT/ → can't prioritize risk mitigations or flag high-risk phases
  - No BUDGET_CONTEXT.md → can't validate phase costs against budget envelope
  - No CUSTOMER_VALIDATION/ → assumption confidence is lower (no primary research)

(a) Generate plan with available research (gaps noted in planning docs)
(b) Skip — set up an empty pipeline and plan manually
```

**When Tier C detected, prompt:**
```
Found BRD.md and PRD.md but no deep research folders (BUSINESS_RESEARCH/, TECHNICAL_OPTIONS/, PRICING_STRATEGY/).
Plan will be high-level only — phases from PRD features, but without:
  - Priority scoring or impact severity (no business research)
  - Tech stack decisions or cost estimates (no tech research)
  - Tier-to-feature mapping for MVP sequencing (no pricing research)

(a) Generate high-level plan (phases from PRD, no detailed step plans)
(b) Skip — set up an empty pipeline and plan manually
```

If user picks **(a)** in any tier → run Plan Mode with `<idea-path>` set to current project root.
If user picks **(b)** → proceed to normal First-Time Setup.

---

## Standard File Structure

Every project gets this structure. Files marked CORE are always created. Files marked AUTO are created by the skill when needed. Files marked OPTIONAL are created only when the project needs them.

```
PROJECT_STATUS/
  pipeline-config.md          -- CORE: project paths, conventions, verification command
  roadmap.md                  -- CORE: lean master checklist (links to detail files)
  known-issues.md             -- CORE: active bugs/issues tracker
  index.md                    -- CORE: table of contents (auto-maintained)
  phases/                     -- CORE: one .md per completed phase
  fixed-issues/               -- CORE: categorized bug fix records (searchable)
  docs/
    planning/                 -- CORE: detailed step-by-step plans for upcoming work
    technical/                -- CORE: architecture, conventions, reference docs
    reports/                  -- OPTIONAL: analysis reports
  project_documents/           -- AUTO: snapshot of idea-forge research (created by /pipeline plan)
    IDEA.md                   --   idea concept (read-only snapshot)
    BRD.md                    --   final BRD (if existed at plan time)
    PRD.md                    --   PRD (if existed at plan time)
    INITIAL-BRD.md            --   initial BRD from preparation/
    BUDGET_CONTEXT.md         --   budget envelope & tier thresholds
    CUSTOMER_VALIDATION/      --   customer validation artifacts snapshot
    BUSINESS_RESEARCH/        --   full business research folder snapshot
    SUPPORTING_SYSTEMS/       --   full supporting systems folder snapshot
    MARKETING_STRATEGY/       --   full marketing strategy folder snapshot
    TECHNICAL_OPTIONS/        --   full tech options folder snapshot
    PRICING_STRATEGY/         --   full pricing strategy folder snapshot
    CONSTRAINT_VALIDATION/    --   feasibility validation folder snapshot
    RISK_ASSESSMENT/          --   risk assessment folder snapshot
    RESEARCH.md               --   raw research notes
    plan-manifest.md          --   records what was copied, source path, date, tier
  migration-log.md            -- AUTO: created when files are moved
  CONTINUE-PROMPT.md          -- AUTO: created when context runs low
  notes.md                    -- OPTIONAL: deviations from plan (only for detailed plans)
  [project-specific files]    -- varies per project (listed in pipeline-config.md)
```

**project_documents/ folder rules:**
- Created ONLY by `/pipeline plan` — never by other modes
- **Read-only after creation** — never edited during implementation. It's a snapshot.
- If the user re-runs `/pipeline plan`, the old snapshot is archived to `project_documents/archived/[date]/` before the new one is written
- Planning docs in `docs/planning/` link back to `project_documents/` files for traceability
- During `/pipeline continue`, sub-agents may READ project document files for context but NEVER modify them

### Lean Roadmap Format

`roadmap.md` MUST be kept lean (~100-150 lines max). Details go in planning docs.

```markdown
# Roadmap
**Last Updated:** [date] | **Next:** [step ID]

## Phase Name 🚧
- [x] **Step-ID:** Short description → [plan](docs/planning/step-plan.md)
- [ ] **Step-ID:** Short description → [plan](docs/planning/step-plan.md)
- [ ] **Step-ID:** Short description (no plan needed for simple steps)
```

Each line: `checkbox` + `ID` + `short name` + optional `→ [plan](link)`.
The skill reads the roadmap to find the next `[ ]` step, then reads ONLY that step's linked plan file. This avoids loading 600 lines to find a 5-line step.

### known-issues.md Format

```markdown
# Known Issues
**Last Updated:** [date]

| ID | Issue | Severity | Found | Related |
|----|-------|----------|-------|---------|
| KI-001 | Description | High/Medium/Low | [date] | Phase/Step ref |
```

When an issue is fixed, move it to `fixed-issues/` and remove from this file.

### fixed-issues/ Format

One `.md` file per category (e.g., `api-fixes.md`, `ui-fixes.md`, `admin-fixes.md`). Each file:

```markdown
# [Category] Fixes

## FI-001: Short title
**Fixed:** [date] | **Was:** KI-001 | **Phase:** [ref]
**Problem:** What was wrong
**Fix:** What was changed and why
**Files:** List of modified files
```

### index.md Format

```markdown
# [Project Name] — Documentation Index

## Quick Links
- [Roadmap](roadmap.md) | [Known Issues](known-issues.md) | [Pipeline Config](pipeline-config.md)

## Planning Docs
- [Step Plan Name](docs/planning/step-plan.md) — status

## Phase Records
- [Phase 1: Name](phases/phase-1.md) — COMPLETE
```

Auto-maintained: the skill updates this when files are added or moved.

---

## Legacy Migration (temp/PIPELINE_STATUS/ → PROJECT_STATUS/)

When pipeline files exist in `temp/PIPELINE_STATUS/` but not in `PROJECT_STATUS/`:

1. **Check if `PROJECT_STATUS/` exists.** If not, create it.
2. **Inventory files to move.** Map each file to its destination.
3. **Run Safe File Migration** (see section below) for each file.
4. **Update `pipeline-config.md`** paths.
5. **Clean up** empty `temp/PIPELINE_STATUS/` and `temp/` directories.
6. **Report** what was migrated.

---

## Safe File Migration System

**MUST be used whenever files are moved or renamed.** Prevents broken references.

### Step 1: Build Reference Map

Before moving any file, scan the project for references to it:

```
Scan these files for references:
- CLAUDE.md / claude-instructions.md
- README.md
- All .md files in PROJECT_STATUS/ and temp/
- .claude/settings.json
- Any other docs referenced in CLAUDE.md
```

For each file being moved, search for its path (relative and absolute). Build:
```
old_path → new_path → referenced_in: [file1.md:L23, file2.md:L45]
```

### Step 2: Check for Unsafe References

Flag references in files that should NOT be auto-modified:
- Compiled/minified files, binaries, lock files, third-party configs

If unsafe references found → **STOP and ask the user**.

### Step 3: Move Files

For each file:
1. Create destination directory if needed
2. If destination file exists and differs → **STOP and ask the user**
3. Copy → verify → delete original

### Step 4: Update All References

Replace old paths with new paths in every referencing file.

### Step 5: Write Migration Log

Append to `PROJECT_STATUS/migration-log.md`:
```markdown
## [date] — [description]
| Old Path | New Path | References Updated |
|----------|----------|--------------------|
| old/path | new/path | CLAUDE.md:L42 |

**Files moved:** N | **References updated:** N across M files
```

### Step 6: Verify

Grep entire project for remaining old-path references. Flag any found.

---

## Conflict Resolution (during First-Time Setup)

When scanning finds multiple files that serve the same purpose:

### Detection

Look for duplicates of:
- **Roadmaps:** `roadmap.md`, `ROADMAP.md`, `TODO.md`, `todo.md`, `plan.md`
- **Issue trackers:** `known-issues.md`, `bugs.md`, `issues.md`, `TODO.md`
- **Phase records:** multiple `phases/`, `milestones/`, `changelog/` directories
- **Planning docs:** `planning/`, `plans/`, `docs/planning/` in different locations

### Resolution

When duplicates are found, **STOP and present them to the user:**

```
Found 2 potential roadmaps:

1. PROJECT_STATUS/roadmap.md
   - Last modified: 2026-01-30 | 622 lines | 45 checked, 12 unchecked
   - Preview: [first 5 lines]

2. docs/TODO.md
   - Last modified: 2025-11-15 | 89 lines | 20 checked, 5 unchecked
   - Preview: [first 5 lines]

Options:
(a) Use #1 (newer/more complete) — archive #2 to PROJECT_STATUS/archived/
(b) Use #2 — archive #1
(c) Merge both into one roadmap (I'll combine, you confirm)
(d) Keep both — tell me which is primary
```

Apply the user's choice, then continue setup.

**For phase/planning directories with overlapping content:** same approach — present, ask, merge or archive.

Archived files go to `PROJECT_STATUS/archived/` with a date prefix: `2026-03-08_old-roadmap.md`

---

## First-Time Setup

### Pre-Setup: Scan for Existing Documentation

Scan the project for existing doc structures:

```
Check for:
- PROJECT_STATUS/, docs/, documentation/, temp/, planning/
- CLAUDE.md, claude-instructions.md, README.md
- roadmap.md, TODO.md, CHANGELOG.md, known-issues.md
- phases/, milestones/ directories
- Any *plan*.md, *status*.md files
```

### Scenario A: Project has existing workflow docs

1. **Read the project's instruction file** (CLAUDE.md or claude-instructions.md).

2. **Run Conflict Resolution** if duplicates found.

3. **Plan the consolidation.** For each existing file:
   - Already in `PROJECT_STATUS/` → keep as-is
   - In a different location, same purpose → migrate via Safe File Migration
   - Unique to this project → add as project-specific file
   - Not doc-related → leave where it is

4. **Present the plan to the user BEFORE executing.** Show what moves, what's created, what references update. Ask for confirmation.

5. **Execute** using Safe File Migration.

6. **Create core files** that don't exist yet:
   - `pipeline-config.md` (see template below)
   - `roadmap.md` (lean format — convert existing if needed)
   - `known-issues.md` (populate from existing issues if found)
   - `index.md` (auto-generate from current file inventory)
   - `phases/` directory
   - `fixed-issues/` directory
   - `docs/planning/` and `docs/technical/` directories

7. **Update CLAUDE.md** to reference the new structure.

8. **Report and confirm** before proceeding with implementation.

### Scenario B: New project or no workflow docs

1. **Ask the user** what the project is about
2. **Create `CLAUDE.md`** (or append workflow section) with project basics
3. **Create the full `PROJECT_STATUS/` structure** with all core files
4. **Generate roadmap** from user input — ask clarifying questions if needed
5. **Report and confirm**

### pipeline-config.md Template

```markdown
# Pipeline Config — [Project Name]

**Project Root:** [absolute path]
**Instruction File:** [CLAUDE.md path]
**Created:** [date]

## Key Paths
- **Source code:** [main source directory]
- **Tests:** [test directory if applicable]
- **Documentation:** PROJECT_STATUS/
- **Planning docs:** PROJECT_STATUS/docs/planning/
- **Phase records:** PROJECT_STATUS/phases/

## Project Conventions
[Language, framework, coding style, patterns — extracted from instruction file]

## Verification Command
[e.g., `npx tsc --noEmit`, `npm test`, `php artisan test`, `flutter analyze`, or "manual"]

## Extra Project Files
[Project-specific files beyond standard structure]
```

---

## Status Mode

When invoked with `status`, provide a read-only overview:

1. Read `pipeline-config.md` and `roadmap.md`
2. Count completed vs remaining steps
3. Read `known-issues.md` for active issues
4. Display:

```
Pipeline Status — [Project Name]
================================
Progress: 23/31 steps complete (74%)
Current phase: Phase 17F-8 — Website Source Adaptation
Next step: 17F-8B — Booking Status Mapping → [plan link]
Blockers: none
Known issues: 3 active (1 high, 2 medium)
Last activity: 2026-03-08
```

No files modified. No implementation.

---

## Plan Mode — Research-to-Pipeline Converter

Invoked by `/pipeline plan <idea-path>` or by auto-detection during First-Time Setup.

**Purpose:** Transform idea-forge research documents into a pipeline-ready implementation plan: a lean roadmap + detailed planning docs + research snapshot.

**Input:** `<idea-path>` — path to an idea-forge idea folder (e.g., `../idea-forge/ideas/joween` or a local folder within the project).

**Output:**
- `PROJECT_STATUS/project_documents/` — read-only snapshot of source research
- `PROJECT_STATUS/roadmap.md` — lean phase/step checklist
- `PROJECT_STATUS/docs/planning/` — one detailed plan file per phase
- `PROJECT_STATUS/pipeline-config.md` — project config (created or updated)
- `PROJECT_STATUS/index.md` — auto-generated TOC
- `PROJECT_STATUS/known-issues.md` — initialized (empty or with known gaps)

---

### Plan Phase 1: Discovery & Validation

**1.1 Validate the idea path exists and scan for research files:**

```
Required (at least IDEA.md must exist):
  <idea-path>/IDEA.md

Full research set:
  <idea-path>/IDEA.md
  <idea-path>/RESEARCH.md
  <idea-path>/BUDGET_CONTEXT.md
  <idea-path>/preparation/INITIAL-BRD.md
  <idea-path>/CUSTOMER_VALIDATION/README.md + numbered .md files
  <idea-path>/BUSINESS_RESEARCH/README.md + numbered .md files
  <idea-path>/SUPPORTING_SYSTEMS/README.md + numbered .md files
  <idea-path>/MARKETING_STRATEGY/README.md + numbered .md files
  <idea-path>/TECHNICAL_OPTIONS/README.md + numbered .md files
  <idea-path>/PRICING_STRATEGY/README.md + numbered .md files
  <idea-path>/CONSTRAINT_VALIDATION/README.md + numbered .md files
  <idea-path>/RISK_ASSESSMENT/README.md + numbered .md files
  <idea-path>/BRD.md
  <idea-path>/PRD.md
```

**1.2 Classify the research tier** (same tiers as 0.3 Idea-Forge Detection):

| Tier | What's Available | Plan Quality |
|------|-----------------|--------------|
| **A — Full** | All files present including CONSTRAINT_VALIDATION/ | Comprehensive: prioritized phases, tech decisions, cost estimates, MVP sequencing, feasibility-validated, budget-scoped |
| **B — Partial** | IDEA + BRD/INITIAL-BRD + 2+ research folders | Good with gaps: missing research noted in each affected planning doc |
| **C — Minimal** | IDEA + BRD + PRD only | High-level only: phases from PRD features, no detailed step plans |
| **D — Insufficient** | Only IDEA.md | **STOP.** Tell user: "Not enough research to generate a plan. Run idea-forge pipeline first (/brd-generator → /business-research → /tech-research → /pricing-strategy → /prd-generator), then re-run /pipeline plan." |

**1.3 If pipeline already exists** (PROJECT_STATUS/roadmap.md has content):
- Warn: "A pipeline plan already exists with N phases (M% complete). Re-running will archive the current plan."
- Ask for confirmation before proceeding.
- If confirmed, archive current roadmap and planning docs to `PROJECT_STATUS/archived/[date]/`

---

### Plan Phase 2: Extract & Prioritize

Read the research READMEs using sub-agents to avoid context bloat. Each sub-agent reads ONE research folder and returns a structured summary.

**2.1 Business Research Extraction** (skip if BUSINESS_RESEARCH/ missing)

Read `BUSINESS_RESEARCH/README.md` and extract:

```
For each feature:
  - BR-ID (e.g., BR-1)
  - Feature name
  - Novelty rating (novel / incremental / saturated)
  - Impact severity (Life-threatening / Safety risk / Major inconvenience / Minor inconvenience)
  - Competitor count
  - Key competitive gap (1 sentence)
```

Also extract the priority scoring matrix if present (features are often scored/ranked in the README).

**2.2 Technical Options Extraction** (skip if TECHNICAL_OPTIONS/ missing)

Read `TECHNICAL_OPTIONS/README.md` and extract:

```
For each capability:
  - TC-ID (e.g., TC-1, derived from the numbered file)
  - Capability name
  - Tech tier (Hero / Depth / Supporting / Skip)
  - Recommended option (name + approach: Build / Integrate / Build+License)
  - Estimated Year 1 cost
  - Linked BR-IDs
  - Key dependencies on other capabilities (if noted)
```

**2.3 Pricing Strategy Extraction** (skip if PRICING_STRATEGY/ missing)

Read `PRICING_STRATEGY/README.md` and extract:

```
  - Tier names and price points (e.g., Starter SAR 0, Growth SAR 99)
  - Feature-to-tier mapping (which features are in which tier)
  - Revenue model (subscription, commission, hybrid)
  - Key metrics (ARPU, breakeven point, LTV:CAC)
```

**2.4 Supporting Systems Extraction** (skip if SUPPORTING_SYSTEMS/ missing)

Read `SUPPORTING_SYSTEMS/README.md` and extract:

```
For each system:
  - System name
  - Priority tier (Essential / Growth / Enterprise)
  - Recommendation (Build / Buy: vendor / Open-source: name)
  - Year 1 cost estimate
  - Impact dimensions (Revenue / Conversion / Operations / Compliance)
  - Integration requirements with product features
```

Also extract the Cost Impact Summary (total by tier) and Build vs Buy breakdown.

**2.5 Marketing Strategy Extraction** (skip if MARKETING_STRATEGY/ missing)

Read `MARKETING_STRATEGY/README.md` and extract:

```
  - GTM model (PLG / Sales-Led / Community-Led / Hybrid)
  - Growth loop type
  - Primary channels and priority
  - Blended CAC and per-channel CAC
  - Year 1 marketing budget (by quarter)
  - Marketing-driven product features (features to prioritize for growth)
  - Channel sequencing by stage
```

**2.6 BRD/PRD Extraction** (always, if files exist)

Read `BRD.md` and/or `PRD.md` and extract:

```
  - Project name and description
  - Target users / personas
  - Feature list with acceptance criteria (if in PRD)
  - Non-functional requirements (performance, security, compliance)
  - Tech stack specified (if any)
  - Regulatory deadlines (e.g., ZATCA Wave 24 June 2026)
```

**2.7 Build the Feature-Capability Map**

Cross-reference BR-IDs ↔ TC-IDs using the "Linked BRs" column from tech research:

```
BR-1 (Online Booking) ↔ TC-2 (Booking Engine)
BR-2 (Payments) ↔ TC-3 (Payment Gateway)
BR-5 (Commission) ↔ TC-1 (Commission System)
...
```

Features without a matching capability → flag as "needs tech research" in the planning doc.
Capabilities without a matching feature → flag as "infrastructure/cross-cutting" (assign to Phase 0).

Also cross-reference:
- FAIL/WARNING constraints → affected TC-IDs (from Feasibility Matrix in constraint validation)
- Critical/High risks → affected features or phases (from mitigation timeline in risk assessment)
- High-risk assumptions → affected BR-IDs (from assumption map in customer validation)

Features with FAIL constraints → flag as "feasibility-blocked — needs remediation before implementation"
Features with Critical risk mitigations → flag as "risk-mitigated — mitigation steps required in phase plan"

**2.8 Constraint Validation Extraction** (skip if CONSTRAINT_VALIDATION/ missing)

Read `CONSTRAINT_VALIDATION/README.md` and extract:

```
  - Overall verdict: PASS / CONDITIONAL PASS / FAIL
  - Constraint register summary: N constraints checked, N PASS, N WARNING, N FAIL
  - FAIL constraints (if any): constraint ID, description, threshold vs. actual, top contributors
  - WARNING constraints (if any): constraint ID, description, headroom percentage
  - Compatibility issues: any CRITICAL/HIGH severity issues between options
  - Remediation roadmap items (if CONDITIONAL PASS or FAIL):
    For each remediation:
      - Constraint ID
      - Recommended remediation option
      - Effort estimate
      - Trade-off
  - Conditions for proceeding (if CONDITIONAL PASS): condition text + deadline
  - Blocking issues (if FAIL): issue + required upstream re-run
```

**2.9 Risk Assessment Extraction** (skip if RISK_ASSESSMENT/ missing)

Read `RISK_ASSESSMENT/README.md` and extract:

```
  - Go/No-Go recommendation: Go / Conditional-Go / No-Go / Defer
  - Risk profile: total risks, Critical count, High count
  - Critical risks (score 20-25):
    For each: risk ID, description, mitigation summary, timeline, cost of mitigation
  - High risks (score 12-19):
    For each: risk ID, description, mitigation summary, timeline
  - Conditions for proceeding (if Conditional-Go): condition text + deadline + risk addressed
  - Impact on pipeline documents table (which documents need adjustment)
  - Early warning triggers for Critical risks
```

**2.10 Budget Context Extraction** (skip if BUDGET_CONTEXT.md missing)

Read `BUDGET_CONTEXT.md` and extract:

```
  - Funding stage: Bootstrapped / Pre-seed / Seed / Series A+
  - Active budget tier: Bootstrap / Growth / Scale (infer from stage — Bootstrap for Bootstrapped)
  - Year 1 projected revenue
  - Budget envelope: per-domain ranges for the active tier (Marketing, Supporting Systems, Infrastructure, Development, Legal)
  - Total budget range for active tier
  - Cost sanity thresholds: single domain flag (>30% revenue), total block (>80% revenue)
  - Tier transition triggers
  - Revenue confidence: High / Medium / Low
```

**2.11 Customer Validation Extraction** (skip if CUSTOMER_VALIDATION/ missing)

Read `CUSTOMER_VALIDATION/README.md` and extract:

```
  - Validation scorecard verdict: Strong / Moderate / Weak / Failed (from preliminary or post-validation score)
  - Validation score (0-40, if available)
  - High-risk unvalidated assumptions:
    For each: assumption text, risk-if-wrong rating, current evidence level
  - Desk research key findings (1-3 sentences from competitor user research summary)
  - Whether primary research was conducted (surveys deployed? interviews done?)
```

---

### Plan Phase 3: Phase Sequencing

Use **4 signals** from the research to determine phase order. Each feature/capability gets a **composite priority score**:

#### Scoring Signals

| Signal | Source | Score | Weight |
|--------|--------|-------|--------|
| **Impact severity** | Business Research | Life-threatening=4, Safety=3, Major=2, Minor=1 | 30% |
| **Novelty rating** | Business Research | Novel=3, Incremental=2, Saturated=1 | 15% |
| **Tech tier** | Tech Research | Hero=4, Depth=3, Supporting=2, Skip=1 | 25% |
| **Pricing tier** | Pricing Strategy | Starter=4, Growth=3, Premium=2, Enterprise=1 | 30% |

**Composite score** = (Impact × 0.30) + (Novelty × 0.15) + (Tech Tier × 0.25) + (Pricing Tier × 0.30)

**When signals are missing** (Tier B/C), use equal weight on available signals only. Note the missing signal in the planning doc.

#### Sequencing Rules

1. **Phase 0 always comes first:** Project foundation — repo setup, CI/CD, database schema, auth, i18n, base UI, **and UI/UX Design System** (if the project has a frontend). Populate from non-functional requirements in BRD/PRD + infrastructure capabilities (TC items not linked to a specific BR). See "UI/UX Design System" section below for details.

2. **Regulatory deadlines override scoring:** Any feature with a hard deadline (e.g., ZATCA June 2026) gets promoted to the earliest feasible phase, regardless of score. Note the deadline in the phase plan.

3. **Dependency chains must be respected:** If TC-3 (Payments) depends on TC-1 (Commission), Commission must come first even if Payments scored higher. Read dependency notes from tech research.

4. **Group related features into phases:** Features that share the same capability or modify the same system areas should be in the same phase. Don't split BR-2 (Payments) and BR-9 (BNPL) into separate phases — they both use TC-3.

5. **Sort remaining by composite score** (highest first = earliest phase).

6. **Skip-tier features go last:** Capabilities marked "Skip" in tech research → final phases (nice-to-have).

7. **Constraint validation remediation first:** If CONDITIONAL PASS or FAIL, remediation actions become implementation steps. FAIL remediations that require upstream re-runs (e.g., "re-run /tech-research for TC-3") → add to known-issues.md as blockers. FAIL remediations that are implementation-level (e.g., "swap Option A for Option B in TC-3") → insert into the earliest phase containing the affected capability. WARNING constraints with low headroom → add a monitoring/verification step to the phase containing those capabilities.

8. **Critical risk mitigations are Phase 0 or Phase 1 candidates:** Any Critical risk (score 20-25) with a mitigation timeline of "immediately" or "before launch" → add mitigation steps to Phase 0. Critical risks with "Month 1-2" timeline → add to Phase 1. High risks with specific mitigation actions that map to a capability → add as a step in the phase containing that capability. If risk assessment has a No-Go recommendation → **STOP** and warn: "Risk assessment recommends No-Go. Generating a plan anyway, but flagging all phases as risk-blocked in known-issues.md."

9. **Supporting Systems Gap Check** (runs after product phases are sequenced — see below).

#### Supporting Systems Gap Check

Supporting systems (admin dashboards, RBAC, feedback tools, etc.) should ideally be researched in idea-forge via `/supporting-systems` before reaching the pipeline. When properly researched via `/supporting-systems`, they appear in `SUPPORTING_SYSTEMS/` with full build-vs-buy analysis, cost estimates, and priority classification. The pipeline reads `SUPPORTING_SYSTEMS/README.md` during extraction (Step 2.X) and sequences these systems based on their priority tier (Essential → early phases, Growth → mid phases, Enterprise → late phases).

**However**, if idea-forge didn't research supporting systems (older ideas, or the skill hasn't been run yet), the pipeline detects the gap and flags it.

**Detection: Scan research for these signals and check if corresponding supporting system research exists:**

| Signal in Research | Supporting System Expected | Research Exists? |
|-------------------|---------------------------|-----------------|
| Multiple user types / roles mentioned | User Management & RBAC | Check BUSINESS_RESEARCH/ for role/permission analysis |
| Admin features, dashboard, or management portal mentioned | Admin Dashboard | Check TECHNICAL_OPTIONS/ for admin tooling |
| Payments, subscriptions, or commission | Billing Administration | Check BUSINESS_RESEARCH/ for billing/refund analysis |
| Multi-tenant / enterprise tier / "organizations" | Multi-Tenancy & Org Management | Check TECHNICAL_OPTIONS/ for multi-tenancy |
| Consumer-facing app with multiple users | Feedback & Support System | Check BUSINESS_RESEARCH/ for support tooling |
| Email, SMS, or push notifications mentioned | Notification Management | Check TECHNICAL_OPTIONS/ for notification infrastructure |
| Sensitive data, compliance, or medical/financial data | Audit Logging | Check TECHNICAL_OPTIONS/ for audit/logging |
| API or integrations mentioned | API Management | Check TECHNICAL_OPTIONS/ for API gateway/rate limiting |
| User-generated content or profiles | Content Moderation | Check BUSINESS_RESEARCH/ for moderation analysis |
| E-commerce, orders, or inventory | Order Management & CS Tools | Check BUSINESS_RESEARCH/ for order management |
| Analytics, metrics, or KPIs mentioned | Analytics Dashboard | Check TECHNICAL_OPTIONS/ for analytics tooling |
| Onboarding, setup, or getting started flows | Onboarding System | Check BUSINESS_RESEARCH/ for onboarding analysis |
| Settings, preferences, or configuration | Settings & Preferences | Check TECHNICAL_OPTIONS/ for settings management |

**Three possible outcomes per system:**

**A. Research exists** → The system was already covered by idea-forge. It's in the scored features and gets sequenced naturally. No action needed.

**B. Research missing — system detected** → Flag it to the user:

```
Supporting Systems Gap Check
==============================
These supporting systems are implied by your research but weren't
explicitly researched in idea-forge:

Missing Research (affects cost estimates & business model):
  ! User Management & RBAC — multiple user types detected but no BR/TC analysis
  ! Admin Dashboard — admin features referenced but no dedicated research
  ! Feedback & Support — consumer-facing app, no support system researched

Already Researched (included in plan automatically):
  ✓ Notification Management — covered in TC-12
  ✓ Multi-Tenancy — covered in BR-4, TC-4

Options:
(a) Add missing systems to the plan anyway (high-level, no cost estimates)
    Note: Consider running /supporting-systems in idea-forge first for
    proper research that feeds into pricing strategy
(b) Go back to idea-forge and research them first (recommended for
    systems that affect costs/revenue)
(c) Skip — I'll add them later with /pipeline extend
```

**C. No signals detected** → System not needed for this project. Skip silently.

**If user picks (a)** — generate lightweight phases for the unresearched systems:
- Categorize into Essential/Growth/Enterprise tiers (same as before)
- **Essential** → insert after first product phase
- **Growth** → insert after mid-point
- **Enterprise** → insert as late phases
- Planning docs include a prominent **"Research Gap"** warning: "This system was not researched in idea-forge. Cost estimates, competitive analysis, and build-vs-buy decisions are not available. Consider running `/supporting-systems` research before implementing."
- Implementation steps are based on common patterns adapted to the project's stack

**If user picks (b)** — pause plan generation. Tell user to run `/supporting-systems` in idea-forge, then re-run `/pipeline plan`.

**Phase naming for unresearched supporting systems:**
```
Phase S1: User Management & Access Control (Essential) ⚠️ unresearched
Phase S2: Admin Dashboard — Core (Essential) ⚠️ unresearched
...
```

The ⚠️ marker in the roadmap reminds that these phases lack research backing.

#### Phase Structure

Each phase should contain **2-5 related features/capabilities**. If a single capability is very large (e.g., Medical Clinic Extension at $53K-$83K), it can be its own phase.

Name phases descriptively:
```
Phase 0: Project Foundation
Phase 1: Core Booking & Scheduling
Phase 2: Payments & Commission Engine
Phase 3: Compliance (ZATCA + PDPL)        ← deadline-driven
Phase 4: Multi-Branch & Provider Management
...
Phase N: Growth Features (AI, Loyalty, A/B)
```

#### Budget Envelope Check

If BUDGET_CONTEXT.md was extracted (step 2.10), validate each phase's estimated cost against the budget envelope:

1. **Sum phase costs** by domain (Infrastructure, Development, Marketing, Supporting Systems, Legal) using tech research Year 1 cost estimates.
2. **Compare against active tier envelope**: If any domain total exceeds the active tier's upper bound → flag in the phase planning doc.
3. **Run sanity checks**: If any single domain > 30% of Year 1 projected revenue → flag. If total across all domains > 80% of Year 1 revenue → add blocking warning to known-issues.md.
4. **Phase cost annotation**: Each phase gets a cost estimate compared to the budget. If a phase alone exceeds one tier's total budget → note that the phase may need to be split or deferred to a later tier.

This is advisory — it doesn't block plan generation, but warnings appear prominently in planning docs.

#### UI/UX Design System (Phase 0 Step)

**When to include:** Always include in Phase 0 if the project has a frontend/UI component. Detect by checking if the tech research recommends a frontend framework (React, Flutter, Vue, etc.) or if the BRD/PRD mentions user-facing features.

**Why this matters:** Without a design system reference, every Claude Code session invents its own colors, spacing, and component patterns — leading to inconsistent UI across the project. The design system doc acts as a single source of truth that every session reads before creating/modifying UI.

**Phase 0 should include these design system steps:**

```
- [ ] **0.X:** Create design system reference doc
- [ ] **0.Y:** Set up base UI components (shared component library)
- [ ] **0.Z:** Add design system reference to CLAUDE.md
```

**Step 0.X — Create design system reference doc** at `PROJECT_STATUS/docs/technical/design-system.md`:

During plan generation, ask the user:
```
Your project has a frontend. To keep UI consistent across all sessions,
I'll create a design system reference. A few questions:

1. Color theme preference?
   (a) Dark mode primary (light mode secondary)
   (b) Light mode primary (dark mode secondary)
   (c) Both equally supported
   (d) No preference — decide later in Phase 0

2. Do you have brand colors or a color palette in mind?
   (type hex codes, e.g., "#3B82F6 primary, #10B981 accent" or "no")

3. Component library preference?
   (a) shadcn/ui (Tailwind-based, customizable)
   (b) Material UI / MUI
   (c) Ant Design
   (d) Custom components only
   (e) No preference — decide later in Phase 0

4. Any responsive layout requirements?
   (a) Mobile-first (responsive)
   (b) Desktop-first
   (c) Desktop-only (admin/dashboard app)
   (d) Mobile app (React Native / Flutter)
```

Store the user's answers in the planning doc for Phase 0. The actual `design-system.md` file is created during Phase 0 implementation, not during plan generation.

**design-system.md template** (created during Phase 0 implementation):

```markdown
# Design System — [Project Name]

**Created:** [date] | **Last Updated:** [date]

## Theme
- **Mode:** [dark primary / light primary / both]
- **Brand colors:** [primary, accent, etc.]

## Color Tokens
| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `bg-base` | #ffffff | #0f172a | Page background |
| `bg-surface` | #f8fafc | #1e293b | Cards, panels |
| `bg-elevated` | #f1f5f9 | #334155 | Modals, dropdowns |
| `text-primary` | #0f172a | #f8fafc | Headings, body |
| `text-secondary` | #475569 | #94a3b8 | Labels, descriptions |
| `text-muted` | #94a3b8 | #64748b | Hints, placeholders |
| `border-default` | #e2e8f0 | #334155 | Borders, dividers |
| `primary` | [brand] | [brand] | Buttons, links, focus |
| `accent` | [brand] | [brand] | Highlights, badges |
| `danger` | #ef4444 | #f87171 | Errors, destructive |
| `success` | #22c55e | #4ade80 | Success states |
| `warning` | #f59e0b | #fbbf24 | Warning states |

## Typography
- **Font family:** [system/custom]
- **Scale:** [sizes for h1-h6, body, small, code]

## Spacing
- **Base unit:** [4px / 0.25rem]
- **Common gaps:** [component spacing patterns]

## Components
| Component | Source | Usage Notes |
|-----------|--------|-------------|
| Button | [library/custom] | Variants: primary, secondary, danger, ghost |
| Card | [library/custom] | Use for all content panels |
| Modal | [library/custom] | Width sizes: sm, md, lg, xl |
| Input | [library/custom] | Always include label + error state |
| Badge | [library/custom] | Status indicators |
| Tabs | [library/custom] | Navigation within panels |

## Responsive Breakpoints
| Name | Width | Usage |
|------|-------|-------|
| sm | 640px | Mobile |
| md | 768px | Tablet |
| lg | 1024px | Desktop |
| xl | 1280px | Wide desktop |

## Rules
- ALWAYS use semantic color tokens (e.g., `bg-surface`) — NEVER hardcode colors (e.g., `bg-gray-800`)
- ALWAYS import from the shared component library before creating new components
- Every new component must support both light and dark themes
- Test UI changes in both themes before marking complete
```

**Step 0.Z — Add to CLAUDE.md:**

During Phase 0 implementation, add this to the project's CLAUDE.md:

```markdown
## UI & Design System

When creating or modifying any UI component, ALWAYS read the design system first:
- **Design system:** PROJECT_STATUS/docs/technical/design-system.md
- **Shared components:** [path to component library]

Key rules:
- Use semantic color tokens, not hardcoded colors
- Import shared components before creating new ones
- Support both light and dark themes
```

This ensures every future Claude Code session reads the design system before touching UI.

**For projects without a frontend** (API-only, CLI tools, backend services): skip this entirely. Do not ask the questions or create the design system doc.

---

### Plan Phase 4: Generate Planning Docs

For each phase, create a detailed plan file at `PROJECT_STATUS/docs/planning/phase-N-name.md`.

#### Plan Document Template

```markdown
# Phase N: [Phase Name]

**Generated:** [date] | **Source:** [idea-path] | **Tier:** [A/B/C]
**Status:** planned

## Research Links
- **Business Research:** [BR-IDs] → [links to project_documents/BUSINESS_RESEARCH/NN-file.md]
- **Technical Options:** [TC-IDs] → [links to project_documents/TECHNICAL_OPTIONS/NN-file.md]
- **Pricing Tier:** [which tier(s) these features belong to]
- **BRD Section:** [relevant BRD section if applicable]
- **PRD Section:** [relevant PRD section if applicable]

## Recommended Tech Stack
[From tech research: recommended option, approach (Build/Integrate), key libraries/services]

## Estimated Cost
[From tech research: Year 1 cost estimate for this phase's capabilities]

## Budget Context
[Only if BUDGET_CONTEXT.md exists]
- **Active tier:** [Bootstrap/Growth/Scale]
- **Phase cost vs. budget:** [This phase's estimated cost as % of the active tier's total budget]
- **Domain breakdown:** [Cost split by domain — does any domain exceed its tier allocation?]
- **Sanity check:** [PASS/FLAG — does this phase push any domain past 30% of revenue?]

## Prerequisites
- [Phase X must be complete because: reason from dependency analysis]
- [External dependency: e.g., "Moyasar Payout API access required"]

## Regulatory Deadlines
[If any feature in this phase has a hard deadline, note it here prominently]
[e.g., "ZATCA Wave 24 deadline: June 2026 — this phase must complete before then"]

## Constraint Validation
[Only if CONSTRAINT_VALIDATION/ exists and this phase's capabilities have constraint findings]
- **Affected constraints:** [C-IDs with their verdicts — PASS/WARNING/FAIL]
- **Remediation steps included:** [If any remediation from the roadmap maps to this phase, list them as implementation steps below]
- **Warnings:** [WARNING constraints with low headroom — note monitoring requirements]

## Risk Mitigations
[Only if RISK_ASSESSMENT/ exists and this phase has Critical/High risks mapped to it]
- **Critical risks addressed:** [R-IDs with mitigation actions that are implementation steps in this phase]
- **High risks to monitor:** [R-IDs relevant to this phase's capabilities — note early warning triggers]
- **Residual risk after this phase:** [Expected risk level after mitigations complete]

## Implementation Steps
- [ ] **N.1:** [Step description — specific, actionable]
- [ ] **N.2:** [Step description]
- [ ] **N.3:** [Step description]
...

## Key Decisions (from research)
- [Decision extracted from tech research, e.g., "Use Moyasar Collect + Payout API over Stripe"]
- [Tradeoff noted in business research, e.g., "Commission on new clients only, not all bookings"]
- [Architecture choice, e.g., "Custom build over SaaS due to Saudi-specific requirements"]

## Acceptance Criteria
- [Derived from BRD/PRD requirements for these features]
- [Measurable where possible]

## Competitive Context
[1-2 sentences from business research: what competitors do/don't have, why this matters]

## Research Gaps
[Only if Tier B/C — list what research was missing and how it affects this phase]
[e.g., "No pricing research available — tier assignment based on BRD priority, not WTP data"]

## Unvalidated Assumptions
[Only if CUSTOMER_VALIDATION/ exists and this phase's features have high-risk unvalidated assumptions]
- **High-risk assumptions for this phase:** [Assumption text + risk-if-wrong rating]
- **Validation status:** [Whether primary research was conducted or only desk research]
- **Confidence note:** [Impact on implementation — e.g., "If assumption X is wrong, pivot to Y"]
```

#### Tier-Specific Adjustments

**Tier A (Full Research):** Generate all sections. Implementation steps should be detailed (5-15 steps per phase) using tech research recommendations.

**Tier B (Partial Research):** Generate all sections but mark gaps. Missing research → "Research Gaps" section explains impact. Implementation steps are less detailed for areas without tech research.

**Tier C (Minimal — BRD/PRD only):** Generate simplified plans:
- No "Estimated Cost" section
- No "Recommended Tech Stack" section (note: "Tech research needed")
- No "Competitive Context" section
- Implementation steps are high-level (3-5 per phase), more like epics than tasks
- Each plan includes a prominent note: "This phase needs technical research before implementation. Consider running /tech-research in idea-forge."

---

### Plan Phase 5: Generate Roadmap, Config & Snapshot

#### 5.1 Create Research Snapshot

Copy research files from `<idea-path>` into `PROJECT_STATUS/project_documents/`:

```
Files to copy (if they exist):
  IDEA.md → project_documents/IDEA.md
  RESEARCH.md → project_documents/RESEARCH.md
  BUDGET_CONTEXT.md → project_documents/BUDGET_CONTEXT.md
  preparation/INITIAL-BRD.md → project_documents/INITIAL-BRD.md
  BRD.md → project_documents/BRD.md
  PRD.md → project_documents/PRD.md
  CUSTOMER_VALIDATION/ → project_documents/CUSTOMER_VALIDATION/ (entire folder)
  BUSINESS_RESEARCH/ → project_documents/BUSINESS_RESEARCH/ (entire folder)
  SUPPORTING_SYSTEMS/ → project_documents/SUPPORTING_SYSTEMS/ (entire folder)
  MARKETING_STRATEGY/ → project_documents/MARKETING_STRATEGY/ (entire folder)
  TECHNICAL_OPTIONS/ → project_documents/TECHNICAL_OPTIONS/ (entire folder)
  PRICING_STRATEGY/ → project_documents/PRICING_STRATEGY/ (entire folder)
  CONSTRAINT_VALIDATION/ → project_documents/CONSTRAINT_VALIDATION/ (entire folder)
  RISK_ASSESSMENT/ → project_documents/RISK_ASSESSMENT/ (entire folder)
```

**Do NOT copy:** `preparation/` HTML files (reports, forms), `PRESENTATION-*.html` files, or any non-research files.

Create `project_documents/plan-manifest.md`:

```markdown
# Plan Manifest

**Source:** [absolute path to idea-path]
**Snapshot Date:** [date]
**Research Tier:** [A/B/C]
**Generated By:** /pipeline plan

## Files Copied
| Source | Destination | Size |
|--------|------------|------|
| [source path] | project_documents/[dest] | [lines] |

## Research Completeness
- Business Research: [complete/missing] ([N] feature analyses)
- Supporting Systems: [complete/missing] ([N] system analyses)
- Marketing Strategy: [complete/missing] ([N] phase analyses)
- Technical Options: [complete/missing] ([N] capability analyses)
- Pricing Strategy: [complete/missing] ([N] phase analyses)
- Constraint Validation: [complete/missing] — Verdict: [PASS/CONDITIONAL PASS/FAIL/N/A]
- Risk Assessment: [complete/missing] — Recommendation: [Go/Conditional-Go/No-Go/Defer/N/A]
- Customer Validation: [complete/missing] — Score: [N/40 or N/A]
- Budget Context: [complete/missing] — Tier: [Bootstrap/Growth/Scale/N/A]
- Final BRD: [yes/no]
- PRD: [yes/no]

## Notes
[Any warnings about missing files or incomplete research]
```

#### 5.2 Generate Lean Roadmap

Create `PROJECT_STATUS/roadmap.md` in the standard lean format:

```markdown
# Roadmap — [Project Name]
**Generated from:** [idea-path] | **Research Tier:** [A/B/C]
**Last Updated:** [date] | **Next:** 0.1

## Phase 0: Project Foundation 🚧
- [ ] **0.1:** [Step] → [plan](docs/planning/phase-0-foundation.md)
- [ ] **0.2:** [Step] → [plan](docs/planning/phase-0-foundation.md)
...

## Phase 1: [Name]
- [ ] **1.1:** [Step] → [plan](docs/planning/phase-1-name.md)
...

## Phase N: [Name]
- [ ] **N.1:** [Step] → [plan](docs/planning/phase-N-name.md)
...
```

**Roadmap rules:**
- Keep under 150 lines (lean format — details in planning docs)
- Each step: checkbox + ID + short name + plan link
- Phase 0 steps are generated from non-functional requirements
- All other phase steps come directly from the planning doc's "Implementation Steps"

#### 5.3 Create/Update Pipeline Config

Create `PROJECT_STATUS/pipeline-config.md` with project info extracted from the research:

- **Project name** from IDEA.md or BRD.md title
- **Tech stack** from tech research recommendations (if available)
- **Verification command** — default to "manual" (user can update later)
- **Research source** — add a new field: `Research Source: [idea-path]`
- **Extra Project Files** — list `project_documents/` as a project-specific directory

#### 5.4 Generate Index & Known Issues

- `index.md` — auto-generate from all created files
- `known-issues.md` — initialize with any research gaps found during extraction

#### 5.5 Coverage Verification

Before finishing, verify **100% requirement coverage**:

```
For every BR-ID found in BUSINESS_RESEARCH/:
  - Must appear in at least one phase's planning doc
  - If not → add to known-issues.md as "Orphan requirement: BR-XX not assigned to any phase"

For every TC-ID found in TECHNICAL_OPTIONS/:
  - Must appear in at least one phase's planning doc
  - If not → add to known-issues.md as "Orphan capability: TC-XX not assigned to any phase"
```

Report coverage: "15/15 business requirements covered, 12/12 technical capabilities covered"
Or: "14/15 covered — BR-14 (A/B Testing) not assigned, added to known-issues.md"

---

### Plan Phase 6: Report & Confirm

Display a summary to the user:

```
Pipeline Plan Generated — [Project Name]
=========================================
Source: [idea-path]
Research Tier: [A/B/C]

Phases: [N] phases, [M] total steps
Coverage: [X/Y] business requirements, [X/Y] technical capabilities

Phase Overview:
  Phase 0: Project Foundation (N steps)
  Phase 1: [Name] — BR-1,BR-4 + TC-2 — Est. $X (N steps)
  Phase 2: [Name] — BR-2,BR-5 + TC-1,TC-3 — Est. $X (N steps)
  ...

Project documents: PROJECT_STATUS/project_documents/ ([N] files)
Planning docs: PROJECT_STATUS/docs/planning/ ([N] files)
Roadmap: PROJECT_STATUS/roadmap.md ([M] steps)

Total estimated Year 1 cost: $[sum from tech research]

Feasibility: [PASS / CONDITIONAL PASS (N conditions) / FAIL (N blockers) / Not validated]
Risk Level: [Go / Conditional-Go (N conditions) / No-Go / Not assessed]
Budget Tier: [Bootstrap / Growth / Scale / Unknown] — Total cost vs. envelope: [X% of tier budget]

Next: Run `/pipeline` to start implementing Phase 0.
```

After plan generation, run First-Time Setup for any remaining CORE files not yet created (phases/, fixed-issues/, docs/technical/). Do NOT re-create files that Plan Mode already created.

---

### Re-Running Plan Mode

When `/pipeline plan <path>` is run on a project that already has a plan:

1. **Archive** existing roadmap and planning docs to `PROJECT_STATUS/archived/[date]/`
2. **Archive** existing project documents snapshot to `PROJECT_STATUS/project_documents/archived/[date]/`
3. **Preserve** completed phases — read the old roadmap's `[x]` steps and carry them forward as already-complete in the new roadmap
4. **Regenerate** from the new research
5. **Diff report** — show what changed: new phases added, phases removed, steps reordered

This supports the workflow where the user goes back to idea-forge, re-researches a feature, then re-generates the plan.

---

## Extend Mode — Add Features to Existing Pipeline

Invoked by `/pipeline extend <description>`. Adds new features, supporting systems, or changes to an existing pipeline **with full project context**.

**The core problem this solves:** When you open a new session and ask Claude Code to plan a new feature, it doesn't understand the project — the tech stack, existing architecture, what's already built, what's planned. Extend Mode loads all of that context first, so the plan is informed and consistent.

**Input:** `<description>` — a natural language description of what to add. Examples:
- `/pipeline extend add admin dashboard with user management`
- `/pipeline extend enterprise multi-tenancy with org-level admins`
- `/pipeline extend bug reporting system for end users`
- `/pipeline extend add Arabic RTL support to all existing pages`

---

### Extend Phase 1: Load Project Context

**1.1 Read existing pipeline state** (required — Extend Mode only works on existing pipelines):

```
Read in this order:
1. PROJECT_STATUS/pipeline-config.md     — tech stack, conventions, paths
2. PROJECT_STATUS/roadmap.md             — what's done vs planned
3. PROJECT_STATUS/known-issues.md        — active issues
4. PROJECT_STATUS/project_documents/     — if exists, scan for BRD.md, PRD.md, IDEA.md
5. CLAUDE.md or claude-instructions.md   — project conventions
```

If no pipeline exists → **STOP.** Tell user: "No pipeline found. Run `/pipeline setup` or `/pipeline plan` first."

**1.2 Build project context summary** (this is what makes Extend Mode better than a cold-start):

```
Project Context:
  - Name: [from pipeline-config]
  - Stack: [language, framework, DB, etc.]
  - Current progress: [X/Y steps complete, current phase]
  - Existing features: [list completed phases/features]
  - Planned features: [list remaining unchecked steps]
  - Existing user types/roles: [from codebase or research]
  - Existing UI patterns: [admin pages? dashboard? settings?]
  - Known issues: [relevant to the extension]
```

**1.3 Analyze the request against existing context:**

- Does this overlap with an existing planned phase? → Warn and ask if they want to merge or add separately
- Does this depend on something not yet built? → Note prerequisite
- Does this conflict with existing architecture decisions? → Flag

---

### Extend Phase 2: Research & Plan (context-aware)

**2.1 Determine if research is needed:**

| Request Type | Research Needed? | Example |
|-------------|-----------------|---------|
| **Common supporting system** (admin dashboard, RBAC, feedback) | No — use established patterns adapted to project stack | "add admin dashboard" |
| **Feature with existing research** (in project_documents/) | No — reference existing research | "add the loyalty system from the BRD" |
| **New product feature not in research** | Yes — lightweight research | "add video consultation booking" |
| **Infrastructure/DevOps** | No — use best practices for the stack | "add CI/CD pipeline" |

**2.2 If research IS needed:**

Launch a sub-agent to research the feature **with project context**. The sub-agent prompt includes:
- The project's tech stack and conventions
- What's already built (so it doesn't recommend incompatible solutions)
- The specific feature description
- Instruction: "Research implementation options for this feature in the context of this project. Return: recommended approach, key libraries/services, estimated effort, and any dependencies on existing features."

The research output is saved to `PROJECT_STATUS/docs/technical/extend-[feature-slug]-research.md` for reference.

**2.3 If research is NOT needed:**

Generate the plan directly from established patterns, adapted to the project's stack and existing architecture.

---

### Extend Phase 3: Generate Extension Plan

**3.1 Create the planning doc:**

Create `PROJECT_STATUS/docs/planning/phase-[next-N]-[name].md` using the standard plan document template, with these additions:

- **"Why This Is Needed"** section explaining the motivation
- **"Integration Points"** section listing how this connects to existing features/phases
- **"Impact on Existing Code"** section listing files that will need modification (not just new files)
- If research was done, link to the research doc in docs/technical/

**3.2 Determine phase placement in roadmap:**

- If marked **urgent/blocker** by user → insert after current phase
- If it's a **prerequisite** for an upcoming phase → insert before that phase
- If it's a **supporting system** → follow the Essential/Growth/Enterprise tier placement rules from Supporting Systems Audit
- Otherwise → append at the end of the roadmap before nice-to-have phases

**3.3 Update roadmap.md:**

Add the new phase with unchecked steps. **Do NOT disturb existing phases or checked steps.** Insert at the determined position.

**3.4 Update index.md:**

Add the new planning doc to the index.

---

### Extend Phase 4: Report

```
Pipeline Extended — [Project Name]
====================================
Added: Phase [N]: [Name]
Steps: [M] new steps
Position: After Phase [X] / Before Phase [Y]
Research: [yes/no] → [link if yes]
Planning doc: PROJECT_STATUS/docs/planning/phase-N-name.md

Integration points:
  - Depends on: [Phase X — reason]
  - Affects: [existing file/module — how]

Updated roadmap: PROJECT_STATUS/roadmap.md (now [total] steps)

Next: Run `/pipeline` to continue implementation.
```

---

## Update Mode

Sync all tracking documents to reflect reality. No code changes.

1. **Read** pipeline-config.md, roadmap.md, known-issues.md, and phase files
2. **Audit** actual codebase: `git status`, `git log`, read key files
3. **Reconcile:**
   - `roadmap.md`: Check/uncheck steps based on code reality
   - **Immutability Rule:** NEVER uncheck a `[x]` step unless you can confirm the implementing code was reverted (e.g., git log shows a revert commit, or the files no longer exist). Completed work is immutable by default. If you suspect a step was incorrectly marked complete, flag it to the user instead of unchecking it.
   - `known-issues.md`: Remove resolved issues, add newly discovered ones
   - `phases/`: Create/update phase logs for undocumented work
   - `index.md`: Update to reflect current file inventory
   - Auto-memory `MEMORY.md`: Update progress sections
4. **Report** what changed

---

## Continue Mode (Default) — Sub-Agent Loop

### Session Startup

1. Read status files:
   ```
   PROJECT_STATUS/pipeline-config.md  -- Paths and conventions
   PROJECT_STATUS/roadmap.md          -- Find next step (~100 lines)
   ```

2. Find the next unchecked (`[ ]`) step. Read ONLY its linked plan file (if any) and relevant phase log.

3. If `notes.md` exists, read and clean it per the notes.md rules.

### The Loop

#### A. Step Readiness Check (main agent — NOT a sub-agent)

Classify the step:

1. **Ready** — Clear specs in the linked plan file. → Delegate (B).
2. **Underspecified** — Vague, multiple approaches, unclear behavior. → **STOP**, present options, ask user. After clarification, update the plan file, resume.
3. **Blocked** — Handled by stop conditions.

#### A2. Parallel Opportunity Check

Before delegating, look at the next 2-3 unchecked steps. If they:
- Don't modify the same files (check their plan files for file lists)
- Don't depend on each other's output (step N+1 doesn't need step N's result)
- Are all "Ready" (not underspecified or blocked)

Then launch them all as parallel sub-agents (max 3) using multiple Agent tool calls in a single message. Use `run_in_background: true` for all but the first.

**If unsure about dependencies, run sequentially** — correctness over speed.

When parallel steps complete, run verification once for all of them, then update tracking docs for each.

#### B. Delegate to Sub-Agent

Launch a sub-agent with:
- Step number and description
- Context from the linked plan file, phase logs, and notes
- Key files and conventions from `pipeline-config.md`
- Verification command from `pipeline-config.md`

**IMPORTANT:** Only include context for the CURRENT project.

#### B2. Verify & Retry

If `pipeline-config.md` specifies a verification command (not "manual"):
1. Run the verification command after the sub-agent completes
2. **If passes** → proceed to C (update docs)
3. **If fails** → launch ONE retry sub-agent with:
   - The original step context
   - The verification error output
   - Instruction: "Fix these errors without breaking other functionality"
4. **If retry passes** → proceed to C
5. **If retry also fails** → do NOT mark step as complete. Add to `known-issues.md` with the error, proceed to E (stop)

Max 1 retry per step. Persistent failures need human review.

#### C. Update Tracking Documents

1. `roadmap.md`: Check off step (`[x]`), update `**Next:**` pointer, update date
2. `known-issues.md`: Add any issues discovered during implementation
3. `index.md`: Update if new files were created

**Phase Completion Check (mandatory when the last step of a phase is checked off):**

If the step just completed was the LAST unchecked step in its phase:
4. Create `phases/phase-X.md` completion record (summary, steps completed, key files, metrics)
5. Update `index.md`: change plan doc status → COMPLETE, add phase record link
6. Update the plan doc's `**Status:**` field from `planned` → `COMPLETE`
7. Mark the phase header in `roadmap.md` with ✅ (replace 🚧 if present)
8. Update auto-memory MEMORY.md with new progress numbers

These are NOT optional cleanup — they are required outputs of completing a phase. Skipping them causes `/pipeline update` to find stale docs every session.

#### D. Show Summary

- What step was completed
- Files created/modified
- Key details (1-3 sentences)
- What the next step is

#### E. Check Stop Conditions

**STOP if ANY true:**
1. Next step requires manual testing or running the app
2. Next step requires user action (configure keys, deploy, decide)
3. Current step failed or blocker discovered
4. All steps complete
5. User interrupts

#### F. Verify Docs & Commit on Stop

**F1. Doc Sync Verification (runs BEFORE every commit):**

Check these conditions. If ANY fail, fix them before committing:
- Every `[x]` step in `roadmap.md` that was checked off this session → was the phase completed? If yes, does `phases/phase-X.md` exist?
- Does `index.md` reflect the current state? (plan doc statuses, phase record links)
- Does `roadmap.md` `**Next:**` pointer match the actual next unchecked step?

This takes 10 seconds to verify and prevents the recurring issue of `/pipeline update` finding stale docs.

**F2. Commit:**

Stage and commit all changes made during this session:
1. `git add` the specific files modified (avoid `git add .` — be explicit)
2. Commit with a message summarizing the completed steps, e.g.: `"pipeline: complete Phase 17F-8A (quick fixes) + 17F-8B (booking status)"`
3. Do NOT push — let the user decide when to push

Skip the commit if there are no changes to commit.

Report why stopped, what user needs to do, what's next when resuming.

If NOT stopped → loop back to A.

---

## notes.md Rules (OPTIONAL file)

Only create for projects with detailed step-by-step plans where deviations from the plan matter.

### Structure: 3 sections only

1. **Active Notes** — Deviations affecting future steps
2. **Blockers / Prerequisites** — Items blocking specific steps
3. **Resolved Notes** — Archive (purge after 2 sessions)

### What belongs: ONLY items that deviate from or aren't covered by the plan AND affect future steps AND aren't captured elsewhere.

### Golden rule: If unsure, leave it out.

---

## Error Handling

1. Do NOT mark failed steps as complete
2. Add blocker to `notes.md` (if exists) or `known-issues.md` with step reference
3. Skip to next unblocked step if possible
4. Tell the user what happened and what to do

---

## Context Management

Follow the protocol at `~/.claude/skills/context-management/SKILL.md`. Save continuation prompts to `PROJECT_STATUS/CONTINUE-PROMPT.md` when context runs low.
