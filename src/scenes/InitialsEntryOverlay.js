// src/scenes/InitialsEntryOverlay.js
// Retro 3-character arcade initials spinner for high score submission

import { leaderboardService } from '../systems/LeaderboardService.js';
import { audio } from '../systems/AudioManager.js';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789★!? ';

export class InitialsEntryOverlayScene extends Phaser.Scene {
  constructor() {
    super('InitialsEntryOverlay');
  }

  init(data) {
    this.gameId = data.gameId || 'invaders';
    this.score = data.score || 0;
    this.detail = data.detail || '';
    this.returnScene = data.returnScene || 'GameSelect';

    const saved = leaderboardService.getPlayerInitials();
    this.initials = [
      saved[0] || 'A',
      saved[1] || 'L',
      saved[2] || 'L'
    ];
    this.activeSlot = 0;
  }

  create() {
    const { width, height } = this.cameras.main;

    // Semi-transparent backdrop
    const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.85);
    backdrop.setOrigin(0, 0);
    backdrop.setInteractive(); // Absorb clicks

    // Card frame
    const cardW = Math.min(width - 40, 420);
    const cardH = 460;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    const card = this.add.graphics();
    card.fillStyle(0x0f172a, 0.98);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, 16);
    card.lineStyle(2, 0x38bdf8, 0.9);
    card.strokeRoundedRect(cardX, cardY, cardW, cardH, 16);

    // Title & Score header
    this.add.text(width / 2, cardY + 36, '🏆 HIGH SCORE ENTRY 🏆', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '20px',
      fontWeight: '900',
      color: '#facc15'
    }).setOrigin(0.5);

    const gameNames = {
      tanks: 'BIRTHDAY TANKS',
      pong: 'BIRTHDAY PONG',
      invaders: 'SPACE INVADERS',
      asteroids: 'BIRTHDAY ASTEROIDS'
    };
    const titleText = gameNames[this.gameId] || this.gameId.toUpperCase();

    this.add.text(width / 2, cardY + 68, `${titleText}`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#94a3b8'
    }).setOrigin(0.5);

    this.add.text(width / 2, cardY + 104, `${this.score.toLocaleString()} PTS`, {
      fontFamily: 'monospace',
      fontSize: '26px',
      fontWeight: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5);

    if (this.detail) {
      this.add.text(width / 2, cardY + 132, this.detail, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        color: '#a855f7'
      }).setOrigin(0.5);
    }

    this.add.text(width / 2, cardY + 168, 'ENTER YOUR INITIALS:', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#cbd5e1'
    }).setOrigin(0.5);

    // 3 Letter Slots & Spinners
    this.slotContainers = [];
    this.slotLetters = [];
    this.slotChevrons = [];

    const slotSpacing = 68;
    const startX = width / 2 - slotSpacing;
    const slotY = cardY + 235;

    for (let i = 0; i < 3; i++) {
      const cx = startX + i * slotSpacing;
      const slotBox = this.add.container(cx, slotY);

      // Chevron UP
      const upBtn = this.add.text(0, -50, '▲', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#38bdf8'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      upBtn.on('pointerdown', () => this.cycleChar(i, 1));

      // Slot background
      const sBg = this.add.graphics();
      sBg.fillStyle(0x1e293b, 1);
      sBg.fillRoundedRect(-26, -30, 52, 60, 8);
      sBg.lineStyle(2, i === this.activeSlot ? 0xfacc15 : 0x475569, 1);
      sBg.strokeRoundedRect(-26, -30, 52, 60, 8);
      slotBox.add(sBg);

      // Letter text
      const lText = this.add.text(0, 0, this.initials[i], {
        fontFamily: 'monospace',
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);
      slotBox.add(lText);

      // Chevron DOWN
      const downBtn = this.add.text(0, 50, '▼', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#38bdf8'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      downBtn.on('pointerdown', () => this.cycleChar(i, -1));

      slotBox.add(upBtn);
      slotBox.add(downBtn);

      // Tap slot to activate
      slotBox.setSize(52, 60);
      slotBox.setInteractive({ useHandCursor: true });
      slotBox.on('pointerdown', () => {
        this.activeSlot = i;
        this.updateSlotHighlights();
      });

      this.slotContainers.push(slotBox);
      this.slotLetters.push(lText);
    }

    // Keyboard support
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown', (event) => {
        const key = event.key.toUpperCase();
        if (CHARS.includes(key)) {
          this.initials[this.activeSlot] = key;
          audio.playTankShoot?.();
          this.updateSlotDisplay();
          this.activeSlot = Math.min(2, this.activeSlot + 1);
          this.updateSlotHighlights();
        } else if (event.key === 'Backspace') {
          this.initials[this.activeSlot] = ' ';
          this.updateSlotDisplay();
          this.activeSlot = Math.max(0, this.activeSlot - 1);
          this.updateSlotHighlights();
        } else if (event.key === 'ArrowUp') {
          this.cycleChar(this.activeSlot, 1);
        } else if (event.key === 'ArrowDown') {
          this.cycleChar(this.activeSlot, -1);
        } else if (event.key === 'ArrowRight') {
          this.activeSlot = (this.activeSlot + 1) % 3;
          this.updateSlotHighlights();
        } else if (event.key === 'ArrowLeft') {
          this.activeSlot = (this.activeSlot + 2) % 3;
          this.updateSlotHighlights();
        } else if (event.key === 'Enter') {
          this.submit();
        }
      });
    }

    // SUBMIT BUTTON
    const submitBtn = this.add.container(width / 2, cardY + 340);
    const subBg = this.add.graphics();
    subBg.fillStyle(0x059669, 1);
    subBg.fillRoundedRect(-110, -24, 220, 48, 12);
    subBg.lineStyle(2, 0x34d399, 1);
    subBg.strokeRoundedRect(-110, -24, 220, 48, 12);
    submitBtn.add(subBg);

    const subText = this.add.text(0, 0, 'SUBMIT SCORE ▶', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '15px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    submitBtn.add(subText);
    submitBtn.setSize(220, 48);
    submitBtn.setInteractive({ useHandCursor: true });
    submitBtn.on('pointerdown', () => this.submit());

    // SKIP BUTTON
    const skipBtn = this.add.text(width / 2, cardY + 410, 'SKIP FOR NOW', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#64748b'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    skipBtn.on('pointerdown', () => {
      this.scene.stop();
      if (this.returnScene && this.scene.isSleeping(this.returnScene)) {
        this.scene.wake(this.returnScene);
      } else {
        this.scene.start('GameSelect');
      }
    });

    this.submitBtn = submitBtn;
    this.subText = subText;
    this.isSubmitting = false;
  }

  cycleChar(slotIndex, delta) {
    const curChar = this.initials[slotIndex];
    let idx = CHARS.indexOf(curChar);
    if (idx === -1) idx = 0;
    idx = (idx + delta + CHARS.length) % CHARS.length;
    this.initials[slotIndex] = CHARS[idx];
    this.activeSlot = slotIndex;
    audio.playPongPaddle?.();
    this.updateSlotDisplay();
    this.updateSlotHighlights();
  }

  updateSlotDisplay() {
    for (let i = 0; i < 3; i++) {
      if (this.slotLetters[i]) {
        this.slotLetters[i].setText(this.initials[i]);
      }
    }
  }

  updateSlotHighlights() {
    for (let i = 0; i < 3; i++) {
      const container = this.slotContainers[i];
      if (container) {
        const bg = container.list[0];
        if (bg && bg.clear) {
          bg.clear();
          bg.fillStyle(0x1e293b, 1);
          bg.fillRoundedRect(-26, -30, 52, 60, 8);
          bg.lineStyle(2, i === this.activeSlot ? 0xfacc15 : 0x475569, 1);
          bg.strokeRoundedRect(-26, -30, 52, 60, 8);
        }
      }
    }
  }

  async submit() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.subText.setText('SUBMITTING...');
    audio.playPowerup?.();

    const initialsStr = this.initials.join('');
    try {
      await leaderboardService.submitScore(this.gameId, initialsStr, this.score, this.detail);
    } catch (err) {
      console.warn('Leaderboard submit failed (cached locally):', err);
    }

    if (!this.sys || !this.sys.isActive() || !this.scene || !this.scene.isActive()) {
      return;
    }

    this.scene.stop();
    // Launch Leaderboard Modal showing this game's ranks!
    this.scene.launch('LeaderboardModal', {
      gameId: this.gameId,
      returnScene: this.returnScene
    });
  }
}
