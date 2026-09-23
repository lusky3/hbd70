// src/scenes/MultiplayerLobby.js
// Multiplayer Lobby Scene: Host room creation, QR Code camera scan, 4-slot roster, and game mode selection

import { network, NetworkManager } from '../systems/NetworkManager.js';
import { storage } from '../systems/Storage.js';
import { audio } from '../systems/AudioManager.js';

const SceneBase = typeof Phaser !== 'undefined' ? Phaser.Scene : class {};

const SLOT_COLORS = {
  1: { hex: 0x38bdf8, str: '#38bdf8', name: 'CYAN' },    // Host
  2: { hex: 0x4ade80, str: '#4ade80', name: 'EMERALD' }, // P2
  3: { hex: 0xf87171, str: '#f87171', name: 'RED' },     // P3
  4: { hex: 0xfacc15, str: '#facc15', name: 'GOLD' }      // P4
};

export class MultiplayerLobbyScene extends SceneBase {
  constructor() {
    super('MultiplayerLobby');
  }

  init(data) {
    this.initialMode = data?.mode || (data?.roomCode ? 'join' : 'host');
    this.prefilledCode = data?.roomCode ? NetworkManager.sanitizeRoomCode(data.roomCode) : '';
    this.returnScene = data?.returnScene || 'GameSelect';
    this.currentMode = this.initialMode; // 'host' | 'join'
    this.selectedGame = 'tanks'; // 'tanks' | 'pong'
    this.joinCodeChars = (this.prefilledCode.padEnd(4, 'A').slice(0, 4)).split('');
    this.selectedJoinSlot = 0;
    this.joinStatus = '';
    this.isConnected = false;
    this.unsubscribers = [];
  }

  create() {
    const { width, height } = this.scale;

    // 1. Dark Gradient Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0f1d, 0x0a0f1d, 0x0f172a, 0x0f172a, 1);
    bg.fillRect(0, 0, width, height);

    // 2. Top Header Navigation
    this.createHeader(width);

    // 3. Mode Toggle (Host vs Join)
    this.createModeToggle(width, 105);

    // 4. Containers for Host & Join Panels
    this.hostContainer = this.add.container(0, 0);
    this.joinContainer = this.add.container(0, 0);

    // 5. Wire Network Listeners
    this.setupNetworkListeners();

    // 6. Initialize views
    if (this.currentMode === 'host') {
      this.showHostPanel(width, height);
    } else {
      this.showJoinPanel(width, height);
    }

    // Auto-join if prefilled code was provided via URL
    if (this.currentMode === 'join' && this.prefilledCode.length >= 4) {
      this.executeJoinRoom(this.prefilledCode);
    }

    // Teardown on scene shutdown
    this.events.once('shutdown', () => {
      this.teardownListeners();
    });
  }

  createHeader(width) {
    const topBar = this.add.graphics();
    topBar.fillStyle(0x0f172a, 0.95);
    topBar.fillRect(0, 0, width, 68);
    topBar.lineStyle(2, 0x38bdf8, 0.8);
    topBar.lineBetween(0, 68, width, 68);

    // Back to Menu Button
    const backBtn = this.add.container(16, 34);
    const backBg = this.add.graphics();
    backBg.fillStyle(0x1e293b, 1);
    backBg.fillRoundedRect(0, -18, 76, 36, 8);
    backBg.lineStyle(1.5, 0x64748b, 1);
    backBg.strokeRoundedRect(0, -18, 76, 36, 8);
    backBtn.add(backBg);

    const backText = this.add.text(38, 0, '< MENU', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#94a3b8'
    }).setOrigin(0.5);
    backBtn.add(backText);

    const backZone = this.add.zone(38, 0, 76, 36).setInteractive({ useHandCursor: true });
    backBtn.add(backZone);
    backZone.on('pointerdown', () => {
      audio.playShoot?.();
      network.disconnect();
      this.scene.start(this.returnScene);
    });

    // Title
    this.add.text(width / 2 + 25, 26, '🌐 MULTIPLAYER LOBBY 🌐', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '15px',
      fontWeight: '900',
      color: '#38bdf8',
      letterSpacing: 1
    }).setOrigin(0.5);

    this.add.text(width / 2 + 25, 48, 'Play live with family across phones & tablets', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '10px',
      color: '#94a3b8'
    }).setOrigin(0.5);
  }

  createModeToggle(width, y) {
    const btnW = 160;
    const btnH = 34;

    this.hostTabBtn = this.add.container(width / 2 - btnW / 2 - 6, y);
    this.joinTabBtn = this.add.container(width / 2 + btnW / 2 + 6, y);

    this.updateModeToggleVisuals();

    const hostZone = this.add.zone(0, 0, btnW, btnH).setInteractive({ useHandCursor: true });
    this.hostTabBtn.add(hostZone);
    hostZone.on('pointerdown', () => {
      if (this.currentMode !== 'host') {
        audio.playShoot?.();
        this.currentMode = 'host';
        this.updateModeToggleVisuals();
        this.showHostPanel(this.scale.width, this.scale.height);
      }
    });

    const joinZone = this.add.zone(0, 0, btnW, btnH).setInteractive({ useHandCursor: true });
    this.joinTabBtn.add(joinZone);
    joinZone.on('pointerdown', () => {
      if (this.currentMode !== 'join') {
        audio.playShoot?.();
        this.currentMode = 'join';
        this.updateModeToggleVisuals();
        this.showJoinPanel(this.scale.width, this.scale.height);
      }
    });
  }

  updateModeToggleVisuals() {
    const btnW = 160;
    const btnH = 34;

    // Host Tab
    this.hostTabBtn.removeAll(true);
    const hostBg = this.add.graphics();
    const isHostActive = this.currentMode === 'host';
    hostBg.fillStyle(isHostActive ? 0x0369a1 : 0x1e293b, 1);
    hostBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    hostBg.lineStyle(1.5, isHostActive ? 0x38bdf8 : 0x475569, 1);
    hostBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    this.hostTabBtn.add(hostBg);

    const hostLabel = this.add.text(0, 0, '👑 CREATE ROOM', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: isHostActive ? '#ffffff' : '#94a3b8'
    }).setOrigin(0.5);
    this.hostTabBtn.add(hostLabel);

    // Join Tab
    this.joinTabBtn.removeAll(true);
    const joinBg = this.add.graphics();
    const isJoinActive = this.currentMode === 'join';
    joinBg.fillStyle(isJoinActive ? 0x0369a1 : 0x1e293b, 1);
    joinBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    joinBg.lineStyle(1.5, isJoinActive ? 0x38bdf8 : 0x475569, 1);
    joinBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    this.joinTabBtn.add(joinBg);

    const joinLabel = this.add.text(0, 0, '📱 JOIN ROOM', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: isJoinActive ? '#ffffff' : '#94a3b8'
    }).setOrigin(0.5);
    this.joinTabBtn.add(joinLabel);
  }

  // ==========================================
  // HOST PANEL
  // ==========================================
  async showHostPanel(width, height) {
    this.joinContainer.setVisible(false);
    this.hostContainer.setVisible(true);
    this.hostContainer.removeAll(true);

    const profile = storage.getPlayerProfile();

    // 1. Room Code Box
    const codeCard = this.add.graphics();
    codeCard.fillStyle(0x0f172a, 0.9);
    codeCard.fillRoundedRect(24, 135, width - 48, 175, 12);
    codeCard.lineStyle(1.5, 0x38bdf8, 0.8);
    codeCard.strokeRoundedRect(24, 135, width - 48, 175, 12);
    this.hostContainer.add(codeCard);

    const codeTitle = this.add.text(width / 2, 150, 'YOUR ROOM CODE', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#94a3b8',
      letterSpacing: 2
    }).setOrigin(0.5);
    this.hostContainer.add(codeTitle);

    this.roomCodeText = this.add.text(width / 2 - 50, 185, '....', {
      fontFamily: 'Courier New, monospace',
      fontSize: '34px',
      fontWeight: '900',
      color: '#facc15',
      letterSpacing: 4
    }).setOrigin(0.5);
    this.hostContainer.add(this.roomCodeText);

    const scanHint = this.add.text(width / 2 - 50, 230, 'Scan QR Code with phone\nto join instantly!', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      color: '#38bdf8',
      align: 'center'
    }).setOrigin(0.5);
    this.hostContainer.add(scanHint);

    // Initialize Host Room in NetworkManager
    if (!network.isHost || !network.roomCode) {
      try {
        const { roomCode } = await network.createRoom(profile);
        this.roomCodeText.setText(roomCode);
        this.renderQRCode(width / 2 + 130, 220, roomCode);
      } catch (err) {
        console.error('Failed to create room:', err);
        this.roomCodeText.setText('ERR');
      }
    } else {
      this.roomCodeText.setText(network.roomCode);
      this.renderQRCode(width / 2 + 130, 220, network.roomCode);
    }

    // 2. Game Mode Selection (Tanks vs Pong)
    const modeY = 330;
    this.createGameModeSelector(width, modeY);

    // 3. Player Roster Slots
    const rosterY = 395;
    this.renderRoster(width, rosterY);

    // 4. Start Match Button
    this.createStartMatchButton(width, height - 60);
  }

  renderQRCode(x, y, roomCode) {
    if (typeof window === 'undefined') return;

    // Use current URL origin + path + ?room=ROOM_CODE
    const joinUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

    if (window.QRCode && window.QRCode.toCanvas) {
      const qrCanvas = document.createElement('canvas');
      window.QRCode.toCanvas(qrCanvas, joinUrl, {
        width: 120,
        margin: 1,
        color: {
          dark: '#facc15',
          light: '#0a0f1d'
        }
      }, (err) => {
        if (!err && this.textures && this.textures.addCanvas) {
          const key = `qr_${roomCode}`;
          if (this.textures.exists(key)) this.textures.remove(key);
          this.textures.addCanvas(key, qrCanvas);

          if (this.qrImage) this.qrImage.destroy();
          this.qrImage = this.add.image(x, y, key).setOrigin(0.5);
          this.hostContainer.add(this.qrImage);
        }
      });
    }
  }

  createGameModeSelector(width, y) {
    const btnW = 200;
    const btnH = 34;

    const tanksBtn = this.add.container(width / 2 - btnW / 2 - 4, y);
    const pongBtn = this.add.container(width / 2 + btnW / 2 + 4, y);

    const updateSelectorVisuals = () => {
      // Tanks Mode
      tanksBtn.removeAll(true);
      const isTanks = this.selectedGame === 'tanks';
      const tBg = this.add.graphics();
      tBg.fillStyle(isTanks ? 0x0369a1 : 0x1e293b, 1);
      tBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
      tBg.lineStyle(1.5, isTanks ? 0x38bdf8 : 0x475569, 1);
      tBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
      tanksBtn.add(tBg);

      tanksBtn.add(this.add.text(0, 0, '🎮 TANKS ARENA (2-4P)', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '11px',
        fontWeight: 'bold',
        color: isTanks ? '#ffffff' : '#94a3b8'
      }).setOrigin(0.5));

      // Pong Mode
      pongBtn.removeAll(true);
      const isPong = this.selectedGame === 'pong';
      const pBg = this.add.graphics();
      pBg.fillStyle(isPong ? 0x0369a1 : 0x1e293b, 1);
      pBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
      pBg.lineStyle(1.5, isPong ? 0x38bdf8 : 0x475569, 1);
      pBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
      pongBtn.add(pBg);

      pongBtn.add(this.add.text(0, 0, '🏓 PONG DUEL (2P)', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '11px',
        fontWeight: 'bold',
        color: isPong ? '#ffffff' : '#94a3b8'
      }).setOrigin(0.5));
    };

    updateSelectorVisuals();

    const tZone = this.add.zone(0, 0, btnW, btnH).setInteractive({ useHandCursor: true });
    tanksBtn.add(tZone);
    tZone.on('pointerdown', () => {
      audio.playShoot?.();
      this.selectedGame = 'tanks';
      network.setGameMode('tanks');
      updateSelectorVisuals();
      this.updateStartButtonVisuals();
    });

    const pZone = this.add.zone(0, 0, btnW, btnH).setInteractive({ useHandCursor: true });
    pongBtn.add(pZone);
    pZone.on('pointerdown', () => {
      audio.playShoot?.();
      this.selectedGame = 'pong';
      network.setGameMode('pong');
      updateSelectorVisuals();
      this.updateStartButtonVisuals();
    });

    this.hostContainer.add(tanksBtn);
    this.hostContainer.add(pongBtn);
  }

  renderRoster(width, startY) {
    if (this.rosterContainer) this.rosterContainer.destroy();
    this.rosterContainer = this.add.container(0, 0);

    const players = network.getAllPlayers();
    const maxSlots = 4;
    const slotH = 58;

    for (let slot = 1; slot <= maxSlots; slot++) {
      const slotY = startY + (slot - 1) * (slotH + 8);
      const player = players.find(p => p.slot === slot);
      const color = SLOT_COLORS[slot];

      const slotBg = this.add.graphics();
      slotBg.fillStyle(player ? 0x0f172a : 0x090d16, 0.9);
      slotBg.fillRoundedRect(24, slotY, width - 48, slotH, 8);
      slotBg.lineStyle(1.5, player ? color.hex : 0x334155, player ? 0.9 : 0.4);
      slotBg.strokeRoundedRect(24, slotY, width - 48, slotH, 8);
      this.rosterContainer.add(slotBg);

      // Color Badge
      const badge = this.add.graphics();
      badge.fillStyle(color.hex, player ? 1 : 0.3);
      badge.fillCircle(48, slotY + slotH / 2, 10);
      this.rosterContainer.add(badge);

      const slotNumText = this.add.text(48, slotY + slotH / 2, `${slot}`, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '11px',
        fontWeight: 'bold',
        color: '#000000'
      }).setOrigin(0.5);
      this.rosterContainer.add(slotNumText);

      if (player) {
        // Tag & Name
        const nameText = this.add.text(70, slotY + 12, `[${player.tag}] ${player.fullName || 'Guest Player'}`, {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '14px',
          fontWeight: 'bold',
          color: color.str
        });
        this.rosterContainer.add(nameText);

        const roleText = this.add.text(70, slotY + 34, player.isHost ? '★ ROOM HOST' : 'READY TO PLAY', {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '11px',
          color: '#94a3b8'
        });
        this.rosterContainer.add(roleText);

        // Ping or Status
        const pingText = this.add.text(width - 42, slotY + slotH / 2, player.isHost ? 'HOST' : `${player.ping || 20}ms`, {
          fontFamily: 'Courier New, monospace',
          fontSize: '12px',
          color: '#4ade80'
        }).setOrigin(1, 0.5);
        this.rosterContainer.add(pingText);
      } else {
        const waitingText = this.add.text(70, slotY + slotH / 2, `Waiting for Player ${slot}...`, {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '13px',
          color: '#475569',
          fontStyle: 'italic'
        }).setOrigin(0, 0.5);
        this.rosterContainer.add(waitingText);
      }
    }

    if (this.currentMode === 'host') {
      this.hostContainer.add(this.rosterContainer);
    } else {
      this.joinContainer.add(this.rosterContainer);
    }
  }

  createStartMatchButton(width, y) {
    this.startBtn = this.add.container(width / 2, y);
    this.updateStartButtonVisuals();

    const startZone = this.add.zone(0, 0, width - 48, 48).setInteractive({ useHandCursor: true });
    this.startBtn.add(startZone);
    startZone.on('pointerdown', () => {
      const count = network.getAllPlayers().length;
      if (count >= 2) {
        audio.playVictory?.();
        network.startGame({ mode: this.selectedGame });
      } else {
        audio.playHit?.();
      }
    });

    this.hostContainer.add(this.startBtn);
  }

  updateStartButtonVisuals() {
    if (!this.startBtn) return;
    this.startBtn.removeAll(true);
    const width = this.scale.width;
    const btnW = width - 48;
    const btnH = 48;

    const count = network.getAllPlayers().length;
    const canStart = count >= 2;

    const bg = this.add.graphics();
    bg.fillStyle(canStart ? 0x16a34a : 0x1e293b, 1);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
    bg.lineStyle(2, canStart ? 0x4ade80 : 0x475569, 1);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
    this.startBtn.add(bg);

    const title = canStart
      ? `START ${this.selectedGame.toUpperCase()} (${count} PLAYERS) ▶`
      : 'WAITING FOR PLAYERS (MIN 2 NEEDED)...';

    const text = this.add.text(0, 0, title, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: canStart ? '#ffffff' : '#64748b'
    }).setOrigin(0.5);
    this.startBtn.add(text);
  }

  // ==========================================
  // JOIN PANEL
  // ==========================================
  showJoinPanel(width, height) {
    this.hostContainer.setVisible(false);
    this.joinContainer.setVisible(true);
    this.joinContainer.removeAll(true);

    if (this.isConnected) {
      // Display Connected View
      const connCard = this.add.graphics();
      connCard.fillStyle(0x0f172a, 0.9);
      connCard.fillRoundedRect(24, 140, width - 48, 80, 10);
      connCard.lineStyle(1.5, 0x4ade80, 0.8);
      connCard.strokeRoundedRect(24, 140, width - 48, 80, 10);
      this.joinContainer.add(connCard);

      this.joinContainer.add(this.add.text(width / 2, 165, `CONNECTED TO ROOM ${network.roomCode}!`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#4ade80'
      }).setOrigin(0.5));

      this.joinContainer.add(this.add.text(width / 2, 195, 'Waiting for Host to start match...', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        color: '#94a3b8'
      }).setOrigin(0.5));

      // Display Roster
      this.renderRoster(width, 240);
      return;
    }

    // 1. Instructions
    const hint = this.add.text(width / 2, 148, 'ENTER 4-CHARACTER ROOM CODE', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#38bdf8',
      letterSpacing: 1
    }).setOrigin(0.5);
    this.joinContainer.add(hint);

    // 2. 4 Code Slots with interactive touch chevrons
    const slotStartX = width / 2 - (4 * 56) / 2 + 28;
    const slotY = 220;
    this.joinSlotTexts = [];

    const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for (let i = 0; i < 4; i++) {
      const sx = slotStartX + i * 56;
      const isCur = i === this.selectedJoinSlot;

      // Slot Box
      const sBg = this.add.graphics();
      sBg.fillStyle(0x0f172a, 0.95);
      sBg.fillRoundedRect(sx - 24, slotY - 30, 48, 60, 8);
      sBg.lineStyle(1.5, isCur ? 0xfacc15 : 0x38bdf8, 1);
      sBg.strokeRoundedRect(sx - 24, slotY - 30, 48, 60, 8);
      this.joinContainer.add(sBg);

      // Character
      const cText = this.add.text(sx, slotY, this.joinCodeChars[i], {
        fontFamily: 'Courier New, monospace',
        fontSize: '28px',
        fontWeight: '900',
        color: '#facc15'
      }).setOrigin(0.5);
      this.joinSlotTexts.push(cText);
      this.joinContainer.add(cText);

      // Chevron Up
      const up = this.add.text(sx, slotY - 42, '▲', { fontSize: '13px', color: '#64748b' }).setOrigin(0.5);
      const upZone = this.add.zone(sx, slotY - 42, 40, 24).setInteractive({ useHandCursor: true });
      upZone.on('pointerdown', () => {
        audio.playShoot?.();
        this.cycleJoinChar(i, 1);
      });
      this.joinContainer.add(up);
      this.joinContainer.add(upZone);

      // Chevron Down
      const down = this.add.text(sx, slotY + 42, '▼', { fontSize: '13px', color: '#64748b' }).setOrigin(0.5);
      const downZone = this.add.zone(sx, slotY + 42, 40, 24).setInteractive({ useHandCursor: true });
      downZone.on('pointerdown', () => {
        audio.playShoot?.();
        this.cycleJoinChar(i, -1);
      });
      this.joinContainer.add(down);
      this.joinContainer.add(downZone);
    }

    // 3. Connect Button
    const connectBtnW = width - 64;
    const connectBtn = this.add.container(width / 2, 330);
    const cBg = this.add.graphics();
    cBg.fillStyle(0x0284c7, 1);
    cBg.fillRoundedRect(-connectBtnW / 2, -22, connectBtnW, 44, 10);
    cBg.lineStyle(1.5, 0x38bdf8, 1);
    cBg.strokeRoundedRect(-connectBtnW / 2, -22, connectBtnW, 44, 10);
    connectBtn.add(cBg);

    const cText = this.add.text(0, 0, 'JOIN ROOM ▶', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#ffffff',
      letterSpacing: 1
    }).setOrigin(0.5);
    connectBtn.add(cText);

    const cZone = this.add.zone(0, 0, connectBtnW, 44).setInteractive({ useHandCursor: true });
    connectBtn.add(cZone);
    cZone.on('pointerdown', () => {
      audio.playShoot?.();
      const code = this.joinCodeChars.join('');
      this.executeJoinRoom(code);
    });
    this.joinContainer.add(connectBtn);

    // 4. Status Message
    this.joinStatusText = this.add.text(width / 2, 400, this.joinStatus, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      color: '#f87171',
      align: 'center'
    }).setOrigin(0.5);
    this.joinContainer.add(this.joinStatusText);
  }

  cycleJoinChar(index, delta) {
    const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const cur = this.joinCodeChars[index];
    let pos = ALPHABET.indexOf(cur);
    if (pos === -1) pos = 0;
    pos = (pos + delta + ALPHABET.length) % ALPHABET.length;
    this.joinCodeChars[index] = ALPHABET[pos];
    if (this.joinSlotTexts && this.joinSlotTexts[index]) {
      this.joinSlotTexts[index].setText(ALPHABET[pos]);
    }
  }

  async executeJoinRoom(code) {
    if (this.joinStatusText) {
      this.joinStatusText.setText(`Connecting to ${code}...`).setColor('#38bdf8');
    }
    const profile = storage.getPlayerProfile();

    try {
      await network.joinRoom(code, profile);
      this.isConnected = true;
      this.showJoinPanel(this.scale.width, this.scale.height);
    } catch (err) {
      console.error('Failed to join room:', err);
      if (this.joinStatusText) {
        this.joinStatusText.setText(`Could not connect: ${err.message || 'Room not found'}`).setColor('#f87171');
      }
    }
  }

  // ==========================================
  // NETWORK LISTENERS
  // ==========================================
  setupNetworkListeners() {
    this.unsubscribers.push(
      network.on('player-joined', (player) => {
        audio.playShoot?.();
        this.renderRoster(this.scale.width, this.currentMode === 'host' ? 395 : 240);
        this.updateStartButtonVisuals();
      }),
      network.on('player-left', () => {
        audio.playHit?.();
        this.renderRoster(this.scale.width, this.currentMode === 'host' ? 395 : 240);
        this.updateStartButtonVisuals();
      }),
      network.on('lobby-updated', (data) => {
        if (data.gameMode) this.selectedGame = data.gameMode;
        this.renderRoster(this.scale.width, this.currentMode === 'host' ? 395 : 240);
        this.updateStartButtonVisuals();
      }),
      network.on('game-start', (packet) => {
        audio.playVictory?.();
        const mode = packet.gameMode || 'tanks';
        if (mode === 'pong') {
          this.scene.start('MultiplayerPong', { isHost: network.isHost });
        } else {
          this.scene.start('MultiplayerTanks', { isHost: network.isHost, seed: packet.seed });
        }
      }),
      network.on('host-disconnected', () => {
        audio.playExplode?.();
        this.isConnected = false;
        this.joinStatus = 'Host disconnected from room.';
        this.showJoinPanel(this.scale.width, this.scale.height);
      })
    );
  }

  teardownListeners() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }
}
