---
status: frozen
title: "Allan's 70th Birthday Arcade: Player Full Name, Tag Setting & Profanity Filter"
source: internal
source_doc: user_request
created: 2026-09-22
updated: 2026-09-22
primary_domain: ui
secondary_domains: [api, gameplay]
---

# Allan's 70th Birthday Arcade: Player Full Name, Tag Setting & Profanity Filter

## Overview
Enhance high score entries and community personalization while keeping the arcade family-friendly:
1. **Optional Larger Name & 3-Letter Tag Association**: Support an optional full name / nickname (up to 24 characters, e.g. "Allan") associated with the retro 3-letter initials tag (e.g. "ALL").
2. **Hover / Tap Reveal on High Scores Table**: In `LeaderboardModal`, hovering (desktop) or tapping (mobile) on a player's 3-letter initials reveals their optional full name without disrupting the compact retro monospace table layout.
3. **Dedicated "Set Tag & Name" on High Score Page**: Add a button on the High Score modal allowing players to configure and save their player tag and optional name anytime, pre-filling future game over score submissions.
4. **Basic Family-Friendly Profanity Filter**: Filter vulgarities and offensive acronyms in both initials and full names, implemented on the client before submission and enforced on the Cloudflare D1 Worker backend.
5. **Worker Schema & API Extension**: Store optional `full_name` in Cloudflare D1 and return it in the leaderboard API.
6. **Version Bump to v1.3.0 & Changelog Update**: Update `package.json`, `src/version.js`, `GameSelect.js`, and `CHANGELOG.md`.

## Acceptance Criteria

- **AC-1: Optional Full Name Collection & Persistence**:
  - `Storage.js` stores default player tag (`hbd70_player_tag`, 3 chars, default `'ALL'`) and player name (`hbd70_player_name`, string up to 24 chars, default `''`).
  - `InitialsEntryOverlay.js` provides an optional full name input field below the 3-letter slot spinner.
  - `RetroactiveImportModal.js` supports optional full name input alongside the 3-letter initials.
  - Submitting saves the entered tag and name to `Storage.js` as the player's default profile.

- **AC-2: Set Tag & Name Button on High Score Screen**:
  - `LeaderboardModal.js` includes a centered interactive button (`[ 👤 SET TAG / NAME ]`) with a full-surface hit area.
  - Clicking/tapping launches an overlay allowing players to view, edit, and save their 3-letter tag and full name.
  - Saved tag and name are immediately persisted and reflected on future high score submissions.

- **AC-3: Hover & Tap Reveal for Full Name on Leaderboard**:
  - In `LeaderboardModal.js`, entries with an attached `full_name` show a visual indicator (e.g. subtle badge or underline).
  - Hovering (pointerover) over the initials displays a tooltip showing the player's full name.
  - Tapping (pointerdown) on mobile reveals the full name in an inline info banner or floating tooltip.

- **AC-4: Family-Friendly Profanity Filter**:
  - `src/utils/ProfanityFilter.js` provides `isClean(text)` and `validate(initials, fullName)`.
  - Blocks common profanities, offensive 3-letter acronyms (e.g. `ASS`, `FUK`, `SHT`, `DIC`, `KYS`, `NIG`, `COK`, `TIT`, `CNT`, `SEX`, `POO`, `WTF`, `PNS`, etc.), and lewd full names.
  - Client side: Displays a clear, friendly warning ("PLEASE CHOOSE A FAMILY-FRIENDLY NAME / TAG") and prevents submission if invalid.
  - Server side (`worker/index.js`): Rejects requests containing profanity with HTTP 400.

- **AC-5: Cloudflare D1 Leaderboard Schema & API Extension**:
  - `worker/schema.sql` defines `full_name TEXT` in `leaderboards` table.
  - `worker/index.js` `POST /api/leaderboard` validates and saves `fullName` / `full_name`.
  - `worker/index.js` `GET /api/leaderboard` returns `full_name` in entry objects.
  - Handles null/empty `full_name` cleanly for backward compatibility.

- **AC-6: Version Bump & Release Notes**:
  - `package.json` bumped to `1.3.0`.
  - `src/version.js` bumped to `1.3.0`.
  - `CHANGELOG.md` updated with `[1.3.0]` release notes.

## Domain Decisions

### [ui][2026-09-22][main]
- [DECISION] Keep the 3-letter tag as the primary high-score table identifier to preserve authentic retro arcade typography, using hover/tap tooltips to reveal the full name.
- [DECISION] Provide a dedicated "SET TAG / NAME" button on the High Score screen so players can manage their arcade identity outside of game over loops.
- [DECISION] Dual-layer profanity filtering (client immediate feedback + worker API enforcement) to ensure the public family leaderboard remains safe.
