// src/scenes/Splash.js
// Warm festive splash screen unlocking Web Audio API on first user interaction

import { audio } from '../systems/AudioManager.js';

export class SplashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Splash' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

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
    const cakeContainer = this.add.container(width / 2, height * 0.26);

    const cakeText = this.add.text(0, 0, '🎂', {
      fontSize: '68px',
      align: 'center'
    }).setOrigin(0.5);

    cakeContainer.add(cakeText);

    this.tweens.add({
      targets: cakeContainer,
      y: height * 0.26 - 10,
      scaleY: 1.05,
      scaleX: 1.03,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 4. Headline & Family Dedication
    this.add.text(width / 2, height * 0.38, 'HAPPY 70th BIRTHDAY,\nALLAN!', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#ffd700',
      align: 'center',
      lineSpacing: 8,
      shadow: { color: '#b45309', fill: true, blur: 8, offsetX: 0, offsetY: 2 }
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.49, 'From Cody, Amy, Jenn & Kelsey\n— and Carrie ❤️', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '17px',
      color: '#cbd5e1',
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5);

    // Motorcycle Graphic Preview
    const bike = this.add.sprite(width / 2, height * 0.58, 'motorcycle').setScale(1.6);
    this.add.sprite(width / 2, height * 0.58, 'turret').setScale(1.6);
    this.tweens.add({
      targets: bike,
      angle: { from: -4, to: 4 },
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    this.add.text(width / 2, height * 0.64, 'Allan\'s Cruiser Tank Edition', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      color: '#94a3b8'
    }).setOrigin(0.5);

    // 5. "TAP TO PLAY" Interactive Button (Audio unlock gate)
    const btnWidth = 240;
    const btnHeight = 56;
    const btnX = width / 2;
    const btnY = height * 0.76;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x22c55e, 1);
    btnBg.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 16);
    btnBg.lineStyle(3, 0x86efac, 1);
    btnBg.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 16);

    const btnText = this.add.text(btnX, btnY, 'TAP TO PLAY', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '22px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    const hitZone = this.add.zone(btnX, btnY, btnWidth, btnHeight)
      .setInteractive({ useHandCursor: true });

    // Pulse button animation
    this.tweens.add({
      targets: [btnBg, btnText],
      scale: 1.04,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Tap handler
    hitZone.on('pointerdown', () => {
      // Unlock Web Audio API context
      audio.init();
      audio.playShoot();

      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('LevelCard', {
          levelNum: 1,
          lives: 3,
          tanksDefeated: 0
        });
      });
    });

    this.add.text(width / 2, height * 0.85, '70 Levels • 1956 to 2026', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      color: '#64748b'
    }).setOrigin(0.5);
  }
}
