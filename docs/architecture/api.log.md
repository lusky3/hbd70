# API Architecture Decision Log

### [api][2026-09-22][main]
source_spec: docs/specs/arcade-leaderboards-cloudflare-d1.md
source_sha: 0e37267

- [DECISION] Choose Cloudflare Workers + D1 (serverless SQLite at edge) for persistent leaderboards: zero external SDK client bundle footprint, zero cold sleep on free tier.
- [DECISION] RESTful endpoints under /api/v1/leaderboard/:gameId supporting GET (top 10 scores with CORS) and POST (sanitized initials, score, detail).
- [DECISION] Enforce per-game score limits (Pong 1,000, Tanks 300,000, Invaders 500,000, Asteroids 2,000,000) and IP sliding window rate limiting (15 requests/minute).
- [DECISION] Client LeaderboardService enforces 3000ms AbortController timeout and seamless fail-soft fallback to localStorage.
