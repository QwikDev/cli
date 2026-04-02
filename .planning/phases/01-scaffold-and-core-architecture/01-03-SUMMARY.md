---
phase: 01-scaffold-and-core-architecture
plan: 03
subsystem: cli
tags: [router, dynamic-imports, command-dispatch, cli-entry, yargs, kleur]

# Dependency graph
requires:
  - phase: 01-scaffold-and-core-architecture
    plan: 02
    provides: "Program<T,U> abstract base class, console helpers (printHeader, panic, kleur), AppCommand"
provides:
  - "src/router.ts with COMMANDS map using dynamic imports for all 8 commands"
  - "bin/qwik.ts shebang entry point calling runCli()"
  - "8 command stub Programs: add, build, new, joke, migrate-v2, check-client, help, version"
  - "ARCH-02: fast startup via dynamic import per command"
  - "ARCH-08: red error for unrecognized command + help + exit 1"
  - "stubs/ resolution test validating import.meta.url pattern"
affects:
  - phases/02-add-command
  - phases/03-new-command
  - phases/04-build-command
  - phases/05-migrate-command
  - phases/06-create-qwik

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic imports in COMMANDS map for O(1) lazy command loading"
    - "HelpProgram overrides parse() to bypass yargs --help interception"
    - "import type for type-only imports (Biome useImportType)"

key-files:
  created:
    - src/router.ts
    - bin/qwik.ts
    - src/commands/add/index.ts
    - src/commands/build/index.ts
    - src/commands/new/index.ts
    - src/commands/migrate/index.ts
    - src/commands/check-client/index.ts
    - src/commands/joke/index.ts
    - src/commands/help/index.ts
    - src/commands/version/index.ts
    - tests/unit/router.spec.ts
    - tests/unit/stubs-resolution.spec.ts
  modified:
    - tsdown.config.ts

key-decisions:
  - "HelpProgram overrides parse() returning empty args to prevent yargs from intercepting the 'help' keyword as a built-in flag"
  - "COMMAND_LIST defined in help/index.ts as a named export — router imports COMMAND_NAMES from router.ts (Object.keys of COMMANDS map)"
  - "tsdown entry array updated to ['src/index.ts', 'src/router.ts', 'bin/qwik.ts'] to produce dist/esm/bin/qwik.mjs"

patterns-established:
  - "Command stub pattern: extends Program<Args, Input>, configure() registers name/description, parse() override when yargs interference expected"
  - "Router dispatch: process.argv[2] lookup in COMMANDS Record, dynamic import, construct, run(process.argv)"

requirements-completed:
  - ARCH-02
  - ARCH-08

# Metrics
duration: 8min
completed: 2026-04-02
---

# Phase 1 Plan 3: Command Router, 8 Stubs, and Bin Entry Summary

**CLI entry point wired end-to-end: dynamic-import COMMANDS map dispatches argv[2] to 8 Program stub subclasses, with red error + help + exit 1 for unknown commands**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-02T03:44:00Z
- **Completed:** 2026-04-02T03:52:00Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Created src/router.ts with COMMANDS map using dynamic imports for all 8 commands (ARCH-02 fast startup)
- Created bin/qwik.ts shebang entry point — `npx tsx bin/qwik.ts help` exits 0 listing all 8 commands
- Unknown command prints kleur.red() error + help + exits 1 (ARCH-08); no-arg case also prints help + exits 1
- Added 39-test suite passing: router.spec.ts (COMMAND_NAMES, dynamic imports, stub execution) + stubs-resolution.spec.ts (import.meta.url resolves all 4 stubs/ subdirs)
- tsdown builds dual ESM+CJS output; Biome check passes clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 8 command stub Programs and the router with bin/qwik.ts entry** - `fd80b83` (feat)
2. **Task 2: Write router and stubs-resolution tests; verify full build** - `1d272fe` (test)

**Plan metadata:** _(see final docs commit)_

## Files Created/Modified
- `src/router.ts` - CLI dispatch: COMMANDS Record with dynamic imports, runCli(), COMMAND_NAMES export
- `bin/qwik.ts` - Shebang entry point that calls runCli()
- `src/commands/add/index.ts` - AddProgram stub extending Program
- `src/commands/build/index.ts` - BuildProgram stub extending Program
- `src/commands/new/index.ts` - NewProgram stub extending Program
- `src/commands/migrate/index.ts` - MigrateProgram stub for migrate-v2
- `src/commands/check-client/index.ts` - CheckClientProgram stub
- `src/commands/joke/index.ts` - JokeProgram stub
- `src/commands/help/index.ts` - HelpProgram with COMMAND_LIST, overrides parse() to skip yargs
- `src/commands/version/index.ts` - VersionProgram stub
- `tests/unit/router.spec.ts` - Router dispatch and COMMAND_NAMES tests
- `tests/unit/stubs-resolution.spec.ts` - import.meta.url stubs/ resolution tests
- `tsdown.config.ts` - Added src/router.ts and bin/qwik.ts to entry array

## Decisions Made
- **HelpProgram overrides parse():** Yargs intercepts `help` as a built-in keyword when it appears in argv. Overriding `parse()` to return `{ _: [] }` bypasses yargs and lets HelpProgram.execute() run its custom output.
- **COMMAND_LIST in help/index.ts:** Kept the list co-located with the help command rather than importing from router to avoid circular imports.
- **tsdown entry update:** Added router.ts and bin/qwik.ts — per previous decision in STATE.md, these were intentionally deferred to this plan to avoid "missing entry" build failures.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] HelpProgram parse() override to prevent yargs --help interception**
- **Found during:** Task 1 verification (`npx tsx bin/qwik.ts help`)
- **Issue:** Yargs treats "help" as a built-in keyword; when `process.argv = ['node', 'qwik', 'help']`, yargs intercepts and prints its own help output, bypassing HelpProgram.execute()
- **Fix:** Added `protected async parse(_argv: string[]): Promise<HelpArgs> { return { _: [] }; }` override in HelpProgram
- **Files modified:** src/commands/help/index.ts
- **Verification:** `npx tsx bin/qwik.ts help` now exits 0 and lists all 8 commands with descriptions
- **Committed in:** fd80b83 (Task 1 commit)

**2. [Rule 1 - Lint] Fixed Biome lint errors in router.ts and bin/qwik.ts**
- **Found during:** Task 2 (biome check run)
- **Issue:** `import { Program }` should be `import type { Program }` (useImportType); `COMMANDS["help"]` should be `COMMANDS.help` (useLiteralKeys); bin/qwik.ts missing blank line after imports
- **Fix:** Applied all three Biome lint fixes
- **Files modified:** src/router.ts, bin/qwik.ts
- **Verification:** `biome check .` passes with "No fixes applied"
- **Committed in:** 1d272fe (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 behavior bug, 1 lint)
**Impact on plan:** Both fixes necessary for correctness and code quality. No scope creep.

## Issues Encountered
- Yargs v18 treats "help" as a built-in global keyword — any argv containing "help" gets intercepted before commands run. The override pattern (HelpProgram.parse bypass) is the correct solution for stub-level implementation; Phase 3 may refine this with custom yargs configuration.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 1 complete: scaffold (plan 01), core modules (plan 02), router + stubs (plan 03) all done
- bin/qwik.ts entry wired — `npx tsx bin/qwik.ts <command>` works for all 8 commands
- Each command stub ready for real implementation in Phases 2-6
- tsdown dual build confirmed; Biome clean; 39 tests passing
- Phase 2 (add command) can begin immediately using AddProgram as the starting stub

---
*Phase: 01-scaffold-and-core-architecture*
*Completed: 2026-04-02*
