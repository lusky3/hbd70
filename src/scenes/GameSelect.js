// src/scenes/GameSelect.js
// Arcade Cabinet Game Selection Menu Hub for Allan's 70th Birthday

import { audio } from '../systems/AudioManager.js';
import { storage } from '../systems/Storage.js';
import { APP_VERSION } from '../version.js';

export class GameSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameSelect' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const progress = storage.getProgress();

    // 1. Dark Retro Arcade Cabinet Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0f1d, 0x0a0f1d, 0x111827, 0x111827, 1);
    bg.fillRect(0, 0, width, height);

    // Subtle arcade neon grid lines
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1e293b, 0.4);
    for (let y = 0; y < height; y += 40) {
      grid.lineBetween(0, y, width, y);
    }
    for (let x = 0; x < width; x += 40) {
      grid.lineBetween(x, 0, x, height);
    }

    // 2. Top Header Bar
    const headerBar = this.add.graphics();
    headerBar.fillStyle(0x0f172a, 0.95);
    headerBar.fillRect(0, 0, width, 68);
    headerBar.lineStyle(2, 0x38bdf8, 0.8);
    headerBar.lineBetween(0, 68, width, 68);

    // Back Button
    const backBtn = this.add.container(20, 34);
    const backBg = this.add.graphics();
    backBg.fillStyle(0x1e293b, 1);
    backBg.fillRoundedRect(0, -18, 70, 36, 8);
    backBg.lineStyle(1.5, 0x64748b, 1);
    backBg.strokeRoundedRect(0, -18, 70, 36, 8);
    backBtn.add(backBg);

    const backText = this.add.text(35, 0, '< BACK', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#cbd5e1'
    }).setOrigin(0.5);
    backBtn.add(backText);

    const backZone = this.add.zone(35, 0, 70, 36).setInteractive({ useHandCursor: true });
    backBtn.add(backZone);
    backZone.on('pointerdown', () => {
      audio.playShoot();
      this.scene.start('Splash');
    });
    backZone.on('pointerover', () => {
      backBg.clear();
      backBg.fillStyle(0x334155, 1);
      backBg.fillRoundedRect(0, -18, 70, 36, 8);
      backBg.lineStyle(1.5, 0x94a3b8, 1);
      backBg.strokeRoundedRect(0, -18, 70, 36, 8);
      backText.setColor('#ffffff');
    });
    backZone.on('pointerout', () => {
      backBg.clear();
      backBg.fillStyle(0x1e293b, 1);
      backBg.fillRoundedRect(0, -18, 70, 36, 8);
      backBg.lineStyle(1.5, 0x64748b, 1);
      backBg.strokeRoundedRect(0, -18, 70, 36, 8);
      backText.setColor('#cbd5e1');
    });

    // Cabinet Title
    this.add.text(width / 2, 24, "ALLAN'S 70th ARCADE", {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#ffd700',
      letterSpacing: 2
    }).setOrigin(0.5);

    this.add.text(width / 2, 48, 'SELECT A RETRO GAME TO PLAY', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: '600',
      color: '#94a3b8',
      letterSpacing: 1
    }).setOrigin(0.5);

    // Mute/Audio Button
    const muteBtn = this.add.container(width - 48, 34);
    const muteText = this.add.text(0, 0, audio.isMuted ? '🔇' : '🔊', {
      fontSize: '20px'
    }).setOrigin(0.5);
    muteBtn.add(muteText);
    const muteZone = this.add.zone(0, 0, 44, 44).setInteractive({ useHandCursor: true });
    muteBtn.add(muteZone);
    muteZone.on('pointerdown', () => {
      audio.toggleMute();
      muteText.setText(audio.isMuted ? '🔇' : '🔊');
    });

    // 3. Game Cards Container / Layout
    const arcadeStats = storage.getArcadeStats();

    const pongStats = arcadeStats.pong;
    const pongPlayed = (pongStats.wins + pongStats.losses) > 0;
    const pongStatus = pongPlayed
      ? `Record: ${pongStats.wins}W - ${pongStats.losses}L • Best Rally: ${pongStats.longestRally}`
      : 'Rally Tennis • First to 7 Points Wins!';

    const invStats = arcadeStats.invaders;
    const invPlayed = invStats.highScore > 0;
    const invStatus = invPlayed
      ? `High Score: ${invStats.highScore.toLocaleString()} • Wave ${invStats.highestWave}`
      : 'Cakes, Candles & Mystery Railcars';

    const astStats = arcadeStats.asteroids;
    const astPlayed = astStats.highScore > 0;
    const astStatus = astPlayed
      ? `High Score: ${astStats.highScore.toLocaleString()} • Wave ${astStats.highestWave}`
      : 'Shatter Giant 70 Deep Space Rocks';

    const poolStats = arcadeStats.pool || {};
    const p8 = poolStats.pool_8ball || { wins: 0, losses: 0, highScore: 0 };
    const poolPlayed = (p8.wins + p8.losses > 0) || (p8.highScore > 0);
    const poolStatus = poolPlayed
      ? `8-Ball Record: ${p8.wins}W - ${p8.losses}L • Best Score: ${p8.highScore.toLocaleString()}`
      : '8-Ball, 9-Ball, Straight & Speed Pool';

    const cards = [
      {
        id: 'tanks',
        icon: '🏍️',
        title: 'BIRTHDAY TANKS!',
        subtitle: '70 Milestone Levels • Bosses • Cheats',
        accentColor: 0x22c55e,
        borderColor: 0x86efac,
        statusText: `Progress: Level ${progress.unlockedLevel}/70 (${progress.beatenLevels.length} Beaten)`,
        onPlay: () => {
          audio.playShoot();
          this.scene.start('LevelCard', {
            levelNum: progress.unlockedLevel,
            lives: 3,
            tanksDefeated: 0
          });
        },
        hasExtra: true,
        extraText: 'LEVELS',
        onExtra: () => {
          audio.playShoot();
          this.scene.start('LevelSelect');
        }
      },
      {
        id: 'pong',
        icon: '🏓',
        title: 'BIRTHDAY PONG',
        subtitle: 'Allan vs The Decades • Touch Grip Handle',
        accentColor: 0x0284c7,
        borderColor: 0x38bdf8,
        statusText: pongStatus,
        onPlay: () => {
          audio.playShoot();
          this.scene.start('Pong');
        }
      },
      {
        id: 'invaders',
        icon: '👾',
        title: 'SPACE INVADERS',
        subtitle: 'Defend Milestone Bunkers (1956-2026)',
        accentColor: 0xa855f7,
        borderColor: 0xc084fc,
        statusText: invStatus,
        onPlay: () => {
          audio.playShoot();
          this.scene.start('SpaceInvaders');
        }
      },
      {
        id: 'asteroids',
        icon: '🚀',
        title: 'BIRTHDAY ASTEROIDS',
        subtitle: "Allan's Space Cruiser • 360° Vector Thrust",
        accentColor: 0xeab308,
        borderColor: 0xfde047,
        statusText: astStatus,
        onPlay: () => {
          audio.playShoot();
          this.scene.start('Asteroids');
        }
      },
      {
        id: 'pool',
        icon: '🎱',
        title: 'BIRTHDAY POOL',
        subtitle: 'Pocket Billiards • VS CPU & Multiplayer',
        accentColor: 0x10b981,
        borderColor: 0x34d399,
        statusText: poolStatus,
        onPlay: () => {
          audio.playShoot();
          this.scene.start('Pool');
        }
      }
    ];

    this.cards = cards;
    const cardStartX = width / 2;
    const cardStartY = 135;
    const cardSpacing = 120;

    cards.forEach((item, index) => {
      const cy = cardStartY + (index * cardSpacing);
      this.createGameCard(cardStartX, cy, item);
    });

    // 3.5 Action Bar: Multiplayer & Global Leaderboard Buttons
    const btnY = 755;
    const btnW = 206;
    const btnH = 40;

    // A. Multiplayer Button (Left)
    const mpBtn = this.add.container(width / 2 - btnW / 2 - 6, btnY);
    const mpBg = this.add.graphics();
    mpBg.fillStyle(0x0f172a, 0.95);
    mpBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
    mpBg.lineStyle(1.5, 0x38bdf8, 0.85);
    mpBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
    mpBtn.add(mpBg);

    const mpText = this.add.text(0, 0, '🌐 MULTIPLAYER (2-4P)', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#38bdf8',
      letterSpacing: 1
    }).setOrigin(0.5);
    mpBtn.add(mpText);

    const mpZone = this.add.zone(0, 0, btnW, btnH + 4).setInteractive({ useHandCursor: true });
    mpBtn.add(mpZone);
    mpZone.on('pointerdown', () => {
      audio.playShoot?.();
      this.scene.start('MultiplayerLobby', { returnScene: 'GameSelect' });
    });
    mpZone.on('pointerover', () => {
      mpBg.clear();
      mpBg.fillStyle(0x0369a1, 1);
      mpBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
      mpBg.lineStyle(2, 0x38bdf8, 1);
      mpBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
    });
    mpZone.on('pointerout', () => {
      mpBg.clear();
      mpBg.fillStyle(0x0f172a, 0.95);
      mpBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
      mpBg.lineStyle(1.5, 0x38bdf8, 0.85);
      mpBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
    });

    // B. Global Leaderboard Button (Right)
    const lbBtn = this.add.container(width / 2 + btnW / 2 + 6, btnY);
    const lbBg = this.add.graphics();
    lbBg.fillStyle(0x0f172a, 0.95);
    lbBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
    lbBg.lineStyle(1.5, 0xfacc15, 0.85);
    lbBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
    lbBtn.add(lbBg);

    const lbText = this.add.text(0, 0, '🏆 HIGH SCORES', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#facc15',
      letterSpacing: 1
    }).setOrigin(0.5);
    lbBtn.add(lbText);

    const lbZone = this.add.zone(0, 0, btnW, btnH + 4).setInteractive({ useHandCursor: true });
    lbBtn.add(lbZone);

    lbZone.on('pointerdown', () => {
      audio.playShoot?.();
      this.scene.launch('LeaderboardModal', { gameId: 'tanks', returnScene: 'GameSelect' });
    });
    lbZone.on('pointerover', () => {
      lbBg.clear();
      lbBg.fillStyle(0x1e293b, 1);
      lbBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
      lbBg.lineStyle(2, 0xfacc15, 1);
      lbBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
    });
    lbZone.on('pointerout', () => {
      lbBg.clear();
      lbBg.fillStyle(0x0f172a, 0.95);
      lbBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
      lbBg.lineStyle(1.5, 0xfacc15, 0.85);
      lbBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
    });

    // 4. Footer with Version & Credits Link
    const footerY = height - 28;
    this.add.text(20, footerY, `v${APP_VERSION}`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#64748b'
    }).setOrigin(0, 0.5);

    this.add.text(width / 2 + 10, footerY, 'Honoring Allan Lusk • 1956 to 2026', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      color: '#64748b'
    }).setOrigin(0.5);

    const creditsLink = this.add.container(width - 24, footerY);
    const creditsText = this.add.text(0, 0, 'Credits 📜', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: '600',
      color: '#94a3b8'
    }).setOrigin(1, 0.5);

    creditsLink.add(creditsText);
    const creditsZone = this.add.zone(-37.5, 0, 85, 36).setInteractive({ useHandCursor: true });
    creditsLink.add(creditsZone);
    creditsZone.on('pointerdown', () => {
      audio.playShoot();
      this.scene.start('Credits', { returnScene: 'GameSelect' });
    });
    creditsZone.on('pointerover', () => creditsText.setColor('#ffd700'));
    creditsZone.on('pointerout', () => creditsText.setColor('#94a3b8'));

    // 5. Retroactive High Score Import Check
    if (!storage.isMigrationCompleted() && !storage.isMigrationDismissed()) {
      const unmigrated = storage.getUnmigratedLocalScores();
      if (unmigrated.length > 0) {
        this.time.delayedCall(250, () => {
          if (this.sys && this.sys.isActive() && this.scene.isActive()) {
            this.scene.launch('RetroactiveImportModal', { returnScene: 'GameSelect' });
          }
        });
      }
    }

    // 6. Check for auto-join URL query parameter (?room=XXXX or ?join=XXXX)
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const roomCode = params.get('room') || params.get('join');
      if (roomCode) {
        window.history.replaceState({}, document.title, window.location.pathname);
        this.time.delayedCall(100, () => {
          this.scene.start('MultiplayerLobby', { mode: 'join', roomCode, returnScene: 'GameSelect' });
        });
      }
    }
  }

  createGameCard(x, y, data) {
    const cardWidth = 430;
    const cardHeight = 110;

    const container = this.add.container(x, y);

    // Card background
    const bg = this.add.graphics();
    bg.fillStyle(0x1e293b, 0.95);
    bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 12);
    bg.lineStyle(2, data.borderColor, 0.9);
    bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 12);
    container.add(bg);

    // Icon circle (vertically centered on left)
    const iconCircle = this.add.graphics();
    iconCircle.fillStyle(data.accentColor, 0.2);
    iconCircle.fillCircle(-cardWidth / 2 + 32, 0, 20);
    iconCircle.lineStyle(1.5, data.borderColor, 0.8);
    iconCircle.strokeCircle(-cardWidth / 2 + 32, 0, 20);
    container.add(iconCircle);

    const icon = this.add.text(-cardWidth / 2 + 32, 0, data.icon, {
      fontSize: '20px'
    }).setOrigin(0.5);
    container.add(icon);

    // Title
    const title = this.add.text(-cardWidth / 2 + 62, -cardHeight / 2 + 15, data.title, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '15px',
      fontWeight: 'bold',
      color: '#ffffff',
      letterSpacing: 1
    });
    container.add(title);

    // Subtitle
    const subtitle = this.add.text(-cardWidth / 2 + 62, -cardHeight / 2 + 36, data.subtitle, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      color: '#cbd5e1'
    });
    container.add(subtitle);

    // Status line
    const status = this.add.text(-cardWidth / 2 + 62, cardHeight / 2 - 24, data.statusText, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '11px',
      fontWeight: '600',
      color: '#38bdf8'
    });
    container.add(status);

    // Buttons (vertically centered on right)
    if (data.hasExtra) {
      // Secondary button (LEVELS)
      const extraBtnX = cardWidth / 2 - 134;
      const extraBg = this.add.graphics();
      extraBg.fillStyle(0x0f172a, 1);
      extraBg.fillRoundedRect(extraBtnX - 35, -15, 70, 30, 6);
      extraBg.lineStyle(1.5, 0x38bdf8, 1);
      extraBg.strokeRoundedRect(extraBtnX - 35, -15, 70, 30, 6);
      container.add(extraBg);

      const extraText = this.add.text(extraBtnX, 0, data.extraText, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '11px',
        fontWeight: 'bold',
        color: '#38bdf8'
      }).setOrigin(0.5);
      container.add(extraText);

      const extraHit = this.add.zone(extraBtnX, 0, 70, 30)
        .setInteractive({ useHandCursor: true });
      container.add(extraHit);
      extraHit.on('pointerdown', data.onExtra);

      // Primary PLAY button
      const playBtnX = cardWidth / 2 - 50;
      const playBg = this.add.graphics();
      playBg.fillStyle(0x22c55e, 1);
      playBg.fillRoundedRect(playBtnX - 40, -15, 80, 30, 6);
      playBg.lineStyle(1.5, 0x86efac, 1);
      playBg.strokeRoundedRect(playBtnX - 40, -15, 80, 30, 6);
      container.add(playBg);

      const playText = this.add.text(playBtnX, 0, 'PLAY ▶', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);
      container.add(playText);

      const playHit = this.add.zone(playBtnX, 0, 80, 30)
        .setInteractive({ useHandCursor: true });
      container.add(playHit);
      playHit.on('pointerdown', data.onPlay);
    } else {
      // Single prominent PLAY button
      const playBtnX = cardWidth / 2 - 56;
      const playBg = this.add.graphics();
      playBg.fillStyle(0x22c55e, 1);
      playBg.fillRoundedRect(playBtnX - 44, -16, 88, 32, 6);
      playBg.lineStyle(1.5, 0x86efac, 1);
      playBg.strokeRoundedRect(playBtnX - 44, -16, 88, 32, 6);
      container.add(playBg);

      const playText = this.add.text(playBtnX, 0, 'PLAY ▶', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        fontWeight: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);
      container.add(playText);

      const playHit = this.add.zone(playBtnX, 0, 88, 32)
        .setInteractive({ useHandCursor: true });
      container.add(playHit);
      playHit.on('pointerdown', data.onPlay);
    }
  }
}
