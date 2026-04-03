---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Phases
status: executing
stopped_at: Completed 16-qwikcityprovider-structural-rewrite/16-01-PLAN.md
last_updated: "2026-04-03T22:43:36.250Z"
last_activity: "2026-04-03 — Phase 13-01 complete: SourceReplacement/TransformFn types + applyTransforms orchestrator"
progress:
  total_phases: 17
  completed_phases: 15
  total_plans: 33
  completed_plans: 33
  percent: 65
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-03)

**Core value:** Every command in the existing Qwik CLI must work identically in the new package — 67 MUST PRESERVE behaviors cannot regress.
**Current focus:** Milestone v1.2 — Comprehensive V2 Migration Automation (Phase 13 ready to plan)

## Current Position

Phase: 13 of 17 (Transform Infrastructure)
Plan: 01 of TBD (complete)
Status: In progress — Phase 13 Plan 01 done
Last activity: 2026-04-03 — Phase 13-01 complete: SourceReplacement/TransformFn types + applyTransforms orchestrator

Progress: [███████████░░░░░░] 65% (phases 1-12 complete; phase 13 in progress)

## Performance Metrics

**Velocity (v1.2):**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase (v1.2):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 13. Transform Infrastructure | TBD | - | - |
| 14. Config Validation and Simple Behavioral Transform | TBD | - | - |
| 15. Ecosystem Migration and Async Hook Transforms | TBD | - | - |
| 16. QwikCityProvider Structural Rewrite | TBD | - | - |
| 17. Transform Test Coverage | TBD | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 13-transform-infrastructure P02 | 6 | 2 tasks | 4 files |
| Phase 14-config-validation-and-simple-behavioral-transform P01 | 2 | 2 tasks | 3 files |
| Phase 14-config-validation-and-simple-behavioral-transform P02 | 5 | 2 tasks | 3 files |
| Phase 15-ecosystem-migration-and-async-hook-transforms P01 | 5 | 1 tasks | 4 files |
| Phase 15 P02 | 3 | 2 tasks | 5 files |
| Phase 16-qwikcityprovider-structural-rewrite P01 | 2 | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Init: oxc-parser + magic-string over ts-morph (lighter, matches reference impl)
- [v1.2 roadmap]: Parse-once fan-out architecture — Phase 13 must establish SourceReplacement[] infra before any transform is written (magic-string collision prevention)
- [v1.2 roadmap]: XFRM-01/XFRM-03 (useAsync$ transforms) placed in Phase 15 and marked blocked pending project owner confirmation that useAsync$ exists in @qwik.dev/core v2
- [v1.2 roadmap]: XFRM-04 (QwikCityProvider) in its own Phase 16 — most complex transform, JSX structural rewrite, cannot share phase with simpler transforms
- [v1.2 roadmap]: Phases 14/15/16 can run in parallel after Phase 13; Phase 17 waits for all three
- [13-01]: Explicit collision detection added in applyTransforms — magic-string's native error is cryptic; preflight loop with descriptive message preferred for transform authors
- [Phase 13-transform-infrastructure]: binary-extensions.ts pruned to 57 entries covering only Qwik-relevant formats; niche formats (3D, Java bytecode, disk images, etc.) removed
- [Phase 13-transform-infrastructure]: RNME-01/RNME-02 placed in Round 1 of IMPORT_RENAME_ROUNDS (not a new round) since they share the @builder.io/qwik-city library prefix
- [Phase 14-01]: Raw-string regex for tsconfig transforms preserves JSONC comments without a full JSONC parser
- [Phase 14-01]: fixPackageType uses JSON.parse (not raw string) because package.json is always standard JSON
- [Phase 14-02]: Import Node type from oxc-parser (not @oxc-project/types) — oxc-parser re-exports the full type surface and is the only declared dep
- [Phase 14-02]: Solo eagerness replacement targets opts.start→args[1].start (not opts.end) to capture the trailing comma+space separator
- [Phase 15-ecosystem-migration-and-async-hook-transforms]: walkNode extracted to shared walk.ts — remove-eagerness.ts and migrate-qwik-labs.ts both import from shared utility
- [Phase 15-ecosystem-migration-and-async-hook-transforms]: First-char overwrite trick for TODO comment insertion (start/start+1 range) — zero-width MagicString overwrite not supported
- [Phase 15]: Test assertions for useResource$ use '= useResource$(' not bare string — TODO comment text contains useResource$ literally
- [Phase 15]: hasSyncUsage flag for mixed useComputed$ — if any sync call exists, import not renamed; TODO prepended instead
- [Phase 16-qwikcityprovider-structural-rewrite]: XFRM-04 looks for @qwik.dev/router import (not @builder.io/qwik-city) — Phase 13 import renaming runs first in Step 2 before Step 2b behavioral transforms
- [Phase 16-qwikcityprovider-structural-rewrite]: Factory reads package.json once at factory call time (not per-file) — performance optimization for large projects

### Pending Todos

None.

### Blockers/Concerns

- Phase 15 (XFRM-01, XFRM-03): useAsync$ does not exist in @qwik.dev/core v2 as of 2026-04-03. Must confirm with project owner whether target is useAsync$ (future export) or useTask$ + signal pattern before Phase 15 planning begins. Phase 15 is NOT fully blocked — ECOS-01 can proceed independently.
- Phase 9 (v1.1): 1 of 2 plans still pending (09-02-PLAN.md — wire MigrateProgram to new orchestrator)

## Session Continuity

Last session: 2026-04-03T22:41:26.890Z
Stopped at: Completed 16-qwikcityprovider-structural-rewrite/16-01-PLAN.md
Resume file: None
