---
status: accepted
date: 2026-09-19
applies_to: ["**"]
---

# ADR-001: Project Architecture & Tech Stack

## Status

Accepted

## Date

2026-09-19

## Context

HBD70 is a mobile browser-based game designed primarily to run smoothly and responsively on smartphones. The application requires lightweight performance, touch-optimized interactions, low latency, embedded session management, and local/light persistence for player progress and leaderboards.

## Decision

### Project Type

mobile-web-game (Full-stack: client-side mobile browser game + lightweight backend API)

### Tech Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Frontend | Phaser 3 + Vite + TypeScript | Phaser ^3.80, Vite ^5.x | Fast 2D WebGL/Canvas game engine, responsive mobile viewport & touch gestures |
| Backend | Node.js (Fastify) + TypeScript | Fastify ^4.x | Lightweight, low-overhead HTTP API server for sessions & game state |
| Database | SQLite (better-sqlite3 / Drizzle ORM) | SQLite 3 | Embedded, zero-latency local database, easily portable to hosted SQLite |
| Auth | Session-based / Cookies | HTTP-only Cookies | Secure cookie session tracking for game players and progress |
| Hosting | TBD / Static Hosting + Container | — | Frontend as static web bundle, Fastify as lightweight node container |
| CI/CD | GitHub Actions | — | Automated linting, testing, and build verification |

### Directory Structure

```
hbd70/
├── client/                 # Frontend mobile game client
│   ├── src/
│   │   ├── assets/         # Sprites, audio, fonts
│   │   ├── scenes/         # Phaser game scenes (Boot, Preload, Menu, Game, GameOver)
│   │   ├── objects/        # Game entities, touch controllers, UI overlays
│   │   ├── types/          # Client-side type definitions
│   │   └── main.ts         # Game entry point & Phaser configuration
│   ├── index.html
│   └── vite.config.ts
├── server/                 # Backend API & session server
│   ├── src/
│   │   ├── routes/         # API routes (/api/session, /api/score, /api/state)
│   │   ├── db/             # SQLite schema, migrations, connection
│   │   ├── services/       # Game session & validation logic
│   │   └── index.ts        # Fastify server bootstrap
│   └── tsconfig.json
├── shared/                 # Shared types, protocols, and constants
│   └── types/
├── tests/                  # Unit and integration tests
├── .agentcortex/           # AI governance (managed by brain)
└── package.json
```

### Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Files | kebab-case | `player-controller.ts`, `game-scene.ts` |
| Components / Classes | PascalCase | `GameScene`, `TouchOverlay` |
| API routes | kebab-case | `/api/player-session`, `/api/high-scores` |
| DB tables | snake_case, plural | `players`, `game_sessions`, `scores` |
| DB columns | snake_case | `session_id`, `created_at` |
| Environment vars | UPPER_SNAKE_CASE | `PORT`, `SESSION_SECRET` |

### API Design

- Style: REST
- Base path: `/api/v1`
- Versioning: URL path (`/api/v1/...`)
- Error format:
  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "Human readable error description",
      "details": {}
    }
  }
  ```
- Pagination: offset-based (for leaderboards)
- Auth header: Cookie (`hbd70_session`)

### Database Design

- ORM / Query builder: Drizzle ORM (or better-sqlite3)
- Migration tool: Drizzle Kit
- Naming: plural tables (`game_sessions`), snake_case columns
- Required fields per table: `id`, `created_at`, `updated_at`
- Soft delete: no

### Auth & Security

- Auth flow: Session cookie with server-side session store
- Password hashing: N/A (casual player session identifier / guest token unless admin auth added)
- Role model: simple player vs admin
- Session management: server-side session signed with secret, stored in SQLite/memory
- CORS policy: strict origin list in production, localhost in development

### Testing

- Test framework: Vitest
- Test command: `npm test`
- Lint command: `npm run lint`
- Build command: `npm run build`
- Coverage target: 80% on server services and game logic utilities
- E2E framework: Playwright (mobile emulation profile)

## Open Decisions

- [ ] Select deployment target for server container (Fly.io / Render / Docker VPS)
- [ ] Determine audio asset pipeline and mobile audio unlock strategy
- [ ] Finalize game mechanics and theme details for HBD70

## Consequences

- AI agents reading this ADR will apply these conventions during /implement and /review.
- Domain skills (api-design, frontend-patterns, etc.) are derived from these decisions.
- Spec templates are customized based on this tech stack.
- Future architecture changes MUST create a new ADR that supersedes this one.
