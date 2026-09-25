// src/scenes/MultiplayerPool.js
// 2-Player Real-Time Multiplayer Pool (Pocket Billiards) with WebRTC DataChannels
// Host-authoritative physics simulation with client prediction and smooth state synchronization

import { network } from '../systems/NetworkManager.js';
import { PoolPhysics, TABLE_CONFIG } from '../systems/PoolPhysics.js';
import { PoolRules, POOL_SUBTYPES } from '../systems/PoolRules.js';
import { audio } from '../systems/AudioManager.js';
import { storage } from '../systems/Storage.js';
import { leaderboardService } from '../systems/LeaderboardService.js';

const SceneBase = typeof Phaser !== 'undefined' ? Phaser.Scene : class {};

export class MultiplayerPoolScene extends SceneBase {
  constructor() {
    super('MultiplayerPool');
  }

  init(data) {
    this.isHost = !!data?.isHost || network.isHost;
    this.mySlot = network.mySlot || (this.isHost ? 1 : 2);
    this.subtype = data?.poolSubMode || network.gameOptions?.poolSubMode || POOL_SUBTYPES.EIGHT_BALL;

    this.physicsEngine = new PoolPhysics();
    this.rules = new PoolRules(this.subtype, true);

    this.aimAngle = -Math.PI / 2;
    this.power = 0.55;
    this.isWaitingForMotion = false;
    this.isDraggingAim = false;
    this.isDraggingPower = false;
    this.isDraggingBallInHand = false;
    this.bannerMessage = '';
    this.bannerTimer = 0;
    this.lastSnapshotSendTime = 0;
    this.unsubscribers = [];
  }

  create() {
    const { width, height } = this.scale;

    // 1. Dark Cabinet Surround Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0f1d, 0x0a0f1d, 0x111827, 0x111827, 1);
    bg.fillRect(0, 0, width, height);

    // 2. Pool Table Graphics
    this.tableGfx = this.add.graphics();
    this.drawTable();

    // 3. Ball Graphics Container
    this.ballSprites = new Map();
    this.ballsContainer = this.add.container(0, 0);

    // 4. Cue Stick and Aiming Guide Graphics
    this.guideGfx = this.add.graphics();
    this.cueGfx = this.add.graphics();

    // 5. HUD
    this.setupHUD(width, height);

    // 6. Interactive Controls
    this.setupControls(width, height);

    // 7. Setup Game State & Rack
    this.setupNewGame();

    // 8. Network Listeners
    this.setupNetwork();

    // 9. Teardown safety
    this.events.once('shutdown', () => {
      this.teardown();
    });
  }

  teardown() {
    this.input.off('pointerdown');
    this.input.off('pointermove');
    this.input.off('pointerup');
    this.unsubscribers.forEach(unsub => unsub?.());
    this.unsubscribers = [];
  }

  drawTable() {
    const gfx = this.tableGfx;
    gfx.clear();

    const { feltX, feltY, feltW, feltH, pockets } = TABLE_CONFIG;
    const woodBorder = 22;

    const woodX = feltX - woodBorder;
    const woodY = feltY - woodBorder;
    const woodW = feltW + woodBorder * 2;
    const woodH = feltH + woodBorder * 2;

    // Outer Mahogany Wood Rails
    gfx.fillStyle(0x3b1a0e, 1);
    gfx.fillRoundedRect(woodX, woodY, woodW, woodH, 16);
    gfx.lineStyle(2, 0x78350f, 0.9);
    gfx.strokeRoundedRect(woodX, woodY, woodW, woodH, 16);

    // Green Baize Felt
    gfx.fillStyle(0x0d5c34, 1);
    gfx.fillRect(feltX, feltY, feltW, feltH);

    // Cloth texture
    gfx.lineStyle(1, 0x0f6e3e, 0.35);
    for (let y = feltY; y < feltY + feltH; y += 12) {
      gfx.lineBetween(feltX, y, feltX + feltW, y);
    }

    // Markings
    const headSpotY = feltY + feltH * 0.72;
    const footSpotY = feltY + feltH * 0.28;
    const tableCenterX = feltX + feltW / 2;

    gfx.lineStyle(1, 0xffffff, 0.25);
    gfx.lineBetween(feltX + 10, headSpotY, feltX + feltW - 10, headSpotY);
    gfx.fillStyle(0xffffff, 0.4);
    gfx.fillCircle(tableCenterX, headSpotY, 3);
    gfx.fillCircle(tableCenterX, footSpotY, 3);

    // 6 Pockets
    for (const p of pockets) {
      gfx.fillStyle(0xca8a04, 1);
      gfx.fillCircle(p.x, p.y, p.r + 4);
      gfx.lineStyle(1.5, 0xfacc15, 0.8);
      gfx.strokeCircle(p.x, p.y, p.r + 4);
      gfx.fillStyle(0x020617, 1);
      gfx.fillCircle(p.x, p.y, p.r);
    }

    gfx.lineStyle(3, 0x094125, 0.85);
    gfx.strokeRect(feltX, feltY, feltW, feltH);
  }

  setupNewGame() {
    if (this.gameOverModal) {
      this.gameOverModal.destroy();
      this.gameOverModal = null;
    }
    this.physicsEngine.setupRack(this.subtype);
    this.rules = new PoolRules(this.subtype, true);
    this.aimAngle = -Math.PI / 2;
    this.power = 0.55;
    this.isWaitingForMotion = false;
    this.bannerMessage = '';

    this.refreshBallSprites();
    this.updateHUDText();
  }

  refreshBallSprites() {
    this.ballsContainer.removeAll(true);
    this.ballSprites.clear();

    const r = TABLE_CONFIG.ballRadius;

    for (const b of this.physicsEngine.balls) {
      const container = this.add.container(b.x, b.y);
      const gfx = this.add.graphics();

      if (b.isCue) {
        gfx.fillStyle(0xf8fafc, 1);
        gfx.fillCircle(0, 0, r);
        gfx.fillStyle(0xffffff, 0.7);
        gfx.fillCircle(-3, -3, 3);
        gfx.fillStyle(0xdc2626, 0.9);
        gfx.fillCircle(0, 0, 1.8);
      } else if (b.isStripe) {
        gfx.fillStyle(0xf8fafc, 1);
        gfx.fillCircle(0, 0, r);
        gfx.fillStyle(b.color, 1);
        gfx.fillRect(-r + 1, -5, (r - 1) * 2, 10);
        gfx.fillStyle(0xffffff, 0.95);
        gfx.fillCircle(0, 0, 4.5);
      } else {
        gfx.fillStyle(b.color, 1);
        gfx.fillCircle(0, 0, r);
        gfx.fillStyle(0xffffff, 0.9);
        gfx.fillCircle(0, 0, 4.5);
      }

      gfx.lineStyle(1, 0x000000, 0.35);
      gfx.strokeCircle(0, 0, r);
      container.add(gfx);

      if (!b.isCue) {
        const numText = this.add.text(0, 0, String(b.id), {
          fontFamily: 'monospace',
          fontSize: '7px',
          fontWeight: 'bold',
          color: '#09090b'
        }).setOrigin(0.5);
        container.add(numText);
      }

      this.ballsContainer.add(container);
      this.ballSprites.set(b.id, container);
    }
  }

  setupControls(width, height) {
    const { feltX, feltY, feltW, feltH } = TABLE_CONFIG;

    this.input.on('pointerdown', (pointer) => {
      if (this.isWaitingForMotion || this.rules.isGameOver || this.rules.activePlayer !== this.mySlot) return;

      const px = pointer.x;
      const py = pointer.y;

      // Power slider
      if (px >= width - 58 && px <= width - 6 && py >= 120 && py <= 660) {
        this.isDraggingPower = true;
        this.updatePowerFromPointer(py);
        return;
      }

      // Ball in hand placement
      if (this.rules.ballInHand && this.rules.activePlayer === this.mySlot) {
        if (px >= feltX && px <= feltX + feltW && py >= feltY && py <= feltY + feltH) {
          this.isDraggingBallInHand = true;
          this.physicsEngine.placeCueBall(px, py);
          this.updateBallSprites();
          if (!this.isHost) {
            network.sendEvent('pool-client-ball-in-hand', { x: px, y: py });
          }
          return;
        }
      }

      // Aiming
      if (px >= feltX - 10 && px <= feltX + feltW + 10 && py >= feltY - 10 && py <= feltY + feltH + 10) {
        this.isDraggingAim = true;
        this.updateAimFromPointer(px, py);
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (this.isWaitingForMotion || this.rules.isGameOver || this.rules.activePlayer !== this.mySlot) return;

      if (this.isDraggingPower) {
        this.updatePowerFromPointer(pointer.y);
      } else if (this.isDraggingBallInHand) {
        this.physicsEngine.placeCueBall(pointer.x, pointer.y);
        this.updateBallSprites();
        if (!this.isHost) {
          network.sendEvent('pool-client-ball-in-hand', { x: pointer.x, y: pointer.y });
        }
      } else if (this.isDraggingAim) {
        this.updateAimFromPointer(pointer.x, pointer.y);
      }
    });

    this.input.on('pointerup', () => {
      this.isDraggingAim = false;
      this.isDraggingPower = false;
      this.isDraggingBallInHand = false;
    });

    // Stepper buttons
    const btnY = height - 52;

    const stepL = this.add.container(60, btnY);
    const bgL = this.add.graphics();
    bgL.fillStyle(0x1e293b, 1);
    bgL.fillRoundedRect(-24, -18, 48, 36, 8);
    bgL.lineStyle(1.5, 0x475569, 1);
    bgL.strokeRoundedRect(-24, -18, 48, 36, 8);
    stepL.add(bgL);
    stepL.add(this.add.text(0, 0, '◀', { fontSize: '16px', color: '#38bdf8' }).setOrigin(0.5));
    const hitL = this.add.zone(0, 0, 48, 36).setInteractive({ useHandCursor: true });
    stepL.add(hitL);
    hitL.on('pointerdown', () => {
      if (this.rules.activePlayer === this.mySlot && !this.isWaitingForMotion) {
        audio.playBounce?.();
        this.aimAngle -= (0.8 * Math.PI) / 180;
      }
    });

    const stepR = this.add.container(118, btnY);
    const bgR = this.add.graphics();
    bgR.fillStyle(0x1e293b, 1);
    bgR.fillRoundedRect(-24, -18, 48, 36, 8);
    bgR.lineStyle(1.5, 0x475569, 1);
    bgR.strokeRoundedRect(-24, -18, 48, 36, 8);
    stepR.add(bgR);
    stepR.add(this.add.text(0, 0, '▶', { fontSize: '16px', color: '#38bdf8' }).setOrigin(0.5));
    const hitR = this.add.zone(0, 0, 48, 36).setInteractive({ useHandCursor: true });
    stepR.add(hitR);
    hitR.on('pointerdown', () => {
      if (this.rules.activePlayer === this.mySlot && !this.isWaitingForMotion) {
        audio.playBounce?.();
        this.aimAngle += (0.8 * Math.PI) / 180;
      }
    });

    // STRIKE Button
    const strikeBtn = this.add.container(width / 2 + 10, btnY);
    this.strikeBg = this.add.graphics();
    this.updateStrikeButtonVisuals();
    strikeBtn.add(this.strikeBg);

    this.strikeText = this.add.text(0, 0, 'STRIKE ▶', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      fontWeight: '900',
      color: '#ffffff',
      letterSpacing: 1
    }).setOrigin(0.5);
    strikeBtn.add(this.strikeText);

    const strikeHit = this.add.zone(0, 0, 130, 36).setInteractive({ useHandCursor: true });
    strikeBtn.add(strikeHit);
    strikeHit.on('pointerdown', () => {
      this.executeMyShot();
    });

    // Power Meter
    this.powerGfx = this.add.graphics();
    this.drawPowerMeter();
  }

  updateStrikeButtonVisuals() {
    if (!this.strikeBg) return;
    this.strikeBg.clear();
    const isMyTurn = this.rules.activePlayer === this.mySlot && !this.isWaitingForMotion && !this.rules.isGameOver;
    if (isMyTurn) {
      this.strikeBg.fillStyle(0x16a34a, 1);
      this.strikeBg.fillRoundedRect(-65, -18, 130, 36, 8);
      this.strikeBg.lineStyle(1.5, 0x4ade80, 1);
      this.strikeBg.strokeRoundedRect(-65, -18, 130, 36, 8);
    } else {
      this.strikeBg.fillStyle(0x334155, 0.7);
      this.strikeBg.fillRoundedRect(-65, -18, 130, 36, 8);
      this.strikeBg.lineStyle(1.5, 0x475569, 0.8);
      this.strikeBg.strokeRoundedRect(-65, -18, 130, 36, 8);
    }
  }

  updatePowerFromPointer(pointerY) {
    const minY = 160;
    const maxY = 640;
    const clampedY = Math.max(minY, Math.min(maxY, pointerY));
    this.power = Math.max(0.1, Math.min(1.0, (clampedY - minY) / (maxY - minY)));
    this.drawPowerMeter();
  }

  drawPowerMeter() {
    const gfx = this.powerGfx;
    gfx.clear();

    const sliderX = this.scale.width - 24;
    const sliderY = 160;
    const sliderH = 480;
    const sliderW = 14;

    gfx.fillStyle(0x0f172a, 0.9);
    gfx.fillRoundedRect(sliderX - sliderW / 2, sliderY, sliderW, sliderH, 6);
    gfx.lineStyle(1.5, 0x475569, 0.8);
    gfx.strokeRoundedRect(sliderX - sliderW / 2, sliderY, sliderW, sliderH, 6);

    const fillH = sliderH * this.power;
    const fillY = sliderY + (sliderH - fillH);
    const color = this.power > 0.8 ? 0xef4444 : (this.power > 0.5 ? 0xfacc15 : 0x22c55e);

    gfx.fillStyle(color, 1);
    gfx.fillRoundedRect(sliderX - sliderW / 2 + 2, fillY, sliderW - 4, fillH, 4);

    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(sliderX, fillY, 9);
    gfx.lineStyle(1.5, 0x38bdf8, 1);
    gfx.strokeCircle(sliderX, fillY, 9);
  }

  updateAimFromPointer(px, py) {
    const cue = this.physicsEngine.cueBall;
    if (!cue || cue.inPocket) return;

    const dx = px - cue.x;
    const dy = py - cue.y;
    if (Math.hypot(dx, dy) > 8) {
      this.aimAngle = Math.atan2(dy, dx);
    }
  }

  setupHUD(width, height) {
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x0f172a, 0.95);
    headerBg.fillRect(0, 0, width, 68);
    headerBg.lineStyle(2, 0x38bdf8, 0.8);
    headerBg.lineBetween(0, 68, width, 68);

    // < LOBBY Button
    const backBtn = this.add.container(20, 34);
    const backBg = this.add.graphics();
    backBg.fillStyle(0x1e293b, 1);
    backBg.fillRoundedRect(0, -18, 68, 36, 8);
    backBg.lineStyle(1.5, 0x64748b, 1);
    backBg.strokeRoundedRect(0, -18, 68, 36, 8);
    backBtn.add(backBg);

    const backText = this.add.text(34, 0, '< LOBBY', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#cbd5e1'
    }).setOrigin(0.5);
    backBtn.add(backText);

    const backZone = this.add.zone(34, 0, 68, 36).setInteractive({ useHandCursor: true });
    backBtn.add(backZone);
    backZone.on('pointerdown', () => {
      audio.playShoot?.();
      network.disconnect();
      this.scene.start('MultiplayerLobby', { returnScene: 'GameSelect' });
    });

    this.titleText = this.add.text(width / 2 + 10, 22, `🎱 MULTIPLAYER POOL (${this.subtype.toUpperCase()})`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: '900',
      color: '#facc15',
      letterSpacing: 1
    }).setOrigin(0.5);

    this.turnText = this.add.text(width / 2 + 10, 42, '', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5);

    this.bannerText = this.add.text(width / 2, 78, '', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#facc15'
    }).setOrigin(0.5);
  }

  updateHUDText() {
    if (!this.turnText) return;
    const isMyTurn = this.rules.activePlayer === this.mySlot;
    const p1Profile = network.getPlayer(1) || { tag: 'P1' };
    const p2Profile = network.getPlayer(2) || { tag: 'P2' };

    let turnStr = '';
    if (this.rules.subtype === POOL_SUBTYPES.EIGHT_BALL) {
      const g1 = this.rules.groups[1] ? ` (${this.rules.groups[1].slice(0, 3).toUpperCase()})` : '';
      const g2 = this.rules.groups[2] ? ` (${this.rules.groups[2].slice(0, 3).toUpperCase()})` : '';
      turnStr = `${p1Profile.tag}${g1}: ${this.rules.scores[1]}  vs  ${p2Profile.tag}${g2}: ${this.rules.scores[2]}`;
    } else {
      turnStr = `${p1Profile.tag}: ${this.rules.scores[1]}  vs  ${p2Profile.tag}: ${this.rules.scores[2]}`;
    }

    if (isMyTurn) {
      this.turnText.setText(`YOUR TURN! • ${turnStr}`);
      this.turnText.setColor('#38bdf8');
    } else {
      this.turnText.setText(`OPPONENT'S TURN... • ${turnStr}`);
      this.turnText.setColor('#f97316');
    }

    this.updateStrikeButtonVisuals();
  }

  setBanner(msg, durationMs = 2500) {
    this.bannerMessage = msg;
    this.bannerText.setText(msg);
    this.bannerTimer = durationMs;
  }

  setupNetwork() {
    // 1. Client receives Host snapshots and network events
    if (!this.isHost) {
      const unSnapshot = network.on('game-snapshot', (snapshot) => {
        if (snapshot && snapshot.balls) {
          this.physicsEngine.applySnapshot(snapshot.balls);
          this.updateBallSprites();
        }
      });
      const unEvent = network.on('network-event', (packet) => {
        if (packet.event === 'pool-turn-handoff') {
          this.onTurnHandoffReceived(packet.data);
        } else if (packet.event === 'pool-match-over') {
          this.onMatchOverReceived(packet.data);
        } else if (packet.event === 'pool-rematch') {
          this.setupNewGame();
        }
      });
      this.unsubscribers.push(unSnapshot, unEvent);
    }

    // 2. Host receives Client shots, ball-in-hand, and rematch requests
    if (this.isHost) {
      const unClientEvent = network.on('network-event', (packet) => {
        if (packet.slot === 2) {
          if (packet.event === 'pool-client-shot') {
            if (this.rules.activePlayer === 2 && !this.isWaitingForMotion && !this.rules.isGameOver) {
              const angle = Number.isFinite(packet.data?.angle) ? packet.data.angle : 0;
              const power = Number.isFinite(packet.data?.power) ? Math.max(0.05, Math.min(1.0, packet.data.power)) : 0.5;
              this.executeRemoteShot(angle, power);
            }
          } else if (packet.event === 'pool-client-ball-in-hand') {
            if (this.rules.activePlayer === 2 && this.rules.ballInHand && !this.isWaitingForMotion && !this.rules.isGameOver) {
              const x = Number.isFinite(packet.data?.x) ? packet.data.x : 0;
              const y = Number.isFinite(packet.data?.y) ? packet.data.y : 0;
              this.physicsEngine.placeCueBall(x, y);
              this.updateBallSprites();
            }
          } else if (packet.event === 'pool-client-rematch') {
            if (this.rules.isGameOver) {
              network.sendEvent('pool-rematch', { poolSubMode: this.subtype });
              this.setupNewGame();
            }
          }
        }
      });
      this.unsubscribers.push(unClientEvent);
    }

    // 3. Rematch synchronization via game-start
    const unGameStart = network.on('game-start', (options) => {
      this.setupNewGame();
    });
    this.unsubscribers.push(unGameStart);

    // 4. Disconnect handling
    const unPeerDisconnect = network.on('player-left', ({ slot }) => {
      this.showDisconnectDialog();
    });
    this.unsubscribers.push(unPeerDisconnect);
  }

  executeMyShot() {
    if (this.isWaitingForMotion || this.rules.isGameOver || this.rules.activePlayer !== this.mySlot) return;

    audio.playCueStrike(this.power);

    if (this.isHost) {
      this.physicsEngine.strikeCueBall(this.aimAngle, this.power);
      this.isWaitingForMotion = true;
      this.rules.ballInHand = false;
    } else {
      // Send shot to host
      network.sendEvent('pool-client-shot', {
        angle: this.aimAngle,
        power: this.power
      });
      this.isWaitingForMotion = true;
      this.rules.ballInHand = false;
    }
    this.updateHUDText();
  }

  executeRemoteShot(angle, power) {
    if (!this.isHost || this.isWaitingForMotion || this.rules.isGameOver || this.rules.activePlayer !== 2) return;
    if (!Number.isFinite(angle) || !Number.isFinite(power)) return;
    const clampedPower = Math.max(0.05, Math.min(1.0, power));
    audio.playCueStrike(clampedPower);
    this.physicsEngine.strikeCueBall(angle, clampedPower);
    this.isWaitingForMotion = true;
    this.rules.ballInHand = false;
    this.updateHUDText();
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);

    if (this.bannerTimer > 0) {
      this.bannerTimer -= delta;
      if (this.bannerTimer <= 0) {
        this.bannerText.setText('');
      }
    }

    // Host simulates physics and broadcasts snapshot at 25 Hz
    if (this.isHost) {
      if (this.physicsEngine.isMoving()) {
        this.physicsEngine.step(dt);
        this.handlePhysicsSoundEvents();
        this.updateBallSprites();

        if (time - this.lastSnapshotSendTime >= 40) {
          this.lastSnapshotSendTime = time;
          network.broadcastSnapshot({ balls: this.physicsEngine.getSnapshot() });
        }
      } else if (this.isWaitingForMotion) {
        this.isWaitingForMotion = false;
        this.onHostBallsSettled();
      }
    }

    this.renderAimingAndCue();
  }

  handlePhysicsSoundEvents() {
    const events = this.physicsEngine.events;
    for (const c of events.ballCollisions) {
      audio.playBallHit(Math.min(1.0, c.impactSpeed / 300));
    }
    events.ballCollisions = [];

    for (const ch of events.cushionHits) {
      audio.playRailCushion(Math.min(1.0, ch.speed / 300));
    }
    events.cushionHits = [];

    for (const p of events.potted) {
      audio.playPocketDrop();
    }
  }

  updateBallSprites() {
    for (const b of this.physicsEngine.balls) {
      const sprite = this.ballSprites.get(b.id);
      if (sprite) {
        sprite.setPosition(b.x, b.y);
        sprite.setVisible(!b.inPocket);
      }
    }
  }

  renderAimingAndCue() {
    this.guideGfx.clear();
    this.cueGfx.clear();

    if (this.isWaitingForMotion || this.rules.isGameOver || this.rules.activePlayer !== this.mySlot) return;

    const cue = this.physicsEngine.cueBall;
    if (!cue || cue.inPocket) return;

    const { ballRadius } = TABLE_CONFIG;
    const maxRayDist = 450;
    const rayCos = Math.cos(this.aimAngle);
    const raySin = Math.sin(this.aimAngle);

    let hitDist = maxRayDist;
    let hitBall = null;

    for (const b of this.physicsEngine.activeObjectBalls) {
      const bx = b.x - cue.x;
      const by = b.y - cue.y;
      const proj = bx * rayCos + by * raySin;
      if (proj > ballRadius && proj < hitDist) {
        const perpSq = (bx * bx + by * by) - (proj * proj);
        const touchDist = ballRadius * 2;
        if (perpSq < touchDist * touchDist) {
          const d = proj - Math.sqrt(touchDist * touchDist - perpSq);
          if (d < hitDist) {
            hitDist = d;
            hitBall = b;
          }
        }
      }
    }

    const hitX = cue.x + rayCos * hitDist;
    const hitY = cue.y + raySin * hitDist;

    this.guideGfx.lineStyle(1.5, 0xffffff, 0.65);
    this.guideGfx.lineBetween(cue.x, cue.y, hitX, hitY);

    this.guideGfx.lineStyle(1.5, 0x38bdf8, 0.9);
    this.guideGfx.strokeCircle(hitX, hitY, ballRadius);

    if (hitBall) {
      const defX = hitBall.x - hitX;
      const defY = hitBall.y - hitY;
      const defDist = Math.hypot(defX, defY) || 1;
      this.guideGfx.lineStyle(1.5, 0xfacc15, 0.85);
      this.guideGfx.lineBetween(hitBall.x, hitBall.y, hitBall.x + (defX / defDist) * 70, hitBall.y + (defY / defDist) * 70);
    }

    const cueStickLength = 160;
    const pullback = this.power * 40;
    const cueStartX = cue.x - rayCos * (ballRadius + 4 + pullback);
    const cueStartY = cue.y - raySin * (ballRadius + 4 + pullback);
    const cueEndX = cue.x - rayCos * (ballRadius + 4 + pullback + cueStickLength);
    const cueEndY = cue.y - raySin * (ballRadius + 4 + pullback + cueStickLength);

    this.cueGfx.lineStyle(4, 0xb45309, 1);
    this.cueGfx.lineBetween(cueStartX, cueStartY, cueEndX, cueEndY);

    this.cueGfx.lineStyle(4, 0x38bdf8, 1);
    this.cueGfx.lineBetween(cueStartX, cueStartY, cueStartX - rayCos * 6, cueStartY - raySin * 6);
  }

  onHostBallsSettled() {
    const result = this.rules.evaluateShot(this.physicsEngine);

    if (result.isFoul) {
      audio.playPoolFoul();
      this.setBanner(result.foulReason || 'FOUL!');
    } else if (result.ballsPottedCount > 0) {
      this.setBanner(`POTTED ${result.ballsPottedCount} BALL${result.ballsPottedCount > 1 ? 'S' : ''}!`);
    }

    if (this.physicsEngine.cueBall.inPocket) {
      const { feltX, feltY, feltW, feltH } = TABLE_CONFIG;
      this.physicsEngine.placeCueBall(feltX + feltW / 2, feltY + feltH * 0.72);
      this.rules.ballInHand = true;
    }

    this.updateBallSprites();
    this.updateHUDText();

    // Broadcast settled snapshot to client so cue ball and balls are in sync immediately
    network.broadcastSnapshot({ balls: this.physicsEngine.getSnapshot() });

    if (this.rules.isGameOver) {
      network.sendEvent('pool-match-over', {
        winner: this.rules.winner,
        winReason: this.rules.winReason,
        scores: this.rules.scores
      });
      this.showGameOverModal(this.rules.winner, this.rules.winReason, this.rules.scores);
      return;
    }

    // Broadcast turn handoff to client
    network.sendEvent('pool-turn-handoff', {
      activePlayer: this.rules.activePlayer,
      scores: this.rules.scores,
      groups: this.rules.groups,
      ballInHand: this.rules.ballInHand,
      foulReason: result.foulReason
    });
  }

  onTurnHandoffReceived(payload) {
    this.rules.activePlayer = payload.activePlayer;
    this.rules.scores = payload.scores;
    this.rules.groups = payload.groups;
    this.rules.ballInHand = payload.ballInHand;
    this.isWaitingForMotion = false;
    this.updateBallSprites();

    if (payload.foulReason) {
      audio.playPoolFoul();
      this.setBanner(payload.foulReason);
    }

    this.updateHUDText();
  }

  onMatchOverReceived(payload) {
    this.rules.isGameOver = true;
    this.rules.winner = payload.winner;
    this.rules.winReason = payload.winReason;
    this.rules.scores = payload.scores;
    this.showGameOverModal(payload.winner, payload.winReason, payload.scores);
  }

  showGameOverModal(winnerSlot, winReason, scores) {
    const { width, height } = this.scale;
    const isWinner = winnerSlot === this.mySlot;
    const finalScore = scores[this.mySlot] || 0;

    // Leaderboard score submission with multiplayer PvP badge (⚔️ MP PvP)
    const profile = storage.getPlayerProfile ? storage.getPlayerProfile() : { tag: 'ALL', name: '' };
    if (finalScore > 0) {
      leaderboardService.submitScore(
        `pool_${this.subtype}`,
        finalScore,
        `⚔️ MP PvP ${winReason}`,
        profile.name
      );
    }

    const modal = this.add.container(width / 2, height / 2);
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.88);
    backdrop.fillRect(-width / 2, -height / 2, width, height);
    backdrop.setInteractive();
    modal.add(backdrop);

    const cardW = 380;
    const cardH = 340;
    const card = this.add.graphics();
    card.fillStyle(0x0f172a, 0.98);
    card.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    card.lineStyle(2, isWinner ? 0xfacc15 : 0xef4444, 0.9);
    card.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    modal.add(card);

    modal.add(this.add.text(0, -110, isWinner ? '👑 YOU WIN! 👑' : 'DEFEAT!', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '26px',
      fontWeight: '900',
      color: isWinner ? '#facc15' : '#ef4444'
    }).setOrigin(0.5));

    modal.add(this.add.text(0, -60, winReason, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: '600',
      align: 'center',
      color: '#cbd5e1',
      wordWrap: { width: 340 }
    }).setOrigin(0.5));

    modal.add(this.add.text(0, 0, `P1: ${scores[1]}  vs  P2: ${scores[2]}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5));

    // Rematch Button
    const rematchBtn = this.add.container(-85, 75);
    const rmBg = this.add.graphics();
    rmBg.fillStyle(0x16a34a, 1);
    rmBg.fillRoundedRect(-70, -20, 140, 40, 8);
    rmBg.lineStyle(1.5, 0x4ade80, 1);
    rmBg.strokeRoundedRect(-70, -20, 140, 40, 8);
    rematchBtn.add(rmBg);
    rematchBtn.add(this.add.text(0, 0, 'REMATCH 🔄', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5));
    const rmHit = this.add.zone(0, 0, 140, 40).setInteractive({ useHandCursor: true });
    rematchBtn.add(rmHit);
    rmHit.on('pointerdown', () => {
      audio.playShoot?.();
      if (this.gameOverModal) {
        this.gameOverModal.destroy();
        this.gameOverModal = null;
      }
      if (this.isHost) {
        network.sendEvent('pool-rematch', { poolSubMode: this.subtype });
        this.setupNewGame();
      } else {
        network.sendEvent('pool-client-rematch', {});
      }
    });
    modal.add(rematchBtn);

    // Return to Lobby
    const lobbyBtn = this.add.container(85, 75);
    const lbBg = this.add.graphics();
    lbBg.fillStyle(0x0284c7, 1);
    lbBg.fillRoundedRect(-70, -20, 140, 40, 8);
    lbBg.lineStyle(1.5, 0x38bdf8, 1);
    lbBg.strokeRoundedRect(-70, -20, 140, 40, 8);
    lobbyBtn.add(lbBg);
    lobbyBtn.add(this.add.text(0, 0, 'LOBBY 🌐', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5));
    const lbHit = this.add.zone(0, 0, 140, 40).setInteractive({ useHandCursor: true });
    lobbyBtn.add(lbHit);
    lbHit.on('pointerdown', () => {
      network.disconnect();
      this.scene.start('MultiplayerLobby', { returnScene: 'GameSelect' });
    });
    modal.add(lobbyBtn);
  }

  showDisconnectDialog() {
    const { width, height } = this.scale;
    const modal = this.add.container(width / 2, height / 2);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRect(-width / 2, -height / 2, width, height);
    bg.setInteractive();
    modal.add(bg);

    const card = this.add.graphics();
    card.fillStyle(0x0f172a, 0.98);
    card.fillRoundedRect(-170, -100, 340, 200, 14);
    card.lineStyle(2, 0xef4444, 1);
    card.strokeRoundedRect(-170, -100, 340, 200, 14);
    modal.add(card);

    modal.add(this.add.text(0, -50, 'CONNECTION LOST', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '18px',
      fontWeight: '900',
      color: '#ef4444'
    }).setOrigin(0.5));

    modal.add(this.add.text(0, -15, 'Opponent disconnected from the match.', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      color: '#cbd5e1'
    }).setOrigin(0.5));

    const btn = this.add.container(0, 45);
    const bBg = this.add.graphics();
    bBg.fillStyle(0x334155, 1);
    bBg.fillRoundedRect(-70, -18, 140, 36, 8);
    btn.add(bBg);
    btn.add(this.add.text(0, 0, 'BACK TO HUB', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5));
    const hit = this.add.zone(0, 0, 140, 36).setInteractive({ useHandCursor: true });
    btn.add(hit);
    hit.on('pointerdown', () => {
      network.disconnect();
      this.scene.start('GameSelect');
    });
    modal.add(btn);
  }
}
