// src/scenes/MultiplayerPong.js
// 2-Player Real-Time Multiplayer Birthday Pong with Perspective Inversion for Client

import { network } from '../systems/NetworkManager.js';
import { audio } from '../systems/AudioManager.js';

const SceneBase = typeof Phaser !== 'undefined' ? Phaser.Scene : class {};

const WINNING_SCORE = 7;

export class MultiplayerPongScene extends SceneBase {
  constructor() {
    super('MultiplayerPong');
  }

  init(data) {
    this.isHost = !!data?.isHost || network.isHost;
    this.mySlot = network.mySlot || 1;
    this.hostScore = 0;
    this.clientScore = 0;
    this.rallyCount = 0;
    this.gameActive = false;
    this.isMatchOver = false;
    this.ballBaseSpeed = 340;
    this.ballSpeed = this.ballBaseSpeed;
    this.lastInputSendTime = 0;
    this.unsubscribers = [];
  }

  create() {
    const { width, height } = this.scale;

    // 1. Dark Court Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0f1d, 0x0a0f1d, 0x111827, 0x111827, 1);
    bg.fillRect(0, 0, width, height);

    // Court boundaries
    const court = this.add.graphics();
    court.lineStyle(2, 0x1e293b, 1);
    court.strokeRect(16, 76, width - 32, height - 160);

    // Center net line (dashed)
    court.lineStyle(2, 0x334155, 0.6);
    const midY = (76 + height - 84) / 2;
    this.midY = midY;
    this.courtTop = 76;
    this.courtBottom = height - 84;
    this.courtHeight = this.courtBottom - this.courtTop;

    for (let x = 20; x < width - 20; x += 16) {
      court.lineBetween(x, midY, x + 8, midY);
    }

    // 2. HUD Top Bar
    this.createHUD(width);

    // 3. Paddles
    // Opponent Paddle (Top)
    this.topPaddle = this.physics.add.sprite(width / 2, 110, 'pong_paddle_ai');
    this.topPaddle.setImmovable(true);
    this.topPaddle.body.allowGravity = false;
    this.topPaddle.setCollideWorldBounds(true);
    // Opponent is Cyan if I'm client, Emerald if I'm host
    this.topPaddle.setTint(this.isHost ? 0x4ade80 : 0x38bdf8);

    // Local Player Paddle (Bottom)
    this.bottomPaddle = this.physics.add.sprite(width / 2, 720, 'pong_paddle_player');
    this.bottomPaddle.setImmovable(true);
    this.bottomPaddle.body.allowGravity = false;
    this.bottomPaddle.setCollideWorldBounds(true);
    // Local player is Cyan if host, Emerald if client
    this.bottomPaddle.setTint(this.isHost ? 0x38bdf8 : 0x4ade80);

    // Under-Paddle Touch Grip Handle
    this.paddleGrip = this.add.sprite(width / 2, 752, 'pong_grip');
    this.paddleGrip.setDepth(10);
    this.paddleGrip.setTint(this.isHost ? 0x38bdf8 : 0x4ade80);

    this.gripLabel = this.add.text(width / 2, 778, 'TOUCH & DRAG HANDLE', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '10px',
      fontWeight: 'bold',
      color: this.isHost ? '#38bdf8' : '#4ade80'
    }).setOrigin(0.5);

    // Ball (Birthday Cake Puck)
    this.ball = this.physics.add.sprite(width / 2, midY, 'pong_ball');
    this.ball.setCollideWorldBounds(true);
    this.ball.setBounce(1, 1);
    this.ball.body.allowGravity = false;

    // Ball wall bounce sound
    this.physics.world.on('worldbounds', (body, up, down, left, right) => {
      if (body.gameObject === this.ball && (left || right)) {
        audio.playBounce?.();
      }
    });

    // 4. Touch & Keyboard Controls
    this.setupControls(width, height);

    // 5. Host Physics Colliders
    if (this.isHost) {
      this.physics.add.collider(this.ball, this.bottomPaddle, this.hitBottomPaddle, null, this);
      this.physics.add.collider(this.ball, this.topPaddle, this.hitTopPaddle, null, this);
    }

    // 6. Network Listeners
    this.setupNetwork();

    // 7. Start Match
    if (this.isHost) {
      this.time.delayedCall(1200, () => {
        this.startServe(1);
      });
    }

    // Teardown
    this.events.once('shutdown', () => {
      this.teardown();
    });
  }

  createHUD(width) {
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x0f172a, 0.95);
    hudBg.fillRect(0, 0, width, 68);
    hudBg.lineStyle(2, 0x38bdf8, 0.8);
    hudBg.lineBetween(0, 68, width, 68);

    // Back to Lobby Button
    const backBtn = this.add.container(16, 34);
    const backBg = this.add.graphics();
    backBg.fillStyle(0x1e293b, 1);
    backBg.fillRoundedRect(0, -18, 64, 36, 6);
    backBg.lineStyle(1.5, 0x64748b, 1);
    backBg.strokeRoundedRect(0, -18, 64, 36, 6);
    backBtn.add(backBg);

    backBtn.add(this.add.text(32, 0, '< LOBBY', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#94a3b8'
    }).setOrigin(0.5));

    const backZone = this.add.zone(32, 0, 64, 36).setInteractive({ useHandCursor: true });
    backBtn.add(backZone);
    backZone.on('pointerdown', () => {
      audio.playShoot?.();
      this.returnToLobby();
    });

    // Scoreboard in Center: [HOST] 3 - 2 [GUEST]
    const p1 = network.getPlayer(1) || { tag: 'P1' };
    const p2 = network.getPlayer(2) || { tag: 'P2' };

    this.scoreText = this.add.text(width / 2, 26, `[${p1.tag}] 0  —  0 [${p2.tag}]`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#facc15'
    }).setOrigin(0.5);

    this.rallyText = this.add.text(width / 2, 48, 'RALLY: 0   FIRST TO 7 WINS', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#38bdf8',
      letterSpacing: 1
    }).setOrigin(0.5);
  }

  setupControls(width, height) {
    const touchZoneHeight = 160;
    const touchZone = this.add.zone(width / 2, height - touchZoneHeight / 2, width, touchZoneHeight)
      .setInteractive({ useHandCursor: true });

    const movePaddleTo = (pointerX) => {
      const minX = 16 + this.bottomPaddle.width / 2;
      const maxX = width - 16 - this.bottomPaddle.width / 2;
      const clampedX = Phaser.Math.Clamp(pointerX, minX, maxX);
      this.bottomPaddle.x = clampedX;
      this.paddleGrip.x = clampedX;
      if (this.gripLabel) this.gripLabel.x = clampedX;
    };

    touchZone.on('pointerdown', (pointer) => movePaddleTo(pointer.x));
    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown && pointer.y > height / 2) movePaddleTo(pointer.x);
    });

    // Keyboard Fallback
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keyA = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  }

  // ==========================================
  // HOST BALL PHYSICS & SCORING
  // ==========================================
  startServe(direction = 1) {
    if (!this.isHost || this.isMatchOver) return;

    this.ball.setPosition(this.scale.width / 2, this.midY);
    this.ballSpeed = this.ballBaseSpeed;
    this.rallyCount = 0;
    this.gameActive = false;

    // Countdown / Pause before serve
    this.time.delayedCall(800, () => {
      if (this.isMatchOver) return;
      this.gameActive = true;
      const angle = (Math.random() * 0.8 - 0.4); // slightly randomized launch
      const vx = Math.sin(angle) * this.ballSpeed;
      const vy = Math.cos(angle) * this.ballSpeed * direction;
      this.ball.setVelocity(vx, vy);
      audio.playShoot?.();
    });
  }

  hitBottomPaddle(ball, paddle) {
    if (!this.isHost || !this.gameActive) return;

    this.rallyCount++;
    this.ballSpeed = Math.min(680, this.ballSpeed + 22);

    // Calculate deflection angle based on distance from paddle center
    const offset = (ball.x - paddle.x) / (paddle.width / 2);
    const angle = offset * (55 * Math.PI / 180); // max 55 deg deflection
    const vx = Math.sin(angle) * this.ballSpeed;
    const vy = -Math.abs(Math.cos(angle) * this.ballSpeed);

    ball.setVelocity(vx, vy);
    audio.playBounce?.();
  }

  hitTopPaddle(ball, paddle) {
    if (!this.isHost || !this.gameActive) return;

    this.rallyCount++;
    this.ballSpeed = Math.min(680, this.ballSpeed + 22);

    const offset = (ball.x - paddle.x) / (paddle.width / 2);
    const angle = offset * (55 * Math.PI / 180);
    const vx = Math.sin(angle) * this.ballSpeed;
    const vy = Math.abs(Math.cos(angle) * this.ballSpeed);

    ball.setVelocity(vx, vy);
    audio.playBounce?.();
  }

  // ==========================================
  // UPDATE & NETWORK SYNC
  // ==========================================
  update(time, delta) {
    if (this.isMatchOver) return;

    const width = this.scale.width;
    const speed = 420;
    const dt = delta / 1000;

    // Keyboard support for local paddle
    if (this.cursors?.left.isDown || this.keyA?.isDown) {
      const minX = 16 + this.bottomPaddle.width / 2;
      this.bottomPaddle.x = Math.max(minX, this.bottomPaddle.x - speed * dt);
      this.paddleGrip.x = this.bottomPaddle.x;
      if (this.gripLabel) this.gripLabel.x = this.bottomPaddle.x;
    } else if (this.cursors?.right.isDown || this.keyD?.isDown) {
      const maxX = width - 16 - this.bottomPaddle.width / 2;
      this.bottomPaddle.x = Math.min(maxX, this.bottomPaddle.x + speed * dt);
      this.paddleGrip.x = this.bottomPaddle.x;
      if (this.gripLabel) this.gripLabel.x = this.bottomPaddle.x;
    }

    // Transmit Local Paddle X @ 40 Hz
    if (time > this.lastInputSendTime + 25) {
      this.lastInputSendTime = time;
      network.sendInput({ paddleX: Math.round(this.bottomPaddle.x) });
    }

    if (this.isHost) {
      // Apply Client (Slot 2) input to Top Paddle
      const p2Input = network.clientInputs.get(2);
      if (p2Input && p2Input.paddleX !== undefined) {
        // Smooth lerp opponent paddle on host
        this.topPaddle.x = Phaser.Math.Linear(this.topPaddle.x, p2Input.paddleX, 0.4);
      }

      // Check scoring boundaries
      if (this.gameActive) {
        if (this.ball.y < this.courtTop + 8) {
          // Point for Host (Bottom Paddle)!
          this.hostScore++;
          this.onPointScored(1);
        } else if (this.ball.y > this.courtBottom - 8) {
          // Point for Client (Top Paddle)!
          this.clientScore++;
          this.onPointScored(2);
        }
      }

      // Broadcast Snapshot @ 30 Hz
      network.broadcastSnapshot({
        ballX: Math.round(this.ball.x),
        ballY: Math.round(this.ball.y),
        ballVx: Math.round(this.ball.body.velocity.x),
        ballVy: Math.round(this.ball.body.velocity.y),
        hostPaddleX: Math.round(this.bottomPaddle.x),
        clientPaddleX: Math.round(this.topPaddle.x),
        hostScore: this.hostScore,
        clientScore: this.clientScore,
        rallyCount: this.rallyCount
      });
    } else {
      // Client: apply lerp to Opponent (Top) paddle
      // Handled in applyClientSnapshot
    }
  }

  onPointScored(scorerSlot) {
    this.gameActive = false;
    this.ball.setVelocity(0, 0);
    audio.playHit?.();
    this.updateHUDText();

    if (this.hostScore >= WINNING_SCORE || this.clientScore >= WINNING_SCORE) {
      const winnerSlot = this.hostScore >= WINNING_SCORE ? 1 : 2;
      this.triggerMatchOver(winnerSlot);
      return;
    }

    // Serve towards player who conceded point
    const serveDirection = scorerSlot === 1 ? -1 : 1;
    this.time.delayedCall(1000, () => {
      this.startServe(serveDirection);
    });
  }

  applyClientSnapshot(snapshot) {
    if (!snapshot) return;

    this.hostScore = snapshot.hostScore;
    this.clientScore = snapshot.clientScore;
    this.rallyCount = snapshot.rallyCount;
    this.updateHUDText();

    // Perspective Inversion:
    // Host is at top of Client's screen; Client is at bottom.
    // Client receives hostPaddleX (host's bottom paddle) -> maps to topPaddle!
    this.topPaddle.x = Phaser.Math.Linear(this.topPaddle.x, snapshot.hostPaddleX, 0.4);

    // Invert Ball Position Y for Client!
    // y_client = courtTop + (courtBottom - y_host)
    const invertedY = this.courtTop + (this.courtBottom - snapshot.ballY);
    this.ball.setPosition(snapshot.ballX, invertedY);
  }

  updateHUDText() {
    if (!this.scoreText) return;
    const p1 = network.getPlayer(1) || { tag: 'P1' };
    const p2 = network.getPlayer(2) || { tag: 'P2' };

    this.scoreText.setText(`[${p1.tag}] ${this.hostScore}  —  ${this.clientScore} [${p2.tag}]`);
    this.rallyText.setText(`RALLY: ${this.rallyCount}   FIRST TO ${WINNING_SCORE} WINS`);
  }

  triggerMatchOver(winnerSlot) {
    if (this.isMatchOver) return;
    this.isMatchOver = true;
    this.gameActive = false;

    const winner = network.getPlayer(winnerSlot) || { slot: winnerSlot, tag: `P${winnerSlot}` };

    if (this.isHost) {
      network.sendEvent('pong-match-over', {
        winnerSlot,
        winnerTag: winner.tag,
        hostScore: this.hostScore,
        clientScore: this.clientScore
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
    const cardH = 320;
    const cardY = height / 2 - cardH / 2;

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x0a0f1d, 0.98);
    cardBg.fillRoundedRect(24, cardY, cardW, cardH, 14);
    cardBg.lineStyle(2, 0xfacc15, 1);
    cardBg.strokeRoundedRect(24, cardY, cardW, cardH, 14);
    overlay.add(cardBg);

    overlay.add(this.add.text(width / 2, cardY + 40, '🏆 PONG DUEL COMPLETED 🏆', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '17px',
      fontWeight: '900',
      color: '#facc15',
      letterSpacing: 2
    }).setOrigin(0.5));

    const p1 = network.getPlayer(1) || { tag: 'P1' };
    const p2 = network.getPlayer(2) || { tag: 'P2' };
    const winnerTag = winner.slot === 1 ? p1.tag : p2.tag;

    overlay.add(this.add.text(width / 2, cardY + 90, `VICTOR: [${winnerTag}]`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '20px',
      fontWeight: 'bold',
      color: winner.slot === 1 ? '#38bdf8' : '#4ade80'
    }).setOrigin(0.5));

    overlay.add(this.add.text(width / 2, cardY + 140, `FINAL SCORE:  ${this.hostScore} — ${this.clientScore}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5));

    // Action Buttons
    const btnY = cardY + cardH - 55;
    if (this.isHost) {
      // Rematch
      const rematchBtn = this.add.container(width / 2 - 75, btnY);
      const rBg = this.add.graphics();
      rBg.fillStyle(0x16a34a, 1);
      rBg.fillRoundedRect(-65, -20, 130, 40, 8);
      rBg.lineStyle(1.5, 0x4ade80, 1);
      rBg.strokeRoundedRect(-65, -20, 130, 40, 8);
      rematchBtn.add(rBg);

      rematchBtn.add(this.add.text(0, 0, '🔄 REMATCH', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5));

      const rZone = this.add.zone(0, 0, 130, 40).setInteractive({ useHandCursor: true });
      rematchBtn.add(rZone);
      rZone.on('pointerdown', () => {
        audio.playVictory?.();
        network.startGame({ mode: 'pong' });
      });
      overlay.add(rematchBtn);

      // Lobby
      const lobbyBtn = this.add.container(width / 2 + 75, btnY);
      const lBg = this.add.graphics();
      lBg.fillStyle(0x1e293b, 1);
      lBg.fillRoundedRect(-65, -20, 130, 40, 8);
      lBg.lineStyle(1.5, 0x64748b, 1);
      lBg.strokeRoundedRect(-65, -20, 130, 40, 8);
      lobbyBtn.add(lBg);

      lobbyBtn.add(this.add.text(0, 0, '🚪 LOBBY', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#94a3b8'
      }).setOrigin(0.5));

      const lZone = this.add.zone(0, 0, 130, 40).setInteractive({ useHandCursor: true });
      lobbyBtn.add(lZone);
      lZone.on('pointerdown', () => {
        audio.playShoot?.();
        this.returnToLobby();
      });
      overlay.add(lobbyBtn);
    } else {
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

  showOpponentLeftModal() {
    if (this.isOpponentLeftModalShown || this.isMatchOver) return;
    this.isOpponentLeftModalShown = true;
    this.gameActive = false;
    this.ball.setVelocity(0, 0);

    const { width, height } = this.scale;
    const overlay = this.add.container(0, 0).setDepth(250);

    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.85);
    backdrop.fillRect(0, 0, width, height);
    overlay.add(backdrop);

    const cardW = Math.min(width - 48, 360);
    const cardH = 200;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    const card = this.add.graphics();
    card.fillStyle(0x0f172a, 0.98);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, 12);
    card.lineStyle(2, 0xf59e0b, 1);
    card.strokeRoundedRect(cardX, cardY, cardW, cardH, 12);
    overlay.add(card);

    overlay.add(this.add.text(width / 2, cardY + 36, 'PLAYER DISCONNECTED', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '17px',
      fontWeight: 'bold',
      color: '#f59e0b'
    }).setOrigin(0.5));

    overlay.add(this.add.text(width / 2, cardY + 80, 'Your opponent has left the duel.', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      color: '#cbd5e1',
      align: 'center'
    }).setOrigin(0.5));

    const btnY = cardY + cardH - 45;
    const btn = this.add.container(width / 2, btnY);
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x0284c7, 1);
    btnBg.fillRoundedRect(-75, -18, 150, 36, 6);
    btn.add(btnBg);
    btn.add(this.add.text(0, 0, 'RETURN TO LOBBY', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5));

    const zone = this.add.zone(0, 0, 150, 36).setInteractive({ useHandCursor: true });
    btn.add(zone);
    zone.on('pointerdown', () => {
      this.returnToLobby(false);
    });
    overlay.add(btn);
  }

  showHostDisconnectedModal() {
    if (this.isHostDisconnectedModalShown) return;
    this.isHostDisconnectedModalShown = true;
    this.gameActive = false;
    this.ball.setVelocity(0, 0);
    audio.playExplode?.();
    const { width, height } = this.scale;

    const overlay = this.add.container(0, 0).setDepth(300);

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

  setupNetwork() {
    this.unsubscribers.push(
      network.on('game-snapshot', (snapshot) => {
        if (!this.isHost) {
          this.applyClientSnapshot(snapshot);
        }
      }),
      network.on('network-event', (packet) => {
        if (packet.event === 'return-to-lobby') {
          this.returnToLobby(false);
        } else if (packet.event === 'pong-match-over') {
          const winner = network.getPlayer(packet.data.winnerSlot) || { slot: packet.data.winnerSlot };
          this.isMatchOver = true;
          this.hostScore = packet.data.hostScore;
          this.clientScore = packet.data.clientScore;
          this.showMatchOverModal(winner);
        }
      }),
      network.on('player-left', () => {
        this.showOpponentLeftModal();
      }),
      network.on('game-start', () => {
        this.scene.restart({ isHost: this.isHost });
      }),
      network.on('host-disconnected', () => {
        this.showHostDisconnectedModal();
      })
    );
  }

  teardown() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }
}
