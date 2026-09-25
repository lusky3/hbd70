# Ship History Archive: 2026

Archived ship history entries from `.agentcortex/context/current_state.md`.

### Ship-main-2026-09-22-arcade-multigame
- Feature shipped: Allan's 70th Birthday Retro Arcade Collection — 4 playable retro games (Birthday Tanks, Birthday Pong with under-paddle touch grip handle, Space Invaders with milestone decade bunkers, Asteroids with vector Newtonian mechanics), Level 1 ControlsOverlay across all games, tap-anywhere Web Audio unlock splash screen, and AC-8 persistent high scores and stat tracking across sessions.
- Tests: Pass (48/48 node unit tests + Playwright headless browser E2E 2/2 suites passing with 0 console errors)

### Ship-main-2026-09-19-player-status
- Feature shipped: Player Progress Retention & Level Select Status Preservation — Complete backwards compatibility for stored player progress in `localStorage`, auto-repair of legacy profiles with missing `beatenLevels`, in-place title discovery persistence via `revealedLevels`, fixed `LevelSelectScene` to correctly treat all unlocked levels as playable with milestone titles and `PLAY ▶` tag, and preserved difficulty/cheat settings across game over retries.
- Tests: Pass (34/34 node unit tests + headless browser module validation + ACX validator 113 PASS)

### Ship-main-2026-09-19-bosses
- Feature shipped: Decade Bosses & Control Usability Tuning — 7 unique decade climax bosses (Levels 10, 20, 30, 40, 50, 60, 70), forward-locked motorcycle firing with tap-to-aim arena targeting, 3.8s LevelCard pacing with tap-to-skip prompt, untruncated 2-row top HUD header, and player turret anchor fix upon level completion.
- Tests: Pass (19/19 node tests + Playwright headless browser E2E 10/10 assertions + ACX validator 113 PASS)

### Ship-main-2026-09-19-progression
- Feature shipped: Level Select, Game Progress Persistence & Allan Lusk Star Wars Credits — Home screen LEVELS (X/70) counter, interactive 70-level selection screen across 7 worlds with milestone titles and ???? uncompleted masking, localStorage session persistence (`hbd70_progress`) with fallback, and Star Wars 3D angled auto-scrolling credits crawl with touch/mouse drag scrubbing dedicated to Allan Lusk.
- Tests: Pass (24/24 node unit tests + Playwright headless browser E2E 11/11 checkpoints + ACX validator 113 PASS)

### Ship-main-2026-09-19-cheats
- Feature shipped: Secret Cheats, Level Select Discovery, Spawn Invincibility & CPU Speed Control — Triple-tap level select milestone discovery in-place, secret 3-tap godmode invincibility cheat in top-right corner with golden aura and toast, secret downward swipe auto rapid-fire cheat (80ms cooldown, 12 bullet cap), 3000ms spawn/respawn invulnerability with flashing indicator, and interactive CPU speed slider (0.25x - 2.0x) scaling enemy speed and firing rates.
- Tests: Pass (31/31 node unit tests + headless browser HTTP 200 canvas validation + ACX validator 113 PASS)
