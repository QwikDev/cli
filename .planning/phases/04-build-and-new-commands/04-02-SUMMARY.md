---
phase: 04-build-and-new-commands
plan: 02
subsystem: cli
tags: [qwik, templates, stub-files, tdd, japa, typescript, esm]

# Dependency graph
requires:
  - phase: 03-shared-foundations-and-simple-commands
    provides: Program base class and shared utilities consumed by NewProgram
provides:
  - 4 stub template files in stubs/templates/qwik/ (route, component, markdown, mdx)
  - parseInputName() slug/PascalCase splitting function
  - inferTypeAndName() type detection from argv input
  - inferTemplate() template ID resolution
  - loadTemplates() using import.meta.url resolution
  - writeTemplateFile() with NEW-04 duplicate guard
  - getOutDir() flat-component / nested-route logic
affects:
  - 04-03-PLAN (NewProgram implementation consumes these helpers)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - import.meta.url resolution for stubs/ directory path (ESM-safe)
    - TDD red/green for pure parseInputName function
    - Template token substitution with [slug] and [name] tokens

key-files:
  created:
    - stubs/templates/qwik/route/index.tsx.template
    - stubs/templates/qwik/component/[slug].tsx.template
    - stubs/templates/qwik/markdown/index.md.template
    - stubs/templates/qwik/mdx/index.mdx.template
    - src/commands/new/parse-input.ts
    - src/commands/new/templates.ts
    - tests/unit/parse-input.spec.ts
  modified: []

key-decisions:
  - "parseInputName splits on [-_\\s] only; / is NOT a separator (nested/path stays intact)"
  - "getOutDir returns flat src/components for component type (NEW-02: no subdirectory)"
  - "loadTemplates sorts qwik first so default template is always first"
  - "writeTemplateFile duplicate guard throws with exact message format: outFilename already exists in outDir"

patterns-established:
  - "Template tokens: [slug] in filenames (stripped) and [name] in content"
  - "ESM path resolution: fileURLToPath(import.meta.url) + dirname + relative segments"

requirements-completed: [NEW-05, NEW-09]

# Metrics
duration: 12min
completed: 2026-04-02
---

# Phase 04 Plan 02: Template Files and Helper Modules Summary

**4 Qwik stub templates + parseInputName/inferTypeAndName/loadTemplates/writeTemplateFile helpers enabling the New command to scaffold routes, components, markdown, and MDX files**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-02T06:08:22Z
- **Completed:** 2026-04-02T06:20:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created 4 template files in stubs/templates/qwik/ with [slug] and [name] token placeholders
- Implemented parseInputName() splitting on [-_\s] with / preservation, with 11 TDD unit tests
- Implemented inferTypeAndName() for route/component/markdown/mdx type detection
- Implemented templates.ts with loadTemplates(), writeTemplateFile() (NEW-04 guard), and getOutDir()

## Task Commits

Each task was committed atomically:

1. **Task 1: Create template files and parseInputName with unit test** - `f2e9d3e` (feat)
2. **Task 2: Create template loading and file writing module** - `f9d6aac` (feat)

## Files Created/Modified
- `stubs/templates/qwik/route/index.tsx.template` - Route template with [name] tokens
- `stubs/templates/qwik/component/[slug].tsx.template` - Component template with [slug] and [name] tokens
- `stubs/templates/qwik/markdown/index.md.template` - Markdown route template
- `stubs/templates/qwik/mdx/index.mdx.template` - MDX route template
- `src/commands/new/parse-input.ts` - parseInputName(), inferTypeAndName(), inferTemplate()
- `src/commands/new/templates.ts` - loadTemplates(), writeTemplateFile(), getOutDir(), types
- `tests/unit/parse-input.spec.ts` - 11 unit tests covering all parseInputName/inferTypeAndName behaviors

## Decisions Made
- parseInputName splits on [-_\s] only; / is NOT a separator so "nested/path" produces slug "nested/path" and name "Nested/path"
- getOutDir returns flat src/components for component type (matches NEW-02 assertion: src/components/counter.tsx)
- loadTemplates sorts 'qwik' first so the default template is always the first in the list
- writeTemplateFile duplicate guard throws with exact message format matching test expectations

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in app-command.ts, console.ts, and router.ts were present before this plan and are out of scope per deviation rules. No new type errors introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All helpers are ready for consumption by NewProgram (04-03)
- loadTemplates() will resolve stubs/templates/ correctly at runtime via import.meta.url
- writeTemplateFile() implements all NEW-04 duplicate guard requirements
- getOutDir() provides flat-component / nested-route logic needed by the new command

---
*Phase: 04-build-and-new-commands*
*Completed: 2026-04-02*

## Self-Check: PASSED

All 7 created files verified. Both task commits (f2e9d3e, f9d6aac) confirmed in git log.
