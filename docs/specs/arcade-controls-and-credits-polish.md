---
status: shipped
title: Allan's 70th Birthday Arcade: Controls, Strings & Visual Polish
source: internal
source_doc: user_request
created: 2026-09-22
updated: 2026-09-22
primary_domain: ui
secondary_domains: [gameplay]
---

# Allan's 70th Birthday Arcade: Controls, Strings & Visual Polish

## Overview
Polish and refine Allan's 70th Birthday Retro Arcade Collection based on user feedback:
1. **Accurate Family & Geographical Lore**:
   - Al was born in Parry Sound, ON (correct credits opening to remove King City birthplace implication).
   - Splash screen family dedication updated to remove Kelsey, Jenn, and Amy (dedication from Cody & Carrie).
   - Credits updated to honor Kelsey, Jenn, and Amy in a dedicated `[In Spirit]` bracketed section.
   - Kelsey and Jay added to QA testers in the credits.
2. **Space Invaders Touch Controls & Cooldown**:
   - Continuous finger tracking across play area that persists even if swiping down over the direction buttons.
   - Tap in play area to fire cannon.
   - Clear visual reload/cooldown indicator for firing rate.
3. **Space Invaders CN Railcar Visual Overhaul**:
   - Redesign procedural `invader_ufo` texture in `Draw.js` into an authentic vintage Canadian National boxcar/locomotive with catwalk, wheel trucks/bogies, chassis details, couplers, and iconic CN styling.
4. **Asteroids Mobile Touch Controls & Tap-to-Fire**:
   - Tap anywhere to fire laser along current ship heading without disorienting/snapping ship rotation.
   - Touch steering ring and thrust gesture system for fluid mobile dogfighting, while retaining discrete bottom buttons.
5. **Version Display & Release Tracking**:
   - Version number displayed in the bottom corner of `GameSelectScene`.
   - `CHANGELOG.md` created and maintained.
   - `package.json` bumped to `1.1.0`.

---

## 1. Acceptance Criteria

### AC-1: Birthplace & Splash Dedication Strings
- `src/scenes/Credits.js` opening crawl line updated to: `"A long time ago in Parry Sound, Ontario..."`.
- `src/scenes/Splash.js` family dedication updated to: `"From Cody\n— and Carrie ❤️"` (removing Kelsey, Jenn, and Amy).

### AC-2: Credits Roster Updates
- In `src/scenes/Credits.js`:
  - Add Kelsey and Jay as QA testers:
    ```javascript
    { text: 'QA TESTERS & GLITCH HUNTERS', color: '#94a3b8', size: 11, bold: false, space: 4 },
    { text: 'Kelsey Lusk & Jay', color: '#38bdf8', size: 16, bold: true, space: 26 },
    ```
  - Move Amy, Jennifer, and Kelsey to a dedicated bracketed section:
    ```javascript
    { text: '★ [IN SPIRIT] ★', color: '#f59e0b', size: 14, bold: true, space: 14 },
    { text: 'Amy, Jennifer & Kelsey', color: '#f1f5f9', size: 14, bold: false, space: 28 },
    ```
  - Craft Services & Moral Support updated to Carrie Orr & Cody.

### AC-3: Space Invaders Continuous Touch Movement
- When the player touches down in the play area (y < height - 80), capture horizontal tracking.
- As the player drags horizontally, cannon x tracks the finger position continuously (`Phaser.Math.Clamp(pointer.x, 30, width - 30)`), even if the finger swipes downward over the bottom direction buttons (`◀ LEFT`, `RIGHT ▶`) or out into the action bar area.
- Direction buttons do not steal focus or cancel the direct play-area drag.

### AC-4: Space Invaders Tap-to-Fire & Cooldown Indicator
- A tap (short duration, minimal displacement) in the play area fires a player cannon bullet.
- Visual firing cooldown indicator:
  - Firing cooldown duration: 250ms (and max 2 active bullets).
  - Visual reload meter above player cannon showing recharge status.
  - FIRE button on the action bar visually dims/reloads while cooling down and highlights when ready.

### AC-5: Vintage CN Railcar UFO Procedural Sprite
- Overhaul `generateInvaderTextures()` in `src/utils/Draw.js` for texture key `'invader_ufo'`:
  - Authentic CN boxcar / caboose / diesel switcher silhouette (56x24px).
  - Canadian National red/black livery with white CN logo ribbon style.
  - Roof catwalk / corrugation ribs.
  - Dual 2-axle bogie wheel trucks with wheels and axle bearings.
  - Chassis underframe details and couplers on both ends.

### AC-6: Asteroids Tap-to-Fire & Mobile Steering Ring
- Tapping anywhere in the playfield fires a laser along the ship's CURRENT heading without changing or snapping the ship's rotation (preserving Newtonian drift and vector shooting).
- Mobile steering & thrust touch mechanics:
  - Dragging from the ship (or on-screen touch dial) rotates ship toward drag angle smoothly.
  - Dragging further outward beyond the steering radius engages engine thrust with particle flare and audio hum.
  - Discrete bottom control bar buttons (`⟲ LEFT`, `RIGHT ⟳`, `▲ THRUST`, `💥 FIRE`) remain active and functional for players who prefer physical buttons.

### AC-7: Version Indicator & CHANGELOG.md
- Display `v1.1.0` in the bottom-left corner of `GameSelectScene` (at `x = 24`, `y = height - 28`).
- Create `CHANGELOG.md` adhering to Keep a Changelog format with entries for `v1.0.0` and `v1.1.0`.
- Bump `version` in `package.json` to `"1.1.0"`.

### AC-8: Automated Testing & Verification
- Unit test suite (`tests/arcade_multigame.test.js` or new `tests/controls_polish.test.js`) testing:
  - String assertions for Parry Sound, Splash dedication, QA testers, and `[In Spirit]` credits.
  - Space Invaders drag tracking boundary clamping and tap-to-fire cooldown logic.
  - Asteroids tap-to-fire heading invariance.
  - Version string presence and consistency between `package.json` and `GameSelectScene`.
- Headless Playwright verification verifying touch drag, tap firing, and visual rendering with 0 errors.
- Agentic OS integrity validation: 0 FAIL, 0 WARN.

---

## Domain Decisions
- [DECISION] Preserve heading invariance during Asteroids tap-to-fire so firing never snaps ship rotation or ruins vector drift.
- [DECISION] Maintain dual touch controls for Asteroids (playfield gesture steering ring + bottom discrete buttons) for maximum mobile accessibility.
- [DECISION] Decouple Space Invaders play-area touch drag from lower button bounds so downward finger drift never stalls horizontal movement.
- [DECISION] Separate family credits into dedicated [In Spirit] and QA Tester roster sections to honor familial contributions accurately.

