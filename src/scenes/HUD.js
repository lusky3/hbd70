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

    // Top-Right Secret Cheat Hitbox: 3 taps within 750ms toggles invincibility
    let cornerTaps = 0;
    let lastCornerTapTime = 0;
    const cornerZone = this.add.zone(width - 40, 32, 80, 64)
      .setInteractive({ useHandCursor: true });

    cornerZone.on('pointerdown', () => {
      const now = Date.now();
      if (now - lastCornerTapTime < 750) {
        cornerTaps++;
      } else {
        cornerTaps = 1;
      }
      lastCornerTapTime = now;

      if (cornerTaps >= 3) {
        cornerTaps = 0;
        const g = this.scene.get('Game');
        if (g && g.toggleInvincibleCheat) {
          g.toggleInvincibleCheat();
        }
      }
    });

    // Adjustable Game Speed Bar (between arena bottom y:582 and controls y:615)
    const speedBarY = 598;
    const speedContainer = this.add.container(0, 0);
    speedContainer.setDepth(100);

    const sBg = this.add.graphics();
    sBg.fillStyle(0x0f172a, 0.94);
    sBg.fillRoundedRect(width / 2 - 145, speedBarY - 14, 290, 28, 8);
    sBg.lineStyle(1.5, 0x334155, 0.9);
    sBg.strokeRoundedRect(width / 2 - 145, speedBarY - 14, 290, 28, 8);
    speedContainer.add(sBg);

    this.cpuSpeed = (gameScene && gameScene.cpuSpeedMultiplier) ? gameScene.cpuSpeedMultiplier : 1.0;

    const speedLabel = this.add.text(width / 2 - 135, speedBarY, 'CPU SPEED', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#94a3b8'
    }).setOrigin(0, 0.5);
    speedContainer.add(speedLabel);

    const minusBtn = this.add.text(width / 2 - 58, speedBarY, '[-]', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    speedContainer.add(minusBtn);

    const speedValueText = this.add.text(width / 2 - 20, speedBarY, `${this.cpuSpeed.toFixed(2)}x`, {
      fontFamily: 'monospace',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#ffd700'
    }).setOrigin(0.5);
    speedContainer.add(speedValueText);

    const plusBtn = this.add.text(width / 2 + 18, speedBarY, '[+]', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    speedContainer.add(plusBtn);

    const trackStartX = width / 2 + 38;
    const trackEndX = width / 2 + 132;
    const trackWidth = trackEndX - trackStartX;
    const minMult = 0.25;
    const maxMult = 2.0;

    const trackGraphics = this.add.graphics();
    speedContainer.add(trackGraphics);

    const thumb = this.add.circle(trackStartX, speedBarY, 5, 0x38bdf8);
    thumb.setStrokeStyle(1.5, 0xffffff);
    speedContainer.add(thumb);

    const updateSpeedUI = (newSpeed) => {
      this.cpuSpeed = Phaser.Math.Clamp(Math.round(newSpeed * 20) / 20, minMult, maxMult);
      speedValueText.setText(`${this.cpuSpeed.toFixed(2)}x`);

      const ratio = (this.cpuSpeed - minMult) / (maxMult - minMult);
      const thumbX = trackStartX + ratio * trackWidth;
      thumb.setPosition(thumbX, speedBarY);

      trackGraphics.clear();
      trackGraphics.lineStyle(3, 0x334155, 1);
      trackGraphics.lineBetween(trackStartX, speedBarY, trackEndX, speedBarY);
      trackGraphics.lineStyle(3, 0x38bdf8, 1);
      trackGraphics.lineBetween(trackStartX, speedBarY, thumbX, speedBarY);

      const g = this.scene.get('Game');
      if (g) {
        g.events.emit('set-cpu-speed', this.cpuSpeed);
      }
    };

    updateSpeedUI(this.cpuSpeed);

    minusBtn.on('pointerdown', () => {
      updateSpeedUI(this.cpuSpeed - 0.25);
    });

    plusBtn.on('pointerdown', () => {
      updateSpeedUI(this.cpuSpeed + 0.25);
    });

    const sliderZone = this.add.zone(trackStartX + trackWidth / 2, speedBarY, trackWidth + 20, 26)
      .setInteractive({ useHandCursor: true });
    speedContainer.add(sliderZone);

    let isDraggingSlider = false;
    sliderZone.on('pointerdown', (pointer) => {
      isDraggingSlider = true;
      const ratio = Phaser.Math.Clamp((pointer.x - trackStartX) / trackWidth, 0, 1);
      updateSpeedUI(minMult + ratio * (maxMult - minMult));
    });

    this.input.on('pointermove', (pointer) => {
      if (isDraggingSlider) {
        const ratio = Phaser.Math.Clamp((pointer.x - trackStartX) / trackWidth, 0, 1);
        updateSpeedUI(minMult + ratio * (maxMult - minMult));
      }
    });

    this.input.on('pointerup', () => {
      isDraggingSlider = false;
    });

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      const g = this.scene.get('Game');
      if (g) {
        g.events.off('update-hud', this.onUpdateHud, this);
      }
    });
  }

  showToast(text, color = '#10b981') {
    if (this.currentToast && this.currentToast.active) {
      this.currentToast.destroy();
      this.currentToast = null;
    }

    const width = this.cameras.main.width;
    const container = this.add.container(width / 2, 86);
    container.setDepth(300);

    const textObj = this.add.text(0, 0, text, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: color
    }).setOrigin(0.5);

    const textWidth = textObj.width + 24;
    const bg = this.add.graphics();
    bg.fillStyle(0x0f172a, 0.95);
    bg.fillRoundedRect(-textWidth / 2, -14, textWidth, 28, 8);
    const strokeCol = Phaser.Display.Color.HexStringToColor(color).color;
    bg.lineStyle(1.5, strokeCol, 0.9);
    bg.strokeRoundedRect(-textWidth / 2, -14, textWidth, 28, 8);

    container.add(bg);
    container.add(textObj);
    this.currentToast = container;

    container.setAlpha(0);
    container.setScale(0.9);

    this.tweens.add({
      targets: container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(1600, () => {
          if (container.active) {
            this.tweens.add({
              targets: container,
              alpha: 0,
              y: 70,
              duration: 250,
              ease: 'Cubic.easeIn',
              onComplete: () => {
                container.destroy();
                if (this.currentToast === container) {
                  this.currentToast = null;
                }
              }
            });
          }
        });
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
