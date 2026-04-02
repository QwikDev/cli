---
phase: 04-build-and-new-commands
plan: 03
subsystem: cli
tags: [qwik, new, route, component, markdown, template, file-generation]

# Dependency graph
requires:
  - phase: 04-build-and-new-commands
    plan: 02
    provides: "parse-input.ts (inferTypeAndName, inferTemplate, parseInputName) and templates.ts (loadTemplates, writeTemplateFile, getOutDir)"
provides:
  - "NewProgram: full implementation replacing stub — generates routes, components, and markdown files with token substitution"
affects: [phase-05-add-command, phase-06-migrate-command]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "markdown/mdx type gets flat file output (dirname/basename split) rather than subdirectory/index.md"
    - "try/catch in execute() catches duplicate guard throws from writeTemplateFile, returns exit code 1"
    - "interact() auto-selects templateId when exactly 1 template exists for the chosen type (NEW-06)"

key-files:
  created: []
  modified:
    - src/commands/new/index.ts

key-decisions:
  - "Markdown/mdx handled as special case in execute(): outDir = src/routes/dirname(nameArg), filename = basename(nameArg)+ext (not index.md in subdirectory)"
  - "Non-null assertions (!) used for matching[0] and templateFiles[0] after length-guards to satisfy strict TS"

patterns-established:
  - "Special-casing markdown/mdx in execute() rather than modifying getOutDir — isolated change, simpler"

requirements-completed: [NEW-01, NEW-02, NEW-03, NEW-04, NEW-06, NEW-07, NEW-08]

# Metrics
duration: 12min
completed: 2026-04-01
---

# Phase 04 Plan 03: New Command Implementation Summary

**NewProgram replacing the stub: generates routes (index.tsx), flat components ([slug].tsx), and markdown files with token substitution, duplicate guard (exit 1), and nested directory creation**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-01T00:00:00Z
- **Completed:** 2026-04-01T00:12:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Implemented full NewProgram replacing the stub in src/commands/new/index.ts
- All 5 NEW integration tests pass (NEW-01 through NEW-05)
- Interactive prompt flow implemented with auto-select for single-template case (NEW-06)
- Markdown/mdx correctly produces flat files (e.g., src/routes/blog/post.md)

## Task Commits

1. **Task 1: Implement NewProgram with inference, template loading, and file generation** - `fc3975f` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/commands/new/index.ts` - Full NewProgram implementation: validate(), interact(), execute() with route/component/markdown/mdx handling

## Decisions Made

- Markdown/mdx handled as special case in execute(): `getOutDir` is not used for these types. Instead `outDir = join(rootDir, 'src', 'routes', dirname(nameArg))` and `filename = basename(nameArg) + ext` — this produces `src/routes/blog/post.md` as required by NEW-03.
- Non-null assertions (`!`) applied at `matching[0]` and `templateFiles[0]` after explicit `.length` guards — satisfies strict TypeScript without restructuring.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `src/app-command.ts`, `src/console.ts`, and `src/router.ts` (6 errors total) existed before this plan and are out of scope. They do not affect test execution since tests run via tsx without `tsc`. These errors are tracked as a deferred item.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `qwik new` command fully functional, all 5 golden-path tests pass
- Phase 05 (add command) can proceed — no blockers from this plan
- Pre-existing TypeScript strictness errors in app-command.ts/console.ts/router.ts should be resolved before final build

---
*Phase: 04-build-and-new-commands*
*Completed: 2026-04-01*
