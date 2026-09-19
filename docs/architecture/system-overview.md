---
status: living
domain: system
created: 2026-09-19
last_updated: 2026-09-19
---

# System Overview — Layer 1 Synthesis

> This is the current effective design. Written by /app-init. Updated only by /govern-docs --restructure.
> Decision history is in docs/architecture/system.log.md (L2 — append-only).

## Current Design

HBD70 is a mobile browser-based 2D game running on smartphones, built with Phaser 3 and Vite, supported by a lightweight Fastify Node.js backend with an embedded SQLite database for session tracking and leaderboards.

## Key Principles

- Mobile First: Touch latency, 60fps rendering, and responsive viewport scaling are primary constraints.
- Lightweight Stack: Minimal dependencies, fast cold-start, embedded local SQLite storage.
- Resilient State: Player sessions are tracked via secure HTTP-only cookies without requiring complex credentials.

## Constraints

- Must run smoothly on standard smartphone web browsers (iOS Safari, Android Chrome).
- Zero external heavyweight database infrastructure dependencies.
