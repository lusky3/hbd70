// src/systems/LeaderboardService.js
// Client service for Cloudflare D1 leaderboards with graceful local storage fallback

import { storage } from './Storage.js';

const INITIALS_KEY = 'hbd70_player_initials';
const DEFAULT_INITIALS = 'ALL';
const DEFAULT_TIMEOUT_MS = 3000;

export function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.HBD70_LEADERBOARD_API) {
    return window.HBD70_LEADERBOARD_API.replace(/\/+$/, '');
  }
  // Production Cloudflare Worker endpoint
  return 'https://api.al.lusk.win';
}

export function sanitizeInitials(initials) {
  if (!initials || typeof initials !== 'string') return DEFAULT_INITIALS;
  const clean = initials.trim().toUpperCase().replace(/[^A-Z0-9 !?★]/g, '?');
  return clean.slice(0, 3).padEnd(3, ' ');
}

export class LeaderboardService {
  constructor() {
    this.cachedInitials = null;
  }

  getPlayerInitials() {
    if (this.cachedInitials) return this.cachedInitials;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(INITIALS_KEY);
        if (stored) {
          this.cachedInitials = sanitizeInitials(stored);
          return this.cachedInitials;
        }
      }
    } catch {
      // Ignore localStorage errors
    }
    this.cachedInitials = DEFAULT_INITIALS;
    return this.cachedInitials;
  }

  setPlayerInitials(initials) {
    const clean = sanitizeInitials(initials);
    this.cachedInitials = clean;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(INITIALS_KEY, clean);
      }
    } catch {
      // Ignore localStorage errors
    }
    return clean;
  }

  getLocalFallback(gameId) {
    const initials = this.getPlayerInitials();
    const stats = storage.getArcadeStats();
    const progress = storage.getProgress();
    const fallbackResults = [];

    if (gameId === 'tanks') {
      const highest = progress.highestLevelBeaten || 0;
      if (highest > 0) {
        fallbackResults.push({
          rank: 1,
          initials,
          score: highest * 1000,
          detail: `Level ${highest}`,
          createdAt: new Date().toISOString()
        });
      }
    } else if (gameId === 'pong') {
      const p = stats.pong || { longestRally: 0, wins: 0 };
      if (p.longestRally > 0 || p.wins > 0) {
        fallbackResults.push({
          rank: 1,
          initials,
          score: p.longestRally,
          detail: `${p.longestRally} Rally (${p.wins} Wins)`,
          createdAt: new Date().toISOString()
        });
      }
    } else if (gameId === 'invaders') {
      const inv = stats.invaders || { highScore: 0, highestWave: 1 };
      if (inv.highScore > 0) {
        fallbackResults.push({
          rank: 1,
          initials,
          score: inv.highScore,
          detail: `Wave ${inv.highestWave}`,
          createdAt: new Date().toISOString()
        });
      }
    } else if (gameId === 'asteroids') {
      const ast = stats.asteroids || { highScore: 0, highestWave: 1 };
      if (ast.highScore > 0) {
        fallbackResults.push({
          rank: 1,
          initials,
          score: ast.highScore,
          detail: `Wave ${ast.highestWave}`,
          createdAt: new Date().toISOString()
        });
      }
    }

    return fallbackResults;
  }

  async fetchLeaderboard(gameId, limit = 10) {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/v1/leaderboard/${encodeURIComponent(gameId)}?limit=${limit}`;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS) : null;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller ? controller.signal : undefined
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      return {
        online: true,
        gameId,
        results: Array.isArray(data.results) ? data.results : []
      };
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      // Graceful offline fallback
      return {
        online: false,
        gameId,
        results: this.getLocalFallback(gameId),
        error: err.name === 'AbortError' ? 'Network timeout' : (err.message || 'Offline')
      };
    }
  }

  async submitScore(gameId, initials, score, detail = '') {
    const cleanInitials = this.setPlayerInitials(initials);
    const numScore = Math.max(0, parseInt(score, 10) || 0);

    // Keep local storage stats in sync
    if (gameId === 'invaders' && typeof storage.recordInvadersScore === 'function') {
      const waveMatch = String(detail).match(/Wave\s*(\d+)/i);
      const wave = waveMatch ? parseInt(waveMatch[1], 10) : 1;
      storage.recordInvadersScore({ score: numScore, wave });
    } else if (gameId === 'asteroids' && typeof storage.recordAsteroidsScore === 'function') {
      const waveMatch = String(detail).match(/Wave\s*(\d+)/i);
      const wave = waveMatch ? parseInt(waveMatch[1], 10) : 1;
      storage.recordAsteroidsScore({ score: numScore, wave });
    } else if (gameId === 'pong' && typeof storage.recordPongMatch === 'function') {
      storage.recordPongMatch({ won: true, rally: numScore });
    }

    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/v1/leaderboard/${encodeURIComponent(gameId)}`;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS) : null;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          initials: cleanInitials,
          score: numScore,
          detail: String(detail || '').slice(0, 32)
        }),
        signal: controller ? controller.signal : undefined
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        online: true,
        rank: data.rank || 1,
        initials: cleanInitials,
        score: numScore
      };
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      // Soft success on network failure — stored locally
      return {
        success: true,
        online: false,
        rank: 1,
        initials: cleanInitials,
        score: numScore,
        error: err.name === 'AbortError' ? 'Network timeout' : (err.message || 'Offline')
      };
    }
  }
}

export const leaderboardService = new LeaderboardService();
