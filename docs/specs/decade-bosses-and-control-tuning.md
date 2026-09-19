---
status: shipped
title: Decade Bosses & Control Usability Tuning
source: internal
source_doc: user_request
created: 2026-09-19
updated: 2026-09-19
primary_domain: ui
secondary_domains: [gameplay, audio]
---

# Decade Bosses & Control Usability Tuning

## Overview
Enhance the Birthday Tanks arcade tribute for Allan Lusk with:
1. **Forward-Locked Firing with Tap-to-Aim Unlock**: The right-hand FIRE button and movement controls shoot forward in the motorcycle's direction of travel by default; tapping the combat arena unlocks manual 360-degree aiming.
2. **Level Title Pacing & Untruncated HUD**: Increase `LevelCard` auto-advance duration to 3.8 seconds with tap-to-skip prompt, and redesign the top HUD header so full biographical milestone titles (up to 65 characters) display without truncation.
3. **Unique Climax Bosses Every 10th Level**: Introduce distinct themed boss vehicles, custom procedural silhouettes, attack patterns, and multi-hit health bars for levels 10, 20, 30, 40, 50, 60, and 70.

---

## 1. Acceptance Criteria

### AC-1: Forward-Locked Firing & Tap-to-Aim Unlock
- When moving via the left joystick or WASD, the player motorcycle rotates toward the movement direction.
- By default, the turret/headlight aligns directly with the front of the motorcycle.
- Pressing the right-hand FIRE button (or Spacebar) fires straight ahead in the motorcycle's forward direction.
- Tapping or dragging anywhere in the combat arena (`y <= 615`) unlocks manual aim, turning the turret toward the tap point and firing.
- When arena touch is released and movement continues, the turret smoothly re-aligns forward with the motorcycle.

### AC-2: Level Title Pacing & Untruncated Top HUD
- `LevelCardScene` displays for 3.8 seconds before auto-advancing, giving players ample time to read each milestone.
- Tapping anywhere during `LevelCardScene` instantly dismisses it and enters gameplay.
- Prominent cue text reads: `Tap anywhere to start • Get Ready!`.
- In `HUDScene`, the layout is organized into a two-row hierarchy:
  - Top row (`y: 18`): Lives counter & mute toggle on left, level & year (`L[X]/70: [Year]`) center, mines & enemy counter on right.
  - Bottom row (`y: 44`): Full milestone title (up to 65 characters) centered across the full screen width with zero string truncation (`...`).

### AC-3: Seven Unique Decade Climax Bosses
- **Level 10 (1965)**: **Mega Candle** (3 HP) — Tall gold/red striped candle with flickering flame; fires 3-spark flame spread.
- **Level 20 (1975)**: **Golf Dreadnought** (4 HP) — Armored golf cart with striped canopy; circle-strafes and fires high-velocity bouncy golf balls.
- **Level 30 (1985)**: **Zamboni Juggernaut** (5 HP) — Heavy ice resurfacer with rotating brush; bulldozes forward and launches rapid bouncy pucks.
- **Level 40 (1995)**: **Iron Cruiser** (5 HP) — Twin-hull naval gunboat; amphibious (navigates water and land), fires dual heavy shells and drops water mines.
- **Level 50 (2005)**: **Blizzard Snowcat** (6 HP) — Heavy tracked snowcat with front plow; evasive drifting, shoots high-velocity ice missiles.
- **Level 60 (2015)**: **Chopper Warlord** (6 HP) — Heavy chrome touring chopper; aggressive pursuit, lays road-spike mines and fires twin exhaust blasts.
- **Level 70 (2026)**: **The 70 — Grand Champion Boss** (8 HP) — Golden fortress tank; radial fireworks barrage, escort spawns, enraged second phase.
- All bosses feature procedural Canvas sprites in `Draw.js`, distinctive hit-flash damage feedback, and visual health bars.

---

## 2. Constraints & Non-Goals
- Zero external image assets: 100% procedural Canvas drawings.
- 60 FPS performance on mobile devices.
- Backwards compatible with existing milestone data and level numbering.

---

## Domain Decisions
- [DECISION] Lock primary headlight turret aim to the front of the motorcycle during driving so right-hand FIRE button shoots in direction of travel.
- [DECISION] Unlock independent 360-degree turret aiming upon arena touch so tap-to-shoot remains fluid and responsive.
- [DECISION] Extend LevelCard interstitial delay to 3.8 seconds with tap-to-skip prompt for improved readability of Allan's life events.
- [DECISION] Redesign HUD top bar to 66px with two rows to allow full untruncated milestone titles (up to 65 chars).
- [DECISION] Create distinct procedural boss vehicles for each decade climax level (10, 20, 30, 40, 50, 60, 70) with progressive hit points and unique attack patterns.

