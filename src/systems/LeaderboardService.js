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
  return 'https://hbd70-leaderboard.lusk.workers.dev';
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
    const profile = storage.getPlayerProfile ? storage.getPlayerProfile() : { tag: this.getPlayerInitials(), name: '' };
    const initials = profile.tag || this.getPlayerInitials();
    const fullName = profile.name || '';
    const stats = storage.getArcadeStats();
    const progress = storage.getProgress();
    const fallbackResults = [];

    if (gameId === 'tanks') {
      const highest = progress.highestLevelBeaten || 0;
      const score = Math.max(stats.tanks?.highScore || 0, highest * 1000);
      if (score > 0) {
        fallbackResults.push({
          rank: 1,
          initials,
          fullName,
          score,
          detail: `Level ${highest}`,
          createdAt: new Date().toISOString()
        });
      }
    } else if (gameId === 'pong') {
      const p = stats.pong || { longestRally: 0, wins: 0 };
      const score = p.longestRally;
      if (score > 0 || p.wins > 0) {
        fallbackResults.push({
          rank: 1,
          initials,
          fullName,
          score,
          detail: `${score} Rally (${p.wins} Wins)`,
          createdAt: new Date().toISOString()
        });
      }
    } else if (gameId === 'invaders') {
      const inv = stats.invaders || { highScore: 0, highestWave: 1 };
      const score = inv.highScore;
      if (score > 0) {
        fallbackResults.push({
          rank: 1,
          initials,
          fullName,
          score,
          detail: `Wave ${inv.highestWave}`,
          createdAt: new Date().toISOString()
        });
      }
    } else if (gameId === 'asteroids') {
      const ast = stats.asteroids || { highScore: 0, highestWave: 1 };
      const score = ast.highScore;
      if (score > 0) {
        fallbackResults.push({
          rank: 1,
          initials,
          fullName,
          score,
          detail: `Wave ${ast.highestWave}`,
          createdAt: new Date().toISOString()
        });
      }
    } else if (gameId.startsWith('pool') || gameId === 'pool_8ball' || gameId === 'pool_9ball' || gameId === 'pool_straight' || gameId === 'pool_speed') {
      const poolStats = stats.pool || {};
      const subKey = gameId === 'pool' ? 'pool_8ball' : gameId;
      const p = poolStats[subKey] || { wins: 0, losses: 0, highScore: 0 };
      const score = p.highScore || 0;
      if (score > 0 || p.wins > 0) {
        let detail = `${p.wins}W - ${p.losses}L`;
        if (subKey === 'pool_straight' && p.highestBalls) {
          detail = `${p.highestBalls} Balls Run`;
        } else if (subKey === 'pool_speed' && p.bestTime) {
          detail = `${p.bestTime.toFixed(1)}s Clear`;
        }
        fallbackResults.push({
          rank: 1,
          initials,
          fullName,
          score,
          detail,
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
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        online: true,
        gameId,
        results: data.results || []
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

  async submitScore(gameId, initialsOrOptions, score, detail = '', fullName = '') {
    let rawInitials = initialsOrOptions;
    let rawScore = score;
    let rawDetail = detail;
    let rawFullName = fullName;

    if (initialsOrOptions && typeof initialsOrOptions === 'object') {
      rawInitials = initialsOrOptions.initials;
      rawScore = initialsOrOptions.score;
      rawDetail = initialsOrOptions.detail || '';
      rawFullName = initialsOrOptions.fullName || initialsOrOptions.full_name || fullName || '';
    }

    const cleanInitials = this.setPlayerInitials(rawInitials);
    const cleanFullName = typeof rawFullName === 'string' ? rawFullName.trim().slice(0, 24) : '';
    const numScore = Math.max(0, parseInt(rawScore, 10) || 0);

    // Save profile to storage if available
    if (typeof storage.setPlayerProfile === 'function') {
      storage.setPlayerProfile(cleanInitials, cleanFullName);
    }

    // Keep local storage stats in sync
    if (gameId === 'tanks' && typeof storage.recordTanksScore === 'function') {
      storage.recordTanksScore(numScore);
    } else if (gameId === 'invaders' && typeof storage.recordInvadersScore === 'function') {
      const waveMatch = String(rawDetail).match(/Wave\s*(\d+)/i);
      const wave = waveMatch ? parseInt(waveMatch[1], 10) : 1;
      storage.recordInvadersScore({ score: numScore, wave });
    } else if (gameId === 'asteroids' && typeof storage.recordAsteroidsScore === 'function') {
      const waveMatch = String(rawDetail).match(/Wave\s*(\d+)/i);
      const wave = waveMatch ? parseInt(waveMatch[1], 10) : 1;
      storage.recordAsteroidsScore({ score: numScore, wave });
    } else if (gameId === 'pong' && typeof storage.recordPongRally === 'function') {
      storage.recordPongRally(numScore);
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
          detail: String(rawDetail || '').slice(0, 32),
          fullName: cleanFullName
        }),
        signal: controller ? controller.signal : undefined
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          let errorMsg = `HTTP ${response.status}`;
          try {
            const errData = await response.json();
            if (errData && errData.error) errorMsg = errData.error;
          } catch {
            // ignore
          }
          return {
            success: false,
            online: true,
            error: errorMsg,
            initials: cleanInitials,
            fullName: cleanFullName,
            score: numScore,
            detail: rawDetail
          };
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        online: true,
        rank: data.rank || 1,
        initials: data.initials || cleanInitials,
        fullName: data.fullName || cleanFullName,
        score: data.score || numScore,
        detail: data.detail || rawDetail
      };
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      // Offline fallback: return rank 1 locally
      return {
        success: true,
        online: false,
        rank: 1,
        initials: cleanInitials,
        fullName: cleanFullName,
        score: numScore,
        detail: rawDetail,
        offline: true,
        error: err.name === 'AbortError' ? 'Network timeout' : (err.message || 'Offline')
      };
    }
  }

  async submitBatchScores(initials, scoreEntries, fullName = '') {
    const cleanInitials = this.setPlayerInitials(initials);
    const cleanFullName = typeof fullName === 'string' ? fullName.trim().slice(0, 24) : '';
    if (typeof storage.setPlayerProfile === 'function') {
      storage.setPlayerProfile(cleanInitials, cleanFullName);
    }
    const results = [];

    for (const entry of scoreEntries) {
      if (!entry || !entry.gameId || !entry.score) continue;
      try {
        const res = await this.submitScore(entry.gameId, {
          initials: cleanInitials,
          score: entry.score,
          detail: entry.detail || '',
          fullName: cleanFullName
        });
        results.push({ gameId: entry.gameId, ...res });
      } catch (err) {
        results.push({ gameId: entry.gameId, success: false, error: err.message });
      }
    }

    return results;
  }
}

export const leaderboardService = new LeaderboardService();
