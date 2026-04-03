---
phase: 15-ecosystem-migration-and-async-hook-transforms
plan: 02
subsystem: migration
tags: [oxc-parser, ast, transform, useAsync$, useComputed$, useResource$]

requires:
  - phase: 15-01
    provides: walk.ts shared walkNode utility, migrateQwikLabsTransform pattern

provides:
  - migrateUseComputedAsyncTransform: XFRM-01 TransformFn — rewrites async useComputed$ to useAsync$
  - migrateUseResourceTransform: XFRM-03 TransformFn — rewrites useResource$ to useAsync$ with TODO comments
  - 14 unit tests covering all async hook transform behaviors (7 per transform)
  - run-migration.ts updated: all 4 Phase 15 transforms registered in Step 2b

affects:
  - 17-transform-test-coverage (tests exist and pass, can be extended)

tech-stack:
  added: []
  patterns:
    - "TODO comment text must not be confused with call-site presence — test assertions should use '= useResource$(' not 'useResource$'"
    - "Mixed sync+async import handling — track hasSyncUsage flag; insert TODO instead of renaming import when both forms exist"
    - "Multiple TODO insertion dedup — use Set<number> to avoid duplicate TODO comments for nested calls sharing same enclosing statement"

key-files:
  created:
    - migrations/v2/transforms/migrate-use-computed-async.ts
    - migrations/v2/transforms/migrate-use-resource.ts
    - tests/unit/upgrade/migrate-use-computed-async.spec.ts
    - tests/unit/upgrade/migrate-use-resource.spec.ts
  modified:
    - migrations/v2/run-migration.ts

key-decisions:
  - "Tests for useResource$ check '= useResource$(' not 'useResource$' — the TODO comment contains 'useResource$' literally so bare string check fails"
  - "Multiple TODO count test uses /useAsync\\$\\(/g not /useAsync\\$/g — TODO comment text includes 'useAsync$' causing overcounting"
  - "hasSyncUsage flag drives import handling for useComputed$ — if any sync call exists, import is not renamed and TODO is prepended"
  - "All 4 transforms ordered: removeEagerness, qwikLabs, useComputedAsync, useResource — logical grouping with simplest first"

requirements-completed: [XFRM-01, XFRM-03]

duration: 3min
completed: 2026-04-03
---

# Phase 15 Plan 02: Async Hook Transforms Summary

**XFRM-01 and XFRM-03 implemented: useComputed$(async) rewrites to useAsync$ with mixed-usage TODO support; useResource$ rewrites to useAsync$ with return type change TODO comments; all 4 Phase 15 transforms wired into run-migration.ts**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-03T22:10:34Z
- **Completed:** 2026-04-03T22:13:35Z
- **Tasks:** 2 (Task 1 TDD: RED + GREEN, Task 2 auto)
- **Files modified:** 5

## Accomplishments

- Implemented `migrateUseComputedAsyncTransform` (XFRM-01) — async useComputed$ -> useAsync$, sync left alone, mixed usage gets TODO comment instead of broken import rename
- Implemented `migrateUseResourceTransform` (XFRM-03) — all useResource$ -> useAsync$ with TODO comment about ResourceReturn<T>.value -> AsyncSignal<T>.value return type change
- Wired all 4 transforms into `run-migration.ts` Step 2b — migration pipeline is now complete for Phase 15
- All 92 tests pass (14 new + 78 prior); no type errors

## Task Commits

Each task was committed atomically:

1. **RED — Failing tests for both transforms** - `071d75b` (test)
2. **GREEN — Implement both transforms** - `c0d1c5f` (feat)
3. **Wire transforms into run-migration.ts** - `9ab1d18` (feat)

_Note: TDD task committed in two atomic commits (RED test, GREEN implementation)_

## Files Created/Modified

- `migrations/v2/transforms/migrate-use-computed-async.ts` — XFRM-01 TransformFn: async useComputed$ -> useAsync$
- `migrations/v2/transforms/migrate-use-resource.ts` — XFRM-03 TransformFn: useResource$ -> useAsync$ with TODO
- `tests/unit/upgrade/migrate-use-computed-async.spec.ts` — 7 unit tests for XFRM-01
- `tests/unit/upgrade/migrate-use-resource.spec.ts` — 7 unit tests for XFRM-03
- `migrations/v2/run-migration.ts` — Step 2b updated with all 4 transforms registered

## Decisions Made

- **Test assertion strategy for TODO-containing transforms:** The TODO comment text for useResource$ includes "useResource$" literally. Tests use `= useResource$(` to check call-site presence rather than bare `useResource$` to avoid false failures from TODO text.
- **TODO count in multiple-call test:** The TODO comments also include "useAsync$" in the text. Test uses `/useAsync$\(/g` regex (with opening paren) to count only call sites, not TODO occurrences.
- **hasSyncUsage flag for mixed useComputed$:** Tracked during AST walk — if any sync (non-async) useComputed$ call exists, the import specifier is NOT renamed; a TODO comment is prepended to the import instead.
- **Transform ordering in Step 2b:** removeEagerness first (simplest), then qwikLabs, then useComputedAsync, then useResource — logical grouping by concern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test assertions adjusted for TODO comment content**
- **Found during:** Task 1 (GREEN phase — 5 tests failing)
- **Issue:** Tests used `not.toContain("useResource$")` but the TODO comment prepended to call sites contains "useResource$" literally in the text "useResource$ -> useAsync$ migration"
- **Fix:** Changed assertions to `not.toContain("= useResource$(")` to check only call sites, and fixed count test to match `/useAsync$\(/g` (with paren) to exclude TODO text occurrences
- **Files modified:** `tests/unit/upgrade/migrate-use-resource.spec.ts`
- **Verification:** All 14 tests pass after fix

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug in test assertions)
**Impact on plan:** Test logic corrected; behavior fully covered and semantically stronger assertions.

## Self-Check: PASSED

- migrate-use-computed-async.ts: FOUND
- migrate-use-resource.ts: FOUND
- migrate-use-computed-async.spec.ts: FOUND
- migrate-use-resource.spec.ts: FOUND
- Commit 071d75b (RED tests): FOUND
- Commit c0d1c5f (GREEN transforms): FOUND
- Commit 9ab1d18 (wire transforms): FOUND
