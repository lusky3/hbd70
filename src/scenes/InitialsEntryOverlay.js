// src/scenes/InitialsEntryOverlay.js
// Retro 3-character arcade initials spinner with optional full name entry and profanity validation

import { leaderboardService } from '../systems/LeaderboardService.js';
import { storage } from '../systems/Storage.js';
import { audio } from '../systems/AudioManager.js';
import { validatePlayerIdentity } from '../utils/ProfanityFilter.js';

export const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789★!? ';

const SceneBase = typeof Phaser !== 'undefined' ? Phaser.Scene : class {};

export class InitialsEntryOverlayScene extends SceneBase {
  constructor() {
    super('InitialsEntryOverlay');
  }

  init(data) {
    this.mode = data.mode || 'submit'; // 'submit' or 'profile'
    this.gameId = data.gameId || 'invaders';
    this.score = data.score || 0;
    this.detail = data.detail || '';
    this.returnScene = data.returnScene || 'GameSelect';

    const profile = typeof storage.getPlayerProfile === 'function'
      ? storage.getPlayerProfile()
      : { tag: leaderboardService.getPlayerInitials(), name: '' };

    const savedTag = profile.tag || leaderboardService.getPlayerInitials() || 'ALL';
    this.initials = [
      savedTag[0] || 'A',
      savedTag[1] || 'L',
      savedTag[2] || 'L'
    ];
    this.fullName = profile.name || '';
    this.activeSlot = 0;
  }

  create() {
    const { width, height } = this.cameras.main;

    // Semi-transparent backdrop
    const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.88);
    backdrop.setOrigin(0, 0);
    backdrop.setInteractive(); // Absorb clicks

    // Card frame
    const cardW = Math.min(width - 32, 420);
    const cardH = 520;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    const card = this.add.graphics();
    card.fillStyle(0x0f172a, 0.98);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, 16);
    card.lineStyle(2, 0x38bdf8, 0.9);
    card.strokeRoundedRect(cardX, cardY, cardW, cardH, 16);

    let contentY = cardY + 36;

    if (this.mode === 'profile') {
      this.add.text(width / 2, contentY, '👤 ARCADE PLAYER PROFILE 👤', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '18px',
        fontWeight: '900',
        color: '#facc15'
      }).setOrigin(0.5);

      contentY += 30;
      this.add.text(width / 2, contentY, 'SET YOUR 3-LETTER TAG & FULL NAME', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#94a3b8'
      }).setOrigin(0.5);

      contentY += 36;
      this.add.text(width / 2, contentY, '3-LETTER TAG (LEADERBOARD):', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#cbd5e1'
      }).setOrigin(0.5);

      contentY += 46;
    } else {
      this.add.text(width / 2, contentY, '🏆 HIGH SCORE ENTRY 🏆', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '19px',
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

      contentY += 28;
      this.add.text(width / 2, contentY, `${titleText}`, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        fontWeight: 'bold',
        color: '#94a3b8'
      }).setOrigin(0.5);

      contentY += 32;
      this.add.text(width / 2, contentY, `${this.score.toLocaleString()} PTS`, {
        fontFamily: 'monospace',
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#38bdf8'
      }).setOrigin(0.5);

      if (this.detail) {
        contentY += 24;
        this.add.text(width / 2, contentY, this.detail, {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '11px',
          color: '#a855f7'
        }).setOrigin(0.5);
      }

      contentY += 28;
      this.add.text(width / 2, contentY, 'CHOOSE 3-LETTER TAG:', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#cbd5e1'
      }).setOrigin(0.5);

      contentY += 46;
    }

    // 3 Letter Slots & Spinners
    this.slotContainers = [];
    this.slotLetters = [];
    this.slotChevrons = [];

    const slotSpacing = 68;
    const startX = width / 2 - slotSpacing;
    const slotY = contentY;

    for (let i = 0; i < 3; i++) {
      const cx = startX + i * slotSpacing;
      const slotBox = this.add.container(cx, slotY);

      // Chevron UP
      const upBtn = this.add.text(0, -46, '▲', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '16px',
        color: '#38bdf8'
      }).setOrigin(0.5);
      const upHit = this.add.zone(0, -46, 50, 32).setOrigin(0.5).setInteractive({ useHandCursor: true });
      upHit.on('pointerdown', () => this.cycleChar(i, 1));

      // Slot letter background
      const slotBg = this.add.graphics();
      slotBg.fillStyle(0x1e293b, 1);
      slotBg.fillRoundedRect(-24, -26, 48, 52, 8);
      slotBg.lineStyle(2, i === this.activeSlot ? 0xfacc15 : 0x475569, 1);
      slotBg.strokeRoundedRect(-24, -26, 48, 52, 8);

      // Letter text
      const letterText = this.add.text(0, 0, this.initials[i], {
        fontFamily: 'monospace',
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);

      // Chevron DOWN
      const downBtn = this.add.text(0, 46, '▼', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '16px',
        color: '#38bdf8'
      }).setOrigin(0.5);
      const downHit = this.add.zone(0, 46, 50, 32).setOrigin(0.5).setInteractive({ useHandCursor: true });
      downHit.on('pointerdown', () => this.cycleChar(i, -1));

      slotBox.add([slotBg, letterText, upBtn, upHit, downBtn, downHit]);

      // Drag / Swipe interaction on slot
      let dragStartY = 0;
      const slotHit = this.add.zone(0, 0, 48, 52).setOrigin(0.5).setInteractive({ useHandCursor: true });
      slotHit.on('pointerdown', (pointer) => {
        dragStartY = pointer.y;
        this.activeSlot = i;
        this.updateSlotHighlights();
      });
      slotHit.on('pointerup', (pointer) => {
        const delta = pointer.y - dragStartY;
        if (delta < -18) this.cycleChar(i, 1);
        else if (delta > 18) this.cycleChar(i, -1);
      });

      slotBox.add(slotHit);

      this.slotContainers.push(slotBox);
      this.slotLetters.push(letterText);
      this.slotChevrons.push({ up: upBtn, down: downBtn });
    }

    // FULL NAME (OPTIONAL) SECTION
    const nameY = slotY + 68;
    this.add.text(width / 2, nameY, 'FULL NAME / NICKNAME (OPTIONAL):', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#94a3b8'
    }).setOrigin(0.5);

    const nameBtnY = nameY + 28;
    const nameBtn = this.add.container(width / 2, nameBtnY);

    const nameBg = this.add.graphics();
    nameBg.fillStyle(0x1e293b, 1);
    nameBg.fillRoundedRect(-120, -18, 240, 36, 8);
    nameBg.lineStyle(1.5, 0x38bdf8, 0.8);
    nameBg.strokeRoundedRect(-120, -18, 240, 36, 8);
    nameBtn.add(nameBg);

    const nameDisplayText = this.add.text(
      0,
      0,
      this.fullName ? `✏️ ${this.fullName}` : '✏️ TAP TO ENTER FULL NAME',
      {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        fontWeight: 'bold',
        color: this.fullName ? '#38bdf8' : '#64748b'
      }
    ).setOrigin(0.5);
    nameBtn.add(nameDisplayText);
    this.nameDisplayText = nameDisplayText;

    const nameHit = this.add.zone(0, 0, 240, 36).setOrigin(0.5).setInteractive({ useHandCursor: true });
    nameHit.on('pointerdown', () => this.promptFullName());
    nameBtn.add(nameHit);

    // ERROR / VALIDATION MESSAGE
    this.errorText = this.add.text(width / 2, nameBtnY + 28, '', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#f87171'
    }).setOrigin(0.5);

    // Keyboard listener for desktop arrow navigation & typing
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown', (event) => {
        if (event.key.length === 1 && CHARS.includes(event.key.toUpperCase())) {
          this.initials[this.activeSlot] = event.key.toUpperCase();
          this.updateSlotDisplay();
          this.activeSlot = (this.activeSlot + 1) % 3;
          this.updateSlotHighlights();
          audio.playPongPaddle?.();
        } else if (event.key === 'ArrowUp') {
          this.cycleChar(this.activeSlot, -1);
        } else if (event.key === 'ArrowDown') {
          this.cycleChar(this.activeSlot, 1);
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

    // ACTION BUTTON: SUBMIT OR SAVE
    const actionBtnY = cardY + cardH - 72;
    const submitBtn = this.add.container(width / 2, actionBtnY);
    const subBg = this.add.graphics();
    subBg.fillStyle(0x059669, 1);
    subBg.fillRoundedRect(-110, -22, 220, 44, 10);
    subBg.lineStyle(2, 0x34d399, 1);
    subBg.strokeRoundedRect(-110, -22, 220, 44, 10);
    submitBtn.add(subBg);

    const btnLabel = this.mode === 'profile' ? '💾 SAVE PROFILE' : 'SUBMIT SCORE ▶';
    const subText = this.add.text(0, 0, btnLabel, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    submitBtn.add(subText);

    const subHit = this.add.zone(0, 0, 220, 44).setOrigin(0.5).setInteractive({ useHandCursor: true });
    subHit.on('pointerdown', () => this.submit());
    submitBtn.add(subHit);

    // SECONDARY BUTTON: SKIP OR CANCEL
    const cancelY = cardY + cardH - 24;
    const cancelLabel = this.mode === 'profile' ? '✕ CANCEL' : 'SKIP FOR NOW';
    const skipBtn = this.add.text(width / 2, cancelY, cancelLabel, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#64748b'
    }).setOrigin(0.5);

    const skipHit = this.add.zone(width / 2, cancelY, 140, 28).setOrigin(0.5).setInteractive({ useHandCursor: true });
    skipHit.on('pointerdown', () => {
      this.scene.stop();
      if (this.returnScene) {
        if (this.scene.isSleeping(this.returnScene)) {
          this.scene.wake(this.returnScene);
        } else if (this.scene.isPaused(this.returnScene)) {
          this.scene.resume(this.returnScene);
        } else {
          this.scene.start(this.returnScene);
        }
      }
    });

    this.submitBtn = submitBtn;
    this.subText = subText;
    this.isSubmitting = false;
  }

  promptFullName() {
    audio.playPongPaddle?.();
    const entered = typeof window !== 'undefined' && typeof window.prompt === 'function'
      ? window.prompt('Enter your full name or nickname (optional, max 24 chars):', this.fullName || '')
      : null;

    if (entered !== null) {
      this.fullName = entered.trim().slice(0, 24);
      if (this.nameDisplayText) {
        this.nameDisplayText.setText(this.fullName ? `✏️ ${this.fullName}` : '✏️ TAP TO ENTER FULL NAME');
        this.nameDisplayText.setColor(this.fullName ? '#38bdf8' : '#64748b');
      }
      if (this.errorText) this.errorText.setText('');
    }
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
    if (this.errorText) this.errorText.setText('');
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
          bg.fillRoundedRect(-24, -26, 48, 52, 8);
          bg.lineStyle(2, i === this.activeSlot ? 0xfacc15 : 0x475569, 1);
          bg.strokeRoundedRect(-24, -26, 48, 52, 8);
        }
      }
    }
  }

  async submit() {
    if (this.isSubmitting) return;

    const initialsStr = this.initials.join('');
    const validation = validatePlayerIdentity(initialsStr, this.fullName);
    if (!validation.valid) {
      if (this.errorText) {
        this.errorText.setText(`⚠️ ${validation.error || 'PLEASE USE FAMILY-FRIENDLY NAME'}`);
      }
      this.cameras.main.shake?.(180, 0.005);
      audio.playBulletHit?.();
      return;
    }

    // Persist profile
    storage.setPlayerProfile(initialsStr, this.fullName);
    leaderboardService.setPlayerInitials(initialsStr);

    if (this.mode === 'profile') {
      audio.playPowerup?.();
      this.scene.stop();
      if (this.returnScene) {
        if (this.scene.isSleeping(this.returnScene)) {
          this.scene.wake(this.returnScene);
        } else if (this.scene.isPaused(this.returnScene)) {
          this.scene.resume(this.returnScene);
        } else {
          this.scene.start(this.returnScene);
        }
      }
      return;
    }

    // Submit mode
    this.isSubmitting = true;
    this.subText.setText('SUBMITTING...');
    audio.playPowerup?.();

    try {
      await leaderboardService.submitScore(this.gameId, {
        initials: initialsStr,
        score: this.score,
        detail: this.detail,
        fullName: this.fullName
      });
    } catch (err) {
      console.warn('Leaderboard submit failed (cached locally):', err);
    }

    if (!this.sys || !this.sys.isActive() || !this.scene || !this.scene.isActive()) {
      return;
    }

    this.scene.stop();
    this.scene.launch('LeaderboardModal', {
      gameId: this.gameId,
      returnScene: this.returnScene
    });
  }
}
