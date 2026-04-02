---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 05-04-PLAN.md
last_updated: "2026-04-02T07:08:47.241Z"
last_activity: "2026-04-02 — Phase 5 complete: migrate-v2 and upgrade commands fully implemented with 5-step v1→v2 migration"
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 16
  completed_plans: 16
  percent: 93
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

**Core value:** Every command in the existing Qwik CLI must work identically in the new package — 67 MUST PRESERVE behaviors cannot regress.
**Current focus:** Phase 5 — Add and Upgrade Commands (COMPLETE)

## Current Position

Phase: 5 of 6 (Add and Upgrade Commands) — COMPLETE
Plan: 4 of 4 in Phase 5
Status: Phase 5 complete, ready for Phase 6 (create-qwik)
Last activity: 2026-04-02 — Phase 5 complete: migrate-v2 and upgrade commands fully implemented with 5-step v1→v2 migration

Progress: [█████████░] 93% (Phases 1-5 of 6 complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-scaffold-and-core-architecture P01 | 15 | 2 tasks | 13 files |
| Phase 01-scaffold-and-core-architecture P02 | 5 | 2 tasks | 9 files |
| Phase 01-scaffold-and-core-architecture P03 | 8 | 2 tasks | 13 files |
| Phase 02-test-harness P01 | 2 | 2 tasks | 21 files |
| Phase 02-test-harness P02 | 5 | 2 tasks | 4 files |
| Phase 02-test-harness P03 | 15 | 2 tasks | 4 files |
| Phase 02-test-harness P04 | 8 | 1 task | 2 files |
| Phase 03-shared-foundations-and-simple-commands P01 | 2 | 2 tasks | 3 files |
| Phase 03-shared-foundations-and-simple-commands P02 | 10 | 2 tasks | 3 files |
| Phase 04-build-and-new-commands P01 | 12 | 1 tasks | 1 files |
| Phase 04-build-and-new-commands P02 | 12 | 2 tasks | 7 files |
| Phase 04-build-and-new-commands P03 | 12 | 1 tasks | 1 files |
| Phase 05-add-and-upgrade-commands P01 | 8 | 2 tasks | 6 files |
| Phase 05-add-and-upgrade-commands P03 | 15 | 2 tasks | 4 files |
| Phase 05-add-and-upgrade-commands P02 | 15 | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Init: oxc-parser + magic-string over ts-morph (lighter, matches reference impl)
- Init: Standalone repo (not monorepo extraction) for clean break and own release cycle
- Init: Japa over Vitest/Jest (matches reference implementation)
- Init: stubs/ for templates (solves __dirname extraction blocker)
- Init: Spec-first, tests-before-impl (13 spec docs + 25 golden-path scenarios define behavior before code)
- [Phase 01-scaffold-and-core-architecture]: Biome schema updated to v2.4.10 — organizeImports moved to assist.actions.source in Biome v2.4
- [Phase 01-scaffold-and-core-architecture]: tsdown entry limited to src/index.ts only — router.ts added when created in plan 03 (missing entry causes build failure not warning)
- [Phase 01-scaffold-and-core-architecture]: tsconfig.json rootDir set to . to allow bin/ TypeScript files to compile without rootDir constraint errors
- [Phase 01-scaffold-and-core-architecture]: Program.isIt() is protected, not public — test subclass exposes isItPublic() for assertion access
- [Phase 01-scaffold-and-core-architecture]: registerCommand/registerOption/registerAlias pattern accumulates yargs config in base class, applied all at once in parse() — avoids singleton yargs pattern removed in v18
- [Phase 01-scaffold-and-core-architecture]: HelpProgram overrides parse() returning empty args to prevent yargs from intercepting the 'help' keyword as a built-in flag
- [Phase 01-scaffold-and-core-architecture]: tsdown entry updated to include src/router.ts and bin/qwik.ts — deferred from plan 01 as planned to avoid missing-entry build failures
- [Phase 02-test-harness]: fx-02/fx-03 dist/.gitkeep omitted — fixture .gitignore correctly ignores dist/ (realistic for v1 projects)
- [Phase 02-test-harness]: Root .gitignore negation added for tests/fixtures/fx-06/dist/ — q-manifest.json must be tracked for mtime tests (CHK-02/CHK-03)
- [Phase 02-test-harness]: BUILD-04 injects failing build.server via writeFileSync in setup — avoids dedicated failing fixture, keeps setup self-contained
- [Phase 02-test-harness]: NEW-04 asserts stdout+stderr concatenated for 'already exists' — implementation may write to either stream
- [Phase 02-test-harness]: runCli/runCreateQwik use absolute TSX_ESM path — Node.js ESM --import loader resolution not affected by NODE_PATH; absolute path required when cwd is outside project root
- [Phase 02-test-harness]: MIG-01/MIG-04 have positive assertions (files MUST contain new imports) to guarantee genuine red state against stubs; MIG-02/03/05 are vacuous passes with documented TODO Phase 5 comments
- [Phase 02-test-harness]: ADD-02 positive assertion targets sub/adapters/cloudflare-pages/vite.config.ts — matches --projectDir=./sub invocation pattern established in setup
- [Phase 03-shared-foundations-and-simple-commands]: QWIK_VERSION ambient declaration must be in a separate globals.d.ts — types.ts has exports making it a module, so declare const there was module-scoped not globally visible
- [Phase 03-shared-foundations-and-simple-commands]: Joke data lives in src/commands/joke/jokes.ts as static array — no cross-package import satisfies SIMP-04
- [Phase 03-shared-foundations-and-simple-commands]: Plain console.log for joke setup and punchline — avoids clack box-drawing characters under NO_COLOR
- [Phase 04-build-and-new-commands]: process.exitCode=1 used in parallel phase so sibling scripts are not aborted — process.exit(1) would kill siblings
- [Phase 04-build-and-new-commands]: execute() returns typeof exitCode === number ? exitCode : 0 — router calls process.exit(code), so we must propagate exitCode via return value
- [Phase 04-build-and-new-commands]: parseInputName splits on [-_\s] only; / is NOT a separator
- [Phase 04-build-and-new-commands]: getOutDir returns flat src/components for component type (no subdirectory, matches NEW-02)
- [Phase 04-build-and-new-commands]: writeTemplateFile duplicate guard throws with exact format: outFilename already exists in outDir
- [Phase 04-build-and-new-commands]: Markdown/mdx handled as special case in execute(): outDir = dirname, filename = basename+ext — produces flat src/routes/blog/post.md not subdirectory/index.md
- [Phase 05-add-and-upgrade-commands]: visitNotIgnoredFiles always adds .git to ignore rules even without .gitignore (safety, per UPGR-06 research pitfall 5)
- [Phase 05-add-and-upgrade-commands]: .ts removed from BINARY_EXTENSIONS — conflated TypeScript source with MPEG-TS video container format
- [Phase 05-add-and-upgrade-commands]: Symlinks intentionally not followed in visitNotIgnoredFiles (OQ-07 deferred decision: skip is safer default)
- [Phase 05-add-and-upgrade-commands]: replaceImportInFiles: overwrites imported identifier always; overwrites local binding only when unaliased (local.name === importedName) — prevents breaking aliased imports
- [Phase 05-add-and-upgrade-commands]: exact parameter in replacePackage is documentation marker only — both paths produce identical regex; retained to signal intent for @qwik-city-plan replacement
- [Phase 05-add-and-upgrade-commands]: Adaptive STUBS_DIR resolution (2-level for src/, 3-level for dist/) — tsx runs source files so import.meta.url resolves to src/integrations/ not dist/src/integrations/
- [Phase 05-add-and-upgrade-commands]: skipConfirmation registered as type 'string' and compared against exact 'true' — yargs parses --flag=true as string when option type is string
- [Phase 05-add-and-upgrade-commands]: scanBoolean called in execute() not gated by isIt() — enables stdin-piping for test-driven confirm/cancel in non-TTY environments
- [Phase 05-add-and-upgrade-commands]: Cancel path uses Ctrl+C (\x03) piped to stdin — @clack/prompts isCancel() returns true for SIGINT; EOF does NOT trigger cancel (hangs with exit 13)
- [Phase 05-add-and-upgrade-commands]: process.chdir/restore wraps visitNotIgnoredFiles and runAllPackageReplacements — both use process.cwd() internally for path resolution and gitignore loading
- [Phase 05-add-and-upgrade-commands]: upgrade alias in router.ts points to same import as migrate-v2 — single source of truth, both commands always in sync

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 6 (upgrade): oxc-parser binding-scoped identifier rename API not yet verified (OQ-06) — needs research spike during Phase 5 planning
- Phase 6 (upgrade): visitNotIgnoredFiles symlink handling decision deferred (OQ-07)
- Phase 6 (create-qwik): Runtime version injection approach for starters not confirmed in ESM context (EB-05) — needs validation during Phase 6 planning

## Session Continuity

Last session: 2026-04-02T07:08:47.238Z
Stopped at: Completed 05-04-PLAN.md
Resume file: None
