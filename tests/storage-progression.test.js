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
