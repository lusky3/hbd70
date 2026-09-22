# UI Architecture Decision Log

### [ui][2026-09-19][main]
source_spec: docs/specs/decade-bosses-and-control-tuning.md
source_sha: f60f7f2078ae77cb66b105a4462b2d2ed9391b5e

- [DECISION] Lock primary headlight turret aim to the front of the motorcycle during driving so right-hand FIRE button shoots in direction of travel.
- [DECISION] Unlock independent 360-degree turret aiming upon arena touch so tap-to-shoot remains fluid and responsive.
- [DECISION] Extend LevelCard interstitial delay to 3.8 seconds with tap-to-skip prompt for improved readability of Allan's life events.
- [DECISION] Redesign HUD top bar to 66px with two rows to allow full untruncated milestone titles (up to 65 chars).
- [DECISION] Create distinct procedural boss vehicles for each decade climax level (10, 20, 30, 40, 50, 60, 70) with progressive hit points and unique attack patterns.

### [ui][2026-09-19][main]
source_spec: docs/specs/level-select-persistence-credits.md
source_sha: 0c50c9766dbedeba2cf94599a17554b331614d5d

- [DECISION] Store level progress in browser `localStorage` under `hbd70_progress` with schema `{ highestLevelBeaten: number, unlockedLevel: number }`.
- [DECISION] Hide uncompleted level titles behind `????` to preserve milestone curiosity while allowing instant jumping to any beaten level.
- [DECISION] Render the Star Wars credits crawl using Phaser camera/container vertical scroll with interactive pointer drag-and-resume dynamics.

### [ui][2026-09-19][main]
cross-ref: See [gameplay][2026-09-19][main] in docs/architecture/gameplay.log.md

### [ui][2026-09-22][main]
source_spec: docs/specs/birthday-arcade-multigame.md
source_sha: 292aea986e2fdc82b4b26b00a121a7bbcc926d16

- [DECISION] Adopt a central `GameSelectScene` hub to cleanly isolate the 4 games while sharing common audio, controls, and rendering systems.
- [DECISION] Implement an extended under-paddle touch grip handle for Pong to solve the finger-obscuring-ball mobile touch problem.
- [DECISION] Standardize an instructional How-to-Play overlay on Level 1 across all games before active gameplay starts.
- [DECISION] Store arcade mini-game stats in a dedicated 'arcadeStats' key within existing storage for clean backward compatibility.

