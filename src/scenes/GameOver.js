// src/scenes/GameOver.js
// Pit stop retry screen when Allan runs out of motorcycle lives

import { audio } from '../systems/AudioManager.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOver' });
  }

  init(data) {
    this.levelNum = data.levelNum || 1;
    this.tanksDefeated = data.tanksDefeated || 0;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 1. Dark garage / pit stop background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0f1d, 1);
    bg.fillRect(0, 0, width, height);

    // 2. Pit Stop wrench icon
    this.add.text(width / 2, height * 0.22, '🛠️', {
      fontSize: '64px',
      align: 'center'
    }).setOrigin(0.5);

    // 3. Headline
    this.add.text(width / 2, height * 0.33, 'PIT STOP NEEDED!', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '26px',
      fontWeight: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.40, 'Allan\'s cruiser tank took a hit\nand pulled into the garage for repairs.', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '15px',
      color: '#cbd5e1',
      align: 'center',
      lineSpacing: 4
    }).setOrigin(0.5);

    // 4. Stats card
    const cardY = height * 0.54;
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x1e293b, 0.9);
    cardBg.fillRoundedRect(width / 2 - 140, cardY - 45, 280, 90, 16);
    cardBg.lineStyle(2, 0x334155, 1);
    cardBg.strokeRoundedRect(width / 2 - 140, cardY - 45, 280, 90, 16);

    this.add.text(width / 2, cardY - 18, `Wave Reached: ${this.levelNum} / 70`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#ffd700'
    }).setOrigin(0.5);

    this.add.text(width / 2, cardY + 14, `Tanks Defeated: ${this.tanksDefeated}`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '15px',
      color: '#94a3b8'
    }).setOrigin(0.5);

    // 5. Try Again Button
    const btnWidth = 220;
    const btnHeight = 54;
    const btnX = width / 2;
    const btnY = height * 0.72;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x2563eb, 1);
    btnBg.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 16);
    btnBg.lineStyle(3, 0x60a5fa, 1);
    btnBg.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 16);

    const btnText = this.add.text(btnX, btnY, 'TRY AGAIN', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    const hitZone = this.add.zone(btnX, btnY, btnWidth, btnHeight)
      .setInteractive({ useHandCursor: true });

    hitZone.on('pointerdown', () => {
      audio.playShoot();
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.time.delayedCall(250, () => {
        // Resume from current level checkpoint with refreshed lives
        this.scene.start('LevelCard', {
          levelNum: this.levelNum,
          lives: 3,
          tanksDefeated: this.tanksDefeated
        });
      });
    });

    // 6. Return to Splash link
    const homeBtn = this.add.text(width / 2, height * 0.83, 'Return to Title', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      color: '#64748b'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    homeBtn.on('pointerdown', () => {
      this.scene.start('Splash');
    });
  }
}
