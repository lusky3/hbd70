// src/systems/Storage.js
// LocalStorage session persistence manager for Allan's Birthday Tanks and Retro Arcade

const STORAGE_KEY = 'hbd70_progress';
const MIGRATION_KEY = 'hbd70_scores_migrated';

const DEFAULT_ARCADE_STATS = {
  pong: { wins: 0, losses: 0, longestRally: 0 },
  invaders: { highScore: 0, highestWave: 1 },
  asteroids: { highScore: 0, highestWave: 1 }
};

class StorageManager {
  constructor() {
    this.memoryState = {
      highestLevelBeaten: 0,
      beatenLevels: [],
      unlockedLevel: 1,
      revealedLevels: [],
      arcadeStats: JSON.parse(JSON.stringify(DEFAULT_ARCADE_STATS))
    };
    this.isStorageAvailable = this.checkStorageAvailability();
  }

  checkStorageAvailability() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  getProgress() {
    if (!this.isStorageAvailable) {
      return { ...this.memoryState };
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { ...this.memoryState };
      }
      const data = JSON.parse(raw);
      const highestLevelBeaten = Number(data.highestLevelBeaten) || 0;
      let beatenLevels = Array.isArray(data.beatenLevels) ? data.beatenLevels.map(Number) : [];

      // Backward compatibility: ensure beatenLevels contains all levels up to highestLevelBeaten if empty
      if (beatenLevels.length === 0 && highestLevelBeaten > 0) {
        for (let i = 1; i <= highestLevelBeaten; i++) {
          beatenLevels.push(i);
        }
      }

      // Existing players must never lose unlocked levels; unlocked is at least highestLevelBeaten + 1
      const minimumUnlocked = Math.min(70, Math.max(1, highestLevelBeaten + 1));
      const unlockedLevel = Math.max(1, Math.min(70, Math.max(Number(data.unlockedLevel) || 1, minimumUnlocked)));
      const revealedLevels = Array.isArray(data.revealedLevels) ? data.revealedLevels.map(Number) : [];

      // Arcade Stats persistence (AC-8)
      const rawArcade = data.arcadeStats || {};
      const arcadeStats = {
        tanks: {
          highScore: Number(rawArcade.tanks?.highScore) || 0
        },
        pong: {
          wins: Number(rawArcade.pong?.wins) || 0,
          losses: Number(rawArcade.pong?.losses) || 0,
          longestRally: Number(rawArcade.pong?.longestRally) || 0
        },
        invaders: {
          highScore: Number(rawArcade.invaders?.highScore) || 0,
          highestWave: Math.max(1, Number(rawArcade.invaders?.highestWave) || 1)
        },
        asteroids: {
          highScore: Number(rawArcade.asteroids?.highScore) || 0,
          highestWave: Math.max(1, Number(rawArcade.asteroids?.highestWave) || 1)
        }
      };

      return {
        highestLevelBeaten,
        beatenLevels,
        unlockedLevel,
        revealedLevels,
        arcadeStats
      };
    } catch (err) {
      console.warn('Could not read saved progress from localStorage:', err);
      return { ...this.memoryState };
    }
  }

  saveData(data) {
    this.memoryState = { ...data };
    if (this.isStorageAvailable) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (err) {
        console.warn('Could not save progress to localStorage:', err);
      }
    }
  }

  recordLevelBeaten(levelNum) {
    const num = Number(levelNum);
    if (!num || num < 1 || num > 70) return this.getProgress();

    const current = this.getProgress();
    const beatenSet = new Set(current.beatenLevels);
    beatenSet.add(num);

    const beatenLevels = Array.from(beatenSet).sort((a, b) => a - b);
    const highestLevelBeaten = Math.max(current.highestLevelBeaten, num);
    const unlockedLevel = Math.min(70, Math.max(current.unlockedLevel, num + 1));
    const revealedLevels = current.revealedLevels || [];

    const updated = {
      ...current,
      highestLevelBeaten,
      beatenLevels,
      unlockedLevel,
      revealedLevels
    };

    this.saveData(updated);
    return updated;
  }

  recordLevelRevealed(levelNum) {
    const num = Number(levelNum);
    if (!num || num < 1 || num > 70) return this.getProgress();

    const current = this.getProgress();
    const revealedSet = new Set(current.revealedLevels || []);
    revealedSet.add(num);

    const revealedLevels = Array.from(revealedSet).sort((a, b) => a - b);
    const updated = {
      ...current,
      revealedLevels
    };

    this.saveData(updated);
    return updated;
  }

  getArcadeStats() {
    return this.getProgress().arcadeStats;
  }

  recordTanksScore(score = 0) {
    const current = this.getProgress();
    const stats = current.arcadeStats?.tanks || { highScore: 0 };
    const num = Number(score) || 0;
    if (num <= stats.highScore) return current.arcadeStats;

    const updated = {
      ...current,
      arcadeStats: {
        ...current.arcadeStats,
        tanks: {
          highScore: Math.max(stats.highScore, num)
        }
      }
    };
    this.saveData(updated);
    return updated.arcadeStats;
  }

  recordPongRally(rally = 0) {
    const current = this.getProgress();
    const stats = current.arcadeStats.pong;
    const longestRally = Math.max(stats.longestRally, Number(rally) || 0);
    if (longestRally === stats.longestRally) return current.arcadeStats;

    const updated = {
      ...current,
      arcadeStats: {
        ...current.arcadeStats,
        pong: {
          ...stats,
          longestRally
        }
      }
    };
    this.saveData(updated);
    return updated.arcadeStats;
  }

  recordPongMatch({ won, rally = 0 }) {
    const current = this.getProgress();
    const stats = current.arcadeStats.pong;

    const updatedPong = {
      wins: won ? stats.wins + 1 : stats.wins,
      losses: won ? stats.losses : stats.losses + 1,
      longestRally: Math.max(stats.longestRally, Number(rally) || 0)
    };

    const updated = {
      ...current,
      arcadeStats: {
        ...current.arcadeStats,
        pong: updatedPong
      }
    };

    this.saveData(updated);
    return updated.arcadeStats;
  }

  recordInvadersScore({ score = 0, wave = 1 }) {
    const current = this.getProgress();
    const stats = current.arcadeStats.invaders;

    const updatedInvaders = {
      highScore: Math.max(stats.highScore, Number(score) || 0),
      highestWave: Math.max(stats.highestWave, Number(wave) || 1)
    };

    const updated = {
      ...current,
      arcadeStats: {
        ...current.arcadeStats,
        invaders: updatedInvaders
      }
    };

    this.saveData(updated);
    return updated.arcadeStats;
  }

  recordAsteroidsScore({ score = 0, wave = 1 }) {
    const current = this.getProgress();
    const stats = current.arcadeStats.asteroids;

    const updatedAsteroids = {
      highScore: Math.max(stats.highScore, Number(score) || 0),
      highestWave: Math.max(stats.highestWave, Number(wave) || 1)
    };

    const updated = {
      ...current,
      arcadeStats: {
        ...current.arcadeStats,
        asteroids: updatedAsteroids
      }
    };

    this.saveData(updated);
    return updated.arcadeStats;
  }

  isLevelUnlocked(levelNum) {
    const progress = this.getProgress();
    return Number(levelNum) <= progress.unlockedLevel;
  }

  isLevelBeaten(levelNum) {
    const progress = this.getProgress();
    return progress.beatenLevels.includes(Number(levelNum));
  }

  isLevelRevealed(levelNum) {
    const progress = this.getProgress();
    return (progress.revealedLevels || []).includes(Number(levelNum));
  }

  clearProgress() {
    this._migrationDismissed = false;
    this.memoryState = {
      highestLevelBeaten: 0,
      beatenLevels: [],
      unlockedLevel: 1,
      revealedLevels: [],
      arcadeStats: JSON.parse(JSON.stringify(DEFAULT_ARCADE_STATS)),
      scoresMigrated: false
    };
    if (this.isStorageAvailable) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(MIGRATION_KEY);
      } catch (err) {
        console.warn('Could not clear localStorage:', err);
      }
    }
    return { ...this.memoryState };
  }

  isMigrationCompleted() {
    if (this.memoryState?.scoresMigrated) return true;
    if (!this.isStorageAvailable) return false;
    try {
      return window.localStorage.getItem(MIGRATION_KEY) === 'true';
    } catch {
      return false;
    }
  }

  markMigrationCompleted() {
    if (!this.memoryState) this.memoryState = {};
    this.memoryState.scoresMigrated = true;
    if (this.isStorageAvailable) {
      try {
        window.localStorage.setItem(MIGRATION_KEY, 'true');
      } catch (err) {
        console.warn('Could not save migration status:', err);
      }
    }
  }

  isMigrationDismissed() {
    if (this._migrationDismissed) return true;
    if (!this.isStorageAvailable) return false;
    try {
      return typeof window !== 'undefined' && window.sessionStorage?.getItem('hbd70_migration_dismissed') === 'true';
    } catch {
      return false;
    }
  }

  dismissMigration() {
    this._migrationDismissed = true;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('hbd70_migration_dismissed', 'true');
      }
    } catch {}
  }

  getUnmigratedLocalScores() {
    const progress = this.getProgress();
    const stats = progress.arcadeStats || {};
    const unmigrated = [];

    // Tanks
    const highestLevel = progress.highestLevelBeaten || 0;
    const tanksScore = Math.max(stats.tanks?.highScore || 0, highestLevel * 1000);
    if (tanksScore > 0) {
      unmigrated.push({
        gameId: 'tanks',
        name: 'BIRTHDAY TANKS',
        icon: '🪖',
        score: tanksScore,
        detail: `Level ${highestLevel}`
      });
    }

    // Pong
    const pongRally = stats.pong?.longestRally || 0;
    const pongWins = stats.pong?.wins || 0;
    if (pongRally > 0 || pongWins > 0) {
      unmigrated.push({
        gameId: 'pong',
        name: 'BIRTHDAY PONG',
        icon: '🏓',
        score: pongRally,
        detail: `${pongRally} Rally (${pongWins} Wins)`
      });
    }

    // Space Invaders
    const invScore = stats.invaders?.highScore || 0;
    const invWave = stats.invaders?.highestWave || 1;
    if (invScore > 0) {
      unmigrated.push({
        gameId: 'invaders',
        name: 'SPACE INVADERS',
        icon: '👾',
        score: invScore,
        detail: `Wave ${invWave}`
      });
    }

    // Asteroids
    const astScore = stats.asteroids?.highScore || 0;
    const astWave = stats.asteroids?.highestWave || 1;
    if (astScore > 0) {
      unmigrated.push({
        gameId: 'asteroids',
        name: 'BIRTHDAY ASTEROIDS',
        icon: '🚀',
        score: astScore,
        detail: `Wave ${astWave}`
      });
    }

    return unmigrated;
  }
}

export const storage = new StorageManager();

