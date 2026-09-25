---
title: "Allan's 70th Birthday Arcade: Tanks Multiplayer PvP/PvE Modes, Endless Waves & Leaderboard Badges"
status: living
created: 2026-09-25
updated: 2026-09-25
primary_domain: multiplayer
---

# Feature Spec: Tanks Multiplayer PvP vs PvE, Decades/Endless Modes & Leaderboard Integration

## 1. Problem Statement
The current Multiplayer Tanks Arena in Classic Arcade is strictly a PvP deathmatch ("First to 5 Frags"). Players cannot team up cooperatively against the AI enemies, nor can they experience the 70 classic story levels or endless survival together. Furthermore, winning a PvP match currently only shows a local modal without recording the victory to the global Cloudflare D1 leaderboards, nor distinguishing between single-player and multiplayer achievements.

---

## 2. Acceptance Criteria

### AC-1: Multiplayer Lobby Game Mode Controls (PvP vs PvE)
- In `MultiplayerLobbyScene` when Tanks is selected by the host:
  - Add a sub-mode toggle between **⚔️ PvP (Deathmatch)** and **🛡️ PvE (Co-op Squad)**.
  - In **PvE Mode**, add a secondary setting toggle:
    - **📜 Decades Mode**: Cooperative progression through the classic 70 campaign levels.
    - **♾️ Endless Mode**: Procedurally generated arenas with progressively harder waves.
  - Broadcast selected sub-mode and PvE type to all connected clients via `network.setGameOptions()` and `GAME_START`.
  - When in PvE mode, lobby roster headers display "COOPERATIVE SQUAD" rather than "COMBATANTS".

### AC-2: Multiplayer Tanks PvE Co-op Mechanics
- When `tanksSubMode === 'pve'`:
  - All connected players (1-4) are allies on the same team.
  - Friendly fire is disabled: bullets from teammate tanks do not damage fellow players.
  - Players retain their lobby colors (Host Cyan, P2 Emerald, P3 Red, P4 Gold).
  - Shared squad life pool or individual respawns with invulnerability shields.

### AC-3: Decades Co-op Mode Progression
- Loads level terrain and enemy compositions from `src/data/levels.js`.
- The Host acts as the authoritative simulation authority for enemy tanks:
  - Updates `EnemyAI` movement and firing.
  - Broadcasts enemy positions, orientations, health, and enemy bullets in state snapshots.
- When an ally tank destroys an enemy:
  - Confetti/explosion effects trigger.
  - Squad score increases.
- When all enemies in a level are defeated:
  - Level Clear banner and fanfare play.
  - Advances squad together to the next level (`levelNum + 1`) up to Level 70.

### AC-4: Endless Waves Procedural Co-op Mode
- Starts at Wave 1 with procedural terrain generation:
  - Indestructible perimeter walls.
  - Symmetrical/procedural interior clusters of destructible gift blocks and water hazard tiles.
- Enemy wave difficulty scaling:
  - Enemy count scales with wave number (`Math.min(8, 2 + wave)`).
  - Enemy unit types scale (Patrol -> Chaser -> Amphibious -> Decade Boss on every 5th wave).
  - Enemy projectile velocity and move speed slightly scale with wave depth.
- Clearing a wave rewards bonus score (`wave * 1000`) and spawns the next wave.

### AC-5: PvP Leaderboard Submission with Multiplayer Indicator
- When a PvP Tanks match finishes:
  - The winner is provided with a direct score submission option (`🏆 SUBMIT HIGH SCORE`) connecting to `LeaderboardService`.
  - Score is calculated from frags earned and victory bonus.
  - The score detail string includes the verified multiplayer indicator: `⚔️ MP PvP (${frags} Frags)`.
  - On the in-game Leaderboard Modal (`LeaderboardModal.js`):
    - Rows with multiplayer PvP entries prominently display a `⚔️` icon next to the tag/name or in the detail column.

### AC-6: Automated Testing & Verification
- Unit test suite in `tests/multiplayer_pve.test.js`:
  - Lobby mode toggle state transitions (`pvp` <-> `pve`, `decades` <-> `endless`).
  - NetworkManager packet broadcasting of `tanksSubMode` and `tanksPveType`.
  - Friendly fire damage suppression in PvE mode.
  - Endless wave procedural difficulty generation formula.
  - PvP score detail formatting and multiplayer indicator detection.
- Headless Playwright integration test:
  - Verifying PvP vs PvE lobby controls and visual toggles.
  - Verifying leaderboard rendering with `⚔️` multiplayer badge.

---

## Domain Decisions
- [DECISION] Host serves as authoritative physics simulator for AI enemies and procedural wave generation to prevent desync between clients.
- [DECISION] In PvE co-op mode, friendly bullets pass through or bounce off allies without inflicting damage to foster casual, accessible party play on mobile.
- [DECISION] Keep multiplayer PvP scores on the primary Tanks leaderboard with a distinctive `⚔️` badge rather than fracturing the database into separate tables, encouraging healthy competitive play.
