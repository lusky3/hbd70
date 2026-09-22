# Project Current State (vNext)

> This is the **Single Source of Truth (SSoT)** — global project state that auto-updates
> via `/ship`. You don't edit this manually; placeholders fill in as you complete work.

- **Project Intent**: Web browser-based game primarily run on smartphones
- **Project Name**: hbd70
- **Core Guardrails**:
  - Correctness first: No claim of completion without evidence.
  - Small & reversible: Prioritize small, reversible changes; avoid unauthorized refactoring.
  - Document-first: Core logic or structural changes require a Spec/ADR first.
  - Handoff gate: Non-`tiny-fix` tasks must produce a traceable handoff summary.
- **System Map**:
  - Global SSoT: `.agentcortex/context/current_state.md`
  - Task Isolation: `.agentcortex/context/work/<worklog-key>.md`
  - Active Work Log Path: derive <worklog-key> from the raw branch name using filesystem-safe normalization before any gate checks.
  - Workflows & Policies: `.agent/workflows/*.md`, `.agent/rules/*.md`
- **Last Updated**: 2026-09-22
- **Last Verified**: 2026-09-22
- **Update Sequence**: 6
- **ADR Index**:
  - docs/adr/ADR-001-project-architecture.md: Project Architecture · applies_to: **
- **Active Backlog**: (none yet)
- **Spec Index** (project specs at `docs/specs/`):
  - docs/specs/birthday-tanks-core.md: Birthday Tanks! — Allan Lusk's 70th Birthday Edition [status: shipped] [Updated: 2026-09-19]
  - docs/specs/decade-bosses-and-control-tuning.md: Decade Bosses & Control Usability Tuning [status: shipped] [Updated: 2026-09-19]
  - docs/specs/level-select-persistence-credits.md: Level Select, Game Progress Persistence & Allan Lusk Star Wars Credits [status: shipped] [Updated: 2026-09-19]
  - docs/specs/cheats-difficulty-and-selection.md: Secret Cheats, Level Select Discovery, Spawn Invincibility & CPU Speed Control [status: shipped] [Updated: 2026-09-19]
  - docs/specs/birthday-arcade-multigame.md: Allan's 70th Birthday Arcade: Multi-Game Collection & Touch Usability [status: shipped] [Updated: 2026-09-22]
  - docs/specs/arcade-controls-and-credits-polish.md: Allan's 70th Birthday Arcade: Controls, Strings & Visual Polish [status: shipped] [Updated: 2026-09-22]
- **Canonical Commands**:
  - `/spec-intake`: Import external specs (from other LLMs, documents, or natural language). Handles large product specs via decomposition. Runs before `/bootstrap`.
  - `/bootstrap`: Task initialization & classification freeze.
  - `/plan`: Define target files, steps, risks, and rollback.
  - `/implement`: Execute implementation only when `IMPLEMENTABLE`.
  - `/review`: Check AC alignment & scope creep.
  - `/test`: Report test coverage via Test Skeleton.
  - `/handoff`: Output resumable state summary (mandatory for non-tiny-fix).
  - `/decide`: Record key decisions with reasoning to prevent cross-session re-derivation.
  - `/test-classify`: Auto-select test depth and evidence format based on task classification.
  - `/ship`: Consolidate evidence and update/archive state.
  - `ask-openrouter`: [OPTIONAL] External model delegation. See `.agent/workflows/ask-openrouter.md`.
  - `codex-cli`: [OPTIONAL] Codex CLI delegation. See `.agent/workflows/codex-cli.md`.
  - `claude-cli`: [OPTIONAL] Claude CLI delegation. See `.agent/workflows/claude-cli.md`.
  - `ask-local`: [OPTIONAL] Local-model (OpenAI-compatible endpoint) delegation. See `.agent/workflows/ask-local.md`.
- **References**:
  - `AGENTS.md`
  - `.agent/rules/engineering_guardrails.md`
  - `.agent/rules/state_machine.md`
  - `.agentcortex/docs/CODEX_PLATFORM_GUIDE.md`
  - `.agentcortex/docs/guides/token-governance.md` *(manual-only)*
  - `.agentcortex/docs/guides/context-budget.md` *(manual-only)*

> [!NOTE]
> This file is the Single Source of Truth for global project context only.
> Do not store per-task progress here; write progress to `.agentcortex/context/work/<worklog-key>.md`.

## Project Skills
- api-design: Fastify REST API conventions
- frontend-patterns: Phaser 3 + Vite mobile browser game conventions
- database-design: SQLite + Drizzle ORM conventions
- auth-security: Session-based HTTP-only cookie conventions
- doc-lookup: official doc URLs for Phaser 3, Vite, Fastify, SQLite, Drizzle ORM, Vitest, Playwright

## Global Lessons (AI Error Pattern Registry)
>
> Structured format:
> `- [Category: <tag>][Severity: <HIGH|MEDIUM|LOW>][Trigger: <normalized-trigger>] <lesson>`
>
> `/implement` reviews active HIGH-severity lessons before code changes. `/retro` may append new structured entries via guarded write.

(none yet)

## Ship History

### Ship-main-2026-09-22-controls-credits-polish
- Feature shipped: Allan's 70th Birthday Arcade: Controls, Strings & Visual Polish — Corrected Al's birthplace to Parry Sound, ON in credits; updated splash dedication to Cody & Carrie; honored Amy, Jennifer & Kelsey in dedicated ★ [IN SPIRIT] ★ credits section; added Kelsey Lusk & Jay as QA Testers; implemented continuous playfield finger drag and tap-to-fire with 250ms cooldown meter in Space Invaders; overhauled procedural CN Railcar sprite with authentic red livery, bogie trucks, and catwalk; added Asteroids tap-to-fire heading invariance and touch steering ring; displayed version v1.1.0 in GameSelect footer, bumped package.json, and created CHANGELOG.md.
- Tests: Pass (55/55 node unit tests + Playwright headless browser E2E test suite passing with 0 console errors + ACX validator 113 PASS)

### Ship-main-2026-09-22-arcade-multigame
- Feature shipped: Allan's 70th Birthday Retro Arcade Collection — 4 playable retro games (Birthday Tanks, Birthday Pong with under-paddle touch grip handle, Space Invaders with milestone decade bunkers, Asteroids with vector Newtonian mechanics), Level 1 ControlsOverlay across all games, tap-anywhere Web Audio unlock splash screen, and AC-8 persistent high scores and stat tracking across sessions.
- Tests: Pass (48/48 node unit tests + Playwright headless browser E2E 2/2 suites passing with 0 console errors)

### Ship-main-2026-09-19-player-status
- Feature shipped: Player Progress Retention & Level Select Status Preservation — Complete backwards compatibility for stored player progress in `localStorage`, auto-repair of legacy profiles with missing `beatenLevels`, in-place title discovery persistence via `revealedLevels`, fixed `LevelSelectScene` to correctly treat all unlocked levels as playable with milestone titles and `PLAY ▶` tag, and preserved difficulty/cheat settings across game over retries.
- Tests: Pass (34/34 node unit tests + headless browser module validation + ACX validator 113 PASS)

### Ship-main-2026-09-19-cheats
- Feature shipped: Secret Cheats, Level Select Discovery, Spawn Invincibility & CPU Speed Control — Triple-tap level select milestone discovery in-place, secret 3-tap godmode invincibility cheat in top-right corner with golden aura and toast, secret downward swipe auto rapid-fire cheat (80ms cooldown, 12 bullet cap), 3000ms spawn/respawn invulnerability with flashing indicator, and interactive CPU speed slider (0.25x - 2.0x) scaling enemy speed and firing rates.
- Tests: Pass (31/31 node unit tests + headless browser HTTP 200 canvas validation + ACX validator 113 PASS)

### Ship-main-2026-09-19-progression
- Feature shipped: Level Select, Game Progress Persistence & Allan Lusk Star Wars Credits — Home screen LEVELS (X/70) counter, interactive 70-level selection screen across 7 worlds with milestone titles and ???? uncompleted masking, localStorage session persistence (`hbd70_progress`) with fallback, and Star Wars 3D angled auto-scrolling credits crawl with touch/mouse drag scrubbing dedicated to Allan Lusk.
- Tests: Pass (24/24 node unit tests + Playwright headless browser E2E 11/11 checkpoints + ACX validator 113 PASS)

### Ship-main-2026-09-19-bosses
- Feature shipped: Decade Bosses & Control Usability Tuning — 7 unique decade climax bosses (Levels 10, 20, 30, 40, 50, 60, 70), forward-locked motorcycle firing with tap-to-aim arena targeting, 3.8s LevelCard pacing with tap-to-skip prompt, untruncated 2-row top HUD header, and player turret anchor fix upon level completion.
- Tests: Pass (19/19 node tests + Playwright headless browser E2E 10/10 assertions + ACX validator 113 PASS)

### Ship-main-2026-09-19
- Feature shipped: Birthday Tanks! — 70-level retro arcade mobile browser tribute for Allan Lusk's 70th Birthday. Procedural Canvas vector sprites, Web Audio synthesizer with continuous 32-step chiptune BGM and HUD mute toggle, 7 decade worlds (1956-2026), 7 enemy archetypes, dual touch and desktop controls, GitHub Pages live deployment.
- Tests: Pass (16/16 node tests + Playwright headless browser E2E)
