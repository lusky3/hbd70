// tests/pool.test.js
// Unit tests for Allan's 70th Birthday Retro Pool (Pocket Billiards) Game:
// Physics Engine, Game Rules & Subtypes, AI Controller, Persistence, and Network Contracts.

import test from 'node:test';
import assert from 'node:assert/strict';

import { PoolPhysics, TABLE_CONFIG } from '../src/systems/PoolPhysics.js';
import { PoolRules, POOL_SUBTYPES } from '../src/systems/PoolRules.js';
import { PoolAI, AI_DIFFICULTIES } from '../src/systems/PoolAI.js';
import { storage } from '../src/systems/Storage.js';
import { HOST_ONLY_EVENTS } from '../src/systems/NetworkManager.js';
import { VALID_GAMES, SCORE_LIMITS } from '../worker/index.js';

test('AC-1: PoolPhysics Engine Setup and Racking Mechanics', (t) => {
  const physics = new PoolPhysics();

  // Test 8-Ball Rack
  physics.setupRack(POOL_SUBTYPES.EIGHT_BALL);
  assert.equal(physics.balls.length, 16, '8-Ball must rack exactly 16 balls (1 cue + 15 object balls)');
  assert.ok(physics.cueBall, 'Cue ball must be initialized');
  assert.equal(physics.cueBall.isCue, true, 'Cue ball flag must be true');
  assert.ok(physics.eightBall, 'Ball #8 must exist in rack');
  assert.equal(physics.eightBall.isEight, true, 'Ball #8 must have isEight flag');
  assert.equal(physics.eightBall.id, 8, 'Eight ball must have id 8');

  // Test 9-Ball Rack
  physics.setupRack(POOL_SUBTYPES.NINE_BALL);
  assert.equal(physics.balls.length, 10, '9-Ball must rack exactly 10 balls (1 cue + 9 object balls)');
  const apexBall = physics.balls.find(b => b.id === 1);
  const nineBall = physics.balls.find(b => b.id === 9);
  assert.ok(apexBall, 'Ball #1 must exist at rack apex');
  assert.ok(nineBall, 'Ball #9 must exist at rack center');
  assert.equal(nineBall.isNine, true, 'Ball #9 must have isNine flag');

  // Test Straight Pool Rack
  physics.setupRack(POOL_SUBTYPES.STRAIGHT);
  assert.equal(physics.balls.length, 16, 'Straight pool must rack 16 balls');

  // Test Speed Pool Rack
  physics.setupRack(POOL_SUBTYPES.SPEED);
  assert.equal(physics.balls.length, 16, 'Speed pool must rack 16 balls');
});

test('AC-1: PoolPhysics Circle-Circle Elastic Collision & Cushion Restitution', (t) => {
  const physics = new PoolPhysics();

  // Add cue ball (id 0) and target ball (id 1)
  const cue = physics.addBall(0, 100, 200);
  const target = physics.addBall(1, 100 + TABLE_CONFIG.ballRadius * 1.5, 200);

  cue.vx = 200;
  cue.vy = 0;
  target.vx = 0;
  target.vy = 0;

  // Step physics
  physics.step(0.016);

  // Elastic head-on collision must transfer forward momentum from cue to target
  assert.ok(target.vx > 0, 'Target ball must receive positive forward momentum');
  assert.ok(cue.vx < 200, 'Cue ball must lose forward velocity upon collision');
  assert.ok(physics.events.ballCollisions.length > 0, 'Ball collision event must be logged');

  // Test Cushion Reflection
  const cushionBall = physics.addBall(2, TABLE_CONFIG.feltX + 5, 200);
  cushionBall.vx = -150;
  cushionBall.vy = 50;
  physics.events.cushionHits = [];
  physics.step(0.016);

  assert.ok(cushionBall.vx > 0, 'Ball bouncing off left cushion must reverse X velocity');
  assert.ok(physics.events.cushionHits.length > 0, 'Cushion hit event must be logged');
});

test('AC-1: PoolPhysics Pocket Capture & Ball-in-Hand', (t) => {
  const physics = new PoolPhysics();
  physics.setupRack(POOL_SUBTYPES.EIGHT_BALL);

  const pocket = TABLE_CONFIG.pockets[0];
  const ball = physics.balls[1];
  ball.x = pocket.x;
  ball.y = pocket.y;
  ball.vx = 10;
  ball.vy = 10;

  physics.step(0.016);

  assert.equal(ball.inPocket, true, 'Ball positioned at pocket center must be captured into pocket');
  assert.equal(ball.vx, 0, 'Potted ball velocity must be zeroed');
  assert.equal(ball.vy, 0, 'Potted ball velocity must be zeroed');

  // Test Ball-in-Hand Placement
  physics.placeCueBall(200, 300);
  assert.equal(physics.cueBall.inPocket, false, 'Cue ball placed via ball-in-hand must not be in pocket');
  assert.equal(physics.cueBall.x, 200, 'Cue ball X must match ball-in-hand coordinates');
  assert.equal(physics.cueBall.y, 300, 'Cue ball Y must match ball-in-hand coordinates');
});

test('AC-2: 8-Ball Game Rules - Group Assignment, Legal Hits & 8-Ball Win/Loss', (t) => {
  const rules = new PoolRules(POOL_SUBTYPES.EIGHT_BALL, false);
  const physics = new PoolPhysics();
  physics.setupRack(POOL_SUBTYPES.EIGHT_BALL);

  // Initial state: open table
  assert.equal(rules.groups[1], null, 'Initial player 1 group must be open');
  assert.equal(rules.groups[2], null, 'Initial player 2 group must be open');

  // Pot solid ball #3 on legal shot -> assigns solids to active player
  const ball3 = physics.balls.find(b => b.id === 3);
  physics.events.firstContact = ball3;
  physics.events.potted = [ball3];
  physics.events.cushionCountAfterContact = 1;
  const result = rules.evaluateShot(physics);

  assert.equal(result.isFoul, false, 'Clean pot of solid on open table is legal');
  assert.equal(rules.groups[1], 'solids', 'Player 1 must be assigned solids');
  assert.equal(rules.groups[2], 'stripes', 'Player 2 must be assigned stripes');
  assert.equal(rules.activePlayer, 1, 'Player 1 keeps turn on legal pot');

  // Scratch / cue pot foul
  physics.cueBall.inPocket = true;
  physics.events.firstContact = ball3;
  physics.events.potted = [physics.cueBall];
  const foulResult = rules.evaluateShot(physics);
  assert.equal(foulResult.isFoul, true, 'Scratch must be evaluated as foul');
  assert.equal(rules.ballInHand, true, 'Foul awards ball-in-hand');
  assert.equal(rules.activePlayer, 2, 'Foul passes turn to opponent');

  // Scratch on 8-ball pot results in instant loss
  physics.cueBall.inPocket = true;
  const eight = physics.eightBall;
  physics.events.firstContact = eight;
  physics.events.potted = [physics.cueBall, eight];
  rules.evaluateShot(physics);
  assert.equal(rules.isGameOver, true, 'Scratch while potting 8-ball must end game');
  assert.equal(rules.winner, 1, 'Opponent wins when current player scratches on 8-ball');
});

test('AC-2: 9-Ball Game Rules - Lowest Ball Rotation & 9-Ball Win', (t) => {
  const rules = new PoolRules(POOL_SUBTYPES.NINE_BALL, false);
  const physics = new PoolPhysics();
  physics.setupRack(POOL_SUBTYPES.NINE_BALL);

  // Lowest ball on table initially is 1
  const lowest = rules.getLowestBall(physics);
  assert.equal(lowest.id, 1, 'Initial lowest ball in 9-ball must be 1');

  // Hitting ball 2 first instead of 1 is a foul
  const ball1 = physics.balls.find(b => b.id === 1);
  const ball2 = physics.balls.find(b => b.id === 2);
  const ball9 = physics.balls.find(b => b.id === 9);

  physics.events.firstContact = ball2;
  physics.events.potted = [];
  physics.events.cushionCountAfterContact = 1;
  physics.cueBall.inPocket = false;
  const foulResult = rules.evaluateShot(physics);
  assert.equal(foulResult.isFoul, true, 'Hitting higher numbered ball before lowest ball is a foul');
  assert.equal(rules.ballInHand, true, 'Foul gives ball-in-hand');

  // Hitting lowest ball 1 and potting 9-ball (legal combo win)
  physics.events.firstContact = ball1;
  physics.events.potted = [ball9];
  physics.events.cushionCountAfterContact = 1;
  physics.cueBall.inPocket = false;
  const winResult = rules.evaluateShot(physics);
  assert.equal(winResult.isFoul, false, 'Legal combo on 9-ball is valid');
  assert.equal(rules.isGameOver, true, 'Potting 9-ball legally wins the game');
  assert.equal(rules.winner, 2, 'Active player wins on legal 9-ball pot');
});

test('AC-2: Straight Pool Rules & Continuous 14-Ball Re-Rack', (t) => {
  const rules = new PoolRules(POOL_SUBTYPES.STRAIGHT, false);
  const physics = new PoolPhysics();
  physics.setupRack(POOL_SUBTYPES.STRAIGHT);

  // Potting 3 legal balls adds 3 points to active player
  const b1 = physics.balls.find(b => b.id === 1);
  const b2 = physics.balls.find(b => b.id === 2);
  const b3 = physics.balls.find(b => b.id === 3);

  physics.events.firstContact = b1;
  physics.events.potted = [b1, b2, b3];
  physics.events.cushionCountAfterContact = 1;
  physics.cueBall.inPocket = false;

  const result = rules.evaluateShot(physics);
  assert.equal(result.isFoul, false, 'Legal pots in straight pool are valid');
  assert.equal(rules.scores[1], 3, 'Straight pool gives 1 point per legal potted ball');

  // Test 14-Ball re-rack trigger
  // Mark 14 object balls as potted
  for (let i = 1; i <= 14; i++) {
    const b = physics.balls.find(ball => ball.id === i);
    if (b) b.inPocket = true;
  }
  const remaining = physics.activeObjectBalls;
  assert.equal(remaining.length, 1, 'Exactly 1 object ball must remain on table before 14.1 re-rack');

  physics.reRackStraightPool();
  const activeBalls = physics.activeObjectBalls;
  assert.equal(activeBalls.length, 15, 'All 15 object balls must be back on table after re-rack');
});

test('AC-2: Speed Pool Rules - Countdown Timer & Bonus Mechanics', (t) => {
  const rules = new PoolRules(POOL_SUBTYPES.SPEED, false);
  const physics = new PoolPhysics();
  physics.setupRack(POOL_SUBTYPES.SPEED);

  assert.equal(rules.speedTimer, 90, 'Speed pool initial countdown timer must be 90 seconds');

  // Update timer by 5 seconds
  rules.update(5.0);
  assert.equal(Math.round(rules.speedTimer), 85, 'Timer must decrement during update');

  // Legal pot gives +10s time bonus and base points
  const b1 = physics.balls.find(b => b.id === 1);
  physics.events.firstContact = b1;
  physics.events.potted = [b1];
  physics.events.cushionCountAfterContact = 1;
  physics.cueBall.inPocket = false;

  const prevScore = rules.scores[1];
  const prevTime = rules.speedTimer;
  rules.evaluateShot(physics);

  assert.ok(rules.speedTimer > prevTime, 'Potting a ball in Speed Pool awards +10s time bonus');
  assert.ok(rules.scores[1] > prevScore, 'Potting a ball in Speed Pool awards points');
});

test('AC-3: PoolAI Controller - Difficulty Calibrations & Shot Selection', (t) => {
  const noviceAI = new PoolAI(AI_DIFFICULTIES.NOVICE);
  const masterAI = new PoolAI(AI_DIFFICULTIES.MASTER);
  const legendAI = new PoolAI(AI_DIFFICULTIES.LEGEND);

  assert.ok(noviceAI.config.aimNoiseDeg > masterAI.config.aimNoiseDeg, 'Novice AI must have larger aim variance than Master AI');
  assert.ok(masterAI.config.aimNoiseDeg > legendAI.config.aimNoiseDeg, 'Master AI must have larger aim variance than Allan Legend');
  assert.equal(legendAI.config.aimNoiseDeg, 0.2, 'Allan Legend must have razor-sharp 0.2 deg aim precision');

  const physics = new PoolPhysics();
  physics.setupRack(POOL_SUBTYPES.EIGHT_BALL);
  const rules = new PoolRules(POOL_SUBTYPES.EIGHT_BALL, false);

  const shot = masterAI.computeShot(physics, rules);
  assert.ok(shot, 'AI must compute a valid shot');
  assert.ok(typeof shot.angle === 'number', 'Shot must specify aim angle');
  assert.ok(shot.power >= 0.2 && shot.power <= 1.0, 'Shot power must be in valid range');

  // Ball-in-hand placement
  const placement = masterAI.computeBallInHand(physics, rules);
  assert.ok(placement.x >= TABLE_CONFIG.feltX && placement.x <= TABLE_CONFIG.feltX + TABLE_CONFIG.feltW, 'AI ball placement X must be on felt');
  assert.ok(placement.y >= TABLE_CONFIG.feltY && placement.y <= TABLE_CONFIG.feltY + TABLE_CONFIG.feltH, 'AI ball placement Y must be on felt');
});

test('AC-4: Storage Persistence & Record Pool Score Contract', (t) => {
  const initialStats = storage.getArcadeStats();
  assert.ok(initialStats.pool, 'Storage must have pool stats structure');
  assert.ok(initialStats.pool.pool_8ball, 'Storage must track pool_8ball stats');
  assert.ok(initialStats.pool.pool_9ball, 'Storage must track pool_9ball stats');
  assert.ok(initialStats.pool.pool_straight, 'Storage must track pool_straight stats');
  assert.ok(initialStats.pool.pool_speed, 'Storage must track pool_speed stats');

  // Record a pool score
  storage.recordPoolScore({
    subtype: 'pool_8ball',
    won: true,
    score: 8500,
    detail: 'Legend Defeated'
  });

  const updatedStats = storage.getArcadeStats();
  assert.ok(updatedStats.pool.pool_8ball.wins >= 1, '8-Ball wins must increment on victory');
  assert.ok(updatedStats.pool.pool_8ball.highScore >= 8500, '8-Ball high score must be updated');
});

test('AC-5: Cloudflare Worker Schema & API Pool Leaderboard Integration', (t) => {
  assert.ok(VALID_GAMES.includes('pool'), 'Worker must accept pool game type');
  assert.ok(VALID_GAMES.includes('pool_8ball'), 'Worker must accept pool_8ball game type');
  assert.ok(VALID_GAMES.includes('pool_9ball'), 'Worker must accept pool_9ball game type');
  assert.ok(VALID_GAMES.includes('pool_straight'), 'Worker must accept pool_straight game type');
  assert.ok(VALID_GAMES.includes('pool_speed'), 'Worker must accept pool_speed game type');

  assert.ok(SCORE_LIMITS.pool_8ball, 'Worker must define score limits for pool_8ball');
  assert.ok(SCORE_LIMITS.pool_speed, 'Worker must define score limits for pool_speed');
});

test('AC-6: Network Security & Host-Authoritative Contracts for Pool', (t) => {
  assert.ok(HOST_ONLY_EVENTS.has('pool-match-over'), 'pool-match-over must be in HOST_ONLY_EVENTS');
  assert.ok(HOST_ONLY_EVENTS.has('pool-snapshot'), 'pool-snapshot must be in HOST_ONLY_EVENTS');
  assert.ok(HOST_ONLY_EVENTS.has('pool-turn-handoff'), 'pool-turn-handoff must be in HOST_ONLY_EVENTS');
  assert.ok(HOST_ONLY_EVENTS.has('pool-rematch'), 'pool-rematch must be in HOST_ONLY_EVENTS');
  assert.equal(HOST_ONLY_EVENTS.has('pool-client-shot'), false, 'Client shot must NOT be blocked by HOST_ONLY_EVENTS');
  assert.equal(HOST_ONLY_EVENTS.has('pool-client-ball-in-hand'), false, 'Client ball-in-hand must NOT be blocked by HOST_ONLY_EVENTS');
});

test('AC-6: Version 1.7.0 consistency across package.json, src/version.js, and CHANGELOG.md', async (t) => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { APP_VERSION } = await import('../src/version.js');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootDir = path.resolve(__dirname, '..');

  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  assert.equal(APP_VERSION, pkg.version);
  assert.ok(pkg.version >= '1.7.0');

  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  assert.ok(changelog.includes('## [1.7.0] - 2026-09-25'));
  assert.ok(changelog.includes("Allan's 70th Birthday Retro Pool (Pocket Billiards)"));
});
