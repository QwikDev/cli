---
phase: 01-scaffold-and-core-architecture
plan: "01"
subsystem: infra
tags: [typescript, tsdown, biome, japa, nodejs, npm, esm, cjs]

requires: []
provides:
  - "package.json with all runtime and dev dependencies, engines >=20.19.0, bin/exports/files fields"
  - "tsconfig.json with strict mode and NodeNext module resolution"
  - "tsdown.config.ts producing dual ESM+CJS output with QWIK_VERSION injected at build time"
  - "biome.json lint/format config (v2.4.10 syntax)"
  - "src/types.ts with all shared type definitions (IntegrationData, UpdateAppOptions, UpdateAppResult, FileUpdate, CreateAppResult)"
  - "stubs/ directory with four subdirectories (adapters, features, apps, templates)"
  - "bin/test.ts Japa test runner entry point"
  - "tests/unit/scaffold.spec.ts smoke tests (all 5 passing)"
affects:
  - "02-program-base-and-router"
  - "03-console-utilities"
  - "04-add-command"
  - "05-create-and-new-commands"
  - "06-upgrade-and-remaining-commands"

tech-stack:
  added:
    - "@clack/prompts@^0.11.0"
    - "cross-spawn@^7.0.6"
    - "fs-extra@^11.3.0"
    - "kleur@^4.1.5"
    - "magic-string@^0.30"
    - "oxc-parser@^0.123"
    - "panam@^0.3.0"
    - "which@^5.0.0"
    - "which-pm-runs@^1.1.0"
    - "yargs@^18.0.0"
    - "@biomejs/biome@^2.0.0 (resolved 2.4.10)"
    - "@japa/runner@^4.2.0"
    - "@japa/assert@^4.0.1"
    - "tsdown@^0.20.1 (resolved 0.20.3)"
    - "tsx"
    - "typescript@^5.8.3"
  patterns:
    - "Dual ESM+CJS output via tsdown with QWIK_VERSION define injection"
    - "Biome v2 config with includes (not include/ignore) syntax"
    - "Japa test runner with node --import tsx/esm bin/test.ts"
    - "stubs/ directory for template assets (resolves __dirname extraction blocker)"

key-files:
  created:
    - "package.json"
    - "tsconfig.json"
    - "tsdown.config.ts"
    - "biome.json"
    - ".gitignore"
    - "src/types.ts"
    - "src/index.ts"
    - "bin/test.ts"
    - "tests/unit/scaffold.spec.ts"
    - "stubs/adapters/.gitkeep"
    - "stubs/features/.gitkeep"
    - "stubs/apps/.gitkeep"
    - "stubs/templates/.gitkeep"
  modified: []

key-decisions:
  - "biome.json schema version updated from 2.0.0 to 2.4.10 (installed version) — organizeImports moved to assist.actions.source in v2.4"
  - "tsdown entry points limited to src/index.ts only (src/router.ts deferred to plan 03 when that file is created)"
  - "tsconfig.json rootDir set to . (not src) to allow bin/ TypeScript files to compile"

patterns-established:
  - "QWIK_VERSION pattern: declare const in types.ts, injected via tsdown define from package.json version"
  - "Stubs resolution: stubs/ at project root, included in npm tarball via files field"
  - "Test runner: node --import tsx/esm bin/test.ts — no compiled test output needed"

requirements-completed: [SCAF-01, SCAF-02, SCAF-03, SCAF-04, SCAF-05, SCAF-06]

duration: 15min
completed: 2026-04-02
---

# Phase 1 Plan 01: Scaffold and Core Architecture Summary

**@qwik.dev/cli repo scaffolded with dual ESM+CJS tsdown build, Biome v2 linting, Japa test harness, shared TypeScript types, and stubs/ directory structure resolving 6 extraction blockers**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-02T03:16:00Z
- **Completed:** 2026-04-02T03:31:23Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Full package scaffold with all 10 runtime and 11 dev dependencies installed (npm install exits 0)
- tsdown dual ESM+CJS build producing dist/esm/index.mjs and dist/cjs/index.cjs with QWIK_VERSION injected at build time (resolves EB-05)
- Shared type definitions for IntegrationData, UpdateAppOptions, UpdateAppResult, FileUpdate, CreateAppResult — all cross-package types internalized (resolves EB-04)
- stubs/ directory with 4 subdirectories included in npm tarball (resolves EB-01, EB-02 structurally)
- Japa test harness running — all 5 scaffold smoke tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create package.json, tsconfig, tsdown, and biome** - `0d356b0` (chore)
2. **Task 2: Add types, stubs, and Japa test harness** - `3867bab` (feat)

**Plan metadata:** (pending — added after STATE.md update)

## Files Created/Modified

- `package.json` — @qwik.dev/cli package with all deps, engines >=20.19.0, bin, exports (dual), files (dist+stubs)
- `tsconfig.json` — strict mode, NodeNext resolution, ES2022 target, rootDir .
- `tsdown.config.ts` — dual ESM+CJS output, node20 target, QWIK_VERSION define from pkg.version
- `biome.json` — Biome v2.4.10 config with includes syntax, assist.actions for organize imports
- `.gitignore` — node_modules/, dist/, *.tgz
- `src/types.ts` — IntegrationData, UpdateAppOptions, UpdateAppResult, FileUpdate, CreateAppResult + QWIK_VERSION declare
- `src/index.ts` — re-exports all types from types.ts
- `bin/test.ts` — Japa test runner with @japa/assert, processes CLI args, globs tests/**/*.spec.ts
- `tests/unit/scaffold.spec.ts` — 5 scaffold smoke tests (all passing)
- `stubs/adapters/.gitkeep` — placeholder for Phase 5 adapter stubs
- `stubs/features/.gitkeep` — placeholder for Phase 5 feature stubs
- `stubs/apps/.gitkeep` — placeholder for Phase 6 app starters
- `stubs/templates/.gitkeep` — placeholder for Phase 4 qwik new templates

## Decisions Made

- **Biome schema version:** Updated from 2.0.0 to 2.4.10 because the installed biome version (2.4.10) rejected the 2.0.0 schema URL with a version mismatch error. Also moved `organizeImports` to `assist.actions.source.organizeImports: "on"` (breaking change in Biome v2.4).
- **tsdown entry points:** Used only `src/index.ts` in tsdown config (removed `src/router.ts` from the plan's suggested config) because router.ts does not yet exist and would cause a build error. The plan noted tsdown would "warn but not fail" but it actually does fail on missing entry points.
- **tsconfig.json rootDir:** Set to `.` rather than `src` to allow `bin/test.ts` to compile without TypeScript errors about files outside rootDir.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Biome schema version mismatch and organizeImports removal**
- **Found during:** Task 1 (biome verification)
- **Issue:** biome.json specified schema 2.0.0 but installed version is 2.4.10; additionally `organizeImports` is no longer a top-level key in v2.4 (moved to `assist.actions.source`)
- **Fix:** Updated $schema URL to `2.4.10/schema.json`, replaced `organizeImports: { enabled: true }` with `assist: { actions: { source: { organizeImports: "on" } } }`
- **Files modified:** biome.json
- **Verification:** `npx biome check --no-errors-on-unmatched .` exits 0
- **Committed in:** 0d356b0 (Task 1 commit)

**2. [Rule 3 - Blocking] Removed non-existent router.ts entry from tsdown config**
- **Found during:** Task 1 (tsdown build attempt)
- **Issue:** Plan suggested including `src/router.ts` as a tsdown entry point but noted it might warn. In practice tsdown v0.20.3 fails (not warns) on missing entry files
- **Fix:** Removed `src/router.ts` from tsdown entry array; left only `src/index.ts`. router.ts will be added to tsdown config in plan 03
- **Files modified:** tsdown.config.ts
- **Verification:** `npx tsdown` exits 0 with dual output
- **Committed in:** 0d356b0 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for build toolchain to function. No scope creep.

## Issues Encountered

- Biome v2.4.10 installed (newer than the 2.0.0 spec in plan) — required schema and API updates. All functionality preserved.
- tsdown v0.20.3 installed (not v0.21.7 as listed in STACK.md; constrained by `^0.20.1` in package.json). Dual output works correctly at this version.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Build, lint, and test infrastructure fully operational
- src/types.ts type definitions available for all subsequent plans
- stubs/ directory structure established, ready to populate in Phases 4-6
- Plan 02 (Program base class and router) can proceed immediately

---
*Phase: 01-scaffold-and-core-architecture*
*Completed: 2026-04-02*

## Self-Check: PASSED

All files verified present. Both task commits verified in git history (0d356b0, 3867bab).
