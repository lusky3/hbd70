// src/scenes/HUD.js
// Overlay HUD displaying Allan's remaining motorcycle lives, milestone title, active mines, and mute toggle

import { audio } from '../systems/AudioManager.js';

export class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HUD' });
  }

  create() {
    const width = this.cameras.main.width;

    // Top HUD Bar Background (64px height)
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0f1d, 0.94);
    bg.fillRect(0, 0, width, 64);
    bg.lineStyle(2, 0x1e293b, 1);
    bg.lineBetween(0, 64, width, 64);

    // Row 1 (y: 18): Lives, Mute, Level/Year, Mines, Tanks
    // 1. Lives Container (Motorcycle icons)
    this.livesContainer = this.add.container(14, 18);
    this.lifeIcons = [];
    for (let i = 0; i < 3; i++) {
      const icon = this.add.sprite(i * 22 + 8, 0, 'motorcycle').setScale(0.6);
      this.livesContainer.add(icon);
      this.lifeIcons.push(icon);
    }

    // Audio Mute Toggle Button
    this.muteBtn = this.add.text(86, 18, audio.isMuted ? '🔇' : '🔊', {
      fontSize: '15px'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.muteBtn.on('pointerdown', () => {
      const isMuted = audio.toggleMute();
      this.muteBtn.setText(isMuted ? '🔇' : '🔊');
    });

    // 2. Level & Year Center Text
    this.titleText = this.add.text(width / 2, 18, 'L1/70 • 1956', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#ffd700',
      align: 'center'
    }).setOrigin(0.5);

    // 3. Right: Active Mines & Enemy Counter
    this.minesText = this.add.text(width - 82, 18, '💣 2', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#facc15'
    }).setOrigin(1, 0.5);

    this.enemyText = this.add.text(width - 12, 18, '🎯 1', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#94a3b8'
    }).setOrigin(1, 0.5);

    // Row 2 (y: 44): Full untruncated biographical milestone title spanning screen width
    this.subText = this.add.text(width / 2, 44, 'Allan is Born!', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      color: '#f1f5f9',
      align: 'center',
      wordWrap: { width: width - 24 }
    }).setOrigin(0.5);

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
      this.titleText.setText(`L${data.levelNum}/70 • ${data.year}`);
    }

    if (data.title !== undefined) {
      // Never truncate — adapt font size so full text displays cleanly
      this.subText.setText(data.title);
      if (data.title.length > 46) {
        this.subText.setFontSize('10.5px');
      } else if (data.title.length > 34) {
        this.subText.setFontSize('11.5px');
      } else {
        this.subText.setFontSize('12.5px');
      }
    }

    if (data.minesAvailable !== undefined) {
      this.minesText.setText(`💣 ${data.minesAvailable}`);
    }

    if (data.enemyCount !== undefined) {
      this.enemyText.setText(`🎯 ${data.enemyCount}`);
    }
  }
}
