---
status: living
domain: ui
created: 2026-09-19
last_updated: 2026-09-19
---

# UI Patterns — Layer 1 Synthesis

> This is the current effective design. Written by /app-init. Updated only by /govern-docs --restructure.
> Decision history is in docs/architecture/ui.log.md (L2 — append-only).

## Current Design

[TBD] — Populated by /govern-docs --restructure after first /ship consolidation.

## Key Principles

- Phaser 3 game scenes with distinct lifecycle methods (`init`, `preload`, `create`, `update`).
- Mobile touch controls with finger-friendly hit areas (≥48x48px).
- Responsive viewport scaling with auto-centering on smartphone screens.

## Constraints

- Mobile browser audio policies require user gesture on first interaction to unlock audio.
