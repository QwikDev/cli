# Project Research Summary

**Project:** @qwik.dev/cli — Standalone Qwik CLI reimplementation
**Domain:** Node.js CLI tooling — extraction from monorepo to standalone npm package
**Researched:** 2026-04-01
**Confidence:** HIGH

## Executive Summary

This project is a behavioral-parity reimplementation of the Qwik CLI, extracted from the QwikDev monorepo into a standalone `@qwik.dev/cli` package with its own release cycle. The existing Qwik CLI is a 9-command tool covering project scaffolding (`qwik add`, `qwik new`, `create-qwik`), build orchestration (`qwik build`), migration (`qwik migrate-v2`/`upgrade`), and utilities (`check-client`, `version`, `joke`, `help`). Research is grounded directly in the reference implementation (`create-qwikdev-astro`) and five verified spec documents totaling 67 classified MUST PRESERVE behaviors. The recommended approach adopts the `Program<T,U>` base class lifecycle pattern from the reference implementation, `yargs@18` for argument parsing, `@clack/prompts` for interactive UX, and `tsdown` for dual ESM+CJS output — all verified against the reference `package.json`.

The central challenge is not feature development but safe extraction: the existing CLI contains seven documented extraction blockers. The most critical are `__dirname`-relative asset path resolution (breaks silently when imported from a standalone package), a `CODE_MOD` build-time global that corrupts vite configs in scaffolding flows if not replaced with an explicit parameter, and cross-package coupling that prevents standalone packaging. Every one of these blockers must be addressed in Phase 1 (repository scaffold) before any command implementation begins — retrofitting after commands are written requires touching every path reference and is a source of silent behavioral divergence.

The key risks are scope creep and ordering mistakes. This is a parity release, not an innovation release. The COMPATIBILITY-CONTRACT.md documents 67 MUST PRESERVE behaviors; deviating from any of them breaks existing CI pipelines, IDE extensions, or user scripts that hard-code flags, exit codes, or output formats. The recommended mitigation is to implement 25 golden-path Japa parity tests before shipping — encoding the behavioral contract as executable tests rather than documentation. With all extraction blockers resolved and parity tests passing, the extraction itself becomes the differentiator: independent releases, dual ESM+CJS output, and oxc-parser replacing ts-morph as a permanent (not transient-install) dependency.

## Key Findings

### Recommended Stack

The stack is pinned to the `create-qwikdev-astro` reference implementation with versions verified against its `package.json`. Runtime dependencies are all well-established within the void(0)/Qwik ecosystem. `yargs@18` is ESM-first and requires Node.js `^20.19.0 || ^22.12.0 || >=23` — this sets the minimum runtime target. The build toolchain moves from `tsup` (esbuild) to `tsdown` (Rolldown-based), which is the forward trajectory for the void(0) ecosystem. `@biomejs/biome@2.x` replaces ESLint + Prettier in a single tool. The `oxc-parser + magic-string` pair replaces ts-morph for AST-based codemods, eliminating a 50MB runtime install.

**Core technologies:**
- `@clack/prompts@^0.11.0`: Interactive terminal prompts — used in reference impl, composable API, well-maintained
- `yargs@^18.0.0`: CLI argument parsing — supports 9-subcommand surface, ESM-first, explicit command names required
- `cross-spawn@^7.0.6`: Cross-platform process spawning — required for Windows compatibility, reference impl switched to this from execa
- `fs-extra@^11.3.0`: File system operations — `copy`, `ensureDir`, `outputFile` essential for stubs/template copying
- `kleur@^4.1.5`: Terminal colors — zero deps, fast, NO_COLOR support, used in reference impl
- `panam@^0.3.0`: Package manager abstraction — unified `pm.install()`, `pm.x()`, `pm.create()` across npm/yarn/pnpm/bun
- `which-pm-runs@^1.1.0`: Package manager detection — reads `npm_config_user_agent`; used by `getPackageManager()` fallback
- `magic-string@^0.30` + `oxc-parser@^0.123`: AST-based source mutations — replaces ts-morph; oxc is Rust-based, 3x faster, no tsconfig init required
- `tsdown@^0.20.1`: Dual ESM+CJS build — Rolldown-based, replaces tsup, Node.js >= 20.19.0 required
- `@biomejs/biome@^2.x`: Lint + format — replaces ESLint + Prettier; v2 has type-aware rules and monorepo support
- `@japa/runner@^4.2.0` + `@japa/assert@^4.0.1`: Test runner — used in reference impl, ESM-only, v5 drops fast-glob dependency

### Expected Features

The v1 goal is behavioral parity across all 9 commands. Every table stakes item maps to one or more MUST PRESERVE behaviors in the compatibility contract. Innovation is explicitly deferred until parity is validated.

**Must have (table stakes — all v1):**
- 9-command binary surface (`add`, `build`, `build preview`, `new`, `joke`, `migrate-v2`, `check-client`, `help`, `version`)
- Non-interactive flag mode (`--skipConfirmation=true`, `--projectDir=<path>`) for CI pipeline compatibility
- Exit code contract: 0 on success/cancel, 1 on error, `process.exitCode = 1` (non-throw) for build failures
- `build.client` sequential guarantee before parallel phase
- `prebuild.*` / `postbuild.*` lifecycle hooks
- `--mode` flag forwarding to build scripts
- `qwik new` route/component file generation with `[slug]`/PascalCase token substitution
- Duplicate file guard in `qwik new`
- Interactive `@clack/prompts` UX for `add`, `new`, `migrate-v2`, `help`
- Package manager auto-detection with pnpm fallback
- `qwik migrate-v2` 5-step sequence in exact order (substring ordering constraint is CRITICAL)
- `check-client` 3-branch decision tree using `dist/q-manifest.json` mtime as cache key
- `qwik version` bare semver output (no label prefix — IDE extensions parse this)
- `stubs/` template directory with explicit path resolution (no `__dirname` hacks)
- `qwik add` integration file writes + dependency install + postInstall hook
- `migrate-v2` alias so existing scripts continue to work when command is renamed to `upgrade`
- 25 golden-path Japa parity tests encoding behavioral contract

**Should have (v1.x differentiators):**
- `qwik --version` flag dual support alongside `qwik version` subcommand
- `qwik upgrade` shown in help output (currently `showInHelp: false`)
- Dry-run flag for `migrate-v2`
- AST-based codemods via oxc-parser + magic-string (replacing ts-morph runtime install)
- `Program` base class lifecycle (`parse → validate → interact → execute`)
- Dual ESM+CJS output via tsdown

**Defer (v2+):**
- Additional `qwik new` types (additive only, must not rename existing types)
- `updateConfigurations()` re-evaluation (was deliberately commented out; requires investigation first)
- New commands beyond the 9-command surface
- GUI or web-based interface (out of scope per PROJECT.md)

### Architecture Approach

The architecture follows a strict three-tier model: a thin **Entry Layer** (binary shebang → router dispatch), a **Program Layer** (abstract `Program<T,U>` base class with `configure → parse → validate → interact → execute` lifecycle; one subclass per command), and a **Shared Services Layer** (`integrations.ts`, `update-app.ts`, `install-deps.ts`, `codemods.ts`). All template assets live in a `stubs/` directory co-located with the package output. The router is a plain `Record<string, factory>` map — not a framework — because the command surface is bounded at 9. Commands are lazy-loaded via dynamic import to keep startup fast.

**Major components:**
1. `core.ts` — `Program<T,U>` abstract base class; all commands extend this; yargs wiring, CI detection, `isIt()` gate
2. `router.ts` — thin dispatch: prints header, maps `argv[2]` to command factory, handles unrecognized commands
3. `commands/` — one directory per subcommand; nothing outside a command folder imports from inside it except the router
4. `services/` — `integrations.ts` (stubs/ discovery, cached), `update-app.ts` (file merge, explicit `applyViteConfig` param), `install-deps.ts` (foreground + background), `codemods.ts` (oxc + magic-string)
5. `stubs/` — all template assets; resolved via `join(dirname(fileURLToPath(import.meta.url)), 'stubs')` relative to the compiled bundle
6. `create-qwik/` — separate binary entry point (not a subcommand of `qwik`); shares services, not the router

### Critical Pitfalls

1. **`__dirname`-relative asset resolution breaks on extraction** — Place all templates under `stubs/` co-located with the standalone package; resolve via `import.meta.url` relative to the bundle that owns the assets. Establish this in Phase 1 before any command implementation.

2. **`CODE_MOD` build-time global corrupts scaffolding flows** — Replace with an explicit `applyViteConfig: boolean` parameter on `updateApp()`. Callers in `qwik add` pass `true`; callers in `create-qwik` pass `false`. Must be resolved before `updateApp()` is reimplemented.

3. **Package rename ordering: substring prefix corruption** — `@builder.io/qwik` must be replaced LAST (Call 5 of 5) because it is a prefix of the other 3 package names. Encode this constraint as a test. Never parallelize or reorder the replacement calls.

4. **AST rename scope is file-wide, not binding-scoped** — The oxc-based codemod must scope identifier renames to references semantically bound to the target import binding, not all identifiers matching the text. Require at minimum one collision fixture test before shipping `qwik upgrade`.

5. **`.gitignore` absence causes `.git/` directory corruption** — `visitNotIgnoredFiles` must hard-code exclusions for `.git/` and `node_modules/` regardless of whether a `.gitignore` exists. This is trivial to add but catastrophic to omit.

## Implications for Roadmap

Based on research, the dependency graph from ARCHITECTURE.md (`core.ts` → services → simple commands → asset-dependent commands → complex commands → entry/wiring) directly dictates phase ordering. All 8 extraction blockers must be resolved before any command implementation starts.

### Phase 1: Repository Scaffold and Extraction Blockers

**Rationale:** Seven extraction blockers (EB-01 through EB-07) are documented in OPEN-QUESTIONS.md. If any blocker is deferred, command implementations will embed the same broken patterns and require full rewrites. This is the only phase with hard prerequisites for everything else.
**Delivers:** Working package skeleton with `package.json` (correct `dependencies`/`exports`), `stubs/` directory layout and asset resolution, `CODE_MOD` → `applyViteConfig` refactor, tsdown dual-output build config, Biome config, Japa test runner wired, CI that validates `npm ci --only=production` starts without errors.
**Addresses:** Extraction blockers EB-01 (`__dirname`), EB-03 (`CODE_MOD`), EB-05 (stale starter versions), EB-07 (undeclared deps); jokes cross-package coupling resolved (static array inlined).
**Avoids:** Pitfall 1 (asset path), Pitfall 2 (CODE_MOD), Pitfall 8 (undeclared deps). Must include `npm pack` + isolated install verification before phase is considered done.

### Phase 2: Foundation Layer (core.ts, console.ts, types.ts, router.ts)

**Rationale:** `core.ts` and `console.ts` have no internal dependencies — they are unblocked day one after Phase 1 completes. All 9 command implementations depend on the `Program<T,U>` base class. The router is needed before any command can be invoked end-to-end. Building these first creates a working binary that responds to unrecognized commands correctly.
**Delivers:** `Program<T,U>` abstract base class with full `configure → parse → validate → interact → execute` lifecycle; `console.ts` clack wrappers; `types.ts` shared types (eliminates cross-package type coupling); `router.ts` dispatch map with unrecognized command error format; binary entry points (`bin/qwik.ts`); `printHeader` ASCII logo; exit code contract wired.
**Addresses:** Binary entry point, `getArg()` flag parsing, unrecognized command handling, `bye()`/`panic()` helpers.
**Avoids:** Anti-Pattern 1 (flat function per command); establishes the `isIt()` gate that all commands rely on.

### Phase 3: Simple Commands (version, joke, check-client)

**Rationale:** These three commands depend only on `core.ts` and `console.ts` — no services, no stubs/. Implementing them validates the Program lifecycle before adding service complexity. `version` requires build-time `QWIK_VERSION` injection via tsdown `define`, which should be verified early. `check-client` is non-interactive and validates the `process.exitCode = 1` non-throw pattern.
**Delivers:** `qwik version` (bare semver output, build-time injection via tsdown define), `qwik joke` (static jokes array, cross-package coupling eliminated), `qwik check-client` (3-branch decision tree, q-manifest.json mtime comparison, silent success, non-interactive).
**Addresses:** VER-01, JOKE-01, CHK-01/02/03 parity test scenarios.
**Avoids:** Pitfall: `qwik version` output format — must be bare semver, no label; IDE extensions parse this output. Verify with golden test `/^\d+\.\d+\.\d+$/`.

### Phase 4: Shared Services (integrations.ts, install-deps.ts, update-app.ts)

**Rationale:** The three service modules are prerequisites for `qwik add`, `qwik build`, and `create-qwik`. Building services in isolation (with unit tests against the stubs/ asset layout) is safer than building them entangled with command logic. This is also when the `applyViteConfig` explicit parameter is tested in isolation before being used in multiple commands.
**Delivers:** `loadIntegrations()` with stubs/ discovery and per-process cache, `installDeps()` and `backgroundInstallDeps()` with `panam` abstraction, `updateApp()` with explicit `applyViteConfig` parameter, `mergeIntegrationDir()` file operations.
**Addresses:** Feature dependencies for `add`, `new`, `create-qwik`.
**Avoids:** Pitfall 2 (CODE_MOD); unit test `updateApp({ applyViteConfig: false })` and assert `updateViteConfigs` is not invoked.

### Phase 5: Asset-Dependent Commands (new, add, build)

**Rationale:** These three commands depend on the services from Phase 4 and the stubs/ layout from Phase 1. `qwik new` (template loading) and `qwik add` (integration selection + file writes + install) together represent the bulk of the interactive scaffolding surface. `qwik build` is the parallel orchestration engine used in every CI pipeline. All three have high user value and documented MUST PRESERVE behaviors.
**Delivers:** `qwik new` (route/component/markdown/mdx generation, slug+PascalCase transforms, duplicate guard, recursive mkdir, path inference), `qwik add` (integration selection, user consent gate, file writes, `installDeps`, `postInstall` hook, `--skipConfirmation` flag), `qwik build` + `qwik build preview` (parallel script execution, `build.client` sequential guarantee, `prebuild.*`/`postbuild.*` hooks, `--mode` forwarding).
**Addresses:** ADD-01/02/03, BUILD-01/02/03/04, NEW-01/02/03/04/05 parity test scenarios.
**Avoids:** `stubs/` must be in `package.json` `files` field — verify with `npm pack` tarball inspection.

### Phase 6: qwik upgrade / migrate-v2

**Rationale:** This is the highest-complexity command with the most pitfalls. It requires oxc-parser codemod implementation (binding-scoped identifier rename), exact substring ordering in package text replacement, `.gitignore`-respected file traversal with hard-coded `.git/` exclusion, npm dist-tag version lookup, and full replacement of the ts-morph transient install pattern. Implementing this after all other commands ensures the oxc-parser integration is well-understood before applying it to user projects.
**Delivers:** `qwik upgrade` (renamed from `migrate-v2` with alias preserved), 5-step migration sequence in exact order, oxc-parser + magic-string import rename (binding-scoped), 5-call text replacement in dependency order (CRITICAL: `@builder.io/qwik` last), `visitNotIgnoredFiles` with `.git/` + `node_modules/` hard exclusion, npm dist-tag version resolution, `installDeps` with detected PM (never hardcoded), `migrate-v2` alias routing.
**Addresses:** MIG-01/02/03/04/05 parity test scenarios; OQ-06 (global rename scope), OQ-07 (gitignore absence).
**Avoids:** Pitfall 3 (AST rename scope), Pitfall 4 (substring ordering), Pitfall 5 (ts-morph lifecycle), Pitfall 6 (.git/ corruption). MUST include: collision fixture test, wrong-order test, no-.gitignore test.

### Phase 7: create-qwik Scaffolding

**Rationale:** `create-qwik` is a separate binary entry point (not a `qwik` subcommand) with its own interactive flow, background install pattern, and git init sequence. It depends on all services but has distinct behavior (notably `applyViteConfig: false`). Runtime version injection for starter template `package.json` (EB-05) must be resolved here.
**Delivers:** `create-qwik` binary, `CreateQwikProgram extends Program`, interactive project scaffold flow (directory prompt, background install, starter selection, git init), `backgroundInstallDeps` with joke during wait, runtime `@qwik.dev/core` version injection into generated `package.json`.
**Addresses:** Pitfall 7 (stale starter versions — EB-05); integration test must verify scaffolded `package.json` version matches installed `@qwik.dev/core` version.
**Avoids:** `applyViteConfig: false` must be verified in integration test (Pitfall 2 second call site).

### Phase 8: Parity Validation and Polish

**Rationale:** Before the package is published, the 25 golden-path parity test scenarios must all pass, the full behavioral contract must be verified in isolation, and publishing configuration must be correct.
**Delivers:** All 25 Japa parity tests passing (ADD-01/02/03, BUILD-01/02/03/04, NEW-01/02/03/04/05, MIG-01/02/03/04/05, CHK-01/02/03, VER-01, JOKE-01); `qwik --version` flag dual support (OQ-04); `qwik upgrade` in help output (OQ-05); `package.json` `exports` with `import`/`require` conditions; `files` field verified with `npm pack`; CI pipeline for clean install validation.
**Addresses:** All remaining COMPATIBILITY-CONTRACT.md MUST PRESERVE items; P2 features from feature matrix.

### Phase Ordering Rationale

- Phases 1-2 are non-negotiable prerequisites: extraction blockers and the base class must exist before any command
- Phase 3 (simple commands) validates the Program lifecycle with minimal risk before services are added
- Phase 4 (services) must precede Phases 5-7 because all commands with file I/O depend on them
- Phase 6 (migrate) is deliberately last among commands because it has the most pitfalls and depends on oxc-parser being well-understood
- Phase 7 (create-qwik) is separate from Phase 5 because it is a different binary with different call site behavior
- Phase 8 closes the parity loop; nothing ships until tests pass

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 6 (qwik upgrade):** Binding-scoped identifier rename with oxc-parser is documented as an open question (OQ-06); the exact API for scope walk is not verified. Also: behavior of `visitNotIgnoredFiles` with `.gitignore` absence (OQ-07) needs a definitive implementation decision.
- **Phase 7 (create-qwik):** Runtime version injection for starter templates (EB-05) requires a confirmed approach — `require('@qwik.dev/core/package.json').version` vs peer dependency resolution in ESM context.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Package scaffold patterns are well-documented; extraction blockers are fully specified in OPEN-QUESTIONS.md
- **Phase 2:** `Program<T,U>` pattern is directly copyable from create-qwikdev-astro reference
- **Phase 3:** All three commands are non-interactive or trivially interactive; patterns fully specified in spec docs
- **Phase 4:** Service signatures and responsibilities are fully specified in COUPLING-REPORT.md and CMD-PROMPTS-AND-EFFECTS.md
- **Phase 5:** MUST PRESERVE behaviors fully specified; implementation follows established patterns
- **Phase 8:** Testing patterns and publishing config are standard

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against reference `package.json`; official docs consulted for breaking changes |
| Features | HIGH | Grounded in 5 spec documents with 67 classified MUST PRESERVE behaviors; source-verified at commit `bfe19e8d9` |
| Architecture | HIGH | Reference implementation source read directly from QwikDev/astro repo; all spec files verified |
| Pitfalls | HIGH | All critical pitfalls sourced directly from verified spec documents; supplemented with ecosystem research |

**Overall confidence:** HIGH

### Gaps to Address

- **OQ-06 (oxc-parser binding-scoped rename):** The exact API for scope-aware identifier rename in oxc-parser's ESTree output is not documented with examples. Will need a research spike or prototype during Phase 6 planning to confirm the implementation approach before writing the codemod.

- **OQ-07 (visitNotIgnoredFiles symlink handling):** The spec flags symlink traversal as a potential infinite loop risk but does not specify the exact fix. Phase 6 planning should decide: `lstat` + skip, or explicit depth limit.

- **EB-05 (runtime version injection for starters):** Two candidate approaches exist (read from installed `@qwik.dev/core/package.json` vs peer resolution). The correct approach in an ESM context with a bundled output requires validation — standard `require()` of a package.json file has module resolution nuances in ESM. Confirm approach during Phase 7 planning.

- **OQ-02 (process.cwd() vs rootDir in migrate-v2):** Currently using `process.cwd()` for consistency with existing behavior. This is a known limitation for pnpm workspace monorepos. Acceptable for v1 parity; flag for investigation in v2.

- **OQ-04 (`qwik --version` flag):** Confirmed as P2 feature; implementation is LOW complexity but requires yargs v18 explicit option registration. Can be added in Phase 8 without rework.

## Sources

### Primary (HIGH confidence)
- `create-qwikdev-astro` reference (`libs/create-qwikdev-astro/package.json`, `src/app.ts`, `src/core.ts`) — version pins, Program lifecycle, panam API surface
- `specs/CMD-INVENTORY.md` — 9-command surface, flags, dispatch logic (commit `bfe19e8d9`)
- `specs/CMD-PROMPTS-AND-EFFECTS.md` — every prompt, file write, install, process mutation per command
- `specs/COMPATIBILITY-CONTRACT.md` — 67 MUST PRESERVE behaviors + MAY CHANGE + ALIAS REQUIRED classifications
- `specs/PARITY-TEST-PLAN.md` — 25 golden-path scenarios, 8 fixture projects
- `specs/COUPLING-REPORT.md` — 7 extraction blockers, CODE_MOD, __dirname coupling
- `specs/MIG-MUTATION-RULES.md` — AST rename and package substitution rules with ordering constraints
- `specs/MIG-DEPS-AND-UPGRADE.md` — ts-morph lifecycle, dist-tag resolution
- `specs/ASSET-INVENTORY.md` — stubs/ layout, loadIntegrations() flow
- `specs/OPEN-QUESTIONS.md` — 7 open questions and 7 extraction blockers
- `.planning/PROJECT.md` — stack decisions, constraints, out-of-scope items
- tsdown official docs (https://tsdown.dev) — dual output config, Node.js requirements
- Biome blog (https://biomejs.dev/blog/) — v2 breaking changes
- japa/runner GitHub releases — v5 breaking change (fast-glob removal)
- yargs GitHub release v18.0.0 — breaking changes documented

### Secondary (MEDIUM confidence)
- [Command Line Interface Guidelines](https://clig.dev/) — exit code 0 on cancel (user choice ≠ error)
- [TypeScript in 2025 with ESM and CJS npm publishing — Liran Tal](https://lirantal.com/blog/typescript-in-2025-with-esm-and-cjs-npm-publishing) — dual build pitfalls
- [Dual publish ESM and CJS with tsdown — DEV Community](https://dev.to/hacksore/dual-publish-esm-and-cjs-with-tsdown-2l75) — tsdown packaging gotchas
- [AST-based refactoring with ts-morph — kimmo.blog](https://kimmo.blog/posts/8-ast-based-refactoring-with-ts-morph/) — identifier rename scope risks
- [Refactoring with Codemods — martinfowler.com](https://martinfowler.com/articles/codemods-api-refactoring.html) — naming conflict handling

---
*Research completed: 2026-04-01*
*Ready for roadmap: yes*
