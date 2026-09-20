// src/systems/EnemyAI.js
// Autonomous state machines and tactical decision making for 7 enemy tank archetypes

export class EnemyAI {
  constructor(tank) {
    this.tank = tank;
    this.type = tank.type;
    this.moveTimer = 0;
    this.moveInterval = 1200;
    this.patrolDir = new Phaser.Math.Vector2(1, 0);
    this.zigZagTimer = 0;
    this.zigZagDir = 1;

    // Pick random initial movement direction
    const randomAngle = Math.random() * Math.PI * 2;
    this.patrolDir.set(Math.cos(randomAngle), Math.sin(randomAngle)).normalize();
  }

  update(player, time, delta) {
    if (!this.tank.active || !player || !player.active) {
      this.tank.setVelocity(0, 0);
      return;
    }

    const distToPlayer = Phaser.Math.Distance.Between(this.tank.x, this.tank.y, player.x, player.y);
    const angleToPlayer = Phaser.Math.Angle.Between(this.tank.x, this.tank.y, player.x, player.y);

    switch (this.type) {
      case 'candle':
        this.updateCandle(angleToPlayer, time);
        break;
      case 'golf':
        this.updateGolf(angleToPlayer, time, delta);
        break;
      case 'puck':
        this.updatePuck(angleToPlayer, time, delta);
        break;
      case 'boat':
        this.updateBoat(angleToPlayer, time, delta);
        break;
      case 'snowmobile':
        this.updateSnowmobile(angleToPlayer, time, delta);
        break;
      case 'biker':
        this.updateBiker(angleToPlayer, time, delta);
        break;
      case 'boss_candle':
        this.updateBossCandle(angleToPlayer, distToPlayer, time, delta);
        break;
      case 'boss_golf':
        this.updateBossGolf(angleToPlayer, distToPlayer, time, delta);
        break;
      case 'boss_puck':
        this.updateBossPuck(angleToPlayer, distToPlayer, time, delta);
        break;
      case 'boss_boat':
        this.updateBossBoat(angleToPlayer, distToPlayer, time, delta);
        break;
      case 'boss_snowmobile':
        this.updateBossSnowmobile(angleToPlayer, distToPlayer, time, delta);
        break;
      case 'boss_biker':
        this.updateBossBiker(angleToPlayer, distToPlayer, time, delta);
        break;
      case 'boss':
      case 'boss_70':
        this.updateBoss(angleToPlayer, distToPlayer, time, delta);
        break;
      default:
        this.updateGolf(angleToPlayer, time, delta);
    }
  }

  updateCandle(angleToPlayer, time) {
    // Stationary turret. Slowly track player and fire.
    this.tank.setVelocity(0, 0);
    this.tank.rotation = Phaser.Math.Angle.RotateTo(this.tank.rotation, angleToPlayer, 0.05);

    if (time > this.tank.lastFireTime + this.tank.fireCooldown) {
      this.tank.fireBullet(time, angleToPlayer);
    }
  }

  updateGolf(angleToPlayer, time, delta) {
    // Slow patrol with random direction adjustments every 2 seconds
    this.moveTimer += delta;
    if (this.moveTimer > this.moveInterval) {
      this.moveTimer = 0;
      this.moveInterval = 1500 + Math.random() * 1500;
      const angle = Math.random() * Math.PI * 2;
      this.patrolDir.set(Math.cos(angle), Math.sin(angle)).normalize();
    }

    this.tank.setVelocity(this.patrolDir.x * this.tank.speed, this.patrolDir.y * this.tank.speed);
    this.tank.rotation = Phaser.Math.Angle.RotateTo(this.tank.rotation, Math.atan2(this.patrolDir.y, this.patrolDir.x), 0.1);

    // Aim toward player to fire
    if (time > this.tank.lastFireTime + this.tank.fireCooldown) {
      // Add slight inaccuracy
      const fireAngle = angleToPlayer + (Math.random() - 0.5) * 0.25;
      this.tank.fireBullet(time, fireAngle);
    }
  }

  updatePuck(angleToPlayer, time, delta) {
    // Fast sliding. When hitting walls or obstacles, arcade bounce preserves momentum.
    // If stopped or very slow, kick off in a new angle
    const currentSpeed = this.tank.body.velocity.length();
    const threshold = 30 * (this.tank.speedMultiplier || 1.0);
    if (currentSpeed < threshold) {
      const angle = Math.random() * Math.PI * 2;
      this.tank.setVelocity(Math.cos(angle) * this.tank.speed, Math.sin(angle) * this.tank.speed);
    }

    this.tank.rotation = Math.atan2(this.tank.body.velocity.y, this.tank.body.velocity.x);

    if (time > this.tank.lastFireTime + this.tank.fireCooldown) {
      this.tank.fireBullet(time, angleToPlayer);
    }
  }

  updateBoat(angleToPlayer, time, delta) {
    // Smooth cruising and strafing
    this.moveTimer += delta;
    if (this.moveTimer > 1800) {
      this.moveTimer = 0;
      const perpAngle = angleToPlayer + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
      this.patrolDir.set(Math.cos(perpAngle), Math.sin(perpAngle)).normalize();
    }

    this.tank.setVelocity(this.patrolDir.x * this.tank.speed, this.patrolDir.y * this.tank.speed);
    this.tank.rotation = Phaser.Math.Angle.RotateTo(this.tank.rotation, Math.atan2(this.patrolDir.y, this.patrolDir.x), 0.15);

    if (time > this.tank.lastFireTime + this.tank.fireCooldown) {
      this.tank.fireBullet(time, angleToPlayer);
    }
  }

  updateSnowmobile(angleToPlayer, time, delta) {
    // Erratic zig-zag towards the player
    this.zigZagTimer += delta;
    if (this.zigZagTimer > 400) {
      this.zigZagTimer = 0;
      this.zigZagDir *= -1;
    }

    const directVector = new Phaser.Math.Vector2(Math.cos(angleToPlayer), Math.sin(angleToPlayer));
    const perpVector = new Phaser.Math.Vector2(-directVector.y, directVector.x).scale(this.zigZagDir * 0.8);
    const finalDir = directVector.add(perpVector).normalize();

    this.tank.setVelocity(finalDir.x * this.tank.speed, finalDir.y * this.tank.speed);
    this.tank.rotation = Phaser.Math.Angle.RotateTo(this.tank.rotation, Math.atan2(finalDir.y, finalDir.x), 0.2);

    if (time > this.tank.lastFireTime + this.tank.fireCooldown) {
      this.tank.fireBullet(time, angleToPlayer);
    }
  }

  updateBiker(angleToPlayer, time, delta) {
    // Direct aggressive pursuit charge toward player
    const vx = Math.cos(angleToPlayer) * this.tank.speed;
    const vy = Math.sin(angleToPlayer) * this.tank.speed;

    this.tank.setVelocity(vx, vy);
    this.tank.rotation = Phaser.Math.Angle.RotateTo(this.tank.rotation, angleToPlayer, 0.2);

    if (time > this.tank.lastFireTime + this.tank.fireCooldown) {
      this.tank.fireBullet(time, angleToPlayer);
    }
  }

  updateBossCandle(angleToPlayer, distToPlayer, time, delta) {
    // Level 10 Mega Candle: Stationary flame tower with 3-spark spread and defensive spark mines
    this.tank.setVelocity(0, 0);
    this.tank.rotation = Phaser.Math.Angle.RotateTo(this.tank.rotation, angleToPlayer, 0.08);

    if (time > this.tank.lastFireTime + this.tank.fireCooldown) {
      this.tank.fireSpread(time, angleToPlayer, 3, 0.42);
    }

    if (distToPlayer < 110 && time > this.tank.lastMineTime + 3500) {
      this.tank.placeMine(time);
    }
  }

  updateBossGolf(angleToPlayer, distToPlayer, time, delta) {
    // Level 20 Golf Dreadnought: Tactical perimeter circle-strafing with bouncy golf balls
    this.moveTimer += delta;
    if (this.moveTimer > 2200) {
      this.moveTimer = 0;
      this.zigZagDir *= -1;
    }

    let targetAngle = angleToPlayer + (Math.PI / 2) * this.zigZagDir;
    if (distToPlayer < 110) {
      targetAngle = angleToPlayer + Math.PI; // Back away
    } else if (distToPlayer > 220) {
      targetAngle = angleToPlayer; // Close distance
    }

    const vx = Math.cos(targetAngle) * this.tank.speed;
    const vy = Math.sin(targetAngle) * this.tank.speed;
    this.tank.setVelocity(vx, vy);
    this.tank.rotation = Phaser.Math.Angle.RotateTo(this.tank.rotation, Math.atan2(vy, vx), 0.15);

    if (time > this.tank.lastFireTime + this.tank.fireCooldown) {
      const aimLead = angleToPlayer + (Math.random() - 0.5) * 0.15;
      this.tank.fireBullet(time, aimLead);
    }
  }

  updateBossPuck(angleToPlayer, distToPlayer, time, delta) {
    // Level 30 Zamboni Juggernaut: Relentless bulldozer ice charge & bouncy puck salvos
    const currentSpeed = this.tank.body.velocity.length();
    if (currentSpeed < 40) {
      const vx = Math.cos(angleToPlayer) * this.tank.speed;
      const vy = Math.sin(angleToPlayer) * this.tank.speed;
      this.tank.setVelocity(vx, vy);
    } else {
      // Slight steer towards player while preserving high arcade sliding bounce
      const vx = Phaser.Math.Linear(this.tank.body.velocity.x, Math.cos(angleToPlayer) * this.tank.speed, 0.03);
      const vy = Phaser.Math.Linear(this.tank.body.velocity.y, Math.sin(angleToPlayer) * this.tank.speed, 0.03);
      this.tank.setVelocity(vx, vy);
    }

    this.tank.rotation = Math.atan2(this.tank.body.velocity.y, this.tank.body.velocity.x);

    if (time > this.tank.lastFireTime + this.tank.fireCooldown) {
      this.tank.fireSpread(time, angleToPlayer, 2, 0.24);
    }
  }

  updateBossBoat(angleToPlayer, distToPlayer, time, delta) {
    // Level 40 Iron Cruiser: Amphibious twin-hull naval gunboat with dual heavy shells & water mines
    this.moveTimer += delta;
    if (this.moveTimer > 2000) {
      this.moveTimer = 0;
      const perpAngle = angleToPlayer + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
      this.patrolDir.set(Math.cos(perpAngle), Math.sin(perpAngle)).normalize();
    }

    this.tank.setVelocity(this.patrolDir.x * this.tank.speed, this.patrolDir.y * this.tank.speed);
    this.tank.rotation = Phaser.Math.Angle.RotateTo(this.tank.rotation, Math.atan2(this.patrolDir.y, this.patrolDir.x), 0.15);

    if (time > this.tank.lastFireTime + this.tank.fireCooldown) {
      this.tank.fireDual(time, angleToPlayer, 14);
    }

    if (distToPlayer < 140 && time > this.tank.lastMineTime + 3800) {
      this.tank.placeMine(time);
    }
  }

  updateBossSnowmobile(angleToPlayer, distToPlayer, time, delta) {
    // Level 50 Blizzard Snowcat: Evasive drifting & rapid-fire ice missile spread
    this.zigZagTimer += delta;
    if (this.zigZagTimer > 350) {
      this.zigZagTimer = 0;
      this.zigZagDir *= -1;
    }

    const directVector = new Phaser.Math.Vector2(Math.cos(angleToPlayer), Math.sin(angleToPlayer));
    const perpVector = new Phaser.Math.Vector2(-directVector.y, directVector.x).scale(this.zigZagDir * 0.9);
    const finalDir = directVector.add(perpVector).normalize();

    this.tank.setVelocity(finalDir.x * this.tank.speed, finalDir.y * this.tank.speed);
    this.tank.rotation = Phaser.Math.Angle.RotateTo(this.tank.rotation, Math.atan2(finalDir.y, finalDir.x), 0.2);

    if (time > this.tank.lastFireTime + this.tank.fireCooldown) {
      this.tank.fireSpread(time, angleToPlayer, 2, 0.2);
    }
  }

  updateBossBiker(angleToPlayer, distToPlayer, time, delta) {
    // Level 60 Chopper Warlord: Aggressive pursuit, road-spike mine drops & twin exhaust blasts
    const vx = Math.cos(angleToPlayer) * this.tank.speed;
    const vy = Math.sin(angleToPlayer) * this.tank.speed;

    this.tank.setVelocity(vx, vy);
    this.tank.rotation = Phaser.Math.Angle.RotateTo(this.tank.rotation, angleToPlayer, 0.2);

    if (time > this.tank.lastFireTime + this.tank.fireCooldown) {
      this.tank.fireDual(time, angleToPlayer, 16);
    }

    if (distToPlayer < 130 && time > this.tank.lastMineTime + 3200) {
      this.tank.placeMine(time);
    }
  }

  updateBoss(angleToPlayer, distToPlayer, time, delta) {
    // Level 70 Grand Champion Boss: Heavy fortress with enraged Phase 2
    const isEnraged = this.tank.hp <= 4;
    const currentSpeed = isEnraged ? 68 : 45;
    const fireCooldown = isEnraged ? 950 : 1400;

    this.moveTimer += delta;
    if (this.moveTimer > (isEnraged ? 1500 : 2500)) {
      this.moveTimer = 0;
      const angle = Math.random() * Math.PI * 2;
      this.patrolDir.set(Math.cos(angle), Math.sin(angle)).normalize();
    }

    this.tank.setVelocity(this.patrolDir.x * currentSpeed, this.patrolDir.y * currentSpeed);
    this.tank.rotation = Phaser.Math.Angle.RotateTo(this.tank.rotation, angleToPlayer, isEnraged ? 0.14 : 0.08);

    // Multi-shot salvo (phase 2 fires 4-projectile fireworks spread)
    if (time > this.tank.lastFireTime + fireCooldown) {
      if (isEnraged) {
        this.tank.fireSpread(time, angleToPlayer, 4, 0.52);
      } else {
        this.tank.fireBossSalvo(time, angleToPlayer);
      }
    }

    // Deploy mine if player is relatively close and cooldown elapsed
    if (distToPlayer < 160 && time > this.tank.lastMineTime + (isEnraged ? 2800 : 4000)) {
      this.tank.placeMine(time);
    }
  }
}
