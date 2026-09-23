---
status: frozen
title: "Allan's 70th Birthday Arcade: Multi-Device Real-Time Multiplayer"
source: internal
source_doc: user_request
created: 2026-09-22
updated: 2026-09-22
primary_domain: gameplay
secondary_domains: [ui, api]
---

# Allan's 70th Birthday Arcade: Multi-Device Real-Time Multiplayer

## Overview
Enable real-time, low-latency multi-device multiplayer across mobile smartphones, tablets, and desktop browsers without any app installation:
1. **Serverless WebRTC P2P Transport**: Implement browser-to-browser peer-to-peer DataChannels via PeerJS (`peerjs.min.js`) backed by public STUN signaling (`stun.l.google.com:19302`), providing zero server hosting costs and ultra-low latency (<30-50ms) for real-time arcade action.
2. **Room Lifecycle & QR Code Onboarding**:
   - Host generates a unique 4-character room code (e.g. `AL70`, `HBD7`, excluding confusing characters `0`, `O`, `1`, `I`).
   - Host screen displays the room code and renders a crisp QR code on canvas.
   - Mobile players scan the QR code to open `https://al.lusk.win/?room=XXXX` (or local host origin), auto-filling the code and connecting in 1 tap.
3. **Multiplayer Lobby & Profile Integration**:
   - Up to 4 players in a room, integrating stored player profiles (3-letter tag + full name from `Storage.js`).
   - Slot-based color assignments:
     - Player 1 (Host): Neon Cyan / Blue (`#38bdf8`) — Allan's Cruiser
     - Player 2: Neon Emerald / Green (`#4ade80`)
     - Player 3: Neon Crimson / Red (`#f87171`)
     - Player 4: Neon Amber / Gold (`#facc15`)
   - Host chooses game mode: **Birthday Tanks Arena (2-4 Players)** or **Birthday Pong (2 Players)**.
4. **Host-Authoritative Game Simulation**:
   - Host simulates the authoritative 60 FPS physics loop (Phaser arcade physics, collisions, ricochets, explosions, frag scores).
   - Remote clients transmit lightweight input packets (`moveX`, `moveY`, `aimX`, `aimY`, `isFiring`, `wantsMine`) at 30-40 Hz.
   - Host broadcasts snapshot packets at 20-30 Hz.
   - Remote clients perform client-side prediction on local entity and linear interpolation (`lerp`) on remote entities for jitter-free 60 FPS rendering.
5. **Multiplayer Birthday Tanks Arena**:
   - 2 to 4 player arena deathmatch with destructible birthday gift crates, bouncing boundaries, and 1.5s spawn invulnerability.
   - Overhead player tag indicators (`[ALL]`, `[COD]`, etc.) and health meters.
   - Live match scoreboard (frags / lives) and match end victory screen with rematch option.
6. **Multiplayer Birthday Pong (2 Players)**:
   - Synchronized 2-player paddle rally with inverted view for Player 2 so both players play with their paddle on bottom.
7. **Resilience & Fail-Soft Offline**:
   - Heartbeat ping/pong every 2 seconds with latency calculation.
   - Graceful disconnect handling (if a client leaves, match continues; if host leaves, clients are notified with return to menu).
   - Single-player campaign and offline features remain completely untouched.

---

## Acceptance Criteria

- **AC-1: WebRTC NetworkManager & Room Lifecycle**:
  - `src/systems/NetworkManager.js` wraps PeerJS lifecycle, peer ID formulation (`hbd70-<ROOM_CODE>`), connection negotiation, and binary/JSON packet serialization.
  - Generates 4-character uppercase alphanumeric room codes avoiding ambiguous glyphs.
  - Supports `createRoom()`, `joinRoom(code)`, `sendInput()`, `broadcastState()`, `sendEvent()`, and `disconnect()`.
  - Dispatches standardized events (`player-joined`, `player-left`, `state-update`, `game-start`, `host-disconnected`).

- **AC-2: Multiplayer Lobby & QR Code Scanning**:
  - `src/scenes/MultiplayerLobby.js` provides Host and Join modes accessible via `[ 🌐 MULTIPLAYER ]` on `GameSelectScene`.
  - Host view displays large 4-character room code, crisp Canvas QR code generated via `qrcode.min.js`, and live 4-slot player roster.
  - Join view supports manual code entry and auto-joins if URL query parameter `?room=XXXX` is detected on page load.
  - Roster displays player 3-letter initials tag, full name (or default), color badge, and ready status.
  - Host can select game mode ("Tanks Arena" or "Pong") and launch match once ≥ 2 players have joined.

- **AC-3: Host-Authoritative Tanks Arena & State Synchronization**:
  - `src/scenes/MultiplayerTanks.js` implements a dedicated 4-player tactical arena.
  - Host authoritatively updates physics for all 2-4 tanks, bullets, and mines.
  - Clients send input packets; host processes inputs and broadcasts 20-30 Hz state snapshots.
  - Clients render local tank with zero latency input prediction, and smoothly interpolate remote tanks using lerp.
  - Color-coded tank sprites, headlights, bullets, and overhead tags matching each player's slot.

- **AC-4: Frag Tracking, Match Lifecycle & Rematch**:
  - Tanks have 3 health points per life; bullets deal 1 damage; mines deal 3 damage.
  - Frags and deaths tracked in real-time HUD leaderboard.
  - First player to 5 frags (or highest frags on match timeout) triggers Match Over overlay with final rankings.
  - Host can click "PLAY AGAIN" to reset arena, or "RETURN TO LOBBY" to switch game modes.

- **AC-5: 2-Player Multiplayer Pong**:
  - `src/scenes/MultiplayerPong.js` synchronizes 2-player Pong match.
  - Host simulates ball physics and collisions.
  - Inverted perspective: Client sees their paddle at the bottom and host paddle at the top, ensuring natural touch controls on both devices.
  - First player to 7 points wins the match.

- **AC-6: Disconnect Resilience & Fail-Soft Safety**:
  - 2-second heartbeat ping monitor; dropped clients are removed from game roster without crashing the scene.
  - If Host disconnects, clients display an informative modal dialog and return to `GameSelect`.
  - All single-player games, offline features, local storage, and leaderboards remain completely unaffected.

---

## Domain Decisions

### [gameplay][2026-09-22][main]
- **Topology**: Host-Authoritative Star Topology via WebRTC DataChannels (PeerJS). Eliminates the need for a dedicated game server or recurring cloud bills, running 100% peer-to-peer between Allan's family's phones and tablets.
- **Latency Masking**: Local input prediction for movement combined with remote entity linear interpolation (`lerp`) at 20-30 Hz broadcast frequency.
- **Mobile Ergonomics**: QR code camera scan enables instant frictionless mobile joining without typing on virtual keyboards. Pong perspective inversion provides ergonomic under-paddle touch controls for both competitors.
