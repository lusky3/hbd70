// tests/retroactive_import.test.js
// Unit tests for retroactive score migration and button hitbox polish

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { storage } from '../src/systems/Storage.js';
import { leaderboardService } from '../src/systems/LeaderboardService.js';
import { APP_VERSION } from '../src/version.js';
import { RetroactiveImportModalScene, ALLOWED_CHARS } from '../src/scenes/RetroactiveImportModal.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('AC-2: Storage detects unmigrated local scores across all 4 games', () => {
  // Clear storage first
  storage.clearProgress();

  let unmigrated = storage.getUnmigratedLocalScores();
  assert.equal(unmigrated.length, 0, 'Should have 0 unmigrated scores initially');

  // Record Tanks progress (Level 12 beaten)
  storage.recordLevelBeaten(12);
  unmigrated = storage.getUnmigratedLocalScores();
  assert.equal(unmigrated.length, 1);
  assert.equal(unmigrated[0].gameId, 'tanks');
  assert.equal(unmigrated[0].score, 12000);
  assert.equal(unmigrated[0].detail, 'Level 12');

  // Record Pong rally
  storage.recordPongRally(15);
  unmigrated = storage.getUnmigratedLocalScores();
  assert.equal(unmigrated.length, 2);
  const pongEntry = unmigrated.find((e) => e.gameId === 'pong');
  assert.ok(pongEntry);
  assert.equal(pongEntry.score, 15);

  // Record Space Invaders score
  storage.recordInvadersScore({ score: 4500, wave: 3 });
  unmigrated = storage.getUnmigratedLocalScores();
  assert.equal(unmigrated.length, 3);
  const invEntry = unmigrated.find((e) => e.gameId === 'invaders');
  assert.ok(invEntry);
  assert.equal(invEntry.score, 4500);
  assert.equal(invEntry.detail, 'Wave 3');

  // Record Asteroids score
  storage.recordAsteroidsScore({ score: 8200, wave: 2 });
  unmigrated = storage.getUnmigratedLocalScores();
  assert.equal(unmigrated.length, 4);
  const astEntry = unmigrated.find((e) => e.gameId === 'asteroids');
  assert.ok(astEntry);
  assert.equal(astEntry.score, 8200);
  assert.equal(astEntry.detail, 'Wave 2');

  // Clean up
  storage.clearProgress();
});

test('AC-2: Migration completed and dismissed flags toggle accurately', () => {
  assert.equal(storage.isMigrationCompleted(), false);

  storage.markMigrationCompleted();
  assert.equal(storage.isMigrationCompleted(), true);

  assert.equal(storage.isMigrationDismissed(), false);
  storage.dismissMigration();
  assert.equal(storage.isMigrationDismissed(), true);
});

test('AC-3: LeaderboardService.submitBatchScores executes sequential score submissions', async () => {
  const scoresToSubmit = [
    { gameId: 'tanks', score: 10000, detail: 'Level 10' },
    { gameId: 'pong', score: 14, detail: '14 Rally' },
    { gameId: 'invaders', score: 3200, detail: 'Wave 2' }
  ];

  const results = await leaderboardService.submitBatchScores('AL ', scoresToSubmit);
  assert.equal(results.length, 3);
  assert.equal(results[0].gameId, 'tanks');
  assert.equal(results[0].initials, 'AL ');
  assert.equal(results[1].gameId, 'pong');
  assert.equal(results[2].gameId, 'invaders');
  assert.equal(leaderboardService.getPlayerInitials(), 'AL ');
});

test('AC-3: RetroactiveImportModalScene safely instantiates and defines allowed character set', () => {
  assert.ok(RetroactiveImportModalScene);
  const scene = new RetroactiveImportModalScene();
  assert.ok(scene);
  assert.equal(typeof ALLOWED_CHARS, 'string');
  assert.ok(ALLOWED_CHARS.includes('A'));
  assert.ok(ALLOWED_CHARS.includes('★'));
});

test('AC-5: Version consistency across package.json, src/version.js, and CHANGELOG.md', () => {
  // Check package.json
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  assert.equal(APP_VERSION, pkg.version);

  // Check CHANGELOG.md
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  assert.ok(changelog.includes(`## [${APP_VERSION}]`), `CHANGELOG.md must document version ${APP_VERSION}`);
  assert.ok(changelog.includes('Retroactive Local High Scores Migration'), 'CHANGELOG.md must describe retroactive scores migration');
  assert.ok(changelog.includes('Full Button Hitbox Fix'), 'CHANGELOG.md must describe button hitbox fix');
});
