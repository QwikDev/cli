---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Phases
status: planning
stopped_at: Completed 12-ci-setup-01-PLAN.md
last_updated: "2026-04-02T22:36:32.982Z"
last_activity: "2026-04-02 - Completed quick task 8: Add cross-platform CI matrix with OS and runtime dimensions"
progress:
  total_phases: 12
  completed_phases: 11
  total_plans: 26
  completed_plans: 26
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-02)

**Core value:** Every command in the existing Qwik CLI must work identically in the new package — 67 MUST PRESERVE behaviors cannot regress.
**Current focus:** Milestone v1.1 — Course Correction & Completeness

## Current Position

Phase: Phase 7 (Type Baseline) — ready to start
Plan: —
Status: Roadmap defined; ready for planning
Last activity: 2026-04-02 - Completed quick task 7: Derive stub priority from directory, make optional

**v1.1 Progress bar:** [----------] 0% (0/5 phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 0 (v1.1)
- Average duration: —
- Total execution time: 0 hours

**By Phase (v1.1):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 7. Type Baseline | TBD | - | - |
| 8. Content Population | TBD | - | - |
| 9. Migration Architecture | TBD | - | - |
| 10. Tooling Switch | TBD | - | - |
| 11. create-qwik Implementation | TBD | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

**v1.0 historical velocity (reference):**
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
| Phase 07-type-baseline-regex-cleanup P01 | 4 | 2 tasks | 7 files |
| Phase 07-type-baseline-regex-cleanup P02 | 18 | 2 tasks | 7 files |
| Phase 08-content-population P01 | 6 | 2 tasks | 268 files |
| Phase 08-content-population P02 | 8 | 1 tasks | 1 files |
| Phase 09-migration-architecture P01 | 25 | 2 tasks | 19 files |
| Phase 09-migration-architecture P02 | 14 | 2 tasks | 3 files |
| Phase 10-tooling-switch P01 | 15 | 2 tasks | 126 files |
| Phase 11-create-qwik-implementation P01 | 13 | 2 tasks | 15 files |
| Phase 11-create-qwik-implementation P02 | 7 | 1 tasks | 2 files |
| Phase 12-ci-setup P01 | 1 | 2 tasks | 8 files |

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
- [Phase 07-type-baseline-regex-cleanup]: Non-null assertion used for COMMANDS.help! and COMMANDS[task]! — keys are statically defined in Record literal
- [Phase 07-type-baseline-regex-cleanup]: getModuleExportName() discriminates on node.type === 'Literal' for oxc-parser ModuleExportName union
- [Phase 07-type-baseline-regex-cleanup]: Option<T> from @clack/prompts imported as ClackOption in core.ts to avoid collision with local Option type for yargs config
- [Phase 07-type-baseline-regex-cleanup]: magic-regexp: exactly('').at.lineEnd() produces bare dollar anchor; at is a method on expression objects, not a standalone import
- [Phase 07-type-baseline-regex-cleanup]: magic-regexp 0.11.0 exports char (not anyChar) for any-character matching; charIn('-_').or(whitespace) for character class unions
- [Phase 07-type-baseline-regex-cleanup]: Export SLUG_TOKEN and NAME_TOKEN from templates.ts; new/index.ts imports them to avoid duplication
- [Phase 08-content-population]: source from build/v2 branch (not main) — csr feature exists only on build/v2
- [Phase 08-content-population]: cloudflare-pages overwritten with upstream for consistency even though it already existed
- [Phase 08-content-population]: jokes.json lives in packages/create-qwik/src/helpers/ on main branch — build/v2 URL returned 404; adapters/ was untracked so rm -rf sufficient without git rm
- [Phase 09-migration-architecture]: buildMigrationChain filters by both fromVersion > step.version AND step.version <= toVersion to prevent out-of-range migration steps
- [Phase 09-migration-architecture]: updateDependencies called unconditionally when deps are behind — not gated by migration chain execution (MIGR-02)
- [Phase 09-migration-architecture]: migrations/ added to tsconfig.json include array — necessary for tsc to resolve types across relative import boundary
- [Phase 09-migration-architecture]: vitest.config.ts scoped to tests/unit/upgrade/ only — avoids Japa/Vitest collision on existing spec files
- [Phase 09-migration-architecture]: buildMigrationChain coerces toVersion: semver.lte('2.0.0', '2.0.0-beta.30') === false; must coerce pre-release target before upper-bound check
- [Phase 09-migration-architecture]: bin/test.ts excludes tests/unit/upgrade/** from Japa — Vitest describe/expect crashes Japa loader at file load
- [Phase 10-tooling-switch]: stubs/** and specs/** added to lint ignorePatterns — template/doc dirs not in Biome's original scope
- [Phase 10-tooling-switch]: eslint-disable-next-line for QWIK_VERSION ambient declare (build-time inject EB-05) and v3Run test variable (intentional unused)
- [Phase 10-tooling-switch]: Pre-existing Japa failures (7/75) confirmed unchanged before and after vite-plus switch — ADD-02, CHK-01, CRE-02/03 deferred to future phases
- [Phase 11-create-qwik-implementation]: Library path is self-contained (baseApp = libraryStarter, no starterApp): library never layers on top of base
- [Phase 11-create-qwik-implementation]: assert.property() replaced with assert.isDefined() in CRE-01 — chai deep-path notation misinterprets dot in @qwik.dev/core as nested path separator
- [Phase 11-create-qwik-implementation]: stubs/apps/empty: @qwik.dev/core added to dependencies (not devDependencies) — CRE-01 checks runtime deps
- [Phase 11-create-qwik-implementation]: panam/executor sub-path import (not panam/dist/executor.js) — exports map resolves correctly with NodeNext moduleResolution
- [Phase 11-create-qwik-implementation]: bgInstall tracked as outer-scoped let var so try/catch error handler can abort without per-prompt references
- [Phase 11-create-qwik-implementation]: Spinner polls bgInstall.success every 100ms during joke wait — avoids exposing proc.result to interactive layer
- [Phase 12-ci-setup]: setup-vp@v1 single step replaces manual pnpm/action-setup + setup-node + cache; Node 24 explicit; cancel-in-progress for PRs only via event_name expression

### Roadmap Evolution

- Phase 12 added: CI setup

### Pending Todos

None.

### Blockers/Concerns

- Phase 11 (create-qwik): Background install abort pattern with cross-spawn vs execa needs validation before implementation — research during Phase 11 planning
- Phase 11 (create-qwik): Runtime version injection approach for starter package.json dep versions needs a confirmed approach — two candidates documented in SUMMARY.md
- Phase 10 (tooling): oxlint rule coverage gap vs Biome needs audit before switch — document any rules with no oxlint equivalent
- Phase 6 (v1.0): create-qwik Runtime version injection approach for starters not confirmed in ESM context (EB-05) — needs validation during Phase 6 planning

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 2 | Deep research on dependency cleanup: magic-regexp removal, cross-spawn to native node, argument parsing consolidation | 2026-04-02 | e1c7d41 | [2-deep-research-on-dependency-cleanup-magi](./quick/2-deep-research-on-dependency-cleanup-magi/) |
| 3 | Remove cross-spawn, replace with native node:child_process | 2026-04-02 | e537aea | [3-remove-cross-spawn-replace-with-native-n](./quick/3-remove-cross-spawn-replace-with-native-n/) |
| 5 | Upgrade TypeScript to v6, fix tsconfig for TS6 breaking changes | 2026-04-02 | 71f5541 | [5-upgrade-typescript-to-v6-and-fix-tsconfi](./quick/5-upgrade-typescript-to-v6-and-fix-tsconfi/) |
| 6 | Rewrite README with practical contributor guide for stubs | 2026-04-02 | f55d0fc | [6-rewrite-readme-with-practical-contributo](./quick/6-rewrite-readme-with-practical-contributo/) |
| 7 | Derive stub priority from directory, make optional | 2026-04-02 | 1c5fe93 | [7-derive-stub-priority-from-directory-inst](./quick/7-derive-stub-priority-from-directory-inst/) |
| 8 | Add cross-platform CI matrix with OS, runtime, and package manager dimensions | 2026-04-02 | 7580d26 | [8-add-cross-platform-ci-matrix-with-os-and](./quick/8-add-cross-platform-ci-matrix-with-os-and/) |
| 9 | Fix critical bugs and security issues (3 Codex scan rounds) | 2026-04-02 | 81ca968 | [9-fix-critical-bugs-and-security-issues-fo](./quick/9-fix-critical-bugs-and-security-issues-fo/) |

## Session Continuity

Last session: 2026-04-02T22:36:32.000Z
Stopped at: Completed quick-9-01-PLAN.md
Resume file: None
