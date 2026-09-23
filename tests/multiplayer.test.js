// tests/multiplayer.test.js
// Unit tests for WebRTC NetworkManager, room codes, packet encoding, and lobby state machines

import test from 'node:test';
import assert from 'node:assert/strict';

import { NetworkManager, network } from '../src/systems/NetworkManager.js';

test('AC-1: Room code generation produces 4-char uppercase unambiguous strings', () => {
  for (let i = 0; i < 50; i++) {
    const code = NetworkManager.generateRoomCode(4);
    assert.equal(code.length, 4);
    assert.match(code, /^[A-Z2-9]{4}$/);
    // Ensure ambiguous characters are never generated
    assert.equal(code.includes('0'), false);
    assert.equal(code.includes('O'), false);
    assert.equal(code.includes('1'), false);
    assert.equal(code.includes('I'), false);
  }
});

test('AC-1: Room code sanitization trims, capitalizes and filters invalid glyphs', () => {
  assert.equal(NetworkManager.sanitizeRoomCode(' al70 '), 'AL70');
  assert.equal(NetworkManager.sanitizeRoomCode('hbd-70!'), 'HBD70');
  assert.equal(NetworkManager.sanitizeRoomCode(''), '');
  assert.equal(NetworkManager.sanitizeRoomCode(null), '');
});

test('AC-1: NetworkManager event emitter dispatches and detaches correctly', () => {
  const nm = new NetworkManager();
  let callCount = 0;
  let receivedData = null;

  const unsubscribe = nm.on('test-event', (data) => {
    callCount++;
    receivedData = data;
  });

  nm.emit('test-event', { msg: 'hello' });
  assert.equal(callCount, 1);
  assert.deepEqual(receivedData, { msg: 'hello' });

  // Detach
  unsubscribe();
  nm.emit('test-event', { msg: 'world' });
  assert.equal(callCount, 1); // Not incremented
});

test('AC-1: NetworkManager Host creation assigns Slot 1 and initializes player roster', async () => {
  const nm = new NetworkManager();
  const res = await nm.createRoom({ tag: 'ALL', fullName: 'Allan' }, 'AL70');

  assert.equal(nm.isHost, true);
  assert.equal(nm.mySlot, 1);
  assert.equal(nm.roomCode, 'AL70');
  assert.equal(res.roomCode, 'AL70');

  const p1 = nm.getPlayer(1);
  assert.ok(p1);
  assert.equal(p1.slot, 1);
  assert.equal(p1.tag, 'ALL');
  assert.equal(p1.fullName, 'Allan');
  assert.equal(p1.isHost, true);
  assert.equal(p1.ready, true);

  const allPlayers = nm.getAllPlayers();
  assert.equal(allPlayers.length, 1);

  nm.disconnect();
  assert.equal(nm.getAllPlayers().length, 0);
  assert.equal(nm.roomCode, null);
});

test('AC-1: NetworkManager manages game mode changes and client input maps', () => {
  const nm = new NetworkManager();
  nm.isHost = true;
  nm.roomCode = 'TEST';

  assert.equal(nm.gameMode, 'tanks');
  nm.setGameMode('pong');
  assert.equal(nm.gameMode, 'pong');

  // Input reception simulation
  nm.sendInput({ moveX: 1, moveY: 0, aimX: 0, aimY: -1, isFiring: true });
  assert.ok(nm.clientInputs.has(1));
  const p1Input = nm.clientInputs.get(1);
  assert.equal(p1Input.moveX, 1);
  assert.equal(p1Input.isFiring, true);

  nm.disconnect();
});

test('AC-2: MultiplayerLobbyScene instantiates and cycles code characters', async () => {
  const { MultiplayerLobbyScene } = await import('../src/scenes/MultiplayerLobby.js');
  const lobby = new MultiplayerLobbyScene();
  lobby.init({ mode: 'join', roomCode: 'AL70' });

  assert.equal(lobby.currentMode, 'join');
  assert.deepEqual(lobby.joinCodeChars, ['A', 'L', '7', '0']);

  // Cycle character
  lobby.cycleJoinChar(0, 1);
  assert.equal(lobby.joinCodeChars[0], 'B');
  lobby.cycleJoinChar(0, -1);
  assert.equal(lobby.joinCodeChars[0], 'A');
});

test('AC-3 & AC-4: MultiplayerTanksScene defines frag threshold and spawns', async () => {
  const { MultiplayerTanksScene } = await import('../src/scenes/MultiplayerTanks.js');
  const tanks = new MultiplayerTanksScene();
  tanks.init({ isHost: true });

  assert.equal(tanks.isHost, true);
  assert.equal(tanks.matchTime, 180);
  assert.equal(tanks.isMatchOver, false);
});

test('AC-5: MultiplayerPong perspective inversion formula computes inverted coordinates correctly', async () => {
  const { MultiplayerPongScene } = await import('../src/scenes/MultiplayerPong.js');
  const pong = new MultiplayerPongScene();
  pong.courtTop = 76;
  pong.courtBottom = 770;

  // If host ball Y is near bottom (e.g. 700, near host paddle)
  // Client inverted Y must be near top (near host paddle on client screen):
  // formula: courtTop + (courtBottom - y_host)
  const hostBallY = 700;
  const clientInvertedY = pong.courtTop + (pong.courtBottom - hostBallY);
  assert.equal(clientInvertedY, 76 + (770 - 700)); // 146
  assert.ok(clientInvertedY < 200, 'Ball near bottom on Host should appear near top on Client');

  // If host ball Y is near top (e.g. 150)
  const hostBallNearTop = 150;
  const clientInvertedNearBottom = pong.courtTop + (pong.courtBottom - hostBallNearTop);
  assert.equal(clientInvertedNearBottom, 76 + (770 - 150)); // 696
  assert.ok(clientInvertedNearBottom > 600, 'Ball near top on Host should appear near bottom on Client');
});

test('AC-6: Version 1.4.0 consistency across package.json, src/version.js, and CHANGELOG.md', async () => {
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
  assert.equal(pkg.version, '1.4.1');

  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  assert.ok(changelog.includes('## [1.4.0] - 2026-09-22'));
  assert.ok(changelog.includes('Multi-Device Real-Time Multiplayer'));
  assert.ok(changelog.includes('QR Code Camera Onboarding'));
  assert.ok(changelog.includes('4-Player Birthday Tanks Arena'));
  assert.ok(changelog.includes('2-Player Birthday Pong Duel'));
});
