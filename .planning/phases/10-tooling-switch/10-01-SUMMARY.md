---
phase: 10-tooling-switch
plan: "01"
subsystem: tooling
tags: [vite-plus, oxfmt, oxlint, vitest, biome, formatting, linting, testing]

# Dependency graph
requires:
  - phase: 09-migration-architecture
    provides: vitest.config.ts scoped to tests/unit/upgrade/ and Japa/Vitest separation pattern
provides:
  - vite.config.ts unified toolchain config (lint, fmt, test blocks via vite-plus)
  - Biome fully removed (biome.json deleted, @biomejs/biome removed from devDependencies)
  - All source files reformatted to oxfmt style
  - package.json scripts updated to vp commands
affects: [11-create-qwik, any future tooling, CI configuration]

# Tech tracking
tech-stack:
  added: [vite-plus@0.1.15]
  patterns:
    - "Unified vite.config.ts drives lint (oxlint), fmt (oxfmt), and test (vitest) from one file"
    - "stubs/** excluded from lint ignorePatterns — template content not subject to project lint rules"
    - "eslint-disable-next-line for ambient declare const (build-time injection) and intentional unused vars"

key-files:
  created:
    - vite.config.ts
  modified:
    - package.json
  deleted:
    - biome.json
    - vitest.config.ts

key-decisions:
  - "stubs/** and specs/** added to lint ignorePatterns — these are template/doc directories not in Biome's original scope (src/**,tests/**,bin/**)"
  - "eslint-disable-next-line used for QWIK_VERSION ambient declare (build-time inject, intentional) and v3Run in orchestrator test (intentional leftover stub)"
  - "Pre-existing Japa test failures (7/75) confirmed unchanged before and after tooling switch — ADD-02, CHK-01, CRE-02/03 are deferred to future phases per existing test comments"

patterns-established:
  - "vp lint / vp fmt / vp check / vp test as canonical CLI commands"
  - "Japa/Vitest separation preserved: vite.config.ts test.include scoped to tests/unit/upgrade/**"

requirements-completed: [TOOL-01, TOOL-02, TOOL-05, VTST-01]

# Metrics
duration: 15min
completed: 2026-04-02
---

# Phase 10 Plan 01: Tooling Switch Summary

**Replaced Biome with vite-plus (oxfmt + oxlint) — unified vite.config.ts drives lint, format, and vitest with zero logic changes**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-02T13:35:00Z
- **Completed:** 2026-04-02T13:42:00Z
- **Tasks:** 2
- **Files modified:** 126 (mostly mechanical oxfmt reformatting)

## Accomplishments

- Installed vite-plus@0.1.15, removed @biomejs/biome; all deps updated
- Deleted biome.json and vitest.config.ts; created unified vite.config.ts with lint, fmt, and test blocks
- Updated package.json scripts to vp commands (`vp lint`, `vp fmt`, `vp check`, `vp test`, `vp lint --fix`)
- Ran `vp fmt` on all 315 files — mechanical reformatting only, zero logic changes
- `vp check` passes (315 files, 0 format issues), `vp lint` passes (65 files, 0 errors)
- `vp test` discovers and passes all 20 Vitest unit tests in tests/unit/upgrade/
- Japa test failure count (7/75) confirmed identical before and after switch — pre-existing failures unrelated to tooling

## Task Commits

Each task was committed atomically:

1. **Task 1: Install vite-plus, remove Biome, create unified vite.config.ts** - `07c2a2b` (chore)
2. **Task 2: Reformat source with oxfmt and verify full toolchain** - `3329c58` (chore)

## Files Created/Modified

- `vite.config.ts` - NEW: unified vite-plus config with lint, fmt, test blocks
- `package.json` - Updated scripts to vp commands; vite-plus added, @biomejs/biome removed
- `biome.json` - DELETED: superseded by vite.config.ts fmt/lint blocks
- `vitest.config.ts` - DELETED: superseded by vite.config.ts test block
- `src/types.ts` - Added eslint-disable-next-line for QWIK_VERSION ambient declare
- `tests/unit/upgrade/orchestrator.spec.ts` - Added eslint-disable-next-line for v3Run unused variable
- `src/**/*.ts`, `tests/**/*.ts`, `bin/**/*.ts`, `stubs/**/*` - Mechanical oxfmt reformatting

## Decisions Made

- **stubs/** and **specs/** added to lint ignorePatterns: these directories were not in Biome's original scope (`src/**/*.ts`, `tests/**/*.ts`, `bin/**/*.ts`). They contain template content (stubs) and spec documentation (specs) that should not be subject to project lint rules.
- **eslint-disable-next-line for ambient declares**: `QWIK_VERSION` is a build-time injected ambient declaration (`declare const`); oxlint's `no-unused-vars` flags it incorrectly. Suppressed with comment to preserve intent documentation (EB-05 comment).
- **eslint-disable-next-line for v3Run**: Test variable `v3Run` is declared but the mock is only exercised via `v2Run`. No logic change — inline suppression preserves test structure and existing behavior.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added stubs/** and specs/** to lint ignorePatterns**
- **Found during:** Task 2 (reformat and verify)
- **Issue:** vp lint scanned stubs/ and specs/ directories which were outside Biome's original scope. This produced 4 false-positive lint errors in template/doc files.
- **Fix:** Added `stubs/**` and `specs/**` to `lint.ignorePatterns` in vite.config.ts
- **Files modified:** vite.config.ts
- **Verification:** `vp lint` exits 0 with 0 errors after adding patterns
- **Committed in:** `3329c58` (Task 2 commit)

**2. [Rule 1 - Bug] Suppressed false-positive lint errors with inline eslint-disable comments**
- **Found during:** Task 2 (lint verification)
- **Issue:** oxlint flagged QWIK_VERSION ambient declare and v3Run test variable as unused. Both are intentional patterns — ambient declaration for tsdown build-time injection and a test mock setup variable.
- **Fix:** Added `// eslint-disable-next-line no-unused-vars` above each flagged declaration
- **Files modified:** src/types.ts, tests/unit/upgrade/orchestrator.spec.ts
- **Verification:** `vp lint` exits 0 with 0 warnings
- **Committed in:** `3329c58` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical scope boundary, 1 lint suppression for intentional patterns)
**Impact on plan:** Both fixes align with plan intent (no logic changes). Scope boundary fix mirrors Biome's original file scope. Lint suppressions preserve existing code intent.

## Issues Encountered

- oxfmt `--fix` pass left one file (`src/commands/new/index.ts`) still needing formatting on first `vp check`. Second `vp fmt` resolved it. This is a known oxfmt idempotency edge case — running fmt twice achieved stable state.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 10 tooling switch complete. All vp commands operational.
- Phase 11 (create-qwik implementation) can proceed with vite-plus toolchain in place.
- Pre-existing Japa failures (ADD-02, CHK-01, CRE-02/03) remain deferred to their target phases — no action needed for Phase 11 planning.

---
*Phase: 10-tooling-switch*
*Completed: 2026-04-02*
