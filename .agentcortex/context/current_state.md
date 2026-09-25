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
- **Last Updated**: 2026-09-25
- **Last Verified**: 2026-09-25
- **Update Sequence**: 14
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
  - docs/specs/arcade-leaderboards-cloudflare-d1.md: Allan's 70th Birthday Arcade: Cloudflare D1 Leaderboards [status: shipped] [Updated: 2026-09-22]
  - docs/specs/arcade-retroactive-scores-and-button-hitbox.md: Allan's 70th Birthday Arcade: Retroactive Scores Import & Button Hitbox Polish [status: shipped] [Updated: 2026-09-22]
  - docs/specs/arcade-player-name-and-profanity-filter.md: Allan's 70th Birthday Arcade: Player Full Name, Tag Setting & Profanity Filter [status: shipped] [Updated: 2026-09-22]
  - docs/specs/multi-device-multiplayer.md: Allan's 70th Birthday Arcade: Multi-Device Real-Time Multiplayer [status: shipped] [Updated: 2026-09-22]
  - docs/specs/multiplayer-lobby-polish-and-pwa.md: Allan's 70th Birthday Arcade: Multiplayer Lobby Polish, Host Controls & PWA [status: shipped] [Updated: 2026-09-23]
  - docs/specs/tanks-multiplayer-pve-and-modes.md: Allan's 70th Birthday Arcade: Tanks Multiplayer PvP/PvE Modes, Endless Waves & Leaderboard Badges [status: shipped] [Updated: 2026-09-25]
  - docs/specs/birthday-arcade-pool.md: Allan's 70th Birthday Retro Pool Game [status: shipped] [Updated: 2026-09-25]
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

### Ship-main-2026-09-25-pool
- Feature shipped: Allan's 70th Birthday Retro Pool Game (v1.7.0) — New retro pocket billiards game featuring green felt, mahogany cushions, 6 brass drop pockets, 16 specular-highlighted balls, and realistic 4-substep 2D physics; 4 game subtypes (8-Ball with open-table rules, 9-Ball with lowest-ball rotation, Straight Pool 14.1 Continuous to 25 points with 14-ball continuous re-racks, and Speed Pool 90s countdown with +10s pot bonus); 4-tier VS CPU AI with cut angle calculations, obstruction raycasting, and victory fanfare on Allan Legend; dedicated Cloudflare D1 leaderboards for each subtype (pool_8ball, pool_9ball, pool_straight, pool_speed) with streak multipliers and trick shot bonuses; real-time 2-player host-authoritative WebRTC multiplayer pool with 25Hz snapshots and turn handoffs; touch drag aiming, fine-angle stepper buttons (◀/▶), and spring pullback power slider; version bump to v1.7.0 in package.json, version.js, and CHANGELOG.md.
- Tests: Pass (114/114 node unit tests + Playwright E2E pool test suite + dual-browser multiplayer E2E + single-player arcade regression E2E suite passing with 0 console errors + ACX validator 113 PASS)

### Ship-main-2026-09-25-tanks-multiplayer-pve-and-modes
- Feature shipped: Allan's 70th Birthday Arcade: Tanks Multiplayer PvP/PvE Modes, Endless Waves & Leaderboard Badges (v1.6.0) — Mode toggle between competitive PvP and cooperative PvE squad play; PvE sub-mode toggle between Decades Campaign (levels 1-70) and Endless Waves; procedural 12x16 arena generation with destructible blocks and water hazard barriers; host-authoritative enemy AI simulation with live snapshot streaming at 25 Hz; friendly fire immunity in PvE squad mode; wave depth move and projectile velocity scaling; real-time client boss health bars; PvP high score submission to Cloudflare D1 with verified ⚔️ MP PvP detail string and leaderboard badge formatting; version bump to v1.6.0 in package.json, version.js, and CHANGELOG.md.
- Tests: Pass (102/102 node unit tests + dual-browser WebRTC E2E suite + single-player arcade E2E regression suite + 9-gap verification suite + headless PvE browser test suite passing with 0 console errors)

### Ship-main-2026-09-23-multiplayer-polish-pwa
- Feature shipped: Allan's 70th Birthday Arcade: Multiplayer Lobby Polish, Host Controls & PWA (v1.5.0) — Alphanumeric keyboard input and mouse wheel slot scrolling for 4-character join code; local vendored QRCode library (vendor/qrcode.min.js) with Canvas rendering and URL query auto-join; title unified to "Classic Arcade"; mobile PWA web app manifest with standalone display, service worker caching (sw.js), and beforeinstallprompt install button in SplashScene; fixed Create Room vs Join Room mode switch loopback; decoupled Start Match interactive zone in MultiplayerLobbyScene; derived host profile from High Score storage (tag + name); live lobby chat box with timestamps, quick-chat chips, and profanity filtering; host kick controls with non-occluded hitbox, right-click, and long-press; version bump to v1.5.0 in package.json, version.js, and CHANGELOG.md.
- Tests: Pass (96/96 node unit tests + Playwright dual-browser multiplayer E2E + Playwright 9-gap verification suite + single-player arcade E2E regression suite passing with 0 errors + ACX validator 113 PASS)

### Ship-main-2026-09-22-back-button-hotspot
- Feature shipped: Allan's 70th Birthday Arcade: Back Button & UI Control Hotspot Geometry Polish — Replaced container setSize/setInteractive with centered Phaser.GameObjects.Zone instances across GameSelect, Credits, LevelSelect, Pong, SpaceInvaders, Asteroids, LeaderboardModal, and Splash scenes, eliminating coordinate clipping and restoring 100% surface area clickability across all Back, Menu, Mute, and navigation controls; bumped version to v1.4.2 in package.json, version.js, and CHANGELOG.md.
- Tests: Pass (91/91 node unit tests + Playwright dual-browser multiplayer E2E + single-player arcade E2E regression passing with 0 console errors + ACX validator 113 PASS)

### Ship-main-2026-09-22-ui-fixes
- Feature shipped: Allan's 70th Birthday Arcade: Set Tag/Name Modal Layering & Multiplayer Lobby Tab Toggle — Resolved Phaser scene layering issue where opening InitialsEntryOverlayScene from LeaderboardModal rendered behind the modal backdrop by adding explicit bringToTop() calls on scene open and return; resolved MultiplayerLobbyScene tab toggling bug where switching between Create Room (Host) and Join Room (Client) or between Tanks and Pong permanently broke tab buttons by eliminating destructive removeAll(true) and preserving persistent interactive hitboxes and background graphics; bumped version to v1.4.1 in package.json, version.js, and CHANGELOG.md.
- Tests: Pass (90/90 node unit tests + dual-browser WebRTC E2E suite + single-player arcade E2E suite passing with 0 errors + ACX validator 113 PASS)

### Ship-main-2026-09-22-multiplayer
- Feature shipped: Allan's 70th Birthday Arcade: Multi-Device Real-Time Multiplayer — Serverless WebRTC DataChannels P2P transport (PeerJS) using Google STUN signaling for $0 hosting cost; 4-character room codes with Canvas QR code camera scanning for frictionless mobile joining via URL query (?room=XXXX); dedicated 4-player host-authoritative tactical Birthday Tanks Arena with client prediction, remote lerp interpolation, 1.5s spawn shields, frag leaderboard, and destructible block/mine synchronization; 2-player synchronized Pong duel with ball deflection physics and client perspective inversion; disconnect resilience with 2s heartbeat ping and AC-6 compliant modal dialog returning to GameSelect; side-by-side action bar in GameSelect; version bump to v1.4.0 in package.json, version.js, and CHANGELOG.md.
- Tests: Pass (90/90 node unit tests + Playwright dual-browser multiplayer E2E suite + full arcade regression E2E suite passing with 0 console errors + ACX validator 113 PASS)

### Ship-main-2026-09-22-player-name-profanity-filter
- Feature shipped: Allan's 70th Birthday Arcade: Player Full Name, Tag Setting & Profanity Filter — Optional full name / nickname entry (up to 24 chars, e.g. "Allan") associated with 3-letter initials (e.g. "ALL"); interactive hover (desktop) and tap (mobile) reveal tooltip in LeaderboardModal; dedicated centered [ 👤 SET TAG/NAME ] button on High Score page with non-locking pause/resume lifecycle; dual-layer client and server-side profanity filtering blocking vulgarities, leetspeak tags, repeated character variants, and compound slurs; Cloudflare D1 schema and API extension with full_name column and parameterized bindings; version bump to v1.3.0 in package.json, version.js, GameSelectScene, and CHANGELOG.md.
- Tests: Pass (81/81 node unit tests + 9-phase Playwright E2E suite + Tanks E2E suite passing with 0 console errors + ACX validator passing)

### Ship-main-2026-09-22-retroactive-scores-hitbox
- Feature shipped: Allan's 70th Birthday Arcade: Retroactive Scores Import & Button Hitbox Polish — Full button hitbox surface area coverage using centered Phaser.GameObjects.Zone instances across GameSelect, GameOver, Pong, SpaceInvaders, and Victory (fixing Phaser container bottom-right quadrant offset bug); retroactive local high score detection across Tanks, Pong, Space Invaders, and Asteroids; RetroactiveImportModalScene with 3-character slot machine initials entry, batch edge worker submission, and offline fallback; version bump to v1.2.0 in package.json, version.js, GameSelectScene, and CHANGELOG.md.
- Tests: Pass (69/69 node unit tests + Playwright headless browser E2E test suites passing with 0 console errors + ACX validator 113 PASS)

### Ship-main-2026-09-22-leaderboards-cloudflare-d1
- Feature shipped: Allan's 70th Birthday Arcade: Cloudflare D1 Leaderboards — Global persistent family arcade leaderboard backend using Cloudflare Workers + Cloudflare D1 (serverless SQLite), RESTful API with parameterized bindings, rate limiting, and per-game score validation; client LeaderboardService with 3s timeout and fail-soft localStorage fallback; 3-character retro arcade slot machine initials overlay with touch chevrons, vertical swipe gestures, and keyboard typing; monospace neon LeaderboardModal with 4 arcade game tabs and date formatting; integrated RECORD HIGH SCORE button in game over and victory screens across Tanks, Pong, Space Invaders, and Asteroids.
- Tests: Pass (64/64 node unit tests + Playwright headless browser E2E test suites passing with 0 console errors + ACX validator 113 PASS)

### Ship-main-2026-09-22-controls-credits-polish
- Feature shipped: Allan's 70th Birthday Arcade: Controls, Strings & Visual Polish — Corrected Al's birthplace to Parry Sound, ON in credits; updated splash dedication to Cody & Carrie; honored Amy, Jennifer & Kelsey in dedicated ★ [IN SPIRIT] ★ credits section; added Kelsey Lusk & Jay as QA Testers; implemented continuous playfield finger drag and tap-to-fire with 250ms cooldown meter in Space Invaders; overhauled procedural CN Railcar sprite with authentic red livery, bogie trucks, and catwalk; added Asteroids tap-to-fire heading invariance and touch steering ring; displayed version v1.1.0 in GameSelect footer, bumped package.json, and created CHANGELOG.md.
- Tests: Pass (55/55 node unit tests + Playwright headless browser E2E test suite passing with 0 console errors + ACX validator 113 PASS)
