// src/scenes/SpaceInvaders.js
// Birthday Space Invaders clone with milestone decade bunkers

import { audio } from '../systems/AudioManager.js';
import { storage } from '../systems/Storage.js';
import { ControlsOverlay } from './ControlsOverlay.js';

export class SpaceInvadersScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SpaceInvaders' });
  }

  init(data) {
    this.resumeData = data?.resumeSession || null;
    this.isMatchOver = false;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.score = this.resumeData ? (this.resumeData.score || 0) : 0;
    this.lives = this.resumeData ? (this.resumeData.lives !== undefined ? this.resumeData.lives : 3) : 3;
    this.wave = this.resumeData ? (this.resumeData.wave || 1) : 1;
    this.gameActive = false;
    this.isInvulnerable = false;

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
    const backZone = this.add.zone(35, 0, 70, 36).setInteractive({ useHandCursor: true });
    backBtn.add(backZone);
    backZone.on('pointerdown', () => {
      audio.playShoot();
      this.captureSessionState();
      this.scene.start('GameSelect');
    });
    backZone.on('pointerover', () => {
      backBg.clear();
      backBg.fillStyle(0x334155, 1);
      backBg.fillRoundedRect(0, -18, 70, 36, 8);
      backBg.lineStyle(1.5, 0x94a3b8, 1);
      backBg.strokeRoundedRect(0, -18, 70, 36, 8);
      backText.setColor('#ffffff');
    });
    backZone.on('pointerout', () => {
      backBg.clear();
      backBg.fillStyle(0x1e293b, 1);
      backBg.fillRoundedRect(0, -18, 70, 36, 8);
      backBg.lineStyle(1.5, 0x64748b, 1);
      backBg.strokeRoundedRect(0, -18, 70, 36, 8);
      backText.setColor('#cbd5e1');
    });

    this.highScore = storage.getArcadeStats().invaders.highScore || 0;
    const hiFormatted = String(this.highScore).padStart(4, '0');
    const scoreStr = String(this.score).padStart(4, '0');
    this.scoreText = this.add.text(width / 2 - 30, 26, `SCORE: ${scoreStr}  HI: ${hiFormatted}`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#ffd700'
    }).setOrigin(0.5);

    this.livesText = this.add.text(width / 2 - 30, 48, `LIVES: ${'❤️'.repeat(Math.max(0, this.lives))}`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#f43f5e'
    }).setOrigin(0.5);

    this.waveText = this.add.text(width - 95, 34, `WAVE ${this.wave}`, {
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
    const muteZone = this.add.zone(0, 0, 44, 44).setInteractive({ useHandCursor: true });
    muteBtn.add(muteZone);
    muteZone.on('pointerdown', () => {
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
    this.lastFiredTime = 0;
    this.fireCooldown = 250;
    this.reloadGfx = this.add.graphics();
    this.reloadGfx.setDepth(100);

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

    // Show Level 1 How to Play or activate resumed session
    if (this.resumeData) {
      this.gameActive = true;
      this.showToast(`RESUMED WAVE ${this.wave}`);
      this.captureSessionState();
    } else {
      ControlsOverlay.show(this, 'invaders', () => {
        this.gameActive = true;
      });
    }
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
    const leftZone = this.add.zone(0, 0, 90, 56).setInteractive({ useHandCursor: true });
    leftBtn.add(leftZone);
    leftZone.on('pointerdown', () => { this.touchMoveDir = -1; });
    leftZone.on('pointerup', () => { if (this.touchMoveDir === -1) this.touchMoveDir = 0; });
    leftZone.on('pointerout', () => { if (this.touchMoveDir === -1) this.touchMoveDir = 0; });

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
    const rightZone = this.add.zone(0, 0, 90, 56).setInteractive({ useHandCursor: true });
    rightBtn.add(rightZone);
    rightZone.on('pointerdown', () => { this.touchMoveDir = 1; });
    rightZone.on('pointerup', () => { if (this.touchMoveDir === 1) this.touchMoveDir = 0; });
    rightZone.on('pointerout', () => { if (this.touchMoveDir === 1) this.touchMoveDir = 0; });

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
    const fireZone = this.add.zone(0, 0, 130, 56).setInteractive({ useHandCursor: true });
    fireBtn.add(fireZone);
    fireZone.on('pointerdown', () => { this.firePlayerBullet(); });

    this.fireBtnBg = fBg;
    this.fireBtnText = fText;
    this.lastReadyState = true;
    this.lastBtnText = '🔥 FIRE';
    this.touchMoveDir = 0;

    // Play-area touch dragging & tap-to-fire
    this.dragPointerId = null;
    this.isTouchDragging = false;
    this.hasMovedDrag = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    this.input.on('pointerdown', (pointer) => {
      if (pointer.y > 68 && pointer.y < height - 75) {
        // Prevent multi-touch clashing: lock to first active dragging pointer
        if (this.dragPointerId !== null) return;

        this.dragPointerId = pointer.id;
        this.isTouchDragging = true;
        this.hasMovedDrag = false;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (this.isTouchDragging && pointer.id === this.dragPointerId) {
        const dx = Math.abs(pointer.x - this.dragStartX);
        const dy = Math.abs(pointer.y - this.dragStartY);
        if (dx > 6 || dy > 6) {
          this.hasMovedDrag = true;
        }
        // Continuous movement tracking: keeps updating even if finger moves over direction buttons
        this.player.x = Phaser.Math.Clamp(pointer.x, 30, width - 30);
      }
    });

    const finishDrag = (pointer) => {
      if (this.isTouchDragging && pointer.id === this.dragPointerId) {
        // Quick tap in play area triggers fire
        if (!this.hasMovedDrag) {
          this.firePlayerBullet();
        }
        this.isTouchDragging = false;
        this.dragPointerId = null;
        this.hasMovedDrag = false;
      }
    };

    this.input.on('pointerup', finishDrag);
    this.input.on('pointerupoutside', finishDrag);
  }

  firePlayerBullet() {
    if (!this.gameActive) return;
    const now = this.time.now;
    if (now - this.lastFiredTime < this.fireCooldown) return;
    if (this.playerBullets.countActive() >= 2) return; // Hard cap of 2 active bullets

    this.lastFiredTime = now;
    audio.playShoot();
    const bullet = this.playerBullets.create(this.player.x, this.player.y - 18, 'invader_bullet');
    bullet.setTint(0x38bdf8);
    bullet.setVelocityY(-480);
    bullet.body.allowGravity = false;
  }

  updateCooldownUI(time) {
    if (!this.reloadGfx || !this.player || !this.player.active) return;
    this.reloadGfx.clear();

    const now = time || this.time.now;
    const elapsed = now - this.lastFiredTime;
    const cooldownRatio = Math.min(1, elapsed / this.fireCooldown);
    const bulletsActive = this.playerBullets.countActive();
    const isReady = cooldownRatio >= 1 && bulletsActive < 2;

    // 1. Sleek reload bar above player cannon
    const barW = 34;
    const barH = 3;
    const barX = this.player.x - barW / 2;
    const barY = this.player.y - 24;

    if (!isReady) {
      // Background track
      this.reloadGfx.fillStyle(0x1e293b, 0.8);
      this.reloadGfx.fillRect(barX, barY, barW, barH);

      if (bulletsActive >= 2) {
        // Red indicator for max bullets reached
        this.reloadGfx.fillStyle(0xef4444, 0.9);
        this.reloadGfx.fillRect(barX, barY, barW, barH);
      } else {
        // Yellow recharge fill
        this.reloadGfx.fillStyle(0xf59e0b, 0.9);
        this.reloadGfx.fillRect(barX, barY, barW * cooldownRatio, barH);
      }
    }

    // 2. Fire button appearance update
    if (this.fireBtnBg && this.fireBtnText) {
      const currentText = isReady ? '🔥 FIRE' : (bulletsActive >= 2 ? '⏳ 2/2' : '⏳ RELOAD');
      if (this.lastReadyState !== isReady || this.lastBtnText !== currentText) {
        this.lastReadyState = isReady;
        this.lastBtnText = currentText;
        this.fireBtnBg.clear();
        if (isReady) {
          this.fireBtnBg.fillStyle(0xe11d48, 1);
          this.fireBtnBg.fillRoundedRect(-65, -28, 130, 56, 14);
          this.fireBtnBg.lineStyle(2, 0xfca5a5, 1);
          this.fireBtnBg.strokeRoundedRect(-65, -28, 130, 56, 14);
          this.fireBtnText.setText('🔥 FIRE');
          this.fireBtnText.setColor('#ffffff');
        } else {
          this.fireBtnBg.fillStyle(0x475569, 0.85);
          this.fireBtnBg.fillRoundedRect(-65, -28, 130, 56, 14);
          this.fireBtnBg.lineStyle(2, 0x94a3b8, 0.8);
          this.fireBtnBg.strokeRoundedRect(-65, -28, 130, 56, 14);
          this.fireBtnText.setText(currentText);
          this.fireBtnText.setColor('#cbd5e1');
        }
      }
    }
  }

  update(time, delta) {
    if (!this.gameActive) return;

    this.updateCooldownUI(time);

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
    if (this.isInvulnerable || !this.gameActive) return;

    audio.playExplosion();
    this.lives--;
    this.livesText.setText(`LIVES: ${'❤️'.repeat(Math.max(0, this.lives))}`);

    if (this.lives <= 0) {
      this.handleGameOver();
      return;
    }
    this.captureSessionState();

    // Flash player with invulnerability cooldown (1500ms)
    this.isInvulnerable = true;
    this.player.setAlpha(0.3);
    this.tweens.add({
      targets: this.player,
      alpha: 1,
      duration: 150,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.player.setAlpha(1);
        this.isInvulnerable = false;
      }
    });
  }

  captureSessionState() {
    if (this.isMatchOver || this.lives <= 0) {
      storage.clearGameSession('invaders');
      return;
    }
    const state = {
      score: this.score,
      lives: this.lives,
      wave: this.wave
    };
    const summary = {
      score: this.score,
      lives: this.lives,
      wave: this.wave
    };
    storage.saveGameSession('invaders', state, summary);
  }

  addScore(pts) {
    this.score += pts;
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
    const s = String(this.score).padStart(4, '0');
    const hi = String(this.highScore).padStart(4, '0');
    this.scoreText.setText(`SCORE: ${s}  HI: ${hi}`);
  }

  handleWaveCleared() {
    this.gameActive = false;
    audio.playVictory();
    this.wave++;
    this.showToast(`WAVE ${this.wave - 1} CLEARED! +500 BONUS`);
    this.addScore(500);
    this.waveText.setText(`WAVE ${this.wave}`);

    // Persist milestone wave/score (AC-8)
    storage.recordInvadersScore({ score: this.score, wave: this.wave });
    this.captureSessionState();

    this.time.delayedCall(1600, () => {
      this.setupWave();
      this.gameActive = true;
      this.scheduleNextMarch();
    });
  }

  handleGameOver() {
    this.gameActive = false;
    this.isMatchOver = true;
    storage.clearGameSession('invaders');
    audio.playGameOver();
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Persist Invaders score and wave (AC-8)
    const stats = storage.recordInvadersScore({ score: this.score, wave: this.wave });

    const modal = this.add.container(width / 2, height / 2);
    modal.setDepth(2000);

    const mBg = this.add.graphics();
    mBg.fillStyle(0x0f172a, 0.96);
    mBg.fillRoundedRect(-180, -130, 360, 260, 16);
    mBg.lineStyle(3, 0xef4444, 1);
    mBg.strokeRoundedRect(-180, -130, 360, 260, 16);
    modal.add(mBg);

    const title = this.add.text(0, -82, 'GAME OVER', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5);

    const finalScore = this.add.text(0, -48, `Final Score: ${this.score}`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#ffd700'
    }).setOrigin(0.5);

    const waveReached = this.add.text(0, -24, `Waves Survived: ${this.wave}`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      color: '#cbd5e1'
    }).setOrigin(0.5);

    const bestScore = this.add.text(0, -4, `All-Time High: ${stats.highScore}`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5);

    modal.add([title, finalScore, waveReached, bestScore]);

    // Try Again
    const retryBtn = this.add.container(0, 26);
    const rBg = this.add.graphics();
    rBg.fillStyle(0x22c55e, 1);
    rBg.fillRoundedRect(-110, -15, 220, 30, 8);
    retryBtn.add(rBg);
    const rText = this.add.text(0, 0, 'TRY AGAIN ▶', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    retryBtn.add(rText);
    const rZone = this.add.zone(0, 0, 220, 36).setInteractive({ useHandCursor: true });
    retryBtn.add(rZone);
    rZone.on('pointerdown', () => {
      audio.playShoot();
      this.scene.restart();
    });
    modal.add(retryBtn);

    // Leaderboard Button
    const lbBtn = this.add.container(0, 64);
    const lBtnBg = this.add.graphics();
    lBtnBg.fillStyle(0x0f172a, 1);
    lBtnBg.fillRoundedRect(-110, -15, 220, 30, 8);
    lBtnBg.lineStyle(1.5, 0xfacc15, 1);
    lBtnBg.strokeRoundedRect(-110, -15, 220, 30, 8);
    lbBtn.add(lBtnBg);
    const lText = this.add.text(0, 0, '🏆 RECORD HIGH SCORE 🏆', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#facc15'
    }).setOrigin(0.5);
    lbBtn.add(lText);
    const lZone = this.add.zone(0, 0, 220, 36).setInteractive({ useHandCursor: true });
    lbBtn.add(lZone);
    lZone.on('pointerdown', () => {
      audio.playShoot?.();
      this.scene.launch('InitialsEntryOverlay', {
        gameId: 'invaders',
        score: this.score,
        detail: `Wave ${this.wave}`,
        returnScene: 'SpaceInvaders'
      });
    });
    modal.add(lbBtn);

    // Menu Button
    const menuBtn = this.add.container(0, 102);
    const mBtnBg = this.add.graphics();
    mBtnBg.fillStyle(0x1e293b, 1);
    mBtnBg.fillRoundedRect(-110, -15, 220, 30, 8);
    mBtnBg.lineStyle(1.5, 0x64748b, 1);
    mBtnBg.strokeRoundedRect(-110, -15, 220, 30, 8);
    menuBtn.add(mBtnBg);
    const mText = this.add.text(0, 0, 'BACK TO ARCADE', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#cbd5e1'
    }).setOrigin(0.5);
    menuBtn.add(mText);
    const mZone = this.add.zone(0, 0, 220, 36).setInteractive({ useHandCursor: true });
    menuBtn.add(mZone);
    mZone.on('pointerdown', () => {
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
