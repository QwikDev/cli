---
phase: 14-config-validation-and-simple-behavioral-transform
plan: "02"
subsystem: migration
tags: [ast-transform, oxc-parser, magic-string, tdd, eagerness-removal, useVisibleTask]

# Dependency graph
requires:
  - phase: 13-transform-infrastructure
    provides: TransformFn/SourceReplacement types + applyTransforms orchestrator
  - phase: 14-01
    provides: run-migration.ts Step 3b wiring pattern
provides:
  - removeEagernessTransform: strips eagerness option from useVisibleTask$ calls
  - Step 2b behavioral transforms wired into runV2Migration
affects:
  - 17-transform-test-coverage

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Recursive AST walker over all node values (arrays + objects with type property)"
    - "TransformFn returning SourceReplacement[] — pure, no file I/O"
    - "Solo eagerness: replace opts.start→args[1].start with empty string (removes trailing comma+space)"
    - "Multi-prop eagerness: reconstruct object string from remaining properties via source.slice"

key-files:
  created:
    - migrations/v2/transforms/remove-eagerness.ts
    - tests/unit/upgrade/remove-eagerness.spec.ts
  modified:
    - migrations/v2/run-migration.ts

key-decisions:
  - "Import Node type from oxc-parser (not @oxc-project/types) — oxc-parser re-exports everything from @oxc-project/types and is the declared dependency"
  - "Recursive walk iterates all object values rather than a hard-coded field list — future-proofs against AST shape changes"
  - "Solo eagerness replacement target is opts.start→args[1].start (not opts.end) to capture the trailing ', ' before the callback"

patterns-established:
  - "TransformFn pattern: walk full AST recursively, collect SourceReplacement[], return — established for Phase 15 transforms"

requirements-completed: [XFRM-02]

# Metrics
duration: 5min
completed: 2026-04-03
---

# Phase 14 Plan 02: Eagerness Removal AST Transform Summary

**removeEagernessTransform TransformFn strips useVisibleTask$ eagerness option via recursive oxc-parser AST walk, with 7-case TDD coverage and Step 2b wiring in runV2Migration**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-03T21:17:13Z
- **Completed:** 2026-04-03T21:20:00Z
- **Tasks:** 2 (TDD task with RED/GREEN commits + wiring task)
- **Files modified:** 3

## Accomplishments

- Created `migrations/v2/transforms/remove-eagerness.ts` with exported `removeEagernessTransform: TransformFn`
- Recursive AST walker handles deeply nested calls (component$ depth 6+)
- Three removal strategies: solo prop (remove entire first arg + comma), multi-prop first, multi-prop last
- Created 7 tests covering all specified behaviors
- Wired `applyTransforms([removeEagernessTransform])` into `runV2Migration` as Step 2b after import-rename loop
- Full suite: 71 tests pass, zero type errors

## Task Commits

Each task was committed atomically:

1. **RED phase — failing tests** - `a25b39a` (test)
2. **GREEN phase — remove-eagerness.ts implementation** - `16e4071` (feat)
3. **Task 2: Wire into runV2Migration Step 2b** - `6629afd` (feat)

## Files Created/Modified

- `migrations/v2/transforms/remove-eagerness.ts` - removeEagernessTransform with recursive AST walker
- `tests/unit/upgrade/remove-eagerness.spec.ts` - 7 unit tests covering all 7 specified behaviors
- `migrations/v2/run-migration.ts` - Added Step 2b block + applyTransforms/removeEagernessTransform imports

## Decisions Made

- Import `Node` type from `oxc-parser` (not `@oxc-project/types`) — `oxc-parser` re-exports the full type surface and is the only declared dep
- Recursive walker uses `Object.values(node)` iteration to handle any AST depth without hard-coding field names
- Solo eagerness target range is `opts.start` to `args[1].start` (not `opts.end`) — this captures the `, ` separator that would otherwise become a dangling leading comma

## Deviations from Plan

**1. [Rule 1 - Bug] Import path corrected from @oxc-project/types to oxc-parser**
- **Found during:** Task 1 GREEN phase (tsc --noEmit)
- **Issue:** Plan specified `import type { Node } from "@oxc-project/types"` but that package is a transitive dep only; `oxc-parser` re-exports it and is the declared dependency
- **Fix:** Changed import source to `"oxc-parser"` which re-exports `Node` via `export * from "@oxc-project/types"`
- **Files modified:** migrations/v2/transforms/remove-eagerness.ts
- **Commit:** 16e4071 (applied before final GREEN commit)

## Issues Encountered

None beyond the import path correction above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- XFRM-02 requirement fulfilled
- TransformFn pattern established — Phase 15 transforms (ECOS-01, XFRM-01/03) can follow this exact pattern
- Phase 17 (test coverage) can reference remove-eagerness.ts and its spec as a coverage baseline
- runV2Migration step order is now: 1, 2, 2b, 3, 3b, 4, 5

---
*Phase: 14-config-validation-and-simple-behavioral-transform*
*Completed: 2026-04-03*
