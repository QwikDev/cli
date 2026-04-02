---
phase: 05-add-and-upgrade-commands
plan: 02
subsystem: cli
tags: [add-command, integrations, stubs, file-copy, panam, cross-spawn, clack]

# Dependency graph
requires:
  - phase: 05-add-and-upgrade-commands
    provides: cloudflare-pages stub in stubs/adapters/, ignore/semver deps, visitNotIgnoredFiles utility (05-01)
  - phase: 04-build-and-new-commands
    provides: Program base class, project structure, command pattern

provides:
  - src/integrations/load-integrations.ts — loadIntegrations() discovers integrations from stubs/adapters/ and stubs/features/ with module-level cache
  - src/integrations/update-app.ts — commitIntegration() copies stub files, integrationHasDeps(), installDeps(), runPostInstall()
  - src/commands/add/index.ts — full AddProgram with consent gate, skipConfirmation, projectDir, dep installation, postInstall

affects:
  - ADD-01/ADD-02/ADD-03 golden tests now pass
  - 05-03 upgrade command (uses same stubs pattern; loadIntegrations established for reuse)

# Tech tracking
tech-stack:
  added:
    - panam (used for installDeps — package manager agnostic install)
    - cross-spawn (used for runPostInstall — cross-platform spawn)
  patterns:
    - Adaptive STUBS_DIR resolution: check 2-levels up first (tsx source), fallback to 3-levels (compiled dist/) — handles both tsx dev and production contexts
    - Module-level cache in loadIntegrations() for performance on repeated calls
    - Integration file discovery: recurse itemDir, collect paths relative to itemDir, exclude package.json

key-files:
  created:
    - src/integrations/load-integrations.ts
    - src/integrations/update-app.ts
  modified:
    - src/commands/add/index.ts

key-decisions:
  - "Adaptive STUBS_DIR resolution (2-level for src/, 3-level for dist/) — tsx runs source files so import.meta.url resolves to src/integrations/ not dist/src/integrations/"
  - "skipConfirmation option registered as type 'string' and compared against exact value 'true' — yargs parses --flag=true as string when option type is string"

patterns-established:
  - "Integration file paths stored relative to integration.dir — commitIntegration joins integration.dir + filePath for src, rootDir + filePath for dest"
  - "Non-interactive auto-select: if no id and !isIt() and exactly 1 integration, auto-select it (ADD-02 pattern for single-integration projects)"

requirements-completed: [ADD-01, ADD-02, ADD-03, ADD-04, ADD-05, ADD-06, ADD-07, ADD-09]

# Metrics
duration: 15min
completed: 2026-04-01
---

# Phase 05 Plan 02: Add Command Summary

**Complete `qwik add` pipeline implemented: loadIntegrations() discovers cloudflare-pages stub via adaptive import.meta.url path resolution, commitIntegration() copies files to rootDir, and AddProgram handles consent gate, --skipConfirmation=true, --projectDir, dep installation, and postInstall — all 3 ADD golden tests pass**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-01T00:00:00Z
- **Completed:** 2026-04-01T00:15:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `src/integrations/load-integrations.ts` with `loadIntegrations()` that discovers integrations from `stubs/adapters/` and `stubs/features/`, reads `package.json` and skips entries without `__qwik__` key, collects `filePaths` recursively, sorts by priority descending then id ascending, and caches results
- Created `src/integrations/update-app.ts` with `commitIntegration()` (copies files), `integrationHasDeps()` (checks deps/devDeps), `installDeps()` (via panam), `runPostInstall()` (via cross-spawn)
- Rewrote `src/commands/add/index.ts` stub to full AddProgram: `configure()` registers `skipConfirmation` (string) and `projectDir`, `validate()` extracts positional id and exact-string `skipConfirmation === 'true'`, `interact()` prompts with clack select, `execute()` resolves integration, applies rootDir, consent gate, commits files, installs deps, runs postInstall
- All 3 ADD golden tests pass: ADD-01 (cloudflare-pages with --skipConfirmation), ADD-02 (--projectDir subdirectory), ADD-03 (nonexistent integration exits 1)

## Task Commits

1. **Task 1: Create loadIntegrations and updateApp/commitIntegration modules** - `303b6df` (feat)
2. **Task 2: Implement full AddProgram with consent gate and install pipeline** - `8c45c70` (feat)

**Plan metadata:** (docs commit — see final commit)

## Files Created/Modified

- `src/integrations/load-integrations.ts` — `loadIntegrations()` with adaptive STUBS_DIR resolution and module-level cache; `sortIntegrationsAndReturnAsClackOptions()` for interactive select
- `src/integrations/update-app.ts` — `commitIntegration()`, `integrationHasDeps()`, `installDeps()`, `runPostInstall()`
- `src/commands/add/index.ts` — Full AddProgram replacing stub: configure/validate/interact/execute pipeline

## Decisions Made

- **Adaptive STUBS_DIR resolution** — `import.meta.url` resolves to `src/integrations/load-integrations.ts` when running via tsx (dev/test), which is only 2 levels deep from project root, not 3. The fix checks if the 2-level path exists first; if not, falls back to 3 levels (for compiled `dist/src/integrations/` context). This makes both tsx-based tests and compiled production usage work correctly.
- **`skipConfirmation` as string type** — Registering as yargs `type: 'string'` and comparing against `'true'` exactly matches how `--skipConfirmation=true` is parsed. Registering as `type: 'boolean'` would cause yargs to parse it differently.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adaptive STUBS_DIR path resolution for tsx dev vs compiled dist**
- **Found during:** Task 1 verify step
- **Issue:** Plan specified 3 levels up from `dist/src/integrations/` for compiled output. But when tests run via tsx (source mode), `import.meta.url` resolves to `src/integrations/` which is only 2 levels from project root. Going 3 levels up from there reaches the parent of the project dir, so `STUBS_DIR` pointed to a non-existent path.
- **Fix:** Added `resolveStubsDir()` function that checks if the 2-level path exists first; if yes, uses it (tsx source context); if not, falls back to 3-level path (compiled context).
- **Files modified:** `src/integrations/load-integrations.ts`
- **Verification:** `loadIntegrations()` returns cloudflare-pages with 1 file; all 3 ADD integration tests pass
- **Committed in:** `303b6df` (Task 1 commit)

**2. [Rule 1 - Format] Fixed import formatting in update-app.ts**
- **Found during:** Final lint check
- **Issue:** Multi-line import for `{mkdirSync, readFileSync, writeFileSync}` from node:fs triggered Biome formatter error
- **Fix:** Collapsed to single-line import
- **Files modified:** `src/integrations/update-app.ts`
- **Verification:** No lint errors in our new files
- **Committed in:** `8c45c70` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 path resolution bug, 1 formatting)
**Impact on plan:** Both essential for correctness and lint compliance. No scope creep.

## Issues Encountered

- Pre-existing lint errors in `src/commands/build/index.ts`, `src/commands/new/index.ts`, and `src/migrate/*.ts` — these are out-of-scope per deviation rules (not caused by this plan's changes) and not blocking task completion. Deferred.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `loadIntegrations()` and `commitIntegration()` available for reuse if needed
- ADD-01/02/03 golden tests passing (previously red)
- Build passes clean with new integrations modules
- Ready for 05-03 (upgrade command implementation)

---
*Phase: 05-add-and-upgrade-commands*
*Completed: 2026-04-01*

## Self-Check: PASSED

All created files verified present on disk. All task commits verified in git log.
- src/integrations/load-integrations.ts: FOUND
- src/integrations/update-app.ts: FOUND
- src/commands/add/index.ts: FOUND
- 05-02-SUMMARY.md: FOUND
- Commit 303b6df: FOUND
- Commit 8c45c70: FOUND
