// src/entities/EnemyTank.js
// Enemy tank entity supporting 7 historical & celebratory archetypes

import { Bullet } from './Bullet.js';
import { Mine } from './Mine.js';
import { audio } from '../systems/AudioManager.js';
import { EnemyAI } from '../systems/EnemyAI.js';

export class EnemyTank extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = 'candle') {
    super(scene, x, y, type);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.type = type;
    this.lastFireTime = 0;
    this.lastMineTime = 0;

    this.isBoss = this.type.startsWith('boss') || this.type === 'boss';
    this.healthBar = null;

    this.setupTypeConfig();

    this.body.setCollideWorldBounds(true);
    this.body.setBounce(this.bounce, this.bounce);
    this.setDepth(18);

    if (this.isBoss && scene.add && scene.add.graphics) {
      this.healthBar = scene.add.graphics();
      this.healthBar.setDepth(26);
      this.drawHealthBar();
    }

    this.ai = new EnemyAI(this);
  }

  setupTypeConfig() {
    switch (this.type) {
      case 'candle':
        this.hp = 1;
        this.speed = 0;
        this.fireCooldown = 2400;
        this.bulletBounces = 1;
        this.bounce = 0;
        this.body.setCircle(12, 4, 4);
        break;
      case 'golf':
        this.hp = 1;
        this.speed = 55;
        this.fireCooldown = 2500;
        this.bulletBounces = 2;
        this.bounce = 1;
        this.body.setCircle(12, 4, 4);
        break;
      case 'puck':
        this.hp = 1;
        this.speed = 135;
        this.fireCooldown = 1900;
        this.bulletBounces = 1;
        this.bounce = 1;
        this.body.setCircle(12, 4, 4);
        break;
      case 'boat':
        this.hp = 1;
        this.speed = 85;
        this.fireCooldown = 1800;
        this.bulletBounces = 1;
        this.bounce = 0.8;
        this.body.setCircle(12, 4, 4);
        break;
      case 'snowmobile':
        this.hp = 1;
        this.speed = 110;
        this.fireCooldown = 1600;
        this.bulletBounces = 1;
        this.bounce = 0.6;
        this.body.setCircle(12, 4, 4);
        break;
      case 'biker':
        this.hp = 1;
        this.speed = 120;
        this.fireCooldown = 1500;
        this.bulletBounces = 1;
        this.bounce = 0.5;
        this.body.setCircle(13, 3, 3);
        break;
      // --- DECADE CLIMAX BOSS ARCHETYPES ---
      case 'boss_candle':
        this.hp = 3;
        this.speed = 0;
        this.fireCooldown = 1800;
        this.bulletBounces = 1;
        this.bounce = 0;
        this.body.setCircle(18, 4, 4);
        break;
      case 'boss_golf':
        this.hp = 4;
        this.speed = 65;
        this.fireCooldown = 1800;
        this.bulletBounces = 2;
        this.bounce = 1;
        this.body.setCircle(18, 4, 4);
        break;
      case 'boss_puck':
        this.hp = 5;
        this.speed = 120;
        this.fireCooldown = 1500;
        this.bulletBounces = 1;
        this.bounce = 1;
        this.body.setCircle(19, 4, 4);
        break;
      case 'boss_boat':
        this.hp = 5;
        this.speed = 80;
        this.fireCooldown = 1600;
        this.bulletBounces = 1;
        this.bounce = 0.8;
        this.body.setCircle(19, 4, 4);
        break;
      case 'boss_snowmobile':
        this.hp = 6;
        this.speed = 100;
        this.fireCooldown = 1400;
        this.bulletBounces = 1;
        this.bounce = 0.6;
        this.body.setCircle(19, 4, 4);
        break;
      case 'boss_biker':
        this.hp = 6;
        this.speed = 110;
        this.fireCooldown = 1300;
        this.bulletBounces = 1;
        this.bounce = 0.5;
        this.body.setCircle(20, 4, 4);
        break;
      case 'boss':
      case 'boss_70':
        this.hp = 8;
        this.speed = 45;
        this.fireCooldown = 1400;
        this.bulletBounces = 2;
        this.bounce = 0.2;
        this.body.setCircle(24, 3, 3);
        break;
      default:
        this.hp = 1;
        this.speed = 50;
        this.fireCooldown = 2500;
        this.bulletBounces = 1;
        this.bounce = 0.5;
        this.body.setCircle(12, 4, 4);
    }
    this.maxHp = this.hp;
    this.baseSpeed = this.speed;
    this.baseFireCooldown = this.fireCooldown;
    this.speedMultiplier = (this.scene && this.scene.cpuSpeedMultiplier) ? this.scene.cpuSpeedMultiplier : 1.0;
    if (this.speedMultiplier !== 1.0) {
      this.speed = this.baseSpeed * this.speedMultiplier;
      this.fireCooldown = Math.max(200, Math.round(this.baseFireCooldown / this.speedMultiplier));
    }
  }

  setSpeedMultiplier(multiplier) {
    this.speedMultiplier = Phaser.Math.Clamp(multiplier, 0.25, 2.0);
    this.speed = this.baseSpeed * this.speedMultiplier;
    this.fireCooldown = Math.max(200, Math.round(this.baseFireCooldown / this.speedMultiplier));
  }

  drawHealthBar() {
    if (!this.healthBar || !this.active) return;
    this.healthBar.clear();
    const barWidth = 36;
    const barHeight = 5;
    const halfWidth = barWidth / 2;
    const topOffset = (this.type === 'boss' || this.type === 'boss_70') ? 34 : 28;
    const barX = this.x - halfWidth;
    const barY = this.y - topOffset;

    // Background (dark charcoal)
    this.healthBar.fillStyle(0x0f172a, 0.85);
    this.healthBar.fillRect(barX, barY, barWidth, barHeight);
    this.healthBar.lineStyle(1, 0x475569, 1);
    this.healthBar.strokeRect(barX, barY, barWidth, barHeight);

    // Foreground fill based on HP ratio
    const ratio = Math.max(0, this.hp / this.maxHp);
    const color = ratio > 0.5 ? 0x22c55e : (ratio > 0.25 ? 0xf59e0b : 0xef4444);
    this.healthBar.fillStyle(color, 0.95);
    this.healthBar.fillRect(barX + 1, barY + 1, Math.round((barWidth - 2) * ratio), barHeight - 2);
  }

  update(player, time, delta) {
    if (!this.active) return;
    this.ai.update(player, time, delta);
    if (this.isBoss) {
      this.drawHealthBar();
    }
  }

  fireBullet(time, angle) {
    if (!this.active) return;
    if (this.scene.enemyBullets.countActive(true) >= 10) return;

    this.lastFireTime = time;

    const tipDistance = (this.type === 'boss' || this.type === 'boss_70') ? 24 : (this.isBoss ? 20 : 16);
    const tipX = this.x + Math.cos(angle) * tipDistance;
    const tipY = this.y + Math.sin(angle) * tipDistance;

    const bullet = new Bullet(this.scene, tipX, tipY);
    this.scene.enemyBullets.add(bullet);
    bullet.fire(tipX, tipY, Math.cos(angle), Math.sin(angle), 'enemy', this.bulletBounces);
  }

  fireSpread(time, baseAngle, count = 3, spreadArc = 0.38) {
    if (!this.active) return;
    if (this.scene.enemyBullets.countActive(true) >= 10) return;
    this.lastFireTime = time;

    const startAngle = baseAngle - spreadArc / 2;
    const step = count > 1 ? spreadArc / (count - 1) : 0;
    const tipDist = (this.type === 'boss' || this.type === 'boss_70') ? 24 : (this.isBoss ? 20 : 16);

    for (let i = 0; i < count; i++) {
      const ang = startAngle + i * step;
      const tipX = this.x + Math.cos(ang) * tipDist;
      const tipY = this.y + Math.sin(ang) * tipDist;

      const bullet = new Bullet(this.scene, tipX, tipY);
      this.scene.enemyBullets.add(bullet);
      bullet.fire(tipX, tipY, Math.cos(ang), Math.sin(ang), 'enemy', this.bulletBounces);
    }
  }

  fireDual(time, angle, spreadDist = 12) {
    if (!this.active) return;
    if (this.scene.enemyBullets.countActive(true) >= 10) return;
    this.lastFireTime = time;

    const tipDist = (this.type === 'boss' || this.type === 'boss_70') ? 24 : (this.isBoss ? 20 : 16);
    const perpX = -Math.sin(angle) * (spreadDist / 2);
    const perpY = Math.cos(angle) * (spreadDist / 2);

    [-1, 1].forEach((dir) => {
      const tipX = this.x + Math.cos(angle) * tipDist + perpX * dir;
      const tipY = this.y + Math.sin(angle) * tipDist + perpY * dir;

      const bullet = new Bullet(this.scene, tipX, tipY);
      this.scene.enemyBullets.add(bullet);
      bullet.fire(tipX, tipY, Math.cos(angle), Math.sin(angle), 'enemy', this.bulletBounces);
    });
  }

  fireBossSalvo(time, baseAngle) {
    if (!this.active) return;
    this.lastFireTime = time;

    const angles = [baseAngle - 0.28, baseAngle, baseAngle + 0.28];
    angles.forEach((ang) => {
      const tipX = this.x + Math.cos(ang) * 24;
      const tipY = this.y + Math.sin(ang) * 24;

      const bullet = new Bullet(this.scene, tipX, tipY);
      this.scene.enemyBullets.add(bullet);
      bullet.fire(tipX, tipY, Math.cos(ang), Math.sin(ang), 'enemy', this.bulletBounces);
    });
  }

  placeMine(time) {
    if (!this.active) return;
    if (this.scene.enemyMines && this.scene.enemyMines.countActive(true) >= 3) return;

    this.lastMineTime = time;
    const mine = new Mine(this.scene, this.x, this.y, 'enemy');
    if (this.scene.enemyMines) {
      this.scene.enemyMines.add(mine);
    }
  }

  takeHit() {
    this.hp--;

    if (this.isBoss) {
      this.drawHealthBar();
    }

    // Flash white/transparent effect
    this.scene.tweens.add({
      targets: this,
      alpha: 0.25,
      duration: 60,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (this.active) this.setAlpha(1);
      }
    });

    if (this.hp <= 0) {
      this.destroyTank();
      return true; // Killed
    } else {
      audio.playBounce();
      return false; // Damaged only
    }
  }

  destroyTank() {
    if (!this.active) return;
    if (this.healthBar) {
      this.healthBar.destroy();
      this.healthBar = null;
    }
    audio.playExplosion();

    if (this.scene.confettiEmitter) {
      const particleCount = this.isBoss ? 55 : 25;
      this.scene.confettiEmitter.explode(particleCount, this.x, this.y);
    }

    this.setActive(false);
    this.setVisible(false);
    this.destroy();
  }
}
