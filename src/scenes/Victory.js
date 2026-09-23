// src/scenes/Victory.js
// Heartfelt grand finale victory celebration for Allan's 70th Birthday

import { audio } from '../systems/AudioManager.js';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Victory' });
  }

  init(data) {
    this.tanksDefeated = data.tanksDefeated || 70;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 1. Festive midnight celebration background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1e1b4b, 0x1e1b4b, 0x0f172a, 0x0f172a, 1);
    bg.fillRect(0, 0, width, height);

    // 2. Continuous confetti shower
    const confettiColors = [0xffd700, 0xec4899, 0x38bdf8, 0x22c55e, 0xf97316, 0xa855f7];
    for (let i = 0; i < 40; i++) {
      const p = this.add.rectangle(
        Phaser.Math.Between(10, width - 10),
        Phaser.Math.Between(-50, height),
        Phaser.Math.Between(6, 10),
        Phaser.Math.Between(6, 10),
        Phaser.Utils.Array.GetRandom(confettiColors)
      );

      this.tweens.add({
        targets: p,
        y: height + 60,
        x: p.x + Phaser.Math.Between(-40, 40),
        angle: 720,
        duration: Phaser.Math.Between(2200, 4000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
        ease: 'Linear'
      });
    }

    // Play victory fanfare
    audio.playFanfare();

    // 3. Golden Trophy / Cake Emblem
    const trophy = this.add.text(width / 2, height * 0.18, '🏆', {
      fontSize: '72px',
      align: 'center'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: trophy,
      scale: 1.12,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 4. Headline
    this.add.text(width / 2, height * 0.31, '70 LEVELS. 70 YEARS.', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '22px',
      fontWeight: '900',
      color: '#ffd700',
      align: 'center',
      letterSpacing: 2
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.37, 'STILL GOING STRONG.', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#38bdf8',
      align: 'center'
    }).setOrigin(0.5);

    // 5. Emotional Family Message
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x1e293b, 0.88);
    cardBg.fillRoundedRect(width / 2 - 190, height * 0.44, 380, 150, 18);
    cardBg.lineStyle(2, 0xfbbf24, 0.6);
    cardBg.strokeRoundedRect(width / 2 - 190, height * 0.44, 380, 150, 18);

    this.add.text(width / 2, height * 0.49, 'HAPPY 70th BIRTHDAY,\nDAD! ❤️', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.58, 'With all our love,\nCody, Amy, Jenn, Kelsey & Carrie', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '16px',
      color: '#facc15',
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5);

    // Motorcycle victory cruise
    const bike = this.add.sprite(width / 2, height * 0.66, 'motorcycle').setScale(1.7);
    this.add.sprite(width / 2, height * 0.66, 'turret').setScale(1.7);
    this.tweens.add({
      targets: bike,
      x: { from: width / 2 - 15, to: width / 2 + 15 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 6. Campaign Stats Card
    const statsCard = this.add.graphics();
    statsCard.fillStyle(0x0f172a, 0.85);
    statsCard.fillRoundedRect(width / 2 - 140, height * 0.73 - 16, 280, 32, 12);
    statsCard.lineStyle(1.5, 0x38bdf8, 0.8);
    statsCard.strokeRoundedRect(width / 2 - 140, height * 0.73 - 16, 280, 32, 12);

    this.add.text(width / 2, height * 0.73, `★ Tanks Defeated: ${this.tanksDefeated} • 70/70 Levels ★`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5);

    // 7. Leaderboard Record Score Button
    const lbBtnWidth = 240;
    const lbBtnHeight = 42;
    const lbBtnY = height * 0.80;
    const lbBtn = this.add.container(width / 2, lbBtnY);
    const lbBg = this.add.graphics();
    lbBg.fillStyle(0x0f172a, 1);
    lbBg.fillRoundedRect(-lbBtnWidth / 2, -lbBtnHeight / 2, lbBtnWidth, lbBtnHeight, 12);
    lbBg.lineStyle(2, 0xfacc15, 1);
    lbBg.strokeRoundedRect(-lbBtnWidth / 2, -lbBtnHeight / 2, lbBtnWidth, lbBtnHeight, 12);
    lbBtn.add(lbBg);

    const lbText = this.add.text(0, 0, '🏆 RECORD HIGH SCORE 🏆', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#facc15'
    }).setOrigin(0.5);
    lbBtn.add(lbText);
    const lbZone = this.add.zone(0, 0, lbBtnWidth, lbBtnHeight).setInteractive({ useHandCursor: true });
    lbBtn.add(lbZone);
    lbZone.on('pointerdown', () => {
      audio.playShoot?.();
      this.scene.launch('InitialsEntryOverlay', {
        gameId: 'tanks',
        score: 70000 + (this.tanksDefeated || 0) * 50,
        detail: 'Campaign Victory 70/70',
        returnScene: 'Victory'
      });
    });

    // 8. Play Again Button
    const btnWidth = 240;
    const btnHeight = 42;
    const btnX = width / 2;
    const btnY = height * 0.88;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x22c55e, 1);
    btnBg.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 12);
    btnBg.lineStyle(2, 0x86efac, 1);
    btnBg.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 12);

    const btnText = this.add.text(btnX, btnY, 'PLAY AGAIN ▶', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    const hitZone = this.add.zone(btnX, btnY, btnWidth, btnHeight)
      .setInteractive({ useHandCursor: true });

    hitZone.on('pointerdown', () => {
      audio.playShoot();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('Splash');
      });
    });
  }
}
