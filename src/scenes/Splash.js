// src/scenes/Splash.js
// Warm festive splash screen unlocking Web Audio API on first user interaction

import { audio } from '../systems/AudioManager.js';
import { storage } from '../systems/Storage.js';

export class SplashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Splash' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const progress = storage.getProgress();

    // 1. Background gradient / dark midnight celebratory canvas
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e1b4b, 0x1e1b4b, 1);
    bg.fillRect(0, 0, width, height);

    // 2. Drifting confetti particles
    const confettiColors = [0xffd700, 0xec4899, 0x38bdf8, 0x22c55e, 0xf97316];
    for (let i = 0; i < 25; i++) {
      const x = Phaser.Math.Between(20, width - 20);
      const y = Phaser.Math.Between(20, height - 20);
      const p = this.add.rectangle(x, y, 6, 6, Phaser.Utils.Array.GetRandom(confettiColors));
      p.setAlpha(0.6);
      this.tweens.add({
        targets: p,
        y: y + Phaser.Math.Between(40, 100),
        x: x + Phaser.Math.Between(-20, 20),
        angle: 360,
        alpha: { from: 0.8, to: 0.2 },
        duration: Phaser.Math.Between(2500, 4500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // 3. Animated Birthday Cake / Tank Icon
    const cakeContainer = this.add.container(width / 2, height * 0.24);

    const cakeText = this.add.text(0, 0, '🎂', {
      fontSize: '64px',
      align: 'center'
    }).setOrigin(0.5);

    cakeContainer.add(cakeText);

    this.tweens.add({
      targets: cakeContainer,
      y: height * 0.24 - 8,
      scaleY: 1.05,
      scaleX: 1.03,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 4. Headline & Family Dedication
    this.add.text(width / 2, height * 0.35, 'HAPPY 70th BIRTHDAY,\nALLAN!', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '27px',
      fontWeight: 'bold',
      color: '#ffd700',
      align: 'center',
      lineSpacing: 6,
      shadow: { color: '#b45309', fill: true, blur: 8, offsetX: 0, offsetY: 2 }
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.45, 'From Cody\n— and Carrie ❤️', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '16px',
      color: '#cbd5e1',
      align: 'center',
      lineSpacing: 5
    }).setOrigin(0.5);

    // Motorcycle Graphic Preview
    const bike = this.add.sprite(width / 2, height * 0.54, 'motorcycle').setScale(1.5);
    this.add.sprite(width / 2, height * 0.54, 'turret').setScale(1.5);
    this.tweens.add({
      targets: bike,
      angle: { from: -4, to: 4 },
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    this.add.text(width / 2, height * 0.60, 'Allan\'s Cruiser Tank Edition', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      color: '#94a3b8'
    }).setOrigin(0.5);

    // 5. Full-Screen "TAP ANYWHERE TO CONTINUE" Interactive Zone
    const promptY = height * 0.74;

    const promptContainer = this.add.container(width / 2, promptY);

    const promptBg = this.add.graphics();
    promptBg.fillStyle(0x22c55e, 0.95);
    promptBg.fillRoundedRect(-170, -26, 340, 52, 16);
    promptBg.lineStyle(3, 0x86efac, 1);
    promptBg.strokeRoundedRect(-170, -26, 340, 52, 16);
    promptContainer.add(promptBg);

    const promptText = this.add.text(0, 0, '★ PRESS ANYWHERE TO CONTINUE ★', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#ffffff',
      letterSpacing: 1
    }).setOrigin(0.5);
    promptContainer.add(promptText);

    // Pulse animation
    this.tweens.add({
      targets: promptContainer,
      scale: 1.05,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.add.text(width / 2, height * 0.83, 'Allan\'s Retro Arcade Collection • 4 Classic Games', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: '600',
      color: '#38bdf8',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.87, 'Tanks • Pong • Space Invaders • Asteroids', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      color: '#94a3b8'
    }).setOrigin(0.5);

    // Full screen interactive zone (blocks nothing, unlocks Web Audio immediately)
    const fullScreenZone = this.add.zone(width / 2, height / 2, width, height)
      .setInteractive({ useHandCursor: true });

    let started = false;
    const launchGameSelect = () => {
      if (started) return;
      started = true;
      audio.init();
      audio.playShoot();

      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.time.delayedCall(250, () => {
        this.scene.start('GameSelect');
      });
    };

    fullScreenZone.on('pointerdown', launchGameSelect);
    this.input.keyboard?.on('keydown', launchGameSelect);

    // 6. Small "Credits" Link in Bottom Right
    const creditsLink = this.add.container(width - 20, height - 22);
    const creditsText = this.add.text(0, 0, 'Credits 📜', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: '600',
      color: '#94a3b8'
    }).setOrigin(1, 1);

    creditsLink.add(creditsText);
    creditsLink.setSize(75, 40);
    creditsLink.setInteractive({ useHandCursor: true });
    creditsLink.setDepth(100);

    creditsLink.on('pointerdown', (pointer, localX, localY, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      audio.init();
      this.scene.start('Credits', { returnScene: 'Splash' });
    });

    creditsLink.on('pointerover', () => {
      creditsText.setColor('#ffd700');
    });

    creditsLink.on('pointerout', () => {
      creditsText.setColor('#94a3b8');
    });
  }
}
