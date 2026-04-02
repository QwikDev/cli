# Qwik CLI — Compatibility Contract

**Behavioral parity requirements for @qwik.dev/cli**

This contract was derived by source-inspecting `packages/qwik/src/cli/*` as of the `build/v2` branch (HEAD `bfe19e8d9`). It defines what a future `@qwik.dev/cli` package must preserve, what it may safely change, and what compatibility aliases it must provide. Requirements marked "MUST PRESERVE" are binding — violating them would break users who rely on the documented behavior. Requirements marked "MAY CHANGE" are explicitly safe to evolve. This document is the authoritative parity spec for Phase 5 of the v3.0 CLI Behavioral Parity Spec and must be read alongside CMD-INVENTORY.md and CMD-PROMPTS-AND-EFFECTS.md.

---

## Classification Legend

| Label          | Meaning                                                       |
| -------------- | ------------------------------------------------------------- |
| MUST PRESERVE  | Exact behavioral parity required. Breaking this breaks users. |
| MAY CHANGE     | Safe to alter. No documented users depend on this surface.    |
| ALIAS REQUIRED | Old invocation must route to new behavior via alias.          |
| INVESTIGATE    | Ambiguous — needs clarification before deciding.              |

---

## Command Surface Contract

### `add`

| Behavior                                                                             | Classification | Rationale                                 |
| ------------------------------------------------------------------------------------ | -------------- | ----------------------------------------- |
| `qwik add [integration-id]` positional argument                                      | MUST PRESERVE  | Users script this in CI                   |
| `--skipConfirmation=true` flag                                                       | MUST PRESERVE  | Used in programmatic/CI contexts          |
| `--projectDir=<path>` flag                                                           | MUST PRESERVE  | Used to write into subdirectory           |
| Integration selection via interactive select when no positional provided             | MUST PRESERVE  | Primary interactive flow                  |
| postInstall script execution when `integration.pkgJson.__qwik__.postInstall` exists  | MUST PRESERVE  | Integrations depend on this hook          |
| `installDeps()` run when integration adds dependencies                               | MUST PRESERVE  | Core install contract                     |
| File writes committed only after user confirmation (or `--skipConfirmation=true`)    | MUST PRESERVE  | User consent gate before mutation         |
| `process.exit(0)` on success                                                         | MUST PRESERVE  | Callers rely on exit codes                |
| `process.exit(1)` on file-write failure or install failure                           | MUST PRESERVE  | CI pipelines check exit code              |
| `qwik add help` showing add-specific help (adapters + features + interactive select) | MAY CHANGE     | Internal help format not user-contractual |
| Prompt text exact wording                                                            | MAY CHANGE     | UI copy is not a behavioral contract      |
| Sort order of integration list (priority desc, then alphabetical)                    | MAY CHANGE     | UX ordering, not compatibility            |
| Adapter vs feature grouping labels in help output                                    | MAY CHANGE     | Visual grouping, not behavioral           |

### `build`

| Behavior                                                                                          | Classification | Rationale                                                                  |
| ------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------- |
| `qwik build` running `build.client` (required), `build.server`, `build.types`, `lint` in parallel | MUST PRESERVE  | Core build orchestration contract                                          |
| `qwik build preview` triggering `build.preview` instead of `build.server`                         | MUST PRESERVE  | Preview build workflows depend on this                                     |
| `--mode <value>` forwarded to `build.client`, `build.lib`, `build.preview`, `build.server`        | MUST PRESERVE  | Users pass `--mode production`, `--mode staging`, etc.                     |
| `prebuild.*` scripts discovered and run sequentially BEFORE parallel build                        | MUST PRESERVE  | Build lifecycle hooks                                                      |
| `postbuild.*` scripts discovered and run sequentially AFTER parallel build                        | MUST PRESERVE  | Build lifecycle hooks                                                      |
| `build.client` running before parallel phase (sequential ordering guaranteed)                     | MUST PRESERVE  | Some build pipelines depend on client completing first                     |
| `process.exitCode = 1` on any script failure (allows parallel steps to finish)                    | MUST PRESERVE  | CI pipelines check exit code; non-throw behavior matters                   |
| `ssg` script run after `build.static` in preview mode when both are present                       | MUST PRESERVE  | SSG pipelines depend on this                                               |
| Preview mode detection via `app.args.includes('preview')` (value literal, anywhere in args)       | MUST PRESERVE  | Callers invoke `qwik build preview`; detection must not become flag-only   |
| `build preview` registered as distinct COMMANDS entry                                             | MAY CHANGE     | Implementation detail; only `args.includes('preview')` matters at dispatch |
| Exact console output format (spinner text, cyan checkmarks)                                       | MAY CHANGE     | Visual only                                                                |
| "Missing an integration" advisory message wording                                                 | MAY CHANGE     | UX hint, not behavioral                                                    |

### `new`

| Behavior                                                                                                      | Classification | Rationale                                                              |
| ------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------- |
| `qwik new /path` creating route in `src/routes/`                                                              | MUST PRESERVE  | Documented in help and tutorials                                       |
| `qwik new name` (no leading `/`) creating component in `src/components/`                                      | MUST PRESERVE  | Documented in help and tutorials                                       |
| `qwik new /path.md` creating markdown route                                                                   | MUST PRESERVE  | Used in docs workflows                                                 |
| `qwik new /path.mdx` creating MDX route                                                                       | MUST PRESERVE  | Used in docs workflows                                                 |
| `--<templateId>` flag selecting template (e.g. `--qwik`)                                                      | MUST PRESERVE  | Used in scaffolding scripts                                            |
| Duplicate file guard — throws `"${filename}" already exists in "${outDir}"`                                   | MUST PRESERVE  | Prevents accidental overwrites                                         |
| `[slug]` token substitution in template file paths and content                                                | MUST PRESERVE  | Template authors depend on this                                        |
| `[name]` token substitution in template file content                                                          | MUST PRESERVE  | Template authors depend on this                                        |
| `.template` extension stripping from output filename                                                          | MUST PRESERVE  | Template file naming convention                                        |
| Output path derivation: routes/markdown/mdx → `src/routes/`, components → `src/components/`                   | MUST PRESERVE  | Qwik project structure assumption                                      |
| `POSSIBLE_TYPES` constant (`component\|route\|markdown\|mdx`)                                                 | MUST PRESERVE  | Any new type must be additive; existing type names must not change     |
| `parseInputName()` slug (`parts.join('-')`) and pascal (`parts.map(p => capitalize).join('')`) transformation | MUST PRESERVE  | Determines generated file names; downstream tools may depend on naming |
| Split on `[-_\s]` only in `parseInputName()` — `/` is NOT a separator                                         | MUST PRESERVE  | Nested paths preserve slashes in both slug and name                    |
| Interactive prompt flow: select type → text name → select template (each conditional)                         | MUST PRESERVE  | Primary UX path                                                        |
| Default template `'qwik'` when positional argument is provided and no `--flag` given                          | MUST PRESERVE  | Avoids unnecessary prompt in scripted use                              |
| Auto-select template when exactly 1 template found (no prompt shown)                                          | MUST PRESERVE  | Reduces friction in single-template projects                           |
| `fs.mkdirSync(outDir, { recursive: true })` — creates parent dirs                                             | MUST PRESERVE  | Users depend on directory auto-creation                                |
| Exact prompt text and placeholder wording                                                                     | MAY CHANGE     | Copy, not behavior                                                     |

### `joke`

| Behavior                                                               | Classification | Rationale                                                                            |
| ---------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------ |
| `qwik joke` printing a dad joke (setup + punchline)                    | MUST PRESERVE  | Fun but user-visible command                                                         |
| No file writes, no installs, no `process.exit` call (returns normally) | MUST PRESERVE  | Must remain safe to run anywhere without side effects                                |
| No args or flags consumed                                              | MUST PRESERVE  | Callers must not need to pass anything                                               |
| Source of jokes: `create-qwik/src/helpers/jokes`                       | INVESTIGATE    | Cross-package coupling; if packages split, joke source moves — see Open Questions §1 |
| Joke display format: clack `note()` with magenta text                  | MAY CHANGE     | Visual presentation, not behavioral                                                  |

### `migrate-v2`

| Behavior                                                                                                                                    | Classification | Rationale                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------- |
| Full migration step sequence (Steps 1–5 in order: install ts-morph → AST rename → text replace → remove ts-morph → update versions)         | MUST PRESERVE  | Migration correctness depends on ordering                                           |
| `@qwik.dev/core` renamed LAST in the replacePackage sequence (Call 5 of 5)                                                                  | MUST PRESERVE  | Substring ordering constraint — running it first corrupts the other 3 package names |
| ts-morph AST rename of all 8 named imports across 3 rounds (A: qwik-city → router names; B: qwikCityPlan → qwikRouterConfig; C: jsxs → jsx) | MUST PRESERVE  | Source correctness depends on complete rename                                       |
| ts-morph installed temporarily (added to devDependencies, written to disk, installed)                                                       | MUST PRESERVE  | Must not arrive as permanent CLI dependency                                         |
| ts-morph removed after migration only if it was not already present before Step 1                                                           | MUST PRESERVE  | Must not strip user's existing ts-morph dependency                                  |
| npm `dist-tag` used for version resolution (always npm, not project package manager)                                                        | MUST PRESERVE  | Version resolution depends on npm registry API; hardcoded by design                 |
| `versionTagPriority` order: `latest > v2 > rc > beta > alpha`                                                                               | MUST PRESERVE  | Determines which tag users get; changing order changes which version is installed   |
| Fallback version `'2.0.0'` when no v2 dist-tag is found                                                                                     | MUST PRESERVE  | Fallback prevents hard failure when tags change                                     |
| Package names updated: `@qwik.dev/core`, `@qwik.dev/router`, `@qwik.dev/react`, `eslint-plugin-qwik`                                        | MUST PRESERVE  | Complete package set; omitting one leaves an inconsistent dependency graph          |
| Version strings preserved through Step 3 (key rename only); overwritten in Step 5                                                           | MUST PRESERVE  | Ensures Step 5 controls final installed version                                     |
| `replacePackage` skips: yarn.lock, package-lock.json, pnpm-lock.yaml, bun.lockb, CHANGELOG.md                                               | MUST PRESERVE  | Lockfile mutation would break reproducibility                                       |
| `replacePackage` skips binary files                                                                                                         | MUST PRESERVE  | Binary files must not be corrupted                                                  |
| `.gitignore`-respected file traversal (gitignored files skipped in AST rename)                                                              | MUST PRESERVE  | Build outputs and vendored code must not be modified                                |
| `confirm` prompt before proceeding (`'Do you want to proceed?'`)                                                                            | MUST PRESERVE  | User consent before destructive file mutation                                       |
| Runs from `process.cwd()` not `app.rootDir`                                                                                                 | INVESTIGATE    | Behavioral quirk with monorepo implications — see Open Questions §2                 |
| `showInHelp: false` (hidden from help output)                                                                                               | MAY CHANGE     | Was intentionally hidden; future CLI may expose as `qwik upgrade` alias             |
| Exact warning message text and color styling                                                                                                | MAY CHANGE     | Copy, not behavior                                                                  |
| `updateConfigurations()` being commented out                                                                                                | INVESTIGATE    | Was commented because PR #7159 fixed the underlying issue — see Open Questions §3   |

### `check-client`

| Behavior                                                                                            | Classification | Rationale                                                                       |
| --------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------- |
| Positional args: `qwik check-client <src> <dist>` (both required)                                   | MUST PRESERVE  | Callers pass these explicitly in git hooks and CI scripts                       |
| Three-branch decision tree: no dist dir → build; no manifest → build; stale src → build; else no-op | MUST PRESERVE  | Optimization contract — only build when needed                                  |
| Using `dist/q-manifest.json` mtime as cache key                                                     | MUST PRESERVE  | Manifest is the agreed freshness signal; callers depend on this heuristic       |
| Running `build.client` script from user's `package.json` (not a hardcoded build command)            | MUST PRESERVE  | Delegates to user's configured build; must not hardcode `vite build` or similar |
| Non-interactive — no prompts under any branch                                                       | MUST PRESERVE  | Used in CI and git hooks; interactivity would break automation                  |
| Error exit (`process.exit(1)`) on build failure                                                     | MUST PRESERVE  | CI relies on exit code to gate deploys                                          |
| Silent success (no output) when client is up to date                                                | MUST PRESERVE  | Callers parse stdout; unexpected output would break parsers                     |

### `help`

| Behavior                                                        | Classification | Rationale                                                                                                   |
| --------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| Showing only `showInHelp: true` commands in help output         | MAY CHANGE     | Hidden commands (migrate-v2, help, version) may be exposed in new CLI                                       |
| `SPACE_TO_HINT = 18` column width for label padding             | MAY CHANGE     | Formatting detail                                                                                           |
| Minimum 2-space padding enforced even if label exceeds 18 chars | MAY CHANGE     | Visual detail                                                                                               |
| Interactive confirm + select follow-on after listing commands   | MAY CHANGE     | UX pattern; new CLI may use `--help` flag style instead                                                     |
| Re-dispatching selected command via `runCommand()`              | MAY CHANGE     | Implementation detail                                                                                       |
| `migrate-v2` NOT shown in help                                  | ALIAS REQUIRED | If exposed as `qwik upgrade`, old `qwik migrate-v2` invocation must still work — callers have hard-coded it |

### `version`

| Behavior                                                                                  | Classification | Rationale                                                                           |
| ----------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------- |
| `qwik version` printing a semver version string to stdout                                 | MUST PRESERVE  | Tooling may parse this; IDE extensions may invoke it                                |
| Output is exactly one line with no label prefix (e.g. `2.0.0`, not `qwik version: 2.0.0`) | MUST PRESERVE  | Parsers depend on bare version string                                               |
| `QWIK_VERSION` as build-time injection via `globalThis`                                   | MAY CHANGE     | Implementation detail; output format (bare semver string) must be preserved         |
| No `process.exit` call (returns normally)                                                 | MAY CHANGE     | Unlikely to affect callers; exit code is 0 either way                               |
| `qwik version` aliasing to `--version` flag                                               | INVESTIGATE    | Does any tooling invoke `qwik version` vs `qwik --version`? — see Open Questions §4 |

---

## Flag Compatibility

All documented flags across all commands. Both `--flag value` and `--flag=value` forms must be preserved for every flag listed here (implemented via `AppCommand.getArg()`).

| Flag                      | Command              | Classification | Notes                                                                              |
| ------------------------- | -------------------- | -------------- | ---------------------------------------------------------------------------------- |
| `--skipConfirmation=true` | add                  | MUST PRESERVE  | CI pattern; value must be string `'true'` not boolean                              |
| `--projectDir=<path>`     | add                  | MUST PRESERVE  | Programmatic use; overrides integration write directory                            |
| `--mode <value>`          | build, build preview | MUST PRESERVE  | Forwarded to build scripts; users pass `production`, `staging`, custom values      |
| `--<templateId>`          | new                  | MUST PRESERVE  | Template selection; bare flag with no value (e.g. `--qwik`); multiple flags joined |
| (none)                    | migrate-v2           | —              | No flags currently; future CLI may add `--dry-run` additively                      |
| (none)                    | check-client         | —              | No flags currently                                                                 |

**Short flag forms (`-n`) are NOT supported** and must not be introduced without explicit design — the current CLI has no short flag handling.

---

## Alias Requirements

Commands that must remain reachable via their current invocation even if renamed:

| Current invocation | Future canonical name     | Alias required?      | Rationale                                                                                               |
| ------------------ | ------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------- |
| `qwik migrate-v2`  | `qwik upgrade` (proposed) | YES — ALIAS REQUIRED | Existing docs, scripts, and CI workflows have this hard-coded; any rename must preserve the old surface |
| `qwik help`        | any                       | NO                   | Standard help discovery; users type `--help` anyway; no hard-coded scripts expected                     |
| `qwik version`     | any                       | INVESTIGATE          | IDE extensions or CI tooling may invoke this to check CLI version — see Open Questions §4               |

---

## Exit Code Contract

| Scenario                    | Exit code | Command(s)                 | Mechanism                                                                                            |
| --------------------------- | --------- | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Success                     | 0         | all                        | `bye()` → `process.exit(0)`, or `process.exit(0)` directly (add), or implicit return (joke, version) |
| Unrecoverable error / panic | 1         | all                        | `panic(msg)` → `process.exit(1)`                                                                     |
| Build script failure        | 1         | build, build preview       | `process.exitCode = 1` (non-throw; allows parallel steps to finish)                                  |
| Unrecognized command        | 1         | root dispatcher            | `console.log(red(...))` + `printHelp()` + `process.exit(1)`                                          |
| User cancels prompt         | 0         | add, new, migrate-v2, help | `bye()` → `process.exit(0)`                                                                          |

**Design rationale:** Exit code 0 on user cancel is deliberate — cancellation is a user choice, not an error condition. Any future CLI must preserve this behavior; changing cancel to exit 1 would break scripts that treat non-zero as failure.

---

## Behavioral Invariants

Cross-cutting invariants a future `@qwik.dev/cli` must maintain:

1. **Package manager detection uses `which-pm-runs` with `'pnpm'` fallback** — must not hardcode `npm` as the execution package manager (the only `npm` hardcode is the `dist-tag` query in `migrate-v2`, which is intentional).

2. **`pmRunCmd()` returns bare package manager name** (e.g. `pnpm`, `yarn`, `bun`) except for `npm` which returns `'npm run'` — the `npm` special case must be preserved for help output and script invocations.

3. **All integration loading happens via `loadIntegrations()` from the `starters/` directory relative to CLI dist** — integration data is not bundled inline; the directory structure must be preserved or the loader updated atomically.

4. **The `joke` command has a compile-time import coupling to `create-qwik`** — `run-joke-command.ts` imports `getRandomJoke` from `../../../../create-qwik/src/helpers/jokes`. This coupling must be resolved before any CLI package extraction; the jokes data must either move into the CLI package or `create-qwik` must become an explicit dependency.

5. **`migrate-v2` reads and writes from `process.cwd()`, not `app.rootDir`** — all 5 migration steps (ts-morph install, AST rename, text replace, ts-morph removal, version update) use `process.cwd()` as the working root. This differs from every other subcommand, which uses `app.rootDir` (resolved via package.json walk).

6. **`check-client` is fully non-interactive and must remain so** — it is used in git hooks and CI pipelines where any prompt would hang the process indefinitely. No future version of this command may add interactive prompts.

7. **`build preview` detection relies on `app.args.includes('preview')` (value literal, anywhere in args), not a separate task switch** — both `qwik build preview` and any hypothetical `qwik preview build` would trigger preview mode. A future CLI must not change this to a named flag without an alias.

---

## Open Questions / INVESTIGATE Items

These items are classified INVESTIGATE because their behavior is ambiguous or carries hidden risk. Each must be resolved before a CLI rewrite begins.

### 1. `joke` cross-package coupling

**Item:** `run-joke-command.ts` imports `getRandomJoke` from `../../../../create-qwik/src/helpers/jokes` using a relative path that crosses package boundaries.

**Risk:** If `@qwik.dev/cli` becomes a standalone npm package (separate from `packages/qwik`), this relative import will break at compile time.

**Decision needed:** Does `joke` get dropped from the future CLI? Does the jokes data move into `packages/qwik/src/cli/`? Or does `create-qwik` become a declared dependency of `@qwik.dev/cli`?

**Recommendation:** Move the jokes array into `packages/qwik/src/cli/joke/jokes.ts` as a static data file. Zero runtime dependency, no cross-package coupling.

---

### 2. `migrate-v2` uses `process.cwd()` not `app.rootDir`

**Item:** Every migration step in `run-migration.ts` and its helpers uses `process.cwd()` as the project root. All other subcommands use `app.rootDir`, which is resolved by walking up from `process.cwd()` to the nearest `package.json`.

**Risk:** In a monorepo where the user runs `qwik migrate-v2` from the repo root (which has no `package.json` that references Qwik), the migration will operate on the wrong directory.

**Decision needed:** Was `process.cwd()` intentional (to avoid the package.json walk for a one-shot migration command)? Or is it a bug? Should it use `app.rootDir` for consistency?

**Verification needed:** Test in a pnpm workspace monorepo: run `qwik migrate-v2` from the workspace root. Confirm whether it correctly migrates the intended package or silently operates on the wrong directory.

---

### 3. `updateConfigurations()` commented out

**Item:** In `run-migration.ts`, a call to `updateConfigurations()` is commented out with the note: `// COMMENTED OUT FOR NOW (as this is fixed in https://github.com/QwikDev/qwik/pull/7159)`.

**Risk:** If PR #7159 fixed the configuration issue in the framework itself, then `updateConfigurations()` is dead code that should be deleted. If it was commenting out unfinished work, then configuration migration is silently skipped.

**Decision needed:** What does `updateConfigurations()` do? Was the fix in PR #7159 sufficient that no configuration file migration is needed? Or are there edge cases (older projects that were never updated by the framework fix) that still require it?

**Recommendation:** Before shipping `@qwik.dev/cli`, verify that all configuration files a v1 project might have are handled correctly without this step. If any are not, re-implement the step explicitly rather than uncommenting undocumented code.

---

### 4. `qwik version` invocation aliasing

**Item:** `qwik version` is implemented as a subcommand (not a `--version` flag). Some tooling ecosystems call `tool --version` while others call `tool version`.

**Risk:** IDE extensions, language server tooling, or CI scripts may invoke `qwik version` to check the installed CLI version. If a future CLI renames this to `qwik --version` only, those callers break.

**Decision needed:** Survey known consumers of `qwik version` (VS Code extension, WebStorm plugin, any CI templates in official starter kits). If any use `qwik version`, it must be preserved as an alias.

**Recommendation:** Support both `qwik version` (subcommand) and `qwik --version` (flag) in the future CLI. The output must be identical (bare semver string, one line, no label).

---

### 5. `migrate-v2` hidden from help

**Item:** `migrate-v2` has `showInHelp: false`. It is callable but not discoverable via `qwik help`.

**Risk / ambiguity:** Was this intentional (to prevent accidental runs — migration is one-time and destructive) or an oversight from when the command was first added?

**Decision needed:** Should a future `@qwik.dev/cli` expose `migrate-v2` in help (possibly renamed to `qwik upgrade`) or keep it hidden? If exposed, does the introduction of an interactive confirmation prompt (already present) provide sufficient guard?

**Recommendation:** Rename to `qwik upgrade` and show in help. The confirmation prompt (`'Do you want to proceed?'`) already guards against accidental execution. Keeping it hidden reduces discoverability for legitimate users who need to upgrade.
