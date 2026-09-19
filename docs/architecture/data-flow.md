---
status: living
domain: data
created: 2026-09-19
last_updated: 2026-09-19
---

# Data Flow — Layer 1 Synthesis

> This is the current effective design. Written by /app-init. Updated only by /govern-docs --restructure.
> Decision history is in docs/architecture/data.log.md (L2 — append-only).

## Current Design

[TBD] — Populated by /govern-docs --restructure after first /ship consolidation.

## Key Principles

- Embedded SQLite database managed with Drizzle ORM.
- Clear table conventions (`players`, `game_sessions`, `scores`) with `id`, `created_at`, `updated_at`.

## Constraints

- SQLite file storage in `server/data/hbd70.db`.
