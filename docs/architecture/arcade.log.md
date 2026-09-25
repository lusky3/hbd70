# Arcade Architecture Decision Log

### [arcade][2026-09-25][main]
source_spec: docs/specs/birthday-arcade-pool.md
source_sha: HEAD

- [DECISION] Implement dedicated custom 2D circle-to-circle physics in `PoolPhysics.js` rather than relying on arcade box physics, ensuring exact angle of incidence and billiard restitution.
- [DECISION] Partition Pool leaderboards into 4 distinct game categories (`pool_8ball`, `pool_9ball`, `pool_straight`, `pool_speed`) to preserve the competitive integrity of each format.
- [DECISION] Host-authoritative turn execution for multiplayer matches: client sends shot vector (angle, power, spin), host calculates ball movements and streams state snapshots, maintaining zero desync across peers.
