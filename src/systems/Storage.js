// src/systems/Storage.js
// LocalStorage session persistence manager for Allan's Birthday Tanks

const STORAGE_KEY = 'hbd70_progress';

class StorageManager {
  constructor() {
    this.memoryState = {
      highestLevelBeaten: 0,
      beatenLevels: [],
      unlockedLevel: 1,
      revealedLevels: []
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

      return {
        highestLevelBeaten,
        beatenLevels,
        unlockedLevel,
        revealedLevels
      };
    } catch (err) {
      console.warn('Could not read saved progress from localStorage:', err);
      return { ...this.memoryState };
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
      highestLevelBeaten,
      beatenLevels,
      unlockedLevel,
      revealedLevels
    };

    this.memoryState = { ...updated };

    if (this.isStorageAvailable) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Could not save progress to localStorage:', err);
      }
    }

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

    this.memoryState = { ...updated };

    if (this.isStorageAvailable) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Could not save progress to localStorage:', err);
      }
    }

    return updated;
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
    this.memoryState = {
      highestLevelBeaten: 0,
      beatenLevels: [],
      unlockedLevel: 1,
      revealedLevels: []
    };
    if (this.isStorageAvailable) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        console.warn('Could not clear localStorage:', err);
      }
    }
    return { ...this.memoryState };
  }
}

export const storage = new StorageManager();
