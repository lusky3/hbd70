---
status: frozen
title: Birthday Tanks! — Allan Lusk's 70th Birthday Edition
source: internal
source_doc: /home/cody/tmp/birthday-tanks/specs/birthday-tanks/spec.md
created: 2026-09-19
updated: 2026-09-19
primary_domain: ui
secondary_domains: [api, data, auth]
---

# Birthday Tanks! — Allan Lusk's 70th Birthday Edition

## File Relationship
INDEPENDENT — Core feature specification for Allan Lusk's 70th Birthday celebration game, adapted from project design notes.

## Overview
A love letter disguised as a browser game for **Allan Lusk's 70th Birthday (September 22, 2026)**, built by **Cody** (with love from Cody, Amy, Jenn, Kelsey, and Carrie). 

Inspired by Wii Play's "Tanks!", Allan navigates a custom **Motorcycle Tank** through **7 Themed Worlds × 10 Levels (70 levels total — one for each year of his life)**. Levels represent real-life milestones and decades from 1956 to 2026. Enemies range from birthday candles and golf balls to hockey pucks, snowmobiles, and the climactic boss: **The 70**.

Primary target: **Mobile browser** (iOS Safari, Android Chrome) in portrait mode, with desktop keyboard/mouse fallback.

---

## 1. Goal
Deliver an accessible, responsive, mobile-first browser game celebrating Allan Lusk's 70th milestone, combining responsive top-down tactical tank action (ricochet shots, mines, destructible barriers) with deeply personalized family storytelling, custom canvas-rendered vehicle sprites, and nostalgic audio cues.

---

## 2. Acceptance Criteria

### 2.1 Thematic Progression & 70 Levels
1. **7 Themed Decades**:
   - **World 1 (1956–1965)**: *The Early Years* — Sunny yellow terrain. Enemies: Birthday Candles (stationary, timed single shots).
   - **World 2 (1966–1975)**: *The Growing Up Years* — Green field terrain. Enemies: Golf Ball Tanks (slow patrol, single bounced shots).
   - **World 3 (1976–1985)**: *The Adventure Years* — Blue lake / cottage terrain. Enemies: Puck Tanks (fast, friction-slide movement).
   - **World 4 (1986–1995)**: *The Family Years* — Warm orange terrain. Enemies: Boat Tanks (restricted to water channels).
   - **World 5 (1996–2005)**: *The Cottage Years* — Forest green terrain. Enemies: Snowmobiles (fast erratic movement).
   - **World 6 (2006–2015)**: *The Open Road* — Highway asphalt gray terrain. Enemies: Biker Tanks (aggressive charge AI).
   - **World 7 (2016–2026)**: *The Legend Years* — Space black / celebration arena. Final Boss on Level 70: **The 70** (multi-shot, mine placement, high health).
2. **70 Milestone Level Cards, Career & Pop Culture Highlights**:
   - Each level presents a 2-second interstitial banner showing the World, Level, Year, and Milestone name.
   - **Allan's Family Milestones**:
     - `1956 — Year One: Allan is Born!`
     - `1979 — Amy Born (May 14) ❤️`
     - `1981 — Jennifer Born (June 27) ❤️ [Year Placeholder]`
     - `1987 — Oct 24: Married Carrie Orr (Carrie Orr-Lusk) ❤️`
     - `1989 — Cody Born (May 6) ❤️`
     - `1991 — Kelsey Born (April 23) ❤️`
   - **Education & Career Milestones**:
     - `1970 — King City Secondary School Days`
     - `1974 — King City Secondary Graduation`
     - `1976 — Joining CN Rail & George Brown College Millwright Apprenticeship`
     - `1979 — George Brown Polytechnic Graduation (Machinist / Millwright)`
     - `1990s — Rising at CN Rail: System Manager, Intermodal Equipment`
     - `2003 — Starting at Reefer Sales (Operations & Admin Manager)`
     - `2011 — Joining TTX Company (Assistant Manager, NE USA & Canada)`
     - `2015 — TTX Regional Manager (Burlington, Ontario)`
     - `2019 — Well-Earned Retirement from TTX Company!`
   - **Allan's Favorite TV Shows & Pop Culture Milestones**:
     - `1964 — Gilligan's Island Premieres (A Three-Hour Tour!)`
     - `1966 — Star Trek: TOS Premieres (Space, The Final Frontier)`
     - `1969 — Apollo 11: Man Walks on the Moon`
     - `1972 — Summit Series: Team Canada Hockey Legend`
     - `1977 — Star Wars: A New Hope Hits Theaters`
     - `1983 — The A-Team Premieres (I Love It When a Plan Comes Together)`
     - `1987 — Star Trek: The Next Generation Premieres (Make It So)`
     - `2003 — NCIS Premieres (Gibbs' Rules)`
     - `2026 — The Legend at 70: Happy Birthday, Allan!`

### 2.2 Gameplay & Combat Mechanics
3. **Player Vehicle (The Motorcycle)**:
   - Drawn as a side-profile motorcycle silhouette using HTML5 Canvas primitives (zero external image loading lag).
   - Body rotates toward driving direction; headlight/front fork rotates independently toward touch aim point.
   - 3 total lives per game (persists across levels, no free refills; game over when lives reach 0).
4. **Bouncing Bullets (Ricochet)**:
   - Player and enemy projectiles bounce off solid stone/brick walls (1 bounce standard, 2 bounces in later worlds).
   - Destroys enemy tanks, destructible blocks, or player on direct hit.
5. **Party Mines**:
   - Limited mine deployment (drop behind motorcycle).
   - Detonates on proximity of enemy tanks or after timed fuse, destroying nearby destructible blocks and enemies.
6. **Terrain Grid**:
   - Destructible blocks (dirt/gift boxes): destroyed by shells and mine explosions.
   - Indestructible walls (stone/cake bricks): ricochet bullets.
   - Water/Holes: impassable hazards (instant life loss if driven into).

### 2.3 Mobile Portrait Controls & Audio
7. **Mobile Portrait Layout**:
   - Logical 480×854 resolution (9:16 aspect ratio) dynamically scaled via `Phaser.Scale.FIT` centered on mobile screens.
   - Left virtual joystick for motorcycle steering.
   - Right tap/drag zone for turret aiming and dedicated "Fire" + "Drop Mine" buttons (hitboxes ≥ 48x48px).
8. **Desktop Controls (Fallback)**:
   - WASD / Arrow keys for movement, Mouse to aim & left click to fire, Space / X to place mine.
9. **Web Audio Sound Effects**:
   - Synthesized engine rev tone on movement, acoustic gunshot pop, celebratory explosion chimes, and victory jingle.
   - Audio context unlocked cleanly on first user tap (Splash screen "TAP TO PLAY").

### 2.4 Personalized Celebration UI
10. **Splash Screen**:
    - "Happy 70th Birthday, Allan!" with animated candles.
    - Subtitle: "From Cody, Amy, Jenn & Kelsey — and Carrie".
    - "TAP TO PLAY" button.
11. **In-Game HUD**:
    - Motorcycle silhouette icons for remaining lives.
    - Header indicator: `Level X/70 — [Milestone Name]`.
    - Mine ammunition counter.
12. **Game Over Screen**:
    - "Allan's tank needs a pit stop... Try again?" with quick restart button.
13. **Victory Screen (Level 70 Cleared)**:
    - Full-screen celebratory confetti burst.
    - Message: "70 levels. 70 years. Still going strong. Happy Birthday, Dad. ❤️"
    - Final victory stats and replay button.

---

## 3. Non-goals
- Real-time multiplayer or network synchronization (pure single-player campaign for Allan).
- Heavy external sprite downloads (all graphics procedurally rendered via Canvas for instant load and offline play).
- Mandatory backend server requirement: the client must run 100% client-side on GitHub Pages without requiring a backend, while still supporting optional backend score tracking when available.

---

## 4. Constraints
- **Instant Load**: First load under 3 seconds on cellular 4G; zero asset pipelines or missing asset 404s.
- **Portability**: Must run directly on iOS Safari 16+ and Android Chrome without installation.
- **Reliability**: No crashes across all 70 level transitions; safe fallback if Web Audio is muted.

---

## Domain Decisions
- [DECISION] Represent Allan's player tank as a motorcycle silhouette with headlight turret to reflect his lifelong love of riding.
- [DECISION] Structure the campaign into 7 distinct 10-level decade worlds totaling 70 levels, mapping every year of Allan's life from 1956 to 2026.
- [DECISION] Procedurally render all sprites (motorcycle, candles, golf balls, pucks, snowmobiles, The 70) via Canvas drawing helpers to eliminate image loading lag and asset 404s.
- [DECISION] Use Web Audio API synthesized tones for engine revs, shooting, and explosions to avoid audio file decoding latency.
- [DECISION] Support zero-build static execution and GitHub Pages deployment so the game can be immediately shared with family via a single link.
- [TRADEOFF] Fixed 3-life total pool across 70 levels with level-select / checkpoint restarts rather than complex save accounts.
- [CONSTRAINT] Audio context MUST only initialize upon user interaction on the Splash Screen to satisfy iOS Safari autoplay restrictions.
- [CONSTRAINT] Mobile canvas must fit portrait 9:16 aspect ratio with touch control zones positioned outside the main tactical playfield.
