---
phase: 07-type-baseline-regex-cleanup
plan: 02
subsystem: tooling
tags: [magic-regexp, regex, type-safety, refactor]

# Dependency graph
requires:
  - phase: 07-type-baseline-regex-cleanup/07-01
    provides: "tsc clean baseline with noUncheckedIndexedAccess and strictNullChecks"
provides:
  - "magic-regexp 0.11.0 installed as production dependency"
  - "All 12 regex patterns replaced with type-safe magic-regexp equivalents"
  - "escapeRegex() utility function eliminated from replace-package.ts"
  - "Named capture group API (.groups?.value) used in build mode parsing"
  - "SLUG_TOKEN and NAME_TOKEN exported from templates.ts for reuse"
affects: [08-content-population, 09-migration-architecture, 10-tooling-switch]

# Tech tracking
tech-stack:
  added: ["magic-regexp 0.11.0"]
  patterns:
    - "createRegExp(exactly(str), ['g']) for literal string global search/replace (replaces new RegExp + manual escaping)"
    - "exactly('str').at.lineStart() and exactly('').at.lineEnd() for line anchors"
    - "oneOrMore(char).groupedAs('value') for named capture groups (use match.groups?.value)"
    - "charIn('-_').or(whitespace) inside oneOrMore() for character class alternation"
    - "Module-level const pattern constants to avoid recreating regex on every call"

key-files:
  created: []
  modified:
    - "package.json — magic-regexp added to dependencies"
    - "src/migrate/replace-package.ts — escapeRegex removed; createRegExp(exactly(oldPkg), ['g'])"
    - "src/app-command.ts — createRegExp with line anchors for --flag matching"
    - "src/commands/build/index.ts — createRegExp with named capture group for --mode= parsing"
    - "src/commands/new/parse-input.ts — SEPARATOR/SEPARATOR_GLOBAL module-level constants"
    - "src/commands/new/templates.ts — SLUG_TOKEN, NAME_TOKEN, TEMPLATE_EXT constants exported"
    - "src/commands/new/index.ts — imports NAME_TOKEN from templates.ts"

key-decisions:
  - "exactly('').at.lineEnd() produces bare $ anchor — confirmed via node REPL testing"
  - "char (not anyChar) is the correct magic-regexp 0.11.0 export for matching any single character"
  - "at is available as a method on expression objects (.at.lineStart(), .at.lineEnd()), not as a standalone import"
  - "NAME_TOKEN and SLUG_TOKEN exported from templates.ts — new/index.ts reuses them rather than duplicating"
  - "Pre-existing CHK-01/02/03 and CRE-01/02/03 test failures are stub tests for future phases, not regressions"

patterns-established:
  - "magic-regexp: use exactly(str).at.lineStart().and(...).and(exactly('').at.lineEnd()) for anchored patterns"
  - "magic-regexp: use charIn('chars').or(whitespace) to express character class unions"
  - "Shared token constants at module level avoid regex recreation overhead"

requirements-completed: [TOOL-06]

# Metrics
duration: 18min
completed: 2026-04-02
---

# Phase 7 Plan 02: Type Baseline — Regex Migration Summary

**All 12 regex literals replaced with magic-regexp equivalents; escapeRegex() eliminated; zero raw regex in src/; tsc clean; all relevant tests green**

## Performance

- **Duration:** 18 min
- **Started:** 2026-04-02T17:05:47Z
- **Completed:** 2026-04-02T17:24:00Z
- **Tasks:** 2
- **Files modified:** 7 (+ pnpm-lock.yaml)

## Accomplishments

- Installed magic-regexp 0.11.0 as a production dependency
- Removed hand-rolled escapeRegex() and its regex literal from replace-package.ts; now uses createRegExp(exactly(oldPkg), ['g']) which auto-escapes
- Migrated all 12 regex patterns across 5 source files to type-safe magic-regexp equivalents
- Upgraded build/index.ts to use named capture group (.groups?.value) instead of positional match[1]
- Exported SLUG_TOKEN and NAME_TOKEN from templates.ts for reuse in new/index.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Install magic-regexp; migrate replace-package, app-command, build** — `247df3c` (feat)
2. **Task 2: Migrate parse-input, templates, new/index** — `b9e2a4d` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `package.json` — magic-regexp 0.11.0 added to dependencies
- `src/migrate/replace-package.ts` — escapeRegex() deleted; createRegExp(exactly(oldPkg), ['g']) replaces both patterns
- `src/app-command.ts` — createRegExp with line anchors replaces new RegExp template literal
- `src/commands/build/index.ts` — createRegExp with named capture group replaces /^--mode=(.+)$/
- `src/commands/new/parse-input.ts` — SEPARATOR/SEPARATOR_GLOBAL module-level constants replace 3 inline regex literals
- `src/commands/new/templates.ts` — SLUG_TOKEN, NAME_TOKEN, TEMPLATE_EXT constants replace 4 inline regex literals; tokens exported
- `src/commands/new/index.ts` — imports NAME_TOKEN from templates.ts; removes its own regex literal

## Decisions Made

- **`exactly('').at.lineEnd()` for $ anchor** — The `at` property is not a standalone export; it is a method on any expression object. `exactly('').at.lineEnd()` produces a bare `$` with no preceding character in the regex output.
- **`char` not `anyChar`** — magic-regexp 0.11.0 exports `char` (matching any `.` character); `anyChar` does not exist in this version. Plan's interface hint was inaccurate.
- **`at` not a top-level import** — The plan suggested `import { at } from 'magic-regexp'` but `at` is only available as `.at` property on expression objects. Adjusted usage accordingly.
- **Export SLUG_TOKEN/NAME_TOKEN** — Chose to export constants from templates.ts so new/index.ts can reuse them, following the plan's "either approach is fine" guidance.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adjusted magic-regexp API usage from plan's interface hints**
- **Found during:** Task 1 (app-command pattern construction)
- **Issue:** Plan referenced `anyChar` and standalone `at` exports that do not exist in magic-regexp 0.11.0
- **Fix:** Used `char` instead of `anyChar`; used `.at.lineStart()`/`.at.lineEnd()` as method calls on expression objects rather than standalone imports; used `exactly('').at.lineEnd()` for `$` anchor
- **Files modified:** src/app-command.ts, src/commands/build/index.ts
- **Verification:** Node REPL testing confirmed all patterns produce equivalent regex output to originals
- **Committed in:** 247df3c (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (API adaptation)
**Impact on plan:** Minor API surface correction only — all intended patterns migrated correctly. No scope creep.

## Issues Encountered

- magic-regexp 0.11.0 API differs slightly from the plan's interface hints (no `anyChar`, no standalone `at` export). Resolved by checking available exports via `Object.keys()` and using REPL testing to confirm correct pattern output before editing files.
- Pre-existing test failures in CHK-01/02/03 (check-client stub) and CRE-01/02/03 (create-qwik stub) are future-phase golden-path tests, not regressions from this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- magic-regexp is available for any future regex work in phases 8-11
- All source files are regex-literal-free; the codebase is now uniformly using magic-regexp for pattern matching
- tsc --noEmit: 0 errors; all migrate, build, new, and parse-input tests pass

---
*Phase: 07-type-baseline-regex-cleanup*
*Completed: 2026-04-02*

## Self-Check: PASSED

- All 7 source files confirmed present on disk
- Task 1 commit 247df3c verified in git log
- Task 2 commit b9e2a4d verified in git log
- SUMMARY.md created at .planning/phases/07-type-baseline-regex-cleanup/07-02-SUMMARY.md
