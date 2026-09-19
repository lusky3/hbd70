// src/scenes/LevelCard.js
// 2-second interstitial screen displaying Decade World, Milestone Year, and Celebration Event

import { LEVELS } from '../data/levels.js';
import { audio } from '../systems/AudioManager.js';

export class LevelCardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelCard' });
  }

  init(data) {
    this.levelNum = data.levelNum || 1;
    this.lives = data.lives !== undefined ? data.lives : 3;
    this.tanksDefeated = data.tanksDefeated || 0;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const levelData = LEVELS[this.levelNum - 1] || LEVELS[0];

    // 1. Clean dark card background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0f1d, 1);
    bg.fillRect(0, 0, width, height);

    // Decorative frame accent in decade theme color
    const accentColor = Phaser.Display.Color.HexStringToColor(levelData.themeColor || '#fbbf24').color;
    bg.lineStyle(2, accentColor, 0.6);
    bg.strokeRoundedRect(24, height * 0.18, width - 48, height * 0.58, 20);

    // 2. World / Decade header
    const worldIndex = Math.min(Math.floor((this.levelNum - 1) / 10) + 1, 7);
    this.add.text(width / 2, height * 0.25, `WORLD ${worldIndex} • ${levelData.decade || '1950s'}`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '15px',
      fontWeight: 'bold',
      color: levelData.themeColor || '#fbbf24',
      letterSpacing: 2
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.29, levelData.worldName ? levelData.worldName.toUpperCase() : 'THE JOURNEY', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    // 3. Milestone Year banner
    const yearBanner = this.add.text(width / 2, height * 0.40, `★  ${levelData.year}  ★`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '36px',
      fontWeight: '900',
      color: '#ffd700',
      shadow: { color: '#000000', fill: true, blur: 10, offsetX: 0, offsetY: 2 }
    }).setOrigin(0.5);

    this.tweens.add({
      targets: yearBanner,
      scale: 1.06,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 4. Milestone Title / Personal Life Event
    this.add.text(width / 2, height * 0.48, `LEVEL ${this.levelNum} / 70`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      color: '#94a3b8'
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.54, levelData.title, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '21px',
      fontWeight: 'bold',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: width - 80 }
    }).setOrigin(0.5);

    // Lives count indicator
    const livesContainer = this.add.container(width / 2, height * 0.67);
    const lifeLabel = this.add.text(-40, 0, 'Lives:', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      color: '#94a3b8'
    }).setOrigin(0.5);
    livesContainer.add(lifeLabel);

    for (let l = 0; l < this.lives; l++) {
      const bikeIcon = this.add.sprite(0 + l * 28, 0, 'motorcycle').setScale(0.85);
      livesContainer.add(bikeIcon);
    }

    this.add.text(width / 2, height * 0.82, 'Tap anywhere to start • Get Ready!', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      color: '#94a3b8'
    }).setOrigin(0.5);

    // Audio cue
    audio.playBounce();

    // Auto-advance after 3.8s (or tap to skip)
    let advanced = false;
    const advanceToGame = () => {
      if (advanced) return;
      advanced = true;
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.time.delayedCall(250, () => {
        this.scene.start('Game', {
          levelNum: this.levelNum,
          lives: this.lives,
          tanksDefeated: this.tanksDefeated
        });
      });
    };

    this.time.delayedCall(3800, advanceToGame);
    this.input.once('pointerdown', advanceToGame);
  }
}
