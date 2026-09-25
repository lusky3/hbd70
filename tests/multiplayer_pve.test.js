// tests/multiplayer_pve.test.js
// Verification suite for Tanks Multiplayer PvP vs PvE, Decades / Endless Co-op, and PvP Leaderboard Badge

import test from 'node:test';
import assert from 'node:assert/strict';
import { network, HOST_ONLY_EVENTS } from '../src/systems/NetworkManager.js';
import { MultiplayerTanksScene } from '../src/scenes/MultiplayerTanks.js';
import { MultiplayerLobbyScene } from '../src/scenes/MultiplayerLobby.js';
import { LeaderboardModalScene } from '../src/scenes/LeaderboardModal.js';
import { LEVELS } from '../src/data/levels.js';

test('AC-1: NetworkManager handles tanksSubMode and tanksPveType options & blocks untrusted host events', () => {
  network.isHost = true;
  network.setGameMode('tanks', { tanksSubMode: 'pve', tanksPveType: 'endless' });
  assert.equal(network.gameMode, 'tanks');
  assert.equal(network.gameOptions.tanksSubMode, 'pve');
  assert.equal(network.gameOptions.tanksPveType, 'endless');

  network.setGameOptions({ tanksSubMode: 'pvp' });
  assert.equal(network.gameOptions.tanksSubMode, 'pvp');
  assert.equal(network.gameOptions.tanksPveType, 'endless'); // Preserved

  // Verify host-only events defense
  assert.ok(HOST_ONLY_EVENTS.has('match-over'));
  assert.ok(HOST_ONLY_EVENTS.has('squad-victory'));
  assert.ok(HOST_ONLY_EVENTS.has('squad-defeated'));
  assert.ok(HOST_ONLY_EVENTS.has('pve-wave-complete'));
  assert.ok(HOST_ONLY_EVENTS.has('pve-level-start'));
  assert.ok(HOST_ONLY_EVENTS.has('return-to-lobby'));
});

test('AC-2: MultiplayerLobbyScene initializes and toggles PvP vs PvE options', () => {
  const lobby = new MultiplayerLobbyScene();
  lobby.init();
  assert.equal(lobby.tanksSubMode, 'pvp');
  assert.equal(lobby.tanksPveType, 'endless'); // Inherits from previous network set

  // getRosterY dynamic reflow
  lobby.tanksSubMode = 'pvp';
  assert.equal(lobby.getRosterY(), 382);
  lobby.tanksSubMode = 'pve';
  assert.equal(lobby.getRosterY(), 414);

  // getChatY dynamic reflow
  lobby.tanksSubMode = 'pvp';
  assert.equal(lobby.getChatY(), 592);
  lobby.tanksSubMode = 'pve';
  assert.equal(lobby.getChatY(), 624);
});

test('AC-3: Friendly fire immunity logic in PvE mode via canDamageTank', () => {
  const scene = new MultiplayerTanksScene();
  scene.init({ isHost: true, tanksSubMode: 'pve', tanksPveType: 'decades' });
  assert.equal(scene.isPvP, false);
  assert.equal(scene.tanksSubMode, 'pve');

  const p1 = { slot: 1, hp: 3, isDead: false, isShielded: false };
  const p2 = { slot: 2, hp: 3, isDead: false, isShielded: false };

  // Teammate bullet hitting teammate in PvE -> IMMUNE
  assert.equal(scene.canDamageTank(1, p2), false, 'Friendly fire must be disabled in PvE mode');

  // Tank hitting self -> IMMUNE
  assert.equal(scene.canDamageTank(1, p1), false, 'Tank cannot damage self');

  // Enemy bullet (bulletOwnerSlot = null) hitting player in PvE -> DAMAGE APPLIED
  assert.equal(scene.canDamageTank(null, p2), true, 'Enemy bullet damages player in PvE');

  // In PvP mode: opponent bullet hitting player -> DAMAGE APPLIED
  scene.tanksSubMode = 'pvp';
  assert.equal(scene.canDamageTank(1, p2), true, 'Opponent bullet damages player in PvP');
});

test('AC-4: Decades Level Progression and Boss Archetypes', () => {
  assert.equal(LEVELS.length, 70);
  const lvl1 = LEVELS[0];
  assert.ok(lvl1.enemies.length > 0, 'Level 1 has enemies');
  assert.ok(lvl1.playerStart.x !== undefined && lvl1.playerStart.y !== undefined);

  // Climax boss levels
  const bossLevels = [10, 20, 30, 40, 50, 60, 70];
  bossLevels.forEach(lvlNum => {
    const lvl = LEVELS[lvlNum - 1];
    assert.equal(lvl.isBossLevel, true, `Level ${lvlNum} is a boss level`);
    assert.ok(lvl.bossType, `Level ${lvlNum} has a boss archetype`);
  });
});

test('AC-5: Endless Mode difficulty scaling formulas via MultiplayerTanksScene', () => {
  assert.equal(MultiplayerTanksScene.getEndlessEnemyCount(1), 3);
  assert.equal(MultiplayerTanksScene.getEndlessEnemyCount(2), 4);
  assert.equal(MultiplayerTanksScene.getEndlessEnemyCount(4), 6);
  assert.equal(MultiplayerTanksScene.getEndlessEnemyCount(6), 8);
  assert.equal(MultiplayerTanksScene.getEndlessEnemyCount(20), 8); // Capped at 8

  // Wave clear score bonuses
  assert.equal(MultiplayerTanksScene.getWaveClearBonus('decades', 1), 250);
  assert.equal(MultiplayerTanksScene.getWaveClearBonus('decades', 10), 2500);
  assert.equal(MultiplayerTanksScene.getWaveClearBonus('endless', 1), 1000);
  assert.equal(MultiplayerTanksScene.getWaveClearBonus('endless', 5), 5000);
});

test('AC-6: PvP Leaderboard detail badge parsing via LeaderboardModalScene', () => {
  const pvpDetail = '⚔️ MP PvP (5 Frags)';
  assert.equal(LeaderboardModalScene.isMultiplayerEntry(pvpDetail), true, 'Detail string flagged as multiplayer');

  const regularDetail = 'Wave 12';
  assert.equal(LeaderboardModalScene.isMultiplayerEntry(regularDetail), false, 'Single player detail is not flagged as multiplayer');

  assert.equal(LeaderboardModalScene.isMultiplayerEntry(''), false);
  assert.equal(LeaderboardModalScene.isMultiplayerEntry(null), false);
});
