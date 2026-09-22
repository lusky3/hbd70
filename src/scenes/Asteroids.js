// src/scenes/Asteroids.js
// Birthday Asteroids clone with 360° rotation, Newtonian thrust, and splitting "70" meteorites

import { audio } from '../systems/AudioManager.js';
import { ControlsOverlay } from './ControlsOverlay.js';

export class AsteroidsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Asteroids' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.score = 0;
    this.lives = 3;
    this.wave = 1;
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
    backBtn.setSize(70, 36);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      audio.playShoot();
      this.scene.start('GameSelect');
    });

    this.scoreText = this.add.text(width / 2 - 30, 26, 'SCORE: 0000', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#ffd700'
    });

    this.livesText = this.add.text(width - 24, 26, '🚀🚀🚀', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px'
    }).setOrigin(1, 0);

    this.waveText = this.add.text(width / 2 - 30, 46, 'WAVE: 1', {
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
      fire: false
    };

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    // 7. Touch Controls Action Bar (Bottom)
    this.createTouchControls(width, height);

    // 8. Spawn First Wave
    this.spawnAsteroidWave();

    // 9. Show Controls Overlay
    ControlsOverlay.show(this, 'asteroids', () => {
      this.gameActive = true;
      this.setInvulnerable(2000);
    });
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

      // Auto-destroy after 1.1 seconds
      this.time.delayedCall(1100, () => {
        if (laser.active) {
          laser.setActive(false);
          laser.setVisible(false);
          laser.body.stop();
        }
      });
    }
  }

  handleLaserAsteroidHit(laser, asteroid) {
    if (!laser.active || !asteroid.active) return;

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
      this.score += 20;
      // Spawn 2 medium asteroids
      const angle1 = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const angle2 = angle1 + Math.PI + Phaser.Math.FloatBetween(-0.5, 0.5);
      const speed = 90 + this.wave * 10;
      this.createAsteroid(ax, ay, 'medium', Math.cos(angle1) * speed, Math.sin(angle1) * speed);
      this.createAsteroid(ax, ay, 'medium', Math.cos(angle2) * speed, Math.sin(angle2) * speed);
    } else if (size === 'medium') {
      this.score += 50;
      // Spawn 2 small asteroids
      const angle1 = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const angle2 = angle1 + Math.PI + Phaser.Math.FloatBetween(-0.6, 0.6);
      const speed = 140 + this.wave * 12;
      this.createAsteroid(ax, ay, 'small', Math.cos(angle1) * speed, Math.sin(angle1) * speed);
      this.createAsteroid(ax, ay, 'small', Math.cos(angle2) * speed, Math.sin(angle2) * speed);
    } else {
      this.score += 100;
    }

    this.scoreText.setText(`SCORE: ${String(this.score).padStart(4, '0')}`);

    // Check wave complete
    if (this.asteroids.countActive() === 0) {
      this.handleWaveClear();
    }
  }

  handleWaveClear() {
    this.wave++;
    this.score += 500;
    this.scoreText.setText(`SCORE: ${String(this.score).padStart(4, '0')}`);
    this.waveText.setText(`WAVE: ${this.wave}`);

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
      // Respawn in center
      ship.setPosition(this.cameras.main.width / 2, this.cameras.main.height / 2);
      ship.setVelocity(0, 0);
      ship.rotation = -Math.PI / 2;
      this.setInvulnerable(2500);
    }
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
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);
    overlay.setDepth(200);

    const box = this.add.container(width / 2, height / 2);
    box.setDepth(201);

    const panel = this.add.graphics();
    panel.fillStyle(0x0f172a, 0.95);
    panel.fillRoundedRect(-170, -130, 340, 260, 16);
    panel.lineStyle(2, 0xef4444, 1);
    panel.strokeRoundedRect(-170, -130, 340, 260, 16);
    box.add(panel);

    const title = this.add.text(0, -90, 'MISSION OVER', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5);
    box.add(title);

    const summary = this.add.text(0, -35, `Final Score: ${this.score}\nWaves Defended: ${this.wave - 1}`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '16px',
      color: '#f8fafc',
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5);
    box.add(summary);

    // Play Again Button
    const retryBtn = this.add.graphics();
    retryBtn.fillStyle(0x22c55e, 1);
    retryBtn.fillRoundedRect(-130, 25, 260, 42, 10);
    box.add(retryBtn);

    const retryText = this.add.text(0, 46, 'PLAY AGAIN ▶', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '15px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    box.add(retryText);

    const retryZone = this.add.zone(0, 46, 260, 42).setInteractive({ useHandCursor: true });
    box.add(retryZone);
    retryZone.on('pointerdown', () => {
      audio.playShoot();
      this.scene.restart();
    });

    // Menu Button
    const menuBtn = this.add.graphics();
    menuBtn.fillStyle(0x334155, 1);
    menuBtn.fillRoundedRect(-130, 78, 260, 38, 10);
    box.add(menuBtn);

    const menuText = this.add.text(0, 97, 'ARCADE MENU', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#cbd5e1'
    }).setOrigin(0.5);
    box.add(menuText);

    const menuZone = this.add.zone(0, 97, 260, 38).setInteractive({ useHandCursor: true });
    box.add(menuZone);
    menuZone.on('pointerdown', () => {
      audio.playShoot();
      this.scene.start('GameSelect');
    });
  }

  update(time, delta) {
    if (!this.gameActive) return;

    // 1. Rotation handling
    const rotSpeed = 3.6; // rad/sec
    const dt = delta / 1000;

    const rotatingLeft = this.controls.rotLeft || this.cursors.left.isDown || this.wasd.left.isDown;
    const rotatingRight = this.controls.rotRight || this.cursors.right.isDown || this.wasd.right.isDown;

    if (rotatingLeft) {
      this.ship.rotation -= rotSpeed * dt;
    }
    if (rotatingRight) {
      this.ship.rotation += rotSpeed * dt;
    }

    // 2. Thrust handling
    const thrusting = this.controls.thrust || this.cursors.up.isDown || this.wasd.up.isDown;

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

      // Exhaust particle flare
      const rearX = this.ship.x - Math.cos(this.ship.rotation) * 14;
      const rearY = this.ship.y - Math.sin(this.ship.rotation) * 14;
      const flare = this.add.circle(rearX, rearY, Phaser.Math.Between(2, 3), 0x38bdf8, 0.8);
      this.tweens.add({
        targets: flare,
        alpha: 0,
        scale: 0.1,
        duration: 200,
        onComplete: () => flare.destroy()
      });
    } else {
      this.ship.setAcceleration(0, 0);
    }

    // 3. Fire handling (keyboard)
    if (Phaser.Input.Keyboard.JustDown(this.cursors.space) || Phaser.Input.Keyboard.JustDown(this.wasd.space)) {
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
