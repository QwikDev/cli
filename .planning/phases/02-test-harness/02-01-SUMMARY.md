---
phase: 02-test-harness
plan: 01
subsystem: testing
tags: [japa, spawnSync, fixtures, mtime, integration-tests, cli-helper]

# Dependency graph
requires:
  - phase: 01-scaffold-and-core-architecture
    provides: bin/qwik.ts CLI entry point and router that helpers invoke via subprocess
provides:
  - tests/integration/helpers/cli.ts — runCli() and runCreateQwik() subprocess wrappers
  - tests/integration/helpers/fixtures.ts — setMtimePast, setMtimeFuture, getFixturePath, FIXTURES_DIR
  - tests/fixtures/fx-01/ through fx-06/ — 6 static fixture projects for golden-path tests
affects:
  - 02-test-harness/02-02-PLAN (golden-path tests depend on these helpers and fixtures)
  - 03-build-command (BUILD tests use fx-01 and fx-06)
  - 04-new-add-commands (ADD/NEW tests use fx-04 and fx-05)
  - 05-migrate-command (MIG tests use fx-02 and fx-03)
  - 06-create-qwik (CRE tests use runCreateQwik helper)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - spawnSync with --import tsx/esm for zero-build CLI subprocess testing
    - FORCE_COLOR=0/NO_COLOR=1 env vars to prevent ANSI codes in test assertions
    - import.meta.url + fileURLToPath for ESM-safe path resolution in test helpers
    - echo-based mock scripts in fixture package.json to avoid real toolchain dependency
    - utimesSync(path, atime, mtime) with same value for both to avoid OS normalization

key-files:
  created:
    - tests/integration/helpers/cli.ts
    - tests/integration/helpers/fixtures.ts
    - tests/fixtures/fx-01/package.json
    - tests/fixtures/fx-01/vite.config.ts
    - tests/fixtures/fx-02/package.json
    - tests/fixtures/fx-02/.gitignore
    - tests/fixtures/fx-02/src/app.tsx
    - tests/fixtures/fx-02/src/routes/index.tsx
    - tests/fixtures/fx-03/package.json
    - tests/fixtures/fx-03/.gitignore
    - tests/fixtures/fx-03/src/app.tsx
    - tests/fixtures/fx-03/src/routes/index.tsx
    - tests/fixtures/fx-04/package.json
    - tests/fixtures/fx-05/package.json
    - tests/fixtures/fx-05/src/routes/dashboard/index.tsx
    - tests/fixtures/fx-05/src/components/TestComponent.tsx
    - tests/fixtures/fx-06/package.json
    - tests/fixtures/fx-06/src/app.tsx
    - tests/fixtures/fx-06/dist/q-manifest.json
  modified:
    - .gitignore

key-decisions:
  - "fx-02 and fx-03 dist/.gitkeep omitted — fixture .gitignore correctly ignores dist/ (realistic for v1 projects)"
  - "Root .gitignore negation rule added for tests/fixtures/fx-06/dist/ — q-manifest.json must be tracked for mtime tests"

patterns-established:
  - "Pattern: CLI subprocess helper — always use spawnSync not execSync; execSync throws on non-zero exit"
  - "Pattern: Fixture scripts use echo commands — tests work without installing fixture node_modules"
  - "Pattern: mtime helpers set both atime and mtime to same value — prevents OS normalization issues"
  - "Pattern: runCreateQwik points to non-existent bin/create-qwik.ts — correct red state for Phase 6"

requirements-completed: [TEST-01, TEST-04]

# Metrics
duration: 2min
completed: 2026-04-02
---

# Phase 2 Plan 01: Test Infrastructure and Static Fixtures Summary

**spawnSync CLI subprocess helper and 6 static fixture projects (fx-01 through fx-06) establishing the test foundation for all 25 golden-path integration scenarios**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-02T04:43:06Z
- **Completed:** 2026-04-02T04:45:20Z
- **Tasks:** 2
- **Files modified:** 21

## Accomplishments
- CLI subprocess helper (runCli/runCreateQwik) that invokes bin/qwik.ts via spawnSync without requiring a build step
- mtime manipulation helpers (setMtimePast/setMtimeFuture) for simulating stale/fresh manifest state in CHK-02/CHK-03 tests
- 6 static fixture project directories (fx-01 through fx-06) with echo-based mock scripts and correct v1/v2 dependency declarations
- All 39 existing unit tests remain green after fixture additions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CLI subprocess helper and mtime fixture helpers** - `4d8b097` (feat)
2. **Task 2: Create 6 static fixture project directories** - `38676cd` (feat)
3. **Deviation fix: Allow fx-06 dist/ to be tracked in git** - `8142fc6` (fix)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `tests/integration/helpers/cli.ts` — runCli() and runCreateQwik() subprocess wrappers with CliResult interface
- `tests/integration/helpers/fixtures.ts` — setMtimePast, setMtimeFuture, getFixturePath, FIXTURES_DIR constant
- `tests/fixtures/fx-01/` — minimal Qwik v2 app with echo build scripts and vite.config.ts placeholder
- `tests/fixtures/fx-02/` — v1 project with @builder.io/qwik imports for migration testing (no ts-morph)
- `tests/fixtures/fx-03/` — v1 project extending fx-02 with ts-morph in devDependencies
- `tests/fixtures/fx-04/` — empty project with only @qwik.dev/core dependency
- `tests/fixtures/fx-05/` — project with pre-existing dashboard route and TestComponent for duplicate guard tests
- `tests/fixtures/fx-06/` — built project with dist/q-manifest.json for mtime-based check-client tests
- `.gitignore` — added negation rule for tests/fixtures/fx-06/dist/

## Decisions Made
- fx-02 and fx-03 dist/.gitkeep files omitted: their own `.gitignore` correctly lists `dist/` (realistic behavior for v1 projects). No need to commit empty gitkeep there.
- Root `.gitignore` negation added for `tests/fixtures/fx-06/dist/` only: the `q-manifest.json` must be committed since CHK-02/CHK-03 tests manipulate its mtime at runtime.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Root .gitignore blocked fx-06/dist/q-manifest.json from being tracked**
- **Found during:** Task 2 (create 6 fixture directories)
- **Issue:** Root `.gitignore` has `dist/` rule which prevented `tests/fixtures/fx-06/dist/q-manifest.json` from being staged. The manifest must be committed since tests rely on its mtime.
- **Fix:** Added negation rule `!tests/fixtures/fx-06/dist/` and `!tests/fixtures/fx-06/dist/**` to root `.gitignore`. Also removed dist/.gitkeep from fx-02 and fx-03 (blocked by their own fixture .gitignore; those directories are intentionally untracked in those fixtures).
- **Files modified:** `.gitignore`
- **Verification:** `git add tests/fixtures/fx-06/dist/q-manifest.json` succeeded; file is tracked
- **Committed in:** `8142fc6`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary fix to ensure q-manifest.json is tracked in git. No scope creep.

## Issues Encountered
None beyond the auto-fixed gitignore blocking issue above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Test infrastructure is complete — runCli(), mtime helpers, and all 6 fixture projects are ready
- Plan 02-02 can now write all 25 golden-path tests (they will be red/failing until Phases 3-6 implement commands)
- No blockers for Phase 2 Plan 02

---
*Phase: 02-test-harness*
*Completed: 2026-04-02*
