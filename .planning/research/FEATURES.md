# Feature Research

**Domain:** CLI Scaffolding and Build Orchestration Tool (Qwik CLI reimplementation)
**Researched:** 2026-04-01 (v1.0) · Updated 2026-04-02 (v1.1 milestone)
**Confidence:** HIGH — grounded in 5 spec documents with 67 classified MUST PRESERVE behaviors + direct source inspection of Qwik repo `packages/create-qwik` and `starters/`

---

## v1.1 Milestone Feature Research

These are the NEW features for the current milestone. The existing v1.0 features (below) are already built.

### What Already Exists (v1.0 — Built)

- 9 CLI commands: add, build, new, joke, version, help, check-client, build preview, upgrade
- Integration loading and consent gate
- AST-based v2 migration (oxc-parser codemods)
- Template file generation with token substitution
- Sequential+parallel build orchestration

### New Features This Milestone (v1.1)

#### Table Stakes for v1.1

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **starters/apps/ populated** (base, empty, playground, library) | `create-qwik` calls `templateManager.getBootstrapApps(appId)` which scans `stubs/apps/`. Empty dir = every call throws `AppNotFoundError`. create-qwik is unusable without this. | LOW | File copy from upstream. base has no `__qwik__` key (invisible foundation layer). empty (priority 1), playground (priority 2), library (priority -1). |
| **starters/adapters/ fully populated** (all 14 adapters) | Current `stubs/adapters/` has only `cloudflare-pages`. `qwik add` with 1 option is functionally broken. | LOW | File copy from upstream. 14 adapters: aws-lambda, azure-swa, bun, cloud-run, cloudflare-pages, cloudflare-workers, deno, express, fastify, firebase, netlify-edge, node-server, ssg, vercel-edge. Each has `package.json` with `__qwik__` key. |
| **starters/features/ fully populated** (all 22 features) | `qwik add` feature list is empty. Without features, add command only shows adapters. | LOW | File copy from upstream. 22 features: auth, bootstrap, builder.io, compiled-i18n, csr, cypress, drizzle, leaflet-map, orama, pandacss, partytown, playwright, postcss, prisma, react, service-worker, storybook, styled-vanilla-extract, tailwind, tailwind-v3, turso, vitest. |
| **Remove top-level `adapters/` folder** | Incorrect artifact from v1.0 that duplicates `stubs/adapters/`. Misleading directory at repo root. | LOW | Delete `/Users/jackshelton/dev/open-source/qwik-cli/adapters/`. Only one `cloudflare-pages` stub is in there. |
| **`migrations/v2/` scoped folder** | Flat `src/migrate/` means future v3 migration files collide with v2 files. Scoped folders (`migrate/v2/`, `migrate/v3/`) are the only non-ambiguous structure for version-chaining. | LOW | Rename `src/migrate/` → `src/migrate/v2/`. Update single import in `src/commands/migrate/index.ts`. Behavioral contract unchanged. |
| **create-qwik non-interactive mode** | CI/scripting usage: `npm create qwik@latest base ./my-app` must work without prompts. Standard for all major scaffolding CLIs (create-vite, create-next-app). | MEDIUM | Args: `<template> <outDir>` positional via yargs. Flags: `--force/-f` (clear existing dir), `--installDeps/-i`. Validates outDir is absolute. StackBlitz detection: writes to cwd when `process.cwd().startsWith('/home/projects/')`. |
| **create-qwik interactive mode** | Primary new-user onboarding path. Users expect guided flow: project name → starter select → dep install → git init. | HIGH | 6-step flow verified from upstream `run-create-interactive-cli.ts`. Background dep install starts after project dir is set (preemptive, before user finishes answering prompts). On cancel: `backgroundInstall.abort()`. Git init: `git init` + `git add -A` + `git commit -m "Initial commit"`. |
| **oxfmt + oxlint replacing Biome** | Project already uses OXC toolchain (oxc-parser). oxfmt is 30x faster than Prettier. oxlint 1.0 stable (VoidZero 2025). Toolchain alignment. | LOW | Remove `@biomejs/biome`. Add `oxlint`, `oxfmt` to devDeps. Delete `biome.json`. Add `.oxlintrc.json`. Update scripts: `"lint": "oxlint src/**/*.ts tests/**/*.ts bin/**/*.ts"`, `"fmt": "oxfmt src tests bin"`, `"fmt:check": "oxfmt --check src tests bin"`. |
| **Zero type errors** | TypeScript strict mode is on. Type errors prevent tsdown from emitting clean output. Must be a gate before any release. | MEDIUM | Unknown count currently. Likely sources: `IntegrationData` shape differences between `load-integrations.ts` and upstream `types.ts`, stale imports after folder renames, missing type annotations on new create-qwik code. Fix last, after all structural changes are done. |
| **Real jokes.json** (30-joke pool) | Current implementation has 10 hardcoded jokes in `jokes.ts`. Visibly thin pool for repeated users. Upstream ships 30 jokes. | LOW | Direct file replacement. Format: `[setup: string, punchline: string][]`. Drop-in for current `JOKES` array. Can ship as `jokes.json` import or inline the array. |

#### Differentiators for v1.1

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **create-qwik with background dep install** | While user answers prompts, deps install in the background. Reduces perceived wait time significantly. | HIGH | Verified in upstream `run-create-interactive-cli.ts`: `backgroundInstallDeps(pkgManager, baseApp)` starts immediately after outDir is set, before starter selection prompt. Requires porting `backgroundInstallDeps` + `backgroundInstall.complete()` pattern from monorepo `install-deps.ts`. |
| **Standalone distribution with all starters bundled** | Works after `npm install @qwik.dev/cli` with no extra steps. Unlike monorepo CLI which resolves from `packages/qwik/dist/`. | MEDIUM | Architecture already in place via `stubs/` + `resolveStubsDir()`. Gap: only 1 of 36 integrations is present. Completion is the differentiator. |
| **upgrade --migrate v1→vN version chaining** | One command chains all intermediate migrations sequentially. Running v1→v4 automatically executes v2, v3, v4 migrations in order without user intervention. | MEDIUM | Not yet built upstream or in qwik-cli. Pattern: detect current version from `package.json` → resolve target → build migration chain → execute sequentially. Requires scoped v2 folder first. Orchestrator lives at `src/migrate/index.ts`. |

#### Anti-Features for v1.1

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Auto-detect Qwik version and skip already-applied migrations** | "Smart" migrations avoid re-running | Version detection is fragile: monorepo layout, locked vs unlocked deps, aliased packages all create false negatives. The confirmation gate + step-level idempotency guards already handle re-runs safely. | Keep confirmation gate. Document that migrations are idempotent at the step level. |
| **Pull starters from git at runtime** | Stays up-to-date without package releases | Requires network, adds latency, creates offline failure mode, breaks reproducibility. Monorepo solved this by bundling at build time. | Bundle starters in `stubs/` at publish time. Gate version sync to package release cycle. |
| **Single flat `migrate/` for all versions** | Simpler tree | When v3 is added, its files sit next to v2 files with no namespace separation. Impossible to test v2 in isolation. | Scoped folders: `migrate/v2/`, `migrate/v3/`. Self-contained per version. |

---

### v1.1 Feature Dependencies

```
create-qwik (non-interactive)
    └──requires──> stubs/apps/ populated (app starters needed for template choices)
    └──requires──> templateManager (loadIntegrations for 'app' type)

create-qwik (interactive)
    └──requires──> create-qwik (non-interactive) [same core createApp() function]
    └──requires──> real jokes pool (30-joke jokes.json for "Wanna hear a joke?" during install)
    └──requires──> backgroundInstallDeps ported from monorepo install-deps.ts

upgrade --migrate chaining (v1→vN)
    └──requires──> migrations/v2/ scoped folder [must be isolated before chaining exists]
    └──requires──> version detection from package.json

oxfmt + oxlint
    └──replaces──> Biome (biome.json deleted, @biomejs/biome removed)
    └──requires──> .oxlintrc.json config file
    └──requires──> package.json scripts updated

zero type errors
    └──requires──> stubs/apps/ populated (IntegrationData types must match real starters)
    └──requires──> migrations/v2/ scoped folder (no stale import paths after rename)
    └──requires──> all structural changes complete (audit last)
```

**Dependency Notes:**

- **stubs/apps/ before create-qwik:** `templateManager.getBootstrapApps(appId)` throws `AppNotFoundError` with an empty dir. Apps must be in place before any create-qwik test can pass.
- **migrations/v2/ before upgrade chaining:** The chaining orchestrator imports `runV2Migration` from a path. Scoped folder rename must happen first, once, cleanly.
- **jokes expand independently:** Drop-in file replacement. No structural dependency. Can be done in any order.
- **oxfmt+oxlint is a clean swap:** No functional code changes required. Remove Biome, add oxfmt+oxlint, replace config, update scripts. Zero risk to behavior.
- **type error audit is last:** Structural changes (folder renames, new files, new create-qwik code) are the most likely source of type errors. Audit after everything else is in place.

---

### v1.1 Starters Folder Reference

**Discovered from:** `starters/` in Qwik repo (`build/v2` branch, commit `bfe19e8d9`) and `specs/ASSET-INVENTORY.md`.

```
stubs/                         # (already correct location in qwik-cli)
  apps/                        # For create-qwik only
    base/                      # No __qwik__ key — invisible foundation layer
    empty/                     # priority: 1
    playground/                # priority: 2
    library/                   # priority: -1; self-contained bootstrap (no base merge)
  adapters/                    # For qwik add only (14 total)
    cloudflare-pages/          # priority: 40 (already present)
    cloudflare-workers/        # priority: 40
    aws-lambda/                # priority: 30
    azure-swa/                 # priority: 30
    firebase/                  # priority: 30
    netlify-edge/              # priority: 30
    vercel-edge/               # priority: 30
    bun/                       # priority: 20
    cloud-run/                 # priority: 20
    deno/                      # priority: 20
    express/                   # priority: 20
    fastify/                   # priority: 20
    node-server/               # priority: 19
    ssg/                       # priority: 10
  features/                    # For qwik add only (22 total)
    service-worker/            # priority: 10
    vitest/                    # priority: -15
    react/                     # priority: -20
    [19 others at priority -10]
  templates/                   # For qwik new only
    qwik/
      component/
      route/
      mdx/
      markdown/
```

**`__qwik__` metadata pattern** (required in every integration's `package.json`):
```json
{
  "__qwik__": {
    "displayName": "Adapter: Cloudflare Pages",
    "priority": 40,
    "docs": ["https://..."],
    "nextSteps": { "title": "...", "lines": ["..."] }
  }
}
```

`loadIntegrations()` silently skips any directory missing the `__qwik__` key. Priority controls sort order in `qwik add` selection menus.

---

### v1.1 create-qwik Interactive Flow (6 Steps, Verified from Source)

Source: `packages/create-qwik/src/helpers/run-create-interactive-cli.ts` (build/v2 branch)

1. **intro()** — "Let's create a Qwik App" with version string
2. **text()** — "Where would you like to create your new project?" — placeholder `./qwik-app`; background dep install starts here (before user finishes)
3. **select()** — "Directory already exists" conflict resolution (only shown if needed): "exit" | "replace"
4. **select()** — "Select a starter" — shows all non-base app starters sorted by priority; description as hint
5. **confirm()** — "Would you like to install dependencies?" — default true
6. **confirm()** — "Initialize a new git repository?" — default true
7. [If install still running] **confirm()** — "Finishing the install. Wanna hear a joke?" → `note()` with joke
8. Create app files (spinner)
9. Git init: `git init` + `git add -A` + `git commit -m "Initial commit ⚡️"` (spinner)
10. Wait for dep install to complete
11. `logAppCreated()` — success message with `cd`, `start`, `qwik add` next steps

---

### v1.1 oxfmt + oxlint Replacement Details

**Current:** `biome.json` (Biome 2.x). Scripts: `"lint": "biome check ."`, `"format": "biome format --write ."`. DevDep: `"@biomejs/biome": "^2.0.0"`.

**Target config (`.oxlintrc.json`):**
```json
{
  "env": { "node": true },
  "ignorePatterns": ["dist/", "node_modules/"],
  "rules": {}
}
```

**Target scripts:**
```json
"lint": "oxlint src/**/*.ts tests/**/*.ts bin/**/*.ts",
"fmt": "oxfmt src tests bin",
"fmt:check": "oxfmt --check src tests bin"
```

**Install:**
```bash
pnpm remove @biomejs/biome
pnpm add -D oxlint oxfmt
```

**Delete:** `biome.json`

oxfmt reads config from `oxfmt.json` or `oxfmt.config.ts` if custom options needed. `oxfmt --init` bootstraps it. oxlint reads `.oxlintrc.json` or `.oxlintrc.jsonc` by default. Both handle TypeScript natively.

---

## v1.0 Feature Landscape (Already Built)

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **9-command binary surface** (`add`, `build`, `build preview`, `new`, `joke`, `migrate-v2`, `check-client`, `help`, `version`) | The existing Qwik CLI has these; users already have them in docs, scripts, and CI | MEDIUM | Every command must be reachable via the same invocation; see CMD-INVENTORY.md |
| **Non-interactive flag mode for `add`** (`--skipConfirmation=true`, `--projectDir=<path>`) | CI pipelines hard-code these flags; any missing flag silently breaks automation | LOW | Both `--flag value` and `--flag=value` forms MUST be preserved per COMPATIBILITY-CONTRACT.md |
| **Exit code contract** (0 on success/cancel, 1 on error/build failure) | Every CI system checks exit codes; broken codes break deploys silently | LOW | User cancel = exit 0 (deliberate); build script failure sets `process.exitCode = 1` (non-throw) |
| **`build.client` sequential guarantee** (runs before parallel phase) | Build pipelines depend on this ordering; client must compile before server references it | MEDIUM | Spec-driven requirement; violating breaks any build.server that imports client-generated artifacts |
| **`prebuild.*` / `postbuild.*` lifecycle hooks** | Users who define these hooks expect them to fire; missing them silently skips user-defined steps | LOW | Discovered from `package.json` scripts block; run sequentially around parallel phase |
| **`--mode` flag forwarding** to build scripts | Users pass `--mode production`, `--mode staging`; without forwarding, their build tooling gets wrong mode | LOW | Forwarded to `build.client`, `build.lib`, `build.preview`, `build.server` only |
| **`qwik new` route/component file generation** with `[slug]`/`[name]` token substitution | Any scaffolding CLI must generate files; tokens are how templates stay generic | MEDIUM | Path inference: leading `/` = route in `src/routes/`; no `/` = component in `src/components/` |
| **Duplicate file guard** in `qwik new` | Users expect protection against accidental overwrites; no guard = data loss risk | LOW | Error message format is MUST PRESERVE: `"${filename}" already exists in "${outDir}"` |
| **Interactive `@clack/prompts` UX** | Modern CLIs use structured interactive flows; users expect guided prompts | MEDIUM | `add`, `new`, `migrate-v2`, `help` all have interactive paths |
| **Package manager auto-detection** with `pnpm` fallback | Multi-PM ecosystem; hardcoding any single PM breaks 75%+ of users | LOW | `which-pm-runs` with `pnpm` fallback |
| **`qwik migrate-v2` 5-step migration sequence** | One-time migration; any ordering deviation corrupts package.json or leaves stale imports | HIGH | `@builder.io/qwik` replacement MUST run last — it is a substring of the other 3 package names |
| **`check-client` 3-branch decision tree** | Used in git hooks and CI; silent success is a contract | MEDIUM | `dist/q-manifest.json` mtime is the agreed cache key |
| **`qwik version` bare semver output** | IDE extensions and tooling parse this; any label prefix would break all parsers | LOW | Output must be exactly the semver string, nothing else |
| **`stubs/` template directory resolution** | `__dirname`-relative loading in monorepo breaks when extracted | MEDIUM | Extraction blocker resolved with `stubs/` pattern from `create-qwikdev-astro` |
| **`qwik add` integration file writes + dependency install** | Core value of the add command | HIGH | postInstall hook execution via `integration.pkgJson.__qwik__.postInstall` is MUST PRESERVE |
| **Unrecognized command handling** | Users expect helpful error on mistyped commands | LOW | Exact error format: `red("Unrecognized qwik command: ${app.task}")` + help + exit 1 |
| **`migrate-v2` alias as `upgrade`** | Existing docs/scripts hard-code `qwik migrate-v2` | LOW | ALIAS REQUIRED per COMPATIBILITY-CONTRACT.md |

### Differentiators (v1.0)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AST-based codemods via `oxc-parser` + `magic-string`** | Faster, lighter-weight than ts-morph; compile-time dep vs runtime-installed | MEDIUM | Key decision in PROJECT.md |
| **`Program` base class lifecycle** (`parse → validate → interact → execute`) | Structured command lifecycle; prevents ad-hoc spaghetti | MEDIUM | Adopted from create-qwikdev-astro |
| **`tsdown` dual ESM+CJS output** | Consumers using either module system get native support | LOW | Already decided in PROJECT.md |
| **Japa test suite with 25 golden-path parity scenarios** | ~5% existing coverage in monorepo CLI; 25 scenarios = high reimplementation confidence | HIGH | Japa matches reference impl |
| **Standalone npm package** with own release cycle | Decoupled from Qwik framework releases | MEDIUM | Primary value of extraction |

### Anti-Features (v1.0)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Short flag support** (`-n`, `-v`, `-s`) | Feels ergonomic | Adds ambiguity without solving a real problem; existing surface works in CI | Keep all flags long-form only |
| **New commands beyond the 9-command surface** | Innovation is tempting | Out of scope per PROJECT.md until parity is proven | Parity first, innovation later |
| **GUI or web-based interface** | Some users prefer browser-based configuration | Entirely out of scope per PROJECT.md | Terminal CLI only |
| **Uncommenting `updateConfigurations()` in migrate-v2** | Looks like unfinished work | Commented out deliberately; PR #7159 fixed the issue | Open Question §3 requires investigation before reconsidering |
| **Changing migrate-v2 to use `app.rootDir`** | More consistent with other commands | INVESTIGATE item; changing without testing in monorepo scenarios risks silent breakage | Leave as `process.cwd()`; document the distinction |

---

## Feature Dependencies (Full)

```
[v1.0 — Already Built]

[Binary Entry Point: runCli() + AppCommand]
    └──requires──> [Flag Parsing: getArg() with --flag=value and --flag value forms]
    └──requires──> [Package Manager Detection: which-pm-runs + pnpm fallback]

[qwik add]
    └──requires──> [loadIntegrations() from stubs/ directory]
    └──requires──> [updateApp() + mergeIntegrationDir() file operations]
    └──requires──> [installDeps() via detected PM]
    └──requires──> [postInstall hook execution]
    └──requires──> [User consent gate]

[qwik build / build preview]
    └──requires──> [package.json script discovery]
    └──requires──> [prebuild.* / postbuild.* hook discovery]
    └──requires──> [Parallel script execution engine]
    └──requires──> [--mode forwarding]
    └──requires──> [process.exitCode = 1 non-throw error handling]

[qwik new]
    └──requires──> [stubs/ template directory]
    └──requires──> [parseInputName() slug + PascalCase transformation]
    └──requires──> [Path inference: leading / = route; no / = component]
    └──requires──> [Duplicate file guard]

[qwik migrate-v2]
    └──requires──> [AST import renaming (3 rounds, 8 mappings)]
    └──requires──> [Text-replacement replacePackage() × 5 in exact order]
    └──requires──> [npm dist-tag version resolution]
    └──requires──> [gitignore-respected file traversal]
    └──requires──> [Binary file detection skip]

[v1.1 — New This Milestone]

[create-qwik (non-interactive)]
    └──requires──> [stubs/apps/ populated]
    └──requires──> [templateManager for 'app' type]

[create-qwik (interactive)]
    └──requires──> [create-qwik (non-interactive)]
    └──requires──> [30-joke pool]
    └──requires──> [backgroundInstallDeps ported from monorepo]

[upgrade --migrate chaining]
    └──requires──> [migrations/v2/ scoped folder]
    └──requires──> [version detection from package.json]

[zero type errors]
    └──requires──> [all structural changes complete]
    └──requires──> [stubs/apps/ populated]
    └──requires──> [migrations/v2/ scoped folder]
```

---

## MVP Definition

### Launch With (v1.1)

All items below must ship together to make the milestone coherent.

- [ ] **stubs/apps/ populated** (base, empty, playground, library) — gates create-qwik
- [ ] **stubs/adapters/ fully populated** (all 14 adapters) — gates functional `qwik add`
- [ ] **stubs/features/ fully populated** (all 22 features) — gates functional `qwik add`
- [ ] **Remove top-level `adapters/` folder** — incorrect artifact
- [ ] **migrations/v2/ scoped folder** (rename + update imports) — enables version chaining
- [ ] **create-qwik non-interactive** (yargs positional args, --force, --installDeps)
- [ ] **create-qwik interactive** (6-step flow, background install, git init, joke integration)
- [ ] **Real jokes.json** (30 jokes)
- [ ] **oxfmt + oxlint replacing Biome** (config swap, devDep swap, scripts update)
- [ ] **Zero type errors** (audit after all structural changes)

### Add After Validation (v1.x)

- [ ] **upgrade --migrate chaining orchestrator** — plumbing for v1→vN; needs v3 to fully validate
- [ ] **starters version sync at publish time** — pin actual released versions instead of `"latest"`

### Future Consideration (v2+)

- [ ] **v3 migration** — when Qwik v3 ships, add `src/migrate/v3/` and chain it
- [ ] **Template updates from upstream** — automated process to sync starters at release time
- [ ] **`qwik --version` flag dual support** — low complexity, low urgency
- [ ] **`updateConfigurations()` re-evaluation** — after investigating PR #7159 edge cases

---

## Feature Prioritization Matrix (v1.1)

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| stubs/apps/ populated | HIGH (blocks create-qwik) | LOW (file copy) | P1 |
| stubs/adapters/ populated (14) | HIGH (qwik add is hollow) | LOW (file copy) | P1 |
| stubs/features/ populated (22) | HIGH (qwik add is hollow) | LOW (file copy) | P1 |
| Remove top-level adapters/ folder | MEDIUM (confusing artifact) | LOW (delete) | P1 |
| migrations/v2/ scoped folder | MEDIUM (structural prereq) | LOW (rename + update imports) | P1 |
| create-qwik non-interactive | HIGH (CI/scripting) | MEDIUM (yargs wiring, template bootstrap) | P1 |
| create-qwik interactive | HIGH (primary onboarding) | HIGH (6-step flow, background install, git init) | P1 |
| Real jokes.json (30 jokes) | LOW (polish) | LOW (file replacement) | P2 |
| oxfmt + oxlint replacing Biome | MEDIUM (toolchain alignment) | LOW (config swap) | P1 |
| Zero type errors | HIGH (compile correctness) | MEDIUM (audit + fix) | P1 |
| upgrade --migrate chaining | MEDIUM (v1→vN) | MEDIUM (orchestrator) | P2 |

---

## Sources

- `/Users/jackshelton/dev/open-source/qwik/packages/create-qwik/src/run-create-cli.ts` — non-interactive create-qwik entry point (HIGH — direct source inspection)
- `/Users/jackshelton/dev/open-source/qwik/packages/create-qwik/src/run-create-interactive-cli.ts` — interactive flow (HIGH — direct source inspection)
- `/Users/jackshelton/dev/open-source/qwik/packages/create-qwik/src/helpers/templateManager.ts` — integration loading for app starters (HIGH — direct source inspection)
- `/Users/jackshelton/dev/open-source/qwik/packages/create-qwik/src/helpers/jokes.json` — 30-joke upstream pool (HIGH — verified, 64 lines)
- `/Users/jackshelton/dev/open-source/qwik/packages/qwik/src/cli/utils/integrations.ts` — `loadIntegrations()` discovery flow (HIGH — direct source inspection)
- `/Users/jackshelton/dev/open-source/qwik-cli/specs/ASSET-INVENTORY.md` — full starters catalog: 14 adapters, 22 features, 4 app starters (HIGH — verified against build/v2 branch bfe19e8d9)
- `/Users/jackshelton/dev/open-source/qwik-cli/specs/MIG-WORKFLOW.md` — migration step-by-step behavioral spec (HIGH — verified)
- `/Users/jackshelton/dev/open-source/qwik-cli/src/integrations/load-integrations.ts` — current standalone integration loader (HIGH — direct source inspection)
- `/Users/jackshelton/dev/open-source/qwik-cli/src/migrate/run-migration.ts` — current migration (HIGH — already adapted to oxc-parser, in flat `migrate/` not `migrate/v2/`)
- [Oxfmt Beta announcement](https://oxc.rs/blog/2026-02-24-oxfmt-beta) — install, config, CLI commands (HIGH — official OXC blog)
- [Oxlint configuration reference](https://oxc.rs/docs/guide/usage/linter/config) — `.oxlintrc.json` format (HIGH — official docs)
- [Oxlint JS Plugins Alpha](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha) — current ecosystem status (HIGH — official OXC blog)
- `specs/COMPATIBILITY-CONTRACT.md` — 67 MUST PRESERVE behaviors (HIGH — authoritative parity spec)
- `specs/CMD-INVENTORY.md`, `specs/CMD-PROMPTS-AND-EFFECTS.md` — full command surface behavioral spec (HIGH — derived from source inspection)

---

*Feature research for: @qwik.dev/cli — CLI Scaffolding and Build Orchestration (Qwik CLI reimplementation)*
*v1.0 researched: 2026-04-01 | v1.1 milestone updated: 2026-04-02*
