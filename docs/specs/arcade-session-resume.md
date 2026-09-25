---
title: "Allan's 70th Birthday Arcade: Per-Game Session Resume & Mid-Game Recovery"
status: shipped
created: 2026-09-25
updated: 2026-09-25
primary_domain: arcade
---

# Feature Spec: Per-Game Session Resume & Mid-Game Recovery

## 1. Problem Statement
In Allan's 70th Birthday Retro Arcade Collection, players can engage in 5 single-player retro games: Birthday Tanks (70 levels), Birthday Pong, Space Invaders, Birthday Asteroids, and Birthday Pool. If a player accidentally closes the browser tab, locks their phone, navigates away, or exits mid-game, their current game progress (level, wave, score, lives, match state) is lost, forcing them to start over from scratch. Players need an autonomous per-game session persistence and resume system that saves mid-game state and prompts them to resume from where they left off upon relaunching each game.

---

## 2. Acceptance Criteria

### AC-1: Storage Manager Session Persistence Engine
- `src/systems/Storage.js` provides dedicated session persistence methods:
  - `saveGameSession(gameId, state)`
  - `getGameSession(gameId)`
  - `clearGameSession(gameId)`
  - `hasGameSession(gameId)`
- Keys are isolated per-game in `localStorage` under `hbd70_session_<gameId>` (`tanks`, `pong`, `invaders`, `asteroids`, `pool`).
- Stored session objects include:
  - `gameId`: String identifier (`'tanks'`, `'pong'`, `'invaders'`, `'asteroids'`, `'pool'`)
  - `timestamp`: Date.now() integer of when the session was saved
  - `summary`: Human-readable summary string for modal display
  - `state`: Game-specific state payload
- Fail-soft validation guards against corrupted JSON or malformed payloads, returning `null`.

### AC-2: Lifecycle Auto-Save & Checkpoint Triggers
- Automatic state capture triggers on:
  - Window `beforeunload`, `pagehide`, and document `visibilitychange` (when `document.visibilityState === 'hidden'`).
  - Active game checkpoint events (level start/completion, wave advance, points scored, life loss, shot settlement, or clicking `< MENU` / `< BACK`).
- Saved sessions are automatically cleared (`clearGameSession(gameId)`) upon:
  - Game Over (player defeated)
  - Victory (all levels/waves completed or target score reached)
  - User selecting "NEW GAME" in the resume prompt modal

### AC-3: Unified Resume Session Prompt Modal
- When launching any of the 5 games that has an active saved session:
  - A modal overlay (`ResumeSessionModal`) is presented before starting a new session.
  - Displays:
    - Game icon and title (e.g. `🏍️ RESUME BIRTHDAY TANKS?`, `🏓 RESUME BIRTHDAY PONG?`)
    - Saved time / relative timestamp (e.g. "Saved 2 minutes ago")
    - Human-readable session summary:
      - Tanks: `Level 14 • 2 Lives • 4,500 Pts • 28 Defeated`
      - Pong: `Player 6 - 4 CPU • Best Rally: 8`
      - Invaders: `Wave 4 • 2 Lives • 8,400 Pts`
      - Asteroids: `Wave 3 • 3 Lives • 12,300 Pts`
      - Pool: `8-Ball (Regular CPU) • Score: 2,100 • 8 Balls Left`
  - Two high-contrast interactive buttons with 100% zone hitboxes:
    - `[ ▶ RESUME GAME ]`: Restores the saved session state and enters the game.
    - `[ 🔄 NEW GAME ]`: Discards the saved session and launches a fresh game.

### AC-4: Per-Game State Restoration
- **Birthday Tanks** (`GameScene` / `LevelCardScene`):
  - Restores `levelNum`, `lives`, `tanksDefeated`, `isInvincibleCheat`, `rapidFireCheat`, and `cpuSpeedMultiplier`.
- **Birthday Pong** (`PongScene`):
  - Restores `playerScore`, `aiScore`, `maxRally`, and restarts serve cleanly.
- **Space Invaders** (`SpaceInvadersScene`):
  - Restores `wave`, `score`, `lives`, and initial wave difficulty.
- **Birthday Asteroids** (`AsteroidsScene`):
  - Restores `wave`, `score`, `lives`, and extra life thresholds.
- **Birthday Pool** (`PoolScene`):
  - Restores `subtype`, `difficulty`, `score`, ball positions from physics snapshot (`physicsEngine.loadSnapshot()`), and rules state (`activePlayer`, `groups`, `ballInHand`, `speedTimer`, `streak`).

### AC-5: Arcade Hub Visual Indicators
- In `GameSelectScene`, each game card displays an active session resume badge or modified status line (e.g. `[⏸️ RESUME AVAILABLE]`) if a saved session exists for that game.

### AC-6: Automated Testing & Verification
- Unit test suite (`tests/session_resume.test.js`):
  - Validates storage saving, retrieval, corruption resilience, and clear operations for all 5 games.
  - Validates session state structures and schema checks.
- E2E Playwright test suite (`tests/e2e_session_resume.py`):
  - Simulates active gameplay in each game, triggers session save, simulates page close/re-entry, verifies the resume modal appearance, tests both `RESUME` and `NEW GAME` flows, and asserts 0 console errors.

---

## Domain Decisions
- [DECISION] Isolated per-game storage keys (`hbd70_session_<gameId>`) ensure playing or resetting one game never modifies or corrupts the saved progress of another game.
- [DECISION] Dual-layer auto-save strategy: combine event-driven checkpoint saves (level advance, life loss, score changes) with browser lifecycle hooks (`pagehide`, `visibilitychange`) to guarantee zero progress loss even on aggressive mobile browser process termination.
- [DECISION] Present resume prompt upon launching the specific game rather than interrupting the main arcade select menu, keeping the hub uncluttered while providing frictionless control when entering games.
