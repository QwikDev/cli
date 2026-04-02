---
phase: 01-scaffold-and-core-architecture
plan: 02
subsystem: cli
tags: [yargs, clack-prompts, kleur, typescript, abstract-class, tdd]

# Dependency graph
requires:
  - phase: 01-scaffold-and-core-architecture
    provides: types.ts, package.json with all runtime deps, test harness

provides:
  - Program<T,U> abstract base class with enforced lifecycle (configure -> parse -> validate|interact -> execute)
  - console.ts with bye, panic, printHeader, scanBoolean, scanString, scanChoice
  - AppCommand flag parser supporting --flag=value and --flag value forms

affects:
  - All subsequent phases — every command extends Program<T,U>
  - Phase 03 (joke, help, version commands)
  - Phase 04 (build, new commands)
  - Phase 05 (add, migrate commands)
  - Phase 06 (check-client, create-qwik commands)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Program<T,U> lifecycle pattern (configure -> parse -> validate|interact -> execute)
    - isIt() CI environment detection via CI/CONTINUOUS_INTEGRATION/BUILD_NUMBER/TF_BUILD env vars
    - setInteractive() override pattern for test control
    - Clack prompt wrappers with isCancel guard calling bye() on cancel (exit 0)
    - AppCommand getArg() regex pattern matching both --flag=value and --flag value forms

key-files:
  created:
    - src/core.ts
    - src/console.ts
    - src/app-command.ts
    - tests/unit/console.spec.ts
    - tests/unit/program.spec.ts
    - tests/unit/app-command.spec.ts
  modified:
    - bin/test.ts (biome formatting)
    - src/index.ts (biome import organization)
    - src/types.ts (biome formatting)
    - tests/unit/scaffold.spec.ts (biome import organization)

key-decisions:
  - "Program.isIt() is protected, not public — TestProgram subclass exposes isItPublic() for tests"
  - "interact() default implementation delegates to validate() — subclasses override to add prompts"
  - "registerCommand/registerOption/registerAlias pattern for yargs wiring in base class (not singleton yargs)"

patterns-established:
  - "Program<T,U>: all commands extend this; T = yargs parsed shape, U = execute input shape"
  - "TDD: write failing test -> commit -> implement -> pass -> commit"
  - "Biome formatting: double quotes, semicolons, trailing commas in function params"

requirements-completed:
  - ARCH-01
  - ARCH-03
  - ARCH-04
  - ARCH-05
  - ARCH-07

# Metrics
duration: 5min
completed: 2026-04-02
---

# Phase 1 Plan 2: Core Architecture Summary

**Program<T,U> abstract base class with yargs lifecycle, clack/kleur console utilities, and AppCommand flag parser — the foundation all 9 CLI commands extend**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-02T03:35:42Z
- **Completed:** 2026-04-02T03:40:42Z
- **Tasks:** 2 (each with TDD RED + GREEN phases)
- **Files modified:** 9

## Accomplishments

- Implemented `console.ts` with `bye()` (exit 0), `panic()` (exit 1), `printHeader()` (ASCII art logo), and `scanBoolean/scanString/scanChoice` prompt wrappers with isCancel guards
- Implemented `Program<T,U>` abstract base class with configure -> parse -> validate/interact -> execute lifecycle, CI detection via 4 env vars, and `setInteractive()` test override
- Implemented `AppCommand` flag parser with `getArg()` supporting both `--flag=value` and `--flag value` regex-based parsing
- All 19 tests pass (5 scaffold + 3 console + 3 program lifecycle + 8 AppCommand)
- Biome check passes clean on all 11 source files

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: console.ts failing tests** - `9e0b4bd` (test)
2. **Task 1 GREEN: console.ts implementation** - `b7a3be9` (feat)
3. **Task 2 RED: Program/AppCommand failing tests** - `a313e70` (test)
4. **Task 2 GREEN: Program/AppCommand implementation** - `fdf07ff` (feat)

_Note: TDD tasks have RED (test) + GREEN (feat) commits per lifecycle_

## Files Created/Modified

- `src/console.ts` — bye/panic/printHeader/scanBoolean/scanString/scanChoice + re-exports from @clack/prompts
- `src/core.ts` — Program<T,U> abstract base class with full lifecycle, isIt(), setInteractive(), prompt helpers
- `src/app-command.ts` — AppCommand with getArg() supporting both --flag=value and --flag value forms
- `tests/unit/console.spec.ts` — 3 tests: bye exits 0, panic exits 1, printHeader outputs ASCII art
- `tests/unit/program.spec.ts` — 5 tests: lifecycle ordering (interactive/non-interactive), CI detection, setInteractive override
- `tests/unit/app-command.spec.ts` — 8 tests: getArg variants, task extraction, args copy semantics
- `bin/test.ts`, `src/index.ts`, `src/types.ts`, `tests/unit/scaffold.spec.ts` — biome formatting fixes

## Decisions Made

- `isIt()` is protected on `Program` base class; test subclasses expose `isItPublic()` for assertion testing
- `interact()` has a default implementation that calls `validate()` — subclasses override only when they need prompts
- Used `registerCommand/registerOption/registerAlias` methods on base class to accumulate yargs config, then apply all in `parse()` — avoids singleton yargs pattern removed in v18

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing biome formatting issues**
- **Found during:** Final verification (biome check .)
- **Issue:** `bin/test.ts`, `src/index.ts`, `src/types.ts`, `tests/unit/scaffold.spec.ts` had pre-existing biome format/import-organization errors from plan 01
- **Fix:** Applied `npx biome check --write` to each file
- **Files modified:** bin/test.ts, src/index.ts, src/types.ts, tests/unit/scaffold.spec.ts
- **Verification:** `npx biome check .` passes clean on all 11 files
- **Committed in:** fdf07ff (included in task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 formatting bug from previous plan)
**Impact on plan:** Minor — pre-existing biome issues from plan 01 needed cleanup. No scope creep.

## Issues Encountered

- Japa test runner's `--files` CLI flag triggers suite-filter error when no suites are configured; resolved by running all tests with `node --import tsx/esm bin/test.ts` (the `files:` config in `configure()` pattern already handles test selection)
- TDD interact test initially tracked `validate` in callOrder because the TestProgram's `interact()` called `this.validate()` — resolved by inlining the return in the interact override to avoid chained call tracking

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `Program<T,U>`, `console.ts`, and `AppCommand` are all complete and tested
- All 9 command implementations in subsequent phases can now extend `Program`
- Phase 3 (joke, help, version commands) can start immediately
- No blockers

---
*Phase: 01-scaffold-and-core-architecture*
*Completed: 2026-04-02*
