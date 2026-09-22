// src/scenes/ControlsOverlay.js
// Intuitive "How to Play" controls instruction modal shown at Level 1 / Match 1

import { audio } from '../systems/AudioManager.js';

export class ControlsOverlay {
  /**
   * Display modal controls overlay in the given Phaser scene
   * @param {Phaser.Scene} scene
   * @param {'tanks'|'pong'|'invaders'|'asteroids'} gameType
   * @param {Function} onStart - Callback invoked when player taps "START GAME"
   */
  static show(scene, gameType, onStart) {
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;

    // Semi-transparent dark veil
    const overlayBg = scene.add.rectangle(width / 2, height / 2, width, height, 0x050814, 0.88);
    overlayBg.setDepth(1000);
    overlayBg.setInteractive(); // Blocks input underneath

    const container = scene.add.container(width / 2, height / 2);
    container.setDepth(1001);

    // Card frame
    const cardWidth = 430;
    const cardHeight = 560;
    const cardBg = scene.add.graphics();
    cardBg.fillStyle(0x0f172a, 0.98);
    cardBg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 18);
    cardBg.lineStyle(3, 0x38bdf8, 1);
    cardBg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 18);
    container.add(cardBg);

    // Header badge
    const headerBg = scene.add.graphics();
    headerBg.fillStyle(0x1e293b, 1);
    headerBg.fillRoundedRect(-150, -cardHeight / 2 - 16, 300, 36, 12);
    headerBg.lineStyle(2, 0xffd700, 1);
    headerBg.strokeRoundedRect(-150, -cardHeight / 2 - 16, 300, 36, 12);
    container.add(headerBg);

    const headerText = scene.add.text(0, -cardHeight / 2 + 2, 'HOW TO PLAY', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#ffd700',
      letterSpacing: 2
    }).setOrigin(0.5);
    container.add(headerText);

    const config = ControlsOverlay.getConfig(gameType);

    // Title
    const title = scene.add.text(0, -cardHeight / 2 + 48, config.title, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    container.add(title);

    // Subtitle / Goal
    const subtitle = scene.add.text(0, -cardHeight / 2 + 82, config.subtitle, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      color: '#94a3b8',
      align: 'center',
      wordWrap: { width: cardWidth - 40 }
    }).setOrigin(0.5);
    container.add(subtitle);

    // Divider
    const divider = scene.add.graphics();
    divider.lineStyle(1, 0x334155, 1);
    divider.lineBetween(-cardWidth / 2 + 30, -cardHeight / 2 + 108, cardWidth / 2 - 30, -cardHeight / 2 + 108);
    container.add(divider);

    // Section 1: Touch Controls
    const touchHeader = scene.add.text(-cardWidth / 2 + 30, -cardHeight / 2 + 120, '📱 TOUCH CONTROLS', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#38bdf8'
    });
    container.add(touchHeader);

    let currentY = -cardHeight / 2 + 148;
    config.touchInstructions.forEach((item) => {
      const icon = scene.add.text(-cardWidth / 2 + 30, currentY, item.icon, {
        fontSize: '18px'
      });
      const desc = scene.add.text(-cardWidth / 2 + 65, currentY + 1, item.desc, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        color: '#f8fafc',
        wordWrap: { width: cardWidth - 105 },
        lineSpacing: 3
      });
      container.add([icon, desc]);
      currentY += desc.height + 12;
    });

    currentY += 8;

    // Section 2: Desktop / Keyboard Controls
    const keyHeader = scene.add.text(-cardWidth / 2 + 30, currentY, '⌨️ KEYBOARD CONTROLS', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#22c55e'
    });
    container.add(keyHeader);
    currentY += 26;

    const keyDesc = scene.add.text(-cardWidth / 2 + 30, currentY, config.keyboard, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      color: '#cbd5e1',
      wordWrap: { width: cardWidth - 60 },
      lineSpacing: 4
    });
    container.add(keyDesc);

    // START GAME Button
    const btnWidth = 240;
    const btnHeight = 48;
    const btnY = cardHeight / 2 - 45;

    const startBtn = scene.add.graphics();
    startBtn.fillStyle(0x22c55e, 1);
    startBtn.fillRoundedRect(-btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 14);
    startBtn.lineStyle(2, 0x86efac, 1);
    startBtn.strokeRoundedRect(-btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 14);
    container.add(startBtn);

    const btnText = scene.add.text(0, btnY, 'START GAME ▶', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    container.add(btnText);

    // Button pulse
    scene.tweens.add({
      targets: [startBtn, btnText],
      scale: 1.04,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    let isDismissed = false;
    const dismissOverlay = () => {
      if (isDismissed) return;
      isDismissed = true;

      audio.init();
      audio.playShoot();

      scene.tweens.killTweensOf([startBtn, btnText]);
      scene.tweens.add({
        targets: [overlayBg, container],
        alpha: 0,
        scale: 0.95,
        duration: 200,
        onComplete: () => {
          overlayBg.destroy();
          container.destroy();
          hitZone.destroy();
          if (typeof onStart === 'function') {
            onStart();
          }
        }
      });
    };

    const worldBtnY = height / 2 + btnY;
    const hitZone = scene.add.zone(width / 2, worldBtnY, btnWidth, btnHeight)
      .setInteractive({ useHandCursor: true })
      .setDepth(1005);

    hitZone.on('pointerdown', dismissOverlay);
    btnText.setInteractive({ useHandCursor: true });
    btnText.on('pointerdown', dismissOverlay);

    if (scene.input && scene.input.keyboard) {
      scene.input.keyboard.once('keydown-SPACE', dismissOverlay);
      scene.input.keyboard.once('keydown-ENTER', dismissOverlay);
    }
  }

  static getConfig(gameType) {
    switch (gameType) {
      case 'pong':
        return {
          title: '🏓 BIRTHDAY PONG',
          subtitle: 'Allan vs The Decades — First to 7 points wins!',
          touchInstructions: [
            {
              icon: '🖐️',
              desc: 'Drag the blue Grip Tab (≡ GRIP ≡) below the paddle. Dragging here keeps your finger from blocking the ball!'
            },
            {
              icon: '📐',
              desc: 'Angle deflection: Hit near the edges of your paddle to send sharp angled cut shots past the CPU.'
            },
            {
              icon: '⚡',
              desc: 'Rallies get faster and faster with every return!'
            }
          ],
          keyboard: '• Left / Right Arrow keys or A / D to slide your paddle.'
        };

      case 'invaders':
        return {
          title: '👾 SPACE INVADERS',
          subtitle: 'Defend Allan\'s 70-year milestone bunkers from descending invaders!',
          touchInstructions: [
            {
              icon: '◀ ▶',
              desc: 'Use bottom Left & Right arrows (or drag anywhere on the bottom lane) to steer cannon.'
            },
            {
              icon: '🔥',
              desc: 'Tap [FIRE] button to shoot candles, cakes, and trains.'
            },
            {
              icon: '🛡️',
              desc: 'Take cover behind the 4 milestone decade bunkers (1956, 1976, 1996, 2026).'
            },
            {
              icon: '🚂',
              desc: 'Shoot the mystery vintage CN Railcar passing at the top for bonus points!'
            }
          ],
          keyboard: '• Left / Right Arrows (or A/D) to move • Spacebar to fire.'
        };

      case 'asteroids':
        return {
          title: '🚀 BIRTHDAY ASTEROIDS',
          subtitle: 'Pilot Allan\'s Cruiser through deep space and shatter birthday meteorites!',
          touchInstructions: [
            {
              icon: '🔄',
              desc: 'Tap ⟲ / ⟳ Rotate buttons to steer your space cruiser 360°.'
            },
            {
              icon: '▲',
              desc: 'Tap ▲ THRUST to accelerate with realistic zero-gravity inertia.'
            },
            {
              icon: '💥',
              desc: 'Tap [FIRE] to shoot laser bolts and split giant "70" asteroids into smaller chunks.'
            },
            {
              icon: '🌀',
              desc: 'Screen Wrap: Flying off any screen edge wraps you to the opposite side!'
            }
          ],
          keyboard: '• Left / Right to rotate • Up Arrow / W to thrust • Spacebar to fire.'
        };

      case 'tanks':
      default:
        return {
          title: '🏍️ BIRTHDAY TANKS!',
          subtitle: 'Allan\'s Cruiser Tank 70-Level Odyssey through 7 Decades (1956-2026)',
          touchInstructions: [
            {
              icon: '🕹️',
              desc: 'Left Joystick: Drag to steer and drive Allan\'s cruiser.'
            },
            {
              icon: '🎯',
              desc: 'Right Trackpad / Tap Arena: Tap anywhere to aim front turret and shoot.'
            },
            {
              icon: '💣',
              desc: 'Tap [MINE] button to plant explosive traps for chasing tanks.'
            },
            {
              icon: '🧱',
              desc: 'Indestructible stone walls reflect bullets — use ricochets to hit enemies behind cover!'
            }
          ],
          keyboard: '• WASD / Arrows to move • Click mouse to aim/fire • Space to drop mine.'
        };
    }
  }
}
