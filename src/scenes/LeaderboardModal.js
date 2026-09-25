// src/scenes/LeaderboardModal.js
// Monospace retro neon high score modal with game tabs, set tag/name button, and full-name hover/tap tooltips

import { leaderboardService } from '../systems/LeaderboardService.js';
import { audio } from '../systems/AudioManager.js';

const GAMES = [
  { id: 'tanks', label: 'TANKS' },
  { id: 'pong', label: 'PONG' },
  { id: 'invaders', label: 'INVADERS' },
  { id: 'asteroids', label: 'ASTEROIDS' },
  { id: 'pool', label: 'POOL' }
];

const POOL_SUBTYPES = [
  { id: 'pool_8ball', label: '8-BALL' },
  { id: 'pool_9ball', label: '9-BALL' },
  { id: 'pool_straight', label: 'STRAIGHT' },
  { id: 'pool_speed', label: 'SPEED' }
];

const SceneBase = typeof Phaser !== 'undefined' ? Phaser.Scene : class {};

export class LeaderboardModalScene extends SceneBase {
  static isMultiplayerEntry(detail) {
    if (!detail) return false;
    return String(detail).includes('⚔️') || String(detail).includes('MP PvP');
  }

  constructor() {
    super('LeaderboardModal');
  }

  init(data) {
    let initialGame = data.gameId || 'tanks';
    if (initialGame === 'pool') initialGame = 'pool_8ball';
    this.activeGameId = initialGame;
    this.returnScene = data.returnScene || 'GameSelect';
    this.isLoading = false;
    this.scores = [];
    this.isOnline = true;
    this.activeTooltipRow = -1;
  }

  create() {
    const { width, height } = this.cameras.main;

    // Semi-transparent backdrop
    const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.88);
    backdrop.setOrigin(0, 0);
    backdrop.setInteractive();
    backdrop.on('pointerdown', () => this.hideTooltip());

    // Modal frame
    const modalW = Math.min(width - 32, 440);
    const modalH = Math.min(height - 60, 680);
    const modalX = (width - modalW) / 2;
    const modalY = (height - modalH) / 2;
    this.modalBounds = { modalX, modalY, modalW, modalH };

    const modalGfx = this.add.graphics();
    modalGfx.fillStyle(0x0a0f1d, 0.98);
    modalGfx.fillRoundedRect(modalX, modalY, modalW, modalH, 16);
    modalGfx.lineStyle(2, 0x38bdf8, 0.85);
    modalGfx.strokeRoundedRect(modalX, modalY, modalW, modalH, 16);

    // Header Title
    this.add.text(width / 2, modalY + 32, '🏆 ALLAN ARCADE TOP 10 🏆', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '18px',
      fontWeight: '900',
      color: '#facc15'
    }).setOrigin(0.5);

    // Connection badge
    this.statusBadge = this.add.text(width / 2, modalY + 56, '● ONLINE', {
      fontFamily: 'monospace',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#34d399'
    }).setOrigin(0.5);

    // 5 Game Navigation Tabs
    this.tabButtons = [];
    const tabW = (modalW - 40) / GAMES.length;
    const tabY = modalY + 90;

    GAMES.forEach((g, i) => {
      const tx = modalX + 20 + i * tabW + tabW / 2;
      const tabContainer = this.add.container(tx, tabY);

      const tBg = this.add.graphics();
      tabContainer.add(tBg);

      const tText = this.add.text(0, 0, g.label, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '10px',
        fontWeight: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);
      tabContainer.add(tText);

      const tabZone = this.add.zone(0, 0, tabW - 4, 30).setInteractive({ useHandCursor: true });
      tabContainer.add(tabZone);
      const onTabSelect = () => {
        const nextId = g.id === 'pool' ? (this.activeGameId.startsWith('pool') ? this.activeGameId : 'pool_8ball') : g.id;
        if (this.activeGameId !== nextId) {
          this.hideTooltip();
          this.activeGameId = nextId;
          audio.playMenuSelect?.();
          this.updateTabs();
          this.loadScores();
        }
      };
      tabZone.on('pointerdown', onTabSelect);
      tabContainer.on('pointerdown', onTabSelect);

      this.tabButtons.push({ id: g.id, container: tabContainer, zone: tabZone, bg: tBg, text: tText, w: tabW - 4 });
    });

    // Pool Sub-Tabs Container
    this.poolSubTabsContainer = this.add.container(0, 0);
    this.poolSubTabButtons = [];
    const subW = (modalW - 40) / POOL_SUBTYPES.length;
    const subY = modalY + 124;

    POOL_SUBTYPES.forEach((st, i) => {
      const sx = modalX + 20 + i * subW + subW / 2;
      const subContainer = this.add.container(sx, subY);

      const sBg = this.add.graphics();
      subContainer.add(sBg);

      const sText = this.add.text(0, 0, st.label, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '10px',
        fontWeight: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);
      subContainer.add(sText);

      const subZone = this.add.zone(0, 0, subW - 4, 24).setInteractive({ useHandCursor: true });
      subContainer.add(subZone);

      const onSubSelect = () => {
        if (this.activeGameId !== st.id) {
          this.hideTooltip();
          this.activeGameId = st.id;
          audio.playMenuSelect?.();
          this.updateTabs();
          this.loadScores();
        }
      };
      subZone.on('pointerdown', onSubSelect);
      this.poolSubTabsContainer.add(subContainer);
      this.poolSubTabButtons.push({ id: st.id, bg: sBg, text: sText, w: subW - 4 });
    });

    // Table Header Container
    this.tableHeaderContainer = this.add.container(0, 0);
    const tableHeaderY = modalY + 128;
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x1e293b, 0.8);
    headerBg.fillRect(modalX + 16, tableHeaderY - 12, modalW - 32, 24);
    this.tableHeaderContainer.add(headerBg);

    const rankH = this.add.text(modalX + 24, tableHeaderY, 'RANK', {
      fontFamily: 'monospace',
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#94a3b8'
    }).setOrigin(0, 0.5);
    this.tableHeaderContainer.add(rankH);

    const nameH = this.add.text(modalX + 72, tableHeaderY, 'NAME', {
      fontFamily: 'monospace',
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#94a3b8'
    }).setOrigin(0, 0.5);
    this.tableHeaderContainer.add(nameH);

    const scoreH = this.add.text(modalX + 130, tableHeaderY, 'SCORE', {
      fontFamily: 'monospace',
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#94a3b8'
    }).setOrigin(0, 0.5);
    this.tableHeaderContainer.add(scoreH);

    const detailH = this.add.text(modalX + modalW - 74, tableHeaderY, 'DETAIL', {
      fontFamily: 'monospace',
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#94a3b8'
    }).setOrigin(1, 0.5);
    this.tableHeaderContainer.add(detailH);

    const dateH = this.add.text(modalX + modalW - 24, tableHeaderY, 'DATE', {
      fontFamily: 'monospace',
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#94a3b8'
    }).setOrigin(1, 0.5);
    this.tableHeaderContainer.add(dateH);

    this.updateTabs();

    // Dynamic Scores Container
    this.tableRowsContainer = this.add.container(0, 0);

    // Bottom Action Buttons: REFRESH, SET TAG/NAME, and CLOSE
    const btnY = modalY + modalH - 36;
    const sideBtnW = 84;
    const centerBtnW = 148;

    // 1. Refresh Button (Left)
    const refreshBtn = this.add.container(modalX + 58, btnY);
    const refBg = this.add.graphics();
    refBg.fillStyle(0x1e293b, 1);
    refBg.fillRoundedRect(-sideBtnW / 2, -18, sideBtnW, 36, 8);
    refBg.lineStyle(1.5, 0x475569, 1);
    refBg.strokeRoundedRect(-sideBtnW / 2, -18, sideBtnW, 36, 8);
    refreshBtn.add(refBg);

    const refText = this.add.text(0, 0, '🔄 REFRESH', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#cbd5e1'
    }).setOrigin(0.5);
    refreshBtn.add(refText);

    const refZone = this.add.zone(0, 0, sideBtnW, 36).setInteractive({ useHandCursor: true });
    refreshBtn.add(refZone);
    refZone.on('pointerdown', () => {
      audio.playPongPaddle?.();
      this.hideTooltip();
      this.loadScores();
    });

    // 2. Set Tag & Name Button (Center)
    const profileBtn = this.add.container(modalX + modalW / 2, btnY);
    const profBg = this.add.graphics();
    profBg.fillStyle(0x0284c7, 1);
    profBg.fillRoundedRect(-centerBtnW / 2, -18, centerBtnW, 36, 8);
    profBg.lineStyle(1.5, 0x38bdf8, 1);
    profBg.strokeRoundedRect(-centerBtnW / 2, -18, centerBtnW, 36, 8);
    profileBtn.add(profBg);

    const profText = this.add.text(0, 0, '👤 SET TAG/NAME', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    profileBtn.add(profText);

    const profZone = this.add.zone(0, 0, centerBtnW, 36).setInteractive({ useHandCursor: true });
    profileBtn.add(profZone);
    profZone.on('pointerdown', () => {
      audio.playMenuSelect?.();
      this.hideTooltip();
      this.scene.launch('InitialsEntryOverlay', {
        mode: 'profile',
        returnScene: 'LeaderboardModal'
      });
      this.scene.bringToTop('InitialsEntryOverlay');
      this.scene.pause();
    });

    // 3. Close Button (Right)
    const closeBtn = this.add.container(modalX + modalW - 58, btnY);
    const closeBg = this.add.graphics();
    closeBg.fillStyle(0xe11d48, 1);
    closeBg.fillRoundedRect(-sideBtnW / 2, -18, sideBtnW, 36, 8);
    closeBg.lineStyle(1.5, 0xfca5a5, 1);
    closeBg.strokeRoundedRect(-sideBtnW / 2, -18, sideBtnW, 36, 8);
    closeBtn.add(closeBg);

    const closeText = this.add.text(0, 0, '✕ CLOSE', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    closeBtn.add(closeText);

    const closeZone = this.add.zone(0, 0, sideBtnW, 36).setInteractive({ useHandCursor: true });
    closeBtn.add(closeZone);
    closeZone.on('pointerdown', () => this.closeModal());

    // Tooltip Container (Floating layer for hover/tap name reveal)
    this.tooltipContainer = this.add.container(0, 0).setDepth(200).setVisible(false);

    this.modalBounds = { modalX, modalY, modalW, modalH };

    // Reload scores when waking or resuming from profile edit
    const onReload = () => {
      this.hideTooltip();
      this.loadScores();
    };

    this.events.on('wake', onReload);
    this.events.on('resume', onReload);

    this.events.once('shutdown', () => {
      this.events.off('wake', onReload);
      this.events.off('resume', onReload);
    });

    // Initial load
    this.loadScores();
  }

  showTooltip(x, y, initials, fullName) {
    if (!fullName) return;
    this.tooltipContainer.removeAll(true);

    const cleanInitials = (initials || '???').trim();
    const cleanFullName = String(fullName).replace(/[\r\n\t]/g, ' ').trim().slice(0, 24);
    const textStr = `★ ${cleanInitials} ➜ ${cleanFullName}`;

    const ttText = this.add.text(0, 0, textStr, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#facc15'
    }).setOrigin(0.5);

    const textW = ttText.width + 20;
    const textH = Math.max(26, ttText.height + 10);

    const ttBg = this.add.graphics();
    ttBg.fillStyle(0x0f172a, 0.98);
    ttBg.fillRoundedRect(-textW / 2, -textH / 2, textW, textH, 6);
    ttBg.lineStyle(1.5, 0x38bdf8, 1);
    ttBg.strokeRoundedRect(-textW / 2, -textH / 2, textW, textH, 6);

    this.tooltipContainer.add([ttBg, ttText]);

    const { modalX, modalW } = this.modalBounds;
    const clampedX = Math.max(modalX + textW / 2 + 10, Math.min(modalX + modalW - textW / 2 - 10, x));
    this.tooltipContainer.setPosition(clampedX, y);
    this.tooltipContainer.setVisible(true);
  }

  hideTooltip() {
    if (this.tooltipContainer) {
      this.tooltipContainer.setVisible(false);
      this.tooltipContainer.removeAll(true);
    }
    this.activeTooltipRow = -1;
  }

  switchGame(gameId) {
    const nextId = gameId === 'pool' ? (this.activeGameId.startsWith('pool') ? this.activeGameId : 'pool_8ball') : gameId;
    if (this.activeGameId !== nextId) {
      this.hideTooltip();
      this.activeGameId = nextId;
      audio.playMenuSelect?.();
      this.updateTabs();
      this.loadScores();
    }
  }

  selectGame(gameId) {
    this.switchGame(gameId);
  }

  updateTabs() {
    const isPool = this.activeGameId.startsWith('pool');

    // Toggle sub-tabs visibility and shift table header
    if (this.poolSubTabsContainer) {
      this.poolSubTabsContainer.setVisible(isPool);
    }
    if (this.tableHeaderContainer) {
      this.tableHeaderContainer.setY(isPool ? 30 : 0);
    }

    this.tabButtons.forEach((tab) => {
      const isActive = tab.id === this.activeGameId || (tab.id === 'pool' && isPool);
      tab.bg.clear();
      if (isActive) {
        tab.bg.fillStyle(0x0284c7, 1);
        tab.bg.fillRoundedRect(-tab.w / 2, -15, tab.w, 30, 6);
        tab.bg.lineStyle(1.5, 0x38bdf8, 1);
        tab.bg.strokeRoundedRect(-tab.w / 2, -15, tab.w, 30, 6);
        tab.text.setColor('#ffffff');
      } else {
        tab.bg.fillStyle(0x1e293b, 0.7);
        tab.bg.fillRoundedRect(-tab.w / 2, -15, tab.w, 30, 6);
        tab.bg.lineStyle(1, 0x334155, 0.8);
        tab.bg.strokeRoundedRect(-tab.w / 2, -15, tab.w, 30, 6);
        tab.text.setColor('#94a3b8');
      }
    });

    if (this.poolSubTabButtons) {
      this.poolSubTabButtons.forEach((subTab) => {
        const isSubActive = subTab.id === this.activeGameId;
        subTab.bg.clear();
        if (isSubActive) {
          subTab.bg.fillStyle(0x059669, 1);
          subTab.bg.fillRoundedRect(-subTab.w / 2, -12, subTab.w, 24, 5);
          subTab.bg.lineStyle(1.5, 0x34d399, 1);
          subTab.bg.strokeRoundedRect(-subTab.w / 2, -12, subTab.w, 24, 5);
          subTab.text.setColor('#ffffff');
        } else {
          subTab.bg.fillStyle(0x0f172a, 0.85);
          subTab.bg.fillRoundedRect(-subTab.w / 2, -12, subTab.w, 24, 5);
          subTab.bg.lineStyle(1, 0x334155, 0.8);
          subTab.bg.strokeRoundedRect(-subTab.w / 2, -12, subTab.w, 24, 5);
          subTab.text.setColor('#94a3b8');
        }
      });
    }
  }

  async loadScores() {
    if (this.isLoading) return;
    this.isLoading = true;

    this.renderLoading();

    const targetGameId = this.activeGameId;
    let data;
    try {
      data = await leaderboardService.fetchLeaderboard(targetGameId, 10);
    } catch (err) {
      data = { online: false, results: [] };
    }

    if (!this.sys || !this.sys.isActive() || !this.scene || !this.scene.isActive() || this.activeGameId !== targetGameId) {
      this.isLoading = false;
      return;
    }

    this.isLoading = false;
    this.isOnline = data.online;

    if (this.statusBadge && this.statusBadge.active) {
      if (this.isOnline) {
        this.statusBadge.setText('● ONLINE (CLOUDFLARE D1)');
        this.statusBadge.setColor('#34d399');
      } else {
        this.statusBadge.setText('○ LOCAL (OFFLINE)');
        this.statusBadge.setColor('#f59e0b');
      }
    }

    this.scores = data.results || [];
    this.renderScores();
  }

  renderLoading() {
    this.tableRowsContainer.removeAll(true);
    const { modalX, modalY, modalW, modalH } = this.modalBounds;
    const loadingText = this.add.text(modalX + modalW / 2, modalY + modalH / 2 - 20, 'CONNECTING TO LEADERBOARD...', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#38bdf8'
    }).setOrigin(0.5);
    this.tableRowsContainer.add(loadingText);
  }

  renderScores() {
    this.tableRowsContainer.removeAll(true);
    const { modalX, modalY, modalW } = this.modalBounds;
    const isPool = this.activeGameId.startsWith('pool');
    const startY = isPool ? modalY + 184 : modalY + 156;
    const rowHeight = isPool ? 33 : 36;

    if (this.scores.length === 0) {
      const emptyText = this.add.text(
        modalX + modalW / 2,
        modalY + 280,
        'NO SCORES RECORDED YET!\nPLAY AND BE THE FIRST TO RANK!',
        {
          fontFamily: 'monospace',
          fontSize: '13px',
          align: 'center',
          color: '#64748b',
          lineSpacing: 8
        }
      ).setOrigin(0.5);
      this.tableRowsContainer.add(emptyText);
      return;
    }

    this.scores.forEach((row, i) => {
      const ry = startY + i * rowHeight;

      // Row background zebra striping
      if (i % 2 === 1) {
        const stripe = this.add.graphics();
        stripe.fillStyle(0x1e293b, 0.4);
        stripe.fillRect(modalX + 16, ry - 14, modalW - 32, 28);
        this.tableRowsContainer.add(stripe);
      }

      // Rank styling
      let rankColor = '#94a3b8';
      let rankPrefix = `#${row.rank || i + 1}`;
      if (i === 0) {
        rankColor = '#facc15';
        rankPrefix = `👑 #1`;
      } else if (i === 1) {
        rankColor = '#e2e8f0';
        rankPrefix = `🥈 #2`;
      } else if (i === 2) {
        rankColor = '#f97316';
        rankPrefix = `🥉 #3`;
      }

      const rankText = this.add.text(modalX + 24, ry, rankPrefix, {
        fontFamily: 'monospace',
        fontSize: '11px',
        fontWeight: 'bold',
        color: rankColor
      }).setOrigin(0, 0.5);

      const isMultiplayer = LeaderboardModalScene.isMultiplayerEntry(row.detail);
      const mpPrefix = isMultiplayer ? '⚔️ ' : '';
      const rowFullName = row.fullName || row.full_name || '';
      const displayName = `${mpPrefix}${rowFullName ? `${row.initials || '???'} •` : (row.initials || '???')}`;

      const nameText = this.add.text(modalX + 68, ry, displayName, {
        fontFamily: 'monospace',
        fontSize: '11px',
        fontWeight: 'bold',
        color: isMultiplayer ? '#f43f5e' : (rowFullName ? '#38bdf8' : '#ffffff')
      }).setOrigin(0, 0.5);

      if (rowFullName) {
        const hitZone = this.add.zone(modalX + 90, ry, 68, 26).setInteractive({ useHandCursor: true });
        hitZone.on('pointerover', () => {
          this.showTooltip(modalX + 115, ry - 20, `${mpPrefix}${row.initials}`, isMultiplayer ? `${rowFullName} (Multiplayer PvP)` : rowFullName);
        });
        hitZone.on('pointerout', () => {
          this.hideTooltip();
        });
        hitZone.on('pointerdown', (pointer) => {
          if (pointer.event?.stopPropagation) pointer.event.stopPropagation();
          if (this.activeTooltipRow === i) {
            this.hideTooltip();
          } else {
            this.showTooltip(modalX + 115, ry - 20, `${mpPrefix}${row.initials}`, isMultiplayer ? `${rowFullName} (Multiplayer PvP)` : rowFullName);
            this.activeTooltipRow = i;
          }
        });
        this.tableRowsContainer.add(hitZone);
      }

      const scoreText = this.add.text(modalX + 130, ry, Number(row.score).toLocaleString(), {
        fontFamily: 'monospace',
        fontSize: '12px',
        fontWeight: 'bold',
        color: i === 0 ? '#facc15' : '#38bdf8'
      }).setOrigin(0, 0.5);

      const detailText = this.add.text(modalX + modalW - 74, ry, String(row.detail || '').slice(0, 16), {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '10px',
        color: '#a855f7'
      }).setOrigin(1, 0.5);

      let dateStr = '';
      const rawDate = row.createdAt || row.created_at;
      if (rawDate) {
        try {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            dateStr = `${m}/${day}`;
          }
        } catch {
          dateStr = '';
        }
      }

      const dateText = this.add.text(modalX + modalW - 24, ry, dateStr, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#64748b'
      }).setOrigin(1, 0.5);

      this.tableRowsContainer.add([rankText, nameText, scoreText, detailText, dateText]);
    });
  }

  closeModal() {
    audio.playMenuSelect?.();
    this.hideTooltip();
    this.scene.stop();
    if (this.returnScene && this.scene.isSleeping(this.returnScene)) {
      this.scene.wake(this.returnScene);
    }
  }
}
