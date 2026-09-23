// src/scenes/MultiplayerTanks.js
// 2 to 4 Player Real-Time Multiplayer Tanks Arena with Host-Authoritative Physics & Interpolation

import { network } from '../systems/NetworkManager.js';
import { TouchControls } from '../systems/TouchControls.js';
import { Bullet } from '../entities/Bullet.js';
import { Mine } from '../entities/Mine.js';
import { audio } from '../systems/AudioManager.js';

const SceneBase = typeof Phaser !== 'undefined' ? Phaser.Scene : class {};

const SLOT_COLORS = {
  1: { hex: 0x38bdf8, str: '#38bdf8', name: 'CYAN' },
  2: { hex: 0x4ade80, str: '#4ade80', name: 'EMERALD' },
  3: { hex: 0xf87171, str: '#f87171', name: 'RED' },
  4: { hex: 0xfacc15, str: '#facc15', name: 'GOLD' }
};

const SPAWN_POINTS = {
  1: { x: 72, y: 130 },
  2: { x: 408, y: 555 },
  3: { x: 408, y: 130 },
  4: { x: 72, y: 555 }
};

const TARGET_FRAGS = 5;
const MATCH_DURATION = 180; // seconds (3 mins)

export class MultiplayerTanksScene extends SceneBase {
  constructor() {
    super('MultiplayerTanks');
  }

  init(data) {
    this.isHost = !!data?.isHost || network.isHost;
    this.mySlot = network.mySlot || 1;
    this.matchTime = MATCH_DURATION;
    this.isMatchOver = false;
    this.inputSeq = 0;
    this.lastSnapshotTime = 0;
    this.lastInputSendTime = 0;
    this.tick = 0;
    this.destroyedBlockIds = new Set();
    this.unsubscribers = [];
  }

  create() {
    const { width, height } = this.scale;

    // 1. Dark Arena Floor Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0f1d, 0x0a0f1d, 0x111827, 0x111827, 1);
    bg.fillRect(0, 0, width, height);

    // Subtle arena grid
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1e293b, 0.4);
    for (let x = 16; x <= width - 16; x += 32) {
      grid.lineBetween(x, 70, x, 615);
    }
    for (let y = 70; y <= 615; y += 32) {
      grid.lineBetween(16, y, width - 16, y);
    }

    // 2. Physics Groups
    this.wallsGroup = this.physics.add.staticGroup();
    this.blocksGroup = this.physics.add.staticGroup();
    this.bulletsGroup = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
    this.minesGroup = this.physics.add.group({ classType: Mine });
    this.tanksGroup = this.physics.add.group();

    // 3. Build Arena Terrain
    this.buildMultiplayerArena(width);

    // 4. Confetti Emitter
    this.confettiEmitter = this.add.particles(0, 0, 'confetti', {
      speed: { min: 60, max: 200 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0.2 },
      lifespan: 500,
      emitting: false
    });
    this.confettiEmitter.setDepth(50);

    // 5. Initialize Tanks for connected players
    this.tanks = new Map(); // slot => tank entity wrapper
    this.initTanks();

    // 6. Setup Local Touch & Keyboard Controls
    this.controls = new TouchControls(this);
    // Point scene.player to our local tank sprite for TouchControls reference
    const myTankWrapper = this.tanks.get(this.mySlot);
    if (myTankWrapper) {
      this.player = myTankWrapper.sprite;
    }

    // 7. Setup Physics Colliders (Active on Host)
    if (this.isHost) {
      this.setupHostColliders();
    }

    // 8. Top HUD Bar (Scoreboard, Timer, Menu button)
    this.createHUD(width);

    // 9. Match Timer Clock
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (!this.isMatchOver && this.matchTime > 0) {
          this.matchTime--;
          this.updateHUDTimer();
          if (this.matchTime <= 0 && this.isHost) {
            this.triggerMatchOver();
          }
        }
      }
    });

    // 10. Wire Network Snapshot & Event Listeners
    this.setupNetwork();

    // 11. Teardown hook
    this.events.once('shutdown', () => {
      this.teardown();
    });

    // Grant initial 2s spawn invulnerability
    this.tanks.forEach(t => this.setSpawnShield(t, 2000));
  }

  buildMultiplayerArena(width) {
    const minX = 16;
    const maxX = width - 16;
    const minY = 70;
    const maxY = 615;

    // Perimeter Walls
    const wallThickness = 12;
    const wallColor = 0x334155;
    const wallBorder = 0x64748b;

    const createWall = (x, y, w, h) => {
      const wall = this.add.graphics();
      wall.fillStyle(wallColor, 1);
      wall.fillRoundedRect(x, y, w, h, 4);
      wall.lineStyle(1.5, wallBorder, 1);
      wall.strokeRoundedRect(x, y, w, h, 4);

      const zone = this.physics.add.staticBody(x + w / 2, y + h / 2, w, h);
      return zone;
    };

    // Top, Bottom, Left, Right perimeter bounds
    createWall(minX, minY, maxX - minX, wallThickness);
    createWall(minX, maxY - wallThickness, maxX - minX, wallThickness);
    createWall(minX, minY, wallThickness, maxY - minY);
    createWall(maxX - wallThickness, minY, wallThickness, maxY - minY);

    // Symmetrical Central Obstacles
    const centerX = width / 2;
    const centerY = (minY + maxY) / 2;

    // Center Indestructible Pillars
    createWall(centerX - 80, centerY - 14, 28, 28);
    createWall(centerX + 52, centerY - 14, 28, 28);

    // Destructible Birthday Gift Blocks (Ring)
    const blockPositions = [
      { x: centerX, y: centerY - 65 },
      { x: centerX, y: centerY + 65 },
      { x: centerX - 66, y: centerY - 95 },
      { x: centerX + 66, y: centerY - 95 },
      { x: centerX - 66, y: centerY + 95 },
      { x: centerX + 66, y: centerY + 95 }
    ];

    blockPositions.forEach((pos, idx) => {
      const block = this.blocksGroup.create(pos.x, pos.y, 'giftbox');
      block.setOrigin(0.5);
      block.setDepth(10);
      block.blockId = idx;
      block.refreshBody();
    });
  }

  initTanks() {
    const players = network.getAllPlayers();
    players.forEach(p => {
      this.createTankEntity(p.slot, p.tag, p.fullName);
    });
  }

  createTankEntity(slot, tag, fullName) {
    const spawn = SPAWN_POINTS[slot] || { x: 240, y: 340 };
    const color = SLOT_COLORS[slot] || SLOT_COLORS[1];

    // Chassis Sprite
    const sprite = this.physics.add.sprite(spawn.x, spawn.y, 'motorcycle');
    sprite.setDepth(20);
    sprite.setCircle(13, 3, 3);
    sprite.setCollideWorldBounds(true);
    sprite.setTint(color.hex);
    this.tanksGroup.add(sprite);

    // Turret Sprite
    const turret = this.add.sprite(spawn.x, spawn.y, 'turret');
    turret.setDepth(22);
    turret.setTint(color.hex);

    // Overhead Label & Health Bar Container
    const overhead = this.add.container(spawn.x, spawn.y - 26);
    overhead.setDepth(30);

    const tagText = this.add.text(0, -6, `[${tag}]`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: color.str
    }).setOrigin(0.5);
    overhead.add(tagText);

    const hpBar = this.add.graphics();
    overhead.add(hpBar);

    // Shield Aura Graphics
    const shieldGraphics = this.add.graphics();
    shieldGraphics.setDepth(25);

    const tankWrapper = {
      slot,
      tag,
      fullName,
      sprite,
      turret,
      overhead,
      hpBar,
      shieldGraphics,
      hp: 3,
      frags: 0,
      deaths: 0,
      isDead: false,
      isShielded: false,
      targetX: spawn.x,
      targetY: spawn.y,
      targetRot: 0,
      targetTurretRot: -Math.PI / 2,
      lastFireTime: 0,
      lastMineTime: 0,
      activeBullets: [],
      activeMines: []
    };

    this.updateHPBar(tankWrapper);
    this.tanks.set(slot, tankWrapper);
    return tankWrapper;
  }

  updateHPBar(tank) {
    const g = tank.hpBar;
    g.clear();
    const barW = 26;
    const barH = 4;
    const x = -barW / 2;
    const y = 2;

    // Background
    g.fillStyle(0x0f172a, 0.8);
    g.fillRect(x, y, barW, barH);

    // HP Pips
    const pipW = (barW - 4) / 3;
    for (let i = 0; i < 3; i++) {
      if (i < tank.hp) {
        g.fillStyle(tank.hp === 1 ? 0xef4444 : 0x22c55e, 1);
        g.fillRect(x + 1 + i * (pipW + 1), y + 1, pipW, barH - 2);
      }
    }
  }

  setSpawnShield(tank, durationMs = 1500) {
    tank.isShielded = true;
    tank.shieldUntil = this.time.now + durationMs;

    this.tweens.add({
      targets: tank.sprite,
      alpha: 0.4,
      duration: 120,
      yoyo: true,
      repeat: Math.floor(durationMs / 240),
      onComplete: () => {
        if (tank && tank.sprite && tank.sprite.active) {
          tank.sprite.setAlpha(1);
          tank.isShielded = false;
        }
      }
    });
  }

  // ==========================================
  // HOST-AUTHORITATIVE COLLIDERS & SIMULATION
  // ==========================================
  setupHostColliders() {
    // Tanks vs Walls & Blocks
    this.physics.add.collider(this.tanksGroup, this.wallsGroup);
    this.physics.add.collider(this.tanksGroup, this.blocksGroup);
    this.physics.add.collider(this.tanksGroup, this.tanksGroup);

    // Bullets vs Walls (Bounce)
    this.physics.add.collider(this.bulletsGroup, this.wallsGroup, (bullet) => {
      if (bullet.onWallBounce) bullet.onWallBounce();
      else bullet.destroy();
    });

    // Bullets vs Destructible Blocks
    this.physics.add.collider(this.bulletsGroup, this.blocksGroup, (bullet, block) => {
      this.destroyBlock(block);
      bullet.destroy();
      audio.playExplosion?.();
    });

    // Bullets vs Tanks
    this.physics.add.overlap(this.bulletsGroup, this.tanksGroup, (bullet, tankSprite) => {
      const victim = this.getTankBySprite(tankSprite);
      if (!victim || victim.isDead || victim.isShielded) return;
      if (bullet.ownerSlot === victim.slot) return; // Immune to own bullets

      bullet.destroy();
      this.damageTank(victim, 1, bullet.ownerSlot);
    });

    // Mines vs Tanks
    this.physics.add.overlap(this.minesGroup, this.tanksGroup, (mine, tankSprite) => {
      const victim = this.getTankBySprite(tankSprite);
      if (!victim || victim.isDead || victim.isShielded) return;

      this.explodeMine(mine);
    });

    // Bullet vs Bullet
    this.physics.add.overlap(this.bulletsGroup, this.bulletsGroup, (b1, b2) => {
      b1.destroy();
      b2.destroy();
    });
  }

  destroyBlock(block) {
    if (!block || !block.active) return;
    if (block.blockId !== undefined) {
      this.destroyedBlockIds.add(block.blockId);
    }
    this.confettiEmitter.emitParticleAt(block.x, block.y, 16);
    block.destroy();
  }

  damageTank(victim, amount, attackerSlot) {
    if (victim.isDead || victim.isShielded) return;

    victim.hp -= amount;
    this.updateHPBar(victim);
    audio.playHit?.();

    if (victim.hp <= 0) {
      this.killTank(victim, attackerSlot);
    }
  }

  killTank(victim, killerSlot) {
    victim.isDead = true;
    victim.hp = 0;
    victim.deaths++;
    victim.sprite.setVisible(false);
    victim.turret.setVisible(false);
    victim.overhead.setVisible(false);
    victim.sprite.setVelocity(0, 0);

    this.confettiEmitter.emitParticleAt(victim.sprite.x, victim.sprite.y, 35);
    audio.playExplosion?.();

    // Reward frag to killer
    if (killerSlot && this.tanks.has(killerSlot)) {
      const killer = this.tanks.get(killerSlot);
      killer.frags++;
      this.updateScoreboard();

      if (killer.frags >= TARGET_FRAGS) {
        this.triggerMatchOver(killer.slot);
        return;
      }
    }

    // Schedule Respawn after 2 seconds
    this.time.delayedCall(2000, () => {
      if (!this.isMatchOver) {
        this.respawnTank(victim);
      }
    });
  }

  respawnTank(tank) {
    const spawn = SPAWN_POINTS[tank.slot] || { x: 240, y: 340 };
    tank.sprite.setPosition(spawn.x, spawn.y);
    tank.turret.setPosition(spawn.x, spawn.y);
    tank.overhead.setPosition(spawn.x, spawn.y - 26);
    tank.sprite.setVelocity(0, 0);

    tank.hp = 3;
    tank.isDead = false;
    tank.sprite.setVisible(true);
    tank.turret.setVisible(true);
    tank.overhead.setVisible(true);
    this.updateHPBar(tank);

    this.setSpawnShield(tank, 1500);
  }

  explodeMine(mine) {
    const blastX = mine.x;
    const blastY = mine.y;
    const ownerSlot = mine.ownerSlot;
    mine.destroy();

    this.confettiEmitter.emitParticleAt(blastX, blastY, 40);
    audio.playExplosion?.();

    // Deal damage to tanks in 48px radius
    this.tanks.forEach(tank => {
      if (!tank.isDead && !tank.isShielded) {
        const d = Phaser.Math.Distance.Between(blastX, blastY, tank.sprite.x, tank.sprite.y);
        if (d < 48) {
          this.damageTank(tank, 3, ownerSlot);
        }
      }
    });

    // Destroy blocks in 48px radius
    this.blocksGroup.getChildren().forEach(block => {
      if (block.active) {
        const d = Phaser.Math.Distance.Between(blastX, blastY, block.x, block.y);
        if (d < 48) {
          this.destroyBlock(block);
        }
      }
    });
  }

  onMineExplode(x, y, radius = 48) {
    if (!this.isHost) return;
    this.confettiEmitter.emitParticleAt(x, y, 40);
    audio.playExplosion?.();

    // Deal damage to tanks in radius
    this.tanks.forEach(tank => {
      if (!tank.isDead && !tank.isShielded) {
        const d = Phaser.Math.Distance.Between(x, y, tank.sprite.x, tank.sprite.y);
        if (d < radius) {
          this.damageTank(tank, 3, null);
        }
      }
    });

    // Destroy blocks in radius
    this.blocksGroup.getChildren().forEach(block => {
      if (block.active) {
        const d = Phaser.Math.Distance.Between(x, y, block.x, block.y);
        if (d < radius) {
          this.destroyBlock(block);
        }
      }
    });
  }

  getTankBySprite(sprite) {
    for (const tank of this.tanks.values()) {
      if (tank.sprite === sprite) return tank;
    }
    return null;
  }

  // ==========================================
  // GAME LOOP & INPUT / SNAPSHOT CYCLE
  // ==========================================
  update(time, delta) {
    if (this.isMatchOver) return;

    // 1. Sample Local Input
    this.controls.update();
    const input = {
      moveX: this.controls.moveVector.x,
      moveY: this.controls.moveVector.y,
      aimX: this.controls.aimVector.x,
      aimY: this.controls.aimVector.y,
      isFiring: this.controls.isFiring,
      wantsMine: this.controls.wantsMine
    };
    this.controls.wantsMine = false; // consume mine trigger

    // 2. Transmit Local Input @ 30 Hz
    if (time > this.lastInputSendTime + 33) {
      this.lastInputSendTime = time;
      network.sendInput(input);
    }

    // 3. Local Tank Client-Side Prediction (Immediate Response)
    const myTank = this.tanks.get(this.mySlot);
    if (myTank && !myTank.isDead) {
      this.applyTankMovement(myTank, input.moveX, input.moveY, input.aimX, input.aimY);

      // Local firing trigger on client
      if (!this.isHost && input.isFiring && time > myTank.lastFireTime + 220) {
        myTank.lastFireTime = time;
        audio.playShoot?.();
      }
    }

    // 4. Host: Authoritative Simulation of All Players
    if (this.isHost) {
      this.tanks.forEach(tank => {
        if (tank.isDead) return;

        // Retrieve input packet
        const tankInput = network.clientInputs.get(tank.slot) || {
          moveX: 0, moveY: 0, aimX: 0, aimY: -1, isFiring: false, wantsMine: false
        };

        this.applyTankMovement(tank, tankInput.moveX, tankInput.moveY, tankInput.aimX, tankInput.aimY);

        // Firing Logic
        if (tankInput.isFiring && time > tank.lastFireTime + 220) {
          tank.lastFireTime = time;
          this.hostFireBullet(tank);
        }

        // Mine Placement
        if (tankInput.wantsMine && time > tank.lastMineTime + 1000) {
          tank.lastMineTime = time;
          this.hostPlaceMine(tank);
        }
      });

      // Broadcast Snapshot @ 25 Hz (every 40ms)
      if (time > this.lastSnapshotTime + 40) {
        this.lastSnapshotTime = time;
        this.broadcastHostSnapshot();
      }
    } else {
      // Client: Interpolate Remote Tanks
      this.tanks.forEach(tank => {
        if (tank.slot === this.mySlot) return; // Skip local tank

        if (tank.isDead) {
          tank.sprite.setVisible(false);
          tank.turret.setVisible(false);
          tank.overhead.setVisible(false);
          return;
        }

        tank.sprite.setVisible(true);
        tank.turret.setVisible(true);
        tank.overhead.setVisible(true);

        // Smooth Lerp
        tank.sprite.x = Phaser.Math.Linear(tank.sprite.x, tank.targetX, 0.35);
        tank.sprite.y = Phaser.Math.Linear(tank.sprite.y, tank.targetY, 0.35);
        tank.sprite.rotation = Phaser.Math.Angle.RotateTo(tank.sprite.rotation, tank.targetRot, 0.3);
        tank.turret.setPosition(tank.sprite.x, tank.sprite.y);
        tank.turret.rotation = tank.targetTurretRot;
        tank.overhead.setPosition(tank.sprite.x, tank.sprite.y - 26);
      });
    }

    // Keep Turret & Overhead in sync with local sprite
    if (myTank && !myTank.isDead) {
      myTank.turret.setPosition(myTank.sprite.x, myTank.sprite.y);
      myTank.overhead.setPosition(myTank.sprite.x, myTank.sprite.y - 26);
    }
  }

  applyTankMovement(tank, mx, my, ax, ay) {
    const speed = 145;
    if (Math.abs(mx) > 0.05 || Math.abs(my) > 0.05) {
      tank.sprite.setVelocity(mx * speed, my * speed);
      const moveAngle = Math.atan2(my, mx);
      tank.sprite.rotation = Phaser.Math.Angle.RotateTo(tank.sprite.rotation, moveAngle, 0.2);
    } else {
      tank.sprite.setVelocity(0, 0);
    }

    // Turret aiming
    if (Math.abs(ax) > 0.05 || Math.abs(ay) > 0.05) {
      tank.turret.rotation = Math.atan2(ay, ax);
    } else {
      tank.turret.rotation = tank.sprite.rotation;
    }
  }

  hostFireBullet(tank) {
    const tipX = tank.sprite.x + Math.cos(tank.turret.rotation) * 16;
    const tipY = tank.sprite.y + Math.sin(tank.turret.rotation) * 16;

    const bullet = new Bullet(this, tipX, tipY);
    bullet.ownerSlot = tank.slot;
    this.bulletsGroup.add(bullet);
    bullet.fire(tipX, tipY, Math.cos(tank.turret.rotation), Math.sin(tank.turret.rotation), 'player', 1);
    audio.playShoot?.();
  }

  hostPlaceMine(tank) {
    const behindAngle = tank.sprite.rotation + Math.PI;
    const dropX = tank.sprite.x + Math.cos(behindAngle) * 20;
    const dropY = tank.sprite.y + Math.sin(behindAngle) * 20;

    const mine = new Mine(this, dropX, dropY);
    mine.ownerSlot = tank.slot;
    this.minesGroup.add(mine);
    audio.playRev?.();
  }

  broadcastHostSnapshot() {
    const playersData = [];
    this.tanks.forEach(t => {
      playersData.push({
        slot: t.slot,
        x: Math.round(t.sprite.x),
        y: Math.round(t.sprite.y),
        rot: Number(t.sprite.rotation.toFixed(2)),
        turretRot: Number(t.turret.rotation.toFixed(2)),
        hp: t.hp,
        frags: t.frags,
        isDead: t.isDead,
        isShielded: t.isShielded
      });
    });

    const bulletsData = [];
    this.bulletsGroup.getChildren().forEach(b => {
      if (b.active) {
        bulletsData.push({
          x: Math.round(b.x),
          y: Math.round(b.y),
          vx: Math.round(b.body.velocity.x),
          vy: Math.round(b.body.velocity.y),
          ownerSlot: b.ownerSlot
        });
      }
    });

    const minesData = [];
    this.minesGroup.getChildren().forEach(m => {
      if (m.active) {
        minesData.push({
          x: Math.round(m.x),
          y: Math.round(m.y),
          ownerSlot: m.ownerSlot
        });
      }
    });

    network.broadcastSnapshot({
      tick: this.tick++,
      matchTime: this.matchTime,
      players: playersData,
      bullets: bulletsData,
      mines: minesData,
      destroyedBlocks: Array.from(this.destroyedBlockIds || [])
    });
  }

  applyClientSnapshot(snapshot) {
    if (!snapshot || !snapshot.players) return;
    if (snapshot.matchTime !== undefined) {
      this.matchTime = snapshot.matchTime;
      this.updateHUDTimer();
    }

    snapshot.players.forEach(pData => {
      const tank = this.tanks.get(pData.slot);
      if (!tank) return;

      tank.hp = pData.hp;
      tank.frags = pData.frags;
      tank.isDead = pData.isDead;
      tank.isShielded = pData.isShielded;
      this.updateHPBar(tank);

      if (pData.slot !== this.mySlot) {
        tank.targetX = pData.x;
        tank.targetY = pData.y;
        tank.targetRot = pData.rot;
        tank.targetTurretRot = pData.turretRot;
      }
    });

    this.updateScoreboard();

    // Reconcile destroyed blocks on client
    if (snapshot.destroyedBlocks && !this.isHost) {
      const destroyedSet = new Set(snapshot.destroyedBlocks);
      this.blocksGroup.getChildren().forEach(block => {
        if (block.active && destroyedSet.has(block.blockId)) {
          this.confettiEmitter?.emitParticleAt(block.x, block.y, 16);
          block.destroy();
        }
      });
    }

    // Reconcile remote bullets on client
    if (snapshot.bullets && !this.isHost) {
      this.renderClientBullets(snapshot.bullets);
    }

    // Reconcile remote mines on client
    if (snapshot.mines && !this.isHost) {
      this.renderClientMines(snapshot.mines);
    }
  }

  renderClientBullets(bulletsData) {
    // Clear dead bullets and render active
    const activeBullets = this.bulletsGroup.getChildren();
    bulletsData.forEach((bData, idx) => {
      let b = activeBullets[idx];
      if (!b) {
        b = new Bullet(this, bData.x, bData.y);
        this.bulletsGroup.add(b);
      }
      b.setPosition(bData.x, bData.y);
      b.setActive(true);
      b.setVisible(true);
    });

    for (let i = bulletsData.length; i < activeBullets.length; i++) {
      activeBullets[i].setActive(false);
      activeBullets[i].setVisible(false);
    }
  }

  renderClientMines(minesData) {
    if (!this.clientMineSprites) {
      this.clientMineSprites = [];
    }
    minesData.forEach((mData, idx) => {
      let sprite = this.clientMineSprites[idx];
      if (!sprite) {
        sprite = this.add.sprite(mData.x, mData.y, 'mine');
        sprite.setDepth(15);
        this.clientMineSprites.push(sprite);
      }
      sprite.setPosition(mData.x, mData.y);
      sprite.setActive(true);
      sprite.setVisible(true);
    });

    for (let i = minesData.length; i < this.clientMineSprites.length; i++) {
      this.clientMineSprites[i].setActive(false);
      this.clientMineSprites[i].setVisible(false);
    }
  }

  // ==========================================
  // TOP HUD & SCOREBOARD
  // ==========================================
  createHUD(width) {
    this.hudContainer = this.add.container(0, 0);
    this.hudContainer.setDepth(100);

    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x0f172a, 0.95);
    hudBg.fillRect(0, 0, width, 68);
    hudBg.lineStyle(2, 0x38bdf8, 0.8);
    hudBg.lineBetween(0, 68, width, 68);
    this.hudContainer.add(hudBg);

    // Leave Button
    const leaveBtn = this.add.container(16, 34);
    const lBg = this.add.graphics();
    lBg.fillStyle(0x1e293b, 1);
    lBg.fillRoundedRect(0, -18, 64, 36, 6);
    lBg.lineStyle(1.5, 0x64748b, 1);
    lBg.strokeRoundedRect(0, -18, 64, 36, 6);
    leaveBtn.add(lBg);

    leaveBtn.add(this.add.text(32, 0, '< LOBBY', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#94a3b8'
    }).setOrigin(0.5));

    const lZone = this.add.zone(32, 0, 64, 36).setInteractive({ useHandCursor: true });
    leaveBtn.add(lZone);
    lZone.on('pointerdown', () => {
      audio.playShoot?.();
      this.returnToLobby();
    });
    this.hudContainer.add(leaveBtn);

    // Timer Display in center
    this.timerText = this.add.text(width / 2, 24, '3:00', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#facc15'
    }).setOrigin(0.5);
    this.hudContainer.add(this.timerText);

    // Target Frags hint
    this.hudContainer.add(this.add.text(width / 2, 48, `FIRST TO ${TARGET_FRAGS} FRAGS WINS`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '9px',
      fontWeight: 'bold',
      color: '#94a3b8',
      letterSpacing: 1
    }).setOrigin(0.5));

    // Player Chips on Right
    this.scoreChipsContainer = this.add.container(width - 16, 34);
    this.hudContainer.add(this.scoreChipsContainer);
    this.updateScoreboard();
  }

  updateHUDTimer() {
    if (!this.timerText) return;
    const mins = Math.floor(this.matchTime / 60);
    const secs = this.matchTime % 60;
    this.timerText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);
  }

  updateScoreboard() {
    if (!this.scoreChipsContainer) return;
    this.scoreChipsContainer.removeAll(true);

    const players = Array.from(this.tanks.values());
    // Render chips from right to left
    let curX = 0;
    players.forEach(tank => {
      const color = SLOT_COLORS[tank.slot];
      const chip = this.add.container(curX, 0);

      const chipBg = this.add.graphics();
      chipBg.fillStyle(0x1e293b, 0.9);
      chipBg.fillRoundedRect(-52, -16, 50, 32, 6);
      chipBg.lineStyle(1.5, color.hex, 0.8);
      chipBg.strokeRoundedRect(-52, -16, 50, 32, 6);
      chip.add(chipBg);

      chip.add(this.add.text(-27, -5, tank.tag, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '10px',
        fontWeight: 'bold',
        color: color.str
      }).setOrigin(0.5));

      chip.add(this.add.text(-27, 7, `${tank.frags}`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        fontWeight: '900',
        color: '#ffffff'
      }).setOrigin(0.5));

      this.scoreChipsContainer.add(chip);
      curX -= 56;
    });
  }

  // ==========================================
  // MATCH OVER & OVERLAY
  // ==========================================
  triggerMatchOver(winnerSlot) {
    if (this.isMatchOver) return;
    this.isMatchOver = true;

    if (!winnerSlot) {
      // Find player with highest frags
      let maxFrags = -1;
      this.tanks.forEach(t => {
        if (t.frags > maxFrags) {
          maxFrags = t.frags;
          winnerSlot = t.slot;
        }
      });
    }

    const winner = this.tanks.get(winnerSlot) || this.tanks.get(1);

    // Broadcast Match Over if Host
    if (this.isHost) {
      network.sendEvent('match-over', {
        winnerSlot,
        winnerTag: winner.tag,
        winnerName: winner.fullName,
        scores: Array.from(this.tanks.values()).map(t => ({
          slot: t.slot,
          tag: t.tag,
          fullName: t.fullName,
          frags: t.frags,
          deaths: t.deaths
        }))
      });
    }

    this.showMatchOverModal(winner);
  }

  showMatchOverModal(winner) {
    audio.playVictory?.();
    const { width, height } = this.scale;

    const overlay = this.add.container(0, 0);
    overlay.setDepth(200);

    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.85);
    backdrop.fillRect(0, 0, width, height);
    overlay.add(backdrop);

    const cardW = width - 48;
    const cardH = 380;
    const cardY = height / 2 - cardH / 2;

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x0a0f1d, 0.98);
    cardBg.fillRoundedRect(24, cardY, cardW, cardH, 14);
    cardBg.lineStyle(2, 0xfacc15, 1);
    cardBg.strokeRoundedRect(24, cardY, cardW, cardH, 14);
    overlay.add(cardBg);

    // Trophy & Title
    overlay.add(this.add.text(width / 2, cardY + 36, '🏆 MATCH COMPLETED 🏆', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '18px',
      fontWeight: '900',
      color: '#facc15',
      letterSpacing: 2
    }).setOrigin(0.5));

    // Winner Announcement
    const winnerColor = SLOT_COLORS[winner.slot];
    overlay.add(this.add.text(width / 2, cardY + 75, `VICTOR: [${winner.tag}] ${winner.fullName || 'Guest'}`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '15px',
      fontWeight: 'bold',
      color: winnerColor.str
    }).setOrigin(0.5));

    // Final Standings Table
    const sortedPlayers = Array.from(this.tanks.values()).sort((a, b) => b.frags - a.frags);
    let tableY = cardY + 115;
    sortedPlayers.forEach((p, rank) => {
      const c = SLOT_COLORS[p.slot];
      const rankText = `${rank + 1}. [${p.tag}] ${p.fullName || 'Guest'}`;
      overlay.add(this.add.text(48, tableY, rankText, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        fontWeight: 'bold',
        color: c.str
      }));

      overlay.add(this.add.text(width - 48, tableY, `${p.frags} FRAGS  (${p.deaths} D)`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '13px',
        color: '#ffffff'
      }).setOrigin(1, 0));

      tableY += 32;
    });

    // Buttons: Play Again (Host) + Return to Lobby (All)
    const btnY = cardY + cardH - 50;

    if (this.isHost) {
      // Play Again
      const playAgainBtn = this.add.container(width / 2 - 80, btnY);
      const paBg = this.add.graphics();
      paBg.fillStyle(0x16a34a, 1);
      paBg.fillRoundedRect(-70, -20, 140, 40, 8);
      paBg.lineStyle(1.5, 0x4ade80, 1);
      paBg.strokeRoundedRect(-70, -20, 140, 40, 8);
      playAgainBtn.add(paBg);

      playAgainBtn.add(this.add.text(0, 0, '🔄 REMATCH', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5));

      const paZone = this.add.zone(0, 0, 140, 40).setInteractive({ useHandCursor: true });
      playAgainBtn.add(paZone);
      paZone.on('pointerdown', () => {
        audio.playVictory?.();
        network.startGame({ mode: 'tanks' });
      });
      overlay.add(playAgainBtn);

      // Return to Lobby
      const lobbyBtn = this.add.container(width / 2 + 80, btnY);
      const lBg = this.add.graphics();
      lBg.fillStyle(0x1e293b, 1);
      lBg.fillRoundedRect(-70, -20, 140, 40, 8);
      lBg.lineStyle(1.5, 0x64748b, 1);
      lBg.strokeRoundedRect(-70, -20, 140, 40, 8);
      lobbyBtn.add(lBg);

      lobbyBtn.add(this.add.text(0, 0, '🚪 LOBBY', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#94a3b8'
      }).setOrigin(0.5));

      const lZone = this.add.zone(0, 0, 140, 40).setInteractive({ useHandCursor: true });
      lobbyBtn.add(lZone);
      lZone.on('pointerdown', () => {
        audio.playShoot?.();
        this.returnToLobby();
      });
      overlay.add(lobbyBtn);
    } else {
      // Client Return to Lobby Button
      const lobbyBtn = this.add.container(width / 2, btnY);
      const lBg = this.add.graphics();
      lBg.fillStyle(0x0284c7, 1);
      lBg.fillRoundedRect(-100, -20, 200, 40, 8);
      lBg.lineStyle(1.5, 0x38bdf8, 1);
      lBg.strokeRoundedRect(-100, -20, 200, 40, 8);
      lobbyBtn.add(lBg);

      lobbyBtn.add(this.add.text(0, 0, 'RETURN TO LOBBY ▶', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        fontWeight: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5));

      const lZone = this.add.zone(0, 0, 200, 40).setInteractive({ useHandCursor: true });
      lobbyBtn.add(lZone);
      lZone.on('pointerdown', () => {
        audio.playShoot?.();
        this.returnToLobby();
      });
      overlay.add(lobbyBtn);
    }
  }

  returnToLobby(broadcast = true) {
    if (broadcast && this.isHost) {
      network.sendEvent('return-to-lobby', {});
    }
    this.scene.start('MultiplayerLobby', { mode: this.isHost ? 'host' : 'join' });
  }

  showHostDisconnectedModal() {
    if (this.isHostDisconnectedModalShown) return;
    this.isHostDisconnectedModalShown = true;
    audio.playExplode?.();
    const { width, height } = this.scale;

    const overlay = this.add.container(0, 0);
    overlay.setDepth(300);

    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.85);
    backdrop.fillRect(0, 0, width, height);
    overlay.add(backdrop);

    const cardW = Math.min(width - 48, 380);
    const cardH = 220;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    const card = this.add.graphics();
    card.fillStyle(0x0f172a, 0.98);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, 12);
    card.lineStyle(2, 0xef4444, 1);
    card.strokeRoundedRect(cardX, cardY, cardW, cardH, 12);
    overlay.add(card);

    overlay.add(this.add.text(width / 2, cardY + 36, '⚠️ HOST DISCONNECTED', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5));

    overlay.add(this.add.text(width / 2, cardY + 85, 'The host has ended or left the session.\nReturning to Game Select.', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      color: '#cbd5e1',
      align: 'center',
      lineSpacing: 4
    }).setOrigin(0.5));

    const btnY = cardY + cardH - 45;
    const btn = this.add.container(width / 2, btnY);
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xef4444, 1);
    btnBg.fillRoundedRect(-80, -18, 160, 36, 6);
    btn.add(btnBg);
    btn.add(this.add.text(0, 0, 'OK (MAIN MENU)', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5));

    const zone = this.add.zone(0, 0, 160, 36).setInteractive({ useHandCursor: true });
    btn.add(zone);
    const exitToMenu = () => {
      network.disconnect();
      this.scene.start('GameSelect');
    };
    zone.on('pointerdown', exitToMenu);
    overlay.add(btn);

    this.time.delayedCall(4000, exitToMenu);
  }

  // ==========================================
  // NETWORK SUBSCRIPTIONS
  // ==========================================
  setupNetwork() {
    this.unsubscribers.push(
      network.on('game-snapshot', (snapshot) => {
        this.applyClientSnapshot(snapshot);
      }),
      network.on('network-event', (packet) => {
        if (packet.event === 'return-to-lobby') {
          this.returnToLobby(false);
        } else if (packet.event === 'match-over') {
          const winner = this.tanks.get(packet.data.winnerSlot) || this.tanks.get(1);
          this.isMatchOver = true;
          this.showMatchOverModal(winner);
        }
      }),
      network.on('game-start', (packet) => {
        // Rematch triggered
        this.scene.restart({ isHost: this.isHost, seed: packet.seed });
      }),
      network.on('player-left', ({ slot }) => {
        const tank = this.tanks.get(slot);
        if (tank) {
          tank.sprite.destroy();
          tank.turret.destroy();
          tank.overhead.destroy();
          this.tanks.delete(slot);
          this.updateScoreboard();
        }
      }),
      network.on('host-disconnected', () => {
        this.showHostDisconnectedModal();
      })
    );
  }

  teardown() {
    if (this.clientMineSprites) {
      this.clientMineSprites.forEach(s => s.destroy());
      this.clientMineSprites = [];
    }
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }
}
