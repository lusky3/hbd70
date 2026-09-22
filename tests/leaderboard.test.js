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
  CORS_HEADERS
} from '../worker/index.js';

import {
  leaderboardService,
  sanitizeInitials as clientSanitizeInitials
} from '../src/systems/LeaderboardService.js';

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
                if (sql.includes('SELECT COUNT(*) + 1 as rank')) {
                  const gameId = args[0];
                  const score = args[1];
                  const count = store.filter((r) => r.game_id === gameId && r.score > score).length;
                  return { rank: count + 1 };
                }
                return null;
              },
              async run() {
                // Handle INSERT
                if (sql.includes('INSERT INTO leaderboards')) {
                  const [game_id, initials, score, detail] = args;
                  const newRow = {
                    id: store.length + 1,
                    game_id,
                    initials,
                    score,
                    detail,
                    created_at: new Date().toISOString()
                  };
                  store.push(newRow);
                  return { success: true };
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

  // Valid POST higher than existing
  const postReq1 = new Request('https://api.al.lusk.win/api/v1/leaderboard/invaders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initials: 'KEL', score: 15000, detail: 'Wave 6' })
  });
  const postRes1 = await handleRequest(postReq1, env);
  assert.equal(postRes1.status, 201);
  const postData1 = await postRes1.json();
  assert.equal(postData1.success, true);
  assert.equal(postData1.rank, 1, 'Top score should earn Rank #1');
  assert.equal(postData1.initials, 'KEL');

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
