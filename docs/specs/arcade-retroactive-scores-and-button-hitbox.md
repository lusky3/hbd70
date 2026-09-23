---
status: shipped
title: "Allan's 70th Birthday Arcade: Retroactive Scores Import & Button Hitbox Polish"
source: internal
source_doc: user_request
created: 2026-09-22
updated: 2026-09-22
primary_domain: ui
secondary_domains: [api, gameplay]
---

# Allan's 70th Birthday Arcade: Retroactive Scores Import & Button Hitbox Polish

## Overview
Polish the arcade user experience by fixing high score button interaction hit areas and allowing existing players with local high scores to seamlessly submit them to the global Cloudflare D1 leaderboards:
1. **Full Surface Area Button Hitboxes**: Fix container hit area offset bugs by attaching centered, full-sized `Phaser.GameObjects.Zone` instances to all high score and action buttons across `GameSelect`, `GameOver`, `Pong`, `SpaceInvaders`, and `Victory`.
2. **Retroactive Local High Score Detection**: Detect existing local high scores stored in `localStorage` across Tanks, Pong, Space Invaders, and Asteroids.
3. **Retroactive Import Prompt & Initials Collection**: Present an arcade modal upon entering the arcade hub prompting players to enter their 3-letter initials and upload all eligible local scores in a single batch.
4. **Skip & Migration State Tracking**: Track whether migration has been completed or temporarily skipped so players are never spammed.
5. **Version Bump to v1.2.0 & Changelog Update**: Update `package.json`, `src/version.js`, `GameSelect.js`, and `CHANGELOG.md`.

## Acceptance Criteria

- **AC-1: High Score Button Surface Area & Centered Hit Zones**:
  - `GameSelect.js`: High Scores button hit area covers 100% of the visual bounding box (`270px x 42px`) via a centered interactive `Zone`.
  - `GameOver.js`: "RECORD HIGH SCORE" button hit area covers the full button rectangle via a centered interactive `Zone`.
  - `Pong.js`: "RECORD HIGH SCORE", "PLAY AGAIN", and "MAIN MENU" buttons use centered interactive `Zone` instances covering 100% of their respective button boundaries.
  - `SpaceInvaders.js`: "RECORD HIGH SCORE", "PLAY AGAIN", and "MAIN MENU" buttons use centered interactive `Zone` instances covering 100% of their button boundaries.
  - `Victory.js`: "RECORD HIGH SCORE" button uses a centered interactive `Zone`.

- **AC-2: Retroactive Local High Score Detection**:
  - `Storage.js` or `LeaderboardService.js` provides `getUnmigratedLocalScores()` inspecting:
    - `tanks`: `storage.getHighScore()` or `progress.highestLevelBeaten * 1000`
    - `pong`: `stats.pong.longestRally`
    - `invaders`: `stats.invaders.highScore`
    - `asteroids`: `stats.asteroids.highScore`
  - Returns a list of eligible games with score > 0 that have not yet been migrated to the leaderboard.

- **AC-3: Retroactive Import Dialog Scene**:
  - Scene `RetroactiveImportModal` (or overlay) displays detected local achievements with game icons and scores.
  - Includes a 3-character slot machine initials entry interface defaulting to saved initials or "ALL".
  - "SUBMIT ALL TO LEADERBOARD" button triggers batch/sequential upload of all eligible scores via `LeaderboardService.submitScore()`.
  - "REMIND ME LATER" button dismisses the modal without submitting.
  - Successfully submitting marks migration as completed (`hbd70_scores_migrated: true`) and transitions to `LeaderboardModal` to display new ranks.

- **AC-4: GameSelect Arcade Hub Integration**:
  - In `GameSelect.js`, if unmigrated local high scores exist, automatically launches `RetroactiveImportModal` after a brief delay (or on first arrival).

- **AC-5: Version Bump & Release Notes**:
  - `package.json` bumped to `1.2.0`.
  - `src/version.js` bumped to `1.2.0`.
  - `CHANGELOG.md` updated with `[1.2.0]` release notes detailing full button hit area fixes and retroactive local high score migration.

## Domain Decisions

### [ui][2026-09-22][main]
- [DECISION] Centered Phaser.GameObjects.Zone instances provide exact 100% button surface coverage without container quadrant origin clipping.
- [DECISION] Dedicated RetroactiveImportModal presents a clear list of local achievements and gathers player initials before one-tap batch submission.
