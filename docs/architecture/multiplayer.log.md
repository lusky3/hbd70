# Multiplayer Architecture Decision Log

### [multiplayer][2026-09-23][main]
source_spec: docs/specs/multiplayer-lobby-polish-and-pwa.md
source_sha: b485a41d3cccdd56b4d97e6e3815ced9b7954e66

- [DECISION] Vendored QR Code: Local bundle vendor/qrcode.min.js replaces CDN dependency to ensure offline reliability and avoid CSP/MIME issues.
- [DECISION] Client Disconnect Event Decoupling: Guard host-disconnected handler with wasKicked state to prevent connection close race conditions from clobbering host kick status notifications.
- [DECISION] Star Topology Chat & Profanity Sanitization: Bidirectional WebRTC LOBBY_CHAT packets sanitized both on client submission and host broadcast using ProfanityFilter.censorText().
- [DECISION] Roster Kick Button Depth & Geometry: Partition row interaction width to preserve a clear 46px margin for the red ✕ kick button container (depth: 10, 32x32 hit zone) preventing zone shadowing.
