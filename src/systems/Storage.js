// src/systems/Storage.js
// LocalStorage session persistence manager for Allan's Birthday Tanks

const STORAGE_KEY = 'hbd70_progress';

class StorageManager {
  constructor() {
    this.memoryState = {
      highestLevelBeaten: 0,
      beatenLevels: [],
      unlockedLevel: 1
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
      return {
        highestLevelBeaten: Number(data.highestLevelBeaten) || 0,
        beatenLevels: Array.isArray(data.beatenLevels) ? data.beatenLevels.map(Number) : [],
        unlockedLevel: Math.max(1, Math.min(70, Number(data.unlockedLevel) || 1))
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

    const updated = {
      highestLevelBeaten,
      beatenLevels,
      unlockedLevel
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

  clearProgress() {
    this.memoryState = {
      highestLevelBeaten: 0,
      beatenLevels: [],
      unlockedLevel: 1
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
