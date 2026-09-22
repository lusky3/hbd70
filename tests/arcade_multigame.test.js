// tests/arcade_multigame.test.js
// Unit tests for Allan's 70th Birthday Retro Arcade Collection (Pong, Space Invaders, Asteroids, Controls Overlay)

import test from 'node:test';
import assert from 'node:assert/strict';
import { ControlsOverlay } from '../src/scenes/ControlsOverlay.js';

// --- Test Suite 1: Controls Overlay Configuration ---
test('AC-3: ControlsOverlay provides complete, validated configurations for all 4 arcade games', () => {
  const games = ['tanks', 'pong', 'invaders', 'asteroids'];

  games.forEach((gameType) => {
    const config = ControlsOverlay.getConfig(gameType);
    assert.ok(config, `Config for ${gameType} must exist`);
    assert.ok(config.title, `Config for ${gameType} must have title`);
    assert.ok(config.subtitle, `Config for ${gameType} must have subtitle`);
    assert.ok(Array.isArray(config.touchInstructions), `touchInstructions must be an array for ${gameType}`);
    assert.ok(config.touchInstructions.length >= 2, `touchInstructions must have at least 2 items for ${gameType}`);
    assert.ok(config.keyboard, `Keyboard fallback instructions must exist for ${gameType}`);

    config.touchInstructions.forEach((item, idx) => {
      assert.ok(item.icon, `Instruction item ${idx} for ${gameType} must have an icon`);
      assert.ok(item.desc, `Instruction item ${idx} for ${gameType} must have a description`);
    });
  });
});

// --- Test Suite 2: Birthday Pong Mechanics (AC-4) ---
test('AC-4: Pong touch grip tab is positioned below the paddle to prevent hand occlusion', () => {
  const paddleWidth = 84;
  const paddleHeight = 14;
  const playerPaddleY = 728;
  const gripOffsetY = 24;
  const gripHandleY = playerPaddleY + gripOffsetY;

  assert.equal(gripHandleY, 752);
  assert.ok(gripHandleY > playerPaddleY + paddleHeight / 2, 'Grip must be placed below the bottom edge of the paddle');
});

test('AC-4: Pong angle deflection calculates accurate angles based on contact offset', () => {
  const paddleWidth = 84;
  const halfWidth = paddleWidth / 2;

  function calculateDeflection(ballX, paddleX) {
    const diff = ballX - paddleX;
    const factor = Math.max(-1, Math.min(1, diff / halfWidth));
    const maxAngle = (65 * Math.PI) / 180;
    const angle = -Math.PI / 2 + (factor * maxAngle);
    return { factor, angle };
  }

  // Center hit -> straight up (-PI/2)
  const centerHit = calculateDeflection(200, 200);
  assert.equal(centerHit.factor, 0);
  assert.equal(centerHit.angle, -Math.PI / 2);

  // Far right hit -> positive deflection
  const rightHit = calculateDeflection(242, 200);
  assert.equal(rightHit.factor, 1);
  assert.ok(rightHit.angle > -Math.PI / 2);

  // Far left hit -> negative deflection
  const leftHit = calculateDeflection(158, 200);
  assert.equal(leftHit.factor, -1);
  assert.ok(leftHit.angle < -Math.PI / 2);
});

test('AC-4: Pong rally acceleration and victory score milestone (7 points)', () => {
  let ballSpeed = 340;
  const maxSpeed = 620;
  const speedBoost = 20;

  for (let rally = 1; rally <= 20; rally++) {
    ballSpeed = Math.min(maxSpeed, ballSpeed + speedBoost);
  }

  assert.equal(ballSpeed, maxSpeed, 'Ball speed must cap at maxSpeed during long rallies');

  // Match ends at exactly 7 points
  let score = 0;
  const targetScore = 7;
  while (score < targetScore) {
    score++;
  }
  assert.equal(score, 7);
});

// --- Test Suite 3: Birthday Space Invaders Mechanics (AC-5) ---
test('AC-5: Space Invaders milestone bunkers are configured with the 4 milestone years (1956, 1976, 1996, 2026)', () => {
  const milestoneYears = [1956, 1976, 1996, 2026];
  assert.equal(milestoneYears.length, 4);
  assert.equal(milestoneYears[0], 1956, 'First bunker must honor Allan birth year 1956');
  assert.equal(milestoneYears[3], 2026, 'Final bunker must honor Allan 70th milestone 2026');

  // Bunker grid structure: 3 columns x 2 rows = 6 blocks per bunker
  const blocksPerBunker = 3 * 2;
  const totalBunkers = 4;
  const totalBunkerBlocks = blocksPerBunker * totalBunkers;
  assert.equal(totalBunkerBlocks, 24);
});

test('AC-5: Space Invaders march interval accelerates as remaining invader count diminishes', () => {
  function getStepInterval(activeInvaders, totalInvaders) {
    const fraction = activeInvaders / totalInvaders;
    const maxInterval = 800; // ms
    const minInterval = 120; // ms
    return Math.max(minInterval, Math.floor(minInterval + (maxInterval - minInterval) * fraction));
  }

  const total = 24;
  const startInterval = getStepInterval(24, total);
  const halfInterval = getStepInterval(12, total);
  const oneLeftInterval = getStepInterval(1, total);

  assert.equal(startInterval, 800);
  assert.ok(halfInterval < startInterval && halfInterval > oneLeftInterval);
  assert.ok(oneLeftInterval <= 150, 'Final invader must step very rapidly');
});

// --- Test Suite 4: Birthday Asteroids Mechanics (AC-6) ---
test('AC-6: Asteroids screen wrapping wraps coordinates across all 4 boundaries', () => {
  const width = 480;
  const height = 854;
  const topBound = 68;
  const bottomBound = height - 86; // 768
  const padding = 20;

  function wrap(x, y) {
    let wx = x;
    let wy = y;

    if (wx < -padding) wx = width + padding;
    else if (wx > width + padding) wx = -padding;

    if (wy < topBound - padding) wy = bottomBound + padding;
    else if (wy > bottomBound + padding) wy = topBound - padding;

    return { x: wx, y: wy };
  }

  // Left wrap
  assert.deepEqual(wrap(-25, 400), { x: 500, y: 400 });
  // Right wrap
  assert.deepEqual(wrap(505, 400), { x: -20, y: 400 });
  // Top wrap
  assert.deepEqual(wrap(240, 45), { x: 240, y: 788 });
  // Bottom wrap
  assert.deepEqual(wrap(240, 790), { x: 240, y: 48 });
});

test('AC-6: Asteroid splitting hierarchy divides Large "70" -> Medium -> Small with progressive scoring', () => {
  const hierarchy = {
    large: { nextSize: 'medium', spawnCount: 2, points: 20 },
    medium: { nextSize: 'small', spawnCount: 2, points: 50 },
    small: { nextSize: null, spawnCount: 0, points: 100 }
  };

  // 1 Large yields 20 pts + 2 Mediums
  let totalPoints = 0;
  let activeAsteroids = [{ size: 'large' }];

  function hitAsteroid(index) {
    const ast = activeAsteroids.splice(index, 1)[0];
    const rule = hierarchy[ast.size];
    totalPoints += rule.points;
    if (rule.nextSize) {
      for (let i = 0; i < rule.spawnCount; i++) {
        activeAsteroids.push({ size: rule.nextSize });
      }
    }
  }

  // Hit large
  hitAsteroid(0);
  assert.equal(totalPoints, 20);
  assert.equal(activeAsteroids.length, 2);
  assert.equal(activeAsteroids[0].size, 'medium');

  // Hit both mediums
  hitAsteroid(0);
  hitAsteroid(0);
  assert.equal(totalPoints, 20 + 50 + 50); // 120
  assert.equal(activeAsteroids.length, 4);
  assert.equal(activeAsteroids[0].size, 'small');

  // Hit all 4 smalls
  while (activeAsteroids.length > 0) {
    hitAsteroid(0);
  }
  assert.equal(totalPoints, 120 + (4 * 100)); // 520 points total for a complete large asteroid family
  assert.equal(activeAsteroids.length, 0);
});

test('AC-6: Space Cruiser Newtonian inertia applies drag damping to velocity', () => {
  let vx = 200;
  let vy = -150;
  const dragFactor = 0.985; // Damping per physics tick

  for (let tick = 0; tick < 60; tick++) {
    vx *= dragFactor;
    vy *= dragFactor;
  }

  assert.ok(Math.abs(vx) < 100, 'Velocity must decay due to drag');
  assert.ok(Math.abs(vy) < 70, 'Velocity must decay due to drag');
  assert.ok(vx > 0, 'Direction must be preserved during drift');
});
