// src/scenes/LevelSelect.js
// 70-level milestone browser and stage select with progress tracking

import { MILESTONES, WORLDS } from '../data/milestones.js';
import { storage } from '../systems/Storage.js';

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelSelect' });
  }

  init(data) {
    this.cpuSpeedMultiplier = data && data.cpuSpeedMultiplier !== undefined ? data.cpuSpeedMultiplier : 1.0;
    this.isInvincibleCheat = data && data.isInvincibleCheat ? data.isInvincibleCheat : false;
    this.rapidFireCheat = data && data.rapidFireCheat ? data.rapidFireCheat : false;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const progress = storage.getProgress();

    // Dark celebratory retro background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0f1d, 1);
    bg.fillRect(0, 0, width, height);

    // Starfield speckles
    for (let i = 0; i < 40; i++) {
      const sx = (i * 47) % width;
      const sy = (i * 71) % height;
      const alpha = 0.2 + ((i % 5) * 0.15);
      bg.fillStyle(0xffffff, alpha);
      bg.fillCircle(sx, sy, (i % 3 === 0) ? 1.5 : 1);
    }

    // Scrollable container for levels
    this.scrollContainer = this.add.container(0, 0);
    this.scrollY = 84;
    this.minScrollY = 84;
    this.maxScrollY = 84; // Will be calculated after adding all cards

    // Mask for content area (below header: y: 74 to height - 10)
    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, 74, width, height - 74);
    const mask = maskShape.createGeometryMask();
    this.scrollContainer.setMask(mask);

    let currentY = 90;
    const cardWidth = width - 36;
    const cardHeight = 48;
    const spacing = 8;

    for (let w = 0; w < WORLDS.length; w++) {
      const world = WORLDS[w];
      const startLvl = w * 10 + 1;
      const endLvl = (w + 1) * 10;

      // World Decade Header
      const headerBg = this.add.graphics();
      headerBg.fillStyle(0x1e293b, 0.85);
      headerBg.fillRoundedRect(18, currentY, cardWidth, 26, 6);
      this.scrollContainer.add(headerBg);

      const headerText = this.add.text(width / 2, currentY + 13, `WORLD ${world.id}: ${world.name.toUpperCase()} (${world.decade})`, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        fontWeight: 'bold',
        color: world.themeColor || '#fbbf24',
        letterSpacing: 1
      }).setOrigin(0.5);
      this.scrollContainer.add(headerText);

      currentY += 34;

      // 10 levels for this world
      for (let lvl = startLvl; lvl <= endLvl; lvl++) {
        const milestone = MILESTONES[lvl] || { year: 1956, title: 'Unknown' };
        const isBeaten = storage.isLevelBeaten(lvl);
        const isUnlocked = storage.isLevelUnlocked(lvl);

        const card = this.add.graphics();
        let borderCol = 0x334155;
        let fillCol = 0x0f172a;
        let alpha = 0.9;

        if (isBeaten) {
          borderCol = 0x10b981; // Green
          fillCol = 0x064e3b;
        } else if (isUnlocked) {
          borderCol = 0xf59e0b; // Gold glowing
          fillCol = 0x451a03;
        }

        card.fillStyle(fillCol, alpha);
        card.fillRoundedRect(18, currentY, cardWidth, cardHeight, 8);
        card.lineStyle(1.5, borderCol, 1);
        card.strokeRoundedRect(18, currentY, cardWidth, cardHeight, 8);
        this.scrollContainer.add(card);

        // Interactive Hitbox
        const hitZone = this.add.zone(width / 2, currentY + cardHeight / 2, cardWidth, cardHeight)
          .setInteractive({ useHandCursor: true });
        this.scrollContainer.add(hitZone);

        // Level Number & Year
        const lvlLabel = this.add.text(28, currentY + 14, `L${lvl} • ${milestone.year}`, {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '13px',
          fontWeight: 'bold',
          color: isUnlocked ? '#ffd700' : '#64748b'
        });
        this.scrollContainer.add(lvlLabel);

        // Milestone Name (or ???? if not beaten and not unlocked and not revealed)
        const isRevealed = storage.isLevelRevealed(lvl);

        let displayTitle = '????';
        let statusTag = '🔒';
        let tagColor = '#64748b';

        if (isBeaten) {
          displayTitle = milestone.title;
          statusTag = '✓';
          tagColor = '#10b981';
        } else if (isUnlocked) {
          displayTitle = milestone.title;
          statusTag = 'PLAY ▶';
          tagColor = '#f59e0b';
        } else if (isRevealed) {
          displayTitle = milestone.title;
          statusTag = '👀';
          tagColor = '#38bdf8';
        }

        // Truncate display title cleanly for 1 line in list card
        const maxLen = 34;
        const shortTitle = displayTitle.length > maxLen ? displayTitle.substring(0, maxLen - 1) + '…' : displayTitle;

        const titleLabel = this.add.text(28, currentY + 30, shortTitle, {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '11px',
          color: isUnlocked ? '#f1f5f9' : (isRevealed ? '#38bdf8' : '#475569')
        });
        this.scrollContainer.add(titleLabel);

        // Status Badge / Icon
        const badge = this.add.text(width - 28, currentY + cardHeight / 2, statusTag, {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '13px',
          fontWeight: 'bold',
          color: tagColor
        }).setOrigin(1, 0.5);
        this.scrollContainer.add(badge);

        let tapCount = 0;
        let lastTapTime = 0;

        hitZone.on('pointerup', () => {
          if (this.wasDragging) return;

          const now = Date.now();
          if (now - lastTapTime < 700) {
            tapCount++;
          } else {
            tapCount = 1;
          }
          lastTapTime = now;

          if (tapCount >= 3) {
            tapCount = 0;
            // Triple tap: reveal and persist title!
            storage.recordLevelRevealed(lvl);
            const fullT = milestone.title;
            const shortT = fullT.length > maxLen ? fullT.substring(0, maxLen - 1) + '…' : fullT;
            titleLabel.setText(shortT);
            titleLabel.setColor('#38bdf8');
            if (!isBeaten && !isUnlocked) {
              badge.setText('👀');
              badge.setColor('#38bdf8');
            }

            this.tweens.add({
              targets: [card, titleLabel],
              scaleX: 1.03,
              scaleY: 1.05,
              duration: 90,
              yoyo: true,
              ease: 'Quad.easeInOut'
            });
          } else if (isUnlocked && tapCount === 1) {
            this.scene.start('LevelCard', {
              levelNum: lvl,
              lives: 3,
              tanksDefeated: 0,
              isInvincibleCheat: this.isInvincibleCheat,
              rapidFireCheat: this.rapidFireCheat,
              cpuSpeedMultiplier: this.cpuSpeedMultiplier
            });
          }
        });

        currentY += cardHeight + spacing;
      }

      currentY += 10;
    }

    this.maxScrollY = -(currentY - height + 40);
    if (this.maxScrollY > this.minScrollY) {
      this.maxScrollY = this.minScrollY;
    }

    // Top Header Overlay (fixed position above scrolling list)
    const headerBar = this.add.graphics();
    headerBar.fillStyle(0x0a0f1d, 0.96);
    headerBar.fillRect(0, 0, width, 74);
    headerBar.lineStyle(2, 0x1e293b, 1);
    headerBar.lineBetween(0, 74, width, 74);

    // Back Button
    const backBtn = this.add.container(48, 38);
    const backBg = this.add.graphics();
    backBg.fillStyle(0x1e293b, 1);
    backBg.fillRoundedRect(-36, -18, 72, 36, 8);
    backBg.lineStyle(1.5, 0x475569, 1);
    backBg.strokeRoundedRect(-36, -18, 72, 36, 8);
    backBtn.add(backBg);

    const backText = this.add.text(0, 0, '◀ BACK', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#e2e8f0'
    }).setOrigin(0.5);
    backBtn.add(backText);

    backBtn.setSize(72, 36);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.scene.start('Splash');
    });

    // Screen Title
    this.add.text(width / 2 + 15, 26, 'SELECT LEVEL', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '18px',
      fontWeight: '900',
      color: '#ffffff',
      letterSpacing: 1.5
    }).setOrigin(0.5);

    // Beaten counter
    const beatenCount = progress.beatenLevels.length;
    this.add.text(width / 2 + 15, 52, `Progress: ${beatenCount} / 70 Levels Beaten`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#ffd700'
    }).setOrigin(0.5);

    // Scrolling input listeners
    this.wasDragging = false;
    let isPointerDown = false;
    let dragStartY = 0;
    let containerStartY = 0;

    this.input.on('pointerdown', (pointer) => {
      if (pointer.y > 74) {
        isPointerDown = true;
        this.wasDragging = false;
        dragStartY = pointer.y;
        containerStartY = this.scrollContainer.y;
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (isPointerDown) {
        const delta = pointer.y - dragStartY;
        if (Math.abs(delta) > 8) {
          this.wasDragging = true;
        }
        let targetY = containerStartY + delta;
        // Bounce bounds
        if (targetY > this.minScrollY) {
          targetY = this.minScrollY + (targetY - this.minScrollY) * 0.3;
        } else if (targetY < this.maxScrollY) {
          targetY = this.maxScrollY + (targetY - this.maxScrollY) * 0.3;
        }
        this.scrollContainer.y = targetY;
      }
    });

    this.input.on('pointerup', () => {
      isPointerDown = false;
      // Snap back to bounds
      if (this.scrollContainer.y > this.minScrollY) {
        this.tweens.add({
          targets: this.scrollContainer,
          y: this.minScrollY,
          duration: 250,
          ease: 'Cubic.easeOut'
        });
      } else if (this.scrollContainer.y < this.maxScrollY) {
        this.tweens.add({
          targets: this.scrollContainer,
          y: this.maxScrollY,
          duration: 250,
          ease: 'Cubic.easeOut'
        });
      }
    });

    // Mouse wheel support for desktop
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      let targetY = this.scrollContainer.y - deltaY * 1.5;
      targetY = Math.max(this.maxScrollY, Math.min(this.minScrollY, targetY));
      this.scrollContainer.y = targetY;
    });
  }
}

export { checkTripleTapGesture } from '../systems/GestureUtils.js';
