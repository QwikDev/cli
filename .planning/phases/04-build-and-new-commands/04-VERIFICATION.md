---
phase: 04-build-and-new-commands
verified: 2026-04-01T00:00:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
---

# Phase 4: Build and New Commands Verification Report

**Phase Goal:** `qwik build` orchestrates project scripts with the correct sequential-then-parallel ordering and lifecycle hooks; `qwik new` generates route and component files with correct token substitution
**Verified:** 2026-04-01
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | `qwik build` runs build.client sequentially first, then parallel scripts, exits 0 | VERIFIED | Integration test BUILD-01 passes (4/4 build tests green); `runSequential` called before `runParallel` in `execute()` |
| 2  | `qwik build preview` triggers build.preview instead of build.server, exits 0 | VERIFIED | BUILD-02 passes; `isPreview` branch at line 131 of build/index.ts pushes `build.preview` not `build.server` |
| 3  | `qwik build --mode staging` forwards mode to applicable scripts, exits 0 | VERIFIED | BUILD-03 passes; `attachMode()` helper appended to build.client, build.lib, build.server/preview |
| 4  | A failing parallel script sets process.exitCode=1 without aborting sibling scripts | VERIFIED | BUILD-04 passes; parallel runner uses `Promise.all` with always-resolving promises, sets `process.exitCode = 1` on non-zero close |
| 5  | prebuild.* scripts run before parallel phase; postbuild.* scripts run after | VERIFIED | Lines 106-112 (prebuild loop) and 159-165 (postbuild loop) in build/index.ts; sequential runner used |
| 6  | ssg runs after build.static in preview mode when both present | VERIFIED | Line 154 in build/index.ts: `if (isPreview && scripts["build.static"] && scripts["ssg"])` runs ssg sequentially |
| 7  | `qwik new /dashboard` creates src/routes/dashboard/index.tsx with token substitution, exit 0 | VERIFIED | NEW-01 integration test passes; route template has `[name]` tokens substituted |
| 8  | `qwik new counter` creates src/components/counter.tsx (flat, no subdirectory), exit 0 | VERIFIED | NEW-02 passes; `getOutDir` returns `src/components` for component type (no subdirectory) |
| 9  | `qwik new /blog/post.md` creates src/routes/blog/post.md, exit 0 | VERIFIED | NEW-03 passes; special-cased markdown path: `dirname(nameArg)` + `basename(nameArg) + ".md"` |

**Score:** 9/9 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/commands/build/index.ts` | BuildProgram with sequential+parallel orchestration | VERIFIED | 174 lines; exports `BuildProgram` and `default`; full orchestration implemented |
| `stubs/templates/qwik/route/index.tsx.template` | Route template with [name] tokens | VERIFIED | Present; contains `[name]` tokens in JSX and head.title |
| `stubs/templates/qwik/component/[slug].tsx.template` | Component template with [slug] and [name] tokens | VERIFIED | Present; filename has `[slug]`, content has `[name]` |
| `stubs/templates/qwik/markdown/index.md.template` | Markdown route template | VERIFIED | Present; `[name]` in frontmatter title and h1 |
| `stubs/templates/qwik/mdx/index.mdx.template` | MDX route template | VERIFIED | Present; `[name]` in frontmatter title and h1 |
| `src/commands/new/parse-input.ts` | parseInputName(), inferTypeAndName(), inferTemplate() | VERIFIED | All 3 functions exported; 11 unit tests pass |
| `src/commands/new/templates.ts` | loadTemplates(), writeTemplateFile(), TemplateType, Template, TemplateFile | VERIFIED | All types and functions exported; import.meta.url resolution present |
| `src/commands/new/index.ts` | NewProgram with full inference, template loading, and file generation | VERIFIED | 186 lines; exports `NewProgram` and `default`; validate/interact/execute fully implemented |
| `tests/unit/parse-input.spec.ts` | Unit tests for parseInputName() | VERIFIED | 11 tests; all pass |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/commands/build/index.ts` | `cross-spawn` | `import crossSpawn from 'cross-spawn'` | WIRED | Line 3; `crossSpawn.sync` used in `runSequential`, `crossSpawn()` used in `runParallel` |
| `src/commands/build/index.ts` | `package.json scripts` | `readFileSync` + `JSON.parse` from `process.cwd()` | WIRED | Lines 88-93; `join(process.cwd(), "package.json")` read and parsed; scripts used in all phases |
| `src/commands/new/templates.ts` | `stubs/templates/` | `import.meta.url` path resolution | WIRED | Line 31; `fileURLToPath(import.meta.url)` + 3 `..` segments resolves to project-root `stubs/templates/` |
| `src/commands/new/index.ts` | `src/commands/new/parse-input.ts` | `import { parseInputName, inferTypeAndName, inferTemplate } from "./parse-input.js"` | WIRED | Lines 5-8; all 3 functions imported and used in validate/interact/execute |
| `src/commands/new/index.ts` | `src/commands/new/templates.ts` | `import { loadTemplates, writeTemplateFile, getOutDir, TemplateType } from "./templates.js"` | WIRED | Lines 9-14; `loadTemplates` called in interact and execute; `writeTemplateFile` and `getOutDir` called in execute |
| `src/commands/new/index.ts` | `stubs/templates/qwik/` | `loadTemplates()` reads template files at runtime | WIRED | `loadTemplates()` called at lines 78 and 107; resolved via import.meta.url in templates.ts |
| `src/router.ts` | `src/commands/build/index.ts` | `build: () => import("./commands/build/index.js")` | WIRED | Line 11; dispatched when `process.argv[2] === "build"` |
| `src/router.ts` | `src/commands/new/index.ts` | `new: () => import("./commands/new/index.js")` | WIRED | Line 12; dispatched when `process.argv[2] === "new"` |

---

## Requirements Coverage

All 16 requirement IDs declared across plans (BUILD-01 through BUILD-07, NEW-01 through NEW-09) are mapped in REQUIREMENTS.md to Phase 4 and marked Complete.

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BUILD-01 | 04-01 | build.client first, then parallel | SATISFIED | `runSequential` before `runParallel` in execute(); test passes |
| BUILD-02 | 04-01 | build preview triggers build.preview | SATISFIED | `isPreview` branch selects `build.preview`; test passes |
| BUILD-03 | 04-01 | --mode forwarded to build.client/lib/server | SATISFIED | `attachMode()` applied; test passes |
| BUILD-04 | 04-01 | prebuild.* sequential before parallel | SATISFIED | Lines 106-112 enumerate `prebuild.` keys and run sequentially |
| BUILD-05 | 04-01 | postbuild.* sequential after parallel | SATISFIED | Lines 159-165 enumerate `postbuild.` keys and run sequentially |
| BUILD-06 | 04-01 | process.exitCode=1 on failure, no abort | SATISFIED | `process.exitCode = 1` in both runners; `Promise.all` never rejects; BUILD-04 test passes |
| BUILD-07 | 04-01 | ssg runs after build.static in preview | SATISFIED | Line 154 guard: `isPreview && scripts["build.static"] && scripts["ssg"]` |
| NEW-01 | 04-03 | /path creates route in src/routes/ with token substitution | SATISFIED | `getOutDir` + `writeTemplateFile` with `[slug]`/`[name]` replacement; test passes |
| NEW-02 | 04-03 | no-slash creates component in src/components/ | SATISFIED | `getOutDir` returns flat `src/components` for component type; test passes |
| NEW-03 | 04-03 | /path.md creates markdown route | SATISFIED | Special-case markdown path in execute(); `src/routes/blog/post.md` created; test passes |
| NEW-04 | 04-03 | Duplicate file guard | SATISFIED | `existsSync` check in `writeTemplateFile` throws with exact message; NEW-04 test passes (exit 1 + "already exists") |
| NEW-05 | 04-02 | --templateId flag selects template | SATISFIED | `inferTemplate()` strips `--` prefix from flagArgs; consumed in `validate()` and `interact()` |
| NEW-06 | 04-03 | Auto-select template when exactly 1 found | SATISFIED | `interact()` lines 83-85: `if (matching.length === 1) templateId = matching[0]!.id` |
| NEW-07 | 04-03 | mkdirSync with recursive:true | SATISFIED | `writeTemplateFile` calls `mkdirSync(outDir, { recursive: true })`; markdown/mdx path also uses `mkdirSync` |
| NEW-08 | 04-03 | Interactive prompt flow | SATISFIED | `interact()` prompts for type (if undefined), name (if undefined), and template (if multiple); each conditional |
| NEW-09 | 04-02 | parseInputName slug and PascalCase on [-_\s] only | SATISFIED | `parseInputName` splits on `/[-_\s]+/` only; `/` preserved; 11 unit tests pass |

**Note on NEW-05 labeling discrepancy:** The 04-02 PLAN and integration test suite use "NEW-05" to label the nested-directory integration test, while REQUIREMENTS.md defines NEW-05 as "template flag selects template." Both behaviors are fully implemented: (a) `inferTemplate()` handles `--<templateId>` flag selection, and (b) the nested directory test (integration NEW-05 label) passes via `mkdirSync(outDir, { recursive: true })`. No requirement gap; this is a test-label vs requirement-ID naming collision in the plans.

---

## Anti-Patterns Found

No anti-patterns detected in phase 4 files:

- No TODO/FIXME/HACK/PLACEHOLDER comments in any of the 8 files
- No stub return values (`return null`, `return {}`, `return []`)
- No empty handlers or placeholder implementations
- No `console.log`-only function bodies

---

## Human Verification Required

### 1. Interactive prompt flow (NEW-08)

**Test:** Run `qwik new` with no arguments from a project directory in a real TTY terminal
**Expected:** Prompts appear for type selection, name input, and template selection (each conditional on prior answers)
**Why human:** Tests run non-interactively (stdin is not a TTY), so the `interact()` path is never exercised by the automated test suite

### 2. Mode forwarding output verification (BUILD-03)

**Test:** Run `qwik build --mode staging` in a project that echoes the `--mode` flag in its build scripts
**Expected:** Scripts receive `--mode staging` appended and reflect it in output
**Why human:** The fx-01 fixture's scripts do not print the mode value, so BUILD-03 only asserts exit code 0, not that mode was actually forwarded to script output

---

## Gaps Summary

No gaps. All 9 observable truths are verified, all 8 artifacts exist and are substantive, all key links are wired, and all 16 requirements have implementation evidence. The two human verification items are UX-level checks (interactive TTY behavior and mode flag echo) that cannot be asserted programmatically but do not indicate missing implementation.

The full test suite run confirms no phase 4 regressions: 64 tests pass (including all 4 BUILD, 5 NEW integration, and 11 parse-input unit tests), and the 11 failures are all in phases 5-6 (ADD, CHK, CRE, MIG) which are pending implementation.

---

_Verified: 2026-04-01_
_Verifier: Claude (gsd-verifier)_
