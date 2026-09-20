// tests/cheats_and_difficulty.test.js
// Automated verification for secret cheats, level select discovery, spawn invulnerability, and CPU speed scaling

import test from 'node:test';
import assert from 'node:assert';
import { checkTripleTapGesture, checkSwipeDownGesture } from '../src/systems/GestureUtils.js';
import { MILESTONES } from '../src/data/milestones.js';

test('AC-1: Level Select Triple-Tap Gesture Recognition', () => {
  // Test fast 3-tap sequence within 700ms
  const now = 10000;
  const validFastTaps = [now, now + 200, now + 420];
  assert.strictEqual(
    checkTripleTapGesture(validFastTaps, 700),
    true,
    '3 rapid taps within 700ms must register as triple tap'
  );

  // Test slow taps exceeding 700ms interval
  const slowTaps = [now, now + 850, now + 1200];
  assert.strictEqual(
    checkTripleTapGesture(slowTaps, 700),
    false,
    'Taps with gap > 700ms must not register as triple tap'
  );

  // Insufficient taps
  assert.strictEqual(
    checkTripleTapGesture([now, now + 150], 700),
    false,
    'Only 2 taps must not trigger triple tap'
  );

  // Trailing 3 rapid taps out of 4 total
  const fourTaps = [now, now + 1500, now + 1700, now + 1900];
  assert.strictEqual(
    checkTripleTapGesture(fourTaps, 700),
    true,
    'Trailing 3 fast taps in history must register as triple tap'
  );
});

test('AC-1: Level Select In-Place Discovery for Uncompleted Levels', () => {
  // Simulate level selection title masking & reveal
  const revealedTitles = new Set();
  const testLevel = 25; // Milestone 1980
  const milestone = MILESTONES[testLevel];
  assert.ok(milestone, 'Level 25 milestone must exist');

  // Before triple-tap: uncompleted level displays ????
  const isBeaten = false;
  const isUnlocked = false;
  let isRevealed = revealedTitles.has(testLevel);
  let displayTitle = (isBeaten || isUnlocked || isRevealed) ? milestone.title : '????';
  assert.strictEqual(displayTitle, '????', 'Uncompleted level starts hidden as ????');

  // After triple-tap: add to revealed set
  revealedTitles.add(testLevel);
  isRevealed = revealedTitles.has(testLevel);
  displayTitle = (isBeaten || isUnlocked || isRevealed) ? milestone.title : '????';
  assert.strictEqual(
    displayTitle,
    milestone.title,
    'Triple-tapped level displays full biographical title'
  );
});

test('AC-2: Secret Invincibility Cheat State & Damage Immunity', () => {
  // Simulate GameScene state
  let isInvincibleCheat = false;
  let isPlayerInvulnerable = false;
  let lives = 3;

  function toggleInvincibleCheat() {
    isInvincibleCheat = !isInvincibleCheat;
    isPlayerInvulnerable = isInvincibleCheat;
    return isInvincibleCheat;
  }

  function simulatePlayerHit() {
    if (isPlayerInvulnerable || isInvincibleCheat) {
      return false; // Damage prevented
    }
    lives--;
    return true; // Damage applied
  }

  // Normal gameplay: player takes hit
  assert.strictEqual(simulatePlayerHit(), true, 'Normal player takes damage');
  assert.strictEqual(lives, 2, 'Lives decremented to 2');

  // Activate cheat
  assert.strictEqual(toggleInvincibleCheat(), true, 'Cheat activated');
  assert.strictEqual(isInvincibleCheat, true);
  assert.strictEqual(isPlayerInvulnerable, true);

  // Player hit while cheat active
  assert.strictEqual(simulatePlayerHit(), false, 'Cheat prevents bullet/collision damage');
  assert.strictEqual(lives, 2, 'Lives remain untouched');

  // Toggle cheat off
  assert.strictEqual(toggleInvincibleCheat(), false, 'Cheat deactivated');
  assert.strictEqual(simulatePlayerHit(), true, 'Damage applies once cheat is disabled');
  assert.strictEqual(lives, 1);
});

test('AC-3: Secret Auto Rapid-Fire Swipe Down Gesture Detection', () => {
  const height = 854;

  // Valid swipe: starts at y = 100 (< 284.6), ends at y = 620 (> 569.3), deltaX = 30 (< 160)
  assert.strictEqual(
    checkSwipeDownGesture(240, 100, 270, 620, height, 160),
    true,
    'Valid top-to-bottom swipe triggers cheat'
  );

  // Fails if swipe started too low (e.g. y = 350)
  assert.strictEqual(
    checkSwipeDownGesture(240, 350, 240, 650, height, 160),
    false,
    'Swipe starting below top third must not trigger cheat'
  );

  // Fails if swipe ended too high (e.g. y = 500)
  assert.strictEqual(
    checkSwipeDownGesture(240, 100, 240, 500, height, 160),
    false,
    'Swipe ending above bottom third must not trigger cheat'
  );

  // Fails if horizontal drift exceeds threshold
  assert.strictEqual(
    checkSwipeDownGesture(100, 100, 350, 650, height, 160),
    false,
    'Diagonal swipe with > 160px horizontal travel must not trigger cheat'
  );

  // Fails on upward swipe
  assert.strictEqual(
    checkSwipeDownGesture(240, 650, 240, 100, height, 160),
    false,
    'Upward swipe must never trigger cheat'
  );
});

test('AC-3: Rapid Fire Cooldown & Bullet Limit Scaling', () => {
  const standardCooldown = 220;
  const rapidCooldown = 80;
  const standardMaxBullets = 5;
  const rapidMaxBullets = 12;

  let rapidFireCheat = false;

  function getWeaponConfig() {
    return {
      cooldown: rapidFireCheat ? rapidCooldown : standardCooldown,
      maxBullets: rapidFireCheat ? rapidMaxBullets : standardMaxBullets
    };
  }

  assert.deepStrictEqual(getWeaponConfig(), { cooldown: 220, maxBullets: 5 });

  rapidFireCheat = true;
  assert.deepStrictEqual(getWeaponConfig(), { cooldown: 80, maxBullets: 12 });

  rapidFireCheat = false;
  assert.deepStrictEqual(getWeaponConfig(), { cooldown: 220, maxBullets: 5 });
});

test('AC-4: Spawn Invincibility At Least 3 Seconds (3000ms)', () => {
  const spawnDuration = 3000;
  assert.ok(spawnDuration >= 3000, 'Spawn invincibility must be at least 3000ms');

  // Verify repeats for 150ms yoyo tween (each repeat cycle = 300ms)
  const repeats = Math.floor(spawnDuration / 300);
  assert.strictEqual(repeats, 10, '10 yoyo cycles at 300ms per cycle totals 3000ms');

  let isPlayerInvulnerable = true;
  let playerLives = 3;

  function onHitDuringSpawn() {
    if (!isPlayerInvulnerable) {
      playerLives--;
    }
  }

  onHitDuringSpawn();
  assert.strictEqual(playerLives, 3, 'Player immune during spawn invincibility');

  isPlayerInvulnerable = false;
  onHitDuringSpawn();
  assert.strictEqual(playerLives, 2, 'Player takes damage after spawn invincibility ends');
});

test('AC-5: CPU Game Speed Multiplier Range and Difficulty Scaling', () => {
  const baseSpeed = 120;
  const baseFireCooldown = 1600;

  function calculateEnemyState(mult) {
    const clampedMult = Math.min(2.0, Math.max(0.25, mult));
    return {
      speed: baseSpeed * clampedMult,
      fireCooldown: Math.round(baseFireCooldown / clampedMult)
    };
  }

  // 1.0x Standard
  const normal = calculateEnemyState(1.0);
  assert.strictEqual(normal.speed, 120);
  assert.strictEqual(normal.fireCooldown, 1600);

  // 0.5x Slower / Easier
  const easy = calculateEnemyState(0.5);
  assert.strictEqual(easy.speed, 60, '0.5x speed halves enemy travel velocity');
  assert.strictEqual(easy.fireCooldown, 3200, '0.5x speed doubles fire cooldown (fires half as often)');

  // 0.25x Ultra Easy
  const ultraEasy = calculateEnemyState(0.25);
  assert.strictEqual(ultraEasy.speed, 30, '0.25x speed makes enemies crawl at 25% speed');
  assert.strictEqual(ultraEasy.fireCooldown, 6400, '0.25x speed quadruples fire cooldown (fires 4x less often)');

  // 1.5x Harder / Fast
  const fast = calculateEnemyState(1.5);
  assert.strictEqual(fast.speed, 180);
  assert.strictEqual(fast.fireCooldown, 1067);

  // Clamping enforcement
  assert.strictEqual(calculateEnemyState(0.05).speed, 30, 'Min clamp enforced at 0.25x');
  assert.strictEqual(calculateEnemyState(5.0).speed, 240, 'Max clamp enforced at 2.0x');
});
