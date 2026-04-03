---
phase: 17-transform-test-coverage
plan: 01
subsystem: testing
tags: [vitest, pipeline-integration, v2-migration, transforms, ast, mocking]

# Dependency graph
requires:
  - phase: 16-qwikcityprovider-structural-rewrite
    provides: makeQwikCityProviderTransform and qwikCityProviderTransform used in pipeline
  - phase: 15-ecosystem-migration-and-async-hook-transforms
    provides: migrateQwikLabsTransform, migrateUseComputedAsyncTransform, migrateUseResourceTransform
  - phase: 14-config-validation-and-simple-behavioral-transform
    provides: removeEagernessTransform, fixJsxImportSource, fixModuleResolution, fixPackageType
  - phase: 13-transform-infrastructure
    provides: applyTransforms, replaceImportInFiles, runV2Migration orchestrator
provides:
  - End-to-end pipeline integration test for runV2Migration() with combined fixture
  - Confirmed MTEST-01 coverage for all 5 AST transform unit test files
affects:
  - CI (new test file must remain green on all runs)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "realpathSync() on mkdtempSync() result to resolve macOS /var → /private/var symlink before passing to process.chdir()-using functions"
    - "describe.sequential() for tests that call process.chdir() — prevents cwd corruption across parallel test cases"
    - "vi.mock() with factory functions to stub npm-network-dependent exports (versions.ts, update-dependencies.ts)"

key-files:
  created:
    - tests/unit/upgrade/pipeline-integration.spec.ts
  modified: []

key-decisions:
  - "realpathSync() applied to mkdtempSync() result — macOS symlinks /var→/private/var cause relative() to produce ../ paths that the ignore library rejects as non-relative"
  - "describe.sequential() used to prevent process.chdir() side effects from corrupting cwd across concurrent test cases in the same Vitest worker"
  - "MTEST-01 confirmed as already-complete — all 5 transform specs pass the happy-path + no-op/idempotent + edge-case criteria with no gaps found"

patterns-established:
  - "Pipeline integration test pattern: write fixture files to realpathSync(mkdtempSync(...)) dir, mock network deps with vi.mock factory, await runV2Migration(tmpDir), assert with .toContain() substring checks"

requirements-completed: [MTEST-01, MTEST-02]

# Metrics
duration: 15min
completed: 2026-04-03
---

# Phase 17 Plan 01: Transform Test Coverage Summary

**Vitest pipeline integration test for runV2Migration() using a combined all-patterns fixture, with vi.mock stubs for npm network calls and realpathSync fix for macOS /var symlink**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-03T23:00:00Z
- **Completed:** 2026-04-03T23:13:24Z
- **Tasks:** 2 (1 audit, 1 new file)
- **Files modified:** 1 created

## Accomplishments
- Confirmed MTEST-01: all 5 AST transform spec files (remove-eagerness, migrate-qwik-labs, migrate-use-computed-async, migrate-use-resource, migrate-qwik-city-provider) already meet the happy path + no-op/idempotent + edge case criteria — no gaps found
- Created `tests/unit/upgrade/pipeline-integration.spec.ts` (MTEST-02) with 2 tests exercising runV2Migration() end-to-end through all transform steps on a single combined fixture
- All 101 Vitest tests pass (15 test files; +1 file and +2 tests from baseline 90 tests in 12 files)

## Task Commits

Each task was committed atomically:

1. **Task 1: Audit existing unit test coverage for MTEST-01** - (no file changes, confirmed all 5 spec files already meet bar)
2. **Task 2: Create pipeline integration test for MTEST-02** - `135bfdb` (test)

**Plan metadata:** (pending final metadata commit)

## Files Created/Modified
- `tests/unit/upgrade/pipeline-integration.spec.ts` - End-to-end pipeline integration test for runV2Migration(); 2 tests covering combined fixture (all migratable patterns) and idempotent already-migrated project

## Decisions Made
- `realpathSync()` applied to `mkdtempSync()` output before passing to `runV2Migration()`: macOS creates temp dirs under `/var/folders` which is a symlink to `/private/var/folders`; `process.chdir(tmpDir)` normalizes to `/private/var/...` but `tmpDir` string still has `/var/...`, so `relative(process.cwd(), tmpDir)` produces `../../../.../T/qwik-pipeline-test-...` — an absolute-like path that the `ignore` library rejects
- `describe.sequential()` used over plain `describe`: `runV2Migration` calls `process.chdir()` twice; tests within a describe block normally run sequentially in Vitest but adding `describe.sequential` makes the guarantee explicit and protects against future config changes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed macOS /var symlink causing ignore library RangeError**
- **Found during:** Task 2 (Create pipeline integration test)
- **Issue:** `mkdtempSync` returns `/var/folders/...` but `process.chdir` resolves symlinks to `/private/var/folders/...`; `relative()` then produces a `../`-prefixed path that `ignore.ignores()` rejects with `RangeError: path should be a relative()'d string`
- **Fix:** Added `realpathSync()` wrapper on `mkdtempSync()` result in `beforeEach` so the tmpDir variable holds the canonical path
- **Files modified:** `tests/unit/upgrade/pipeline-integration.spec.ts`
- **Verification:** Both pipeline integration tests pass; full suite 101 tests green
- **Committed in:** `135bfdb` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required for test to run on macOS. No scope creep.

## Issues Encountered
- macOS `/var` → `/private/var` symlink caused `ignore` library to reject `process.chdir`-normalized paths when `mkdtempSync` string was used as-is; resolved with `realpathSync()`

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 17 is the final phase of the v1.2 migration milestone
- All 5 AST transform modules have full unit test coverage (MTEST-01)
- Pipeline integration test validates end-to-end composition (MTEST-02)
- All 101 Vitest tests green; ready for final phase verification

---
*Phase: 17-transform-test-coverage*
*Completed: 2026-04-03*
