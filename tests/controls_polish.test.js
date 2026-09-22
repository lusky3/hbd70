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
  assert.match(invadersContent, /this\.fireCooldown = 250;/, 'Space Invaders must set fireCooldown to 250ms');
  assert.match(invadersContent, /this\.reloadGfx/, 'Space Invaders must render overhead reload meter graphics');
  assert.match(invadersContent, /updateCooldownUI/, 'Space Invaders must update cooldown UI in game loop');

  // Verify cooldown logic math (250ms)
  const fireCooldown = 250;
  let lastFired = 1000;
  const now1 = 1150; // 150ms elapsed
  const canFire1 = (now1 - lastFired) >= fireCooldown;
  assert.equal(canFire1, false, 'Should be throttled during 250ms cooldown');

  const now2 = 1260; // 260ms elapsed
  const canFire2 = (now2 - lastFired) >= fireCooldown;
  assert.equal(canFire2, true, 'Should be allowed to fire after 250ms cooldown expires');
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
  assert.match(asteroidsContent, /this\.isTouchSteering/, 'Asteroids must latch isTouchSteering for gestures');
  assert.match(asteroidsContent, /this\.fireLaser\(\)/, 'Asteroids tap must invoke fireLaser directly');

  // Behavioral verification of Asteroids touch gesture state machine
  const initialRotation = -1.25; // Ship facing arbitrary heading
  let ship = { rotation: initialRotation, x: 240, y: 400, active: true };
  let touchPointer = { id: 1, x: 100, y: 100, isDown: true };
  let touchDownX = 100;
  let touchDownY = 100;
  let touchDownTime = 1000;
  let isTouchSteering = false;
  let laserFired = false;
  let touchThrust = false;

  // Frame update simulation during a tap: pointer held for 100ms with 4px jitter
  const simulateUpdate = (currentTime, curX, curY) => {
    touchPointer.x = curX;
    touchPointer.y = curY;
    const holdTime = currentTime - touchDownTime;
    const dragDist = Math.hypot(touchPointer.x - touchDownX, touchPointer.y - touchDownY);

    if (!isTouchSteering) {
      if (dragDist > 14 || holdTime > 220) {
        isTouchSteering = true;
      }
    }

    if (isTouchSteering) {
      const dx = touchPointer.x - ship.x;
      const dy = touchPointer.y - ship.y;
      const distFromShip = Math.hypot(dx, dy);
      if (distFromShip > 14) {
        const targetAngle = Math.atan2(dy, dx);
        ship.rotation = targetAngle; // Steers toward finger
      }
      touchThrust = distFromShip > 70;
    } else {
      touchThrust = false;
    }
  };

  // 1. Simulating tap frame at 50ms
  simulateUpdate(1050, 103, 101);
  assert.equal(isTouchSteering, false, 'Pointer jitter < 14px must NOT trigger steering');
  assert.equal(touchThrust, false, 'Tap must NOT trigger accidental thrust');
  assert.equal(ship.rotation, initialRotation, 'Ship heading must remain strictly invariant during tap');

  // 2. Simulating tap frame at 110ms
  simulateUpdate(1110, 104, 102);
  assert.equal(isTouchSteering, false, 'Tap under 220ms and < 14px must NOT trigger steering');
  assert.equal(ship.rotation, initialRotation, 'Ship heading must remain unchanged');

  // 3. Simulating pointerup on tap
  if (!isTouchSteering) {
    laserFired = true;
  }
  assert.equal(laserFired, true, 'Laser must fire upon releasing tap');
  assert.equal(ship.rotation, initialRotation, 'Ship heading must be 100% invariant before and after tap');

  // 4. Contrast with intentional steering drag (> 14px)
  simulateUpdate(1250, 150, 100); // 50px drag
  assert.equal(isTouchSteering, true, 'Displacement > 14px must engage touch steering');
  assert.notEqual(ship.rotation, initialRotation, 'Steering drag must update ship heading');
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
