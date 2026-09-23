// tests/player_profile.test.js
// Unit tests for Player Profile (Tag & Name), Leaderboard tooltip logic, and v1.3.0 release

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { storage } from '../src/systems/Storage.js';
import { leaderboardService } from '../src/systems/LeaderboardService.js';
import { InitialsEntryOverlayScene } from '../src/scenes/InitialsEntryOverlay.js';
import { LeaderboardModalScene } from '../src/scenes/LeaderboardModal.js';
import { APP_VERSION } from '../src/version.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('AC-1: StorageManager handles Player Profile (Tag & Name) Persistence', () => {
  // Initial default
  const defaultProf = storage.getPlayerProfile();
  assert.equal(typeof defaultProf.tag, 'string');
  assert.equal(typeof defaultProf.name, 'string');

  // Set profile
  const saved = storage.setPlayerProfile('ALL', 'Allan Lusk');
  assert.equal(saved.tag, 'ALL');
  assert.equal(saved.name, 'Allan Lusk');

  const loaded = storage.getPlayerProfile();
  assert.equal(loaded.tag, 'ALL');
  assert.equal(loaded.name, 'Allan Lusk');

  // Truncation rules
  const truncated = storage.setPlayerProfile('toolongtag', 'This name is way too long to fit in 24 chars limit');
  assert.equal(truncated.tag.length, 3);
  assert.ok(truncated.name.length <= 24);
});

test('AC-2 & AC-3: InitialsEntryOverlay supports Profile Mode and Submit Mode', () => {
  storage.setPlayerProfile('AL7', 'Allan 70th');

  // Profile mode
  const profileScene = new InitialsEntryOverlayScene();
  profileScene.init({ mode: 'profile', returnScene: 'LeaderboardModal' });
  assert.equal(profileScene.mode, 'profile');
  assert.equal(profileScene.initials.join(''), 'AL7');
  assert.equal(profileScene.fullName, 'Allan 70th');

  // Submit mode
  const submitScene = new InitialsEntryOverlayScene();
  submitScene.init({ mode: 'submit', gameId: 'pong', score: 14 });
  assert.equal(submitScene.mode, 'submit');
  assert.equal(submitScene.score, 14);
  assert.equal(submitScene.gameId, 'pong');
});

test('AC-3: LeaderboardModal defines Tooltip and Action Handlers', () => {
  const lbScene = new LeaderboardModalScene();
  assert.ok(typeof lbScene.showTooltip === 'function', 'showTooltip must be defined');
  assert.ok(typeof lbScene.hideTooltip === 'function', 'hideTooltip must be defined');

  // Test hideTooltip resilience when container is null/unmounted
  assert.doesNotThrow(() => lbScene.hideTooltip());
});

test('AC-6: Version 1.3.0 consistency across package.json, src/version.js, and CHANGELOG.md', () => {
  assert.equal(APP_VERSION, '1.3.0');

  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  assert.equal(pkg.version, '1.3.0');

  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  assert.ok(changelog.includes('## [1.3.0] - 2026-09-22'));
  assert.ok(changelog.includes('Optional Larger Full Name'));
  assert.ok(changelog.includes('Set Tag & Name Button'));
  assert.ok(changelog.includes('Family-Friendly Profanity Filter'));
});
