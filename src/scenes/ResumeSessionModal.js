// src/scenes/ResumeSessionModal.js
// Modal prompt for resuming saved mid-game sessions across all single-player retro games

import { storage } from '../systems/Storage.js';
import { audio } from '../systems/AudioManager.js';

const SceneBase = typeof Phaser !== 'undefined' ? Phaser.Scene : class {};

export const GAME_META = {
  tanks: { name: 'BIRTHDAY TANKS', icon: '🎂', scene: 'Game' },
  pong: { name: 'BIRTHDAY PONG', icon: '🏓', scene: 'Pong' },
  invaders: { name: 'SPACE INVADERS', icon: '👾', scene: 'SpaceInvaders' },
  asteroids: { name: 'BIRTHDAY ASTEROIDS', icon: '🚀', scene: 'Asteroids' },
  pool: { name: 'BIRTHDAY POOL', icon: '🎱', scene: 'Pool' }
};

export function formatRelativeTime(timestamp) {
  if (!timestamp || typeof timestamp !== 'number') return 'recently';
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 45) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export class ResumeSessionModalScene extends SceneBase {
  constructor() {
    super('ResumeSessionModal');
  }

  init(data) {
    this.gameId = data?.gameId;
    this.targetScene = data?.targetScene || (GAME_META[this.gameId]?.scene || 'Game');
    this.launchData = data?.launchData || {};
    this.session = this.gameId ? storage.getGameSession(this.gameId) : null;
  }

  create() {
    this.scene.bringToTop();
    const { width, height } = this.scale;

    // Safety fallback: if no session exists, proceed directly to target scene
    if (!this.session) {
      this.scene.stop();
      this.scene.start(this.targetScene, this.launchData);
      return;
    }

    const meta = GAME_META[this.gameId] || { name: this.gameId.toUpperCase(), icon: '🎮' };
    const savedTimeStr = formatRelativeTime(this.session.timestamp);

    // 1. Semi-transparent Dim Backdrop that intercepts pointer events
    const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.88)
      .setOrigin(0, 0)
      .setInteractive();
    backdrop.on('pointerdown', (pointer) => {
      if (pointer.event && typeof pointer.event.stopPropagation === 'function') {
        pointer.event.stopPropagation();
      }
    });
    this.input.topOnly = true;

    // 2. Modal Box dimensions
    const cardWidth = Math.min(width - 32, 400);
    const cardHeight = Math.min(height - 40, 420);
    const cardX = (width - cardWidth) / 2;
    const cardY = (height - cardHeight) / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0f1d, 0.98);
    bg.fillRoundedRect(cardX, cardY, cardWidth, cardHeight, 14);
    bg.lineStyle(2, 0xfacc15, 0.9);
    bg.strokeRoundedRect(cardX, cardY, cardWidth, cardHeight, 14);

    // Inner glow accents
    bg.lineStyle(1, 0x38bdf8, 0.35);
    bg.strokeRoundedRect(cardX + 4, cardY + 4, cardWidth - 8, cardHeight - 8, 12);

    let curY = cardY + 24;

    // 3. Header & Icon
    this.add.text(width / 2, curY, `${meta.icon} ${meta.name}`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '18px',
      fontWeight: '900',
      color: '#facc15',
      letterSpacing: 1
    }).setOrigin(0.5);

    curY += 26;

    // Subtitle & Timestamp
    this.add.text(width / 2, curY, 'SAVED SESSION DETECTED', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5);

    curY += 18;

    this.add.text(width / 2, curY, `Saved ${savedTimeStr} • Progress is waiting`, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      color: '#94a3b8'
    }).setOrigin(0.5);

    curY += 24;

    // 4. Session Summary Box
    const summaryWidth = cardWidth - 36;
    const summaryHeight = 110;
    const summaryBg = this.add.graphics();
    summaryBg.fillStyle(0x131d33, 0.9);
    summaryBg.fillRoundedRect(cardX + 18, curY, summaryWidth, summaryHeight, 8);
    summaryBg.lineStyle(1, 0x334155, 1);
    summaryBg.strokeRoundedRect(cardX + 18, curY, summaryWidth, summaryHeight, 8);

    const rawSummary = this.session.summary;
    const lines = [];

    if (typeof rawSummary === 'string') {
      lines.push(rawSummary);
    } else {
      const summary = rawSummary || {};
      if (this.gameId === 'tanks') {
        lines.push(`Decade / Level:  Level ${summary.levelNum || 1}`);
        lines.push(`Lives Remaining:  ${'❤️'.repeat(Math.max(1, summary.lives || 3))}`);
        lines.push(`Tanks Defeated:   ${summary.tanksDefeated || 0}`);
      } else if (this.gameId === 'pong') {
        lines.push(`Score: Allan ${summary.playerScore || 0} - ${summary.aiScore || 0} CPU`);
        lines.push(`Longest Rally:   ${summary.maxRally || 0} hits`);
        lines.push(`Race: First to 11 points`);
      } else if (this.gameId === 'invaders') {
        lines.push(`Current Wave:    Wave ${summary.wave || 1}`);
        lines.push(`Current Score:   ${(summary.score || 0).toLocaleString()} pts`);
        lines.push(`Shields / Lives: ${'🛡️'.repeat(Math.max(1, summary.lives || 3))}`);
      } else if (this.gameId === 'asteroids') {
        lines.push(`Current Wave:    Wave ${summary.wave || 1}`);
        lines.push(`Current Score:   ${(summary.score || 0).toLocaleString()} pts`);
        lines.push(`Ships Left:      ${'🚀'.repeat(Math.max(1, summary.lives || 3))}`);
      } else if (this.gameId === 'pool') {
        const modeLabel = summary.subtype ? summary.subtype.toUpperCase() : '8-BALL';
        const diffLabel = summary.difficulty ? summary.difficulty.toUpperCase() : 'MEDIUM';
        lines.push(`Game Mode:       ${modeLabel} (${diffLabel})`);
        if (summary.score !== undefined) {
          lines.push(`Score / Balls:   ${summary.score}`);
        }
        if (summary.detail) {
          lines.push(`Status:          ${summary.detail}`);
        } else {
          lines.push(`Table:           In Progress`);
        }
      } else {
        lines.push(summary.text || 'Game progress saved');
      }
    }

    let lineY = curY + 16;
    for (const line of lines) {
      this.add.text(cardX + 32, lineY, line, {
        fontFamily: 'monospace',
        fontSize: '13px',
        fontWeight: 'bold',
        color: '#e2e8f0'
      });
      lineY += 26;
    }

    curY += summaryHeight + 24;

    // 5. Action Buttons
    const btnWidth = cardWidth - 48;
    const btnX = width / 2;

    // Button 1: [ ▶ RESUME GAME ]
    const resumeBtnHeight = 44;
    const resumeY = curY + resumeBtnHeight / 2;
    const resumeBg = this.add.graphics();
    resumeBg.fillStyle(0x16a34a, 1);
    resumeBg.fillRoundedRect(btnX - btnWidth / 2, resumeY - resumeBtnHeight / 2, btnWidth, resumeBtnHeight, 8);
    resumeBg.lineStyle(1.5, 0x4ade80, 1);
    resumeBg.strokeRoundedRect(btnX - btnWidth / 2, resumeY - resumeBtnHeight / 2, btnWidth, resumeBtnHeight, 8);

    const resumeText = this.add.text(btnX, resumeY, '▶  RESUME GAME', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '15px',
      fontWeight: 'bold',
      color: '#ffffff',
      letterSpacing: 1
    }).setOrigin(0.5);

    const resumeZone = this.add.zone(btnX, resumeY, btnWidth, resumeBtnHeight)
      .setInteractive({ useHandCursor: true });
    this.resumeZone = resumeZone;

    resumeZone.on('pointerover', () => {
      resumeBg.clear();
      resumeBg.fillStyle(0x22c55e, 1);
      resumeBg.fillRoundedRect(btnX - btnWidth / 2, resumeY - resumeBtnHeight / 2, btnWidth, resumeBtnHeight, 8);
      resumeBg.lineStyle(2, 0x86efac, 1);
      resumeBg.strokeRoundedRect(btnX - btnWidth / 2, resumeY - resumeBtnHeight / 2, btnWidth, resumeBtnHeight, 8);
      resumeText.setScale(1.02);
    });

    resumeZone.on('pointerout', () => {
      resumeBg.clear();
      resumeBg.fillStyle(0x16a34a, 1);
      resumeBg.fillRoundedRect(btnX - btnWidth / 2, resumeY - resumeBtnHeight / 2, btnWidth, resumeBtnHeight, 8);
      resumeBg.lineStyle(1.5, 0x4ade80, 1);
      resumeBg.strokeRoundedRect(btnX - btnWidth / 2, resumeY - resumeBtnHeight / 2, btnWidth, resumeBtnHeight, 8);
      resumeText.setScale(1);
    });

    resumeZone.on('pointerdown', () => {
      if (audio && typeof audio.playChirp === 'function') {
        audio.playChirp();
      }
      this.scene.stop();
      this.scene.start(this.targetScene, {
        ...this.launchData,
        resumeSession: this.session.state
      });
    });

    // Button 2: [ 🔄 NEW GAME ]
    const newGameBtnHeight = 38;
    const newGameY = resumeY + resumeBtnHeight / 2 + 12 + newGameBtnHeight / 2;
    const newGameBg = this.add.graphics();
    newGameBg.fillStyle(0x1e293b, 1);
    newGameBg.fillRoundedRect(btnX - btnWidth / 2, newGameY - newGameBtnHeight / 2, btnWidth, newGameBtnHeight, 8);
    newGameBg.lineStyle(1.5, 0xef4444, 0.8);
    newGameBg.strokeRoundedRect(btnX - btnWidth / 2, newGameY - newGameBtnHeight / 2, btnWidth, newGameBtnHeight, 8);

    const newGameText = this.add.text(btnX, newGameY, '🔄  NEW GAME (DISCARD SAVE)', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#f87171',
      letterSpacing: 0.5
    }).setOrigin(0.5);

    const newGameZone = this.add.zone(btnX, newGameY, btnWidth, newGameBtnHeight)
      .setInteractive({ useHandCursor: true });
    this.newGameZone = newGameZone;

    newGameZone.on('pointerover', () => {
      newGameBg.clear();
      newGameBg.fillStyle(0x2d3748, 1);
      newGameBg.fillRoundedRect(btnX - btnWidth / 2, newGameY - newGameBtnHeight / 2, btnWidth, newGameBtnHeight, 8);
      newGameBg.lineStyle(2, 0xf87171, 1);
      newGameBg.strokeRoundedRect(btnX - btnWidth / 2, newGameY - newGameBtnHeight / 2, btnWidth, newGameBtnHeight, 8);
      newGameText.setScale(1.02);
    });

    newGameZone.on('pointerout', () => {
      newGameBg.clear();
      newGameBg.fillStyle(0x1e293b, 1);
      newGameBg.fillRoundedRect(btnX - btnWidth / 2, newGameY - newGameBtnHeight / 2, btnWidth, newGameBtnHeight, 8);
      newGameBg.lineStyle(1.5, 0xef4444, 0.8);
      newGameBg.strokeRoundedRect(btnX - btnWidth / 2, newGameY - newGameBtnHeight / 2, btnWidth, newGameBtnHeight, 8);
      newGameText.setScale(1);
    });

    newGameZone.on('pointerdown', () => {
      if (audio && typeof audio.playClick === 'function') {
        audio.playClick();
      }
      storage.clearGameSession(this.gameId);
      this.scene.stop();
      this.scene.start(this.targetScene, {
        ...this.launchData,
        resumeSession: null
      });
    });

    // Close Button [✕]
    const closeX = cardX + cardWidth - 24;
    const closeY = cardY + 22;
    const closeText = this.add.text(closeX, closeY, '✕', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#94a3b8'
    }).setOrigin(0.5);

    const closeZone = this.add.zone(closeX, closeY, 36, 36)
      .setInteractive({ useHandCursor: true });

    closeZone.on('pointerover', () => {
      closeText.setColor('#ffffff');
    });
    closeZone.on('pointerout', () => {
      closeText.setColor('#94a3b8');
    });
    closeZone.on('pointerdown', () => {
      this.scene.stop();
      this.scene.start('GameSelect');
    });
  }
}
