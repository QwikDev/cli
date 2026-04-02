---
phase: 09-migration-architecture
plan: 02
subsystem: migration
tags: [semver, migration, upgrade, vitest, japa, testing]

# Dependency graph
requires:
  - phase: 09-migration-architecture
    plan: 01
    provides: "src/upgrade/orchestrator.ts with runUpgrade(), MIGRATION_REGISTRY, and migrations/v2/"
provides:
  - "MigrateProgram wired to runUpgrade orchestrator (not runV2Migration directly)"
  - "bin/test.ts excludes tests/unit/upgrade/ from Japa (Vitest collision prevented)"
  - "buildMigrationChain correctly handles pre-release toVersion (2.0.0-beta.30 → coerced 2.0.0)"
affects:
  - "10-tooling-switch (upgrade command integration — now uses orchestration layer)"
  - "11-create-qwik (any future use of runUpgrade pattern)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual test runner separation: Japa for integration (tests/integration/), Vitest for unit (tests/unit/upgrade/) — never mix"
    - "semver.coerce() on both fromVersion AND toVersion in buildMigrationChain — handles pre-release npm responses"

key-files:
  created: []
  modified:
    - "src/commands/migrate/index.ts (import swapped to runUpgrade from orchestrator)"
    - "src/upgrade/chain-builder.ts (toVersion coercion for pre-release comparison)"
    - "bin/test.ts (exclude tests/unit/upgrade/** from Japa file glob)"

key-decisions:
  - "MigrateProgram imports runUpgrade from upgrade/orchestrator.js — single import change, no other logic altered"
  - "buildMigrationChain coerces toVersion: semver.lte('2.0.0', '2.0.0-beta.30') === false (stable > pre-release); must coerce target to '2.0.0' first"
  - "bin/test.ts excludes tests/unit/upgrade/** — Vitest describe/expect API crashes Japa runner at file load"

patterns-established:
  - "Chain builder always coerces both fromVersion and toVersion before semver comparison"
  - "Japa glob excludes Vitest test directories with negation pattern: ['tests/**/*.spec.ts', '!tests/unit/upgrade/**']"

requirements-completed: [MIGR-02, MIGR-05, VTST-02]

# Metrics
duration: 18min
completed: 2026-04-02
---

# Phase 9 Plan 02: Migration Architecture Summary

**MigrateProgram wired to runUpgrade orchestrator with pre-release semver fix in chain builder and Japa/Vitest runner separation**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-04-02T18:03:07Z
- **Completed:** 2026-04-02T18:21:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Updated `MigrateProgram.execute()` to call `runUpgrade(rootDir)` instead of `runV2Migration` directly — single import/call change
- Fixed `buildMigrationChain` to coerce the `toVersion` parameter: npm returns pre-release versions like `2.0.0-beta.30`, and `semver.lte("2.0.0", "2.0.0-beta.30")` is false (stable > pre-release), causing the v2 migration to be skipped on all real projects
- Excluded `tests/unit/upgrade/` from the Japa runner's file glob — those files use the Vitest `describe`/`expect` API which crashes the Japa runner at module load time
- All 5 MIG tests pass, all 20 Vitest unit tests pass, tsdown build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire MigrateProgram to runUpgrade orchestrator** - `43213f5` (feat)
2. **Task 2: Fix pre-release semver, Japa/Vitest separation, full test verification** - `f5ba723` (fix)

**Plan metadata:** _(to be added after state update)_

## Files Created/Modified

- `src/commands/migrate/index.ts` - Import changed from `runV2Migration` to `runUpgrade`; `execute()` updated to call `runUpgrade(rootDir)`
- `src/upgrade/chain-builder.ts` - Added `semver.coerce(toVersion)` before upper-bound `lte` comparison in `buildMigrationChain`
- `bin/test.ts` - Added `!tests/unit/upgrade/**` negation to Japa `files` glob

## Decisions Made

- **toVersion coercion in chain builder**: `semver.lte("2.0.0", "2.0.0-beta.30")` is false in semver (a stable release is considered higher than a pre-release of the same number). Coercing both versions to their concrete base form (`"2.0.0"`) before comparison is the correct fix.
- **Japa exclusion pattern**: The `tests/**/*.spec.ts` glob inadvertently picked up Vitest-format files in `tests/unit/upgrade/`. The fix is a negation pattern in the files array — not a separate runner config.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] buildMigrationChain skipped v2 migration when npm returns pre-release version**
- **Found during:** Task 2 (Japa integration tests)
- **Issue:** `semver.lte("2.0.0", "2.0.0-beta.30")` is `false` because semver semantics place stable releases above same-number pre-releases. With the npm registry returning `2.0.0-beta.30` as the latest `@qwik.dev/core`, the upper-bound filter rejected the registry entry `{version: "2.0.0"}`, producing an empty migration chain. Migration ran silently as a no-op.
- **Fix:** Added `const coercedTarget = semver.coerce(toVersion)` and used `coercedTarget.version` in the `lte` filter. All 8 chain-builder unit tests still pass.
- **Files modified:** `src/upgrade/chain-builder.ts`
- **Verification:** MIG-01, MIG-04 pass; all 20 Vitest unit tests pass
- **Committed in:** `f5ba723` (Task 2 commit)

**2. [Rule 3 - Blocking] Japa runner crashed on Vitest-format spec files in tests/unit/upgrade/**
- **Found during:** Task 2 (running `pnpm test`)
- **Issue:** `bin/test.ts` uses `files: ["tests/**/*.spec.ts"]` which picks up Vitest-syntax files (`describe`/`expect`). Japa's module loader crashes immediately because `describe` is not defined.
- **Fix:** Added `"!tests/unit/upgrade/**"` negation to the Japa files array.
- **Files modified:** `bin/test.ts`
- **Verification:** Japa runs all 75 integration tests; 7 pre-existing failures (CHK, ADD-02, CRE) remain; no new failures
- **Committed in:** `f5ba723` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes required for correctness. The semver bug would have caused every user running `qwik upgrade` against a project with a real npm pre-release latest to silently skip migration. No scope creep.

## Issues Encountered

- Accidentally ran migration on the project root during debugging, corrupting `tests/integration/golden/migrate.spec.ts`, `tests/fixtures/fx-02/`, `tests/fixtures/fx-03/`, and several `migrations/v2/` source files. Restored all affected files with `git checkout --`. Required care to identify which files were corrupted and restore them to correct state before proceeding.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `qwik upgrade` and `qwik migrate-v2` both flow through: `MigrateProgram.execute()` → `runUpgrade()` → `detectInstalledVersion()` → `buildMigrationChain()` → `runV2Migration()` (when needed) → `updateDependencies()` (when deps behind)
- All 5 MIG integration tests pass; 7 pre-existing non-migration failures (CHK, ADD-02, CRE) unchanged from before Phase 9
- Phase 9 migration architecture is complete

## Self-Check: PASSED

- src/commands/migrate/index.ts contains runUpgrade: FOUND
- src/commands/migrate/index.ts has no runV2Migration: CONFIRMED
- src/upgrade/chain-builder.ts coerces toVersion: FOUND
- bin/test.ts excludes tests/unit/upgrade/: FOUND
- commit 43213f5: FOUND
- commit f5ba723: FOUND
- 20/20 Vitest tests: PASS
- 75 Japa tests (68 pass, 7 pre-existing failures): EXPECTED STATE
- tsc --noEmit: CLEAN (pre-existing stubs excluded)
- pnpm run build: SUCCESS

---
*Phase: 09-migration-architecture*
*Completed: 2026-04-02*
