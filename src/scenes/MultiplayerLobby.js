// src/scenes/MultiplayerLobby.js
// Multiplayer Lobby Scene: Host room creation, QR Code camera scan, 4-slot roster, game mode selection, live chat, and kick controls

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

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class MultiplayerLobbyScene extends SceneBase {
  constructor() {
    super('MultiplayerLobby');
  }

  init(data) {
    this.initialMode = data?.mode || (data?.roomCode ? 'join' : 'host');
    this.prefilledCode = data?.roomCode ? NetworkManager.sanitizeRoomCode(data.roomCode) : '';
    this.returnScene = data?.returnScene || 'GameSelect';
    this.currentMode = this.initialMode; // 'host' | 'join'
    this.selectedGame = 'tanks'; // 'tanks' | 'pong' | 'pool'
    this.tanksSubMode = network.gameOptions?.tanksSubMode || 'pvp'; // 'pvp' | 'pve'
    this.tanksPveType = network.gameOptions?.tanksPveType || 'decades'; // 'decades' | 'endless'
    this.poolSubMode = network.gameOptions?.poolSubMode || '8ball'; // '8ball' | '9ball' | 'straight' | 'speed'
    this.joinCodeChars = (this.prefilledCode.padEnd(4, 'A').slice(0, 4)).split('');
    this.selectedJoinSlot = 0;
    this.joinStatus = '';
    this.isConnected = false;
    this.chatMessages = [];
    this.network = network;
    this.storage = storage;
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

    // 6. Setup Join Input (Keyboard & Mouse Wheel)
    this.setupJoinInputListeners();

    // 7. Initialize views
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

    this.hostTabBg = this.add.graphics();
    this.hostTabBtn.add(this.hostTabBg);
    this.hostTabLabel = this.add.text(0, 0, '👑 CREATE ROOM', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    this.hostTabBtn.add(this.hostTabLabel);
    const hostZone = this.add.zone(0, 0, btnW, btnH).setInteractive({ useHandCursor: true });
    this.hostTabBtn.add(hostZone);
    hostZone.on('pointerdown', () => {
      if (this.currentMode !== 'host') {
        audio.playShoot?.();
        this.currentMode = 'host';
        this.isConnected = false;
        this.updateModeToggleVisuals();
        this.showHostPanel(this.scale.width, this.scale.height);
      }
    });

    this.joinTabBg = this.add.graphics();
    this.joinTabBtn.add(this.joinTabBg);
    this.joinTabLabel = this.add.text(0, 0, '📱 JOIN ROOM', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    this.joinTabBtn.add(this.joinTabLabel);
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

    this.updateModeToggleVisuals();
  }

  updateModeToggleVisuals() {
    const btnW = 160;
    const btnH = 34;
    const isHostActive = this.currentMode === 'host';
    const isJoinActive = this.currentMode === 'join';

    if (this.hostTabBg && this.hostTabLabel) {
      this.hostTabBg.clear();
      this.hostTabBg.fillStyle(isHostActive ? 0x0369a1 : 0x1e293b, 1);
      this.hostTabBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
      this.hostTabBg.lineStyle(1.5, isHostActive ? 0x38bdf8 : 0x475569, 1);
      this.hostTabBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
      this.hostTabLabel.setColor(isHostActive ? '#ffffff' : '#94a3b8');
    }

    if (this.joinTabBg && this.joinTabLabel) {
      this.joinTabBg.clear();
      this.joinTabBg.fillStyle(isJoinActive ? 0x0369a1 : 0x1e293b, 1);
      this.joinTabBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
      this.joinTabBg.lineStyle(1.5, isJoinActive ? 0x38bdf8 : 0x475569, 1);
      this.joinTabBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
      this.joinTabLabel.setColor(isJoinActive ? '#ffffff' : '#94a3b8');
    }
  }

  setupJoinInputListeners() {
    // 1. Desktop Keyboard typing
    this.keyListener = (event) => {
      if (this.currentMode !== 'join' || this.isConnected) return;
      const key = event.key.toUpperCase();

      if (key.length === 1 && ALPHABET.includes(key)) {
        this.joinCodeChars[this.selectedJoinSlot] = key;
        audio.playBounce?.();
        this.updateJoinSlotDisplay();
        this.selectedJoinSlot = Math.min(3, this.selectedJoinSlot + 1);
        this.updateJoinSlotHighlights();
      } else if (event.key === 'Backspace') {
        if (this.joinCodeChars[this.selectedJoinSlot] !== 'A' && this.selectedJoinSlot >= 0) {
          this.joinCodeChars[this.selectedJoinSlot] = 'A';
          this.updateJoinSlotDisplay();
        } else if (this.selectedJoinSlot > 0) {
          this.selectedJoinSlot--;
          this.joinCodeChars[this.selectedJoinSlot] = 'A';
          this.updateJoinSlotDisplay();
          this.updateJoinSlotHighlights();
        }
      } else if (event.key === 'ArrowLeft') {
        this.selectedJoinSlot = (this.selectedJoinSlot - 1 + 4) % 4;
        this.updateJoinSlotHighlights();
      } else if (event.key === 'ArrowRight') {
        this.selectedJoinSlot = (this.selectedJoinSlot + 1) % 4;
        this.updateJoinSlotHighlights();
      } else if (event.key === 'ArrowUp') {
        this.cycleJoinChar(this.selectedJoinSlot, 1);
      } else if (event.key === 'ArrowDown') {
        this.cycleJoinChar(this.selectedJoinSlot, -1);
      } else if (event.key === 'Enter') {
        const code = this.joinCodeChars.join('');
        this.executeJoinRoom(code);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.keyListener);
    }
  }

  // ==========================================
  // HOST PANEL
  // ==========================================
  showHostPanel(width, height) {
    this.joinContainer.setVisible(false);
    this.hostContainer.setVisible(true);
    this.hostContainer.removeAll(true);

    const profile = storage.getPlayerProfile();

    // 1. Room Code Box
    const codeCard = this.add.graphics();
    codeCard.fillStyle(0x0f172a, 0.9);
    codeCard.fillRoundedRect(24, 135, width - 48, 160, 12);
    codeCard.lineStyle(1.5, 0x38bdf8, 0.8);
    codeCard.strokeRoundedRect(24, 135, width - 48, 160, 12);
    this.hostContainer.add(codeCard);

    const codeTitle = this.add.text(width / 2, 148, 'YOUR ROOM CODE', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#94a3b8',
      letterSpacing: 2
    }).setOrigin(0.5);
    this.hostContainer.add(codeTitle);

    this.roomCodeText = this.add.text(width / 2 - 50, 185, network.roomCode || '...', {
      fontFamily: 'Courier New, monospace',
      fontSize: '34px',
      fontWeight: '900',
      color: '#facc15',
      letterSpacing: 4
    }).setOrigin(0.5);
    this.hostContainer.add(this.roomCodeText);

    const scanHint = this.add.text(width / 2 - 50, 226, 'Scan QR Code with phone\nto join instantly!', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '10px',
      color: '#38bdf8',
      align: 'center'
    }).setOrigin(0.5);
    this.hostContainer.add(scanHint);

    // 2. Game Mode Selection (Tanks vs Pong + Submodes)
    const modeY = 312;
    this.createGameModeSelector(width, modeY);

    // 3. Player Roster Slots
    const rosterY = this.getRosterY();
    this.renderRoster(width, rosterY);

    // 4. Lobby Live Chat Box
    const chatY = this.getChatY();
    this.createLobbyChat(width, chatY);

    // 5. Start Match Button
    this.createStartMatchButton(width, height - 42);

    // 6. Asynchronous Host Room Initializer
    if (!network.isHost || !network.roomCode) {
      this.roomCodeText.setText('...');
      network.createRoom(profile).then(({ roomCode }) => {
        if (this.currentMode === 'host' && this.roomCodeText) {
          this.roomCodeText.setText(roomCode);
          this.renderQRCode(width / 2 + 130, 215, roomCode);
          this.renderRoster(width, rosterY);
          this.updateStartButtonVisuals();
        }
      }).catch((err) => {
        console.error('Failed to create room:', err);
        if (this.roomCodeText) this.roomCodeText.setText('ERR');
      });
    } else {
      this.roomCodeText.setText(network.roomCode);
      this.renderQRCode(width / 2 + 130, 215, network.roomCode);
    }
  }

  renderQRCode(x, y, roomCode) {
    if (typeof window === 'undefined') return;

    const joinUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

    if (window.QRCode && window.QRCode.toCanvas) {
      const qrCanvas = document.createElement('canvas');
      window.QRCode.toCanvas(qrCanvas, joinUrl, {
        width: 110,
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
          if (this.currentMode === 'host') {
            this.hostContainer.add(this.qrImage);
          }
        }
      });
    }
  }

  getRosterY() {
    if (this.selectedGame === 'pong') return 352;
    if (this.selectedGame === 'pool') return 382;
    return this.tanksSubMode === 'pve' ? 414 : 382;
  }

  getChatY() {
    if (this.selectedGame === 'pong') return 560;
    if (this.selectedGame === 'pool') return 592;
    return this.tanksSubMode === 'pve' ? 624 : 592;
  }

  refreshHostLayout() {
    if (this.currentMode !== 'host') return;
    const width = this.scale.width;
    this.createGameModeSelector(width, 312);
    this.renderRoster(width, this.getRosterY());
    this.createLobbyChat(width, this.getChatY());
    this.updateStartButtonVisuals();
  }

  createGameModeSelector(width, y) {
    if (this.gameModeContainer) this.gameModeContainer.destroy();
    this.gameModeContainer = this.add.container(0, 0);

    const btnW = Math.floor((width - 48 - 12) / 3);
    const btnH = 28;

    // Row 1: Primary Game Mode (Tanks vs Pong vs Pool)
    const games = [
      { id: 'tanks', label: '🎮 TANKS (2-4P)' },
      { id: 'pong', label: '🏓 PONG (2P)' },
      { id: 'pool', label: '🎱 POOL (2P)' }
    ];

    games.forEach((g, i) => {
      const gx = width / 2 - btnW - 6 + i * (btnW + 6);
      const gBtn = this.add.container(gx, y);
      const isSel = this.selectedGame === g.id;

      const gBg = this.add.graphics();
      gBg.fillStyle(isSel ? 0x0284c7 : 0x1e293b, 1);
      gBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
      gBg.lineStyle(1.5, isSel ? 0x38bdf8 : 0x475569, 1);
      gBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
      gBtn.add(gBg);

      const gLabel = this.add.text(0, 0, g.label, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '10px',
        fontWeight: 'bold',
        color: isSel ? '#ffffff' : '#94a3b8'
      }).setOrigin(0.5);
      gBtn.add(gLabel);

      const gZone = this.add.zone(0, 0, btnW, btnH).setInteractive({ useHandCursor: true });
      gBtn.add(gZone);
      gZone.on('pointerdown', () => {
        audio.playShoot?.();
        this.selectedGame = g.id;
        network.setGameMode(g.id, {
          tanksSubMode: this.tanksSubMode,
          tanksPveType: this.tanksPveType,
          poolSubMode: this.poolSubMode
        });
        this.refreshHostLayout();
      });

      this.gameModeContainer.add(gBtn);
    });

    // Row 2: Pool Sub-Modes
    if (this.selectedGame === 'pool') {
      const subY = y + 32;
      const poolSubtypes = [
        { id: '8ball', label: '8-BALL' },
        { id: '9ball', label: '9-BALL' },
        { id: 'straight', label: 'STRAIGHT' }
      ];
      if (this.poolSubMode === 'speed') this.poolSubMode = '8ball';
      const pBtnW = Math.floor((width - 48 - 12) / 3);
      const pBtnH = 26;

      poolSubtypes.forEach((st, i) => {
        const px = width / 2 - (3 * (pBtnW + 6)) / 2 + pBtnW / 2 + i * (pBtnW + 6);
        const pBtn = this.add.container(px, subY);
        const isSel = this.poolSubMode === st.id;

        const pBg = this.add.graphics();
        pBg.fillStyle(isSel ? 0x059669 : 0x1e293b, 1);
        pBg.fillRoundedRect(-pBtnW / 2, -pBtnH / 2, pBtnW, pBtnH, 6);
        pBg.lineStyle(1.5, isSel ? 0x34d399 : 0x475569, 1);
        pBg.strokeRoundedRect(-pBtnW / 2, -pBtnH / 2, pBtnW, pBtnH, 6);
        pBtn.add(pBg);

        const pLabel = this.add.text(0, 0, st.label, {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '10px',
          fontWeight: 'bold',
          color: isSel ? '#ffffff' : '#94a3b8'
        }).setOrigin(0.5);
        pBtn.add(pLabel);

        const pZone = this.add.zone(0, 0, pBtnW, pBtnH).setInteractive({ useHandCursor: true });
        pBtn.add(pZone);
        pZone.on('pointerdown', () => {
          audio.playShoot?.();
          this.poolSubMode = st.id;
          network.setGameOptions({ poolSubMode: st.id });
          this.refreshHostLayout();
        });

        this.gameModeContainer.add(pBtn);
      });
    }

    // Row 2: Tanks Sub-Mode (PvP Deathmatch vs PvE Co-op Squad)
    if (this.selectedGame === 'tanks') {
      const subY = y + 32;
      const subBtnW = 200;
      const subBtnH = 26;

      const pvpBtn = this.add.container(width / 2 - subBtnW / 2 - 4, subY);
      const pveBtn = this.add.container(width / 2 + subBtnW / 2 + 4, subY);

      const isPvP = this.tanksSubMode === 'pvp';

      const pvpBg = this.add.graphics();
      pvpBg.fillStyle(isPvP ? 0x059669 : 0x1e293b, 1);
      pvpBg.fillRoundedRect(-subBtnW / 2, -subBtnH / 2, subBtnW, subBtnH, 6);
      pvpBg.lineStyle(1.5, isPvP ? 0x34d399 : 0x475569, 1);
      pvpBg.strokeRoundedRect(-subBtnW / 2, -subBtnH / 2, subBtnW, subBtnH, 6);
      pvpBtn.add(pvpBg);

      const pvpLabel = this.add.text(0, 0, '⚔️ PVP (DEATHMATCH)', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '10px',
        fontWeight: 'bold',
        color: isPvP ? '#ffffff' : '#94a3b8'
      }).setOrigin(0.5);
      pvpBtn.add(pvpLabel);

      const pvpZone = this.add.zone(0, 0, subBtnW, subBtnH).setInteractive({ useHandCursor: true });
      pvpBtn.add(pvpZone);
      pvpZone.on('pointerdown', () => {
        audio.playShoot?.();
        this.tanksSubMode = 'pvp';
        network.setGameOptions({ tanksSubMode: 'pvp', tanksPveType: this.tanksPveType });
        this.refreshHostLayout();
      });

      const pveBg = this.add.graphics();
      pveBg.fillStyle(!isPvP ? 0x7c3aed : 0x1e293b, 1);
      pveBg.fillRoundedRect(-subBtnW / 2, -subBtnH / 2, subBtnW, subBtnH, 6);
      pveBg.lineStyle(1.5, !isPvP ? 0xa78bfa : 0x475569, 1);
      pveBg.strokeRoundedRect(-subBtnW / 2, -subBtnH / 2, subBtnW, subBtnH, 6);
      pveBtn.add(pveBg);

      const pveLabel = this.add.text(0, 0, '🛡️ PVE (CO-OP SQUAD)', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '10px',
        fontWeight: 'bold',
        color: !isPvP ? '#ffffff' : '#94a3b8'
      }).setOrigin(0.5);
      pveBtn.add(pveLabel);

      const pveZone = this.add.zone(0, 0, subBtnW, subBtnH).setInteractive({ useHandCursor: true });
      pveBtn.add(pveZone);
      pveZone.on('pointerdown', () => {
        audio.playShoot?.();
        this.tanksSubMode = 'pve';
        network.setGameOptions({ tanksSubMode: 'pve', tanksPveType: this.tanksPveType });
        this.refreshHostLayout();
      });

      this.gameModeContainer.add([pvpBtn, pveBtn]);

      // Row 3: PvE Campaign Type (Decades vs Endless Waves)
      if (this.tanksSubMode === 'pve') {
        const typeY = y + 62;
        const typeBtnW = 200;
        const typeBtnH = 24;

        const isDecades = this.tanksPveType === 'decades';

        const decBtn = this.add.container(width / 2 - typeBtnW / 2 - 4, typeY);
        const endBtn = this.add.container(width / 2 + typeBtnW / 2 + 4, typeY);

        const decBg = this.add.graphics();
        decBg.fillStyle(isDecades ? 0xd97706 : 0x1e293b, 1);
        decBg.fillRoundedRect(-typeBtnW / 2, -typeBtnH / 2, typeBtnW, typeBtnH, 6);
        decBg.lineStyle(1.5, isDecades ? 0xfbbf24 : 0x475569, 1);
        decBg.strokeRoundedRect(-typeBtnW / 2, -typeBtnH / 2, typeBtnW, typeBtnH, 6);
        decBtn.add(decBg);

        const decLabel = this.add.text(0, 0, '📜 DECADES (1-70)', {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '10px',
          fontWeight: 'bold',
          color: isDecades ? '#ffffff' : '#94a3b8'
        }).setOrigin(0.5);
        decBtn.add(decLabel);

        const decZone = this.add.zone(0, 0, typeBtnW, typeBtnH).setInteractive({ useHandCursor: true });
        decBtn.add(decZone);
        decZone.on('pointerdown', () => {
          audio.playShoot?.();
          this.tanksPveType = 'decades';
          network.setGameOptions({ tanksSubMode: 'pve', tanksPveType: 'decades' });
          this.refreshHostLayout();
        });

        const endBg = this.add.graphics();
        endBg.fillStyle(!isDecades ? 0xd97706 : 0x1e293b, 1);
        endBg.fillRoundedRect(-typeBtnW / 2, -typeBtnH / 2, typeBtnW, typeBtnH, 6);
        endBg.lineStyle(1.5, !isDecades ? 0xfbbf24 : 0x475569, 1);
        endBg.strokeRoundedRect(-typeBtnW / 2, -typeBtnH / 2, typeBtnW, typeBtnH, 6);
        endBtn.add(endBg);

        const endLabel = this.add.text(0, 0, '♾️ ENDLESS WAVES', {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '10px',
          fontWeight: 'bold',
          color: !isDecades ? '#ffffff' : '#94a3b8'
        }).setOrigin(0.5);
        endBtn.add(endLabel);

        const endZone = this.add.zone(0, 0, typeBtnW, typeBtnH).setInteractive({ useHandCursor: true });
        endBtn.add(endZone);
        endZone.on('pointerdown', () => {
          audio.playShoot?.();
          this.tanksPveType = 'endless';
          network.setGameOptions({ tanksSubMode: 'pve', tanksPveType: 'endless' });
          this.refreshHostLayout();
        });

        this.gameModeContainer.add([decBtn, endBtn]);
      }
    }

    this.hostContainer.add(this.gameModeContainer);
  }

  renderRoster(width, startY) {
    if (this.rosterContainer) this.rosterContainer.destroy();
    this.rosterContainer = this.add.container(0, 0);

    const isCoop = this.selectedGame === 'tanks' && this.tanksSubMode === 'pve';
    const headerTitle = isCoop 
      ? `🛡️ COOPERATIVE SQUAD (${this.tanksPveType.toUpperCase()})` 
      : '⚔️ COMBATANTS (DEATHMATCH)';
    const headerColor = isCoop ? '#a78bfa' : '#38bdf8';

    const rosterHeader = this.add.text(28, startY - 12, headerTitle, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '10px',
      fontWeight: 'bold',
      color: headerColor,
      letterSpacing: 1
    }).setOrigin(0, 0.5);
    this.rosterContainer.add(rosterHeader);

    const players = network.getAllPlayers();
    const maxSlots = 4;
    const slotH = 42;

    for (let slot = 1; slot <= maxSlots; slot++) {
      const slotY = startY + (slot - 1) * (slotH + 6);
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
      badge.fillCircle(44, slotY + slotH / 2, 9);
      this.rosterContainer.add(badge);

      const slotNumText = this.add.text(44, slotY + slotH / 2, `${slot}`, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '11px',
        fontWeight: 'bold',
        color: '#000000'
      }).setOrigin(0.5);
      this.rosterContainer.add(slotNumText);

      if (player) {
        // Tag & Name
        const nameText = this.add.text(62, slotY + 9, `[${player.tag}] ${player.fullName || 'Player ' + slot}`, {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '12px',
          fontWeight: 'bold',
          color: color.str
        });
        this.rosterContainer.add(nameText);

        const defaultRole = player.isHost ? '★ ROOM HOST' : 'READY TO PLAY';
        const coopRole = player.isHost ? '★ SQUAD LEADER' : 'SQUAD MATE';
        const roleText = this.add.text(62, slotY + 25, isCoop ? coopRole : defaultRole, {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '9px',
          color: isCoop ? '#c4b5fd' : '#94a3b8'
        });
        this.rosterContainer.add(roleText);


        // Host Kick Controls (for slots 2, 3, 4)
        if (this.currentMode === 'host' && slot > 1) {
          // Support right-click and long-press on slot (narrowed to leave right side clear)
          const rowInteractiveW = width - 48 - 46;
          const slotZone = this.add.zone(24 + rowInteractiveW / 2, slotY + slotH / 2, rowInteractiveW, slotH).setInteractive({ useHandCursor: true });
          this.rosterContainer.add(slotZone);
          let pressTimer = null;
          slotZone.on('pointerdown', (pointer) => {
            if (pointer.rightButtonDown?.()) {
              audio.playHit?.();
              network.kickPlayer(slot, 'Removed by room host');
            } else {
              pressTimer = setTimeout(() => {
                audio.playHit?.();
                network.kickPlayer(slot, 'Removed by room host');
              }, 500);
            }
          });
          slotZone.on('pointerup', () => { if (pressTimer) clearTimeout(pressTimer); });
          slotZone.on('pointerout', () => { if (pressTimer) clearTimeout(pressTimer); });

          // Kick Button (placed after slotZone with depth 10)
          const kickBtn = this.add.container(width - 50, slotY + slotH / 2);
          const kBg = this.add.graphics();
          kBg.fillStyle(0xef4444, 0.85);
          kBg.fillRoundedRect(-12, -12, 24, 24, 6);
          kickBtn.add(kBg);
          const kText = this.add.text(0, 0, '✕', {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#ffffff'
          }).setOrigin(0.5);
          kickBtn.add(kText);

          const kZone = this.add.zone(0, 0, 32, 32).setInteractive({ useHandCursor: true });
          kickBtn.add(kZone);
          kZone.on('pointerdown', (pointer) => {
            pointer.event?.stopPropagation?.();
            audio.playHit?.();
            network.kickPlayer(slot, 'Removed by room host');
          });
          kickBtn.setDepth(10);
          this.rosterContainer.add(kickBtn);
        } else {
          // Ping indicator
          const pingText = this.add.text(width - 42, slotY + slotH / 2, player.isHost ? 'HOST' : `${player.ping || 20}ms`, {
            fontFamily: 'Courier New, monospace',
            fontSize: '11px',
            color: '#4ade80'
          }).setOrigin(1, 0.5);
          this.rosterContainer.add(pingText);
        }
      } else {
        const waitingText = this.add.text(62, slotY + slotH / 2, `Waiting for Player ${slot}...`, {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '11px',
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

  createLobbyChat(width, startY) {
    if (this.chatContainer) this.chatContainer.destroy();
    this.chatContainer = this.add.container(0, 0);

    const chatCard = this.add.graphics();
    chatCard.fillStyle(0x0a0f1d, 0.9);
    chatCard.fillRoundedRect(24, startY, width - 48, 122, 10);
    chatCard.lineStyle(1.5, 0x334155, 0.8);
    chatCard.strokeRoundedRect(24, startY, width - 48, 122, 10);
    this.chatContainer.add(chatCard);

    // Chat Title
    const chatTitle = this.add.text(36, startY + 14, '💬 LOBBY CHAT', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#38bdf8',
      letterSpacing: 1
    }).setOrigin(0, 0.5);
    this.chatContainer.add(chatTitle);

    // Recent Messages Box (4 messages as per AC-8)
    this.chatMsgTexts = [];
    const maxMsgs = 4;
    for (let m = 0; m < maxMsgs; m++) {
      const msgY = startY + 30 + m * 14;
      const t = this.add.text(36, msgY, '', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '10px',
        color: '#e2e8f0'
      }).setOrigin(0, 0.5);
      this.chatMsgTexts.push(t);
      this.chatContainer.add(t);
    }
    this.updateChatMessages();

    // Quick-Chat Chips Row (AC-8 compliant strings)
    const chipsY = startY + 98;
    const chips = ['👋 Hello!', '👍 Ready!', '🔥 Let\'s play!', '🕹️ Change game!'];
    const availableW = width - 48 - 16;
    const chipW = Math.floor((availableW - (chips.length - 1) * 4) / chips.length);
    const chipH = 20;
    const chipStartX = 24 + 8 + chipW / 2;

    chips.forEach((cText, idx) => {
      const cx = chipStartX + idx * (chipW + 4);
      const chip = this.add.container(cx, chipsY);

      const cBg = this.add.graphics();
      cBg.fillStyle(0x1e293b, 1);
      cBg.fillRoundedRect(-chipW / 2, -chipH / 2, chipW, chipH, 6);
      cBg.lineStyle(1, 0x475569, 1);
      cBg.strokeRoundedRect(-chipW / 2, -chipH / 2, chipW, chipH, 6);
      chip.add(cBg);

      const label = this.add.text(0, 0, cText, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '9px',
        fontWeight: 'bold',
        color: '#38bdf8'
      }).setOrigin(0.5);
      chip.add(label);

      const cZone = this.add.zone(0, 0, chipW, chipH).setInteractive({ useHandCursor: true });
      chip.add(cZone);
      cZone.on('pointerdown', () => {
        audio.playBounce?.();
        network.sendChat(cText);
      });

      this.chatContainer.add(chip);
    });

    // Custom Chat Button on Title Right
    const customChatBtn = this.add.container(width - 56, startY + 14);
    const cbBg = this.add.graphics();
    cbBg.fillStyle(0x0284c7, 0.9);
    cbBg.fillRoundedRect(-28, -10, 56, 20, 6);
    customChatBtn.add(cbBg);
    const cbText = this.add.text(0, 0, 'TYPE ✏️', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '9px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    customChatBtn.add(cbText);
    const cbZone = this.add.zone(0, 0, 56, 20).setInteractive({ useHandCursor: true });
    customChatBtn.add(cbZone);
    cbZone.on('pointerdown', () => {
      audio.playBounce?.();
      const entered = typeof window !== 'undefined' && typeof window.prompt === 'function'
        ? window.prompt('Enter message to lobby (max 50 chars):')
        : null;
      if (entered) {
        const clean = entered.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 50);
        if (clean) {
          network.sendChat(clean);
        }
      }
    });
    this.chatContainer.add(customChatBtn);

    if (this.currentMode === 'host') {
      this.hostContainer.add(this.chatContainer);
    } else {
      this.joinContainer.add(this.chatContainer);
    }
  }

  updateChatMessages() {
    if (!this.chatMsgTexts) return;
    const msgs = this.chatMessages.slice(-4);
    for (let i = 0; i < 4; i++) {
      const t = this.chatMsgTexts[i];
      if (t) {
        if (i < msgs.length) {
          const m = msgs[i];
          const time = m.timestamp ? new Date(m.timestamp) : null;
          const timeStr = time
            ? `[${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}] `
            : '';
          t.setText(`${timeStr}[${m.tag}] ${m.text}`);
          t.setColor('#e2e8f0');
        } else {
          t.setText(i === 0 && msgs.length === 0 ? 'No chat messages yet...' : '');
          t.setColor('#64748b');
        }
      }
    }
  }

  createStartMatchButton(width, y) {
    if (this.startBtn) this.startBtn.destroy();
    this.startBtn = this.add.container(width / 2, y);

    const btnW = width - 48;
    const btnH = 44;

    this.startBtnBg = this.add.graphics();
    this.startBtn.add(this.startBtnBg);

    this.startBtnText = this.add.text(0, 0, '', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      letterSpacing: 1
    }).setOrigin(0.5);
    this.startBtn.add(this.startBtnText);

    this.startBtnZone = this.add.zone(0, 0, btnW, btnH).setInteractive({ useHandCursor: true });
    this.startBtn.add(this.startBtnZone);

    this.startBtnZone.on('pointerdown', () => {
      const count = network.getAllPlayers().length;
      if (count >= 2) {
        audio.playVictory?.();
        network.startGame({ 
          mode: this.selectedGame,
          tanksSubMode: this.tanksSubMode,
          tanksPveType: this.tanksPveType,
          poolSubMode: this.poolSubMode
        });
      } else {
        audio.playHit?.();
      }
    });

    this.updateStartButtonVisuals();
    this.hostContainer.add(this.startBtn);
  }

  updateStartButtonVisuals() {
    if (!this.startBtn || !this.startBtnBg || !this.startBtnText) return;
    const width = this.scale.width;
    const btnW = width - 48;
    const btnH = 44;

    const count = network.getAllPlayers().length;
    const canStart = count >= 2;

    this.startBtnBg.clear();
    this.startBtnBg.fillStyle(canStart ? 0x16a34a : 0x1e293b, 1);
    this.startBtnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
    this.startBtnBg.lineStyle(2, canStart ? 0x4ade80 : 0x475569, 1);
    this.startBtnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);

    const modeLabel = this.selectedGame === 'tanks'
      ? (this.tanksSubMode === 'pve' ? `CO-OP ${this.tanksPveType.toUpperCase()}` : 'PVP ARENA')
      : (this.selectedGame === 'pool' ? `POOL (${(this.poolSubMode || '8ball').toUpperCase()})` : 'PONG DUEL');
    const title = canStart
      ? `START ${modeLabel} (${count} PLAYERS) ▶`
      : 'WAITING FOR PLAYERS (MIN 2 NEEDED)...';

    this.startBtnText.setText(title);
    this.startBtnText.setColor(canStart ? '#ffffff' : '#64748b');
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
      connCard.fillRoundedRect(24, 135, width - 48, 75, 10);
      connCard.lineStyle(1.5, 0x4ade80, 0.8);
      connCard.strokeRoundedRect(24, 135, width - 48, 75, 10);
      this.joinContainer.add(connCard);

      this.joinContainer.add(this.add.text(width / 2, 158, `CONNECTED TO ROOM ${network.roomCode}!`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#4ade80'
      }).setOrigin(0.5));

      this.joinContainer.add(this.add.text(width / 2, 185, 'Waiting for Host to start match...', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        color: '#94a3b8'
      }).setOrigin(0.5));

      // Display Roster
      this.renderRoster(width, 220);

      // Display Lobby Chat
      this.createLobbyChat(width, 420);
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

    // 2. 4 Code Slots with interactive touch chevrons & keyboard/wheel input
    const slotStartX = width / 2 - (4 * 56) / 2 + 28;
    const slotY = 220;
    this.joinSlotTexts = [];
    this.joinSlotBgs = [];

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
      this.joinSlotBgs.push(sBg);

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
        audio.playBounce?.();
        this.selectedJoinSlot = i;
        this.updateJoinSlotHighlights();
        this.cycleJoinChar(i, 1);
      });
      this.joinContainer.add(up);
      this.joinContainer.add(upZone);

      // Chevron Down
      const down = this.add.text(sx, slotY + 42, '▼', { fontSize: '13px', color: '#64748b' }).setOrigin(0.5);
      const downZone = this.add.zone(sx, slotY + 42, 40, 24).setInteractive({ useHandCursor: true });
      downZone.on('pointerdown', () => {
        audio.playBounce?.();
        this.selectedJoinSlot = i;
        this.updateJoinSlotHighlights();
        this.cycleJoinChar(i, -1);
      });
      this.joinContainer.add(down);
      this.joinContainer.add(downZone);

      // Click on Slot to Select & scroll wheel
      const slotHit = this.add.zone(sx, slotY, 48, 60).setInteractive({ useHandCursor: true });
      slotHit.on('pointerdown', () => {
        this.selectedJoinSlot = i;
        this.updateJoinSlotHighlights();
      });
      slotHit.on('wheel', (pointer, deltaX, deltaY) => {
        this.selectedJoinSlot = i;
        this.updateJoinSlotHighlights();
        this.cycleJoinChar(i, deltaY > 0 ? -1 : 1);
      });
      this.joinContainer.add(slotHit);
    }

    // 3. Type/Paste Code Button (Mobile keyboard fallback)
    const typeBtn = this.add.container(width / 2, 292);
    const tBg = this.add.graphics();
    tBg.fillStyle(0x1e293b, 1);
    tBg.fillRoundedRect(-100, -14, 200, 28, 6);
    tBg.lineStyle(1, 0x38bdf8, 0.8);
    tBg.strokeRoundedRect(-100, -14, 200, 28, 6);
    typeBtn.add(tBg);

    const tText = this.add.text(0, 0, '⌨️ TYPE / PASTE CODE', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5);
    typeBtn.add(tText);

    const tZone = this.add.zone(0, 0, 200, 28).setInteractive({ useHandCursor: true });
    typeBtn.add(tZone);
    tZone.on('pointerdown', () => {
      audio.playBounce?.();
      const val = typeof window !== 'undefined' && typeof window.prompt === 'function'
        ? window.prompt('Enter 4-character room code:', this.joinCodeChars.join(''))
        : null;
      if (val) {
        const clean = NetworkManager.sanitizeRoomCode(val).slice(0, 4);
        if (clean) {
          for (let j = 0; j < 4; j++) {
            this.joinCodeChars[j] = clean[j] || 'A';
          }
          this.updateJoinSlotDisplay();
          if (clean.length >= 4) {
            this.executeJoinRoom(clean);
          }
        }
      }
    });
    this.joinContainer.add(typeBtn);

    // 4. Connect Button
    const connectBtnW = width - 64;
    const connectBtn = this.add.container(width / 2, 345);
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

    // 5. Status Message
    this.joinStatusText = this.add.text(width / 2, 410, this.joinStatus, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      color: '#f87171',
      align: 'center'
    }).setOrigin(0.5);
    this.joinContainer.add(this.joinStatusText);
  }

  updateJoinSlotHighlights() {
    if (!this.joinSlotBgs || this.joinSlotBgs.length < 4) return;
    const slotStartX = this.scale.width / 2 - (4 * 56) / 2 + 28;
    const slotY = 220;

    for (let i = 0; i < 4; i++) {
      const sx = slotStartX + i * 56;
      const isCur = i === this.selectedJoinSlot;
      const sBg = this.joinSlotBgs[i];
      if (sBg && sBg.clear) {
        sBg.clear();
        sBg.fillStyle(0x0f172a, 0.95);
        sBg.fillRoundedRect(sx - 24, slotY - 30, 48, 60, 8);
        sBg.lineStyle(1.5, isCur ? 0xfacc15 : 0x38bdf8, 1);
        sBg.strokeRoundedRect(sx - 24, slotY - 30, 48, 60, 8);
      }
    }
  }

  updateJoinSlotDisplay() {
    if (!this.joinSlotTexts) return;
    for (let i = 0; i < 4; i++) {
      if (this.joinSlotTexts[i]) {
        this.joinSlotTexts[i].setText(this.joinCodeChars[i]);
      }
    }
  }

  cycleJoinChar(index, delta) {
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
      if (network.gameOptions) {
        if (network.gameOptions.tanksSubMode) this.tanksSubMode = network.gameOptions.tanksSubMode;
        if (network.gameOptions.tanksPveType) this.tanksPveType = network.gameOptions.tanksPveType;
        if (network.gameOptions.poolSubMode) this.poolSubMode = network.gameOptions.poolSubMode;
      }
      if (network.gameMode) {
        this.selectedGame = network.gameMode;
      }
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
      network.on('player-joined', () => {
        audio.playShoot?.();
        if (this.currentMode === 'host') {
          this.refreshHostLayout();
        } else {
          this.renderRoster(this.scale.width, 220);
        }
        this.updateStartButtonVisuals();
      }),
      network.on('player-left', () => {
        audio.playHit?.();
        if (this.currentMode === 'host') {
          this.refreshHostLayout();
        } else {
          this.renderRoster(this.scale.width, 220);
        }
        this.updateStartButtonVisuals();
      }),
      network.on('lobby-updated', (data) => {
        if (data.gameMode) this.selectedGame = data.gameMode;
        if (data.gameOptions) {
          if (data.gameOptions.tanksSubMode) this.tanksSubMode = data.gameOptions.tanksSubMode;
          if (data.gameOptions.tanksPveType) this.tanksPveType = data.gameOptions.tanksPveType;
          if (data.gameOptions.poolSubMode) this.poolSubMode = data.gameOptions.poolSubMode;
        }
        if (this.currentMode === 'host') {
          this.refreshHostLayout();
        } else {
          this.renderRoster(this.scale.width, 220);
        }
        this.updateStartButtonVisuals();
      }),
      network.on('game-start', (packet) => {
        audio.playVictory?.();
        const mode = packet.gameMode || 'tanks';
        if (mode === 'pong') {
          this.scene.start('MultiplayerPong', { isHost: network.isHost });
        } else if (mode === 'pool') {
          this.scene.start('MultiplayerPool', {
            isHost: network.isHost,
            poolSubMode: packet.poolSubMode || this.poolSubMode || '8ball'
          });
        } else {
          this.scene.start('MultiplayerTanks', { 
            isHost: network.isHost, 
            seed: packet.seed,
            tanksSubMode: packet.tanksSubMode || this.tanksSubMode || 'pvp',
            tanksPveType: packet.tanksPveType || this.tanksPveType || 'decades'
          });
        }
      }),
      network.on('lobby-chat', (packet) => {
        audio.playBounce?.();
        this.chatMessages.push(packet);
        if (this.chatMessages.length > 20) this.chatMessages.shift();
        this.updateChatMessages();
      }),
      network.on('kicked', (packet) => {
        audio.playExplosion?.();
        this.isConnected = false;
        this.joinStatus = packet?.reason || 'You were removed from the lobby by the host.';
        this.showJoinPanel(this.scale.width, this.scale.height);
      }),
      network.on('host-disconnected', () => {
        if (this.currentMode === 'join') {
          audio.playExplosion?.();
          this.isConnected = false;
          this.joinStatus = 'Host disconnected from room.';
          this.showJoinPanel(this.scale.width, this.scale.height);
        }
      })
    );
  }

  teardownListeners() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    if (this.keyListener && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.keyListener);
      this.keyListener = null;
    }
  }
}
