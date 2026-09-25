// tests/session_resume.test.js
// Unit test suite for Per-Game Session Resume & Mid-Game Recovery

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { storage } from '../src/systems/Storage.js';
import { formatRelativeTime, GAME_META, ResumeSessionModalScene } from '../src/scenes/ResumeSessionModal.js';
import { PoolPhysics } from '../src/systems/PoolPhysics.js';
import { PoolRules, POOL_SUBTYPES } from '../src/systems/PoolRules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('AC-1: StorageManager handles isolated per-game session persistence & corruption recovery', () => {
  const games = ['tanks', 'pong', 'invaders', 'asteroids', 'pool'];
  games.forEach(g => storage.clearGameSession(g));

  for (const g of games) {
    assert.equal(storage.hasGameSession(g), false);
    assert.equal(storage.getGameSession(g), null);
  }

  // 1. Save and verify distinct states for all 5 games simultaneously
  storage.saveGameSession('tanks', { levelNum: 14, lives: 2 }, { levelNum: 14 });
  storage.saveGameSession('pong', { playerScore: 5, aiScore: 3 }, 'Pong match 5-3');
  storage.saveGameSession('invaders', { wave: 4, score: 3200 }, { wave: 4, score: 3200 });
  storage.saveGameSession('asteroids', { wave: 6, score: 5400 }, { wave: 6, score: 5400 });
  storage.saveGameSession('pool', { subtype: '8ball', scores: { 1: 3, 2: 1 } }, { subtype: '8ball' });

  for (const g of games) {
    assert.equal(storage.hasGameSession(g), true);
    const session = storage.getGameSession(g);
    assert.ok(session);
    assert.equal(session.gameId, g);
  }

  assert.equal(storage.getGameSession('tanks').state.levelNum, 14);
  assert.equal(storage.getGameSession('pong').summary, 'Pong match 5-3');
  assert.equal(storage.getGameSession('invaders').state.wave, 4);
  assert.equal(storage.getGameSession('asteroids').state.score, 5400);
  assert.equal(storage.getGameSession('pool').state.subtype, '8ball');

  // 2. Clear one game, others remain intact
  storage.clearGameSession('tanks');
  assert.equal(storage.hasGameSession('tanks'), false);
  assert.equal(storage.hasGameSession('pong'), true);
  assert.equal(storage.hasGameSession('invaders'), true);
  assert.equal(storage.hasGameSession('asteroids'), true);
  assert.equal(storage.hasGameSession('pool'), true);

  // 3. Test corruption recovery: corrupt JSON string fails soft, clears key, and returns null
  if (typeof window !== 'undefined' && window.localStorage) {
    const key = storage.getSessionKey('pong');
    window.localStorage.setItem(key, '{"invalid_json: true');
  } else {
    storage.memorySessions['pong'] = '{"invalid_json: true';
  }

  assert.equal(storage.getGameSession('pong'), null, 'Corrupted JSON must return null');
  assert.equal(storage.hasGameSession('pong'), false, 'Corrupted session must be cleared');

  // Cleanup remaining
  games.forEach(g => storage.clearGameSession(g));
});

test('AC-2: Relative time formatting produces human-readable intervals', () => {
  const now = Date.now();
  assert.equal(formatRelativeTime(now - 10 * 1000), 'just now');
  assert.equal(formatRelativeTime(now - 35 * 1000), 'just now');
  assert.equal(formatRelativeTime(now - 120 * 1000), '2m ago');
  assert.equal(formatRelativeTime(now - 15 * 60 * 1000), '15m ago');
  assert.equal(formatRelativeTime(now - 3 * 3600 * 1000), '3h ago');
  assert.equal(formatRelativeTime(now - 48 * 3600 * 1000), '2d ago');
  assert.equal(formatRelativeTime(null), 'recently');
});

test('AC-3: GAME_META defines valid metadata and target scenes for all 5 games', () => {
  const expectedGames = ['tanks', 'pong', 'invaders', 'asteroids', 'pool'];
  for (const gameId of expectedGames) {
    const meta = GAME_META[gameId];
    assert.ok(meta, `GAME_META must include ${gameId}`);
    assert.ok(meta.name, `${gameId} must have name`);
    assert.ok(meta.icon, `${gameId} must have icon`);
    assert.ok(meta.scene, `${gameId} must have target scene`);
  }
  assert.equal(GAME_META.tanks.scene, 'Game');
  assert.equal(GAME_META.pong.scene, 'Pong');
  assert.equal(GAME_META.invaders.scene, 'SpaceInvaders');
  assert.equal(GAME_META.asteroids.scene, 'Asteroids');
  assert.equal(GAME_META.pool.scene, 'Pool');
});

test('AC-4: PoolPhysics and PoolRules support snapshot capture and restoration', () => {
  const physics = new PoolPhysics();
  physics.setupRack(POOL_SUBTYPES.EIGHT_BALL);

  // Simulate ball movement
  physics.cueBall.x = 240;
  physics.cueBall.y = 500;
  physics.cueBall.vx = 15;
  physics.balls[1].inPocket = true;

  const snap = physics.getSnapshot();
  assert.ok(Array.isArray(snap));
  assert.equal(snap.length, 16);

  const newPhysics = new PoolPhysics();
  newPhysics.setupRack(POOL_SUBTYPES.EIGHT_BALL);
  newPhysics.loadSnapshot(snap);

  assert.equal(newPhysics.cueBall.x, 240);
  assert.equal(newPhysics.cueBall.y, 500);
  assert.equal(newPhysics.cueBall.vx, 15);
  assert.equal(newPhysics.balls[1].inPocket, true);

  // PoolRules Snapshot
  const rules = new PoolRules(POOL_SUBTYPES.EIGHT_BALL);
  rules.activePlayer = 2;
  rules.scores = { 1: 3, 2: 5 };
  rules.groups = { 1: 'solids', 2: 'stripes' };
  rules.ballInHand = true;

  const ruleSnap = rules.getSnapshot();
  assert.equal(ruleSnap.activePlayer, 2);
  assert.equal(ruleSnap.scores[2], 5);
  assert.equal(ruleSnap.groups[1], 'solids');

  const newRules = new PoolRules(POOL_SUBTYPES.EIGHT_BALL);
  newRules.loadSnapshot(ruleSnap);
  assert.equal(newRules.activePlayer, 2);
  assert.equal(newRules.scores[1], 3);
  assert.equal(newRules.scores[2], 5);
  assert.equal(newRules.groups[2], 'stripes');
  assert.equal(newRules.ballInHand, true);
});

test('AC-5: All 5 game scenes implement captureSessionState method and handle resumeSession', () => {
  const scenes = [
    { file: 'src/scenes/Game.js', name: 'GameScene', gameId: 'tanks' },
    { file: 'src/scenes/Pong.js', name: 'PongScene', gameId: 'pong' },
    { file: 'src/scenes/SpaceInvaders.js', name: 'SpaceInvadersScene', gameId: 'invaders' },
    { file: 'src/scenes/Asteroids.js', name: 'AsteroidsScene', gameId: 'asteroids' },
    { file: 'src/scenes/Pool.js', name: 'PoolScene', gameId: 'pool' }
  ];

  for (const item of scenes) {
    const filePath = path.join(rootDir, item.file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Verify captureSessionState definition
    assert.match(content, /captureSessionState\s*\(\s*\)/, `${item.name} must define captureSessionState()`);

    // Verify session save call
    assert.match(
      content,
      new RegExp(`storage\\.saveGameSession\\(['"]${item.gameId}['"]`),
      `${item.name} must call storage.saveGameSession('${item.gameId}')`
    );

    // Verify session clear call
    assert.match(
      content,
      new RegExp(`storage\\.clearGameSession\\(['"]${item.gameId}['"]`),
      `${item.name} must call storage.clearGameSession('${item.gameId}')`
    );

    // Verify resumeSession handling in init or create
    assert.match(content, /resumeSession/, `${item.name} must handle resumeSession`);
  }
});

test('AC-6: GameSelectScene defines launchOrResumeGame and renders resume badges', () => {
  const selectFile = path.join(rootDir, 'src/scenes/GameSelect.js');
  const content = fs.readFileSync(selectFile, 'utf8');

  assert.match(content, /launchOrResumeGame\s*\(/, 'GameSelectScene must define launchOrResumeGame');
  assert.match(content, /ResumeSessionModal/, 'GameSelectScene must reference ResumeSessionModal');
  assert.match(content, /hasGameSession\(/, 'GameSelectScene must check hasGameSession');
  assert.match(content, /RESUME ▶/, 'GameSelectScene must provide dynamic RESUME button label');
});

test('AC-7: main.js registers ResumeSessionModalScene and lifecycle auto-save listeners', () => {
  const mainFile = path.join(rootDir, 'src/main.js');
  const content = fs.readFileSync(mainFile, 'utf8');

  assert.match(content, /import\s*\{\s*ResumeSessionModalScene\s*\}\s*from\s*['"]\.\/scenes\/ResumeSessionModal\.js['"]/, 'main.js must import ResumeSessionModalScene');
  assert.match(content, /ResumeSessionModalScene/, 'main.js must register ResumeSessionModalScene in scene array');
  assert.match(content, /autoSaveCurrentSession/, 'main.js must define autoSaveCurrentSession');
  assert.match(content, /beforeunload/, 'main.js must attach beforeunload listener');
  assert.match(content, /pagehide/, 'main.js must attach pagehide listener');
  assert.match(content, /visibilitychange/, 'main.js must attach visibilitychange listener');
  assert.match(content, /document\.visibilityState\s*===\s*['"]hidden['"]/, 'main.js must check visibilityState hidden');
});
