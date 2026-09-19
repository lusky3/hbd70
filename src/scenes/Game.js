// src/scenes/Game.js
// Main tactical gameplay arena wiring physics, Allan's motorcycle tank, enemies, and combat

import { LEVELS } from '../data/levels.js';
import { PlayerTank } from '../entities/PlayerTank.js';
import { EnemyTank } from '../entities/EnemyTank.js';
import { Bullet } from '../entities/Bullet.js';
import { Mine } from '../entities/Mine.js';
import { TerrainBuilder } from '../systems/TerrainBuilder.js';
import { TouchControls } from '../systems/TouchControls.js';
import { audio } from '../systems/AudioManager.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Game' });
  }

  init(data) {
    this.levelNum = data.levelNum || 1;
    this.lives = data.lives !== undefined ? data.lives : 3;
    this.tanksDefeated = data.tanksDefeated || 0;
    this.isGameOver = false;
    this.isLevelClearing = false;
    this.isPlayerInvulnerable = false;
  }

  create() {
    this.levelData = LEVELS[this.levelNum - 1] || LEVELS[0];
    this.currentBounceCount = this.levelData.bounceCount || 1;

    // 1. Confetti & Sparks Particle Emitter
    this.confettiEmitter = this.add.particles(0, 0, 'confetti', {
      speed: { min: 60, max: 220 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0.2 },
      lifespan: 600,
      emitting: false
    });
    this.confettiEmitter.setDepth(50);

    // 2. Physics Groups
    this.playerBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
    this.enemyBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
    this.playerMines = this.physics.add.group({ classType: Mine });
    this.enemyMines = this.physics.add.group({ classType: Mine });
    this.enemies = this.physics.add.group({ classType: EnemyTank });

    // 3. Build Arena Terrain
    this.terrain = new TerrainBuilder(this);
    this.terrain.build(this.levelData);

    // 4. Spawn Player Tank
    const pStart = this.terrain.toWorld(this.levelData.playerStart.x, this.levelData.playerStart.y);
    this.player = new PlayerTank(this, pStart.x, pStart.y);

    // 5. Spawn Enemies
    this.levelData.enemies.forEach((enemyDef) => {
      const ePos = this.terrain.toWorld(enemyDef.x, enemyDef.y);
      const enemy = new EnemyTank(this, ePos.x, ePos.y, enemyDef.type);
      this.enemies.add(enemy);
    });

    // 6. Setup Controls & HUD
    this.controls = new TouchControls(this);
    this.scene.launch('HUD');

    this.events.emit('update-hud', {
      lives: this.lives,
      levelNum: this.levelNum,
      year: this.levelData.year,
      title: this.levelData.title,
      minesAvailable: 2,
      enemyCount: this.enemies.countActive(true)
    });

    // 7. Setup Colliders
    this.setupColliders();
  }

  setupColliders() {
    // Bullets vs Walls
    this.physics.add.collider(this.playerBullets, this.terrain.wallsGroup, (bullet) => {
      bullet.onWallBounce();
    });
    this.physics.add.collider(this.enemyBullets, this.terrain.wallsGroup, (bullet) => {
      bullet.onWallBounce();
    });

    // Bullets vs Destructible Blocks
    this.physics.add.collider(this.playerBullets, this.terrain.blocksGroup, (bullet, block) => {
      bullet.explode();
      this.terrain.destroyBlock(block);
      audio.playExplosion();
    });
    this.physics.add.collider(this.enemyBullets, this.terrain.blocksGroup, (bullet, block) => {
      bullet.explode();
      this.terrain.destroyBlock(block);
      audio.playExplosion();
    });

    // Bullet vs Bullet
    this.physics.add.overlap(this.playerBullets, this.enemyBullets, (b1, b2) => {
      b1.explode();
      b2.explode();
    });

    // Bullets vs Tanks
    this.physics.add.overlap(this.playerBullets, this.enemies, (bullet, enemy) => {
      bullet.explode();
      const killed = enemy.takeHit();
      if (killed) {
        this.tanksDefeated++;
        this.checkLevelComplete();
      }
    });

    this.physics.add.overlap(this.enemyBullets, this.player, (bullet) => {
      if (!this.isPlayerInvulnerable) {
        bullet.explode();
        this.onPlayerHit();
      }
    });

    // Bullets vs Mines
    const bulletMineOverlap = (bullet, mine) => {
      bullet.explode();
      mine.explode();
    };
    this.physics.add.overlap(this.playerBullets, this.playerMines, bulletMineOverlap);
    this.physics.add.overlap(this.playerBullets, this.enemyMines, bulletMineOverlap);
    this.physics.add.overlap(this.enemyBullets, this.playerMines, bulletMineOverlap);
    this.physics.add.overlap(this.enemyBullets, this.enemyMines, bulletMineOverlap);

    // Tanks vs Mines
    const tankMineOverlap = (tank, mine) => {
      if (mine.isArmed) mine.explode();
    };
    this.physics.add.overlap(this.player, this.playerMines, tankMineOverlap);
    this.physics.add.overlap(this.player, this.enemyMines, tankMineOverlap);
    this.physics.add.overlap(this.enemies, this.playerMines, tankMineOverlap);
    this.physics.add.overlap(this.enemies, this.enemyMines, tankMineOverlap);

    // Enemies vs Obstacles & Each Other
    this.physics.add.collider(this.enemies, this.terrain.wallsGroup);
    this.physics.add.collider(this.enemies, this.terrain.blocksGroup);
    this.physics.add.collider(this.enemies, this.terrain.waterGroup);
    this.physics.add.collider(this.enemies, this.enemies);

    this.setupPlayerColliders();
  }

  setupPlayerColliders() {
    if (!this.player) return;
    this.playerWallCollider = this.physics.add.collider(this.player, this.terrain.wallsGroup);
    this.playerBlockCollider = this.physics.add.collider(this.player, this.terrain.blocksGroup);
    this.playerWaterCollider = this.physics.add.collider(this.player, this.terrain.waterGroup);
    this.playerEnemyCollider = this.physics.add.collider(this.player, this.enemies, () => {
      if (!this.isPlayerInvulnerable) {
        this.onPlayerHit();
      }
    });
  }

  update(time, delta) {
    if (this.isGameOver || this.isLevelClearing) return;

    // 1. Update controls input
    if (this.controls) {
      this.controls.update();
    }

    // 2. Update player tank
    if (this.player && this.player.active) {
      this.player.update(
        this.controls.moveVector,
        this.controls.aimVector,
        this.controls.isFiring,
        this.controls.wantsMine,
        time
      );
      this.controls.wantsMine = false; // Reset single-tap flag
    }

    // 3. Update enemies AI
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy.active) {
        enemy.update(this.player, time, delta);
      }
    });

    // 4. Update HUD active mines count
    const activePlayerMines = this.playerMines.countActive(true);
    this.events.emit('update-hud', {
      minesAvailable: Math.max(0, 2 - activePlayerMines)
    });
  }

  onMineExplode(x, y, radius) {
    // Check player proximity
    if (this.player && this.player.active && !this.isPlayerInvulnerable) {
      const pDist = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
      if (pDist <= radius) {
        this.onPlayerHit();
      }
    }

    // Check enemies proximity
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy.active) {
        const eDist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
        if (eDist <= radius) {
          const killed = enemy.takeHit();
          if (killed) {
            this.tanksDefeated++;
            this.checkLevelComplete();
          }
        }
      }
    });

    // Check destructible blocks proximity
    this.terrain.blocksGroup.getChildren().forEach((block) => {
      if (block.active) {
        const bDist = Phaser.Math.Distance.Between(x, y, block.x, block.y);
        if (bDist <= radius) {
          this.terrain.destroyBlock(block);
        }
      }
    });
  }

  onPlayerHit() {
    if (this.isPlayerInvulnerable || this.isGameOver || this.isLevelClearing) return;

    this.lives--;
    if (this.player) {
      this.player.destroyTank();
      this.player = null;
    }

    this.events.emit('update-hud', { lives: this.lives });

    if (this.lives <= 0) {
      this.isGameOver = true;
      audio.playGameOver();
      this.time.delayedCall(1500, () => {
        this.scene.stop('HUD');
        this.scene.start('GameOver', {
          levelNum: this.levelNum,
          tanksDefeated: this.tanksDefeated
        });
      });
    } else {
      this.time.delayedCall(1200, () => {
        this.respawnPlayer();
      });
    }
  }

  respawnPlayer() {
    if (this.isGameOver || this.isLevelClearing) return;

    const pStart = this.terrain.toWorld(this.levelData.playerStart.x, this.levelData.playerStart.y);
    this.player = new PlayerTank(this, pStart.x, pStart.y);
    this.setupPlayerColliders();

    // 1.5s invulnerability flash
    this.isPlayerInvulnerable = true;
    this.tweens.add({
      targets: [this.player, this.player.turret],
      alpha: 0.3,
      duration: 150,
      yoyo: true,
      repeat: 6,
      onComplete: () => {
        this.isPlayerInvulnerable = false;
        if (this.player && this.player.active) {
          this.player.setAlpha(1);
          if (this.player.turret) this.player.turret.setAlpha(1);
        }
      }
    });
  }

  checkLevelComplete() {
    this.time.delayedCall(150, () => {
      const remaining = this.enemies.countActive(true);
      this.events.emit('update-hud', { enemyCount: remaining });

      if (remaining === 0 && !this.isLevelClearing && !this.isGameOver) {
        this.isLevelClearing = true;
        audio.playFanfare();

        if (this.confettiEmitter) {
          this.confettiEmitter.explode(40, this.cameras.main.width / 2, this.cameras.main.height / 2);
        }

        this.time.delayedCall(1600, () => {
          this.scene.stop('HUD');
          if (this.levelNum >= 70) {
            this.scene.start('Victory', {
              tanksDefeated: this.tanksDefeated
            });
          } else {
            this.scene.start('LevelCard', {
              levelNum: this.levelNum + 1,
              lives: this.lives,
              tanksDefeated: this.tanksDefeated
            });
          }
        });
      }
    });
  }
}
