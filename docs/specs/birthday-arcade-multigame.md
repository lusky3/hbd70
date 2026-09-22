---
status: shipped
title: Allan's 70th Birthday Arcade: Multi-Game Collection & Touch Usability
source: internal
source_doc: user_request
created: 2026-09-22
updated: 2026-09-22
primary_domain: ui
secondary_domains: [gameplay]
---

# Allan's 70th Birthday Arcade: Multi-Game Collection & Touch Usability

## Overview
Expand *Birthday Tanks!* into a retro arcade celebration cabinet ("Allan's 70th Birthday Arcade"):
1. **Full-Screen Tap Anywhere Splash**: Simplify the title screen into a festive "Press / Tap Anywhere to Continue" gateway that safely unlocks Web Audio API and transitions directly to game selection.
2. **Arcade Game Selection Hub (`GameSelectScene`)**: A central retro game selection menu letting the player choose between 4 full games honoring Allan Lusk's 70th Birthday:
   - **Tanks!** (The 70-level milestone tribute tank game with decade bosses and level selection).
   - **Birthday Pong**: Touch-friendly paddle duel featuring an extended under-paddle grip handle so fingers do not block ball visibility.
   - **Space Invaders**: Descending retro birthday invaders, milestone decade bunkers (1956, 1976, 1996, 2026), and mystery bonus railcars.
   - **Asteroids**: Vector-style space cruiser with Newtonian inertia, splitting birthday meteorites, and laser cannons.
3. **Level 1 Controls / How-to-Play Overlay**: Before starting Level 1 of any game, display a clear, intuitive instructional card demonstrating touch and keyboard controls with a quick "START GAME ▶" dismissal.

---

## 1. Acceptance Criteria

### AC-1: Tap-Anywhere Splash Screen (`SplashScene`)
- Title screen presents full-screen celebration: "HAPPY 70th BIRTHDAY, ALLAN!", family dedication, animated cake, and cruiser tank preview.
- Call to action prominently flashes: "PRESS / TAP ANYWHERE TO CONTINUE".
- Clicking or tapping anywhere on the canvas initializes the Web Audio API context (`audio.init()`) and transitions seamlessly to `GameSelectScene`.

### AC-2: Game Selection Menu (`GameSelectScene`)
- Displays an arcade multi-game cabinet selection menu in portrait orientation (480x854).
- Features 4 distinct playable games with thematic birthday cards:
  1. **Birthday Tanks!**: Allan's 70-Level Tank Odyssey (displays current progress, e.g. `LEVELS: X/70`).
  2. **Birthday Pong**: Classic 1v1 Table Tennis with touch-grip paddle and rally physics.
  3. **Space Invaders**: Retro arcade defense with milestone bunkers and descending invaders.
  4. **Asteroids**: 360-degree vector space cruiser blasting splitting meteorites.
- Tapping any game card initiates the respective game flow.
- Includes navigation to `CreditsScene` ("Credits 📜") and return to Splash.

### AC-3: Level 1 Controls / How-to-Play Overlay
- On the launch of Level 1 (or match start) of ANY game, display an overlay card outlining the game's specific controls and objective.
- Clear, visual instructions for touch devices and desktop keyboards:
  - **Tanks**: Left thumbstick to drive, right trackpad / screen tap to aim & fire, mine button.
  - **Pong**: Drag the extended paddle grip below the paddle horizontally to block the ball.
  - **Space Invaders**: Slide cannon horizontally, tap fire button / screen, take cover behind decade bunkers.
  - **Asteroids**: Steer left/right, thrust engine forward, fire laser cannon, watch screen wrap.
- Includes a prominent "START GAME ▶" button that dismisses the instructions and unpauses/starts gameplay immediately.

### AC-4: Birthday Pong Implementation (`PongScene`)
- Classic 2-player pong court adapted for mobile portrait: player paddle at bottom, AI opponent paddle at top, central net, score counter.
- **Touch-Friendly Paddle Grip**: Player paddle includes an extended touch grip handle located directly below the paddle in the bottom margin. Players can drag this handle with a finger or mouse without their hand obscuring the paddle face or the incoming ball.
- Angle deflection physics based on point of contact on paddle.
- Match score tracking (first to 7 points, celebrating Allan's 70th milestone).
- Sound effects via `AudioManager` for paddle hits, wall bounces, point scoring, and victory.
- In-game HUD includes score, pause/mute toggle, and "BACK TO MENU" button.

### AC-5: Birthday Space Invaders Implementation (`SpaceInvadersScene`)
- Classic grid of descending retro birthday invaders (candles, gift boxes, party hats, vintage icons).
- Invaders march horizontally, drop lower upon hitting screen boundaries, and accelerate as their numbers dwindle.
- 4 destructible milestone bunker shields (1956, 1976, 1996, 2026) that degrade upon absorbing shots.
- Mystery flying UFO (vintage CN railcar) periodically passing along top edge for bonus points.
- Player controls: Touch dragging or on-screen left/right buttons + dedicated fire button.
- Sound effects, player lives (3 lives), wave progression, and back-to-menu navigation.

### AC-6: Birthday Asteroids Implementation (`AsteroidsScene`)
- Allan's Cruiser ship in deep space with 360-degree rotation and Newtonian thrust physics.
- Screen wrapping across all four edges (left/right, top/bottom).
- Large birthday asteroids split into medium asteroids upon impact, which split into small fast debris.
- Touch controls: Left/Right rotation buttons, Thrust button (with particle engine exhaust), and Fire Laser button.
- Score counter, lives (3 lives), wave clearing, and back-to-menu navigation.

### AC-7: Zero Asset & Audio Consistency
- All sprites rendered 100% procedurally in HTML5 Canvas via `Draw.js`.
- All sound effects and music generated 100% via Web Audio API in `AudioManager.js`.
- Responsive layout adapting to mobile portrait (FIT mode 480x854).

### AC-8: Arcade Stats & High Score Persistence
- Extend `Storage.js` to persist player records for all retro arcade mini-games across browser sessions in `localStorage`:
  - **Birthday Pong**: Tracks total player wins, losses against CPU, and longest rally record.
  - **Space Invaders**: Tracks all-time high score and highest wave reached.
  - **Birthday Asteroids**: Tracks all-time high score and highest wave reached.
- `GameSelectScene` dynamically surfaces these persistent records on each mini-game's menu card:
  - Pong: `Record: XW - YL • Best Rally: Z` (or default callout if no matches played yet).
  - Space Invaders: `High Score: XXXX • Wave Y` (or default callout if unplayed).
  - Asteroids: `High Score: XXXX • Wave Y` (or default callout if unplayed).
- Backward compatibility: Existing player storage schemas preserve all 70-level Tanks progress and gain default zeroed arcade stats automatically without corruption.

---

## 2. Constraints & Non-Goals
- Zero external bitmap images or audio files (100% procedural Canvas & Web Audio).
- No disruption to existing 70-level Tanks progression or saved `localStorage` data.
- Mobile touch priority: All 4 games must be fully playable single-handed or two-thumbed on portrait smartphones.

---

## Domain Decisions
- [DECISION] Adopt a central `GameSelectScene` hub to cleanly isolate the 4 games while sharing common audio, controls, and rendering systems.
- [DECISION] Implement an extended under-paddle touch grip handle for Pong to solve the finger-obscuring-ball mobile touch problem.
- [DECISION] Standardize an instructional How-to-Play overlay on Level 1 across all games before active gameplay starts.
- [DECISION] Store arcade mini-game stats in a dedicated 'arcadeStats' key within existing storage for clean backward compatibility.
