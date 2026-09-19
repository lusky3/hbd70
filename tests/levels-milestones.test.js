// tests/levels-milestones.test.js
// Validates all 70 levels, 70 milestones, and 7 decade worlds against AC-4, AC-5, and AC-6

import test from 'node:test';
import assert from 'node:assert/strict';
import { MILESTONES, WORLDS } from '../src/data/milestones.js';
import { LEVELS } from '../src/data/levels.js';

test('AC-4: 7 Worlds Defined with Valid Decades and Themed Enemies', () => {
  assert.equal(WORLDS.length, 7, 'Must have exactly 7 decade worlds');
  const expectedDecades = [
    '1956–1965', '1966–1975', '1976–1985', '1986–1995',
    '1996–2005', '2006–2015', '2016–2026'
  ];
  const expectedEnemies = ['candle', 'golf', 'puck', 'boat', 'snowmobile', 'biker', 'boss'];

  WORLDS.forEach((world, idx) => {
    assert.equal(world.id, idx + 1);
    assert.equal(world.decade, expectedDecades[idx]);
    assert.equal(world.enemyType, expectedEnemies[idx]);
    assert.ok(world.themeColor, 'World must have themeColor');
    assert.ok(world.bgColor, 'World must have bgColor');
  });
});

test('AC-4: Exactly 70 Milestones for Allan Lusk (1956 to 2026)', () => {
  const milestoneKeys = Object.keys(MILESTONES).map(Number);
  assert.equal(milestoneKeys.length, 70, 'Must have 70 milestone entries');

  for (let level = 1; level <= 70; level++) {
    const m = MILESTONES[level];
    assert.ok(m, `Milestone for level ${level} must exist`);
    assert.ok(m.year >= 1956 && m.year <= 2026, `Year ${m.year} must be between 1956 and 2026`);
    assert.ok(m.title && m.title.length > 0, `Level ${level} must have non-empty title`);
  }
  // Check boundary years
  assert.equal(MILESTONES[1].year, 1956);
  assert.equal(MILESTONES[70].year, 2026);
});

test('AC-4: Allan Lusk Specific Family & Career Milestones Present', () => {
  // 1956: Birth
  assert.match(MILESTONES[1].title, /Allan is Born/i);
  // 1964: Gilligan's Island
  assert.match(MILESTONES[9].title, /Gilligan's Island/i);
  // 1966: Star Trek TOS
  assert.match(MILESTONES[11].title, /Star Trek: TOS/i);
  // 1976: CN Rail & Jennifer born June 27
  assert.match(MILESTONES[21].title, /Joining CN Rail.*Jennifer Born \(June 27\)/i);
  // 1979: Amy born May 14
  assert.match(MILESTONES[24].title, /Amy Born \(May 14\)/i);
  // 1981: Cottage Weekends
  assert.match(MILESTONES[26].title, /Cottage Weekends/i);
  // 1983: A-Team
  assert.match(MILESTONES[28].title, /A-Team/i);
  // 1987: Wedding to Carrie Orr & Star Trek TNG
  assert.match(MILESTONES[32].title, /Carrie Orr/i);
  assert.match(MILESTONES[32].title, /Star Trek: TNG/i);
  // 1989: Cody born May 6
  assert.match(MILESTONES[34].title, /Cody Born \(May 6\)/i);
  // 1991: Kelsey born April 23
  assert.match(MILESTONES[36].title, /Kelsey Born \(April 23\)/i);
  // 2003: NCIS premieres
  assert.match(MILESTONES[48].title, /NCIS Premieres/i);
  // 2011: TTX Assistant Manager
  assert.match(MILESTONES[56].title, /TTX/i);
  // 2015: TTX Regional Manager
  assert.match(MILESTONES[60].title, /TTX Regional Manager/i);
  // 2019: Retirement
  assert.match(MILESTONES[64].title, /Retirement from TTX/i);
  // 2026: 70th Birthday Grand Milestone
  assert.match(MILESTONES[70].title, /70th Birthday.*Allan/i);
});

test('AC-5 & AC-6: Exactly 70 Levels with Valid Grid & Enemy Data', () => {
  assert.equal(LEVELS.length, 70, 'Must have exactly 70 levels defined in array');

  const validEnemyTypes = new Set([
    'candle', 'golf', 'puck', 'boat', 'snowmobile', 'biker', 'boss',
    'boss_candle', 'boss_golf', 'boss_puck', 'boss_boat', 'boss_snowmobile', 'boss_biker', 'boss_70'
  ]);

  LEVELS.forEach((lvl, idx) => {
    const levelNum = idx + 1;
    assert.equal(lvl.levelNum, levelNum);
    assert.ok(lvl.year >= 1956 && lvl.year <= 2026);
    assert.ok(lvl.playerStart, `Level ${levelNum} must have playerStart`);
    assert.ok(Number.isFinite(lvl.playerStart.x) && Number.isFinite(lvl.playerStart.y));

    // Player spawn should be within grid bounds [1, 10] x [1, 14]
    assert.ok(lvl.playerStart.x >= 1 && lvl.playerStart.x <= 10);
    assert.ok(lvl.playerStart.y >= 1 && lvl.playerStart.y <= 14);

    // Enemies check
    assert.ok(Array.isArray(lvl.enemies), `Level ${levelNum} must have enemies array`);
    assert.ok(lvl.enemies.length >= 1, `Level ${levelNum} must have at least 1 enemy`);
    assert.ok(lvl.enemies.length <= 6, `Level ${levelNum} enemies capped at reasonable maximum`);

    for (const enemy of lvl.enemies) {
      assert.ok(validEnemyTypes.has(enemy.type), `Enemy type ${enemy.type} in level ${levelNum} must be valid`);
      assert.ok(Number.isFinite(enemy.x) && Number.isFinite(enemy.y));
      assert.ok(enemy.x >= 1 && enemy.x <= 10, `Enemy x ${enemy.x} must be within arena`);
      assert.ok(enemy.y >= 1 && enemy.y <= 14, `Enemy y ${enemy.y} must be within arena`);
    }

    // Grid check: 16 rows, 12 columns
    assert.ok(Array.isArray(lvl.grid), `Level ${levelNum} must have grid array`);
    assert.equal(lvl.grid.length, 16, `Level ${levelNum} grid must have 16 rows`);
    for (let r = 0; r < 16; r++) {
      assert.equal(lvl.grid[r].length, 12, `Level ${levelNum} row ${r} must have 12 columns`);
      for (let c = 0; c < 12; c++) {
        const tile = lvl.grid[r][c];
        assert.ok([0, 1, 2, 3].includes(tile), `Tile ${tile} at (${r},${c}) must be 0, 1, 2, or 3`);
        // Border boundary must be indestructible (1)
        if (r === 0 || r === 15 || c === 0 || c === 11) {
          assert.equal(tile, 1, `Border at (${r},${c}) in level ${levelNum} must be indestructible (1)`);
        }
      }
    }
  });
});

test('AC-3: All 7 Decade Climax Levels (10, 20, 30, 40, 50, 60, 70) Feature Unique Bosses', () => {
  const expectedBosses = {
    10: 'boss_candle',
    20: 'boss_golf',
    30: 'boss_puck',
    40: 'boss_boat',
    50: 'boss_snowmobile',
    60: 'boss_biker',
    70: 'boss'
  };

  for (const [lvlStr, expectedBoss] of Object.entries(expectedBosses)) {
    const lvlNum = Number(lvlStr);
    const level = LEVELS[lvlNum - 1];
    assert.ok(level, `Level ${lvlNum} must exist`);
    assert.equal(level.isBossLevel, true, `Level ${lvlNum} must have isBossLevel: true`);
    assert.equal(level.bossType, expectedBoss, `Level ${lvlNum} bossType must be ${expectedBoss}`);

    // Verify boss is present in enemies array
    const bossInEnemies = level.enemies.find(e => e.type === expectedBoss);
    assert.ok(bossInEnemies, `Level ${lvlNum} must contain ${expectedBoss} in its enemies list`);
  }
});
