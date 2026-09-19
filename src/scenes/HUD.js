// src/scenes/HUD.js
// Overlay HUD displaying Allan's remaining motorcycle lives, milestone title, active mines, and mute toggle

import { audio } from '../systems/AudioManager.js';

export class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HUD' });
  }

  create() {
    const width = this.cameras.main.width;

    // Top HUD Bar Background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0f1d, 0.92);
    bg.fillRect(0, 0, width, 60);
    bg.lineStyle(2, 0x1e293b, 1);
    bg.lineBetween(0, 60, width, 60);

    // 1. Lives Container (Motorcycle icons)
    this.livesContainer = this.add.container(16, 30);
    this.lifeIcons = [];
    for (let i = 0; i < 3; i++) {
      const icon = this.add.sprite(i * 24 + 10, 0, 'motorcycle').setScale(0.65);
      this.livesContainer.add(icon);
      this.lifeIcons.push(icon);
    }

    // Audio Mute Toggle Button
    this.muteBtn = this.add.text(96, 30, audio.isMuted ? '🔇' : '🔊', {
      fontSize: '16px'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.muteBtn.on('pointerdown', () => {
      const isMuted = audio.toggleMute();
      this.muteBtn.setText(isMuted ? '🔇' : '🔊');
    });

    // 2. Level & Year Center Text
    this.titleText = this.add.text(width / 2, 22, 'Level 1: 1956', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '15px',
      fontWeight: 'bold',
      color: '#ffd700',
      align: 'center'
    }).setOrigin(0.5);

    this.subText = this.add.text(width / 2, 42, 'Allan is Born!', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      color: '#cbd5e1',
      align: 'center'
    }).setOrigin(0.5);

    // 3. Right: Active Mines & Enemy Counter
    this.minesText = this.add.text(width - 20, 22, '💣 2', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#facc15'
    }).setOrigin(1, 0.5);

    this.enemyText = this.add.text(width - 20, 42, 'Tanks: 1', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      color: '#94a3b8'
    }).setOrigin(1, 0.5);

    // Hook up event listeners from GameScene
    const gameScene = this.scene.get('Game');
    if (gameScene) {
      gameScene.events.on('update-hud', this.onUpdateHud, this);
      if (gameScene.levelData) {
        this.onUpdateHud({
          lives: gameScene.lives !== undefined ? gameScene.lives : 3,
          levelNum: gameScene.levelNum || 1,
          year: gameScene.levelData.year || 1956,
          title: gameScene.levelData.title || '',
          minesAvailable: gameScene.playerMines ? Math.max(0, 2 - gameScene.playerMines.countActive(true)) : 2,
          enemyCount: gameScene.enemies ? gameScene.enemies.countActive(true) : 1
        });
      }
    }

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      const g = this.scene.get('Game');
      if (g) {
        g.events.off('update-hud', this.onUpdateHud, this);
      }
    });
  }

  onUpdateHud(data) {
    if (!this.titleText) return;

    if (data.lives !== undefined) {
      this.lifeIcons.forEach((icon, idx) => {
        icon.setVisible(idx < data.lives);
      });
    }

    if (data.levelNum !== undefined && data.year !== undefined) {
      this.titleText.setText(`L${data.levelNum}/70: ${data.year}`);
    }

    if (data.title !== undefined) {
      // Truncate if long for small screens
      const cleanTitle = data.title.length > 22 ? data.title.substring(0, 20) + '...' : data.title;
      this.subText.setText(cleanTitle);
    }

    if (data.minesAvailable !== undefined) {
      this.minesText.setText(`💣 ${data.minesAvailable}`);
    }

    if (data.enemyCount !== undefined) {
      this.enemyText.setText(`Tanks: ${data.enemyCount}`);
    }
  }
}
