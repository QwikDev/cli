---
phase: 02-test-harness
plan: 02
subsystem: testing
tags: [japa, integration-tests, golden-path, spawnSync, cli-testing, spec-first, tdd]

# Dependency graph
requires:
  - phase: 02-test-harness/02-01
    provides: runCli() helper, fixture directories (fx-01 through fx-06), setMtimePast/setMtimeFuture utilities
provides:
  - tests/integration/golden/simple.spec.ts — VER-01 and JOKE-01 golden-path tests
  - tests/integration/golden/build.spec.ts — BUILD-01 through BUILD-04 golden-path tests
  - tests/integration/golden/new.spec.ts — NEW-01 through NEW-05 golden-path tests
  - tests/integration/golden/check-client.spec.ts — CHK-01 through CHK-03 golden-path tests
affects:
  - 03-build-command (BUILD-01-04 tests define the contract Phase 3 must satisfy)
  - 04-new-add-commands (NEW-01-05 tests define the contract Phase 4 must satisfy)
  - 06-check-client (CHK-01-03 tests define the contract Phase 6 must satisfy)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - group.each.setup/teardown with cpSync + rmSync for filesystem-isolated test runs
    - writeFileSync to mutate temp fixture's package.json for BUILD-04 failing-script scenario
    - stdout + stderr concatenation for duplicate-guard error assertion (implementation may write to either)
    - setMtimeFuture/setMtimePast called after cpSync to control freshness state in check-client tests

key-files:
  created:
    - tests/integration/golden/simple.spec.ts
    - tests/integration/golden/build.spec.ts
    - tests/integration/golden/new.spec.ts
    - tests/integration/golden/check-client.spec.ts
  modified: []

key-decisions:
  - "BUILD-04 uses writeFileSync to mutate temp fixture's package.json — avoids needing a separate failing fixture and keeps setup self-contained"
  - "NEW-04 asserts stdout + stderr for 'already exists' — implementation may write error to either stream"
  - "Test count is 14 not 15 — plan objective text miscounted; enumerated scenarios total 14 (VER-01, JOKE-01, BUILD-01-04, NEW-01-05, CHK-01-03)"

patterns-established:
  - "Pattern: temp fixture copies always use group.each.setup/teardown — prevents cross-test filesystem pollution"
  - "Pattern: BUILD-04 failing script via writeFileSync in setup — self-contained without dedicated failing fixture"
  - "Pattern: check-client mtime manipulation applied after cpSync in setup — ensures deterministic freshness state"

requirements-completed: [TEST-02, TEST-03]

# Metrics
duration: 5min
completed: 2026-04-02
---

# Phase 2 Plan 02: Golden-Path Integration Tests Summary

**14 spec-first Japa integration tests across 4 golden files (simple, build, new, check-client) establishing the behavioral contract for Phases 3, 4, and 6 — all intentionally red**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-02T04:48:12Z
- **Completed:** 2026-04-02T04:53:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- 4 golden-path spec files covering all 14 enumerated test scenarios (VER-01, JOKE-01, BUILD-01-04, NEW-01-05, CHK-01-03)
- Every test asserts `result.status` (exit code) — satisfies TEST-03 requirement
- All filesystem-mutating tests use temp dir copies with `group.each.setup`/`group.each.teardown` for complete isolation
- Test runner executes all 14 tests without crashing (expected red state: 12 failing, 2 passing at stub level)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write simple and build command golden-path tests** - `610cec5` (feat)
2. **Task 2: Write new command and check-client golden-path tests** - `aef8c11` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `tests/integration/golden/simple.spec.ts` — VER-01 (bare semver regex assertion) and JOKE-01 (multi-line output assertion)
- `tests/integration/golden/build.spec.ts` — BUILD-01-04 tests; BUILD-04 uses writeFileSync in setup to inject failing build.server script
- `tests/integration/golden/new.spec.ts` — NEW-01-05 tests with existsSync file-creation assertions and cpSync temp copies
- `tests/integration/golden/check-client.spec.ts` — CHK-01-03 tests with mtime manipulation via setMtimePast/setMtimeFuture after cpSync

## Decisions Made
- BUILD-04 scenario injects a failing `build.server` script via `writeFileSync` to mutate a temp copy of fx-01's `package.json` — avoids needing a dedicated failing fixture and keeps setup self-contained
- NEW-04 concatenates stdout and stderr for the "already exists" assertion — stub may write to either stream depending on implementation
- Actual test count is 14 (not 15 as stated in the plan's objective line) — the plan's enumerated scenario list totals 14; discrepancy is in plan text

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Test runner (Japa) accepted all 4 files without configuration changes. No dependency issues.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 14 golden-path tests are written and committed — they define the exact behavioral contract
- Phase 3 (version + joke commands) must make VER-01 and JOKE-01 green
- Phase 4 (build + new commands) must make BUILD-01-04 and NEW-01-05 green
- Phase 6 (check-client) must make CHK-01-03 green
- No blockers for Phase 3

---
*Phase: 02-test-harness*
*Completed: 2026-04-02*
