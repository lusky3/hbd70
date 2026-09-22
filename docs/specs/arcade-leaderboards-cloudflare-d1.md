---
status: draft
title: Allan's 70th Birthday Arcade: Cloudflare D1 Leaderboards
source: internal
source_doc: user_request
created: 2026-09-22
updated: 2026-09-22
primary_domain: api
secondary_domains: [ui, gameplay]
---

# Allan's 70th Birthday Arcade: Cloudflare D1 Leaderboards

## Overview
Implement a global and family leaderboard backend and in-game UI using Cloudflare Workers and Cloudflare D1 (serverless SQLite):
1. **Serverless Edge API**: Lightweight Cloudflare Worker providing high-speed REST endpoints (`/api/v1/leaderboard/:gameId`) backed by Cloudflare D1 serverless SQLite.
2. **Four Arcade Games Supported**: Dedicated leaderboards for `tanks`, `pong`, `invaders`, and `asteroids`.
3. **Arcade Initials Spinner**: Retro 3-character initials entry (`[ A ] [ L ] [ ★ ]`) displayed upon Game Over when a player earns points.
4. **Interactive Leaderboard Modal**: Monospace retro neon leaderboard viewer accessible from the main arcade hub (`GameSelectScene`) and game over screens.
5. **Zero Client Bloat & Resilient Fallback**: Zero external client SDKs (vanilla `fetch()`). If the player is offline or the worker is unreachable, seamlessly fall back to local high scores in `localStorage`.

---

## 1. Acceptance Criteria

### AC-1: Cloudflare D1 Database Schema & Worker Configuration
- Directory `/worker` containing:
  - `wrangler.toml`: Worker configuration with D1 database binding `DB`.
  - `schema.sql`: Table definition:
    ```sql
    CREATE TABLE IF NOT EXISTS leaderboards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      initials TEXT NOT NULL,
      score INTEGER NOT NULL,
      detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_leaderboards_game_score 
      ON leaderboards (game_id, score DESC);
    ```
  - `index.js`: Worker entrypoint handling CORS, routing, input sanitization, and D1 queries.

### AC-2: RESTful Leaderboard Endpoints
- **`GET /api/v1/leaderboard/:gameId?limit=10`**:
  - Validates `gameId` in `['tanks', 'pong', 'invaders', 'asteroids']`.
  - Queries D1 for the top `limit` (default 10, max 25) scores ordered by `score DESC, created_at ASC`.
  - Returns JSON array with CORS headers:
    ```json
    [
      { "id": 1, "initials": "ALL", "score": 12450, "detail": "Wave 7", "created_at": "2026-09-22T19:00:00Z" }
    ]
    ```
- **`POST /api/v1/leaderboard/:gameId`**:
  - Validates `gameId`.
  - Sanitizes `initials`: strips whitespace, converts to uppercase, allows `[A-Z0-9 !?★]`, truncates to 3 characters max (default `"???"`).
  - Validates `score`: positive integer within plausible limits for the game.
  - Inserts row into D1 and returns `{ success: true, rank: <number> }`.

### AC-3: Client Leaderboard Service & Offline Fallback
- Create `src/systems/LeaderboardService.js`:
  - Methods: `fetchLeaderboard(gameId)`, `submitScore(gameId, initials, score, detail)`.
  - 3-second network timeout.
  - On network failure, HTTP error, or timeout, gracefully falls back to local high score records from `Storage.js` without throwing unhandled exceptions.
  - Saves last entered initials in `localStorage` (`hbd70_player_initials`) for easy reuse across games.

### AC-4: Retro 3-Letter Arcade Initials Entry Screen
- In `GameOverScene` (or dedicated overlay):
  - When the game ends with `score > 0`, present an arcade initials picker with 3 character slots.
  - Supports touch chevrons (`▲ / ▼`), swipe, direct letter tapping, or desktop keyboard typing (`A-Z`, backspace, enter).
  - Submit button records score via `LeaderboardService` and transitions to the leaderboard view.
  - Includes a "Skip" option for players who do not wish to record their initials.

### AC-5: In-Game Leaderboard Screen / Modal
- Accessible via a `🏆 HIGH SCORES` button on `GameSelectScene` header/footer and after score submission.
- Tabs along the top to switch between games:
  - 🛡️ Tanks (Level reached & score)
  - 🏓 Pong (Longest rally & wins)
  - 👾 Space Invaders (High score & wave)
  - 🚀 Asteroids (High score & wave)
- Displays Rank (1-10), Initials, Score, Detail, and Date in retro cyan/gold typography.
- Indicates connection status: `● ONLINE` when fetched from Cloudflare, or `○ LOCAL (OFFLINE)` when using local storage cache.

### AC-6: Automated Testing & Verification
- Unit test suite (`tests/leaderboard.test.js`) testing:
  - Cloudflare Worker request routing, CORS preflight, parameter validation, and sanitization.
  - D1 SQL query generation and index optimization.
  - `LeaderboardService` fetch, timeout, and offline fallback behavior.
  - Initials formatting constraints and character boundaries.
- Headless Playwright integration test:
  - Verifying `🏆 HIGH SCORES` button on `GameSelectScene`.
  - Verifying modal tab switching and score rendering.
  - Verifying initials picker in `GameOverScene`.

---

## Domain Decisions
- [DECISION] Adopt Cloudflare Workers + D1 for serverless edge execution with 0 client bundle bloat and zero risk of inactivity sleeping.
- [DECISION] Format player initials strictly as classic 3-character arcade format (`[A-Z0-9 !?★]`) with local persistence of last used initials.
- [DECISION] Design client LeaderboardService with strict fail-soft fallback to localStorage to guarantee uninterrupted offline gameplay.
