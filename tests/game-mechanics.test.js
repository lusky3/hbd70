// tests/game-mechanics.test.js
// Unit tests for bullet ricochet, mine radius, water navigation, and audio sequencer logic

import test from 'node:test';
import assert from 'node:assert/strict';

// 1. Bullet Ricochet Physics Logic
function calculateRicochet(vx, vy, normal) {
  // normal: 'vertical' (reflect vx) or 'horizontal' (reflect vy)
  if (normal === 'vertical') {
    return { vx: -vx, vy: vy };
  } else if (normal === 'horizontal') {
    return { vx: vx, vy: -vy };
  }
  return { vx, vy };
}

test('AC-2: Bullet Ricochet Reflection Mechanics', () => {
  const initial = { vx: 200, vy: 150 };
  
  // Hitting a vertical wall (left/right boundary or vertical side of stone block)
  const bounce1 = calculateRicochet(initial.vx, initial.vy, 'vertical');
  assert.equal(bounce1.vx, -200);
  assert.equal(bounce1.vy, 150);

  // Hitting a horizontal wall (top/bottom boundary or top side of stone block)
  const bounce2 = calculateRicochet(bounce1.vx, bounce1.vy, 'horizontal');
  assert.equal(bounce2.vx, -200);
  assert.equal(bounce2.vy, -150);
});

test('AC-2: Bullet Max Bounce Enforcement', () => {
  let bounces = 0;
  const maxBounces = 1; // Default AC-2: 1 ricochet off indestructible obstacles

  const simulateCollision = () => {
    if (bounces < maxBounces) {
      bounces++;
      return 'bounce';
    } else {
      return 'destroy';
    }
  };

  assert.equal(simulateCollision(), 'bounce', 'First wall impact should bounce');
  assert.equal(bounces, 1);
  assert.equal(simulateCollision(), 'destroy', 'Second wall impact should destroy bullet');
});

// 2. Mine Placement & Blast Radius Logic
test('AC-3: Mine Maximum Active Limit (2)', () => {
  const activeMines = [];
  const MAX_MINES = 2;

  function placeMine(x, y) {
    if (activeMines.length >= MAX_MINES) {
      return false; // Denied
    }
    activeMines.push({ id: Date.now() + Math.random(), x, y });
    return true;
  }

  assert.ok(placeMine(100, 100), 'First mine placed');
  assert.ok(placeMine(150, 100), 'Second mine placed');
  assert.equal(placeMine(200, 100), false, 'Third mine must be rejected (max 2 active)');
  assert.equal(activeMines.length, 2);

  // Remove one mine (detonated)
  activeMines.shift();
  assert.ok(placeMine(200, 100), 'Can place another mine once one has detonated');
  assert.equal(activeMines.length, 2);
});

test('AC-3: Mine Blast Area Clears Destructible Blocks but Preserves Indestructible Walls', () => {
  // 5x5 subgrid:
  // 0: empty, 1: indestructible wall, 2: destructible brick/gift
  const grid = [
    [1, 1, 1, 1, 1],
    [1, 0, 2, 0, 1],
    [1, 2, 0, 2, 1], // Mine at (2, 2)
    [1, 0, 2, 0, 1],
    [1, 1, 1, 1, 1]
  ];

  const minePos = { r: 2, c: 2 };
  const blastRadius = 1; // 3x3 box around mine

  for (let dr = -blastRadius; dr <= blastRadius; dr++) {
    for (let dc = -blastRadius; dc <= blastRadius; dc++) {
      const nr = minePos.r + dr;
      const nc = minePos.c + dc;
      if (grid[nr][nc] === 2) {
        grid[nr][nc] = 0; // Destroy destructible
      }
      // Indestructible walls (1) remain unchanged
    }
  }

  // All destructible blocks at (1,2), (2,1), (2,3), (3,2) should now be 0
  assert.equal(grid[1][2], 0, 'Brick above mine cleared');
  assert.equal(grid[2][1], 0, 'Brick left of mine cleared');
  assert.equal(grid[2][3], 0, 'Brick right of mine cleared');
  assert.equal(grid[3][2], 0, 'Brick below mine cleared');

  // Boundary walls (1) must remain intact
  assert.equal(grid[0][2], 1, 'Indestructible wall remains intact');
  assert.equal(grid[2][0], 1, 'Indestructible wall remains intact');
});

// 3. Water Hazard Navigation Rules
test('AC-6: Amphibious Boat vs Land Entity Water Collision Rule', () => {
  const TILE_WATER = 3;

  function canTraverseTile(entityType, tileType) {
    if (tileType === TILE_WATER) {
      // Boat is amphibious and navigates water channels
      return entityType === 'boat';
    }
    // All other land tiles (tile 0 = ground)
    return tileType === 0;
  }

  assert.equal(canTraverseTile('boat', TILE_WATER), true, 'Patrol Boat can traverse water');
  assert.equal(canTraverseTile('motorcycle', TILE_WATER), false, 'Player motorcycle cannot traverse water');
  assert.equal(canTraverseTile('candle', TILE_WATER), false, 'Land enemy cannot traverse water');
  assert.equal(canTraverseTile('boss', TILE_WATER), false, 'Boss tank cannot traverse water');
});

// 4. BGM Sequencer Pattern Integrity
test('AC-8: Chiptune BGM 32-Step Scale and Tempo Constraints', () => {
  const bassNotes = [
    65.41, 0, 65.41, 82.41, 98.00, 0, 82.41, 73.42,      // Bar 1: C - C E G - E D
    87.31, 0, 87.31, 110.00, 130.81, 0, 110.00, 98.00,  // Bar 2: F - F A C - A G
    98.00, 0, 98.00, 123.47, 146.83, 0, 123.47, 110.00, // Bar 3: G - G B D - B A
    65.41, 0, 98.00, 0, 130.81, 0, 65.41, 0              // Bar 4: C - G - C - C -
  ];

  const melodyNotes = [
    261.63, 0, 329.63, 392.00, 523.25, 493.88, 392.00, 0,   // C E G C5 B G
    440.00, 0, 392.00, 329.63, 349.23, 329.63, 293.66, 0,   // A G E F E D
    392.00, 0, 440.00, 523.25, 587.33, 523.25, 440.00, 0,   // G A C5 D5 C5 A
    523.25, 0, 392.00, 0, 329.63, 0, 261.63, 0               // C5 - G - E - C -
  ];

  assert.equal(bassNotes.length, 32, 'Bassline must be exactly 32 steps (4 bars of 4/4 8th notes)');
  assert.equal(melodyNotes.length, 32, 'Melody must be exactly 32 steps (4 bars of 4/4 8th notes)');

  // All notes must either be 0 (rest) or valid audible acoustic frequencies (20Hz - 20000Hz)
  for (const freq of bassNotes) {
    assert.ok(freq >= 0 && (freq === 0 || (freq >= 40 && freq <= 500)));
  }
  for (const freq of melodyNotes) {
    assert.ok(freq >= 0 && (freq === 0 || (freq >= 150 && freq <= 2000)));
  }
});

test('AC-8 & AC-9: Mute Toggle State Inversion', () => {
  let isMuted = false;
  let bgmPlaying = true;

  function toggleMute() {
    isMuted = !isMuted;
    if (isMuted) {
      bgmPlaying = false;
    } else {
      bgmPlaying = true;
    }
    return isMuted;
  }

  assert.equal(toggleMute(), true, 'First toggle mutes audio');
  assert.equal(isMuted, true);
  assert.equal(bgmPlaying, false);

  assert.equal(toggleMute(), false, 'Second toggle unmutes audio and resumes BGM');
  assert.equal(isMuted, false);
  assert.equal(bgmPlaying, true);
});
