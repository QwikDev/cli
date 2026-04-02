# Stack Research

**Domain:** Node.js CLI tooling — standalone reimplementation of Qwik CLI
**Researched:** 2026-04-01
**Confidence:** HIGH (versions verified against create-qwikdev-astro reference implementation package.json)

---

## Source of Truth

All versions below were verified against the `create-qwikdev-astro` reference implementation
(`libs/create-qwikdev-astro/package.json` in the QwikDev/astro monorepo). This is the canonical
stack this project must follow per the architecture constraint in PROJECT.md.

---

## Recommended Stack

### Core Technologies

| Technology | Version Constraint | Resolved Version | Purpose | Why Recommended |
|------------|-------------------|-----------------|---------|-----------------|
| `@clack/prompts` | `^0.11.0` | `1.1.0` (March 2026) | Interactive terminal prompts | Used in reference impl; well-designed composable API with spinners, selects, confirms; maintained by Bombshell dev (void(0) adjacent) |
| `yargs` | `^18.0.0` | `18.0.0` | CLI argument parsing | Used in reference impl; supports 9-subcommand surface; v18 is ESM-first with modern Node.js requirements |
| `cross-spawn` | `^7.0.6` | `7.0.6` | Cross-platform process spawning | Replaces raw `child_process.spawn` on Windows; handles path quoting, shebang normalization; required for Windows compat |
| `fs-extra` | `^11.3.0` | `11.3.4` | File system operations | Adds `copy`, `ensureDir`, `outputFile`, `move`, `remove` to native `fs`; essential for stubs/ template copying |
| `kleur` | `^4.1.5` | `4.1.5` | Terminal colors | Used in reference impl; no deps, fast, chainable API; supports NO_COLOR env var; v4 is stable (3 years, no churn) |
| `panam` | `^0.3.0` | `0.3.x` | Package manager abstraction | Provides `pm.install()`, `pm.x()`, `pm.create()`, `pm.runCommand()`, `pm.name`, `pm.isNpm()`, `pm.in([...])` — a unified interface across npm/yarn/pnpm/bun |
| `which-pm-runs` | `^1.1.0` | `1.1.0` | Detect invoking package manager | Reads `npm_config_user_agent` env var set by npm/pnpm/yarn/bun at run time; returns `{name, version}`; used by `getPackageManager()` fallback |
| `which` | `^5.0.0` | `6.0.1` (Feb 2026) | Locate executables in PATH | Used to verify binaries exist before spawning; equivalent to Unix `which`; async + sync APIs |
| `magic-string` | `^0.30` | `0.30.21` | AST-based source mutations | Mutation layer on top of oxc-parser; tracks source maps, enables precise string replacement with original position data |
| `oxc-parser` | `^0.123` | `0.123.0` | Parse JS/TS to ESTree AST | Rust-based; 3x faster than swc parser; passes Test262/Babel/TypeScript test suites; used for codemod rewrites in `qwik add` and `qwik upgrade` |

### Development Tools

| Tool | Version Constraint | Resolved Version | Purpose | Notes |
|------|-------------------|-----------------|---------|-------|
| `tsdown` | `^0.20.1` | `0.21.7` (March 2026) | Build tool — ESM + CJS dual output | Replaces tsup; built on Rolldown (void(0) ecosystem); supports `format: ['esm', 'cjs']` in a single config; requires Node.js >= 20.19.0; upgrade to 22.18.0+ recommended |
| `typescript` | `^5.8.3` | `5.8.3` | TypeScript compilation | Required by tsdown; v5.8 supports TypeScript 6 feature compatibility via tsdown `^0.21.5` |
| `@biomejs/biome` | `^2.x` | `2.4.x` (Feb 2026) | Linting + formatting | Single tool replaces ESLint + Prettier; v2 has type-aware lint rules, 423+ rules, monorepo support; requires `biome.json` config; no `.eslintrc` or `.prettierrc` needed |
| `@japa/runner` | `^4.2.0` | `5.3.0` (Jan 2026) | Test runner | Used in reference impl; Node.js >= 18 required; ESM-only; v5 removed `fast-glob` in favor of `fs.glob` (Node.js built-in); standard globs unaffected |
| `@japa/assert` | `^4.0.1` | `4.2.0` (Dec 2025) | Assertions for Japa | Chai-based assert API; works with `@japa/runner`; must upgrade runner to latest major first before upgrading assert |
| `@types/node` | `^24.0.0` | `24.x` | Node.js type definitions | Tracks Node.js 24 API surface; required for `fs.glob`, `crypto`, `path`, and spawn types |

---

## Installation

```bash
# Runtime dependencies
npm install @clack/prompts cross-spawn fs-extra kleur magic-string oxc-parser panam which which-pm-runs yargs

# Dev dependencies
npm install -D @biomejs/biome @japa/assert @japa/runner @types/cross-spawn @types/fs-extra @types/node @types/which @types/which-pm-runs @types/yargs tsdown typescript

# Note: tsx is used in create-qwikdev-astro for running TypeScript scripts
# during development. Not required in the CLI output bundle.
npm install tsx
```

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `yargs@^18.0.0` | Node.js `^20.19.0 \|\| ^22.12.0 \|\| >=23` | v18 is ESM-first; removed singleton usage (`yargs.foo`); command names no longer derived from modules — must be explicit |
| `@japa/runner@^5.x` | Node.js >= 18; ESM-only | v5 replaced `fast-glob` with native `fs.glob`; standard glob patterns unaffected; upgrade runner before upgrading assert |
| `@japa/assert@^4.x` | `@japa/runner@^5.x` | Must use matching major version pairs; Chai assert API; not jest-expect |
| `tsdown@^0.21.x` | Node.js >= 20.19.0 (22.18.0+ recommended) | v0.21.0 migrated deps config to `deps` namespace (breaking); v0.21.5 adds TypeScript v6 support; optionalDependencies now external by default |
| `@clack/prompts@^0.11.0` | All current Node.js LTS | v1.x is current; `^0.11.0` constraint will resolve to 1.x via semver |
| `oxc-parser@^0.123` | All current Node.js LTS | Rapid release cadence (daily); `parseSync(filename, source, opts?)` is the stable API; no documented breaking changes to parser API in recent releases |
| `magic-string@^0.30` | All current Node.js LTS | Stable; v0.30.21 is latest; no breaking changes in recent versions; works with oxc ESTree output |
| `@biomejs/biome@^2.x` | All current Node.js LTS | v2 changes suppression comment syntax (`lint/<GROUP>/<RULE>` replaces `lint(<GROUP>/<RULE>)`); `ignore`/`include` replaced by `includes` in v2 config; breaking from v1 |
| `which@^5.0.0` | All current Node.js LTS | v6.0.1 is current but `^5.0.0` resolves to 6.x; async + sync APIs unchanged |
| `cross-spawn@^7.0.6` | All current Node.js LTS | Stable; last published 2024; no churn expected |
| `fs-extra@^11.3.0` | Node.js >= 14 | v11.3.4 is current; stable API |
| `kleur@^4.1.5` | All current Node.js LTS | v4.1.5; zero deps; stable; no churn |
| `panam@^0.3.0` | All current Node.js LTS | Used as `panam/pm` subpath export; provides `pm.install()`, `pm.x()`, `pm.create()`, `pm.runCommand()`, `pm.name`, `pm.isNpm()`, `pm.in([])` |
| `which-pm-runs@^1.1.0` | All current Node.js LTS | v1.1.0; published 2 years ago; stable; reads `npm_config_user_agent` |

---

## tsdown Configuration for Dual ESM + CJS Output

```typescript
// tsdown.config.ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts', './src/cli.ts'],
  format: {
    esm: {
      target: ['node20'],
    },
    cjs: {
      target: ['node20'],
    },
  },
  // For CLI tools: do NOT use unbundle: true
  // Bundle everything except explicit externals
  external: ['@qwik.dev/core'], // if applicable
})
```

The `format` field accepts either an array (`['esm', 'cjs']`) or an object for per-format config overrides. Both produce output in `dist/`. tsdown automatically handles `.mjs`/`.cjs` extensions in output.

---

## Biome Configuration

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "organizeImports": {
    "enabled": true
  },
  "files": {
    "includes": ["src/**/*.ts", "tests/**/*.ts"]
  }
}
```

Note: Biome v2 changed `ignore`/`include` to `includes` (plural). Suppression comments use `// biome-ignore lint/groupName/ruleName: reason` (slash separators, not parentheses).

---

## Japa Test Runner Setup

```typescript
// bin/test.ts
import { assert } from '@japa/assert'
import { configure, processCLIArgs, run } from '@japa/runner'

processCLIArgs(process.argv.splice(2))

configure({
  plugins: [assert()],
  files: ['tests/**/*.spec.ts'],
})

run()
```

Running tests requires Node.js >= 18 and ESM. Add to `package.json`:

```json
{
  "scripts": {
    "test": "node --import tsx/esm bin/test.ts"
  }
}
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `yargs@^18` | `commander` | commander has simpler API but weaker subcommand typing; use if yargs feels heavy |
| `yargs@^18` | `meow` | meow is simpler but lacks structured subcommand support needed for 9-command surface |
| `@clack/prompts` | `inquirer` | inquirer is more feature-rich but heavier; use if you need complex prompt types not in clack |
| `cross-spawn` | `execa` | execa has promise-first API and better streaming; create-qwikdev-astro switched to cross-spawn; use execa if you need more control over stdio streams |
| `magic-string + oxc-parser` | `ts-morph` | ts-morph is TypeScript-native but 10x heavier; oxc-parser is faster and doesn't require a tsconfig to initialize |
| `tsdown` | `tsup` | tsup is more mature but built on esbuild; tsdown is the forward trajectory for the void(0)/Vite ecosystem; use tsup only if tsdown has blocking issues |
| `@biomejs/biome` | `eslint + prettier` | Two separate tools, slower, more config; use only if existing ESLint plugin ecosystem is required |
| `@japa/runner` | `vitest` | vitest has better snapshot support and browser mode; use vitest if you need DOM testing or Vue/React component tests |
| `panam` | `package-manager-detector` | package-manager-detector detects from lockfiles/packageManager field; use if detection-only (no spawn abstraction) is needed |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `ts-morph` | Heavy (~50MB); requires full TypeScript program init with tsconfig; the existing qwik CLI uses it but the rewrite explicitly replaces it | `magic-string + oxc-parser` |
| `execa` | The reference impl (create-qwikdev-astro) switched away from it in favor of `cross-spawn`; coupling report shows the original create-qwik using execa as an external dep | `cross-spawn` |
| `chalk` | kleur is the chosen color library in the reference impl; chalk v5 is ESM-only which can cause issues in dual-output CLIs | `kleur` |
| `glob` / `fast-glob` | `@japa/runner@v5` removed `fast-glob` dependency; Node.js 22+ has native `fs.glob`; avoid adding a glob dependency to the CLI itself | Node.js native `fs.glob` or `fs.readdirSync` |
| `jest` / `vitest` | Reference implementation uses Japa; mixing test frameworks adds cognitive overhead | `@japa/runner + @japa/assert` |
| `eslint + prettier` | Biome v2 replaces both at 50x+ speed; ESLint config complexity is a maintenance burden; Biome v2 has type-aware rules | `@biomejs/biome` |
| Singleton `yargs` pattern | Removed in yargs v18; `yargs.foo` and `yargs().argv` singleton patterns are gone | Explicit yargs instance via `yargs(process.argv.slice(2))` |
| `__dirname` for asset resolution | The central extraction blocker (EB-01, EB-02); `__dirname`-relative paths break when code is not bundled alongside assets | `stubs/` directory with explicit path parameter passed to integration loader |

---

## Key Stack Constraint: yargs v18 ESM-First

yargs v18 is the version pinned in the reference implementation. It introduced four breaking changes from v17:

1. Command names must be explicit — no auto-derivation from module names
2. Singleton usage removed (`yargs.foo`, `yargs().argv`)
3. Minimum Node.js: `^20.19.0 || ^22.12.0 || >=23`
4. ESM-first output

This means the project requires **Node.js 20.19+** as a minimum runtime target. The tsdown config should use `target: ['node20']` accordingly.

---

## Key Stack Constraint: panam API Surface

`panam` is used via the `panam/pm` subpath export. The documented API (from create-qwikdev-astro source):

| Method | Use |
|--------|-----|
| `pm.name` | Display name of detected package manager |
| `pm.isNpm()` | Check if npm is the active package manager |
| `pm.in(['npm', 'yarn', 'pnpm', 'bun'])` | Check if pm is in a set |
| `pm.install({ cwd })` | Run `[pm] install` in a directory |
| `pm.x('cmd args')` | Run `[pm] exec cmd args` or equivalent |
| `pm.create('template args')` | Run `[pm] create template args` |
| `pm.runCommand()` | Return the pm-appropriate run command string (e.g. `"npm run"`, `"pnpm"`) |

The `which-pm-runs` package handles the detection half (reads `npm_config_user_agent`). `panam` provides the execution abstraction on top of that detection.

---

## Sources

- create-qwikdev-astro `package.json` (QwikDev/astro monorepo, `libs/create-qwikdev-astro/package.json`) — authoritative version pins — HIGH confidence
- create-qwikdev-astro `src/app.ts` — panam API surface verified from source — HIGH confidence
- tsdown official docs (https://tsdown.dev) — dual output config, Node.js requirements — HIGH confidence
- tsdown GitHub releases (https://github.com/rolldown/tsdown/releases) — v0.21.7 latest confirmed — HIGH confidence
- Biome blog (https://biomejs.dev/blog/) — v2.4 current, v2 breaking changes confirmed — HIGH confidence
- japa/runner GitHub releases — v5.3.0 latest, v5 breaking change (fast-glob removal) — HIGH confidence
- japa/assert GitHub releases — v4.2.0 latest — HIGH confidence
- yargs GitHub release v18.0.0 — breaking changes documented — HIGH confidence
- oxc-project/oxc GitHub releases — v0.123.0 current crate version — HIGH confidence
- magic-string GitHub releases — v0.30.21 confirmed stable — HIGH confidence
- which (npm/node-which) GitHub — v6.0.1 current — HIGH confidence
- cross-spawn npm — v7.0.6 current — HIGH confidence
- fs-extra npm — v11.3.4 current — HIGH confidence
- kleur npm — v4.1.5 current — HIGH confidence
- which-pm-runs npm — v1.1.0 current — HIGH confidence
- @clack/prompts npm — v1.1.0 current — HIGH confidence

---

*Stack research for: @qwik.dev/cli — Node.js CLI tooling (Qwik CLI reimplementation)*
*Researched: 2026-04-01*
