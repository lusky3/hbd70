// src/scenes/Pong.js
// Touch-friendly Birthday Pong clone with under-paddle grip handle

import { audio } from '../systems/AudioManager.js';
import { ControlsOverlay } from './ControlsOverlay.js';

export class PongScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Pong' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.playerScore = 0;
    this.aiScore = 0;
    this.rallyCount = 0;
    this.gameActive = false;
    this.ballBaseSpeed = 340;
    this.ballSpeed = this.ballBaseSpeed;

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
    for (let x = 20; x < width - 20; x += 16) {
      court.lineBetween(x, midY, x + 8, midY);
    }

    // 2. HUD Top Bar
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

    // Score Text
    this.scoreText = this.add.text(width / 2, 26, 'ALLAN: 0  •  DECADES: 0', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#ffd700'
    }).setOrigin(0.5);

    this.rallyText = this.add.text(width / 2, 48, 'Rally: 0 • First to 7 Wins!', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: '600',
      color: '#94a3b8'
    }).setOrigin(0.5);

    // Sound button
    const muteBtn = this.add.container(width - 44, 34);
    const muteText = this.add.text(0, 0, audio.isMuted ? '🔇' : '🔊', {
      fontSize: '18px'
    }).setOrigin(0.5);
    muteBtn.add(muteText);
    muteBtn.setSize(36, 36);
    muteBtn.setInteractive({ useHandCursor: true });
    muteBtn.on('pointerdown', () => {
      audio.toggleMute();
      muteText.setText(audio.isMuted ? '🔇' : '🔊');
    });

    // 3. Game Physics Entities
    // AI Paddle (Top)
    this.aiPaddle = this.physics.add.sprite(width / 2, 110, 'pong_paddle_ai');
    this.aiPaddle.setImmovable(true);
    this.aiPaddle.body.allowGravity = false;
    this.aiPaddle.setCollideWorldBounds(true);

    // Player Paddle (Bottom)
    this.playerPaddle = this.physics.add.sprite(width / 2, 720, 'pong_paddle_player');
    this.playerPaddle.setImmovable(true);
    this.playerPaddle.body.allowGravity = false;
    this.playerPaddle.setCollideWorldBounds(true);

    // Extended Under-Paddle Touch Grip Handle
    // Positioned 24px below player paddle so finger rests below without obstructing ball view
    this.paddleGrip = this.add.sprite(width / 2, 752, 'pong_grip');
    this.paddleGrip.setDepth(10);

    this.gripLabel = this.add.text(width / 2, 778, 'TOUCH & DRAG HANDLE', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5);

    // Ball (Birthday Cake Puck)
    this.ball = this.physics.add.sprite(width / 2, midY, 'pong_ball');
    this.ball.setCollideWorldBounds(true);
    this.ball.setBounce(1, 1);
    this.ball.body.allowGravity = false;

    // Ball wall bounce sound
    this.physics.world.on('worldbounds', (body, up, down, left, right) => {
      if (body.gameObject === this.ball && (left || right)) {
        audio.playBounce();
      }
    });

    // 4. Touch & Drag Controls
    // Wide touch zone across bottom 25% of screen
    const touchZoneHeight = 160;
    const touchZone = this.add.zone(width / 2, height - touchZoneHeight / 2, width, touchZoneHeight)
      .setInteractive({ useHandCursor: true });

    const movePaddleTo = (pointerX) => {
      const minX = 16 + this.playerPaddle.width / 2;
      const maxX = width - 16 - this.playerPaddle.width / 2;
      const clampedX = Phaser.Math.Clamp(pointerX, minX, maxX);
      this.playerPaddle.x = clampedX;
      this.paddleGrip.x = clampedX;
      if (this.gripLabel) this.gripLabel.x = clampedX;
    };

    touchZone.on('pointerdown', (pointer) => movePaddleTo(pointer.x));
    touchZone.on('pointermove', (pointer) => {
      if (pointer.isDown) movePaddleTo(pointer.x);
    });

    // Keyboard Fallback (Arrows / A & D)
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keyA = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    // 5. Collisions
    this.physics.add.collider(this.ball, this.playerPaddle, this.hitPlayerPaddle, null, this);
    this.physics.add.collider(this.ball, this.aiPaddle, this.hitAiPaddle, null, this);

    // 6. Show Level 1 / Match 1 How-to-Play Controls Overlay
    ControlsOverlay.show(this, 'pong', () => {
      this.startServe();
    });
  }

  update(time, delta) {
    if (!this.gameActive) return;

    // Keyboard Movement
    const speed = 400;
    const dt = delta / 1000;
    if (this.cursors?.left.isDown || this.keyA?.isDown) {
      this.movePaddleRelative(-speed * dt);
    } else if (this.cursors?.right.isDown || this.keyD?.isDown) {
      this.movePaddleRelative(speed * dt);
    }

    // AI Opponent Movement
    this.updateAI(delta);

    // Out of bounds check (Scoring)
    if (this.ball.y > this.playerPaddle.y + 35) {
      this.scorePoint('ai');
    } else if (this.ball.y < this.aiPaddle.y - 35) {
      this.scorePoint('player');
    }
  }

  movePaddleRelative(dx) {
    const width = this.cameras.main.width;
    const minX = 16 + this.playerPaddle.width / 2;
    const maxX = width - 16 - this.playerPaddle.width / 2;
    const targetX = Phaser.Math.Clamp(this.playerPaddle.x + dx, minX, maxX);
    this.playerPaddle.x = targetX;
    this.paddleGrip.x = targetX;
    if (this.gripLabel) this.gripLabel.x = targetX;
  }

  updateAI(delta) {
    // Smooth tracking toward ball X with reaction speed
    const diff = this.ball.x - this.aiPaddle.x;
    const aiMaxSpeed = 260 + (this.rallyCount * 8); // Scales with rally
    const step = aiMaxSpeed * (delta / 1000);

    if (Math.abs(diff) > 10) {
      const move = Math.sign(diff) * Math.min(Math.abs(diff), step);
      const width = this.cameras.main.width;
      const minX = 16 + this.aiPaddle.width / 2;
      const maxX = width - 16 - this.aiPaddle.width / 2;
      this.aiPaddle.x = Phaser.Math.Clamp(this.aiPaddle.x + move, minX, maxX);
    }
  }

  hitPlayerPaddle(ball, paddle) {
    audio.playPongPaddleHit();
    this.rallyCount++;
    this.rallyText.setText(`Rally: ${this.rallyCount} • First to 7 Wins!`);

    // Calculate deflection angle based on hit location (-60 to +60 deg)
    const diff = (ball.x - paddle.x) / (paddle.width / 2);
    const angle = diff * (Math.PI / 3);

    // Increase speed per rally
    this.ballSpeed = Math.min(650, this.ballSpeed * 1.04);
    ball.setVelocity(
      this.ballSpeed * Math.sin(angle),
      -this.ballSpeed * Math.cos(angle)
    );
  }

  hitAiPaddle(ball, paddle) {
    audio.playPongPaddleHit();
    this.rallyCount++;
    this.rallyText.setText(`Rally: ${this.rallyCount} • First to 7 Wins!`);

    const diff = (ball.x - paddle.x) / (paddle.width / 2);
    const angle = diff * (Math.PI / 3);

    this.ballSpeed = Math.min(650, this.ballSpeed * 1.04);
    ball.setVelocity(
      this.ballSpeed * Math.sin(angle),
      this.ballSpeed * Math.cos(angle)
    );
  }

  startServe(server = 'player') {
    const width = this.cameras.main.width;
    const midY = (76 + this.cameras.main.height - 84) / 2;

    this.ball.setPosition(width / 2, midY);
    this.ball.setVelocity(0, 0);
    this.rallyCount = 0;
    this.rallyText.setText(`Rally: 0 • First to 7 Wins!`);
    this.ballSpeed = this.ballBaseSpeed;

    this.time.delayedCall(700, () => {
      this.gameActive = true;
      const dirY = server === 'player' ? 1 : -1;
      const angle = Phaser.Math.FloatBetween(-0.4, 0.4);
      this.ball.setVelocity(
        this.ballSpeed * Math.sin(angle),
        dirY * this.ballSpeed * Math.cos(angle)
      );
    });
  }

  scorePoint(scorer) {
    this.gameActive = false;
    this.ball.setVelocity(0, 0);

    if (scorer === 'player') {
      this.playerScore++;
      audio.playPongScore();
    } else {
      this.aiScore++;
      audio.playExplosion();
    }

    this.scoreText.setText(`ALLAN: ${this.playerScore}  •  DECADES: ${this.aiScore}`);

    // Check Win/Loss (First to 7)
    if (this.playerScore >= 7) {
      this.handleMatchEnd(true);
    } else if (this.aiScore >= 7) {
      this.handleMatchEnd(false);
    } else {
      this.startServe(scorer === 'player' ? 'ai' : 'player');
    }
  }

  handleMatchEnd(playerWon) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    if (playerWon) {
      audio.playVictory();
    } else {
      audio.playGameOver();
    }

    const modal = this.add.container(width / 2, height / 2);
    modal.setDepth(2000);

    const mBg = this.add.graphics();
    mBg.fillStyle(0x0f172a, 0.96);
    mBg.fillRoundedRect(-180, -130, 360, 260, 16);
    mBg.lineStyle(3, playerWon ? 0x22c55e : 0xef4444, 1);
    mBg.strokeRoundedRect(-180, -130, 360, 260, 16);
    modal.add(mBg);

    const resultEmoji = playerWon ? '🏆 70 WINS! 🎉' : '🏁 MATCH OVER';
    const title = this.add.text(0, -80, resultEmoji, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '22px',
      fontWeight: 'bold',
      color: playerWon ? '#ffd700' : '#ef4444'
    }).setOrigin(0.5);

    const sub = this.add.text(0, -40, playerWon
      ? 'Allan defeated the Decades!\nHappy 70th Birthday!'
      : 'Good rally! The Decades took this one.', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      color: '#cbd5e1',
      align: 'center'
    }).setOrigin(0.5);

    const finalScore = this.add.text(0, 0, `Final Score: ${this.playerScore} - ${this.aiScore}`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5);

    modal.add([title, sub, finalScore]);

    // Play Again Button
    const playAgainBtn = this.add.container(0, 50);
    const pBg = this.add.graphics();
    pBg.fillStyle(0x22c55e, 1);
    pBg.fillRoundedRect(-120, -18, 240, 36, 10);
    playAgainBtn.add(pBg);
    const pText = this.add.text(0, 0, 'PLAY AGAIN ▶', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    playAgainBtn.add(pText);
    playAgainBtn.setSize(240, 36);
    playAgainBtn.setInteractive({ useHandCursor: true });
    playAgainBtn.on('pointerdown', () => {
      audio.playShoot();
      this.scene.restart();
    });
    modal.add(playAgainBtn);

    // Menu Button
    const menuBtn = this.add.container(0, 95);
    const mBtnBg = this.add.graphics();
    mBtnBg.fillStyle(0x1e293b, 1);
    mBtnBg.fillRoundedRect(-120, -16, 240, 32, 8);
    mBtnBg.lineStyle(1.5, 0x64748b, 1);
    mBtnBg.strokeRoundedRect(-120, -16, 240, 32, 8);
    menuBtn.add(mBtnBg);
    const mText = this.add.text(0, 0, 'BACK TO ARCADE', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#cbd5e1'
    }).setOrigin(0.5);
    menuBtn.add(mText);
    menuBtn.setSize(240, 32);
    menuBtn.setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => {
      audio.playShoot();
      this.scene.start('GameSelect');
    });
    modal.add(menuBtn);
  }
}
