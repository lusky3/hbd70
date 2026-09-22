// src/scenes/SpaceInvaders.js
// Birthday Space Invaders clone with milestone decade bunkers

import { audio } from '../systems/AudioManager.js';
import { ControlsOverlay } from './ControlsOverlay.js';

export class SpaceInvadersScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SpaceInvaders' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.gameActive = false;

    // 1. Dark Space Background with Twinkling Stars
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x050814, 0x050814, 0x0c0a20, 0x0c0a20, 1);
    bg.fillRect(0, 0, width, height);

    for (let i = 0; i < 40; i++) {
      const sx = Phaser.Math.Between(10, width - 10);
      const sy = Phaser.Math.Between(75, height - 120);
      const star = this.add.circle(sx, sy, Phaser.Math.FloatBetween(1, 2), 0xffffff, Phaser.Math.FloatBetween(0.3, 0.9));
      this.tweens.add({
        targets: star,
        alpha: { from: 0.2, to: 1 },
        duration: Phaser.Math.Between(1200, 2400),
        yoyo: true,
        repeat: -1
      });
    }

    // 2. Top HUD
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x0f172a, 0.95);
    hudBg.fillRect(0, 0, width, 68);
    hudBg.lineStyle(2, 0xa855f7, 0.8);
    hudBg.lineBetween(0, 68, width, 68);

    // Menu Button
    const backBtn = this.add.container(20, 34);
    const backBg = this.add.graphics();
    backBg.fillStyle(0x1e293b, 1);
    backBg.fillRoundedRect(0, -18, 70, 36, 8);
    backBg.lineStyle(1.5, 0x64748b, 1);
    backBg.strokeRoundedRect(0, -18, 70, 36, 8);
    backBtn.add(backBg);

    const backText = this.add.text(35, 0, '< MENU', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#cbd5e1'
    }).setOrigin(0.5);
    backBtn.add(backText);
    backBtn.setSize(70, 36);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      audio.playShoot();
      this.scene.start('GameSelect');
    });

    this.scoreText = this.add.text(width / 2 - 30, 26, 'SCORE: 0000', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '15px',
      fontWeight: 'bold',
      color: '#ffd700'
    }).setOrigin(0.5);

    this.livesText = this.add.text(width / 2 - 30, 48, 'LIVES: ❤️❤️❤️', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#f43f5e'
    }).setOrigin(0.5);

    this.waveText = this.add.text(width - 95, 34, 'WAVE 1', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#c084fc'
    }).setOrigin(0.5);

    // Sound button
    const muteBtn = this.add.container(width - 34, 34);
    const muteText = this.add.text(0, 0, audio.isMuted ? '🔇' : '🔊', {
      fontSize: '18px'
    }).setOrigin(0.5);
    muteBtn.add(muteText);
    muteBtn.setSize(32, 32);
    muteBtn.setInteractive({ useHandCursor: true });
    muteBtn.on('pointerdown', () => {
      audio.toggleMute();
      muteText.setText(audio.isMuted ? '🔇' : '🔊');
    });

    // 3. Groups & Objects
    this.invaders = this.physics.add.group();
    this.playerBullets = this.physics.add.group();
    this.invaderBullets = this.physics.add.group();
    this.bunkers = this.physics.add.staticGroup();

    // 4. Player Cannon
    this.player = this.physics.add.sprite(width / 2, 730, 'motorcycle');
    this.player.setCollideWorldBounds(true);
    this.player.body.allowGravity = false;
    this.playerSpeed = 300;

    // 5. Create Milestone Bunkers
    this.createMilestoneBunkers();

    // 6. Setup Invaders
    this.setupWave();

    // 7. Touch Controls Action Bar (Bottom 15%)
    this.setupTouchControls();

    // 8. Desktop Keyboard Input
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keyA = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // 9. Mystery UFO Timer
    this.time.addEvent({
      delay: Phaser.Math.Between(15000, 25000),
      callback: this.spawnMysteryUFO,
      callbackScope: this,
      loop: true
    });

    // 10. Invader March Timer
    this.stepCounter = 0;
    this.marchDir = 1;
    this.marchSpeed = 650; // ms per step
    this.scheduleNextMarch();

    // 11. Invader Firing Timer
    this.time.addEvent({
      delay: 1400,
      callback: this.invaderShoot,
      callbackScope: this,
      loop: true
    });

    // 12. Collisions
    this.physics.add.overlap(this.playerBullets, this.invaders, this.onBulletHitInvader, null, this);
    this.physics.add.overlap(this.playerBullets, this.bunkers, this.onBulletHitBunker, null, this);
    this.physics.add.overlap(this.invaderBullets, this.bunkers, this.onInvaderBulletHitBunker, null, this);
    this.physics.add.overlap(this.invaderBullets, this.player, this.onPlayerHit, null, this);

    // Show Level 1 How to Play
    ControlsOverlay.show(this, 'invaders', () => {
      this.gameActive = true;
    });
  }

  createMilestoneBunkers() {
    const width = this.cameras.main.width;
    const decades = ['1956', '1976', '1996', '2026'];
    const bunkerY = 640;
    const spacing = width / 4;

    decades.forEach((year, index) => {
      const bx = (spacing * index) + (spacing / 2);

      // Label above bunker
      this.add.text(bx, bunkerY - 20, year, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '11px',
        fontWeight: 'bold',
        color: '#10b981'
      }).setOrigin(0.5);

      // 3x2 grid of bunker blocks
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          const block = this.bunkers.create(bx - 12 + (c * 12), bunkerY + (r * 12), 'bunker_block');
          block.body.setSize(12, 12);
        }
      }
    });
  }

  setupWave() {
    this.invaders.clear(true, true);
    const width = this.cameras.main.width;
    const cols = 6;
    const rows = 4;
    const startX = 60;
    const startY = 130;
    const colSpacing = 60;
    const rowSpacing = 42;

    const rowTextures = ['invader_cake', 'invader_present', 'invader_candle', 'invader_train'];
    const rowPoints = [30, 20, 10, 10];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const inv = this.invaders.create(startX + (c * colSpacing), startY + (r * rowSpacing), rowTextures[r]);
        inv.setData('points', rowPoints[r]);
        inv.body.allowGravity = false;
        inv.body.setSize(26, 20);
      }
    }

    this.marchDir = 1;
    this.marchSpeed = Math.max(220, 700 - (this.wave * 80));
  }

  scheduleNextMarch() {
    if (this.marchTimer) this.marchTimer.remove();
    this.marchTimer = this.time.delayedCall(this.marchSpeed, () => {
      this.marchInvaders();
      if (this.invaders.countActive() > 0) {
        this.scheduleNextMarch();
      }
    });
  }

  marchInvaders() {
    if (!this.gameActive || this.invaders.countActive() === 0) return;

    this.stepCounter++;
    audio.playInvaderStep(this.stepCounter);

    const width = this.cameras.main.width;
    let hitEdge = false;

    this.invaders.children.iterate((inv) => {
      if (!inv || !inv.active) return;
      if ((this.marchDir === 1 && inv.x >= width - 36) || (this.marchDir === -1 && inv.x <= 36)) {
        hitEdge = true;
      }
    });

    if (hitEdge) {
      this.marchDir *= -1;
      this.invaders.children.iterate((inv) => {
        if (!inv || !inv.active) return;
        inv.y += 16;
        if (inv.y >= this.player.y - 20) {
          this.handleGameOver();
        }
      });
    } else {
      this.invaders.children.iterate((inv) => {
        if (!inv || !inv.active) return;
        inv.x += this.marchDir * 14;
      });
    }
  }

  invaderShoot() {
    if (!this.gameActive || this.invaders.countActive() === 0) return;

    // Pick a random alive invader to fire
    const aliveInvaders = this.invaders.getChildren().filter((inv) => inv.active);
    if (aliveInvaders.length === 0) return;

    const shooter = Phaser.Utils.Array.GetRandom(aliveInvaders);
    const bullet = this.invaderBullets.create(shooter.x, shooter.y + 14, 'invader_bullet');
    bullet.setVelocityY(260 + (this.wave * 20));
    bullet.body.allowGravity = false;
  }

  setupTouchControls() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Left Button
    const leftBtn = this.add.container(70, height - 45);
    const lBg = this.add.graphics();
    lBg.fillStyle(0x1e293b, 0.9);
    lBg.fillRoundedRect(-45, -28, 90, 56, 12);
    lBg.lineStyle(2, 0x64748b, 1);
    lBg.strokeRoundedRect(-45, -28, 90, 56, 12);
    leftBtn.add(lBg);
    const lText = this.add.text(0, 0, '◀ LEFT', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    leftBtn.add(lText);
    leftBtn.setSize(90, 56);
    leftBtn.setInteractive({ useHandCursor: true });
    leftBtn.on('pointerdown', () => { this.touchMoveDir = -1; });
    leftBtn.on('pointerup', () => { if (this.touchMoveDir === -1) this.touchMoveDir = 0; });
    leftBtn.on('pointerout', () => { if (this.touchMoveDir === -1) this.touchMoveDir = 0; });

    // Right Button
    const rightBtn = this.add.container(175, height - 45);
    const rBg = this.add.graphics();
    rBg.fillStyle(0x1e293b, 0.9);
    rBg.fillRoundedRect(-45, -28, 90, 56, 12);
    rBg.lineStyle(2, 0x64748b, 1);
    rBg.strokeRoundedRect(-45, -28, 90, 56, 12);
    rightBtn.add(rBg);
    const rText = this.add.text(0, 0, 'RIGHT ▶', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    rightBtn.add(rText);
    rightBtn.setSize(90, 56);
    rightBtn.setInteractive({ useHandCursor: true });
    rightBtn.on('pointerdown', () => { this.touchMoveDir = 1; });
    rightBtn.on('pointerup', () => { if (this.touchMoveDir === 1) this.touchMoveDir = 0; });
    rightBtn.on('pointerout', () => { if (this.touchMoveDir === 1) this.touchMoveDir = 0; });

    // Fire Button
    const fireBtn = this.add.container(width - 90, height - 45);
    const fBg = this.add.graphics();
    fBg.fillStyle(0xe11d48, 1);
    fBg.fillRoundedRect(-65, -28, 130, 56, 14);
    fBg.lineStyle(2, 0xfca5a5, 1);
    fBg.strokeRoundedRect(-65, -28, 130, 56, 14);
    fireBtn.add(fBg);
    const fText = this.add.text(0, 0, '🔥 FIRE', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    fireBtn.add(fText);
    fireBtn.setSize(130, 56);
    fireBtn.setInteractive({ useHandCursor: true });
    fireBtn.on('pointerdown', () => { this.firePlayerBullet(); });

    this.touchMoveDir = 0;

    // Optional direct drag on player area
    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown && pointer.y > 670 && pointer.y < height - 80) {
        this.player.x = Phaser.Math.Clamp(pointer.x, 30, width - 30);
      }
    });
  }

  firePlayerBullet() {
    if (!this.gameActive) return;
    if (this.playerBullets.countActive() >= 2) return; // Hard cap of 2 active bullets

    audio.playShoot();
    const bullet = this.playerBullets.create(this.player.x, this.player.y - 18, 'invader_bullet');
    bullet.setTint(0x38bdf8);
    bullet.setVelocityY(-480);
    bullet.body.allowGravity = false;
  }

  update(time, delta) {
    if (!this.gameActive) return;

    // Player Horizontal Movement
    let vx = 0;
    if (this.cursors?.left.isDown || this.keyA?.isDown || this.touchMoveDir === -1) {
      vx = -this.playerSpeed;
    } else if (this.cursors?.right.isDown || this.keyD?.isDown || this.touchMoveDir === 1) {
      vx = this.playerSpeed;
    }
    this.player.setVelocityX(vx);

    if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      this.firePlayerBullet();
    }

    // Clean up out of bound bullets
    this.playerBullets.children.iterate((b) => {
      if (b && b.y < 72) b.destroy();
    });
    this.invaderBullets.children.iterate((b) => {
      if (b && b.y > 800) b.destroy();
    });

    if (this.mysteryUfo && this.mysteryUfo.active && this.mysteryUfo.x > this.cameras.main.width + 40) {
      this.mysteryUfo.destroy();
    }
  }

  spawnMysteryUFO() {
    if (!this.gameActive || this.mysteryUfo?.active) return;
    audio.playUfoSound();
    this.mysteryUfo = this.physics.add.sprite(-30, 95, 'invader_ufo');
    this.mysteryUfo.setVelocityX(140);
    this.mysteryUfo.body.allowGravity = false;
    this.physics.add.overlap(this.playerBullets, this.mysteryUfo, (bullet, ufo) => {
      audio.playVictory();
      bullet.destroy();
      ufo.destroy();
      const bonus = Phaser.Utils.Array.GetRandom([100, 200, 300]);
      this.addScore(bonus);
      this.showToast(`+${bonus} CN RAILCAR BONUS!`);
    });
  }

  onBulletHitInvader(bullet, invader) {
    audio.playInvaderKilled();
    const pts = invader.getData('points') || 10;
    bullet.destroy();
    invader.destroy();
    this.addScore(pts);

    // Accelerate remaining invaders
    const remaining = this.invaders.countActive();
    if (remaining > 0) {
      this.marchSpeed = Math.max(120, (remaining / 24) * 650);
    } else {
      this.handleWaveCleared();
    }
  }

  onBulletHitBunker(bullet, block) {
    audio.playBounce();
    bullet.destroy();
    block.destroy();
  }

  onInvaderBulletHitBunker(bullet, block) {
    bullet.destroy();
    block.destroy();
  }

  onPlayerHit(player, bullet) {
    bullet.destroy();
    audio.playExplosion();
    this.lives--;
    this.livesText.setText(`LIVES: ${'❤️'.repeat(Math.max(0, this.lives))}`);

    // Flash player invulnerability
    this.player.setAlpha(0.4);
    this.tweens.add({
      targets: this.player,
      alpha: 1,
      duration: 180,
      repeat: 4,
      onComplete: () => { this.player.setAlpha(1); }
    });

    if (this.lives <= 0) {
      this.handleGameOver();
    }
  }

  addScore(pts) {
    this.score += pts;
    const s = String(this.score).padStart(4, '0');
    this.scoreText.setText(`SCORE: ${s}`);
  }

  handleWaveCleared() {
    this.gameActive = false;
    audio.playVictory();
    this.wave++;
    this.showToast(`WAVE ${this.wave - 1} CLEARED! +500 BONUS`);
    this.addScore(500);
    this.waveText.setText(`WAVE ${this.wave}`);

    this.time.delayedCall(1600, () => {
      this.setupWave();
      this.gameActive = true;
      this.scheduleNextMarch();
    });
  }

  handleGameOver() {
    this.gameActive = false;
    audio.playGameOver();
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const modal = this.add.container(width / 2, height / 2);
    modal.setDepth(2000);

    const mBg = this.add.graphics();
    mBg.fillStyle(0x0f172a, 0.96);
    mBg.fillRoundedRect(-180, -120, 360, 240, 16);
    mBg.lineStyle(3, 0xef4444, 1);
    mBg.strokeRoundedRect(-180, -120, 360, 240, 16);
    modal.add(mBg);

    const title = this.add.text(0, -75, 'GAME OVER', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5);

    const finalScore = this.add.text(0, -35, `Final Score: ${this.score}`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#ffd700'
    }).setOrigin(0.5);

    const waveReached = this.add.text(0, -10, `Waves Survived: ${this.wave}`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      color: '#cbd5e1'
    }).setOrigin(0.5);

    modal.add([title, finalScore, waveReached]);

    // Try Again
    const retryBtn = this.add.container(0, 35);
    const rBg = this.add.graphics();
    rBg.fillStyle(0x22c55e, 1);
    rBg.fillRoundedRect(-110, -16, 220, 34, 8);
    retryBtn.add(rBg);
    const rText = this.add.text(0, 0, 'TRY AGAIN ▶', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    retryBtn.add(rText);
    retryBtn.setSize(220, 34);
    retryBtn.setInteractive({ useHandCursor: true });
    retryBtn.on('pointerdown', () => {
      audio.playShoot();
      this.scene.restart();
    });
    modal.add(retryBtn);

    // Menu Button
    const menuBtn = this.add.container(0, 78);
    const mBtnBg = this.add.graphics();
    mBtnBg.fillStyle(0x1e293b, 1);
    mBtnBg.fillRoundedRect(-110, -16, 220, 34, 8);
    mBtnBg.lineStyle(1.5, 0x64748b, 1);
    mBtnBg.strokeRoundedRect(-110, -16, 220, 34, 8);
    menuBtn.add(mBtnBg);
    const mText = this.add.text(0, 0, 'BACK TO ARCADE', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#cbd5e1'
    }).setOrigin(0.5);
    menuBtn.add(mText);
    menuBtn.setSize(220, 34);
    menuBtn.setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => {
      audio.playShoot();
      this.scene.start('GameSelect');
    });
    modal.add(menuBtn);
  }

  showToast(msg) {
    const width = this.cameras.main.width;
    const toast = this.add.text(width / 2, 105, msg, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#ffd700',
      backgroundColor: '#0f172ae6',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setDepth(1500);

    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: 90,
      duration: 1500,
      onComplete: () => toast.destroy()
    });
  }
}
