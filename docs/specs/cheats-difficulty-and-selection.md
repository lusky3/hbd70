---
status: shipped
title: Secret Cheats, Level Select Discovery, Spawn Invincibility & CPU Speed Control
source: internal
source_doc: user_request
created: 2026-09-19
updated: 2026-09-19
primary_domain: gameplay
secondary_domains: [ui]
---

# Secret Cheats, Level Select Discovery, Spawn Invincibility & CPU Speed Control

## Overview
Enhance gameplay accessibility, progression discovery, and fun with 5 key features:
1. **Level Select Triple-Tap Discovery**: Triple-tapping any entry in the level select screen reveals its milestone title, even if uncompleted/locked (`????`).
2. **Secret Invincibility Cheat**: Tapping the top-right corner 3 times in quick succession in combat toggles godmode invincibility with a visual aura and HUD toast notification.
3. **Secret Auto Rapid-Fire Cheat**: Swiping down continuously from the top third to the bottom third of the screen toggles automatic rapid-fire shooting. Doing the same swipe gesture again disables it.
4. **Spawn Invincibility**: Player receives at least 3 seconds of invulnerability upon level start and upon respawn, with flashing visual feedback.
5. **Adjustable Game Speed Bar**: An interactive UI slider bar allowing players to adjust CPU enemy speed (0.25x to 2.0x), scaling their movement speed, rotation tracking, and firing frequency to make levels easier or harder on demand.

---

## 1. Acceptance Criteria

### AC-1: Level Select Triple-Tap Discovery
- In `LevelSelectScene`, all level entries (1 to 70) accept pointer tap events.
- If an entry is tapped 3 times in quick succession (within 700ms between taps), the entry's milestone title is revealed immediately.
- The title label changes from `????` to `milestone.title` and is styled in a discovered highlight color (`#38bdf8` / cyan).
- Visual feedback (card flash / scale tween) confirms the discovery.
- Discovered titles remain visible for the active browser session.

### AC-2: Secret Invincibility Cheat
- In `GameScene` / `HUDScene`, tapping the top-right corner region (x > width - 80, y < 80) 3 times within 1200ms toggles player invincibility.
- When active:
  - Player cannot take damage from enemy bullets, enemy tank body collisions, mines, or water hazards.
  - An aura/shield glow renders around the player motorcycle.
  - A HUD toast notification displays `🛡️ CHEAT: INVINCIBLE [ON]` (or `[OFF]` when toggled off).
- Tapping 3 times in the top-right corner again disables the cheat.

### AC-3: Secret Auto Rapid-Fire Cheat Gesture
- In `GameScene` / `TouchControls`, a continuous downward vertical swipe gesture starting in the top third of the screen (`y < height / 3`) and ending in the bottom third (`y > height * 2 / 3`) with horizontal drift under 160px toggles automatic rapid fire.
- When active:
  - Player motorcycle automatically fires continuously without holding the FIRE button.
  - Firing cooldown is reduced to rapid-fire rate (80ms).
  - Max active player bullet limit is expanded to 12.
  - A HUD toast notification displays `⚡ CHEAT: RAPID FIRE [ON]`.
- Repeating the exact same swipe gesture disables the cheat and returns firing mechanics to standard behavior (`⚡ CHEAT: RAPID FIRE [OFF]`).

### AC-4: 3-Second Spawn Invincibility
- When the player spawns at the start of a level in `GameScene.create()`, the player is invulnerable for at least 3.0 seconds (3000ms).
- When the player respawns after losing a life in `GameScene.respawnPlayer()`, the player is invulnerable for at least 3.0 seconds (3000ms).
- Visual indicator: player motorcycle and turret flash (alpha oscillating between 0.3 and 1.0) throughout the 3-second period.
- Player cannot be damaged by bullets, collisions, or hazards during spawn invulnerability.

### AC-5: Adjustable CPU Game Speed Bar
- In `HUDScene` (or dedicated controls bar), render an adjustable CPU speed bar positioned between the arena and controls (or in the HUD).
- Displays current CPU speed multiplier (e.g. `0.25x`, `0.5x`, `0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`).
- Features clickable decrement `[-]` and increment `[+]` buttons plus a clickable/draggable slider bar.
- Adjusting the speed immediately updates:
  - Enemy tank movement speed (`speed = baseSpeed * cpuSpeedMultiplier`).
  - Enemy tank rotation tracking rate.
  - Enemy firing cooldown (`fireCooldown = baseFireCooldown / cpuSpeedMultiplier`).
- Setting speed below 1.0x makes CPU players significantly slower and easier to react to.

---

## 2. Constraints & Non-Goals
- Pure Canvas & Phaser 3 vector/graphics implementation: no external image assets.
- Mobile touch-first: Gestures must not interfere with normal virtual joystick driving or tap-to-aim targeting.
- Performance: Multipliers and cheat checks must run with zero garbage collection overhead and high frame rates.

---

## Domain Decisions
- [DECISION] Define top-right corner cheat hitbox as x > 400, y < 80 in 480x854 viewport.
- [DECISION] Define swipe-down gesture as start y < 285, end y > 570, |deltaX| < 160.
- [DECISION] Increase spawn invincibility duration to 3000ms with 200ms alpha yoyo repeats.
- [DECISION] Support CPU speed range from 0.25x (ultra-easy) to 2.0x (turbo) with default 1.0x.
- [DECISION] Reveal level select milestone titles in-place without resetting scroll or prematurely launching the level.
