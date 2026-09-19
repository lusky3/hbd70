# Project Current State (vNext)

> This is the **Single Source of Truth (SSoT)** — global project state that auto-updates
> via `/ship`. You don't edit this manually; placeholders fill in as you complete work.

- **Project Intent**: Web browser-based game primarily run on smartphones
- **Project Name**: hbd70
- **Core Guardrails**:
  - Correctness first: No claim of completion without evidence.
  - Small & reversible: Prioritize small, reversible changes; avoid unauthorized refactoring.
  - Document-first: Core logic or structural changes require a Spec/ADR first.
  - Handoff gate: Non-`tiny-fix` tasks must produce a traceable handoff summary.
- **System Map**:
  - Global SSoT: `.agentcortex/context/current_state.md`
  - Task Isolation: `.agentcortex/context/work/<worklog-key>.md`
  - Active Work Log Path: derive <worklog-key> from the raw branch name using filesystem-safe normalization before any gate checks.
  - Workflows & Policies: `.agent/workflows/*.md`, `.agent/rules/*.md`
- **Last Updated**: 2026-09-19
- **Last Verified**: 2026-09-19
- **Update Sequence**: 0
- **ADR Index**:
  - docs/adr/ADR-001-project-architecture.md: Project Architecture · applies_to: **
- **Active Backlog**: (none yet)
- **Spec Index** (project specs at `docs/specs/`):
  - docs/specs/birthday-tanks-core.md: Birthday Tanks! — Allan Lusk's 70th Birthday Edition [status: shipped] [Updated: 2026-09-19]
- **Canonical Commands**:
  - `/spec-intake`: Import external specs (from other LLMs, documents, or natural language). Handles large product specs via decomposition. Runs before `/bootstrap`.
  - `/bootstrap`: Task initialization & classification freeze.
  - `/plan`: Define target files, steps, risks, and rollback.
  - `/implement`: Execute implementation only when `IMPLEMENTABLE`.
  - `/review`: Check AC alignment & scope creep.
  - `/test`: Report test coverage via Test Skeleton.
  - `/handoff`: Output resumable state summary (mandatory for non-tiny-fix).
  - `/decide`: Record key decisions with reasoning to prevent cross-session re-derivation.
  - `/test-classify`: Auto-select test depth and evidence format based on task classification.
  - `/ship`: Consolidate evidence and update/archive state.
  - `ask-openrouter`: [OPTIONAL] External model delegation. See `.agent/workflows/ask-openrouter.md`.
  - `codex-cli`: [OPTIONAL] Codex CLI delegation. See `.agent/workflows/codex-cli.md`.
  - `claude-cli`: [OPTIONAL] Claude CLI delegation. See `.agent/workflows/claude-cli.md`.
  - `ask-local`: [OPTIONAL] Local-model (OpenAI-compatible endpoint) delegation. See `.agent/workflows/ask-local.md`.
- **References**:
  - `AGENTS.md`
  - `.agent/rules/engineering_guardrails.md`
  - `.agent/rules/state_machine.md`
  - `.agentcortex/docs/CODEX_PLATFORM_GUIDE.md`
  - `.agentcortex/docs/guides/token-governance.md` *(manual-only)*
  - `.agentcortex/docs/guides/context-budget.md` *(manual-only)*

> [!NOTE]
> This file is the Single Source of Truth for global project context only.
> Do not store per-task progress here; write progress to `.agentcortex/context/work/<worklog-key>.md`.

## Project Skills
- api-design: Fastify REST API conventions
- frontend-patterns: Phaser 3 + Vite mobile browser game conventions
- database-design: SQLite + Drizzle ORM conventions
- auth-security: Session-based HTTP-only cookie conventions
- doc-lookup: official doc URLs for Phaser 3, Vite, Fastify, SQLite, Drizzle ORM, Vitest, Playwright

## Global Lessons (AI Error Pattern Registry)
>
> Structured format:
> `- [Category: <tag>][Severity: <HIGH|MEDIUM|LOW>][Trigger: <normalized-trigger>] <lesson>`
>
> `/implement` reviews active HIGH-severity lessons before code changes. `/retro` may append new structured entries via guarded write.

(none yet)

## Ship History

### Ship-main-2026-09-19
- Feature shipped: Birthday Tanks! — 70-level retro arcade mobile browser tribute for Allan Lusk's 70th Birthday. Procedural Canvas vector sprites, Web Audio synthesizer with continuous 32-step chiptune BGM and HUD mute toggle, 7 decade worlds (1956-2026), 7 enemy archetypes, dual touch and desktop controls, GitHub Pages live deployment.
- Tests: Pass (16/16 node tests + Playwright headless browser E2E)
