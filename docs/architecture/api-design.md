---
status: living
domain: api
created: 2026-09-19
last_updated: 2026-09-19
---

# API Design — Layer 1 Synthesis

> This is the current effective design. Written by /app-init. Updated only by /govern-docs --restructure.
> Decision history is in docs/architecture/api.log.md (L2 — append-only).

## Current Design

[TBD] — Populated by /govern-docs --restructure after first /ship consolidation.

## Key Principles

- RESTful API structured under `/api/v1`.
- Fastify schemas for request/response serialization and validation.
- Standardized error envelopes with error code, message, and details.

## Constraints

- Low overhead for high-frequency player state or score updates.
