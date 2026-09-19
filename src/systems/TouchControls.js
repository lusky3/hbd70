// src/systems/TouchControls.js
// Mobile virtual joystick + fire/mine touch buttons + desktop keyboard/mouse fallback

export class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.moveVector = new Phaser.Math.Vector2(0, 0);
    this.aimVector = new Phaser.Math.Vector2(0, -1);
    this.isFiring = false;
    this.wantsMine = false;

    // Joystick state
    this.joystickBase = null;
    this.joystickThumb = null;
    this.joystickPointer = null;
    this.joystickCenter = { x: 100, y: 720 };
    this.maxDistance = 45;

    // Buttons
    this.fireBtn = null;
    this.mineBtn = null;

    // Desktop controls
    this.cursors = null;
    this.wasd = null;
    this.spaceKey = null;
    this.mineKey = null;

    this.create();
  }

  create() {
    const { width, height } = this.scene.cameras.main;

    // 1. Desktop keyboard keys
    if (this.scene.input.keyboard) {
      this.cursors = this.scene.input.keyboard.createCursorKeys();
      this.wasd = this.scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
      });
      this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.mineKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    }

    // 2. Control Zone Separator Bar
    const controlBar = this.scene.add.graphics();
    controlBar.fillStyle(0x1e293b, 0.85);
    controlBar.fillRect(0, 615, width, height - 615);
    controlBar.lineStyle(2, 0x475569, 0.8);
    controlBar.lineBetween(0, 615, width, 615);
    controlBar.setDepth(90);

    // 3. Left Virtual Joystick (Move)
    this.joystickBase = this.scene.add.circle(this.joystickCenter.x, this.joystickCenter.y, 50, 0x334155, 0.6);
    this.joystickBase.setStrokeStyle(3, 0x94a3b8, 0.8);
    this.joystickBase.setDepth(95);

    this.joystickThumb = this.scene.add.circle(this.joystickCenter.x, this.joystickCenter.y, 24, 0x38bdf8, 0.9);
    this.joystickThumb.setStrokeStyle(2, 0xffffff, 0.9);
    this.joystickThumb.setDepth(96);

    // Joystick touch handling
    this.scene.input.on('pointerdown', (pointer) => {
      if (pointer.y > 615 && pointer.x < width * 0.48) {
        this.joystickPointer = pointer;
        this.updateJoystick(pointer);
      }
    });

    this.scene.input.on('pointermove', (pointer) => {
      if (this.joystickPointer && this.joystickPointer.id === pointer.id) {
        this.updateJoystick(pointer);
      }
    });

    const resetJoystick = (pointer) => {
      if (this.joystickPointer && this.joystickPointer.id === pointer.id) {
        this.joystickPointer = null;
        this.joystickThumb.setPosition(this.joystickCenter.x, this.joystickCenter.y);
        this.moveVector.set(0, 0);
      }
    };

    this.scene.input.on('pointerup', resetJoystick);
    this.scene.input.on('pointerupoutside', resetJoystick);

    // 4. Right Side Buttons (Fire & Mine)
    // Fire Button (Large round button)
    const fireX = width - 85;
    const fireY = 720;
    this.fireBtn = this.scene.add.circle(fireX, fireY, 38, 0xef4444, 0.85);
    this.fireBtn.setStrokeStyle(3, 0xfca5a5, 0.9);
    this.fireBtn.setInteractive({ useHandCursor: true });
    this.fireBtn.setDepth(95);

    const fireText = this.scene.add.text(fireX, fireY, 'FIRE', {
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(96);

    this.fireBtn.on('pointerdown', () => {
      this.isFiring = true;
      this.fireBtn.setScale(0.9);
    });
    this.fireBtn.on('pointerup', () => {
      this.isFiring = false;
      this.fireBtn.setScale(1.0);
    });
    this.fireBtn.on('pointerout', () => {
      this.isFiring = false;
      this.fireBtn.setScale(1.0);
    });

    // Mine Button (Smaller circular button with bomb icon)
    const mineX = width - 170;
    const mineY = 730;
    this.mineBtn = this.scene.add.circle(mineX, mineY, 28, 0xf59e0b, 0.85);
    this.mineBtn.setStrokeStyle(2, 0xfde68a, 0.9);
    this.mineBtn.setInteractive({ useHandCursor: true });
    this.mineBtn.setDepth(95);

    const mineText = this.scene.add.text(mineX, mineY, 'MINE', {
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#000000'
    }).setOrigin(0.5).setDepth(96);

    this.mineBtn.on('pointerdown', () => {
      this.wantsMine = true;
      this.mineBtn.setScale(0.9);
    });
    this.mineBtn.on('pointerup', () => {
      this.mineBtn.setScale(1.0);
    });

    // 5. Arena Direct Aim: Tap/drag anywhere in combat arena (y <= 615) aims and fires
    this.arenaPointerId = null;

    this.scene.input.on('pointerdown', (pointer) => {
      if (pointer.y <= 615) {
        this.arenaPointerId = pointer.id;
        this.updateAimToPoint(pointer.x, pointer.y);
        this.isFiring = true;
      }
    });

    this.scene.input.on('pointermove', (pointer) => {
      if (pointer.y <= 615) {
        this.updateAimToPoint(pointer.x, pointer.y);
      }
    });

    this.scene.input.on('pointerup', (pointer) => {
      if (pointer.id === this.arenaPointerId) {
        this.arenaPointerId = null;
        this.isFiring = false;
      }
    });
  }

  updateJoystick(pointer) {
    const dx = pointer.x - this.joystickCenter.x;
    const dy = pointer.y - this.joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const angle = Math.atan2(dy, dx);
      const clampedDist = Math.min(dist, this.maxDistance);
      const thumbX = this.joystickCenter.x + Math.cos(angle) * clampedDist;
      const thumbY = this.joystickCenter.y + Math.sin(angle) * clampedDist;

      this.joystickThumb.setPosition(thumbX, thumbY);

      // Dead zone (8px)
      if (dist > 8) {
        this.moveVector.set(Math.cos(angle), Math.sin(angle));
      } else {
        this.moveVector.set(0, 0);
      }
    }
  }

  updateAimToPoint(targetX, targetY) {
    if (!this.scene.player) return;
    const playerX = this.scene.player.x;
    const playerY = this.scene.player.y;
    const dx = targetX - playerX;
    const dy = targetY - playerY;
    if (dx !== 0 || dy !== 0) {
      this.aimVector.set(dx, dy).normalize();
    }
  }

  update() {
    // Desktop keyboard updates
    let kx = 0;
    let ky = 0;

    if (this.cursors && this.wasd) {
      if (this.cursors.left.isDown || this.wasd.left.isDown) kx -= 1;
      if (this.cursors.right.isDown || this.wasd.right.isDown) kx += 1;
      if (this.cursors.up.isDown || this.wasd.up.isDown) ky -= 1;
      if (this.cursors.down.isDown || this.wasd.down.isDown) ky += 1;

      if (kx !== 0 || ky !== 0) {
        this.moveVector.set(kx, ky).normalize();
      } else if (!this.joystickPointer) {
        this.moveVector.set(0, 0);
      }

      if (this.spaceKey && this.spaceKey.isDown) {
        this.isFiring = true;
      }
      if (this.mineKey && Phaser.Input.Keyboard.JustDown(this.mineKey)) {
        this.wantsMine = true;
      }
    }
  }
}
