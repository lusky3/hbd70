// tests/leaderboard.test.js
// Unit verification suite for Cloudflare D1 leaderboards and client service

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  handleRequest,
  sanitizeInitials as workerSanitizeInitials,
  VALID_GAMES,
  SCORE_LIMITS,
  checkRateLimit,
  CORS_HEADERS
} from '../worker/index.js';

import {
  leaderboardService,
  sanitizeInitials as clientSanitizeInitials
} from '../src/systems/LeaderboardService.js';

import { storage } from '../src/systems/Storage.js';
import { CHARS } from '../src/scenes/InitialsEntryOverlay.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to create mock Cloudflare D1 database environment
function createMockEnv(initialData = []) {
  const store = [...initialData];

  return {
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async all() {
                // Handle SELECT query
                if (sql.includes('SELECT') && sql.includes('FROM leaderboards')) {
                  const gameId = args[0];
                  const limit = args[1] || 10;
                  const filtered = store
                    .filter((r) => r.game_id === gameId)
                    .sort((a, b) => b.score - a.score);
                  return { results: filtered.slice(0, limit) };
                }
                return { results: [] };
              },
              async first() {
                // Handle rank query
                if (sql.includes('COUNT(*) as better_count') || sql.includes('COUNT(*) + 1 as rank')) {
                  const gameId = args[0];
                  const score = args[1];
                  const lastId = args[3];
                  const count = store.filter((r) => r.game_id === gameId && (r.score > score || (lastId && r.score === score && r.id < lastId))).length;
                  return { rank: count + 1, better_count: count };
                }
                return null;
              },
              async run() {
                // Handle INSERT
                if (sql.includes('INSERT INTO leaderboards')) {
                  const [game_id, initials, score, detail, full_name] = args;
                  const newRow = {
                    id: store.length + 1,
                    game_id,
                    initials,
                    score,
                    detail,
                    full_name: full_name || '',
                    created_at: new Date().toISOString()
                  };
                  store.push(newRow);
                  return { success: true, meta: { last_row_id: newRow.id } };
                }
                return { success: false };
              }
            };
          }
        };
      }
    }
  };
}

test('AC-1: Cloudflare D1 Schema & Configuration Integrity', () => {
  const schemaPath = path.join(rootDir, 'worker/schema.sql');
  assert.ok(fs.existsSync(schemaPath), 'schema.sql must exist');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  assert.match(schema, /CREATE TABLE IF NOT EXISTS leaderboards/, 'Schema must define leaderboards table');
  assert.match(schema, /game_id TEXT NOT NULL/, 'Schema must have game_id column');
  assert.match(schema, /initials TEXT NOT NULL/, 'Schema must have initials column');
  assert.match(schema, /score INTEGER NOT NULL/, 'Schema must have score column');
  assert.match(schema, /full_name TEXT/, 'Schema must have full_name column');
  assert.match(schema, /CREATE INDEX IF NOT EXISTS idx_leaderboards_game_score/, 'Schema must define compound ranking index');

  const wranglerPath = path.join(rootDir, 'worker/wrangler.toml');
  assert.ok(fs.existsSync(wranglerPath), 'wrangler.toml must exist');
  const wrangler = fs.readFileSync(wranglerPath, 'utf-8');
  assert.match(wrangler, /d1_databases/, 'wrangler.toml must declare d1_databases binding');
  assert.match(wrangler, /binding = "DB"/, 'wrangler.toml must bind DB');
});

test('AC-2: Initials Sanitization Constraints', () => {
  assert.equal(workerSanitizeInitials('al'), 'AL ', 'Must uppercase and pad to 3 chars');
  assert.equal(workerSanitizeInitials('cody'), 'COD', 'Must truncate to 3 chars');
  assert.equal(workerSanitizeInitials('a$b'), 'A?B', 'Must replace unauthorized symbols with ?');
  assert.equal(workerSanitizeInitials('★!1'), '★!1', 'Must preserve allowed special characters');
  assert.equal(workerSanitizeInitials(''), '???', 'Empty input must default to ???');
  assert.equal(workerSanitizeInitials(null), '???', 'Null input must default to ???');

  assert.equal(clientSanitizeInitials('allan'), 'ALL', 'Client sanitizer must match 3-char rule');
});

test('AC-2: Cloudflare Worker CORS & Health Endpoint', async () => {
  const env = createMockEnv();

  // OPTIONS Preflight
  const optReq = new Request('https://api.al.lusk.win/api/v1/leaderboard/invaders', { method: 'OPTIONS' });
  const optRes = await handleRequest(optReq, env);
  assert.equal(optRes.status, 204, 'CORS preflight should return 204 No Content');
  assert.equal(optRes.headers.get('Access-Control-Allow-Origin'), '*', 'CORS origin must be wildcard *');

  // Health Check
  const healthReq = new Request('https://api.al.lusk.win/health', { method: 'GET' });
  const healthRes = await handleRequest(healthReq, env);
  assert.equal(healthRes.status, 200, 'Health endpoint must return 200 OK');
  const healthData = await healthRes.json();
  assert.equal(healthData.status, 'ok');
  assert.deepEqual(healthData.games, VALID_GAMES);
});

test('AC-2: Cloudflare Worker GET Leaderboard Query & Validation', async () => {
  const initialScores = [
    { id: 1, game_id: 'asteroids', initials: 'ALL', score: 15000, detail: 'Wave 5', created_at: '2026-09-22T12:00:00Z' },
    { id: 2, game_id: 'asteroids', initials: 'COD', score: 12000, detail: 'Wave 4', created_at: '2026-09-22T13:00:00Z' },
    { id: 3, game_id: 'invaders', initials: 'CAR', score: 8000, detail: 'Wave 3', created_at: '2026-09-22T14:00:00Z' }
  ];
  const env = createMockEnv(initialScores);

  // Invalid gameId
  const badReq = new Request('https://api.al.lusk.win/api/v1/leaderboard/unknown_game', { method: 'GET' });
  const badRes = await handleRequest(badReq, env);
  assert.equal(badRes.status, 400, 'Invalid gameId must reject with 400 Bad Request');

  // Valid GET asteroids
  const getReq = new Request('https://api.al.lusk.win/api/v1/leaderboard/asteroids?limit=10', { method: 'GET' });
  const getRes = await handleRequest(getReq, env);
  assert.equal(getRes.status, 200);
  const data = await getRes.json();
  assert.equal(data.gameId, 'asteroids');
  assert.equal(data.count, 2);
  assert.equal(data.results[0].rank, 1);
  assert.equal(data.results[0].initials, 'ALL');
  assert.equal(data.results[0].score, 15000);
  assert.equal(data.results[1].rank, 2);
  assert.equal(data.results[1].initials, 'COD');
});

test('AC-2: Cloudflare Worker POST Score Submission & Ranking', async () => {
  const env = createMockEnv([
    { id: 1, game_id: 'invaders', initials: 'ALL', score: 10000, detail: 'Wave 5', created_at: '2026-09-22T10:00:00Z' }
  ]);

  // Invalid payload: negative score
  const negReq = new Request('https://api.al.lusk.win/api/v1/leaderboard/invaders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initials: 'JAY', score: -50 })
  });
  const negRes = await handleRequest(negReq, env);
  assert.equal(negRes.status, 400, 'Negative score must reject with 400');

  // Invalid payload: score over plausible threshold
  const floodReq = new Request('https://api.al.lusk.win/api/v1/leaderboard/invaders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initials: 'JAY', score: 999999999 })
  });
  const floodRes = await handleRequest(floodReq, env);
  assert.equal(floodRes.status, 400, 'Absurd score must reject with 400');

  // Valid POST higher than existing with fullName
  const postReq1 = new Request('https://api.al.lusk.win/api/v1/leaderboard/invaders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initials: 'KEL', score: 15000, detail: 'Wave 6', fullName: 'Kelsey Lusk' })
  });
  const postRes1 = await handleRequest(postReq1, env);
  assert.equal(postRes1.status, 201);
  const postData1 = await postRes1.json();
  assert.equal(postData1.success, true);
  assert.equal(postData1.rank, 1, 'Top score should earn Rank #1');
  assert.equal(postData1.initials, 'KEL');
  assert.equal(postData1.fullName, 'Kelsey Lusk', 'Should return full name');

  // Profane POST must reject with 400
  const profaneTagReq = new Request('https://api.al.lusk.win/api/v1/leaderboard/invaders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initials: 'ASS', score: 12000 })
  });
  const profaneTagRes = await handleRequest(profaneTagReq, env);
  assert.equal(profaneTagRes.status, 400, 'Profane tag must reject with 400');

  const profaneNameReq = new Request('https://api.al.lusk.win/api/v1/leaderboard/invaders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initials: 'ALL', score: 12000, fullName: 'Nasty Asshole' })
  });
  const profaneNameRes = await handleRequest(profaneNameReq, env);
  assert.equal(profaneNameRes.status, 400, 'Profane name must reject with 400');

  // Valid POST lower than existing
  const postReq2 = new Request('https://api.al.lusk.win/api/v1/leaderboard/invaders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initials: 'JAY', score: 5000, detail: 'Wave 2' })
  });
  const postRes2 = await handleRequest(postReq2, env);
  const postData2 = await postRes2.json();
  assert.equal(postData2.rank, 3, 'Lower score should rank behind existing scores');
});

test('AC-3: Client LeaderboardService Offline Fallback & Initials Persistence', async () => {
  // Test initials caching
  const saved = leaderboardService.setPlayerInitials('CAR');
  assert.equal(saved, 'CAR');
  assert.equal(leaderboardService.getPlayerInitials(), 'CAR');

  // Test local fallback data generation when offline
  const fallback = leaderboardService.getLocalFallback('invaders');
  assert.ok(Array.isArray(fallback), 'Fallback should return array');

  // Test fetchLeaderboard fail-soft behavior (with nonexistent endpoint)
  const res = await leaderboardService.fetchLeaderboard('invaders');
  assert.equal(res.online, false, 'Should report offline when network call fails');
  assert.ok(Array.isArray(res.results), 'Should provide fallback results array');

  // Test submitScore fail-soft behavior
  const submitRes = await leaderboardService.submitScore('invaders', 'ALL', 4200, 'Wave 3');
  assert.equal(submitRes.success, true, 'Submit score should succeed fail-soft locally');
  assert.equal(submitRes.initials, 'ALL');
  assert.equal(submitRes.score, 4200);
});

test('AC-2: Rate Limiting & Per-Game Score Limits Enforced by Worker', async () => {
  const env = createMockEnv();

  // Test per-game score limit rejection (Pong cap is 1000)
  const reqTooHigh = new Request('https://api.al.lusk.win/api/v1/leaderboard/pong', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initials: 'CHE', score: 99999, detail: 'Cheat Rally' })
  });
  const resTooHigh = await handleRequest(reqTooHigh, env);
  assert.equal(resTooHigh.status, 400, 'Plausible limit violation must return 400');
  const errHigh = await resTooHigh.json();
  assert.ok(errHigh.error.includes('plausible threshold'), 'Should cite plausible threshold');

  // Valid Pong score within limit
  const reqValidPong = new Request('https://api.al.lusk.win/api/v1/leaderboard/pong', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initials: 'ALL', score: 28, detail: '28 Rally' })
  });
  const resValid = await handleRequest(reqValidPong, env);
  assert.equal(resValid.status, 201);

  // Test rate limiting on burst submissions (>15 requests)
  const burstIp = '198.51.100.42';
  let got429 = false;
  for (let i = 0; i < 20; i++) {
    const burstReq = new Request('https://api.al.lusk.win/api/v1/leaderboard/invaders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': burstIp },
      body: JSON.stringify({ initials: 'BOT', score: 1000 + i, detail: 'Burst' })
    });
    const burstRes = await handleRequest(burstReq, env);
    if (burstRes.status === 429) {
      got429 = true;
      break;
    }
  }
  assert.ok(got429, 'Excessive submissions from same IP must be throttled with HTTP 429');
});

test('AC-3: Storage Pong Rally and Tanks High Score Isolation', () => {
  const initial = storage.getArcadeStats();
  const initialWins = initial.pong.wins;
  const initialLosses = initial.pong.losses;

  // Recording a rally MUST NOT increment wins or losses
  const updated = storage.recordPongRally(35);
  assert.equal(updated.pong.longestRally, 35);
  assert.equal(updated.pong.wins, initialWins, 'Wins must remain unchanged when recording rally');
  assert.equal(updated.pong.losses, initialLosses, 'Losses must remain unchanged when recording rally');

  // Tanks score recording
  const tanksStats = storage.recordTanksScore(73500);
  assert.equal(tanksStats.tanks.highScore, 73500, 'Tanks high score must be recorded');
});

test('AC-4: InitialsEntryOverlay Character Cycling & Navigation Logic', () => {
  assert.ok(CHARS.length >= 36, 'Initials charset must include full alphabet, numbers, and symbols');
  assert.ok(CHARS.includes('A') && CHARS.includes('Z') && CHARS.includes('0') && CHARS.includes('9'));
  assert.ok(CHARS.includes('★') && CHARS.includes('!') && CHARS.includes('?'));

  // Test circular wrapping algorithm
  const deltaForward = 1;
  const startIdx = CHARS.indexOf('A');
  const nextChar = CHARS[(startIdx + deltaForward + CHARS.length) % CHARS.length];
  assert.equal(nextChar, 'B');

  const deltaBack = -1;
  const prevChar = CHARS[(startIdx + deltaBack + CHARS.length) % CHARS.length];
  assert.equal(prevChar, CHARS[CHARS.length - 1], 'Wrapping backward from A should wrap to last character');
});
