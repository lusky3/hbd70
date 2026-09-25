// src/main.js
// Entry point and Phaser 3 game configuration for Birthday Tanks! (Allan's 70th Birthday Tribute)

import { BootScene } from './scenes/Boot.js';
import { SplashScene } from './scenes/Splash.js';
import { LevelCardScene } from './scenes/LevelCard.js';
import { GameScene } from './scenes/Game.js';
import { HUDScene } from './scenes/HUD.js';
import { GameOverScene } from './scenes/GameOver.js';
import { VictoryScene } from './scenes/Victory.js';
import { LevelSelectScene } from './scenes/LevelSelect.js';
import { CreditsScene } from './scenes/Credits.js';
import { GameSelectScene } from './scenes/GameSelect.js';
import { PongScene } from './scenes/Pong.js';
import { SpaceInvadersScene } from './scenes/SpaceInvaders.js';
import { AsteroidsScene } from './scenes/Asteroids.js';
import { InitialsEntryOverlayScene } from './scenes/InitialsEntryOverlay.js';
import { LeaderboardModalScene } from './scenes/LeaderboardModal.js';
import { RetroactiveImportModalScene } from './scenes/RetroactiveImportModal.js';
import { MultiplayerLobbyScene } from './scenes/MultiplayerLobby.js';
import { MultiplayerTanksScene } from './scenes/MultiplayerTanks.js';
import { MultiplayerPongScene } from './scenes/MultiplayerPong.js';
import { PoolScene } from './scenes/Pool.js';
import { MultiplayerPoolScene } from './scenes/MultiplayerPool.js';
import { ResumeSessionModalScene } from './scenes/ResumeSessionModal.js';

const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 854,
  parent: 'game-container',
  backgroundColor: '#0a0f1d',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [
    BootScene,
    SplashScene,
    GameSelectScene,
    PongScene,
    SpaceInvadersScene,
    AsteroidsScene,
    PoolScene,
    LevelSelectScene,
    LevelCardScene,
    GameScene,
    HUDScene,
    GameOverScene,
    VictoryScene,
    CreditsScene,
    InitialsEntryOverlayScene,
    LeaderboardModalScene,
    RetroactiveImportModalScene,
    ResumeSessionModalScene,
    MultiplayerLobbyScene,
    MultiplayerTanksScene,
    MultiplayerPongScene,
    MultiplayerPoolScene
  ],
  input: {
    activePointers: 3
  }
};

export function autoSaveCurrentSession() {
  if (typeof window === 'undefined' || !window.game || !window.game.scene) return;
  const activeScenes = window.game.scene.getScenes(true);
  for (const scene of activeScenes) {
    if (scene && typeof scene.captureSessionState === 'function') {
      try {
        scene.captureSessionState();
      } catch (err) {
        console.warn('[AutoSave] Failed to capture session state:', err);
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', autoSaveCurrentSession);
  window.addEventListener('pagehide', autoSaveCurrentSession);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        autoSaveCurrentSession();
      }
    });
  }
}

function initGame() {
  if (!window.game) {
    window.game = new Phaser.Game(config);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }
}

