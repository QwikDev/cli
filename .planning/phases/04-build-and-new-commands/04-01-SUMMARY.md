---
phase: 04-build-and-new-commands
plan: 01
subsystem: build
tags: [cross-spawn, scripts, orchestration, parallel, sequential]

# Dependency graph
requires:
  - phase: 01-scaffold-and-core-architecture
    provides: Program<T,U> base class with configure/validate/execute lifecycle
  - phase: 02-test-harness
    provides: golden-path integration test infrastructure with runCli/fixtures
provides:
  - BuildProgram with sequential+parallel script orchestration
  - prebuild.*/postbuild.* discovery, mode forwarding, ssg-after-static logic
affects: [04-02-new-command, 05-add-migrate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "cross-spawn spawnSync for sequential scripts with process.exitCode failure tracking"
    - "Promise.all with always-resolving promises for parallel script execution"
    - "process.exitCode=1 (not process.exit(1)) for parallel failure semantics"
    - "Return typeof exitCode === number ? exitCode : 0 to propagate exitCode through router's process.exit()"

key-files:
  created: []
  modified:
    - src/commands/build/index.ts

key-decisions:
  - "process.exitCode=1 used in parallel phase so sibling scripts are not aborted — process.exit(1) would kill siblings"
  - "execute() returns typeof exitCode === number ? exitCode : 0 — router calls process.exit(code), so we must propagate exitCode via return value"
  - "mode forwarding applied only to build.client, build.lib, build.preview/server — not to build.types, build.static, lint"
  - "argv scanning for --mode in validate() rather than relying on yargs positionals — preview is a positional, mode scanning must handle both --mode=val and --mode val"

patterns-established:
  - "Script orchestration pattern: sequential prebuild -> sequential build.client -> parallel build phase -> sequential postbuild"
  - "Mode forwarding: attachMode() helper appends --mode ${mode} only when mode is defined"

requirements-completed: [BUILD-01, BUILD-02, BUILD-03, BUILD-04, BUILD-05, BUILD-06, BUILD-07]

# Metrics
duration: 12min
completed: 2026-04-01
---

# Phase 4 Plan 01: Build Command Summary

**`qwik build` orchestrator with sequential build.client, parallel build.server/preview/types/lint/static phase, prebuild/postbuild discovery, mode forwarding, and process.exitCode failure semantics**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-01T00:00:00Z
- **Completed:** 2026-04-01T00:12:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced stub BuildProgram with full script orchestration against project's package.json
- Parallel failure semantics: failing build.server sets exitCode=1 without killing sibling processes
- Preview mode: runs build.preview instead of build.server; ssg runs sequentially after build.static when both present
- Mode forwarding: --mode flag attached to build.client, build.lib, and build.server/preview scripts

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement BuildProgram with sequential+parallel script orchestration** - `c4717db` (feat)

**Plan metadata:** (docs commit — see final)

## Files Created/Modified
- `src/commands/build/index.ts` - Full BuildProgram replacing stub: script discovery, sequential/parallel runners, mode forwarding, prebuild/postbuild, ssg logic

## Decisions Made
- `process.exitCode=1` in parallel runners instead of `process.exit(1)` — allows all parallel scripts to complete
- `execute()` returns `typeof exitCode === "number" ? exitCode : 0` — router calls `process.exit(code)` which would override `process.exitCode=1` if we returned 0
- mode forwarding applied selectively per spec: build.client, build.lib, build.server/build.preview get mode; build.types, build.static, lint do not
- argv scanning for `--mode` in `validate()` to handle both `--mode staging` and `--mode=staging` forms

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - type errors in build/index.ts were fixed inline (indexed access on Record<string,string> requiring undefined guards, process.exitCode type narrowing for return value).

## Self-Check: PASSED

- FOUND: src/commands/build/index.ts
- FOUND: c4717db

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- BUILD-01 through BUILD-04 all pass (4/4 integration tests green)
- Build command ready; plan 02 (new command) can proceed
- Pre-existing type errors in app-command.ts, console.ts, router.ts are deferred (out of scope)

---
*Phase: 04-build-and-new-commands*
*Completed: 2026-04-01*
