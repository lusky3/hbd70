---
template: true
description: Feature spec template for HBD70 mobile web game project. Includes Phaser 3 game scenes, Fastify REST APIs, SQLite DB schema, and session cookie auth.
usage: Used by /spec-intake and /spec workflows when generating feature specs for HBD70.
---

# Spec Template: HBD70 Mobile Web Game Feature

> **Instructions for AI**: When generating a feature spec for HBD70, read the project ADR (`docs/adr/ADR-001-project-architecture.md`). Include only sections relevant to the feature being defined.

```markdown
---
status: draft
title: <Feature Name>
source: <external | internal | continuation>
source_doc: <e.g., _product-backlog.md #N | user-provided>
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
primary_domain: ui
secondary_domains: [api, data, auth]
---

# <Feature Name>

## Goal
<1-3 sentences: what gameplay experience, screen, or capability does this feature deliver on mobile browsers?>

## Acceptance Criteria
1. <AC must be testable, touch-friendly, and measurable on mobile browsers>
2. <Use [INFERRED] / [FROM-SOURCE] / [NEEDS-CONFIRMATION] tags per /spec-intake §3>
3. ...

## Non-goals
- <What this feature explicitly does NOT do>
- <Prevents scope creep during /implement>

## Constraints
- Must render and scale smoothly via Phaser 3 on smartphone screen viewports (16:9 / 19.5:9 portrait or landscape).
- Touch hitboxes must be at least 48x48px for finger taps.
- Backend calls to Fastify must use `/api/v1` and handle offline/latency states gracefully.
- Audio playback must adhere to mobile browser gesture unlock requirements.

---

## Game Client & Scenes
<!-- Include this section if feature involves Phaser 3 gameplay, scenes, or touch overlays -->

### Scenes Affected

| Scene | Action | Lifecycle Hooks Changed | Description |
|---|---|---|---|
| <SceneName> | <ADD / MODIFY> | <init / preload / create / update> | <visual / gameplay changes> |

### Game Entities & Touch Controls

| Entity / Control | Type | Input Handlers | Visual / Physics Behavior |
|---|---|---|---|
| <Name> | <Sprite / Container / Button> | <pointerdown / drag> | <collision, animation, tween> |

### Responsive Scaling & Asset Notes
- Scaling mode: `Phaser.Scale.FIT` (autoCenter `CENTER_BOTH`)
- Asset requirements: <images, spritesheets, audio files, font assets>

---

## API Contract
<!-- Include this section if feature communicates with backend server -->

### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| <GET/POST/PUT/DELETE> | /api/v1/<path> | <Cookie session / Public> | <description> |

### Request / Response

#### <METHOD> /api/v1/<path>

**Request**:
```json
{
  "<field>": "<type — description>"
}
```

**Response** (success):
```json
{
  "<field>": "<type — description>"
}
```

**Error cases**:
| Status | Error Code | When |
|---|---|---|
| 400 | VALIDATION_ERROR | <invalid body or params> |
| 401 | UNAUTHORIZED | <missing or expired session cookie> |
| 404 | NOT_FOUND | <resource not found> |

---

## Database Schema (SQLite / Drizzle)
<!-- Include this section if feature changes persistent game data -->

### Schema Definition
```sql
CREATE TABLE <table_name> (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  <column>    <type> <constraints>,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Migration Notes
- Reversible migration via Drizzle Kit
- Local database file: `server/data/hbd70.db`

---

## Verification & Testing
- Vitest unit tests: Game logic helper functions and backend route handlers.
- Mobile emulation test: Verify viewport scaling and touch interaction in mobile device mode.
```
