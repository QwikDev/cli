# Feature Research

**Domain:** CLI Scaffolding and Build Orchestration Tool (Qwik CLI reimplementation)
**Researched:** 2026-04-01
**Confidence:** HIGH — grounded in 5 spec documents with 67 classified MUST PRESERVE behaviors

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or breaks existing workflows.
These are derived from the COMPATIBILITY-CONTRACT.md MUST PRESERVE classifications and from
standard expectations for any modern CLI tool in this category.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **9-command binary surface** (`add`, `build`, `build preview`, `new`, `joke`, `migrate-v2`, `check-client`, `help`, `version`) | The existing Qwik CLI has these; users already have them in docs, scripts, and CI | MEDIUM | Every command must be reachable via the same invocation; see CMD-INVENTORY.md |
| **Non-interactive flag mode for `add`** (`--skipConfirmation=true`, `--projectDir=<path>`) | CI pipelines hard-code these flags; any missing flag silently breaks automation | LOW | Both `--flag value` and `--flag=value` forms MUST be preserved per COMPATIBILITY-CONTRACT.md |
| **Exit code contract** (0 on success/cancel, 1 on error/build failure) | Every CI system checks exit codes; broken codes break deploys silently | LOW | User cancel = exit 0 (deliberate); build script failure sets `process.exitCode = 1` (non-throw) |
| **`build.client` sequential guarantee** (runs before parallel phase) | Build pipelines depend on this ordering; client must compile before server references it | MEDIUM | Spec-driven requirement; violating breaks any build.server that imports client-generated artifacts |
| **`prebuild.*` / `postbuild.*` lifecycle hooks** | Users who define these hooks expect them to fire; missing them silently skips user-defined steps | LOW | Discovered from `package.json` scripts block; run sequentially around parallel phase |
| **`--mode` flag forwarding** to build scripts | Users pass `--mode production`, `--mode staging`; without forwarding, their build tooling gets wrong mode | LOW | Forwarded to `build.client`, `build.lib`, `build.preview`, `build.server` only — NOT to `build.preview` in non-preview builds |
| **`qwik new` route/component file generation** with `[slug]`/`[name]` token substitution | Any scaffolding CLI must generate files; tokens are how templates stay generic | MEDIUM | Path inference: leading `/` = route in `src/routes/`; no `/` = component in `src/components/` |
| **Duplicate file guard** in `qwik new` | Users expect protection against accidental overwrites; no guard = data loss risk | LOW | Error message format is MUST PRESERVE: `"${filename}" already exists in "${outDir}"` |
| **Interactive `@clack/prompts` UX** for commands that accept interactive input | Modern CLIs use structured interactive flows, not raw `readline`; users expect guided prompts | MEDIUM | `add`, `new`, `migrate-v2`, `help` all have interactive paths; `build`, `check-client`, `version`, `joke` are non-interactive |
| **Package manager auto-detection** with `pnpm` fallback | Multi-PM ecosystem (npm/yarn/pnpm/bun); hardcoding any single PM breaks 75%+ of users | LOW | `which-pm-runs` with `pnpm` fallback; `npm run` special case for help output |
| **`qwik migrate-v2` 5-step migration sequence** with correct ordering | One-time migration; any ordering deviation corrupts package.json or leaves stale imports | HIGH | `@builder.io/qwik` replacement MUST run last — it is a substring of the other 3 package names |
| **`check-client` 3-branch decision tree** (no-dist → build; no-manifest → build; stale-src → build; else no-op) | Used in git hooks and CI; must remain fully non-interactive; silent success is a contract | MEDIUM | `dist/q-manifest.json` mtime is the agreed cache key; cannot be changed without breaking consumers |
| **`qwik version` bare semver output** (one line, no label prefix) | IDE extensions and tooling parse this; `qwik version: 2.0.0` would break all parsers | LOW | Output must be exactly the semver string (e.g. `2.0.0`), nothing else |
| **`stubs/` template directory resolution** (no `__dirname` hacks) | `__dirname` is a monorepo artifact; standalone package needs explicit asset resolution | MEDIUM | Extraction blocker in the current codebase; `stubs/` pattern from `create-qwikdev-astro` solves this |
| **`qwik add` integration file writes + dependency install** | Core value of the add command; without file commits and `installDeps()`, integrations are not applied | HIGH | postInstall hook execution via `integration.pkgJson.__qwik__.postInstall` is MUST PRESERVE |
| **Unrecognized command handling** (red error + print help + exit 1) | Standard CLI UX; users expect a helpful error when they mistype a command | LOW | Exact error format: `red("Unrecognized qwik command: ${app.task}")` + help + exit 1 |
| **`migrate-v2` alias as `upgrade`** (or at minimum `migrate-v2` still works) | Existing docs, scripts, CI workflows have `qwik migrate-v2` hard-coded; rename without alias = breakage | LOW | ALIAS REQUIRED per COMPATIBILITY-CONTRACT.md; old invocation must continue to route correctly |

### Differentiators (Competitive Advantage)

Features that are not expected by default but provide meaningful value over the existing implementation.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AST-based codemods via `oxc-parser` + `magic-string`** (replacing `ts-morph`) | Faster, lighter-weight than ts-morph; ts-morph is a runtime-installed temp dependency in migrate-v2 today — oxc is a compile-time dep | MEDIUM | Confirmed in PROJECT.md as a key decision; oxc-parser is the reference impl pattern from create-qwikdev-astro |
| **`Program` base class lifecycle** (`parse → validate → interact → execute`) | Structured command lifecycle prevents ad-hoc spaghetti in each command handler; makes new commands consistent | MEDIUM | Adopted from create-qwikdev-astro; provides single-responsibility separation between arg parsing and execution |
| **`tsdown` dual ESM+CJS output** | Consumers using either module system get native support without wrapper hacks | LOW | Already decided in PROJECT.md; differentiator vs the current monorepo's single-output build |
| **Japa test suite encoding 25 golden-path parity scenarios** | Most competing CLI tools have ~5% behavioral coverage (the existing Qwik CLI is at 5%); 25 parity scenarios gives high confidence on reimplementation | HIGH | Japa matches create-qwikdev-astro reference impl; scenarios are fully spec'd in PARITY-TEST-PLAN.md |
| **Standalone npm package** (`@qwik.dev/cli`) with own release cycle | Decoupled from Qwik framework releases; CLI fixes ship immediately without waiting for framework release train | MEDIUM | Extraction from monorepo is itself the primary value; must solve 7 extraction blockers documented in OPEN-QUESTIONS.md |
| **`qwik upgrade` rename with `migrate-v2` alias** (if v3 migration added) | Surfacing the migration command in help increases discoverability; users hitting upgrade issues will find it | LOW | Currently `showInHelp: false`; renaming to `upgrade` and showing it in help is explicitly recommended in COMPATIBILITY-CONTRACT.md §Open Questions §5 |
| **`qwik version` + `qwik --version` dual support** | Both invocations work; tooling using either convention gets correct output | LOW | Open Question §4 in COMPATIBILITY-CONTRACT.md; supporting both is LOW complexity and HIGH value |
| **Static jokes array in `cli/joke/jokes.ts`** (resolving cross-package coupling) | Removing the `create-qwik/src/helpers/jokes` import coupling makes the package truly standalone | LOW | Recommended in COMPATIBILITY-CONTRACT.md §Open Questions §1; jokes data is static strings — trivial to inline |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Short flag support** (`-n`, `-v`, `-s`) | Feels ergonomic for power users | The current CLI has zero short flag handling; adding short flags without mapping them precisely to existing long flags risks ambiguity; `-s` for `--skipConfirmation` vs `-s` for `--server` creates landmines | Keep all flags long-form only; document this explicitly. The existing surface works in CI without short flags — don't add complexity for "ergonomics" before parity is proven. |
| **New commands beyond the 9-command surface** | Innovation is tempting once the scaffolding is there | PROJECT.md explicitly places "new commands not in the existing CLI surface" out of scope; adding commands before parity is proven risks introducing behavioral bugs in core commands that get missed because attention splits | Parity first, innovation later. Use the spec to prove behavioral parity before extending the surface. |
| **GUI or web-based interface** | Some users prefer browser-based project configuration | Entirely out of scope per PROJECT.md; web UI requires separate authentication, session management, and entirely different UX paradigm | Terminal CLI only; the Qwik playground and Stackblitz serve the "try without install" use case |
| **Removing the ASCII art logo (`printHeader`)** | Seems like noise in CI output | The logo fires unconditionally before every command; removing it is a MAY CHANGE but changing it is disruptive to users who are used to the output and may have scripts parsing it | Keep the logo exactly as-is in v1; treat it as MAY CHANGE for v2 when confidence in the rest of the surface is established |
| **Uncommenting `updateConfigurations()` in migrate-v2** | Looks like unfinished work | It was commented out deliberately because PR #7159 fixed the underlying issue; uncommenting undocumented code without understanding what it does risks corrupting config files in user projects | Open Question §3 in COMPATIBILITY-CONTRACT.md requires explicit investigation before this can be reconsidered; do not uncomment it speculatively |
| **Changing `migrate-v2` to use `app.rootDir` instead of `process.cwd()`** | Would be more consistent with other commands | This is an INVESTIGATE item in COMPATIBILITY-CONTRACT.md; changing it without testing in monorepo scenarios could silently break migration for users who run it from a workspace root | Leave as `process.cwd()` to match existing behavior; document the distinction; investigate in a pnpm workspace before changing |
| **`installDeps` using `npm` for all operations in `migrate-v2`** | Users on pnpm/yarn/bun expect their PM to be used | The `npm dist-tag` query is intentionally hardcoded (npm registry API); however the actual `installDeps` call uses detected PM — these are two different operations and must not be conflated | Preserve the exact behavior: dist-tag query = always npm; install step = detected PM. No exceptions. |

---

## Feature Dependencies

```
[Binary Entry Point: runCli() + AppCommand]
    └──requires──> [Flag Parsing: getArg() with --flag=value and --flag value forms]
    └──requires──> [Package Manager Detection: which-pm-runs + pnpm fallback]
    └──requires──> [printHeader: ASCII logo on every invocation]

[qwik add]
    └──requires──> [loadIntegrations() from stubs/ directory]
    └──requires──> [updateApp() + mergeIntegrationDir() file operations]
    └──requires──> [installDeps() via detected PM]
    └──requires──> [postInstall hook execution]
    └──requires──> [User consent gate: --skipConfirmation=true OR confirm prompt]

[qwik build / build preview]
    └──requires──> [package.json script discovery]
    └──requires──> [prebuild.* / postbuild.* hook discovery]
    └──requires──> [Parallel script execution engine]
    └──requires──> [--mode forwarding via attachArg()]
    └──requires──> [process.exitCode = 1 non-throw error handling]

[qwik new]
    └──requires──> [stubs/ template directory with {templateId}/{type}/ structure]
    └──requires──> [parseInputName() slug + PascalCase transformation]
    └──requires──> [Path inference: leading / = route; no / = component]
    └──requires──> [Duplicate file guard]
    └──requires──> [fs.mkdirSync recursive parent creation]

[qwik migrate-v2]
    └──requires──> [ts-morph temporary install + removal]
    └──requires──> [AST import renaming (3 rounds, 8 mappings)]
    └──requires──> [Text-replacement replacePackage() × 5 calls in exact order]
    └──requires──> [npm dist-tag version resolution]
    └──requires──> [gitignore-respected file traversal]
    └──requires──> [Binary file detection skip]

[qwik check-client]
    └──requires──> [dist/q-manifest.json mtime comparison]
    └──requires──> [Recursive src directory mtime scan]
    └──requires──> [package.json build.client script delegation]

[qwik joke]
    └──requires──> [Static jokes array in cli package — NOT cross-package import]

[qwik version]
    └──requires──> [Build-time QWIK_VERSION injection via define config]

[Interactive prompt UX (add, new, migrate-v2, help)]
    └──requires──> [@clack/prompts: intro, outro, note, confirm, select, text]
    └──requires──> [bye() = outro + process.exit(0)]
    └──requires──> [panic() = console.error + process.exit(1)]

[Program base class lifecycle]
    └──enables──> [qwik add]
    └──enables──> [qwik build]
    └──enables──> [qwik new]
    └──enables──> [qwik migrate-v2]
    └──enables──> [qwik check-client]

[stubs/ template resolution]
    └──required by──> [qwik add: integration directory loading]
    └──required by──> [qwik new: component/route template loading]
```

### Dependency Notes

- **`stubs/` resolution required before `add` and `new`:** Both commands load template/integration files from disk. The `__dirname`-relative loading in the current monorepo breaks when extracted to a standalone package. `stubs/` must be the first architectural decision resolved — it unblocks both commands.
- **`Program` base class enables all commands:** The `parse → validate → interact → execute` lifecycle must exist before any individual command can be implemented. This is the Phase 1 architectural investment.
- **`migrate-v2` ts-morph replacement has soft dependency on oxc-parser:** The PROJECT.md decision to use `oxc-parser + magic-string` is a direct replacement for the ts-morph AST step. The extraction blocker is ts-morph's runtime-installed pattern; oxc-parser as a compile-time dependency resolves this cleanly.
- **`joke` cross-package coupling blocks extraction:** The import `from '../../../../create-qwik/src/helpers/jokes'` is a hard blocker for standalone packaging. The static jokes array must be moved into the CLI package before the package can ship. This is LOW complexity but HIGH priority.
- **`qwik version` requires build-time `define` config:** The version string cannot be read from `package.json` at runtime (would break in bundled environments). This requires tsdown/esbuild `define` config to inject `QWIK_VERSION` at build time.

---

## MVP Definition

### Launch With (v1 — Parity Release)

The v1 goal is behavioral parity, not innovation. Every item here maps to a MUST PRESERVE behavior.

- [ ] **All 9 commands reachable** — binary entry point, AppCommand flag parsing, runCommand dispatch
- [ ] **`stubs/` template directory** — resolves the extraction blocker for `add` and `new`
- [ ] **`qwik add` full flow** — integration selection, file writes, installDeps, postInstall hook, skipConfirmation flag
- [ ] **`qwik build` + `qwik build preview`** — parallel orchestration, prebuild/postbuild hooks, --mode forwarding, exit code contract
- [ ] **`qwik new`** — route/component/markdown/mdx generation, slug/pascal transforms, duplicate guard, recursive mkdir
- [ ] **`qwik migrate-v2`** — 5-step sequence in exact order, ts-morph runtime install/removal, gitignore traversal, binary file skip
- [ ] **`qwik check-client`** — 3-branch decision tree, q-manifest.json mtime cache key, silent success
- [ ] **`qwik version`** — bare semver output, build-time injection
- [ ] **`qwik joke`** — static jokes array (cross-package coupling resolved)
- [ ] **Exit code contract** — 0 on success/cancel, 1 on error, `process.exitCode = 1` (non-throw) for build failures
- [ ] **`migrate-v2` alias** — `qwik migrate-v2` continues to work even if renamed to `qwik upgrade`
- [ ] **25 golden-path parity tests** (Japa) — ADD-01/02/03, BUILD-01/02/03/04, NEW-01/02/03/04/05, MIG-01/02/03/04/05, CHK-01/02/03, VER-01, JOKE-01

### Add After Validation (v1.x)

- [ ] **`qwik --version` flag support** — dual support alongside `qwik version` subcommand (Open Question §4)
- [ ] **`qwik upgrade` in help output** — expose migration command now that it has interactive guard (Open Question §5)
- [ ] **Dry-run flag for `migrate-v2`** — additive, does not change existing behavior; useful for inspection before destructive run

### Future Consideration (v2+)

- [ ] **Additional `qwik new` types** — additive only; POSSIBLE_TYPES must not change existing type names
- [ ] **`updateConfigurations()` re-evaluation** — only after investigating what PR #7159 did and whether edge cases remain (Open Question §3)
- [ ] **`migrate-v2` monorepo rootDir fix** — only after testing pnpm workspace behavior (Open Question §2)
- [ ] **New commands beyond 9** — explicitly out of scope until parity is validated

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Binary entry point + AppCommand + dispatch | HIGH | LOW | P1 |
| `stubs/` template resolution | HIGH | LOW | P1 |
| `Program` base class lifecycle | HIGH | MEDIUM | P1 |
| `qwik add` — full flow | HIGH | HIGH | P1 |
| `qwik build` — parallel orchestration | HIGH | MEDIUM | P1 |
| `qwik new` — file generation | HIGH | MEDIUM | P1 |
| Exit code contract | HIGH | LOW | P1 |
| `qwik migrate-v2` — 5-step sequence | HIGH | HIGH | P1 |
| `qwik check-client` — decision tree | MEDIUM | MEDIUM | P1 |
| `qwik version` — bare semver output | MEDIUM | LOW | P1 |
| Static jokes array (decouple cross-package) | LOW | LOW | P1 |
| 25 Japa parity tests | HIGH | HIGH | P1 |
| `migrate-v2` alias (`qwik upgrade` routing) | MEDIUM | LOW | P1 |
| `qwik --version` flag dual support | LOW | LOW | P2 |
| `qwik upgrade` in help output | LOW | LOW | P2 |
| Dry-run for `migrate-v2` | LOW | LOW | P2 |
| New `qwik new` types | LOW | MEDIUM | P3 |
| `updateConfigurations()` re-evaluation | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (parity release)
- P2: Should have, add after parity is confirmed
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

This is a CLI reimplementation, not a net-new product. The "competitor" is the existing Qwik CLI
inside the monorepo. Comparison is between what exists now and what the standalone package must provide.

| Feature | Existing Qwik CLI (monorepo) | `create-qwikdev-astro` (reference impl) | `@qwik.dev/cli` (target) |
|---------|------------------------------|-----------------------------------------|--------------------------|
| Command dispatch | Manual switch on `task` string | Program base class `parse/validate/interact/execute` | Program base class (adopt reference pattern) |
| Flag parsing | Custom `getArg()` in AppCommand | yargs | yargs (from PROJECT.md stack decision) |
| Interactive prompts | @clack/prompts | @clack/prompts | @clack/prompts (same) |
| Template resolution | `__dirname`-relative (extraction blocker) | `stubs/` explicit directory | `stubs/` directory |
| AST codemods | ts-morph (runtime-installed) | Not applicable | oxc-parser + magic-string |
| Build output | Single (monorepo bundling) | Not applicable | tsdown ESM + CJS dual output |
| Test coverage | ~5% of MUST PRESERVE behaviors | Not documented | 25 golden-path Japa scenarios |
| Package coupling | 16 cross-package imports, 6 files | Self-contained | Self-contained (jokes array inlined) |
| Release cycle | Tied to Qwik framework | Own release cycle | Own release cycle |
| Version injection | esbuild `define` at build time | Not applicable | tsdown/esbuild `define` |

---

## Sources

- `specs/CMD-INVENTORY.md` — Full 9-command surface with flags, argument signatures, dispatch logic (HIGH confidence — derived from source inspection of `build/v2` branch HEAD `bfe19e8d9`)
- `specs/CMD-PROMPTS-AND-EFFECTS.md` — Every clack prompt, file write, install, and process mutation per command (HIGH confidence — derived from source inspection)
- `specs/COMPATIBILITY-CONTRACT.md` — 67 MUST PRESERVE behaviors + MAY CHANGE + ALIAS REQUIRED + INVESTIGATE classifications (HIGH confidence — authoritative parity spec)
- `specs/PARITY-TEST-PLAN.md` — 25 golden-path scenarios, 8 fixture projects, e2e gap analysis showing ~5% existing coverage (HIGH confidence — derived from spec documents)
- `.planning/PROJECT.md` — Stack decisions, constraints, out-of-scope items, reference implementation (HIGH confidence — project authority document)
- [create-vite non-interactive mode](https://vite.dev/guide/) — `--no-interactive` flag as industry pattern for CI-safe scaffolding (MEDIUM confidence — official docs)
- [create-next-app CLI reference](https://nextjs.org/docs/app/api-reference/cli/create-next-app) — Flag-based non-interactive scaffolding as table stakes (MEDIUM confidence — official docs)
- [Command Line Interface Guidelines](https://clig.dev/) — Exit code 0 on cancel (user choice ≠ error), exit code 1 vs 2 distinction (MEDIUM confidence — widely-cited community standard)
- [@clack/prompts npm page](https://www.npmjs.com/package/@clack/prompts) — Current version (1.1.0), prompt component catalog (MEDIUM confidence — official npm registry)

---
*Feature research for: CLI Scaffolding and Build Orchestration (Qwik CLI reimplementation)*
*Researched: 2026-04-01*
