---
phase: 07-type-baseline-regex-cleanup
plan: 01
subsystem: testing
tags: [typescript, tsc, type-safety, noUncheckedIndexedAccess, exactOptionalPropertyTypes, oxc-parser]

# Dependency graph
requires:
  - phase: 05-add-and-upgrade-commands
    provides: source files with type errors introduced by strict tsconfig flags
provides:
  - Zero tsc errors across all 6 source files (clean type baseline for v1.1)
  - Type-safe undefined guards, conditional spreads, and union discriminants
affects: [08-content-population, 09-migration-architecture, 10-tooling-switch, 11-create-qwik]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional spread for exactOptionalPropertyTypes: ...(val !== undefined && { key: val })"
    - "Non-null assertion for statically-known Record keys: COMMANDS.help!()"
    - "Union discriminant helper for oxc-parser ModuleExportName: check node.type === 'Literal'"
    - "Early return guard for noUncheckedIndexedAccess: if (!command) return;"

key-files:
  created: []
  modified:
    - src/app-command.ts
    - src/router.ts
    - src/integrations/update-app.ts
    - src/migrate/rename-import.ts
    - src/console.ts
    - src/commands/add/index.ts
    - src/core.ts

key-decisions:
  - "Non-null assertion (!) used for COMMANDS.help and COMMANDS[task] — keys are statically defined in the Record literal, so undefined is impossible at runtime"
  - "getModuleExportName() helper discriminates on node.type === 'Literal' (StringLiteral) vs Identifier (IdentifierName/IdentifierReference) — aligns with @oxc-project/types union definition"
  - "Option<T> from @clack/prompts imported as ClackOption in core.ts to avoid collision with existing local Option type for yargs option config"
  - "console.ts uses inline type import (type Option) merged into existing @clack/prompts import block"

patterns-established:
  - "Conditional spread pattern for exactOptionalPropertyTypes compliance throughout codebase"
  - "oxc-parser ModuleExportName discriminant: type === 'Literal' => .value, else .name"

requirements-completed: [TOOL-03]

# Metrics
duration: 4min
completed: 2026-04-02
---

# Phase 7 Plan 1: Type Baseline Summary

**Zero tsc errors established across 7 files by adding undefined guards, conditional spreads, non-null assertions, and a ModuleExportName union discriminant helper — no runtime behavior changes**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-02T12:38:17Z
- **Completed:** 2026-04-02T12:42:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Eliminated all 9 TypeScript compiler errors from 6 plan-specified source files
- Added `getModuleExportName()` helper for safe `ModuleExportName` union access in rename-import.ts
- Fixed downstream `core.ts` error caused by updated `scanChoice` signature (auto-fix)
- Confirmed 0 test regressions — 69 tests pass (6 pre-existing failures unchanged)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix noUncheckedIndexedAccess and cross-spawn errors (4 files)** - `71eafb9` (fix)
2. **Task 2: Fix exactOptionalPropertyTypes errors (2 files)** - `c805ad7` (fix)

**Plan metadata:** (pending final docs commit)

## Files Created/Modified
- `src/app-command.ts` - Added `if (arg === undefined) return undefined;` guard before `.includes()/.split()`
- `src/router.ts` - Non-null assertions on `COMMANDS.help!()` and `COMMANDS[task]!()`
- `src/integrations/update-app.ts` - Early return `if (!command) return;` after destructuring split result
- `src/migrate/rename-import.ts` - Added `getModuleExportName()` helper; imports `ModuleExportName` via inline `import("oxc-parser")` type
- `src/console.ts` - Conditional spreads for `initialValue` and `placeholder`; `Option<T>` type imported and used for `scanChoice` parameter
- `src/commands/add/index.ts` - Conditional spreads for `id` and `projectDir` in `validate()` return
- `src/core.ts` - Updated `scanChoice` parameter to `ClackOption<V>[]` to match updated console.ts signature

## Decisions Made
- Used `import("oxc-parser").ModuleExportName` inline type pattern instead of `import type { ModuleExportName } from "@oxc-project/types"` — the `@oxc-project/types` package is not directly resolvable as a module specifier, while `oxc-parser` re-exports it via `export *`
- Renamed `Option` to `ClackOption` in `core.ts` import to avoid collision with existing local `Option` type (used for yargs option configuration)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated core.ts scanChoice parameter type**
- **Found during:** Task 2 (Fix exactOptionalPropertyTypes errors)
- **Issue:** After changing `scanChoice` in `console.ts` to accept `Option<T>[]`, `core.ts` still passed `{ value: V; label: string; hint?: string }[]` which triggered TS2345 — not assignable to `Option<V>[]` with `exactOptionalPropertyTypes: true`
- **Fix:** Added `import type { Option as ClackOption } from "@clack/prompts"` to `core.ts` and updated `scanChoice` wrapper parameter to `ClackOption<V>[]`
- **Files modified:** `src/core.ts`
- **Verification:** `npx tsc --noEmit` exits 0 after fix
- **Committed in:** `c805ad7` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 downstream type fix)
**Impact on plan:** Necessary downstream fix — changing `console.ts` signature required matching `core.ts` wrapper. No scope creep.

## Issues Encountered
- `@oxc-project/types` is not directly importable as a module — resolved by using `import("oxc-parser").ModuleExportName` inline type which works via oxc-parser's `export *` re-export

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Clean type baseline established — all 7 files type-safe under strict tsconfig
- `tsc --noEmit` exits 0; safe to proceed with structural changes in v1.1
- No blockers

## Self-Check: PASSED

- All 7 modified files exist on disk
- Task 1 commit 71eafb9 verified
- Task 2 commit c805ad7 verified

---
*Phase: 07-type-baseline-regex-cleanup*
*Completed: 2026-04-02*
