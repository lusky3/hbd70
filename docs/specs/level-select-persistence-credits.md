---
status: shipped
title: Level Select, Game Progress Persistence & Allan Lusk Star Wars Credits
source: internal
source_doc: user_request
created: 2026-09-19
updated: 2026-09-19
primary_domain: ui
secondary_domains: [gameplay]
---

# Level Select, Game Progress Persistence & Allan Lusk Star Wars Credits

## Overview
Introduce session progression, level selection, and an interactive celebration credit roll to Birthday Tanks:
1. **Level Select Screen**: Track completed levels on the title screen. Beaten levels show full biographical event names; uncompleted levels show `????`. Players can tap any beaten/unlocked level to resume directly from that milestone.
2. **Session Persistence**: Save progress to browser `localStorage` (`hbd70_progress`) so players can return at any time across sessions without losing unlocked levels.
3. **Star Wars Style Credits Crawl**: A dedicated interactive credits screen launched from the bottom-right of the title screen. Features an angled, auto-scrolling Star Wars style marquee crawl that can be dragged up/down and resumes auto-scrolling on release. Humorous AAA-style game credits attributing roles to Cody, open source projects, and dedicated with love to Allan Lusk on his 70th birthday.

---

## 1. Acceptance Criteria

### AC-1: Level Select Screen & Milestone Status
- On `SplashScene`, a "LEVELS" button shows current completion status (e.g. `LEVELS (X/70)` or `LEVELS`).
- Tapping "LEVELS" opens `LevelSelectScene` displaying all 70 levels across the 7 decade worlds.
- Each level cell displays:
  - Level number (1 to 70) and year (1956 to 2026).
  - For beaten levels: the full milestone title.
  - For uncompleted levels: `????` with a locked visual state.
- Players can click/tap any beaten level (or the highest unlocked level) to launch directly into that level via `LevelCard`.
- Screen includes smooth vertical scrolling/paging and a prominent "BACK" button to return to `SplashScene`.

### AC-2: LocalStorage Progress Persistence
- Store player progress in `localStorage` under `hbd70_progress` as JSON: `{ highestLevelBeaten: number, unlockedLevel: number }`.
- When a player clears a level in `Game.js`, update `highestLevelBeaten = Math.max(highestLevelBeaten, currentLevel)` and `unlockedLevel = Math.max(unlockedLevel, currentLevel + 1)`.
- When the game boots, read `localStorage`. If absent or corrupted, safely initialize with `highestLevelBeaten = 0`, `unlockedLevel = 1`.
- Title screen "PLAY" button resumes from `unlockedLevel` (or Level 1 for new games).

### AC-3: Star Wars Style Credits Crawl
- On `SplashScene`, render a "Credits" link in the bottom-right corner.
- Tapping opens `CreditsScene` featuring an angled, auto-scrolling Star Wars style marquee over a starfield.
- The marquee rolls upward continuously.
- Interactive drag: Users can drag up or down with touch or mouse to freely scrub the credits roll.
- On pointer release, the crawl resumes upward auto-scrolling smoothly.
- Content includes humorous AAA credits:
  - Dedicated to Allan Lusk on his 70th Birthday!
  - Executive Producer, Lead Developer, Story, Physics, Audio & QA: Cody
  - Special Thanks & Inspiration: Allan Lusk, Carrie Orr, Jennifer, Amy, Cody, Kelsey, and the Lusk Family
  - Open Source & Tech: Phaser 3, Vite, Web Audio API
- Contains a prominent "BACK" button in the upper corner to return to the home screen.

---

## 2. Constraints & Non-Goals
- Zero external image or font assets: 100% Canvas, Phaser vector/graphics, and system fonts.
- Resilient storage: `localStorage` exceptions (e.g. private browsing quota errors) must fail gracefully without crashing the game.
- Mobile touch responsiveness: Level selection grid and credits drag must support single-touch mobile gestures.

---

## Domain Decisions
- [DECISION] Store level progress in browser `localStorage` under `hbd70_progress` with schema `{ highestLevelBeaten: number, unlockedLevel: number }`.
- [DECISION] Hide uncompleted level titles behind `????` to preserve milestone curiosity while allowing instant jumping to any beaten level.
- [DECISION] Render the Star Wars credits crawl using Phaser camera/container vertical scroll with interactive pointer drag-and-resume dynamics.
