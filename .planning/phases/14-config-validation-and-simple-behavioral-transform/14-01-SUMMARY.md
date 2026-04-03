---
phase: 14-config-validation-and-simple-behavioral-transform
plan: "01"
subsystem: migration
tags: [tsconfig, package-json, config-transforms, tdd, regex, idempotent]

# Dependency graph
requires:
  - phase: 13-transform-infrastructure
    provides: run-migration.ts Step 3 (package replacement) — Step 3b inserted after it
provides:
  - fixJsxImportSource: rewrites @builder.io/qwik to @qwik.dev/core in tsconfig.json
  - fixModuleResolution: rewrites Node/Node16 to Bundler (case-insensitive) in tsconfig.json
  - fixPackageType: adds type:module to package.json when missing
  - Step 3b config validation wired into runV2Migration
affects:
  - 14-02 (if any)
  - 17-transform-test-coverage

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Raw-string regex replace for JSONC files (preserves comments, avoids full parse)"
    - "JSON.parse/stringify for standard JSON with trailing newline guarantee"
    - "ENOENT-safe pattern: readFileSync in try/catch, return silently"
    - "Idempotency: compare updated string to original, skip writeFileSync if unchanged"

key-files:
  created:
    - migrations/v2/fix-config.ts
    - tests/unit/upgrade/fix-config.spec.ts
  modified:
    - migrations/v2/run-migration.ts

key-decisions:
  - "Raw string + regex for tsconfig transforms: JSONC comments preserved without a full JSONC parser"
  - "Regex /"moduleResolution"\\s*:\\s*"Node(?:16)?"/gi for case-insensitive Node/Node16 matching"
  - "fixPackageType uses JSON.parse (not raw string) because package.json is always standard JSON"

patterns-established:
  - "Config transforms: raw-string regex for JSONC, JSON.parse for JSON — established for Phase 14 forward"

requirements-completed: [CONF-01, CONF-02, CONF-03]

# Metrics
duration: 2min
completed: 2026-04-03
---

# Phase 14 Plan 01: Config Validation and Simple Behavioral Transform Summary

**Three idempotent tsconfig/package.json auto-fix transforms (jsxImportSource, moduleResolution, type:module) with TDD coverage and Step 3b wiring in runV2Migration**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-03T16:13:36Z
- **Completed:** 2026-04-03T16:15:11Z
- **Tasks:** 2 (TDD task with RED/GREEN commits + wiring task)
- **Files modified:** 3

## Accomplishments
- Created `migrations/v2/fix-config.ts` with 3 exported transform functions covering CONF-01/02/03
- Created 13 tests covering all 11 specified behaviors (rewrite, idempotency, missing file, JSONC preservation, trailing newline)
- Wired all three transforms into `runV2Migration` as Step 3b after package replacement
- Full suite: 64 tests pass, zero type errors

## Task Commits

Each task was committed atomically:

1. **RED phase — failing tests** - `52fd0da` (test)
2. **GREEN phase — fix-config.ts implementation** - `3bf0e6a` (feat)
3. **Task 2: Wire into runV2Migration Step 3b** - `d01d7e5` (feat)

## Files Created/Modified
- `migrations/v2/fix-config.ts` - Three config auto-fix functions (fixJsxImportSource, fixModuleResolution, fixPackageType)
- `tests/unit/upgrade/fix-config.spec.ts` - 13 unit tests covering all 11 CONF-01/02/03 behaviors
- `migrations/v2/run-migration.ts` - Added Step 3b import and call block after Step 3

## Decisions Made
- Used raw-string regex (not JSONC parser) for tsconfig transforms — preserves block comments without adding a dependency
- `/"moduleResolution"\s*:\s*"Node(?:16)?"/gi` handles all case variants (node, Node, NODE, Node16, node16) with a single regex
- `fixPackageType` uses `JSON.parse` + `JSON.stringify(..., null, 2) + "\n"` because package.json is always standard JSON (no comments)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CONF-01, CONF-02, CONF-03 requirements fulfilled
- Step 3b is live in runV2Migration; Phase 14-02 (if planned) can extend further
- Phase 17 (test coverage) can reference fix-config.ts and its spec as a coverage baseline

---
*Phase: 14-config-validation-and-simple-behavioral-transform*
*Completed: 2026-04-03*
