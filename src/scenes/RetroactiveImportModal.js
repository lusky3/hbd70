// src/scenes/RetroactiveImportModal.js
// Modal prompt for retro-actively importing local arcade high scores to Cloudflare D1 leaderboards

import { storage } from '../systems/Storage.js';
import { leaderboardService, sanitizeInitials } from '../systems/LeaderboardService.js';
import { audio } from '../systems/AudioManager.js';
import { validatePlayerIdentity } from '../utils/ProfanityFilter.js';

const SceneBase = typeof Phaser !== 'undefined' ? Phaser.Scene : class {};
export const ALLOWED_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?★ ";

export class RetroactiveImportModalScene extends SceneBase {
  constructor() {
    super('RetroactiveImportModal');
  }

  init(data) {
    this.returnScene = data?.returnScene || 'GameSelect';
    this.unmigrated = storage.getUnmigratedLocalScores();
    const profile = typeof storage.getPlayerProfile === 'function'
      ? storage.getPlayerProfile()
      : { tag: leaderboardService.getPlayerInitials(), name: '' };

    const stored = profile.tag || leaderboardService.getPlayerInitials();
    this.initials = stored.padEnd(3, ' ').slice(0, 3).split('');
    this.fullName = profile.name || '';
    this.selectedSlot = 0;
    this.isSubmitting = false;
  }

  create() {
    const { width, height } = this.scale;

    // 1. Semi-transparent Dim Backdrop
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.88);
    backdrop.fillRect(0, 0, width, height);

    // Block pointer propagation to underlying scene
    this.input.topOnly = true;

    // 2. Modal Box
    const cardWidth = Math.min(width - 32, 420);
    const cardHeight = Math.min(height - 30, 580);
    const cardX = (width - cardWidth) / 2;
    const cardY = (height - cardHeight) / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0f1d, 0.98);
    bg.fillRoundedRect(cardX, cardY, cardWidth, cardHeight, 14);
    bg.lineStyle(2, 0xfacc15, 0.9);
    bg.strokeRoundedRect(cardX, cardY, cardWidth, cardHeight, 14);

    // Glow accents
    bg.lineStyle(1, 0x38bdf8, 0.4);
    bg.strokeRoundedRect(cardX + 4, cardY + 4, cardWidth - 8, cardHeight - 8, 12);

    let curY = cardY + 24;

    // 3. Header & Subtitle
    this.add.text(width / 2, curY, '🏆 LOCAL RECORDS FOUND! 🏆', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '17px',
      fontWeight: '900',
      color: '#facc15',
      letterSpacing: 1
    }).setOrigin(0.5);

    curY += 22;
    this.add.text(width / 2, curY, 'Upload your local achievements to the Global Leaderboard:', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      color: '#94a3b8',
      align: 'center',
      wordWrap: { width: cardWidth - 36 }
    }).setOrigin(0.5);

    curY += 26;

    // 4. Score Summary Items
    const rowHeight = 30;
    this.unmigrated.forEach((item) => {
      const rowBg = this.add.graphics();
      rowBg.fillStyle(0x1e293b, 0.8);
      rowBg.fillRoundedRect(cardX + 16, curY, cardWidth - 32, rowHeight - 4, 6);

      const label = `${item.icon} ${item.name}`;
      this.add.text(cardX + 26, curY + 6, label, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '11px',
        fontWeight: 'bold',
        color: '#e2e8f0'
      });

      const scoreDisplay = `${item.score.toLocaleString()} (${item.detail})`;
      this.add.text(cardX + cardWidth - 26, curY + 6, scoreDisplay, {
        fontFamily: 'monospace',
        fontSize: '11px',
        fontWeight: 'bold',
        color: '#facc15'
      }).setOrigin(1, 0);

      curY += rowHeight;
    });

    curY += 10;

    // 5. Initials Label
    this.add.text(width / 2, curY, 'CHOOSE 3-LETTER TAG:', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#cbd5e1',
      letterSpacing: 1
    }).setOrigin(0.5);

    curY += 46;

    // 6. 3-Slot Initials Spinner
    this.slotLetters = [];
    this.slotBgs = [];
    const slotSpacing = 68;
    const startX = width / 2 - slotSpacing;

    for (let i = 0; i < 3; i++) {
      const cx = startX + i * slotSpacing;
      const slotBox = this.add.container(cx, curY);

      // Chevron UP
      const upBtn = this.add.text(0, -40, '▲', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#38bdf8'
      }).setOrigin(0.5);
      const upHit = this.add.zone(0, -40, 50, 32).setOrigin(0.5).setInteractive({ useHandCursor: true });
      upHit.on('pointerdown', () => this.cycleChar(i, 1));

      // Slot background
      const sBg = this.add.graphics();
      sBg.fillStyle(0x1e293b, 1);
      sBg.fillRoundedRect(-24, -24, 48, 48, 8);
      sBg.lineStyle(1.5, i === this.selectedSlot ? 0xfacc15 : 0x475569, 1);
      sBg.strokeRoundedRect(-24, -24, 48, 48, 8);
      slotBox.add(sBg);
      this.slotBgs.push(sBg);

      // Letter text
      const lText = this.add.text(0, 0, this.initials[i] || ' ', {
        fontFamily: 'monospace',
        fontSize: '28px',
        fontWeight: '900',
        color: '#f8fafc'
      }).setOrigin(0.5);
      slotBox.add(lText);
      this.slotLetters.push(lText);

      // Chevron DOWN
      const downBtn = this.add.text(0, 40, '▼', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#38bdf8'
      }).setOrigin(0.5);
      const downHit = this.add.zone(0, 40, 50, 32).setOrigin(0.5).setInteractive({ useHandCursor: true });
      downHit.on('pointerdown', () => this.cycleChar(i, -1));

      slotBox.add([upBtn, upHit, downBtn, downHit]);

      // Touch zone on slot
      const hitZone = this.add.zone(0, 0, 50, 48).setInteractive({ useHandCursor: true });
      slotBox.add(hitZone);
      hitZone.on('pointerdown', () => {
        this.selectedSlot = i;
        this.updateSlotHighlights();
      });

      this.addTouchDragToSlot(hitZone, i);
    }

    curY += 56;

    // FULL NAME / NICKNAME (OPTIONAL)
    this.add.text(width / 2, curY, 'FULL NAME / NICKNAME (OPTIONAL):', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#94a3b8'
    }).setOrigin(0.5);

    curY += 24;
    const nameBtn = this.add.container(width / 2, curY);
    const nameBg = this.add.graphics();
    nameBg.fillStyle(0x1e293b, 1);
    nameBg.fillRoundedRect(-110, -16, 220, 32, 6);
    nameBg.lineStyle(1.5, 0x38bdf8, 0.8);
    nameBg.strokeRoundedRect(-110, -16, 220, 32, 6);
    nameBtn.add(nameBg);

    const nameDisplayText = this.add.text(
      0,
      0,
      this.fullName ? `✏️ ${this.fullName}` : '✏️ TAP TO ENTER FULL NAME',
      {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '11px',
        fontWeight: 'bold',
        color: this.fullName ? '#38bdf8' : '#64748b'
      }
    ).setOrigin(0.5);
    nameBtn.add(nameDisplayText);
    this.nameDisplayText = nameDisplayText;

    const nameHit = this.add.zone(0, 0, 220, 32).setOrigin(0.5).setInteractive({ useHandCursor: true });
    nameHit.on('pointerdown', () => this.promptFullName());
    nameBtn.add(nameHit);

    curY += 22;
    this.errorText = this.add.text(width / 2, curY, '', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#f87171'
    }).setOrigin(0.5);

    curY += 24;

    // 7. Action Buttons
    const btnWidth = cardWidth - 48;

    // Submit button
    const submitBtn = this.add.container(width / 2, curY);
    const subBg = this.add.graphics();
    subBg.fillStyle(0x22c55e, 1);
    subBg.fillRoundedRect(-btnWidth / 2, -18, btnWidth, 36, 8);
    subBg.lineStyle(1.5, 0x86efac, 1);
    subBg.strokeRoundedRect(-btnWidth / 2, -18, btnWidth, 36, 8);
    submitBtn.add(subBg);

    this.submitText = this.add.text(0, 0, '🚀 UPLOAD TO LEADERBOARD 🚀', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#ffffff',
      letterSpacing: 1
    }).setOrigin(0.5);
    submitBtn.add(this.submitText);

    const submitZone = this.add.zone(0, 0, btnWidth, 38).setInteractive({ useHandCursor: true });
    submitBtn.add(submitZone);
    submitZone.on('pointerdown', () => this.submitScores());

    curY += 42;

    // Remind me later button
    const skipBtn = this.add.container(width / 2, curY);
    const skipBg = this.add.graphics();
    skipBg.fillStyle(0x1e293b, 1);
    skipBg.fillRoundedRect(-btnWidth / 2, -16, btnWidth, 32, 8);
    skipBg.lineStyle(1.5, 0x64748b, 1);
    skipBg.strokeRoundedRect(-btnWidth / 2, -16, btnWidth, 32, 8);
    skipBtn.add(skipBg);

    const skipText = this.add.text(0, 0, 'REMIND ME LATER', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#94a3b8'
    }).setOrigin(0.5);
    skipBtn.add(skipText);

    const skipZone = this.add.zone(0, 0, btnWidth, 34).setInteractive({ useHandCursor: true });
    skipBtn.add(skipZone);
    skipZone.on('pointerdown', () => this.dismiss());

    // 8. Desktop keyboard support
    if (this.input?.keyboard) {
      this.keyHandler = (event) => this.handleKeyboardInput(event);
      this.input.keyboard.on('keydown', this.keyHandler);
    }
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

  addTouchDragToSlot(zone, slotIndex) {
    let startY = 0;
    zone.on('pointerdown', (pointer) => {
      startY = pointer.y;
    });
    zone.on('pointerup', (pointer) => {
      const deltaY = pointer.y - startY;
      if (Math.abs(deltaY) > 20) {
        if (deltaY < 0) {
          this.cycleChar(slotIndex, 1);
        } else {
          this.cycleChar(slotIndex, -1);
        }
      }
    });
  }

  cycleChar(slotIndex, direction) {
    audio.playShoot?.();
    const currentChar = this.initials[slotIndex] || 'A';
    let idx = ALLOWED_CHARS.indexOf(currentChar);
    if (idx === -1) idx = 0;

    idx = (idx + direction + ALLOWED_CHARS.length) % ALLOWED_CHARS.length;
    this.initials[slotIndex] = ALLOWED_CHARS[idx];

    if (this.slotLetters[slotIndex]) {
      this.slotLetters[slotIndex].setText(this.initials[slotIndex]);
    }
    this.selectedSlot = slotIndex;
    this.updateSlotHighlights();
    if (this.errorText) this.errorText.setText('');
  }

  updateSlotHighlights() {
    for (let i = 0; i < 3; i++) {
      const sBg = this.slotBgs[i];
      if (sBg && sBg.clear) {
        sBg.clear();
        sBg.fillStyle(0x1e293b, 1);
        sBg.fillRoundedRect(-24, -24, 48, 48, 8);
        sBg.lineStyle(1.5, i === this.selectedSlot ? 0xfacc15 : 0x475569, 1);
        sBg.strokeRoundedRect(-24, -24, 48, 48, 8);
      }
    }
  }

  handleKeyboardInput(event) {
    if (event.key === 'Enter') {
      this.submitScores();
      return;
    }
    if (event.key === 'ArrowRight') {
      this.selectedSlot = (this.selectedSlot + 1) % 3;
      this.updateSlotHighlights();
      return;
    }
    if (event.key === 'ArrowLeft') {
      this.selectedSlot = (this.selectedSlot + 2) % 3;
      this.updateSlotHighlights();
      return;
    }
    if (event.key === 'ArrowUp') {
      this.cycleChar(this.selectedSlot, 1);
      return;
    }
    if (event.key === 'ArrowDown') {
      this.cycleChar(this.selectedSlot, -1);
      return;
    }

    const key = event.key.toUpperCase();
    if (ALLOWED_CHARS.includes(key)) {
      audio.playShoot?.();
      this.initials[this.selectedSlot] = key;
      this.slotLetters[this.selectedSlot].setText(key);
      this.selectedSlot = (this.selectedSlot + 1) % 3;
      this.updateSlotHighlights();
      if (this.errorText) this.errorText.setText('');
    }
  }

  async submitScores() {
    if (this.isSubmitting) return;

    const rawInitials = this.initials.join('');
    const cleanInitials = sanitizeInitials(rawInitials);

    const validation = validatePlayerIdentity(cleanInitials, this.fullName);
    if (!validation.valid) {
      if (this.errorText) {
        this.errorText.setText(`⚠️ ${validation.error || 'PLEASE USE FAMILY-FRIENDLY NAME'}`);
      }
      this.cameras.main?.shake?.(180, 0.005);
      audio.playBulletHit?.();
      return;
    }

    this.isSubmitting = true;
    audio.playBossHit?.();

    if (this.submitText) {
      this.submitText.setText('UPLOADING SCORES...');
    }

    // Save profile in storage
    storage.setPlayerProfile(cleanInitials, this.fullName);
    leaderboardService.setPlayerInitials(cleanInitials);

    // Sequential batch submission with fullName
    await leaderboardService.submitBatchScores(cleanInitials, this.unmigrated, this.fullName);

    // Mark migration completed
    storage.markMigrationCompleted();

    // Scene lifecycle safety check
    if (!this.sys || !this.sys.isActive() || !this.scene.isActive()) return;

    if (this.keyHandler && this.input?.keyboard) {
      this.input.keyboard.off('keydown', this.keyHandler);
    }

    const firstGameId = this.unmigrated[0]?.gameId || 'tanks';
    this.scene.stop();
    this.scene.launch('LeaderboardModal', {
      gameId: firstGameId,
      returnScene: this.returnScene
    });
  }

  dismiss() {
    audio.playHit?.();
    storage.dismissMigration();

    if (this.keyHandler && this.input?.keyboard) {
      this.input.keyboard.off('keydown', this.keyHandler);
    }

    this.scene.stop();
  }
}
