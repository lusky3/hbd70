// tests/storage-progression.test.js
// Unit tests for StorageManager session persistence, level unlock progression, and ???? masking

import test from 'node:test';
import assert from 'node:assert/strict';
import { storage } from '../src/systems/Storage.js';
import { MILESTONES } from '../src/data/milestones.js';

test('Storage: Initial default state is Level 1 unlocked with 0 beaten levels', () => {
  storage.clearProgress();
  const progress = storage.getProgress();

  assert.equal(progress.highestLevelBeaten, 0, 'Initial highest beaten level should be 0');
  assert.deepEqual(progress.beatenLevels, [], 'Initial beaten levels array should be empty');
  assert.equal(progress.unlockedLevel, 1, 'Initial unlocked level should be 1');

  assert.equal(storage.isLevelUnlocked(1), true, 'Level 1 must be unlocked by default');
  assert.equal(storage.isLevelUnlocked(2), false, 'Level 2 must be locked initially');
  assert.equal(storage.isLevelBeaten(1), false, 'Level 1 is not beaten initially');
});

test('Storage: Clearing Level 1 updates beaten list and unlocks Level 2', () => {
  storage.clearProgress();
  const updated = storage.recordLevelBeaten(1);

  assert.equal(updated.highestLevelBeaten, 1);
  assert.deepEqual(updated.beatenLevels, [1]);
  assert.equal(updated.unlockedLevel, 2);

  assert.equal(storage.isLevelUnlocked(1), true, 'Level 1 remains unlocked');
  assert.equal(storage.isLevelUnlocked(2), true, 'Level 2 is now unlocked');
  assert.equal(storage.isLevelUnlocked(3), false, 'Level 3 remains locked');

  assert.equal(storage.isLevelBeaten(1), true, 'Level 1 is marked as beaten');
  assert.equal(storage.isLevelBeaten(2), false, 'Level 2 is unlocked but not yet beaten');
});

test('Storage: Beating multiple out-of-order levels maintains sorted beaten list and max unlocked', () => {
  storage.clearProgress();
  storage.recordLevelBeaten(1);
  storage.recordLevelBeaten(3); // e.g. tested or skipped to 3
  storage.recordLevelBeaten(2);

  const progress = storage.getProgress();
  assert.equal(progress.highestLevelBeaten, 3);
  assert.deepEqual(progress.beatenLevels, [1, 2, 3]);
  assert.equal(progress.unlockedLevel, 4);

  // Duplicate beating level 2 should be idempotent
  const rebeat = storage.recordLevelBeaten(2);
  assert.deepEqual(rebeat.beatenLevels, [1, 2, 3]);
  assert.equal(rebeat.highestLevelBeaten, 3);
});

test('Storage: Maximum level cap enforcement at Level 70', () => {
  storage.clearProgress();
  const capped = storage.recordLevelBeaten(70);

  assert.equal(capped.highestLevelBeaten, 70);
  assert.equal(capped.unlockedLevel, 70, 'Unlocked level should not exceed 70');
});

test('Level Masking: Uncompleted levels beyond unlocked level display ????', () => {
  storage.clearProgress();
  storage.recordLevelBeaten(1);
  storage.recordLevelBeaten(2);

  const unlocked = storage.getProgress().unlockedLevel; // 3
  const beaten = storage.getProgress().beatenLevels; // [1, 2]

  for (let lvl = 1; lvl <= 70; lvl++) {
    const isBeaten = beaten.includes(lvl);
    const isUnlocked = lvl <= unlocked;
    const milestone = MILESTONES[lvl];

    let displayTitle = '????';
    if (isBeaten || isUnlocked) {
      displayTitle = milestone.title;
    }

    if (lvl === 1 || lvl === 2) {
      assert.notEqual(displayTitle, '????', `Beaten level ${lvl} must show milestone title`);
      assert.equal(displayTitle, milestone.title);
    } else if (lvl === 3) {
      assert.equal(displayTitle, milestone.title, 'Current playable level 3 shows title');
    } else {
      assert.equal(displayTitle, '????', `Locked level ${lvl} must be masked as ????`);
    }
  }
});

test('Storage: Existing players with legacy schema retain progress and gain revealedLevels', () => {
  // Simulate mock localStorage with legacy schema (no revealedLevels)
  const legacyData = {
    highestLevelBeaten: 15,
    beatenLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    unlockedLevel: 16
  };
  
  const mockStorage = {
    getItem: (key) => key === 'hbd70_progress' ? JSON.stringify(legacyData) : null,
    setItem: (key, val) => {},
    removeItem: (key) => {}
  };

  global.window = { localStorage: mockStorage };
  storage.isStorageAvailable = true;

  const progress = storage.getProgress();
  assert.equal(progress.highestLevelBeaten, 15, 'Existing player highestLevelBeaten preserved');
  assert.equal(progress.unlockedLevel, 16, 'Existing player unlockedLevel preserved');
  assert.equal(progress.beatenLevels.length, 15, 'Existing player beatenLevels array preserved');
  assert.deepEqual(progress.revealedLevels, [], 'revealedLevels defaults to empty array');

  assert.equal(storage.isLevelUnlocked(16), true, 'Level 16 remains unlocked for existing player');
  assert.equal(storage.isLevelUnlocked(17), false, 'Level 17 remains locked for existing player');
  assert.equal(storage.isLevelBeaten(15), true, 'Level 15 is beaten');
  assert.equal(storage.isLevelBeaten(16), false, 'Level 16 is not yet beaten');

  delete global.window;
  storage.isStorageAvailable = false;
  storage.clearProgress();
});

test('Storage: Existing players with missing beatenLevels are automatically repaired', () => {
  const legacySparseData = {
    highestLevelBeaten: 5,
    unlockedLevel: 6
  };
  
  const mockStorage = {
    getItem: (key) => key === 'hbd70_progress' ? JSON.stringify(legacySparseData) : null,
    setItem: (key, val) => {},
    removeItem: (key) => {}
  };

  global.window = { localStorage: mockStorage };
  storage.isStorageAvailable = true;

  const progress = storage.getProgress();
  assert.equal(progress.highestLevelBeaten, 5);
  assert.equal(progress.unlockedLevel, 6);
  assert.deepEqual(progress.beatenLevels, [1, 2, 3, 4, 5], 'Missing beatenLevels backfilled to highestLevelBeaten');

  delete global.window;
  storage.isStorageAvailable = false;
  storage.clearProgress();
});

test('Storage: Revealing a level persists without corrupting or losing existing progress', () => {
  let savedData = null;
  const initialData = {
    highestLevelBeaten: 10,
    beatenLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    unlockedLevel: 11,
    revealedLevels: []
  };

  const mockStorage = {
    getItem: (key) => savedData || JSON.stringify(initialData),
    setItem: (key, val) => { savedData = val; },
    removeItem: (key) => { savedData = null; }
  };

  global.window = { localStorage: mockStorage };
  storage.isStorageAvailable = true;

  // Reveal level 45
  storage.recordLevelRevealed(45);

  assert.equal(storage.isLevelRevealed(45), true, 'Level 45 is revealed');
  assert.equal(storage.isLevelRevealed(46), false, 'Level 46 is not revealed');

  const progress = storage.getProgress();
  assert.equal(progress.highestLevelBeaten, 10, 'highestLevelBeaten untouched');
  assert.equal(progress.unlockedLevel, 11, 'unlockedLevel untouched');
  assert.deepEqual(progress.beatenLevels, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'beatenLevels untouched');
  assert.deepEqual(progress.revealedLevels, [45], 'revealedLevels correctly stored');

  // Next, beating level 11 must also preserve revealedLevels
  storage.recordLevelBeaten(11);
  const updatedProgress = storage.getProgress();
  assert.equal(updatedProgress.highestLevelBeaten, 11);
  assert.equal(updatedProgress.unlockedLevel, 12);
  assert.deepEqual(updatedProgress.revealedLevels, [45], 'revealedLevels preserved after level win');

  delete global.window;
  storage.isStorageAvailable = false;
  storage.clearProgress();
});

