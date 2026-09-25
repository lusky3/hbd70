# Changelog

All notable changes to Allan's 70th Birthday Retro Arcade Collection will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0] - 2026-09-25

### Added
- **Allan's 70th Birthday Retro Pool (Pocket Billiards)**: New arcade game featuring green felt, mahogany cushions, 6 brass drop pockets, 16 specular-highlighted balls, and realistic 4-substep 2D physics.
- **4 Billiards Subtypes**: 8-Ball (open table rules, solid/stripe groups), 9-Ball (lowest-ball rotation, 9-ball on break / combo win), Straight Pool (14.1 Continuous with 14-ball continuous re-racks to 25 points), and Speed Pool (90s time attack countdown with +10s pot bonus).
- **4-Tier VS CPU AI**: Calibrated AI shot calculation with cut angles and obstruction raycasting across Novice, Regular, Master, and Allan Legend difficulties, featuring Allan Legend victory celebration fanfare.
- **Dedicated Cloudflare D1 Leaderboards**: 4 dedicated sub-tabs (`pool_8ball`, `pool_9ball`, `pool_straight`, `pool_speed`) in `LeaderboardModal` with streak multipliers (up to 4x) and trick shot bonuses (Break Pot, Bank Shot, Combo/Carom).
- **Real-Time 2-Player WebRTC Multiplayer**: Host-authoritative physics simulation, turn handoffs, ball-in-hand placement, 25Hz snapshots, and instant rematching across 8-Ball, 9-Ball, and Straight Pool.
- **Mobile Touch Controls**: Touch drag aiming, fine-angle stepper buttons (`◀`/`▶`), and spring-release vertical power meter slider.

## [1.6.0] - 2026-09-25

### Added
- **Tanks Multiplayer PvP vs PvE Modes**: Toggle in multiplayer lobby between competitive PvP (Deathmatch) and cooperative PvE (Co-op Squad).
- **PvE Sub-Settings (Decades vs Endless)**: Squad can choose Decades Mode (co-op progression through the 70 classic campaign levels) or Endless Mode (procedurally generated infinite waves with scaling difficulty curves and boss waves every 5th wave).
- **Friendly Fire Immunity**: Cooperative squad members in PvE cannot damage or destroy one another with ricochet bullets or mines.
- **PvP Leaderboard Winner Badges**: PvP match winners can submit their scores directly to the global Cloudflare D1 leaderboards; high score table highlights PvP victories with a distinctive `⚔️` icon badge and dedicated tooltip.
- **Host Authoritative PvE AI Simulation & Client Interpolation**: Host authoritative enemy tanks, AI targeting nearest squad member, boss health bars, and real-time state synchronization over WebRTC DataChannels.

## [1.5.0] - 2026-09-23

### Added
- **Classic Arcade Branding & PWA WebApp Support**: Updated title to "Classic Arcade", added PWA manifest (`manifest.webmanifest`), offline service worker (`sw.js`), high-resolution app icons, and native mobile "Install as App" prompt integration on the Splash screen.
- **Lobby Live Chat**: Bi-directional real-time lobby chat over WebRTC DataChannels with quick-chat reaction bubbles (`👋 Hello!`, `👍 Ready!`, `🔥 Let's play!`, `🕹️ Change game!`) and custom message input with profanity filtering.
- **Host Player Kick Controls**: Room host can remove unwanted players from slots 2-4 via explicit `✕` button, desktop right-click, or mobile long-press (500ms).
- **Keyboard & Mouse Wheel Room Code Input**: Players joining a multiplayer game can type directly via physical PC keyboard or mobile keyboard, navigate slots with arrow keys, and scroll the mouse wheel over slots to cycle characters.
- **Host Screen QR Code Rendering**: Vendored `vendor/qrcode.min.js` to ensure the host screen renders an instant high-contrast QR code for seamless camera scanning on mobile phones.

### Fixed
- **Host Player Profile Identity**: Host slot 1 now accurately displays the player's saved high score profile name and tag (from `Storage.getPlayerProfile()`) rather than defaulting to "Allan".
- **Multiplayer Start Game Button**: Fixed bug where clicking "START GAME" was unresponsive due to `removeAll(true)` wiping out the button's interactive zone; decoupled visual state from the persistent click zone.
- **Create Room vs Join Room Mode Switching**: Fixed bug where switching from Join Room to Create Room kept displaying the Join screen due to an internal `host-disconnected` loopback trigger.

## [1.4.2] - 2026-09-22

### Fixed
- **Back & Menu Button Full Surface Area Hotspot**: Fixed issue where Back (`< BACK`, `◀ BACK`) and Menu (`< MENU`) buttons across `GameSelect`, `Credits`, `LevelSelect`, `Pong`, `SpaceInvaders`, and `Asteroids` only responded to clicks in the bottom half or bottom-right quadrant; replaced container `setSize` / `setInteractive` with centered `Phaser.GameObjects.Zone` instances ensuring 100% surface area clickability.
- **UI Control Hitbox Offsets**: Applied the centered `Zone` pattern to Mute buttons, Space Invaders touch controls (`leftBtn`, `rightBtn`, `fireBtn`), `LeaderboardModal` game tabs, and the `Splash` credits link to eliminate all container hit area misalignment across the collection.

## [1.4.1] - 2026-09-22

### Fixed
- **Set Tag/Name Modal Layering**: Fixed issue where clicking `[ 👤 SET TAG/NAME ]` inside the High Scores leaderboard modal left the `InitialsEntryOverlayScene` hidden behind the leaderboard modal backdrop; added explicit `bringToTop()` lifecycle handling.
- **Multiplayer Lobby Tab Toggling**: Fixed issue where clicking "Join Room" permanently broke the "Create Room" tab due to `removeAll(true)` destroying container interactive click zones; persistent graphics and zones now preserve click responsiveness across unlimited mode and game switches.

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
