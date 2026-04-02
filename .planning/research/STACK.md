# Stack Research

**Domain:** Node.js CLI tooling — standalone reimplementation of Qwik CLI
**Researched:** 2026-04-02 (v1.1 milestone update; v1.0 research preserved below)
**Confidence:** HIGH (versions verified against npm registry, oxc.rs official docs, Qwik monorepo source)

---

## Milestone v1.1 Changes: What is NEW

This section covers only what changes or is added in v1.1. Everything in the "Existing Stack (v1.0)" section below remains valid and MUST NOT be re-researched or re-debated.

---

### 1. oxfmt + oxlint — Replacing Biome

Biome (`@biomejs/biome`) is removed. Two separate tools from the [oxc-project](https://github.com/oxc-project/oxc) replace it.

#### Why Replace Biome

Biome is a unified formatter+linter. PROJECT.md already specifies `oxlint + oxfmt` as the target linting stack. Both are from the same Rust-based oxc ecosystem that already provides `oxc-parser` (already in the project). Switching consolidates the team's Rust toolchain bet on oxc and eliminates the Biome dependency.

#### oxlint

| Attribute | Value |
|-----------|-------|
| Package | `oxlint` |
| Current version | `1.58.0` (published 2026-03-31) |
| Install as | dev dependency |
| Config file | `.oxlintrc.json` (primary) or `.oxlintrc.jsonc` or `oxlint.config.ts` |
| Config format | ESLint v8-compatible JSON schema |
| Run command | `oxlint` / `oxlint --fix` |

**TypeScript support:** Enable the `typescript` plugin in `.oxlintrc.json`. For type-aware rules, set `"options": { "typeAware": true }` — this requires `oxlint-tsgolint` as an additional dev dependency. For a CLI tool project, non-type-aware TypeScript linting is sufficient.

**Key config pattern for a TypeScript CLI project:**

```json
{
  "$schema": "https://raw.githubusercontent.com/oxc-project/oxc/main/npm/oxlint/configuration_schema.json",
  "plugins": ["typescript"],
  "rules": {},
  "env": {
    "node": true,
    "es2022": true
  },
  "files": {
    "includes": ["src/**/*.ts", "tests/**/*.ts", "bin/**/*.ts"]
  }
}
```

#### oxfmt

| Attribute | Value |
|-----------|-------|
| Package | `oxfmt` |
| Current version | `0.42.0` (published 2026-03-30; beta reached February 2026) |
| Install as | dev dependency |
| Config file | `.oxfmtrc.json` or `.oxfmtrc.jsonc` |
| Run command | `oxfmt` (format in place) / `oxfmt --check` (CI check) |
| File types | JS, JSX, TS, TSX, JSON, JSONC, JSON5, YAML, TOML, Markdown, CSS, and more |

**Status:** Oxfmt is in beta (announced 2026-02-24) but passes 100% of Prettier's JavaScript and TypeScript conformance tests. It is production-ready for TypeScript CLI projects. Adopted by vuejs/core, vercel/turborepo, and others.

**Biome migration:** Oxfmt provides a migration command from Biome/Prettier configs. The existing `biome.json` can be removed after migrating its `indentStyle`/`indentWidth` settings to `.oxfmtrc.json`.

#### Replacing Biome in package.json scripts

```json
{
  "scripts": {
    "lint": "oxlint",
    "lint:fix": "oxlint --fix",
    "format": "oxfmt",
    "format:check": "oxfmt --check"
  }
}
```

Remove from `devDependencies`: `@biomejs/biome`
Remove file: `biome.json`

Add to `devDependencies`: `oxlint`, `oxfmt`

---

### 2. create-qwik Package

The `create-qwik` scaffolding flow (CRQW-01 through CRQW-08) lives in the same `@qwik.dev/cli` package. It does NOT require a separate npm package. The reference `create-qwik` package in the Qwik monorepo (`packages/create-qwik/`) uses `execa` as its only runtime dependency beyond `@clack/prompts`, `kleur`, and `yargs` — all already present in this project.

**No new runtime dependencies are required for create-qwik.** The implementation uses:

| Existing dependency | create-qwik usage |
|--------------------|--------------------|
| `@clack/prompts` | Interactive prompts (project name, starter select, install deps confirm) |
| `yargs` | Non-interactive CLI argument parsing (`<starter> <outDir> [--force] [--installDeps]`) |
| `kleur` | Terminal colors in success output |
| `panam` | Package manager detection + `pm.install()` for dep install |
| `cross-spawn` | Process spawning for `git init` and dep installation |
| `fs-extra` | Directory creation, file copying for starter template merge |
| `semver` | Already in project for migration version resolution |

**Why not `execa`:** The reference `create-qwik` uses `execa@9.6.1` as a runtime dependency for running git and install commands. This project already uses `cross-spawn` for the same purpose (build command, spawn abstraction). Using `cross-spawn` keeps the subprocess model consistent across all commands. The reference impl is tightly coupled to the Qwik monorepo via 16 cross-package imports — those couplings are severed in this standalone implementation.

**New `bin` entry required in package.json:**

```json
{
  "bin": {
    "qwik": "./dist/bin/qwik.mjs",
    "create-qwik": "./dist/bin/create-qwik.mjs"
  }
}
```

The `create-qwik` binary is a thin wrapper that calls `runCli()` from the create-qwik module. Pattern matches the reference `create-qwik.mjs` entry point:

```js
#!/usr/bin/env node
import * as createQwik from './dist/src/index.mjs';
createQwik.runCli();
```

**Template loading extension:** `loadIntegrations()` currently reads `stubs/adapters/` and `stubs/features/`. For create-qwik, it must also read `stubs/apps/` to support the base+starter merge pattern (CRQW-04, CRQW-05). No new library needed — extend the existing `loadIntegrations.ts` to include the `apps` subdirectory and surface an `IntegrationType` of `'app'`.

The `IntegrationData` type needs a `type` field added to distinguish `'app'` from `'adapter'`/`'feature'` so `makeTemplateManager(type)` can filter correctly. This is a type change only.

---

### 3. Migration Version-Chaining Architecture

The v1.1 migration restructure changes from a flat `src/migrate/` folder to a versioned `migrations/v2/` structure. The architecture is:

```
src/
  migrations/
    v2/                    ← all v1→v2 migration logic
      run-migration.ts     ← moved from src/migrate/run-migration.ts
      rename-import.ts
      replace-package.ts
      update-dependencies.ts
      versions.ts
      visit-not-ignored.ts
      binary-extensions.ts
    v3/                    ← (future) v2→v3 migration logic
      ...
  commands/
    migrate/               ← unchanged; dispatches to migrations/v2/
```

**No new libraries are required** for the version-chaining architecture. The pattern uses:

| Concern | Mechanism |
|---------|-----------|
| Version detection | `semver` (already present) reads current `@qwik.dev/core` version from target project's package.json |
| Chain resolution | Array of version steps, each step is an async function `(rootDir) => Promise<void>` |
| Idempotency | Each migration step checks preconditions before applying (pattern already in `checkTsMorphPreExisting`) |
| Execution | `upgrade --migrate` flag on the upgrade command chains applicable migrations based on detected current version |

**Version-chaining contract (implementation pattern, no new deps):**

```typescript
// src/migrations/index.ts
type MigrationStep = {
  from: string;   // semver range of source version, e.g. "^1.x"
  to: string;     // target version, e.g. "2.x"
  run: (rootDir: string) => Promise<void>;
};

const MIGRATIONS: MigrationStep[] = [
  { from: "^1.x", to: "^2.x", run: runV2Migration },
  // future: { from: "^2.x", to: "^3.x", run: runV3Migration },
];
```

The `upgrade` command (distinct from `migrate`) checks/installs latest deps. `upgrade --migrate` additionally runs applicable migration steps. This is a restructuring of existing logic — `semver` is the only library involved and it is already in `dependencies`.

---

## Existing Stack (v1.0 — No Changes)

All entries below are validated from v1.0 research and remain unchanged for v1.1.

### Core Technologies

| Technology | Version Constraint | Purpose | Why Recommended |
|------------|-------------------|---------|-----------------|
| `@clack/prompts` | `^0.11.0` | Interactive terminal prompts | Used in reference impl; composable API with spinners, selects, confirms; resolves to v1.x via semver |
| `yargs` | `^18.0.0` | CLI argument parsing | Used in reference impl; supports 9-subcommand surface; v18 is ESM-first with explicit Node.js >=20.19.0 requirement |
| `cross-spawn` | `^7.0.6` | Cross-platform process spawning | Replaces raw `child_process.spawn` on Windows; handles path quoting, shebang normalization |
| `fs-extra` | `^11.3.0` | File system operations | Adds `copy`, `ensureDir`, `outputFile`, `move`, `remove`; essential for stubs/ template copying |
| `kleur` | `^4.1.5` | Terminal colors | No deps, fast, chainable; supports NO_COLOR env var; v4 stable |
| `panam` | `^0.3.0` | Package manager abstraction | Unified `pm.install()`, `pm.x()`, `pm.create()`, `pm.runCommand()`, `pm.name` across npm/yarn/pnpm/bun |
| `which-pm-runs` | `^1.1.0` | Detect invoking package manager | Reads `npm_config_user_agent` env var; returns `{name, version}` |
| `which` | `^5.0.0` | Locate executables in PATH | Verifies binaries exist before spawning; async + sync APIs |
| `magic-string` | `^0.30` | AST-based source mutations | Tracks source maps, enables precise string replacement; pairs with oxc-parser |
| `oxc-parser` | `^0.123` | Parse JS/TS to ESTree AST | Rust-based; 3x faster than swc; used for codemod rewrites |
| `semver` | `^7.7.4` | Semantic version parsing/comparison | Npm dist-tag version resolution in migrations; version-chaining detection in upgrade |
| `ignore` | `^7.0.5` | .gitignore pattern matching | Used in `visitNotIgnoredFiles` to skip ignored files during migration |

### Development Tools

| Tool | Version Constraint | Purpose | Notes |
|------|-------------------|---------|-------|
| `tsdown` | `^0.20.1` | Build — ESM + CJS dual output | Built on Rolldown; `format: ['esm', 'cjs']`; requires Node.js >= 20.19.0 |
| `typescript` | `^5.8.3` | TypeScript compilation | Required by tsdown; v5.8 supports TypeScript 6 compat via tsdown `^0.21.5` |
| `@japa/runner` | `^4.2.0` | Test runner | Reference impl choice; Node.js >= 18; ESM-only; v5 removed `fast-glob` |
| `@japa/assert` | `^4.0.1` | Assertions for Japa | Chai-based assert API; must match runner major version |
| `@types/node` | `^24.0.0` | Node.js type definitions | Tracks Node.js 24 API surface |

---

## Full Dependency Delta for v1.1

```bash
# Remove
npm uninstall @biomejs/biome
rm biome.json

# Add dev dependencies
npm install -D oxlint oxfmt

# No new runtime dependencies
```

The only package.json change beyond the linting tools is:
1. Adding `"create-qwik": "./dist/bin/create-qwik.mjs"` to the `bin` field
2. Extending `files` to ensure the create-qwik binary is included in the npm publish

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `oxlint@^1.58.0` | Node.js >= 14, all current LTS | Rapid release cadence (weekly); `^1.58.0` tracks latest stable; config format is ESLint v8 schema |
| `oxfmt@^0.42.0` | Node.js >= 14, all current LTS | Beta but conformance-complete; `^0.42.0` tracks latest stable; config via `.oxfmtrc.json` |
| `oxlint` + `oxfmt` | Independent, no shared config | Each has its own config file; they do not share `.oxlintrc.json` vs `.oxfmtrc.json`; no combined config format exists (unlike Biome) |
| `oxlint` + `oxc-parser@^0.123` | Compatible; same oxc-project | Version numbers are independent (oxlint uses crate versioning, oxc-parser mirrors it); no runtime coupling |

---

## Alternatives Considered (v1.1 additions)

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `oxlint + oxfmt` | `@biomejs/biome` | Biome is the right choice if you want a single config file and unified tool; switch back if oxfmt beta issues block formatting parity |
| `cross-spawn` (for create-qwik) | `execa` | execa has better promise ergonomics and streaming; the reference `create-qwik` uses it; switch to execa if cross-spawn proves limiting for background install flows |
| Version-folder structure (`migrations/v2/`) | Flat `migrate/` folder | Flat is simpler for single-version CLIs; use flat only if future version migrations are out of scope |

---

## What NOT to Use (v1.1 additions)

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@biomejs/biome` | Replaced by oxfmt+oxlint per PROJECT.md; removes a non-oxc Rust tool from the dependency tree | `oxlint` + `oxfmt` |
| `execa` | Not in the existing stack; adding it for create-qwik flows creates two subprocess libraries; cross-spawn already handles all spawn needs | `cross-spawn` |
| Separate `create-qwik` npm package | The reference package's coupling to the Qwik monorepo is the problem being solved; a separate package re-introduces sync/release complexity | Single `@qwik.dev/cli` package with `create-qwik` bin entry |
| Shared `.oxlintrc.json` / `.oxfmtrc.json` | These are separate config files for separate tools; there is no combined config format | Maintain both `.oxlintrc.json` and `.oxfmtrc.json` independently |

---

## Sources

- [oxlint npm (npmx.dev)](https://npmx.dev/package/oxlint) — v1.58.0 confirmed latest, published 2026-03-31 — HIGH confidence
- [oxfmt npm (npmx.dev)](https://npmx.dev/package/oxfmt) — v0.42.0 confirmed latest, published 2026-03-30 — HIGH confidence
- [oxc.rs linter docs](https://oxc.rs/docs/guide/usage/linter.html) — config file format, TypeScript plugin, install command — HIGH confidence
- [oxc.rs formatter docs](https://oxc.rs/docs/guide/usage/formatter.html) — install, script patterns, config format — HIGH confidence
- [Oxfmt Beta announcement](https://oxc.rs/blog/2026-02-24-oxfmt-beta) — supported file types, migration from Biome/Prettier, .editorconfig support — HIGH confidence
- [oxc.rs compatibility](https://oxc.rs/compatibility.html) — production readiness, framework support matrix — HIGH confidence
- [oxlint config file reference](https://oxc.rs/docs/guide/usage/linter/config-file-reference) — .oxlintrc.json schema, TypeScript plugin setup — HIGH confidence
- Qwik monorepo `packages/create-qwik/package.json` — reference create-qwik deps (`execa@9.6.1`) — HIGH confidence
- Qwik monorepo `packages/create-qwik/src/` — interactive + non-interactive CLI patterns — HIGH confidence
- Qwik monorepo `starters/` layout — apps/adapters/features/templates directories — HIGH confidence
- `@qwik.dev/cli` existing `package.json` — confirmed current deps, Biome present — HIGH confidence
- [WebSearch: oxlint 1.58.0 + oxfmt 0.42.0 config](https://oxc.rs/docs/guide/usage/linter/config) — .oxlintrc.json vs oxlint.config.ts options confirmed — MEDIUM confidence (cross-validated with official docs)

---

*Stack research for: @qwik.dev/cli — Node.js CLI tooling (Qwik CLI reimplementation)*
*Researched: 2026-04-02 (v1.1 milestone; v1.0 research from 2026-04-01 preserved)*
