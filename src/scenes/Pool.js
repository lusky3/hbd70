// src/scenes/Pool.js
// Classic Retro Pocket Billiards / Pool Arcade Scene for Allan's 70th Birthday Retro Collection
// Supports 8-Ball, 9-Ball, Straight Pool, and Speed Pool with 4-tier VS CPU AI and Cloudflare D1 Leaderboards

import { PoolPhysics, TABLE_CONFIG, BALL_COLORS } from '../systems/PoolPhysics.js';
import { PoolRules, POOL_SUBTYPES } from '../systems/PoolRules.js';
import { PoolAI, AI_DIFFICULTIES, AI_CONFIGS } from '../systems/PoolAI.js';
import { audio } from '../systems/AudioManager.js';
import { storage } from '../systems/Storage.js';
import { leaderboardService } from '../systems/LeaderboardService.js';

const SceneBase = typeof Phaser !== 'undefined' ? Phaser.Scene : class {};

export class PoolScene extends SceneBase {
  constructor() {
    super('Pool');
  }

  init(data) {
    this.resumeData = data?.resumeSession || null;
    this.subtype = this.resumeData?.subtype || data?.subtype || POOL_SUBTYPES.EIGHT_BALL;
    this.difficulty = this.resumeData?.difficulty || data?.difficulty || AI_DIFFICULTIES.REGULAR;
    this.returnScene = data?.returnScene || 'GameSelect';

    this.physicsEngine = new PoolPhysics();
    this.rules = new PoolRules(this.subtype);
    this.ai = new PoolAI(this.difficulty);

    this.aimAngle = this.resumeData?.aimAngle !== undefined ? this.resumeData.aimAngle : -Math.PI / 2;
    this.power = this.resumeData?.power !== undefined ? this.resumeData.power : 0.55;
    this.isDraggingAim = false;
    this.isDraggingPower = false;
    this.isDraggingBallInHand = false;
    this.isWaitingForMotion = false;
    this.isAiTurn = false;
    this.showMenuOverlay = false;

    // Shot audit for feedback
    this.bannerMessage = '';
    this.bannerTimer = 0;
  }

  create() {
    const { width, height } = this.scale;

    // 1. Dark Cabinet Surround Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0f1d, 0x0a0f1d, 0x111827, 0x111827, 1);
    bg.fillRect(0, 0, width, height);

    // 2. Draw Pool Table (Cushions, Felt, Pockets, Markings)
    this.tableGfx = this.add.graphics();
    this.drawTable();

    // 3. Ball Graphics Container
    this.ballSprites = new Map();
    this.ballsContainer = this.add.container(0, 0);

    // 4. Cue Stick and Aiming Guide Graphics
    this.guideGfx = this.add.graphics();
    this.cueGfx = this.add.graphics();

    // 5. Top Header & HUD
    this.setupHUD(width, height);

    // 6. Setup Interactive Input (Aiming, Power, Stepper Buttons, Ball-In-Hand)
    this.setupControls(width, height);

    // 7. Setup Game State & Rack (or restore saved session)
    if (this.resumeData && this.resumeData.balls && this.resumeData.rules) {
      this.restoreSavedGame(this.resumeData);
    } else {
      this.setupNewGame(this.subtype, this.difficulty);
    }

    // 8. Mode & Difficulty Selector Dialog
    this.setupModeSelectorModal(width, height);

    // 9. Teardown safety
    this.events.once('shutdown', () => {
      this.teardown();
    });
  }

  teardown() {
    this.input.off('pointerdown');
    this.input.off('pointermove');
    this.input.off('pointerup');
  }

  drawTable() {
    const gfx = this.tableGfx;
    gfx.clear();

    const { feltX, feltY, feltW, feltH, pockets } = TABLE_CONFIG;
    const woodBorder = 22;

    // 1. Outer Mahogany Wood Rails
    const woodX = feltX - woodBorder;
    const woodY = feltY - woodBorder;
    const woodW = feltW + woodBorder * 2;
    const woodH = feltH + woodBorder * 2;

    gfx.fillStyle(0x3b1a0e, 1);
    gfx.fillRoundedRect(woodX, woodY, woodW, woodH, 16);
    gfx.lineStyle(2, 0x78350f, 0.9);
    gfx.strokeRoundedRect(woodX, woodY, woodW, woodH, 16);

    // Inset wood shadow
    gfx.fillStyle(0x271008, 1);
    gfx.fillRoundedRect(woodX + 4, woodY + 4, woodW - 8, woodH - 8, 12);

    // 2. Green Baize Felt
    gfx.fillStyle(0x0d5c34, 1);
    gfx.fillRect(feltX, feltY, feltW, feltH);

    // Subtle felt cloth texture lines
    gfx.lineStyle(1, 0x0f6e3e, 0.35);
    for (let y = feltY; y < feltY + feltH; y += 12) {
      gfx.lineBetween(feltX, y, feltX + feltW, y);
    }

    // 3. Table Markings
    // Head string line
    const headSpotY = feltY + feltH * 0.72;
    const footSpotY = feltY + feltH * 0.28;
    const tableCenterX = feltX + feltW / 2;

    gfx.lineStyle(1, 0xffffff, 0.25);
    gfx.lineBetween(feltX + 10, headSpotY, feltX + feltW - 10, headSpotY);

    // Head Spot and Foot Spot
    gfx.fillStyle(0xffffff, 0.4);
    gfx.fillCircle(tableCenterX, headSpotY, 3);
    gfx.fillCircle(tableCenterX, footSpotY, 3);

    // 4. Six Pockets (Brass Castings & Dark Hole Depths)
    for (const p of pockets) {
      // Brass rim
      gfx.fillStyle(0xca8a04, 1);
      gfx.fillCircle(p.x, p.y, p.r + 4);
      gfx.lineStyle(1.5, 0xfacc15, 0.8);
      gfx.strokeCircle(p.x, p.y, p.r + 4);

      // Deep dark pocket interior
      gfx.fillStyle(0x020617, 1);
      gfx.fillCircle(p.x, p.y, p.r);
    }

    // 5. Cushion Rail Edges
    gfx.lineStyle(3, 0x094125, 0.85);
    gfx.strokeRect(feltX, feltY, feltW, feltH);
  }

  setupNewGame(subtype = this.subtype, difficulty = this.difficulty) {
    this.subtype = subtype;
    this.difficulty = difficulty;
    storage.clearGameSession('pool');
    this.physicsEngine.setupRack(subtype);
    this.rules = new PoolRules(subtype);
    this.ai.setDifficulty(difficulty);

    this.aimAngle = -Math.PI / 2;
    this.power = 0.55;
    this.isWaitingForMotion = false;
    this.isAiTurn = false;
    this.bannerMessage = '';

    this.refreshBallSprites();
    this.updateHUDText();
  }

  restoreSavedGame(savedData) {
    this.subtype = savedData.subtype || this.subtype;
    this.difficulty = savedData.difficulty || this.difficulty;
    this.physicsEngine.setupRack(this.subtype);
    this.physicsEngine.loadSnapshot(savedData.balls);
    this.rules = new PoolRules(this.subtype);
    this.rules.loadSnapshot(savedData.rules);
    this.ai.setDifficulty(this.difficulty);

    this.aimAngle = savedData.aimAngle !== undefined ? savedData.aimAngle : -Math.PI / 2;
    this.power = savedData.power !== undefined ? savedData.power : 0.55;
    this.isWaitingForMotion = false;
    this.bannerMessage = 'RESUMED SESSION';
    this.bannerTimer = 2.0;

    this.refreshBallSprites();
    this.updateBallSprites();
    this.updateHUDText();

    if (this.rules.activePlayer === 2 && !this.rules.isGameOver) {
      this.isAiTurn = true;
      this.time.delayedCall(800, () => {
        this.executeAiShot();
      });
    } else {
      this.isAiTurn = false;
    }
  }

  refreshBallSprites() {
    this.ballsContainer.removeAll(true);
    this.ballSprites.clear();

    const r = TABLE_CONFIG.ballRadius;

    for (const b of this.physicsEngine.balls) {
      const container = this.add.container(b.x, b.y);
      const gfx = this.add.graphics();

      // Ball base color
      if (b.isCue) {
        // Pure White Cue Ball with Gloss
        gfx.fillStyle(0xf8fafc, 1);
        gfx.fillCircle(0, 0, r);
        // Shiny specular highlight
        gfx.fillStyle(0xffffff, 0.7);
        gfx.fillCircle(-3, -3, 3);
        // Small Allan Lucky Red Dot
        gfx.fillStyle(0xdc2626, 0.9);
        gfx.fillCircle(0, 0, 1.8);
      } else if (b.isStripe) {
        // Striped Ball: White body with colored central band
        gfx.fillStyle(0xf8fafc, 1);
        gfx.fillCircle(0, 0, r);
        // Stripe band
        gfx.fillStyle(b.color, 1);
        gfx.fillRect(-r + 1, -5, (r - 1) * 2, 10);
        // White number circle
        gfx.fillStyle(0xffffff, 0.95);
        gfx.fillCircle(0, 0, 4.5);
      } else {
        // Solid Ball: Full colored body with white number circle
        gfx.fillStyle(b.color, 1);
        gfx.fillCircle(0, 0, r);
        // White number circle
        gfx.fillStyle(0xffffff, 0.9);
        gfx.fillCircle(0, 0, 4.5);
      }

      // Specular 3D spherical shading
      gfx.lineStyle(1, 0x000000, 0.35);
      gfx.strokeCircle(0, 0, r);

      container.add(gfx);

      // Number text (for object balls 1-15)
      if (!b.isCue) {
        const numText = this.add.text(0, 0, String(b.id), {
          fontFamily: 'monospace',
          fontSize: '7px',
          fontWeight: 'bold',
          color: '#09090b'
        }).setOrigin(0.5);
        container.add(numText);
      }

      container.setVisible(!b.inPocket);
      this.ballsContainer.add(container);
      this.ballSprites.set(b.id, container);
    }
  }

  setupControls(width, height) {
    const { feltX, feltY, feltW, feltH } = TABLE_CONFIG;

    // 1. Table Touch Drag Aiming & Ball-In-Hand Movement
    this.input.on('pointerdown', (pointer) => {
      if (this.isWaitingForMotion || this.isAiTurn || this.rules.isGameOver) return;

      const px = pointer.x;
      const py = pointer.y;

      // Check if touching power slider on right edge
      if (px >= width - 58 && px <= width - 6 && py >= 120 && py <= 660) {
        this.isDraggingPower = true;
        this.updatePowerFromPointer(py);
        return;
      }

      // Check if Ball-in-Hand is active and pointer is on table
      if (this.rules.ballInHand && this.rules.activePlayer === 1) {
        if (px >= feltX && px <= feltX + feltW && py >= feltY && py <= feltY + feltH) {
          this.isDraggingBallInHand = true;
          this.physicsEngine.placeCueBall(px, py);
          this.updateBallSprites();
          return;
        }
      }

      // Otherwise, dragging on felt rotates aim angle
      if (px >= feltX - 10 && px <= feltX + feltW + 10 && py >= feltY - 10 && py <= feltY + feltH + 10) {
        this.isDraggingAim = true;
        this.updateAimFromPointer(px, py);
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (this.isWaitingForMotion || this.isAiTurn || this.rules.isGameOver) return;

      if (this.isDraggingPower) {
        this.updatePowerFromPointer(pointer.y);
      } else if (this.isDraggingBallInHand) {
        this.physicsEngine.placeCueBall(pointer.x, pointer.y);
        this.updateBallSprites();
      } else if (this.isDraggingAim) {
        this.updateAimFromPointer(pointer.x, pointer.y);
      }
    });

    this.input.on('pointerup', () => {
      this.isDraggingAim = false;
      this.isDraggingPower = false;
      this.isDraggingBallInHand = false;
    });

    // 2. Fine-Tune Stepper Buttons (◀ and ▶ on bottom left)
    const btnY = height - 52;

    // Left Stepper (◀)
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
      audio.playBounce?.();
      this.aimAngle -= (0.8 * Math.PI) / 180;
    });

    // Right Stepper (▶)
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
      audio.playBounce?.();
      this.aimAngle += (0.8 * Math.PI) / 180;
    });

    // 3. Primary STRIKE / SHOOT Button (Center)
    const strikeBtn = this.add.container(width / 2 + 10, btnY);
    const strikeBg = this.add.graphics();
    strikeBg.fillStyle(0x16a34a, 1);
    strikeBg.fillRoundedRect(-65, -18, 130, 36, 8);
    strikeBg.lineStyle(1.5, 0x4ade80, 1);
    strikeBg.strokeRoundedRect(-65, -18, 130, 36, 8);
    strikeBtn.add(strikeBg);

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
      this.executeHumanShot();
    });

    // 4. Power Meter Graphic on Right Edge
    this.powerGfx = this.add.graphics();
    this.drawPowerMeter();
  }

  updatePowerFromPointer(pointerY) {
    const minY = 160;
    const maxY = 640;
    const clampedY = Math.max(minY, Math.min(maxY, pointerY));
    // Pull back downwards: maxY = 1.0 (100% power), minY = 0.1 (10% power)
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

    // Track background
    gfx.fillStyle(0x0f172a, 0.9);
    gfx.fillRoundedRect(sliderX - sliderW / 2, sliderY, sliderW, sliderH, 6);
    gfx.lineStyle(1.5, 0x475569, 0.8);
    gfx.strokeRoundedRect(sliderX - sliderW / 2, sliderY, sliderW, sliderH, 6);

    // Active power fill
    const fillH = sliderH * this.power;
    const fillY = sliderY + (sliderH - fillH);
    const color = this.power > 0.8 ? 0xef4444 : (this.power > 0.5 ? 0xfacc15 : 0x22c55e);

    gfx.fillStyle(color, 1);
    gfx.fillRoundedRect(sliderX - sliderW / 2 + 2, fillY, sliderW - 4, fillH, 4);

    // Handle knob
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(sliderX, fillY, 9);
    gfx.lineStyle(1.5, 0x38bdf8, 1);
    gfx.strokeCircle(sliderX, fillY, 9);
  }

  updateAimFromPointer(px, py) {
    const cue = this.physicsEngine.cueBall;
    if (!cue || cue.inPocket) return;

    // Calculate angle from cue ball towards pointer
    const dx = px - cue.x;
    const dy = py - cue.y;
    if (Math.hypot(dx, dy) > 8) {
      this.aimAngle = Math.atan2(dy, dx);
    }
  }

  setupHUD(width, height) {
    // Top Bar Background
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x0f172a, 0.95);
    headerBg.fillRect(0, 0, width, 68);
    headerBg.lineStyle(2, 0x38bdf8, 0.8);
    headerBg.lineBetween(0, 68, width, 68);

    // < BACK to GameSelect Button
    const backBtn = this.add.container(20, 34);
    const backBg = this.add.graphics();
    backBg.fillStyle(0x1e293b, 1);
    backBg.fillRoundedRect(0, -18, 68, 36, 8);
    backBg.lineStyle(1.5, 0x64748b, 1);
    backBg.strokeRoundedRect(0, -18, 68, 36, 8);
    backBtn.add(backBg);

    const backText = this.add.text(34, 0, '< MENU', {
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
      this.captureSessionState();
      this.scene.start(this.returnScene);
    });

    // Center Title and Inning
    this.titleText = this.add.text(width / 2 + 10, 22, '🎱 8-BALL • VS CPU', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      fontWeight: '900',
      color: '#facc15',
      letterSpacing: 1
    }).setOrigin(0.5);

    this.turnText = this.add.text(width / 2 + 10, 42, 'YOUR TURN — AIM & STRIKE', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5);

    // MODE / DIFFICULTY Selector Button (Top Right)
    const modeBtn = this.add.container(width - 50, 34);
    const modeBg = this.add.graphics();
    modeBg.fillStyle(0x1e293b, 1);
    modeBg.fillRoundedRect(-38, -18, 76, 36, 8);
    modeBg.lineStyle(1.5, 0x38bdf8, 1);
    modeBg.strokeRoundedRect(-38, -18, 76, 36, 8);
    modeBtn.add(modeBg);

    const modeText = this.add.text(0, 0, '⚙️ MODE', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5);
    modeBtn.add(modeText);

    const modeZone = this.add.zone(0, 0, 76, 36).setInteractive({ useHandCursor: true });
    modeBtn.add(modeZone);
    modeZone.on('pointerdown', () => {
      audio.playMenuSelect?.();
      this.showModeModal();
    });

    // Score & Banner Alert Bar (under header)
    this.bannerText = this.add.text(width / 2, 78, '', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#facc15'
    }).setOrigin(0.5);
  }

  updateHUDText() {
    if (!this.titleText || !this.turnText) return;
    const subtypeLabels = {
      [POOL_SUBTYPES.EIGHT_BALL]: '8-BALL',
      [POOL_SUBTYPES.NINE_BALL]: '9-BALL',
      [POOL_SUBTYPES.STRAIGHT]: 'STRAIGHT POOL',
      [POOL_SUBTYPES.SPEED]: 'SPEED POOL'
    };

    const diffName = AI_CONFIGS[this.difficulty]?.name || 'VS CPU';
    this.titleText.setText(`🎱 ${subtypeLabels[this.subtype] || 'POOL'} • ${diffName}`);

    if (this.rules.subtype === POOL_SUBTYPES.SPEED) {
      this.turnText.setText(`⏱️ TIME: ${this.rules.speedTimer.toFixed(1)}s • SCORE: ${this.rules.scores[1]}`);
    } else if (this.rules.activePlayer === 1) {
      const groupStr = this.rules.groups[1] ? ` (${this.rules.groups[1].toUpperCase()})` : '';
      this.turnText.setText(`YOUR TURN${groupStr} • SCORE: ${this.rules.scores[1]}`);
      this.turnText.setColor('#38bdf8');
    } else {
      const groupStr = this.rules.groups[2] ? ` (${this.rules.groups[2].toUpperCase()})` : '';
      this.turnText.setText(`ALLAN'S TURN${groupStr} • THINKING...`);
      this.turnText.setColor('#f97316');
    }
  }

  setBanner(msg, durationMs = 2500) {
    this.bannerMessage = msg;
    this.bannerText.setText(msg);
    this.bannerTimer = durationMs;
  }

  executeHumanShot() {
    if (this.isWaitingForMotion || this.isAiTurn || this.rules.isGameOver) return;

    const cue = this.physicsEngine.cueBall;
    if (!cue || cue.inPocket) {
      this.setBanner('Place Cue Ball on Table first!');
      return;
    }

    audio.playCueStrike(this.power);
    this.physicsEngine.strikeCueBall(this.aimAngle, this.power);
    this.isWaitingForMotion = true;
    this.rules.ballInHand = false;
  }

  executeStrike() {
    this.executeHumanShot();
  }

  executeAiShot() {
    this.isAiTurn = true;
    this.updateHUDText();

    const delay = this.ai.config.delayMs;

    this.time.delayedCall(delay, () => {
      if (this.rules.isGameOver) return;

      // Handle AI Ball in Hand
      if (this.rules.ballInHand && this.rules.activePlayer === 2) {
        const placement = this.ai.calculateBallInHandPlacement(this.physicsEngine, this.rules);
        this.physicsEngine.placeCueBall(placement.x, placement.y);
        this.updateBallSprites();
        this.rules.ballInHand = false;
      }

      // Compute AI shot
      const shot = this.ai.calculateShot(this.physicsEngine, this.rules);
      this.aimAngle = shot.angle;
      this.power = shot.power;
      this.drawPowerMeter();

      // Cue stroke animation
      this.time.delayedCall(300, () => {
        audio.playCueStrike(shot.power);
        this.physicsEngine.strikeCueBall(shot.angle, shot.power);
        this.isWaitingForMotion = true;
      });
    });
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);

    // Speed pool timer
    if (this.subtype === POOL_SUBTYPES.SPEED && !this.rules.isGameOver && !this.showMenuOverlay) {
      this.rules.speedTimer = Math.max(0, this.rules.speedTimer - dt);
      this.updateHUDText();
      if (this.rules.speedTimer <= 0) {
        this.rules.isGameOver = true;
        this.rules.winner = null;
        this.rules.winReason = 'TIME OUT! You ran out of time!';
        this.handleGameOver();
      }
    }

    // Banner message fade
    if (this.bannerTimer > 0) {
      this.bannerTimer -= delta;
      if (this.bannerTimer <= 0) {
        this.bannerText.setText('');
      }
    }

    // Step physics
    if (this.physicsEngine.isMoving()) {
      this.physicsEngine.step(dt);
      this.handlePhysicsSoundEvents();
      this.updateBallSprites();
    } else if (this.isWaitingForMotion) {
      // All balls have settled
      this.isWaitingForMotion = false;
      this.onBallsSettled();
    }

    // Render aiming ray and cue stick
    this.renderAimingAndCue();
  }

  handlePhysicsSoundEvents() {
    const events = this.physicsEngine.events;

    // Ball collisions
    for (const c of events.ballCollisions) {
      audio.playBallHit(Math.min(1.0, c.impactSpeed / 300));
    }
    events.ballCollisions = [];

    // Cushion bounces
    for (const ch of events.cushionHits) {
      audio.playRailCushion(Math.min(1.0, ch.speed / 300));
    }
    events.cushionHits = [];

    // Pocket drops
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

    if (this.isWaitingForMotion || this.rules.isGameOver) return;

    const cue = this.physicsEngine.cueBall;
    if (!cue || cue.inPocket) return;

    // Don't show human cue guide during AI thinking turn
    if (this.isAiTurn && this.rules.activePlayer === 2) return;

    const { feltX, feltY, feltW, feltH, ballRadius } = TABLE_CONFIG;
    const maxRayDist = 450;
    const rayCos = Math.cos(this.aimAngle);
    const raySin = Math.sin(this.aimAngle);

    // 1. Raycast to find first collision (either ball or table cushion)
    let hitDist = maxRayDist;
    let hitBall = null;

    // Check ball obstacle intersections along ray
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

    // 2. Draw Trajectory Line
    this.guideGfx.lineStyle(1.5, 0xffffff, 0.65);
    this.guideGfx.lineBetween(cue.x, cue.y, hitX, hitY);

    // Ghost Ball circle
    this.guideGfx.lineStyle(1.5, 0x38bdf8, 0.9);
    this.guideGfx.strokeCircle(hitX, hitY, ballRadius);

    // If hitting an object ball, draw deflection path of target ball
    if (hitBall) {
      const defX = hitBall.x - hitX;
      const defY = hitBall.y - hitY;
      const defDist = Math.hypot(defX, defY) || 1;
      const uDefX = defX / defDist;
      const uDefY = defY / defDist;

      this.guideGfx.lineStyle(1.5, 0xfacc15, 0.85);
      this.guideGfx.lineBetween(hitBall.x, hitBall.y, hitBall.x + uDefX * 70, hitBall.y + uDefY * 70);
    }

    // 3. Draw Cue Stick behind cue ball
    const cueStickLength = 160;
    const pullback = this.power * 40;
    const cueStartX = cue.x - rayCos * (ballRadius + 4 + pullback);
    const cueStartY = cue.y - raySin * (ballRadius + 4 + pullback);
    const cueEndX = cue.x - rayCos * (ballRadius + 4 + pullback + cueStickLength);
    const cueEndY = cue.y - raySin * (ballRadius + 4 + pullback + cueStickLength);

    // Wooden Cue Stick
    this.cueGfx.lineStyle(4, 0xb45309, 1);
    this.cueGfx.lineBetween(cueStartX, cueStartY, cueEndX, cueEndY);

    // Chalk Tip
    this.cueGfx.lineStyle(4, 0x38bdf8, 1);
    this.cueGfx.lineBetween(cueStartX, cueStartY, cueStartX - rayCos * 6, cueStartY - raySin * 6);
  }

  onBallsSettled() {
    const result = this.rules.evaluateShot(this.physicsEngine);

    // Auditory feedback for foul
    if (result.isFoul) {
      audio.playPoolFoul();
      this.setBanner(result.foulReason || 'FOUL!');
    } else if (result.ballsPottedCount > 0) {
      let banner = `POTTED ${result.ballsPottedCount} BALL${result.ballsPottedCount > 1 ? 'S' : ''}!`;
      if (result.trickBonus > 0) banner += ` +${result.trickBonus} TRICK BONUS!`;
      this.setBanner(banner);
    }

    // If cue ball was pocketed (scratch), grant ball-in-hand
    if (this.physicsEngine.cueBall.inPocket) {
      const { feltX, feltY, feltW, feltH } = TABLE_CONFIG;
      this.physicsEngine.placeCueBall(feltX + feltW / 2, feltY + feltH * 0.72);
      this.rules.ballInHand = true;
    }
    this.updateBallSprites();

    this.updateHUDText();

    // Check Game Over
    if (this.rules.isGameOver) {
      this.handleGameOver();
      return;
    }

    this.captureSessionState();

    // Switch turns / AI execution
    if (this.rules.activePlayer === 2) {
      this.executeAiShot();
    } else {
      this.isAiTurn = false;
      this.updateHUDText();
    }
  }

  captureSessionState() {
    if (this.rules.isGameOver) {
      storage.clearGameSession('pool');
      return;
    }
    const state = {
      subtype: this.subtype,
      difficulty: this.difficulty,
      rules: this.rules.getSnapshot(),
      balls: this.physicsEngine.getSnapshot(),
      aimAngle: this.aimAngle,
      power: this.power
    };

    let summaryDetail = '';
    if (this.subtype === POOL_SUBTYPES.EIGHT_BALL || this.subtype === POOL_SUBTYPES.NINE_BALL) {
      const p1Group = this.rules.groups[1] ? ` (${this.rules.groups[1]})` : '';
      summaryDetail = `Turn: ${this.rules.activePlayer === 1 ? 'Allan' : 'CPU'}${p1Group}`;
    } else if (this.subtype === POOL_SUBTYPES.STRAIGHT) {
      summaryDetail = `Allan: ${this.rules.scores[1]} / ${this.rules.straightTargetScore}`;
    } else if (this.subtype === POOL_SUBTYPES.SPEED) {
      summaryDetail = `${Math.ceil(this.rules.speedTimer)}s left • ${this.rules.speedBallsPotted}/15 balls`;
    }

    const summary = {
      subtype: this.subtype,
      difficulty: this.difficulty,
      score: this.rules.scores[1] || 0,
      detail: summaryDetail
    };

    storage.saveGameSession('pool', state, summary);
  }

  handleGameOver() {
    storage.clearGameSession('pool');
    const { width, height } = this.scale;
    const isPlayerWin = this.rules.winner === 1;
    const finalScore = this.rules.scores[1] || 0;

    // Save to storage
    const subKey = `pool_${this.subtype}`;
    storage.recordPoolScore({
      subtype: subKey,
      won: isPlayerWin,
      score: finalScore,
      detail: this.rules.winReason
    });

    // Celebratory melody for beating Allan Legend
    if (isPlayerWin && this.difficulty === AI_DIFFICULTIES.LEGEND) {
      if (typeof audio.playFanfare === 'function') {
        audio.playFanfare();
      } else {
        audio.playVictory?.();
      }
    }

    // Submit score to Cloudflare D1 leaderboards
    const profile = storage.getPlayerProfile ? storage.getPlayerProfile() : { tag: 'ALL', name: '' };
    if (finalScore > 0) {
      leaderboardService.submitScore(subKey, finalScore, `Pool ${this.subtype.toUpperCase()}`, profile.name);
    }

    // Game Over Modal Container
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
    card.lineStyle(2, isPlayerWin ? 0xfacc15 : 0xef4444, 0.9);
    card.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    modal.add(card);

    const titleStr = isPlayerWin ? '👑 VICTORY! 👑' : 'DEFEAT!';
    const titleColor = isPlayerWin ? '#facc15' : '#ef4444';
    modal.add(this.add.text(0, -110, titleStr, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '26px',
      fontWeight: '900',
      color: titleColor
    }).setOrigin(0.5));

    modal.add(this.add.text(0, -60, this.rules.winReason, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: '600',
      align: 'center',
      color: '#cbd5e1',
      wordWrap: { width: 340 }
    }).setOrigin(0.5));

    modal.add(this.add.text(0, 0, `FINAL SCORE: ${finalScore.toLocaleString()} PTS`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5));

    // Buttons: PLAY AGAIN & LEADERBOARD
    const playAgainBtn = this.add.container(-85, 75);
    const paBg = this.add.graphics();
    paBg.fillStyle(0x16a34a, 1);
    paBg.fillRoundedRect(-70, -20, 140, 40, 8);
    paBg.lineStyle(1.5, 0x4ade80, 1);
    paBg.strokeRoundedRect(-70, -20, 140, 40, 8);
    playAgainBtn.add(paBg);
    playAgainBtn.add(this.add.text(0, 0, 'PLAY AGAIN 🔄', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5));
    const paHit = this.add.zone(0, 0, 140, 40).setInteractive({ useHandCursor: true });
    playAgainBtn.add(paHit);
    paHit.on('pointerdown', () => {
      audio.playShoot?.();
      modal.destroy();
      this.setupNewGame(this.subtype, this.difficulty);
    });
    modal.add(playAgainBtn);

    const lbBtn = this.add.container(85, 75);
    const lbBg = this.add.graphics();
    lbBg.fillStyle(0x0284c7, 1);
    lbBg.fillRoundedRect(-70, -20, 140, 40, 8);
    lbBg.lineStyle(1.5, 0x38bdf8, 1);
    lbBg.strokeRoundedRect(-70, -20, 140, 40, 8);
    lbBtn.add(lbBg);
    lbBtn.add(this.add.text(0, 0, 'SCORES 🏆', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5));
    const lbHit = this.add.zone(0, 0, 140, 40).setInteractive({ useHandCursor: true });
    lbBtn.add(lbHit);
    lbHit.on('pointerdown', () => {
      audio.playMenuSelect?.();
      this.scene.launch('LeaderboardModal', { gameId: `pool_${this.subtype}`, returnScene: 'Pool' });
    });
    modal.add(lbBtn);
  }

  setupModeSelectorModal(width, height) {
    this.modeModalContainer = this.add.container(width / 2, height / 2);
    this.modeModalContainer.setVisible(false);

    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.85);
    backdrop.fillRect(-width / 2, -height / 2, width, height);
    backdrop.setInteractive();
    this.modeModalContainer.add(backdrop);

    const cardW = 390;
    const cardH = 460;
    const card = this.add.graphics();
    card.fillStyle(0x0f172a, 0.98);
    card.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    card.lineStyle(2, 0x38bdf8, 0.85);
    card.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    this.modeModalContainer.add(card);

    this.modeModalContainer.add(this.add.text(0, -190, '⚙️ BILLIARDS SETTINGS', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '17px',
      fontWeight: '900',
      color: '#facc15',
      letterSpacing: 1
    }).setOrigin(0.5));

    // Section 1: Game Format
    this.modeModalContainer.add(this.add.text(0, -150, 'SELECT GAME SUBTYPE', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#94a3b8'
    }).setOrigin(0.5));

    const subtypes = [
      { id: POOL_SUBTYPES.EIGHT_BALL, label: '8-BALL' },
      { id: POOL_SUBTYPES.NINE_BALL, label: '9-BALL' },
      { id: POOL_SUBTYPES.STRAIGHT, label: 'STRAIGHT' },
      { id: POOL_SUBTYPES.SPEED, label: 'SPEED' }
    ];

    subtypes.forEach((st, i) => {
      const btnX = -135 + i * 90;
      const btnY = -115;
      const btnContainer = this.add.container(btnX, btnY);

      const bBg = this.add.graphics();
      bBg.fillStyle(this.subtype === st.id ? 0x0284c7 : 0x1e293b, 1);
      bBg.fillRoundedRect(-40, -15, 80, 30, 6);
      bBg.lineStyle(1.5, this.subtype === st.id ? 0x38bdf8 : 0x475569, 1);
      bBg.strokeRoundedRect(-40, -15, 80, 30, 6);
      btnContainer.add(bBg);

      btnContainer.add(this.add.text(0, 0, st.label, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '10px',
        fontWeight: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5));

      const hit = this.add.zone(0, 0, 80, 30).setInteractive({ useHandCursor: true });
      btnContainer.add(hit);
      hit.on('pointerdown', () => {
        audio.playBounce?.();
        this.subtype = st.id;
        this.hideModeModal();
        this.setupNewGame(this.subtype, this.difficulty);
      });

      this.modeModalContainer.add(btnContainer);
    });

    // Section 2: AI Difficulty
    this.modeModalContainer.add(this.add.text(0, -55, 'VS CPU DIFFICULTY', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#94a3b8'
    }).setOrigin(0.5));

    const diffs = [
      { id: AI_DIFFICULTIES.NOVICE, label: 'NOVICE (EASY)' },
      { id: AI_DIFFICULTIES.REGULAR, label: 'REGULAR (MEDIUM)' },
      { id: AI_DIFFICULTIES.MASTER, label: 'MASTER (HARD)' },
      { id: AI_DIFFICULTIES.LEGEND, label: 'ALLAN LEGEND 👑' }
    ];

    diffs.forEach((d, i) => {
      const dY = -15 + i * 44;
      const dContainer = this.add.container(0, dY);

      const dBg = this.add.graphics();
      const isSel = this.difficulty === d.id;
      dBg.fillStyle(isSel ? 0x059669 : 0x1e293b, 1);
      dBg.fillRoundedRect(-140, -16, 280, 32, 6);
      dBg.lineStyle(1.5, isSel ? 0x34d399 : 0x475569, 1);
      dBg.strokeRoundedRect(-140, -16, 280, 32, 6);
      dContainer.add(dBg);

      dContainer.add(this.add.text(0, 0, d.label, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        fontWeight: 'bold',
        color: isSel ? '#ffffff' : '#cbd5e1'
      }).setOrigin(0.5));

      const hit = this.add.zone(0, 0, 280, 32).setInteractive({ useHandCursor: true });
      dContainer.add(hit);
      hit.on('pointerdown', () => {
        audio.playBounce?.();
        this.difficulty = d.id;
        this.hideModeModal();
        this.setupNewGame(this.subtype, this.difficulty);
      });

      this.modeModalContainer.add(dContainer);
    });

    // Close Button
    const closeBtn = this.add.container(0, 185);
    const closeBg = this.add.graphics();
    closeBg.fillStyle(0x334155, 1);
    closeBg.fillRoundedRect(-50, -18, 100, 36, 8);
    closeBtn.add(closeBg);
    closeBtn.add(this.add.text(0, 0, 'CLOSE', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5));
    const closeHit = this.add.zone(0, 0, 100, 36).setInteractive({ useHandCursor: true });
    closeBtn.add(closeHit);
    closeHit.on('pointerdown', () => {
      this.hideModeModal();
    });
    this.modeModalContainer.add(closeBtn);
  }

  showModeModal() {
    this.showMenuOverlay = true;
    this.modeModalContainer.setVisible(true);
  }

  hideModeModal() {
    this.showMenuOverlay = false;
    this.modeModalContainer.setVisible(false);
  }
}
