# Changelog

All notable changes to Allan's 70th Birthday Retro Arcade Collection will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
