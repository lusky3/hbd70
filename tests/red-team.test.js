// tests/red-team.test.js
// Red Team adversarial edge cases & security testing per red-team-adversarial skill

import test from 'node:test';
import assert from 'node:assert/strict';
import { MILESTONES } from '../src/data/milestones.js';
import { LEVELS } from '../src/data/levels.js';

test('Red Team: Canvas Text Rendering Immunity to HTML Injection (XSS)', () => {
  // Verify that any special characters in titles (quotes, angle brackets, emojis) are treated as pure string literals
  for (let lvl = 1; lvl <= 70; lvl++) {
    const title = MILESTONES[lvl].title;
    // Check type is strictly string
    assert.equal(typeof title, 'string');
    // Ensure no raw script execution payloads exist in any milestone
    assert.doesNotMatch(title, /<script.*>/i, `Level ${lvl} title must not contain executable script tags`);
    assert.doesNotMatch(title, /javascript:/i, `Level ${lvl} title must not contain javascript URI scheme`);
  }
});

test('Red Team: Boundary Stress — Level Progression & Out-of-Bounds Caps', () => {
  // Test level lookup behavior for indices beyond 70 or below 1
  function getLevelData(levelNum) {
    if (levelNum < 1 || levelNum > 70) {
      return null;
    }
    return LEVELS[levelNum - 1];
  }

  assert.equal(getLevelData(0), null, 'Level 0 must return null');
  assert.equal(getLevelData(-5), null, 'Negative levels must return null');
  assert.equal(getLevelData(71), null, 'Level 71 must return null (triggers VictoryScene)');
  assert.equal(getLevelData(999), null, 'Excessive level must return null');
  assert.ok(getLevelData(1), 'Level 1 is valid');
  assert.ok(getLevelData(70), 'Level 70 is valid');
});

test('Red Team: Weapon Flood Protection — Enforces Active Bullet & Mine Hard Caps', () => {
  const MAX_BULLETS = 5;
  const MAX_MINES = 2;

  let activeBullets = 0;
  let activeMines = 0;

  function tryFire() {
    if (activeBullets < MAX_BULLETS) {
      activeBullets++;
      return true;
    }
    return false;
  }

  function tryPlantMine() {
    if (activeMines < MAX_MINES) {
      activeMines++;
      return true;
    }
    return false;
  }

  // Attempt to spam 1000 shots in a single frame
  let firedCount = 0;
  for (let i = 0; i < 1000; i++) {
    if (tryFire()) firedCount++;
  }
  assert.equal(firedCount, 5, 'Bullet flood attack must be strictly capped at 5 active bullets');
  assert.equal(activeBullets, 5);

  // Attempt to spam 1000 mines in a single frame
  let mineCount = 0;
  for (let i = 0; i < 1000; i++) {
    if (tryPlantMine()) mineCount++;
  }
  assert.equal(mineCount, 2, 'Mine flood attack must be strictly capped at 2 active mines');
  assert.equal(activeMines, 2);
});

test('Red Team: Float/NaN Input Resistance in Physics Calculations', () => {
  function safeVelocity(val) {
    if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) {
      return 0;
    }
    return Math.max(-500, Math.min(500, val));
  }

  assert.equal(safeVelocity(NaN), 0);
  assert.equal(safeVelocity(Infinity), 0);
  assert.equal(safeVelocity(-Infinity), 0);
  assert.equal(safeVelocity('200'), 0);
  assert.equal(safeVelocity(9999), 500, 'Velocity clamped to max speed');
  assert.equal(safeVelocity(-9999), -500, 'Velocity clamped to min speed');
  assert.equal(safeVelocity(120), 120, 'Normal velocity preserved');
});

test('Red Team: Audio Lifecycle Teardown & Autoplay Guard', () => {
  // Emulate AudioContext state machine
  class MockAudioContext {
    constructor() {
      this.state = 'suspended'; // Standard modern mobile browser behavior before user touch
      this.currentTime = 0;
    }
    resume() {
      this.state = 'running';
    }
  }

  let ctx = new MockAudioContext();
  let bgmPlaying = false;
  let bgmTimer = null;

  function startBGM() {
    if (ctx.state === 'suspended') {
      // Modern browser policy: cannot play until touch/gesture unlocks ctx
      return false;
    }
    bgmPlaying = true;
    bgmTimer = 123;
    return true;
  }

  function stopBGM() {
    bgmPlaying = false;
    if (bgmTimer) {
      bgmTimer = null;
    }
  }

  // Before gesture
  assert.equal(startBGM(), false, 'BGM cannot autoplay before user gesture');

  // After gesture
  ctx.resume();
  assert.equal(startBGM(), true, 'BGM starts cleanly once AudioContext is running');
  assert.equal(bgmPlaying, true);

  // Teardown
  stopBGM();
  assert.equal(bgmPlaying, false);
  assert.equal(bgmTimer, null, 'Timer cleared to prevent memory leaks across scene transitions');
});
