// src/scenes/Asteroids.js
// Birthday Asteroids clone with 360° rotation, Newtonian thrust, and splitting "70" meteorites

import { audio } from '../systems/AudioManager.js';
import { storage } from '../systems/Storage.js';
import { ControlsOverlay } from './ControlsOverlay.js';

export class AsteroidsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Asteroids' });
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
    this.lastFired = 0;

    // 1. Deep Space Starfield Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x030712, 0x030712, 0x0b0f19, 0x0b0f19, 1);
    bg.fillRect(0, 0, width, height);

    for (let i = 0; i < 50; i++) {
      const sx = Phaser.Math.Between(10, width - 10);
      const sy = Phaser.Math.Between(75, height - 100);
      const star = this.add.circle(sx, sy, Phaser.Math.FloatBetween(1, 2.5), 0xffffff, Phaser.Math.FloatBetween(0.2, 0.9));
      this.tweens.add({
        targets: star,
        alpha: { from: 0.1, to: 1 },
        duration: Phaser.Math.Between(1000, 2500),
        yoyo: true,
        repeat: -1
      });
    }

    // 2. Top HUD Bar
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x0f172a, 0.95);
    hudBg.fillRect(0, 0, width, 68);
    hudBg.lineStyle(2, 0x38bdf8, 0.8);
    hudBg.lineBetween(0, 68, width, 68);

    // Back to Menu Button
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

    this.highScore = storage.getArcadeStats().asteroids.highScore || 0;
    const hiFormatted = String(this.highScore).padStart(4, '0');
    const scoreStr = String(this.score).padStart(4, '0');
    this.scoreText = this.add.text(width / 2 - 30, 26, `SCORE: ${scoreStr}  HI: ${hiFormatted}`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#ffd700'
    });

    this.livesText = this.add.text(width - 24, 26, '🚀'.repeat(Math.max(0, this.lives)), {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px'
    }).setOrigin(1, 0);

    this.waveText = this.add.text(width / 2 - 30, 46, `WAVE: ${this.wave}`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#38bdf8'
    });

    // 3. Physics Groups
    this.lasers = this.physics.add.group({
      defaultKey: 'laser_bolt',
      maxSize: 10
    });

    this.asteroids = this.physics.add.group();

    // 4. Player Ship
    this.ship = this.physics.add.image(width / 2, height / 2, 'asteroid_ship');
    this.ship.setOrigin(0.5, 0.5);
    this.ship.setDrag(40, 40);
    this.ship.setMaxVelocity(300);
    this.ship.rotation = -Math.PI / 2; // Point up initially

    // 5. Physics Colliders
    this.physics.add.overlap(this.lasers, this.asteroids, this.handleLaserAsteroidHit, null, this);
    this.physics.add.overlap(this.ship, this.asteroids, this.handleShipAsteroidHit, null, this);

    // 6. Controls State & Keyboard
    this.controls = {
      rotLeft: false,
      rotRight: false,
      thrust: false,
      touchThrust: false,
      fire: false
    };

    this.touchRingGfx = this.add.graphics();
    this.touchRingGfx.setDepth(150);
    this.touchPointer = null;
    this.touchDownTime = 0;
    this.touchDownX = 0;
    this.touchDownY = 0;
    this.isTouchSteering = false;

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    // 7. Pre-allocated Thrust Particle Emitter (avoids GC churn)
    this.thrustEmitter = this.add.particles(0, 0, 'confetti', {
      lifespan: 220,
      scale: { start: 0.6, end: 0.1 },
      alpha: { start: 0.8, end: 0 },
      tint: 0x38bdf8,
      emitting: false
    });
    this.thrustEmitter.setDepth(10);

    // 8. Touch Controls Action Bar (Bottom)
    this.createTouchControls(width, height);

    // 9. Spawn First Wave
    this.spawnAsteroidWave();

    // 9. Show Controls Overlay or activate resumed session
    if (this.resumeData) {
      this.gameActive = true;
      this.setInvulnerable(2000);
      this.captureSessionState();
    } else {
      ControlsOverlay.show(this, 'asteroids', () => {
        this.gameActive = true;
        this.setInvulnerable(2000);
      });
    }
  }

  createTouchControls(width, height) {
    const barY = height - 46;
    const barHeight = 84;

    const barBg = this.add.graphics();
    barBg.fillStyle(0x0f172a, 0.95);
    barBg.fillRect(0, height - barHeight, width, barHeight);
    barBg.lineStyle(1.5, 0x334155, 1);
    barBg.lineBetween(0, height - barHeight, width, height - barHeight);

    const btnStyle = {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#ffffff'
    };

    // Helper to draw rounded button
    const makeButton = (x, y, w, h, text, colorHex, strokeHex, onPress, onRelease) => {
      const container = this.add.container(x, y);
      const bg = this.add.graphics();
      bg.fillStyle(colorHex, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
      bg.lineStyle(2, strokeHex, 1);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
      container.add(bg);

      const label = this.add.text(0, 0, text, btnStyle).setOrigin(0.5);
      container.add(label);

      const zone = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
      container.add(zone);

      zone.on('pointerdown', () => {
        bg.clear();
        bg.fillStyle(strokeHex, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
        bg.lineStyle(2, colorHex, 1);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        onPress();
      });

      const releaseHandler = () => {
        bg.clear();
        bg.fillStyle(colorHex, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
        bg.lineStyle(2, strokeHex, 1);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        onRelease();
      };

      zone.on('pointerup', releaseHandler);
      zone.on('pointerout', releaseHandler);

      return container;
    };

    // Rotate Left [⟲]
    makeButton(50, barY, 74, 48, '⟲ LEFT', 0x1e293b, 0x38bdf8,
      () => { this.controls.rotLeft = true; },
      () => { this.controls.rotLeft = false; }
    );

    // Rotate Right [⟳]
    makeButton(134, barY, 74, 48, 'RIGHT ⟳', 0x1e293b, 0x38bdf8,
      () => { this.controls.rotRight = true; },
      () => { this.controls.rotRight = false; }
    );

    // Thrust [▲ THRUST]
    makeButton(246, barY, 110, 48, '▲ THRUST', 0x0284c7, 0x38bdf8,
      () => { this.controls.thrust = true; },
      () => { this.controls.thrust = false; }
    );

    // Fire [💥 FIRE]
    makeButton(394, barY, 130, 48, '💥 FIRE', 0xd97706, 0xfbbf24,
      () => {
        this.controls.fire = true;
        this.fireLaser();
      },
      () => { this.controls.fire = false; }
    );

    // Playfield touch gestures: tap-to-fire + steering ring + thrust
    this.input.on('pointerdown', (pointer) => {
      // Ignore clicks on top header (y < 68) or bottom button bar (y > height - barHeight)
      if (pointer.y > 68 && pointer.y < height - barHeight) {
        // Prevent multi-touch clashing: lock to first active pointer
        if (this.touchPointer !== null) return;

        this.touchPointer = pointer;
        this.touchDownTime = this.time.now;
        this.touchDownX = pointer.x;
        this.touchDownY = pointer.y;
        this.isTouchSteering = false;
      }
    });

    const finishTouch = (pointer) => {
      if (this.touchPointer && pointer.id === this.touchPointer.id) {
        // If the pointer never transitioned into an active drag/hold steering gesture,
        // it was a tap: fire laser strictly along the ship's current heading!
        if (!this.isTouchSteering) {
          this.fireLaser();
        }
        this.touchPointer = null;
        this.isTouchSteering = false;
        this.controls.touchThrust = false;
        if (this.touchRingGfx) this.touchRingGfx.clear();
      }
    };

    this.input.on('pointerup', finishTouch);
    this.input.on('pointerupoutside', finishTouch);
  }

  spawnAsteroidWave() {
    this.asteroids.clear(true, true);
    const count = 3 + this.wave;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    for (let i = 0; i < count; i++) {
      let x, y;
      do {
        x = Phaser.Math.Between(40, width - 40);
        y = Phaser.Math.Between(100, height - 160);
      } while (Phaser.Math.Distance.Between(x, y, this.ship.x, this.ship.y) < 130);

      this.createAsteroid(x, y, 'large');
    }
  }

  createAsteroid(x, y, size, velX, velY) {
    let texture = 'asteroid_large';
    let radius = 28;
    let baseSpeed = 50 + (this.wave * 8);

    if (size === 'medium') {
      texture = 'asteroid_medium';
      radius = 16;
      baseSpeed = 80 + (this.wave * 12);
    } else if (size === 'small') {
      texture = 'asteroid_small';
      radius = 9;
      baseSpeed = 120 + (this.wave * 16);
    }

    const asteroid = this.asteroids.create(x, y, texture);
    asteroid.asteroidSize = size;
    asteroid.setCircle(radius, (asteroid.width - radius * 2) / 2, (asteroid.height - radius * 2) / 2);

    if (velX !== undefined && velY !== undefined) {
      asteroid.setVelocity(velX, velY);
    } else {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      asteroid.setVelocity(Math.cos(angle) * baseSpeed, Math.sin(angle) * baseSpeed);
    }

    asteroid.angularVelocity = Phaser.Math.FloatBetween(-60, 60);
    return asteroid;
  }

  fireLaser() {
    if (!this.gameActive || !this.ship.active) return;
    const now = this.time.now;
    if (now - this.lastFired < 220) return; // Rate limit
    this.lastFired = now;

    // Laser spawns at nose of ship
    const noseDist = 16;
    const spawnX = this.ship.x + Math.cos(this.ship.rotation) * noseDist;
    const spawnY = this.ship.y + Math.sin(this.ship.rotation) * noseDist;

    const laser = this.lasers.get(spawnX, spawnY, 'laser_bolt');
    if (laser) {
      laser.setActive(true);
      laser.setVisible(true);
      laser.rotation = this.ship.rotation;
      laser.body.reset(spawnX, spawnY);

      const laserSpeed = 550;
      laser.setVelocity(
        Math.cos(this.ship.rotation) * laserSpeed,
        Math.sin(this.ship.rotation) * laserSpeed
      );

      audio.playLaser();

      // Cancel previous expireTimer if laser was recycled
      if (laser.expireTimer) {
        laser.expireTimer.remove();
        laser.expireTimer = null;
      }

      // Auto-destroy after 1.1 seconds
      laser.expireTimer = this.time.delayedCall(1100, () => {
        if (laser.active) {
          laser.setActive(false);
          laser.setVisible(false);
          laser.body.stop();
        }
        laser.expireTimer = null;
      });
    }
  }

  handleLaserAsteroidHit(laser, asteroid) {
    if (!laser.active || !asteroid.active) return;

    if (laser.expireTimer) {
      laser.expireTimer.remove();
      laser.expireTimer = null;
    }

    laser.setActive(false);
    laser.setVisible(false);
    laser.body.stop();

    const ax = asteroid.x;
    const ay = asteroid.y;
    const size = asteroid.asteroidSize;
    asteroid.destroy();

    audio.playAsteroidExplode();

    // Particle burst
    this.createExplosionParticles(ax, ay, size === 'large' ? 12 : 8);

    if (size === 'large') {
      this.addScore(20);
      // Spawn 2 medium asteroids
      const angle1 = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const angle2 = angle1 + Math.PI + Phaser.Math.FloatBetween(-0.5, 0.5);
      const speed = 90 + this.wave * 10;
      this.createAsteroid(ax, ay, 'medium', Math.cos(angle1) * speed, Math.sin(angle1) * speed);
      this.createAsteroid(ax, ay, 'medium', Math.cos(angle2) * speed, Math.sin(angle2) * speed);
    } else if (size === 'medium') {
      this.addScore(50);
      // Spawn 2 small asteroids
      const angle1 = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const angle2 = angle1 + Math.PI + Phaser.Math.FloatBetween(-0.6, 0.6);
      const speed = 140 + this.wave * 12;
      this.createAsteroid(ax, ay, 'small', Math.cos(angle1) * speed, Math.sin(angle1) * speed);
      this.createAsteroid(ax, ay, 'small', Math.cos(angle2) * speed, Math.sin(angle2) * speed);
    } else {
      this.addScore(100);
    }

    // Check wave complete
    if (this.asteroids.countActive() === 0) {
      this.handleWaveClear();
    }
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

  handleWaveClear() {
    this.wave++;
    this.addScore(500);
    this.waveText.setText(`WAVE: ${this.wave}`);

    // Persist milestone wave/score (AC-8)
    storage.recordAsteroidsScore({ score: this.score, wave: this.wave });
    this.captureSessionState();

    audio.playPongScore();

    const toast = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 - 40, `WAVE ${this.wave - 1} CLEARED!\n+500 PTS`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#ffd700',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.tweens.add({
      targets: toast,
      scale: { from: 0.6, to: 1.1 },
      alpha: { from: 1, to: 0 },
      duration: 1800,
      ease: 'Power2',
      onComplete: () => {
        toast.destroy();
        this.spawnAsteroidWave();
      }
    });
  }

  handleShipAsteroidHit(ship, asteroid) {
    if (!this.gameActive || this.isInvulnerable || !ship.active || !asteroid.active) return;

    this.lives--;
    this.livesText.setText('🚀'.repeat(Math.max(0, this.lives)));
    audio.playExplosion();

    this.createExplosionParticles(ship.x, ship.y, 20);

    if (this.lives <= 0) {
      ship.setActive(false);
      ship.setVisible(false);
      ship.body.stop();
      this.gameOver();
    } else {
      this.captureSessionState();
      // Respawn in center
      ship.setPosition(this.cameras.main.width / 2, this.cameras.main.height / 2);
      ship.setVelocity(0, 0);
      ship.rotation = -Math.PI / 2;
      this.setInvulnerable(2500);
    }
  }

  captureSessionState() {
    if (this.isMatchOver || this.lives <= 0) {
      storage.clearGameSession('asteroids');
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
    storage.saveGameSession('asteroids', state, summary);
  }

  setInvulnerable(duration) {
    this.isInvulnerable = true;
    this.tweens.add({
      targets: this.ship,
      alpha: 0.3,
      duration: 150,
      yoyo: true,
      repeat: Math.floor(duration / 300),
      onComplete: () => {
        this.ship.alpha = 1;
        this.isInvulnerable = false;
      }
    });
  }

  createExplosionParticles(x, y, count) {
    for (let i = 0; i < count; i++) {
      const p = this.add.circle(x, y, Phaser.Math.Between(2, 4), 0xffd700, 1);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(20, 55);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(350, 600),
        onComplete: () => p.destroy()
      });
    }
  }

  wrapScreen(sprite, padding = 20) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const topBound = 68;
    const bottomBound = height - 86;

    if (sprite.x < -padding) sprite.x = width + padding;
    else if (sprite.x > width + padding) sprite.x = -padding;

    if (sprite.y < topBound - padding) sprite.y = bottomBound + padding;
    else if (sprite.y > bottomBound + padding) sprite.y = topBound - padding;
  }

  gameOver() {
    this.gameActive = false;
    this.isMatchOver = true;
    storage.clearGameSession('asteroids');
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Persist Asteroids score and wave (AC-8)
    const stats = storage.recordAsteroidsScore({ score: this.score, wave: this.wave });

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);
    overlay.setDepth(200);

    const box = this.add.container(width / 2, height / 2);
    box.setDepth(201);

    const panel = this.add.graphics();
    panel.fillStyle(0x0f172a, 0.95);
    panel.fillRoundedRect(-170, -140, 340, 280, 16);
    panel.lineStyle(2, 0xef4444, 1);
    panel.strokeRoundedRect(-170, -140, 340, 280, 16);
    box.add(panel);

    const title = this.add.text(0, -96, 'MISSION OVER', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5);
    box.add(title);

    const summary = this.add.text(0, -42, `Final Score: ${this.score}\nWaves Defended: ${this.wave - 1}\nAll-Time High: ${stats.highScore}`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      color: '#f8fafc',
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5);
    box.add(summary);

    // Play Again Button
    const retryBtn = this.add.graphics();
    retryBtn.fillStyle(0x22c55e, 1);
    retryBtn.fillRoundedRect(-130, 18, 260, 34, 8);
    box.add(retryBtn);

    const retryText = this.add.text(0, 35, 'PLAY AGAIN ▶', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    box.add(retryText);

    const retryZone = this.add.zone(0, 35, 260, 34).setInteractive({ useHandCursor: true });
    box.add(retryZone);
    retryZone.on('pointerdown', () => {
      audio.playShoot();
      this.scene.restart();
    });

    // Leaderboard Button
    const lbBtn = this.add.graphics();
    lbBtn.fillStyle(0x0f172a, 1);
    lbBtn.fillRoundedRect(-130, 58, 260, 34, 8);
    lbBtn.lineStyle(1.5, 0xfacc15, 1);
    lbBtn.strokeRoundedRect(-130, 58, 260, 34, 8);
    box.add(lbBtn);

    const lbText = this.add.text(0, 75, '🏆 RECORD HIGH SCORE 🏆', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#facc15'
    }).setOrigin(0.5);
    box.add(lbText);

    const lbZone = this.add.zone(0, 75, 260, 34).setInteractive({ useHandCursor: true });
    box.add(lbZone);
    lbZone.on('pointerdown', () => {
      audio.playShoot?.();
      this.scene.launch('InitialsEntryOverlay', {
        gameId: 'asteroids',
        score: this.score,
        detail: `Wave ${this.wave}`,
        returnScene: 'Asteroids'
      });
    });

    // Menu Button
    const menuBtn = this.add.graphics();
    menuBtn.fillStyle(0x334155, 1);
    menuBtn.fillRoundedRect(-130, 98, 260, 34, 8);
    box.add(menuBtn);

    const menuText = this.add.text(0, 115, 'ARCADE MENU', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#cbd5e1'
    }).setOrigin(0.5);
    box.add(menuText);

    const menuZone = this.add.zone(0, 115, 260, 34).setInteractive({ useHandCursor: true });
    box.add(menuZone);
    menuZone.on('pointerdown', () => {
      audio.playShoot();
      this.scene.start('GameSelect');
    });
  }

  update(time, delta) {
    if (!this.gameActive) return;

    const rotSpeed = 3.6; // rad/sec
    const dt = delta / 1000;

    // 0. Playfield Touch Ring & Gesture Steering
    if (this.touchPointer && this.touchPointer.isDown && this.ship && this.ship.active) {
      const holdTime = time - this.touchDownTime;
      const dragDist = Math.hypot(this.touchPointer.x - this.touchDownX, this.touchPointer.y - this.touchDownY);

      // Only engage steering/thrust if finger has intentionally dragged (> 14px) OR held down (> 220ms)
      if (!this.isTouchSteering) {
        if (dragDist > 14 || holdTime > 220) {
          this.isTouchSteering = true;
        }
      }

      if (this.isTouchSteering) {
        const dx = this.touchPointer.x - this.ship.x;
        const dy = this.touchPointer.y - this.ship.y;
        const distFromShip = Math.hypot(dx, dy);

        if (this.touchRingGfx) this.touchRingGfx.clear();

        if (distFromShip > 14) {
          const targetAngle = Math.atan2(dy, dx);
          const angleDiff = Phaser.Math.Angle.Wrap(targetAngle - this.ship.rotation);
          const steerSpeed = 6.0; // rad/sec for responsive finger tracking
          this.ship.rotation += Phaser.Math.Clamp(angleDiff, -steerSpeed * dt, steerSpeed * dt);

          const innerRadius = 70;
          const isThrusting = distFromShip > innerRadius;
          this.controls.touchThrust = isThrusting;

          if (this.touchRingGfx) {
            // Inner steering circle
            this.touchRingGfx.lineStyle(1.5, 0x38bdf8, 0.45);
            this.touchRingGfx.strokeCircle(this.ship.x, this.ship.y, innerRadius);

            // Heading pointer notch
            this.touchRingGfx.lineStyle(2, 0x38bdf8, 0.8);
            this.touchRingGfx.lineBetween(
              this.ship.x,
              this.ship.y,
              this.ship.x + Math.cos(this.ship.rotation) * innerRadius,
              this.ship.y + Math.sin(this.ship.rotation) * innerRadius
            );

            if (isThrusting) {
              // Amber outer thrust perimeter
              this.touchRingGfx.lineStyle(2, 0xf59e0b, 0.8);
              this.touchRingGfx.strokeCircle(this.ship.x, this.ship.y, innerRadius + 14);
              // Tether line to finger
              this.touchRingGfx.lineStyle(1.5, 0xf59e0b, 0.6);
              this.touchRingGfx.lineBetween(this.ship.x, this.ship.y, this.touchPointer.x, this.touchPointer.y);
              this.touchRingGfx.fillStyle(0xf59e0b, 0.9);
              this.touchRingGfx.fillCircle(this.touchPointer.x, this.touchPointer.y, 6);
            } else {
              // Steering reticle at finger
              this.touchRingGfx.fillStyle(0x38bdf8, 0.75);
              this.touchRingGfx.fillCircle(this.touchPointer.x, this.touchPointer.y, 5);
            }
          }
        }
      } else {
        // While within tap threshold: do NOT steer, do NOT thrust, do NOT draw ring
        if (this.touchRingGfx) this.touchRingGfx.clear();
        this.controls.touchThrust = false;
      }
    } else {
      if (this.touchRingGfx) this.touchRingGfx.clear();
      this.controls.touchThrust = false;
    }

    // 1. Rotation handling (buttons / keyboard)
    const rotatingLeft = this.controls.rotLeft || this.cursors?.left?.isDown || this.wasd?.left?.isDown;
    const rotatingRight = this.controls.rotRight || this.cursors?.right?.isDown || this.wasd?.right?.isDown;

    if (rotatingLeft) {
      this.ship.rotation -= rotSpeed * dt;
    }
    if (rotatingRight) {
      this.ship.rotation += rotSpeed * dt;
    }

    // 2. Thrust handling (buttons / keyboard / touch gesture)
    const thrusting = this.controls.thrust || this.controls.touchThrust || this.cursors?.up?.isDown || this.wasd?.up?.isDown;

    if (thrusting) {
      const thrustAccel = 260;
      this.ship.setAcceleration(
        Math.cos(this.ship.rotation) * thrustAccel,
        Math.sin(this.ship.rotation) * thrustAccel
      );

      // Audio engine hum
      if (Math.random() < 0.25) {
        audio.playThrust();
      }

      // Exhaust particle flare using pooled particle emitter (zero GC churn)
      const rearX = this.ship.x - Math.cos(this.ship.rotation) * 14;
      const rearY = this.ship.y - Math.sin(this.ship.rotation) * 14;
      if (this.thrustEmitter) {
        this.thrustEmitter.emitParticleAt(rearX, rearY, 1);
      }
    } else {
      this.ship.setAcceleration(0, 0);
    }

    // 3. Fire handling (keyboard)
    const justDownSpace = (this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.space)) ||
                          (this.wasd && Phaser.Input.Keyboard.JustDown(this.wasd.space));
    if (justDownSpace) {
      this.fireLaser();
    }

    // 4. Wrap ship across screen bounds
    this.wrapScreen(this.ship, 14);

    // 5. Wrap and rotate asteroids
    this.asteroids.children.iterate((asteroid) => {
      if (asteroid && asteroid.active) {
        this.wrapScreen(asteroid, 28);
        asteroid.rotation += (asteroid.angularVelocity || 0) * (Math.PI / 180) * dt;
      }
    });

    // 6. Wrap lasers (or bounds check)
    this.lasers.children.iterate((laser) => {
      if (laser && laser.active) {
        this.wrapScreen(laser, 10);
      }
    });
  }
}
