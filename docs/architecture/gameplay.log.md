# Gameplay Architecture Decision Log

### [gameplay][2026-09-19][main]
cross-ref: See [ui][2026-09-19][main] in docs/architecture/ui.log.md

### [gameplay][2026-09-19][main]
cross-ref: See [ui][2026-09-19][main] in docs/architecture/ui.log.md

### [gameplay][2026-09-19][main]
source_spec: docs/specs/cheats-difficulty-and-selection.md
source_sha: 845b5a4319e274c72f82ebfa7bb8e4624dcf5349

- [DECISION] Define top-right corner cheat hitbox as x > 400, y < 80 in 480x854 viewport.
- [DECISION] Define swipe-down gesture as start y < 285, end y > 570, |deltaX| < 160.
- [DECISION] Increase spawn invincibility duration to 3000ms with 200ms alpha yoyo repeats.
- [DECISION] Support CPU speed range from 0.25x (ultra-easy) to 2.0x (turbo) with default 1.0x.
- [DECISION] Reveal level select milestone titles in-place without resetting scroll or prematurely launching the level.

### [gameplay][2026-09-22][main]
cross-ref: See [ui][2026-09-22][main] in docs/architecture/ui.log.md

