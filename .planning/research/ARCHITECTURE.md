# Architecture Research

**Domain:** Multi-command CLI tool (9-command Qwik CLI + create-qwik scaffolder)
**Researched:** 2026-04-01
**Confidence:** HIGH — Reference implementation source verified directly from QwikDev/astro repo; all spec files read from verified commits.

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Entry Layer                                  │
│   bin/qwik.ts → router.ts (switch on argv[2])                        │
│   bin/create-qwik.ts → CreateQwikProgram.run(argv)                   │
└──────────────────────────────────────┬───────────────────────────────┘
                                       │
┌──────────────────────────────────────▼───────────────────────────────┐
│                        Program Layer                                  │
│  Program<T,U> (abstract, from core.ts)                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ AddProg  │ │BuildProg │ │ NewProg  │ │MigratePr.│ │CreateQwik│  │
│  │ extends  │ │ extends  │ │ extends  │ │ extends  │ │ extends  │  │
│  │ Program  │ │ Program  │ │ Program  │ │ Program  │ │ Program  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       │             │            │             │            │        │
│  configure() → parse() → validate()/interact() → execute()          │
└──────────────────────────────────────┬───────────────────────────────┘
                                       │
┌──────────────────────────────────────▼───────────────────────────────┐
│                       Shared Services Layer                           │
│  ┌────────────────┐  ┌───────────────┐  ┌──────────────────────────┐ │
│  │ integrations   │  │  update-app   │  │     install-deps         │ │
│  │ loadIntegrat() │  │  updateApp()  │  │  installDeps()           │ │
│  │ (cached, async)│  │  CODE_MOD     │  │  backgroundInstallDeps() │ │
│  └────────────────┘  └───────────────┘  └──────────────────────────┘ │
│  ┌────────────────┐  ┌───────────────┐  ┌──────────────────────────┐ │
│  │ console.ts     │  │  codemods     │  │   fs utilities           │ │
│  │ clack wrappers │  │  oxc+magic-s  │  │  fs-extra, path helpers  │ │
│  └────────────────┘  └───────────────┘  └──────────────────────────┘ │
└──────────────────────────────────────┬───────────────────────────────┘
                                       │
┌──────────────────────────────────────▼───────────────────────────────┐
│                          Asset Layer                                  │
│  stubs/                                                               │
│  ├── adapters/   (14 adapter directories with package.json)          │
│  ├── features/   (22 feature directories with package.json)          │
│  ├── apps/       (base, empty, playground, library + stubs)          │
│  └── templates/  (qwik/ subdirs for component/route/markdown/mdx)    │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Notes |
|-----------|----------------|-------|
| `bin/qwik.ts` | Shebang entry, call router | Thin: imports router, invokes it |
| `bin/create-qwik.ts` | Shebang entry, call CreateQwikProgram | Thin: imports app, calls `.run(process.argv)` |
| `router.ts` | Parse `argv[2]`, dispatch to correct Program | Switch or map; not a framework |
| `core.ts` → `Program<T,U>` | Abstract base: configure, parse, validate, interact, execute lifecycle | Copied from reference; owns yargs, isIt(), scanBoolean/String/Choice |
| `commands/add/` | `AddProgram extends Program` — integration installation | Owns `loadIntegrations`, `updateApp`, confirmation gate |
| `commands/build/` | `BuildProgram extends Program` — build orchestration | Owns script discovery, parallel execution ordering |
| `commands/new/` | `NewProgram extends Program` — component/route scaffolding | Owns type/name inference, template resolution, duplicate guard |
| `commands/migrate/` | `MigrateProgram extends Program` — v2 migration | Owns ts-morph install/remove, AST rename, text replace (replaces ts-morph with oxc+magic-string) |
| `commands/check-client/` | `CheckClientProgram extends Program` — freshness check | Owns manifest read, mtime comparison, conditional build trigger |
| `commands/joke/` | `JokeProgram extends Program` — dad joke | Owns jokes.json read, random selection |
| `commands/help/` | `HelpProgram extends Program` — help display | Owns COMMANDS list rendering, re-dispatch logic |
| `commands/version/` | `VersionProgram extends Program` — version print | Reads build-injected QWIK_VERSION constant |
| `services/integrations.ts` | Discovery of adapters/features/apps from stubs/ | Cached per-process; path relative to `__dirname` of bundle |
| `services/update-app.ts` | Merge integration files into project; gate CODE_MOD | `applyViteConfig` replaces build-time global |
| `services/install-deps.ts` | foreground and background package install | Used by add, create-qwik, migrate |
| `services/codemods.ts` | AST transforms via oxc-parser + magic-string | Replaces ts-morph; used by migrate |
| `console.ts` | Clack wrappers, color helpers, scanBoolean/String/Choice | Shared by all Program subclasses via Program base |
| `stubs/` | Template files for add, new, create-qwik | Resolved via `__dirname`-relative path; no runtime discovery hack |

## Recommended Project Structure

```
src/
├── core.ts                  # Program<T,U> abstract base class (from reference)
├── console.ts               # @clack/prompts + kleur wrappers
├── router.ts                # Entry dispatch: switch on argv[2], header print
├── commands/
│   ├── add/
│   │   ├── index.ts         # AddProgram extends Program
│   │   ├── update-app.ts    # File merge + vite config logic
│   │   └── print-help.ts    # Add-specific help renderer
│   ├── build/
│   │   └── index.ts         # BuildProgram extends Program
│   ├── new/
│   │   ├── index.ts         # NewProgram extends Program
│   │   └── templates.ts     # Template loading for qwik new
│   ├── migrate/
│   │   ├── index.ts         # MigrateProgram extends Program
│   │   ├── rename-import.ts # AST import rename (oxc+magic-string)
│   │   └── replace-text.ts  # Regex-based text replacement
│   ├── check-client/
│   │   └── index.ts         # CheckClientProgram extends Program
│   ├── joke/
│   │   └── index.ts         # JokeProgram extends Program
│   ├── help/
│   │   └── index.ts         # HelpProgram extends Program
│   └── version/
│       └── index.ts         # VersionProgram extends Program
├── services/
│   ├── integrations.ts      # loadIntegrations() with stubs/ discovery
│   ├── install-deps.ts      # installDeps + backgroundInstallDeps
│   └── codemods.ts          # oxc-parser + magic-string transforms
├── create-qwik/
│   ├── index.ts             # CreateQwikProgram extends Program
│   ├── create-app.ts        # App scaffolding (updateApp with applyViteConfig:false)
│   └── template-manager.ts  # App starter loading, getBaseApp, filters
├── types.ts                 # Shared: IntegrationData, CreateAppResult, etc.
├── utils.ts                 # Misc helpers: pathExists, resolveRelativeDir, etc.
└── index.ts                 # Public API re-export (for programmatic use)
bin/
├── qwik.ts                  # #!/usr/bin/env node → router
└── create-qwik.ts           # #!/usr/bin/env node → CreateQwikProgram
stubs/
├── adapters/                # 14 adapter dirs (each with package.json + files)
├── features/                # 22 feature dirs (each with package.json + files)
├── apps/                    # base, empty, playground, library + stub files
└── templates/               # qwik/{component,route,markdown,mdx}/ for qwik new
```

### Structure Rationale

- **`core.ts`:** Single source of truth for the Program lifecycle; copied from create-qwikdev-astro pattern. One file, no sub-folder — it's the base, not a module.
- **`commands/`:** One directory per subcommand. Each holds its `Program` subclass and any logic private to that command. Nothing outside a command folder imports from inside it except the router.
- **`services/`:** Code shared across multiple commands. `integrations.ts` is needed by `add`, `new`, and `create-qwik`. `install-deps.ts` is needed by `add`, `migrate`, and `create-qwik`.
- **`create-qwik/`:** Kept separate from `commands/` because it is a distinct binary entry point, not a subcommand of `qwik`. It shares services but not the router.
- **`stubs/`:** All template assets live here. No `__dirname` hacks — the bundle is built with stubs adjacent to the output, and `import.meta.url` resolves correctly per bundle.
- **`types.ts`:** Eliminates the cross-package type coupling identified in COUPLING-REPORT.md. All shared types (IntegrationData, CreateAppResult, etc.) live here.

## Architectural Patterns

### Pattern 1: Program Lifecycle (parse → validate → interact → execute)

**What:** Every command is a class that extends `Program<Definition, Input>`. The base class handles yargs wiring, `--yes`/`--no` flags, CI detection, and interactive mode detection. Subclasses override exactly the methods relevant to their command.

**When to use:** Every command. No exceptions — even trivial commands like `joke` and `version` extend Program because it enforces a consistent structure and makes testing uniform.

**Trade-offs:** More boilerplate than a flat function, but the structure pays for itself at 9 commands where "where does prompt logic live?" becomes a real question.

**Example:**
```typescript
// commands/joke/index.ts
export class JokeProgram extends Program<Definition, Input> {
  configure(): void {
    this.command('joke', 'Tell a random dad joke');
  }
  validate(definition: Definition): Input {
    return {}; // no args
  }
  async execute(_input: Input): Promise<number> {
    const joke = getRandomJoke();
    this.note(`${joke.setup}\n${joke.punchline}`, '🙈');
    return 0;
  }
}

// commands/add/index.ts
export class AddProgram extends Program<Definition, Input> {
  configure(): void {
    this.command('add [integration]', 'Add an integration to this app')
      .argument('integration', { type: 'string', desc: 'Integration id' })
      .option('skipConfirmation', { type: 'boolean', default: false })
      .option('projectDir', { type: 'string' });
  }
  validate(definition: Definition): Input { /* ... */ }
  async interact(definition: Definition): Promise<Input> { /* prompt for integration */ }
  async execute(input: Input): Promise<number> { /* run add flow */ }
}
```

### Pattern 2: Router as Thin Dispatch (not a framework)

**What:** The `router.ts` module is a plain switch (or object map) keyed on `argv[2]`. It prints the header, instantiates the right Program, and calls `.run(argv)`. No framework, no plugin system — just a map from string to class.

**When to use:** This is the entry point pattern. The 9-command surface is stable; a framework would add overhead with no benefit.

**Trade-offs:** Adding a 10th command requires editing the router. Acceptable: command count is bounded and any new command goes through the same Program lifecycle anyway.

**Example:**
```typescript
// router.ts
import { printHeader } from './console';

const COMMANDS: Record<string, () => Promise<Program<any, any>>> = {
  add:           () => import('./commands/add').then(m => m.addProgram()),
  build:         () => import('./commands/build').then(m => m.buildProgram()),
  new:           () => import('./commands/new').then(m => m.newProgram()),
  joke:          () => import('./commands/joke').then(m => m.jokeProgram()),
  'migrate-v2':  () => import('./commands/migrate').then(m => m.migrateProgram()),
  'check-client':() => import('./commands/check-client').then(m => m.checkClientProgram()),
  help:          () => import('./commands/help').then(m => m.helpProgram()),
  version:       () => import('./commands/version').then(m => m.versionProgram()),
};

export async function runCli(): Promise<void> {
  printHeader();
  const task = process.argv[2];
  const factory = COMMANDS[task];
  if (!factory) {
    console.error(red(`Unrecognized qwik command: ${task}`));
    await COMMANDS['help']().then(p => p.run(process.argv));
    process.exit(1);
  }
  const program = await factory();
  const code = await program.run(process.argv);
  process.exit(code);
}
```

### Pattern 3: Explicit applyViteConfig Parameter (replaces CODE_MOD global)

**What:** The `updateApp()` function accepts an explicit `applyViteConfig: boolean` parameter instead of reading the `CODE_MOD` build-time global. Callers set this based on context: `true` for `qwik add`, `false` for `create-qwik` scaffolding.

**When to use:** Everywhere `updateApp` is called. This resolves COUPLING-REPORT.md blocker #3 and makes the behavior transparent.

**Trade-offs:** One extra parameter per call site. Worth it: the global was a hidden build-time contract that would corrupt new projects if accidentally set wrong.

**Example:**
```typescript
// services/update-app.ts
export async function updateApp(
  pkgManager: string,
  opts: UpdateAppOptions & { applyViteConfig: boolean }
): Promise<UpdateAppResult> {
  // ...
  if (opts.applyViteConfig) {
    await updateViteConfigs(fileUpdates, integration, opts.rootDir);
  }
}

// commands/add/index.ts — qwik add: vite config DOES apply
await updateApp(pkgManager, { ...opts, applyViteConfig: true });

// create-qwik/create-app.ts — scaffolding: vite config does NOT apply
await updateApp(pkgManager, { ...opts, applyViteConfig: false });
```

### Pattern 4: stubs/ as the Single Asset Root

**What:** All template assets (adapters, features, app starters, qwik-new templates) live under `stubs/` adjacent to the package source. The build process copies the relevant subsets into the dist bundle. `loadIntegrations()` resolves starters at `join(dirname(import.meta.url), 'stubs')` — which after bundling always points to the dist-adjacent `stubs/` directory.

**When to use:** All asset resolution. No runtime path discovery, no `__dirname` tricks, no environment variables for paths.

**Trade-offs:** Requires the build to copy the correct starters subsets. The split (adapters+features for qwik CLI; apps for create-qwik) must be maintained. In the standalone package both subsets live in the same bundle's `stubs/`, eliminating the split entirely.

## Data Flow

### qwik add (interactive)

```
argv[2] = 'add'
    ↓
router.ts → AddProgram.run(argv)
    ↓
AddProgram.parse(argv)        → yargs parses --skipConfirmation, --projectDir, [integration]
    ↓
AddProgram.isIt() = true?
  yes → AddProgram.interact()  → loadIntegrations() [cached]
                               → select prompt if no id given
                               → returns Input{integration, skipConfirmation, projectDir}
  no  → AddProgram.validate()  → validates id exists, returns Input
    ↓
AddProgram.execute(input)
    ↓
updateApp(pkgManager, { ...input, applyViteConfig: true })
    ↓  returns UpdateAppResult{commit(), integration, fileUpdates}
logUpdateAppResult()           → show diff, confirm prompt (unless skipConfirmation)
    ↓
result.commit(true)            → fs writes + installDeps() [concurrent]
    ↓
postInstall?                   → runInPkg(pkgManager, postInstall.split(' '), rootDir)
    ↓
logUpdateAppCommitResult()     → outro, process.exit(0)
```

### create-qwik (interactive)

```
argv = []
    ↓
bin/create-qwik.ts → CreateQwikProgram.run(process.argv)
    ↓
CreateQwikProgram.parse(argv)  → yargs (template positional, outDir positional, --force, --installDeps)
    ↓
CreateQwikProgram.interact()
    → text prompt: project directory
    → backgroundInstallDeps(pkgManager, baseApp)  ← starts in background immediately
    → select prompt: starter app
    → confirm: install deps?
    → confirm: git init?
    → [conditional joke prompt during background install wait]
    ↓
CreateQwikProgram.execute(input)
    → createApp({ appId, outDir, pkgManager }) → updateApp(..., { applyViteConfig: false })
    → git init sequence (if requested)
    → installDepsCli() → backgroundInstall.complete(outDir)
    → logAppCreated()
    → outro
```

### migrate-v2 orchestration

```
argv[2] = 'migrate-v2'
    ↓
router.ts → MigrateProgram.run(argv)
    ↓
MigrateProgram.execute():
    → intro + confirm gate
    → Step 1: installTsMorph() [conditional, skipped if present]
    → Step 2: dynamic import('./codemods/rename-import')
              replaceImportInFiles() via oxc-parser+magic-string
              [3 rounds: qwik-city, qwik-city-plan, qwik/jsx-runtime]
    → Step 3: replaceText() — 5 calls in dependency order
              @builder.io/qwik-city last to avoid substring collision
    → Step 4: removeTsMorphFromPackageJson() [conditional]
    → Step 5: updateDependencies() → npm dist-tag lookup → install
    → log.success()
```

### Key Data Flows

1. **Integration discovery:** `loadIntegrations()` reads `stubs/` once per process, caches in module-level variable. All commands that need integrations (add, create-qwik) share this cache.
2. **Asset path:** `join(dirname(fileURLToPath(import.meta.url)), 'stubs')` — evaluated at module load in the compiled bundle, so `import.meta.url` = the bundle file, `stubs/` = adjacent directory.
3. **Vite config mutations:** Gated by `applyViteConfig` parameter. Only flows through `qwik add`. Never flows through `create-qwik`.
4. **Version injection:** `QWIK_VERSION` constant injected at build time via tsdown `define`. Used in `version` command and create-qwik intro banner.

## Build Order Implications

The component dependency graph determines build order for phases:

```
Phase 1 (Foundation):
  core.ts          ← no deps within package
  console.ts       ← depends on @clack/prompts, kleur (external)
  types.ts         ← no deps within package

Phase 2 (Infrastructure):
  services/integrations.ts     ← depends on types.ts + stubs/ asset layout
  services/install-deps.ts     ← depends on console.ts, external: cross-spawn/panam
  services/update-app.ts       ← depends on integrations.ts, types.ts

Phase 3 (Simple Commands):
  commands/version/            ← depends on core.ts, console.ts only
  commands/joke/               ← depends on core.ts, console.ts only
  commands/check-client/       ← depends on core.ts, console.ts, fs utils

Phase 4 (Asset-Dependent Commands):
  commands/new/                ← depends on stubs/templates/, core.ts
  commands/add/                ← depends on integrations.ts, update-app.ts, install-deps.ts
  commands/build/              ← depends on core.ts, install-deps.ts

Phase 5 (Complex Commands):
  commands/migrate/            ← depends on codemods, install-deps.ts, Phase 1+2
  create-qwik/                 ← depends on all services, stubs/apps/

Phase 6 (Entry + Wiring):
  router.ts                    ← depends on all commands
  bin/qwik.ts, bin/create-qwik.ts
```

Build phases in the roadmap should respect this ordering. `core.ts` and `console.ts` are unblocked day one. `services/` cannot be tested until `stubs/` asset layout is established. Commands depending on `update-app.ts` (add, create-qwik) must come after services are complete.

## Scaling Considerations

This is a CLI tool, not a web service. "Scaling" means adding commands and maintaining behavioral coverage.

| Concern | Now (9 commands) | At 15+ commands |
|---------|------------------|-----------------|
| Adding a command | One folder in `commands/`, one entry in router map | Same — no structural change needed |
| Test surface | One Japa test file per command | Same pattern; Japa suite files grow linearly |
| Asset growth | stubs/ copied at build time | Build script copy list must be updated |
| Behavioral regression | 67 MUST PRESERVE behaviors encoded in Japa | New behaviors added to existing test files |

## Anti-Patterns

### Anti-Pattern 1: Flat Function Per Command

**What people do:** Export a `runAddCommand(app)` function and call it directly from a switch statement, as the original Qwik CLI does.

**Why it's wrong:** At 9 commands, prompt logic, validation, and execution are mixed in a single function. Adding `--yes` / `--no` skip logic requires touching every command. Testing non-interactive mode requires mocking prompts globally.

**Do this instead:** Each command is a `Program` subclass. `validate()` handles non-interactive paths. `interact()` handles prompts. `execute()` handles side effects. The base class `isIt()` gate handles the switch between them.

### Anti-Pattern 2: Build-Time Global for Behavioral Branching (CODE_MOD)

**What people do:** Inject `globalThis.CODE_MOD = true/false` via esbuild `define` to make shared code behave differently in different bundles.

**Why it's wrong:** The behavior difference is invisible at the call site. Any caller of `updateApp()` has no indication that vite config mutation may or may not happen. Extracting the code into a standalone package breaks the contract silently.

**Do this instead:** Explicit `applyViteConfig: boolean` parameter. The caller declares intent. The function behavior is readable at the call site.

### Anti-Pattern 3: `__dirname`-Relative Paths in Shared Code

**What people do:** Use `join(__dirname, 'starters')` inside a shared utility that gets bundled into multiple output files.

**Why it's wrong:** When bundled into a different package, `import.meta.url` points to the wrong bundle, and the `starters/` directory is not present there. The bug is silent — `loadIntegrations()` returns an empty array.

**Do this instead:** The standalone package owns its own `stubs/` directory. `loadIntegrations()` resolves paths relative to the single bundle that ships the function. No sharing of the path-resolution code across bundles — it's inlined alongside the assets it needs.

### Anti-Pattern 4: ts-morph for Migration Transforms

**What people do:** Install ts-morph at migration runtime, use it for AST-based import renaming, then remove it from package.json (but not node_modules).

**Why it's wrong:** ts-morph is 50+ MB, requires a runtime install step, and leaves node_modules dirty. The install/remove dance is fragile and confusing to users.

**Do this instead:** oxc-parser for AST parsing + magic-string for surgical text replacement. Both are fast, lightweight, and belong in the package's own dependencies. No runtime install required.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| npm registry | `execSync('npm dist-tag @qwik.dev/core')` in migrate Step 5 | Hardcoded npm, not user's package manager — acceptable since it's a one-time version lookup |
| User's package manager | Detected via `which-pm-runs` at runtime | Used for all install, build, and run operations |
| git | Spawned via `cross-spawn` / `panam/$` | Used by create-qwik and migrate-v2 |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `router.ts` → commands | Dynamic import + `.run(argv)` | Lazy loading keeps startup fast |
| `commands/add/` → `services/integrations.ts` | Direct import | Cache is module-level; safe within process |
| `commands/add/` → `services/update-app.ts` | Direct import | `applyViteConfig` parameter is the coupling contract |
| `create-qwik/` → `services/update-app.ts` | Direct import | Same function, different `applyViteConfig` value |
| `commands/migrate/` → `codemods/rename-import` | Dynamic import | Ensures ts-morph (old) / oxc (new) is available before loading the module |
| All commands → `console.ts` | Via Program base class methods | `this.info()`, `this.scanBoolean()` etc. — not direct clack imports |

## Sources

- create-qwikdev-astro reference: `Program<T,U>` base class — [https://github.com/QwikDev/astro/blob/main/libs/create-qwikdev-astro/src/core.ts](https://github.com/QwikDev/astro/blob/main/libs/create-qwikdev-astro/src/core.ts) — HIGH confidence (direct source read)
- create-qwikdev-astro reference: `Application extends Program` — [https://github.com/QwikDev/astro/blob/main/libs/create-qwikdev-astro/src/app.ts](https://github.com/QwikDev/astro/blob/main/libs/create-qwikdev-astro/src/app.ts) — HIGH confidence (direct source read)
- `specs/CMD-INVENTORY.md` — 9-command surface, dispatch logic, flag schemas — HIGH confidence (verified at commit `bfe19e8d9`)
- `specs/COUPLING-REPORT.md` — extraction blockers, CODE_MOD, __dirname coupling — HIGH confidence (verified at commit `bfe19e8d9`)
- `specs/CQW-INTERACTIVE-FLOW.md` — create-qwik prompt sequence, background install — HIGH confidence (verified at commit `b197b42200`)
- `specs/MIG-WORKFLOW.md` — migrate-v2 5-step orchestration — HIGH confidence (verified at commit `bfe19e8d9`)
- `specs/ASSET-INVENTORY.md` — stubs/ layout, loadIntegrations() flow — HIGH confidence (verified at commit `bfe19e8d9`)

---
*Architecture research for: Qwik CLI standalone package (@qwik.dev/cli)*
*Researched: 2026-04-01*
