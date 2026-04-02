---
phase: 05-add-and-upgrade-commands
plan: "04"
subsystem: migration
tags: [migration, qwik-v2, oxc-parser, magic-string, clack-prompts, stdin-piping]

# Dependency graph
requires:
  - phase: 05-add-and-upgrade-commands
    plan: "01"
    provides: visitNotIgnoredFiles for gitignore-aware traversal
  - phase: 05-add-and-upgrade-commands
    plan: "03"
    provides: rename-import, replace-package, update-dependencies, versions modules

provides:
  - runV2Migration: 5-step orchestrator for full v1→v2 migration
  - MigrateProgram: full CLI command with @clack/prompts confirmation gate
  - upgrade alias in router pointing to same MigrateProgram

affects:
  - Phase 06 (create-qwik) — test helper cli.ts now supports stdin input option

# Tech tracking
tech-stack:
  added: []
  patterns:
    - stdin-piping for test confirmation/cancel via @clack/prompts
    - process.chdir/restore pattern for cwd-sensitive functions
    - always-call-prompt-in-execute pattern (not gated by isIt())

key-files:
  created:
    - src/migrate/run-migration.ts
  modified:
    - src/commands/migrate/index.ts
    - src/router.ts
    - tests/integration/helpers/cli.ts
    - tests/integration/golden/migrate.spec.ts
    - tests/unit/router.spec.ts

key-decisions:
  - "scanBoolean called in execute() not gated by isIt() — allows stdin piping for test-driven confirm/cancel"
  - "Cancel path uses Ctrl+C (\\x03) piped to stdin — @clack/prompts isCancel() returns true for SIGINT"
  - "process.chdir/restore wraps visitNotIgnoredFiles and runAllPackageReplacements — both use process.cwd() internally"
  - "upgrade alias in router.ts points to same import as migrate-v2 — UPGR-01 satisfied"
  - "runCli helper accepts optional input?: string — enables stdin-driven test scenarios without TTY"

patterns-established:
  - "Always-confirm pattern: call scanBoolean in execute() regardless of TTY to support piped-stdin test scenarios"
  - "Ctrl+C cancel test: pipe \\x03 via runCli({ input: '\\x03' }) to test cancel path in non-TTY tests"

requirements-completed: [UPGR-01, UPGR-02, UPGR-09, UPGR-10, ADD-08]

# Metrics
duration: 13min
completed: "2026-04-02"
---

# Phase 05 Plan 04: Wire Migration Orchestrator Summary

**5-step v1→v2 migration orchestrator wired with full MigrateProgram confirmation gate and upgrade router alias**

## Performance

- **Duration:** 13 min
- **Started:** 2026-04-02T06:53:17Z
- **Completed:** 2026-04-02T07:06:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created `runV2Migration` that sequentially executes 5 steps: ts-morph idempotency check, AST import rename, text-based package replacement (substring-safe order), conditional ts-morph removal, version resolution and dependency update
- Rewrote `MigrateProgram` stub to full implementation with `@clack/prompts` confirmation gate; cancel via Ctrl+C exits 0 (UPGR-09)
- Added `upgrade` alias to router.ts enabling both `qwik migrate-v2` and `qwik upgrade` (UPGR-01)
- Extended `runCli` helper with optional `input` for stdin piping; updated all migrate tests to use proper confirmation/cancel signals
- All 5 MIG golden-path tests now pass with meaningful (non-vacuous) assertions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create runV2Migration orchestrator** - `34078b9` (feat)
2. **Task 2: Rewrite MigrateProgram and add upgrade alias** - `b893f20` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `src/migrate/run-migration.ts` - 5-step migration orchestrator
- `src/commands/migrate/index.ts` - Full MigrateProgram with scanBoolean confirmation
- `src/router.ts` - Added upgrade alias pointing to MigrateProgram
- `tests/integration/helpers/cli.ts` - Added optional input param for stdin piping
- `tests/integration/golden/migrate.spec.ts` - Updated to pipe y\n (confirm) or \x03 (cancel)
- `tests/unit/router.spec.ts` - Updated EXPECTED_COMMANDS to include upgrade (count: 9)

## Decisions Made
- `scanBoolean` is called in `execute()` regardless of TTY, not gated by `isIt()`. This enables stdin-piped test scenarios: piping `"y\n"` confirms, `"\x03"` (Ctrl+C) cancels via `@clack/prompts` isCancel() path. Had the confirmation been gated by `isIt()`, non-TTY tests would auto-confirm and the cancel path could not be tested.
- `process.chdir(rootDir)` / `process.chdir(origCwd)` wraps both `visitNotIgnoredFiles` and `runAllPackageReplacements` since both functions rely on `process.cwd()` for relative path resolution and gitignore loading.
- `upgrade` alias routes to the same `import('./commands/migrate/index.js')` — not a separate entry — ensuring both commands always stay in sync.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added stdin piping support to runCli helper and updated MIG tests**
- **Found during:** Task 2 (MigrateProgram implementation)
- **Issue:** `@clack/prompts confirm()` with spawnSync EOF-pipe (no input) hangs with exit code 13 (unsettled top-level await). MIG-02 expected cancel behavior but no mechanism existed to deliver cancel signal in non-TTY test environment. Plan's "TODO Phase 5: pipe 'n\n'" explicitly anticipated this fix.
- **Fix:** Added `input?: string` to `runCli` helper. Updated MIG-01/03/04/05 to pipe `"y\n"` (confirm), MIG-02 to pipe `"\x03"` (Ctrl+C). Discovered `@clack/prompts` returns `isCancel() = true` for `\x03`, which triggers `bye()` → exit 0 → files unchanged.
- **Files modified:** tests/integration/helpers/cli.ts, tests/integration/golden/migrate.spec.ts, tests/unit/router.spec.ts
- **Verification:** All 5 MIG tests pass; runCli helper backward-compatible (no input = original behavior)
- **Committed in:** b893f20 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** Fix was the explicit "TODO Phase 5" from the test plan. No scope creep. Implemented the most complete cancel path (real Ctrl+C signal) rather than the vacuous fallback.

## Issues Encountered
- `@clack/prompts` does NOT treat EOF as cancel (contrary to plan assumption). The plan's "check if stdin is a pipe with no data and treat as cancel" approach does not work — `confirm()` hangs on EOF with exit code 13. The correct cancel signal is `\x03` (Ctrl+C), which triggers the SIGINT handler in @clack/core, setting state to 'cancel' and resolving the prompt with a Symbol.

## Next Phase Readiness
- `qwik migrate-v2` and `qwik upgrade` fully functional, all MIG tests passing
- Phase 5 complete — 4 plans executed (01, 02, 03, 04)
- Phase 6 (create-qwik) can proceed; runCli helper already extended for future test needs

---
*Phase: 05-add-and-upgrade-commands*
*Completed: 2026-04-02*
