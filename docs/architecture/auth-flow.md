---
status: living
domain: auth
created: 2026-09-19
last_updated: 2026-09-19
---

# Auth Flow — Layer 1 Synthesis

> This is the current effective design. Written by /app-init. Updated only by /govern-docs --restructure.
> Decision history is in docs/architecture/auth.log.md (L2 — append-only).

## Current Design

[TBD] — Populated by /govern-docs --restructure after first /ship consolidation.

## Key Principles

- Session-based authentication using HTTP-only, secure, SameSite cookies (`hbd70_session`).
- Server-side validation of active game sessions.

## Constraints

- Cookie security in mobile browsers must handle cross-origin or same-site environments correctly.
