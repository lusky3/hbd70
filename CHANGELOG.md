# Changelog

All notable changes to Allan's 70th Birthday Retro Arcade Collection will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-09-22

### Added
- **Multi-Device Real-Time Multiplayer**: Serverless peer-to-peer browser-to-browser WebRTC DataChannels powered by PeerJS (`peerjs.min.js`) backed by public STUN signaling (`stun:stun.l.google.com:19302`), enabling real-time arcade gameplay across smartphones, tablets, and desktop browsers with 0 app installs and 0 cloud hosting costs.
- **Room Lifecycle & QR Code Camera Onboarding**: Host generates 4-character room codes (e.g. `AL70`, `HBD7`) and renders a crisp Canvas QR code in `MultiplayerLobbyScene`; players can point their phone camera at the screen to join automatically via URL parameter (`?room=XXXX`).
- **4-Player Birthday Tanks Arena (`MultiplayerTanksScene`)**: Dedicated 2 to 4 player tactical deathmatch arena with symmetrical layout, destructible birthday present blocks, 1.5s spawn invulnerability shields, and host-authoritative 60 FPS physics simulation.
- **Client Prediction & Remote Interpolation**: Instant local tank steering with 0ms perceived lag, coupled with smooth linear interpolation (`lerp`) on remote tanks at 25 Hz snapshot broadcast frequency.
- **2-Player Birthday Pong Duel (`MultiplayerPongScene`)**: Synchronized 2-player paddle rally with inverted coordinate perspective for the client, allowing both players to comfortably play using their under-paddle touch grip handle on their own mobile screens.
- **Multiplayer Hub Action Bar**: Added dedicated `[ 🌐 MULTIPLAYER (2-4P) ]` button alongside `[ 🏆 HIGH SCORES ]` in `GameSelectScene`.

## [1.3.0] - 2026-09-22

### Added
- **Optional Larger Full Name / Nickname**: Support for entering an optional full name (up to 24 characters, e.g. "Allan") associated with the retro 3-letter arcade initials tag (e.g. "ALL").
- **Set Tag & Name Button on High Scores**: Dedicated interactive button (`[ 👤 SET TAG/NAME ]`) on the Leaderboard modal allowing players to configure and save their player profile anytime without waiting for a game over screen.
- **Leaderboard Hover & Tap Reveal**: In `LeaderboardModalScene`, entries with an attached full name display a cyan dot indicator (`ALL •`). Hovering (desktop pointer) or tapping (mobile touch) reveals a retro arcade tooltip displaying the full name (e.g. `★ ALL ➜ Allan`) without disrupting the monospace table layout.
- **Family-Friendly Profanity Filter**: Dual-layer client (`ProfanityFilter.js`) and server-side (`worker/profanity.js`) validation checking both 3-letter initials tags and full names against offensive acronyms, vulgarities, and slurs with friendly UI warnings and HTTP 400 API protection.
- **Cloudflare D1 Worker Schema & API Update**: Added `full_name TEXT` column to `leaderboards` table; updated `GET` and `POST` endpoints to store and deliver `fullName`.

## [1.2.0] - 2026-09-22

### Added
- **Retroactive Local High Scores Migration**: Detection of un-uploaded local high scores stored in `localStorage` upon entering the arcade cabinet hub (`GameSelectScene`).
- **Retroactive Import Modal (`RetroactiveImportModalScene`)**: Arcade modal allowing existing players to review all local records, choose 3-letter initials (with touch chevrons, vertical swipe drag, and desktop keyboard typing), and batch-submit them in 1 tap to the global Cloudflare D1 leaderboard.
- **Batch Leaderboard Submission API**: Added `submitBatchScores` in `LeaderboardService` for sequential edge worker submission with offline fail-soft resilience.

### Changed
- **Full Button Hitbox Fix**: Replaced container interaction bounds with centered `Phaser.GameObjects.Zone` instances across `GameSelectScene`, `GameOverScene`, `PongScene`, `SpaceInvadersScene`, and `VictoryScene`, fixing the Phaser bottom-right container quadrant offset bug and ensuring 100% of each button surface registers touches and clicks.

## [1.1.0] - 2026-09-22

### Added
- **Version Indicator**: Displayed `v1.1.0` in the bottom-left corner of the arcade game selection cabinet (`GameSelectScene`).
- **QA Testers in Credits**: Kelsey Lusk and Jay added to Credits as QA Testers & Glitch Hunters.
- **[In Spirit] Credits Section**: Amy, Jennifer, and Kelsey honored in a dedicated `★ [IN SPIRIT] ★` bracketed section.
- **Space Invaders Firing Cooldown Indicator**: Visual reload meter above player cannon and dynamic reload state on the FIRE button.
- **Space Invaders Play-Area Tap-to-Fire**: Tap anywhere in the play area to fire cannon.
- **Asteroids Tap-to-Fire (Heading Invariant)**: Tap anywhere on the playfield to fire lasers along the ship's current heading without altering vector rotation or interrupting drift.
- **Asteroids Mobile Touch Steering Ring**: Intuitive touch steering ring around ship with rotational dial and extended outward thrust engagement, while preserving discrete bottom buttons.

### Changed
- **Credits Birthplace**: Corrected Allan's birthplace in `CreditsScene` crawl to Parry Sound, ON (removing the King City birthplace implication).
- **Splash Screen Dedication**: Updated family dedication to Cody and Carrie (removing Kelsey, Jenn, and Amy).
- **Space Invaders Continuous Drag Movement**: Continuous finger movement across the play area persists smoothly even when swiping downward over bottom direction buttons.
- **Procedural CN Railcar Visuals**: Complete visual overhaul of `invader_ufo` in `Draw.js` featuring authentic Canadian National red/black livery, roof catwalk, roof corrugations, chassis underbody, dual 2-axle bogie wheel trucks, and end couplers.

## [1.0.0] - 2026-09-22

### Added
- **Allan's 70th Birthday Arcade Collection**: Central `GameSelectScene` cabinet hub featuring 4 playable retro arcade games:
  - **Birthday Tanks!**: 70-level milestone tribute tank odyssey across 7 decades with decade climax bosses.
  - **Birthday Pong**: 1v1 table tennis with an under-paddle touch grip handle and deflection physics.
  - **Space Invaders**: Retro invasion defense with 4 milestone decade bunkers (1956, 1976, 1996, 2026).
  - **Birthday Asteroids**: 360-degree vector space cruiser with Newtonian inertia and splitting meteorites.
- **Level 1 Controls Overlay**: Intuitive How-to-Play instruction cards across all 4 games.
- **Persistent High Scores & Stats**: Storage tracking for Pong match record/longest rally, Space Invaders high score/highest wave, and Asteroids high score/highest wave.
- **Splash Gateway**: Full-screen celebration screen unlocking Web Audio API context safely on first interaction.
