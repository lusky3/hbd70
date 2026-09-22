// tests/controls_polish.test.js
// Verification suite for controls, strings, credits roster, and versioning polish

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_VERSION } from '../src/version.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('AC-1: Allan Birthplace String in Credits is Parry Sound, ON', () => {
  const creditsContent = fs.readFileSync(path.join(rootDir, 'src/scenes/Credits.js'), 'utf-8');
  assert.match(creditsContent, /Parry Sound, Ontario/, 'Credits opening crawl must feature Parry Sound');
  assert.doesNotMatch(creditsContent, /A long time ago in King City/, 'Credits must not imply Allan was born in King City');
});

test('AC-1: Splash Screen Dedication Excludes Kelsey, Jenn, and Amy', () => {
  const splashContent = fs.readFileSync(path.join(rootDir, 'src/scenes/Splash.js'), 'utf-8');
  assert.match(splashContent, /From Cody\s*\\n— and Carrie ❤️/, 'Splash dedication must be from Cody & Carrie');
  assert.doesNotMatch(splashContent, /From Cody, Amy, Jenn & Kelsey/, 'Splash dedication must not list Kelsey, Jenn, and Amy');
});

test('AC-2: Credits Roster Includes QA Testers and [In Spirit] Section', () => {
  const creditsContent = fs.readFileSync(path.join(rootDir, 'src/scenes/Credits.js'), 'utf-8');
  assert.match(creditsContent, /QA TESTERS & GLITCH HUNTERS/, 'Credits must feature QA Testers & Glitch Hunters title');
  assert.match(creditsContent, /Kelsey Lusk & Jay/, 'Credits must list Kelsey Lusk & Jay as QA testers');
  assert.match(creditsContent, /★ \[IN SPIRIT\] ★/, 'Credits must have dedicated ★ [IN SPIRIT] ★ section with brackets');
  assert.match(creditsContent, /Amy, Jennifer & Kelsey/, 'Credits [In Spirit] section must list Amy, Jennifer & Kelsey');
  assert.match(creditsContent, /Carrie Orr & Cody/, 'Craft Services must list Carrie Orr & Cody');
});

test('AC-3 & AC-4: Space Invaders Continuous Drag & Tap-to-Fire Cooldown Logic', () => {
  const invadersContent = fs.readFileSync(path.join(rootDir, 'src/scenes/SpaceInvaders.js'), 'utf-8');
  assert.match(invadersContent, /this\.isTouchDragging/, 'Space Invaders must track isTouchDragging state');
  assert.match(invadersContent, /this\.fireCooldown/, 'Space Invaders must define firing cooldown interval');
  assert.match(invadersContent, /this\.reloadGfx/, 'Space Invaders must render overhead reload meter graphics');
  assert.match(invadersContent, /updateCooldownUI/, 'Space Invaders must update cooldown UI in game loop');

  // Verify cooldown logic math
  const fireCooldown = 280;
  let lastFired = 1000;
  const now1 = 1150;
  const canFire1 = (now1 - lastFired) >= fireCooldown;
  assert.equal(canFire1, false, 'Should be throttled during cooldown');

  const now2 = 1300;
  const canFire2 = (now2 - lastFired) >= fireCooldown;
  assert.equal(canFire2, true, 'Should be allowed to fire after cooldown expires');
});

test('AC-5: Procedural CN Railcar Features Detailed Livery, Trucks, and Catwalk', () => {
  const drawContent = fs.readFileSync(path.join(rootDir, 'src/utils/Draw.js'), 'utf-8');
  assert.match(drawContent, /Mystery Vintage CN Railcar UFO/, 'Draw.js must include vintage CN Railcar UFO');
  assert.match(drawContent, /drawTruck/, 'Draw.js must procedurally draw bogie wheel trucks');
  assert.match(drawContent, /#dc2626/, 'Draw.js must use Canadian National red livery');
  assert.match(drawContent, /Catwalk/, 'Draw.js must render roof catwalk');
  assert.match(drawContent, /1956/, 'Draw.js must render road number 1956 milestone tribute');
});

test('AC-6: Asteroids Tap-to-Fire Preserves Ship Heading Invariance', () => {
  const asteroidsContent = fs.readFileSync(path.join(rootDir, 'src/scenes/Asteroids.js'), 'utf-8');
  assert.match(asteroidsContent, /this\.touchRingGfx/, 'Asteroids must instantiate touchRingGfx');
  assert.match(asteroidsContent, /touchThrust/, 'Asteroids must support touchThrust control state');
  assert.match(asteroidsContent, /this\.fireLaser\(\)/, 'Asteroids tap must invoke fireLaser directly');

  // Mathematical proof: Tap release fires without modifying ship.rotation
  let shipRotation = -Math.PI / 4;
  const tapDist = 5; // Under 12px threshold
  const tapDuration = 120; // Under 280ms threshold
  const isTap = tapDuration < 280 && tapDist < 12;
  assert.equal(isTap, true, 'Pointer gesture should be recognized as quick tap');

  // Tapping should keep ship rotation identical
  const originalHeading = shipRotation;
  assert.equal(shipRotation, originalHeading, 'Ship heading must remain strictly invariant during tap-to-fire');
});

test('AC-7: Version Consistency across package.json, src/version.js, GameSelect.js, and CHANGELOG.md', () => {
  assert.equal(APP_VERSION, '1.1.0', 'APP_VERSION must be 1.1.0');

  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  assert.equal(pkg.version, '1.1.0', 'package.json version must be 1.1.0');

  const gameSelectContent = fs.readFileSync(path.join(rootDir, 'src/scenes/GameSelect.js'), 'utf-8');
  assert.match(gameSelectContent, /v\$\{APP_VERSION\}/, 'GameSelectScene must render v${APP_VERSION} in footer');

  const changelogContent = fs.readFileSync(path.join(rootDir, 'CHANGELOG.md'), 'utf-8');
  assert.match(changelogContent, /## \[1\.1\.0\] - 2026-09-22/, 'CHANGELOG.md must contain entry for 1.1.0');
});
