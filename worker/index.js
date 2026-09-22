// worker/index.js
// Cloudflare Worker API for Allan's 70th Birthday Retro Arcade Leaderboards

export const VALID_GAMES = ['tanks', 'pong', 'invaders', 'asteroids'];

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

export function sanitizeInitials(raw) {
  if (typeof raw !== 'string') return '???';
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return '???';
  // Allow A-Z, 0-9, and arcade special symbols (!, ?, ★, space)
  const cleaned = trimmed.replace(/[^A-Z0-9 !?★]/g, '?');
  return cleaned.slice(0, 3).padEnd(3, ' ');
}

export async function handleRequest(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');

  // Health check
  if (path === '' || path === '/health' || path === '/api/health') {
    return jsonResponse({
      status: 'ok',
      service: 'hbd70-leaderboard',
      games: VALID_GAMES,
      timestamp: new Date().toISOString(),
    });
  }

  // Route: /api/v1/leaderboard/:gameId or /leaderboard/:gameId
  const match = path.match(/^(?:\/api\/v1)?\/leaderboard\/([a-z0-9_-]+)$/i);
  if (!match) {
    return jsonResponse({ error: 'Endpoint not found' }, 404);
  }

  const rawGameId = match[1].toLowerCase();
  if (!VALID_GAMES.includes(rawGameId)) {
    return jsonResponse({ error: `Invalid gameId. Valid games are: ${VALID_GAMES.join(', ')}` }, 400);
  }

  // GET: Fetch top scores
  if (request.method === 'GET') {
    const limitParam = parseInt(url.searchParams.get('limit') || '10', 10);
    const limit = Math.max(1, Math.min(25, isNaN(limitParam) ? 10 : limitParam));

    try {
      const stmt = env.DB.prepare(
        `SELECT id, game_id, initials, score, detail, created_at 
         FROM leaderboards 
         WHERE game_id = ? 
         ORDER BY score DESC, created_at ASC 
         LIMIT ?`
      );
      const queryResult = await stmt.bind(rawGameId, limit).all();
      const results = queryResult.results || [];

      return jsonResponse({
        gameId: rawGameId,
        count: results.length,
        results: results.map((row, index) => ({
          rank: index + 1,
          id: row.id,
          initials: row.initials,
          score: row.score,
          detail: row.detail || '',
          createdAt: row.created_at,
        })),
      });
    } catch (err) {
      return jsonResponse({ error: 'Database query failed', message: err.message }, 500);
    }
  }

  // POST: Submit a score
  if (request.method === 'POST') {
    let payload = {};
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: 'Malformed JSON payload' }, 400);
    }

    const initials = sanitizeInitials(payload.initials);
    const rawScore = parseInt(payload.score, 10);

    if (isNaN(rawScore) || rawScore < 0) {
      return jsonResponse({ error: 'Score must be a positive integer' }, 400);
    }
    if (rawScore > 5000000) {
      return jsonResponse({ error: 'Score exceeds plausible threshold' }, 400);
    }

    const rawDetail = typeof payload.detail === 'string' ? payload.detail.trim().slice(0, 32) : '';

    try {
      const insertStmt = env.DB.prepare(
        `INSERT INTO leaderboards (game_id, initials, score, detail) VALUES (?, ?, ?, ?)`
      );
      await insertStmt.bind(rawGameId, initials, rawScore, rawDetail).run();

      // Compute player rank
      const rankStmt = env.DB.prepare(
        `SELECT COUNT(*) + 1 as rank FROM leaderboards WHERE game_id = ? AND score > ?`
      );
      const rankResult = await rankStmt.bind(rawGameId, rawScore).first();
      const rank = rankResult ? rankResult.rank : 1;

      return jsonResponse({
        success: true,
        gameId: rawGameId,
        rank,
        initials,
        score: rawScore,
        detail: rawDetail,
      }, 201);
    } catch (err) {
      return jsonResponse({ error: 'Failed to record leaderboard score', message: err.message }, 500);
    }
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  },
};
