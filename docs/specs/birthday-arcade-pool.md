---
title: "Allan's 70th Birthday Arcade: Pool Game (8-Ball, 9-Ball, Straight, Speed, VS CPU & Multiplayer)"
status: shipped
created: 2026-09-25
updated: 2026-09-25
primary_domain: arcade
---

# Feature Spec: Allan's 70th Birthday Retro Pool Game

## 1. Problem Statement
The Allan's 70th Birthday Retro Arcade Collection features Birthday Tanks, Birthday Pong, Space Invaders, and Asteroids. To round out Allan's beloved sports and pub hobbies (alongside hockey and golf featured in earlier levels and Pong), a top-down retro Pocket Billiards / Pool game is requested. It requires 4 classic game subtypes (8-Ball, 9-Ball, Straight Pool, and Speed Pool), a competitive VS CPU mode with 4 difficulty levels (Novice to Allan Legend), an arcade scoring system with multipliers, dedicated leaderboards per subtype, and 2-player real-time WebRTC multiplayer.

---

## 2. Acceptance Criteria

### AC-1: Pocket Billiards Table & Sub-Step 2D Physics Engine
- Table surface rendered inside the 480px width mobile layout (360x600 green felt arena with wood rails and 6 brass-trimmed pocket holes: 4 corners, 2 side pockets).
- 16 realistic pool balls (Cue ball + Solids 1-7 + 8-Ball + Stripes 9-15) with authentic retro colors, specular highlights, and number rings.
- Sub-step 2D physics solver (`src/systems/PoolPhysics.js`):
  - 4 physics iterations per frame ensuring circle-to-circle elastic collision resolution without clipping or tunneling.
  - Cushion rail reflection with realistic restitution ($e = 0.92$).
  - Rolling friction deceleration ($0.985$ per frame) and pocket gravity capture within pocket radius.
  - Audio cues for ball-on-ball impact, rail cushions, and pocket drops.

### AC-2: Four Game Subtypes & Rules Engine
- **8-Ball**:
  - Triangle rack; first potted ball after break assigns solids (1-7) or stripes (9-15).
  - Scratch on 8-ball or potting 8-ball before group is cleared results in loss; legal 8-ball pot wins.
- **9-Ball**:
  - Diamond rack with 9-ball at center; cue ball must make first contact with lowest-numbered ball on table.
  - Legal pocketing of 9-ball wins.
- **Straight Pool (14.1 Continuous)**:
  - 1 point per legal ball potted.
  - Automatic re-rack of 14 balls when only 1 object ball remains, continuing the inning.
  - Target score (e.g. 25 points) or rack clearance.
- **Speed Pool (Arcade Time-Attack)**:
  - Solo challenge clearing a full rack against a 90s countdown clock.
  - Each potted ball awards +10 seconds time bonus.

### AC-3: VS CPU Artificial Intelligence (4 Difficulty Tiers)
- **Novice (Easy)**: Relaxed cut angle limit (<45°), ±10° aim variance, static cue power.
- **Regular (Medium)**: Cut angles up to 60°, ±4° aim variance, distance-proportional power.
- **Master (Hard)**: Extreme cut angles up to 80°, ±1.2° aim variance, basic position play.
- **Allan Legend (Birthday Master)**: High-accuracy position play, ±0.2° aim variance, trick bank shot capability, celebration fanfare on victory.
- Smooth cue stick aiming animation before striking.

### AC-4: Intuitive Touch & Desktop Controls
- Drag on table to rotate fine-aiming reticle and display ghost-ball trajectory ray.
- Vertical power meter slider with pull-back spring release on cue stick.
- Left/Right fine-step adjustment buttons (`◀` / `▶`) for mobile ergonomics.
- Ball-in-hand placement support following cue ball scratch fouls.

### AC-5: Arcade Scoring & Cloudflare D1 Leaderboards
- Consecutive streak multipliers (x1 to x4).
- Trick shot bonuses: Bank shot (+500), Combo / Carom (+750), Break pot (+300).
- Dedicated leaderboards in `LeaderboardModal`:
  - `pool_8ball`: 8-Ball Master
  - `pool_9ball`: 9-Ball Rotation
  - `pool_straight`: Straight Pool
  - `pool_speed`: Speed Pool Time-Attack
- Cloudflare D1 Worker schema and API validation support for pool sub-types.

### AC-6: Real-Time 2-Player WebRTC Multiplayer
- Selectable from `MultiplayerLobbyScene`: "Billiards / Pool" with sub-mode toggle (8-Ball, 9-Ball, Straight, Speed).
- Turn-based play synchronized over WebRTC DataChannels:
  - Host acts as authoritative simulation authority.
  - Turn handoff when balls stop rolling and no foul occurs.
  - Disconnect handling and rematch capabilities.

---

## Domain Decisions
- [DECISION] Implement dedicated custom 2D circle-to-circle physics in `PoolPhysics.js` rather than relying on arcade box physics, ensuring exact angle of incidence and billiard restitution.
- [DECISION] Partition Pool leaderboards into 4 distinct game categories (`pool_8ball`, `pool_9ball`, `pool_straight`, `pool_speed`) to preserve the competitive integrity of each format.
- [DECISION] Host-authoritative turn execution for multiplayer matches: client sends shot vector (angle, power, spin), host calculates ball movements and streams state snapshots, maintaining zero desync across peers.
