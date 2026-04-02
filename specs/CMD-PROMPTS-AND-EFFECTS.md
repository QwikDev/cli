# Qwik CLI — Prompt Flows and Side Effects

**Source files inspected:**

- `packages/qwik/src/cli/add/run-add-interactive.ts`
- `packages/qwik/src/cli/add/update-app.ts`
- `packages/qwik/src/cli/new/run-new-command.ts`
- `packages/qwik/src/cli/migrate-v2/run-migration.ts`
- `packages/qwik/src/cli/migrate-v2/update-dependencies.ts`
- `packages/qwik/src/cli/migrate-v2/replace-package.ts`
- `packages/qwik/src/cli/migrate-v2/rename-import.ts`
- `packages/qwik/src/cli/migrate-v2/versions.ts`
- `packages/qwik/src/cli/check-client/index.ts`
- `packages/qwik/src/cli/joke/run-joke-command.ts`
- `packages/qwik/src/cli/utils/utils.ts`
- `packages/qwik/src/cli/utils/integrations.ts`

**Context:** Derived from direct source inspection of the Qwik v1 CLI at `packages/qwik/src/cli/`. This document pairs with CMD-INVENTORY.md to give complete behavioral coverage for the compatibility contract. It is the authoritative record for Phase 5 of the v3.0 CLI Behavioral Parity Spec.

This document enumerates every clack prompt, file write, install, and process mutation each subcommand can produce. It is derived from direct source inspection. A spec reader can use this document to trace what the CLI will say and do for any invocation without running it.

---

## qwik add

**Source:** `packages/qwik/src/cli/add/run-add-interactive.ts`, `packages/qwik/src/cli/add/update-app.ts`

### Prompts

1. `PROMPT [select]` (conditional):

   ```
   message:   "What integration would you like to add?"
   condition: no positional integration id argument provided
   options:   adapters listed first, then features; within each group sorted by priority
              descending, then alphabetical by label
   cancel:    bye() — outro + process.exit(0)
   ```

2. `PROMPT [select]` (conditional):
   ```
   message:   "Ready to apply the {id} updates to your app?"
   condition: --skipConfirmation flag is NOT 'true'
   options:   [
                { label: 'Yes looks good, finish update!', value: true },
                { label: 'Nope, cancel update',            value: false }
              ]
   cancel:    bye() — outro + process.exit(0)
   No:        bye() — outro + process.exit(0)
   ```

### Side Effects

Side effects occur in this order:

1. `EFFECT [file-system]`:

   ```
   action:    updateApp() + mergeIntegrationDir()
   detail:    reads integration directory, collects pending file operations into
              fileUpdates.files[] with type 'create' | 'overwrite' | 'modify'
              collects installedDeps (merged dependencies + devDependencies from
              integration package.json) and installedScripts (keys of
              integration pkgJson.scripts)
   condition: always (after integration is resolved)
   ```

2. `EFFECT [file-system]`:

   ```
   action:    result.commit()
   detail:    writes all files in fileUpdates.files[] to disk, creating parent
              directories as needed
   condition: user confirmed (or --skipConfirmation is 'true')
   on failure: logs error, process.exit(1)
   ```

3. `EFFECT [install]` (conditional):

   ```
   action:    installDeps(pkgManager, rootDir)
   condition: integration has one or more dependencies to add
   detail:    runs the detected package manager's install command in rootDir
   on failure: logs error, process.exit(1)
   ```

4. `EFFECT [script]` (conditional):

   ```
   action:    runInPkg(pkgManager, [...], rootDir)
   condition: integration.pkgJson.__qwik__.postInstall exists
   detail:    executes the postInstall script string via the package manager
   on failure: logs error, process.exit(1)
   ```

5. `EFFECT [process]`:
   ```
   action:    process.exit(0) on success; process.exit(1) on any error
   ```

---

## qwik build

**Source:** `packages/qwik/src/cli/build/run-build-command.ts`

No prompts — fully non-interactive.

### Prompts

None. `qwik build` is non-interactive.

### Side Effects

Side effects occur in this order:

1. `EFFECT [process]`:

   ```
   action:    reads app.packageJson.scripts
   on failure: throws if scripts block is missing
   ```

2. `EFFECT [process]`:

   ```
   action:    discovers prebuild.* and postbuild.* scripts from package.json
   detail:    these are run as pre/post hooks around the parallel build step
   ```

3. `EFFECT [process]` (parallel):

   ```
   action:    runs the following scripts in parallel (if present in package.json):
                - build.types (with --pretty appended)
                - build.lib
                - build.preview  (preview mode only)
                - build.server   (non-preview mode only)
                - build.static
                - lint
   ```

4. `EFFECT [process]` (conditional):

   ```
   action:    if preview mode AND both build.static AND ssg scripts exist,
              runs build.static again after the parallel step
   condition: args includes 'preview' AND package.json has build.static AND ssg scripts
   ```

5. `EFFECT [process]`:

   ```
   action:    sets process.exitCode = 1 on any script failure
   detail:    does NOT throw — allows other parallel steps to finish before exiting
   ```

6. `EFFECT [process]` (--mode forwarding):
   ```
   action:    if --mode <value> flag provided, appends '--mode {value}' to:
                build.client, build.lib, build.preview, build.server
   ```

**Note on `qwik build preview`:** This is registered as a distinct COMMANDS entry with
`value: 'build preview'`, but `runCommand()` routes by `args[0]` only, so it reaches
`case 'build'`. Preview detection inside that case is `app.args.includes('preview')`.

---

## qwik new

**Source:** `packages/qwik/src/cli/new/run-new-command.ts`

### Prompts

Prompts fire conditionally, in order:

1. `PROMPT [select]` (conditional):

   ```
   message:   "What would you like to create?"
   condition: no positional type argument could be inferred
   options:   [
                { value: 'component', label: 'Component'          },
                { value: 'route',     label: 'Route'              },
                { value: 'markdown',  label: 'Route (Markdown)'   },
                { value: 'mdx',       label: 'Route (MDX)'        }
              ]
   cancel:    bye()
   ```

2. `PROMPT [text]` (conditional):

   ```
   condition: no positional name argument provided
   message varies by type:
     route     → 'New route path'          placeholder: '/product/[id]'
     markdown  → 'New Markdown route path' placeholder: '/some/page.md'
     mdx       → 'New MDX route path'      placeholder: '/some/page.mdx'
     component → 'Name your component'     placeholder: 'my-component'
   validate:  length >= 1 required (empty string → error)
   cancel:    bye()
   ```

3. `PROMPT [select]` (conditional):
   ```
   message:   "Which template would you like to use?"
   condition: --templateId flag not provided AND more than 1 template exists for the type
   auto-select: if exactly 1 template found, it is selected silently with no prompt
   cancel:    bye()
   ```

### Side Effects

Side effects occur in this order:

1. `EFFECT [file-system]`:

   ```
   action:    fs.mkdirSync(outDir, { recursive: true })
   detail:    creates the output directory (and all parents) if it does not exist
   ```

2. `EFFECT [file-system]`:

   ```
   action:    fs.writeFile(fileOutput, templateOut)
   detail:    writes the token-substituted template content to the resolved file path
   on failure: throws if the file already exists (no overwrite protection)
   ```

3. `EFFECT [process]`:
   ```
   action:    bye() → process.exit(0)
   ```

**On error:** prints `log.error(String(e))` then `printNewHelp()` then `bye()`.

---

## qwik joke

**Source:** `packages/qwik/src/cli/joke/run-joke-command.ts`

No prompts.

### Prompts

None. `qwik joke` is non-interactive.

### Side Effects

1. `EFFECT [output]`:

   ```
   action:    calls getRandomJoke() from 'create-qwik/src/helpers/jokes'
   returns:   [setup: string, punchline: string]
   ```

2. `EFFECT [output]`:

   ```
   action:    clack note(magenta('${setup}\n${punchline}'), '🙈')
   detail:    displays the joke in the terminal using clack's note component
              with magenta-colored text
   ```

3. No file writes, no installs, no `process.exit` call — function returns normally after displaying the note.

**Cross-package coupling note:** `qwik joke` imports `getRandomJoke` from
`create-qwik/src/helpers/jokes`. This is the only cross-package runtime dependency
visible in the prompt/effect analysis. It means `packages/qwik/src/cli/` has a
runtime coupling to `packages/create-qwik/`. This coupling is relevant to the
Phase 8 coupling report and must be accounted for in any CLI extraction effort.

---

## qwik check-client

**Source:** `packages/qwik/src/cli/check-client/index.ts`

No prompts — fully non-interactive.

### Prompts

None. `qwik check-client` is non-interactive.

### Side Effects (Decision Tree)

```
Inputs: src = args[1], dist = args[2]

Branch 1 — dist directory does not exist:
  → EFFECT [build]: goBuild()

Branch 2 — dist directory exists but q-manifest.json is missing (ENOENT):
  read dist/q-manifest.json mtime
  → EFFECT [build]: goBuild()

Branch 3 — dist directory exists AND q-manifest.json exists:
  read dist/q-manifest.json mtime
  traverse src directory recursively, compare all file mtimes to manifest mtime
  if any src file mtime > manifest mtime:
    → EFFECT [build]: goBuild()
  else:
    → no-op (silent success — client is up to date)

goBuild():
  action:    runs '{pkgManager} run build.client' in rootDir
  detail:    runInPkg(pkgManager, ['run', 'build.client'], app.rootDir)
  on failure: throws Error('Client build command reported failure.')
             → process.exit(1)
```

---

## qwik help

**Source:** `packages/qwik/src/cli/run-qwik-command.ts` (help handler)

### Prompts

1. `PROMPT [intro]`:

   ```
   action:    clack intro('🔭  [Qwik Help]')
   ```

2. `PROMPT [note]` (Available commands display):

   ```
   action:    clack note listing all commands where showInHelp: true
   format:    one line per command — '{pmRun} qwik {label}{padding}{dim(hint)}'
   ```

3. `PROMPT [confirm]`:

   ```
   message:   'Do you want to run a command?'
   initialValue: true
   cancel:    bye()
   No:        bye()
   ```

4. `PROMPT [select]`:

   ```
   message:   'Select a command'
   options:   same showInHelp: true commands as the note above
   cancel:    bye()
   ```

5. Runs selected command recursively via `runCommand()`.

### Side Effects

No file-system or install side effects. Help recursively invokes `runCommand()` with
the user-selected command, which may itself produce side effects.

---

## qwik version

**Source:** `packages/qwik/src/cli/run-qwik-command.ts` (version handler)

### Prompts

None. `qwik version` is non-interactive.

### Side Effects

1. `EFFECT [output]`:

   ```
   action:    console.log((globalThis as any).QWIK_VERSION)
   detail:    prints the single version string; no additional newline handling
   ```

2. Returns normally — no `process.exit` call.

---

## qwik migrate-v2

**Source:** `packages/qwik/src/cli/migrate-v2/run-migration.ts`,
`packages/qwik/src/cli/migrate-v2/update-dependencies.ts`,
`packages/qwik/src/cli/migrate-v2/replace-package.ts`,
`packages/qwik/src/cli/migrate-v2/rename-import.ts`,
`packages/qwik/src/cli/migrate-v2/versions.ts`

### Prompts

1. `PROMPT [intro]` (banner):

   ```
   action:    clack intro(multi-line string)
   content:   '✨  [This command will migrate your Qwik application from v1 to v2]
               This includes the following:
                 - "@qwik.dev/core", "@qwik.dev/router" and "@qwik.dev/react"
                   packages will be rescoped to "@qwik.dev/core", "@qwik.dev/router" and
                   "@qwik.dev/react" respectively
                 - related dependencies will be updated
               [Warning: migration tool is experimental and will migrate your application
                to the "alpha" release of Qwik V2]'
   style:     label in bgMagenta; warning text in bgRed bold
   ```

2. `PROMPT [confirm]`:
   ```
   message:      'Do you want to proceed?'
   initialValue: true
   cancel:       bye()
   No:           bye()
   ```

### Side Effects (in order)

**Step 1 — Install ts-morph (conditional)**

```
EFFECT [install]: installTsMorph()
  reads:     process.cwd()/package.json
  condition: ts-morph NOT in dependencies or devDependencies
  action:    adds 'ts-morph': '23' to devDependencies, writes package.json, runs install
  returns:   true if ts-morph was installed; false if already present
  spinner:   'Fetching migration tools..' → 'Migration tools have been loaded'
  on failure: propagates error → panic() → process.exit(1)
```

**Step 2 — AST import rename (ts-morph)**

```
EFFECT [file-mutation]: replaceImportInFiles()
  tool:      ts-morph Project, parses all .ts and .tsx files
  scope:     visitNotIgnoredFiles from '.' — respects .gitignore (gitignored files skipped)

  Round A — from '@qwik.dev/router' imports:
    QwikCityProvider             → QwikRouterProvider
    qwikCity                     → qwikRouter
    QwikCityVitePluginOptions    → QwikRouterVitePluginOptions
    QwikCityPlugin               → QwikRouterPlugin
    createQwikCity               → createQwikRouter
    QwikCityNodeRequestOptions   → QwikRouterNodeRequestOptions

  Round B — from '@qwik-router-config' imports:
    qwikCityPlan                 → qwikRouterConfig

  Round C — from '@qwik.dev/core' imports:
    jsxs                         → jsx

  Per file: renames both named import declarations AND all identifier usages in the file.
  Saves file synchronously if any changes were made.
  Logs: log.info('Updated imports in {filePath}') for each modified file.
```

**Step 3 — Text-replacement package renaming**

```
EFFECT [file-mutation]: replacePackage() × 5 calls (in this exact order)

  Each call traverses: visitNotIgnoredFiles from '.'
  Each call skips:     binary files (isBinaryPath check)
                       yarn.lock, package-lock.json, pnpm-lock.yaml, bun.lockb, CHANGELOG.md

  Call 1: '@qwik-router-config' → '@qwik-router-config'
    skipDependencies: true (text replacement in source files only; NOT in package.json
                            dependency key names)
    Note: the package.json key rename for @qwik-router-config happens via the @qwik.dev/router
          → @qwik.dev/router rename in Call 2 (they share the same package.json entry)

  Call 2: '@qwik.dev/router' → '@qwik.dev/router'
    In package.json files: renames key in dependencies, devDependencies,
                           peerDependencies, optionalDependencies
    In all other files:    global string replace

  Call 3: '@qwik.dev/react' → '@qwik.dev/react'
    Same behavior as Call 2.

  Call 4: '@qwik.dev/core' → '@qwik.dev/core'
    Same behavior as Call 2.

  Call 5: '@qwik.dev/core' → '@qwik.dev/core'
    Same behavior as Call 2.
    MUST be last — '@qwik.dev/core' is a substring of '@qwik.dev/router',
    '@qwik.dev/react', and '@qwik.dev/core'. Running it first
    would corrupt those package names before they are replaced.

  Version retention: the version string for renamed dependency keys is preserved
    through Step 3. It will be overwritten by Step 5.
```

**Step 4 — Remove ts-morph (conditional)**

```
EFFECT [file-mutation]: removeTsMorphFromPackageJson()
  condition: installedTsMorph === true (ts-morph was NOT already present before Step 1)
  action:    deletes ts-morph from both dependencies and devDependencies in package.json,
             writes package.json to disk
  no-op if:  ts-morph was already present before migration began
```

**Step 5 — Update dependency versions**

```
EFFECT [network + install]: updateDependencies()
  reads:    process.cwd()/package.json
  network:  execSync('npm dist-tag @qwik.dev/core') — synchronous npm call
            Note: npm is always used for the dist-tag query regardless of the
            project's detected package manager.

  version selection algorithm:
    1. Parse npm dist-tag output into { tag: version } map
    2. Sort tags by versionTagPriority: ['latest', 'v2', 'rc', 'beta', 'alpha']
       (unknown tags sort to Infinity — after all known tags)
    3. Select first tag where semver.major(version) === 2
    4. Fallback if no v2 tag found: '2.0.0'
    5. On fallback, logs warning:
       'Failed to resolve the Qwik version tag, version "2.0.0" will be installed'

  packages updated: @qwik.dev/core, @qwik.dev/router, @qwik.dev/react, eslint-plugin-qwik
  sections updated: dependencies, devDependencies, peerDependencies, optionalDependencies
    (only sections where the package is already present are updated)

  writes:   process.cwd()/package.json
  install:  runs installDeps(pkgManager, cwd()) — uses the project's detected package manager
  spinner:  'Updating dependencies...' → 'Dependencies have been updated'
  on failure: propagates error → panic() → process.exit(1)
```

**On success:**

```
log.success('Your application has been successfully migrated to v2!')
```

**On error:**

```
console.error(error)
throw error  — propagates to runCli() → panic(String(e)) → process.exit(1)
```

### Noted Disabled Code

The `updateConfigurations()` call is commented out in `run-migration.ts`:

```typescript
// COMMENTED OUT FOR NOW (as this is fixed in https://github.com/QwikDev/qwik/pull/7159)
// updateConfigurations();
```

A future `@qwik.dev/cli` must NOT assume this step runs. If configuration file
migration is still needed, it must be re-evaluated and re-implemented explicitly.

### Migration Invariants

The following behavioral invariants must hold for any future CLI implementation:

1. **ts-morph is a runtime-installed tool** — it is NOT a permanent devDependency of
   the CLI or the user's project. It is installed for the duration of the migration
   and removed afterward (if it was not already present).

2. **npm is always used for the dist-tag query** — even if the project uses yarn, pnpm,
   or bun. `execSync('npm dist-tag @qwik.dev/core')` is hardcoded.

3. **`@qwik.dev/core` replacement must run LAST** among the 5 replacePackage calls —
   because it is a substring of the other three package names. Order matters.

4. **Version strings are preserved through Step 3** — package.json dependency version
   values are not changed when keys are renamed. They are overwritten in Step 5.

5. **Migration runs from `process.cwd()`**, not from `app.rootDir` — this is a
   significant distinction for future CLI extraction. All file operations in Steps 1–5
   use `process.cwd()` as the root, not the resolved app root that other subcommands use.

---

## Cross-Subcommand Notes

### `bye()` behavior

```
clack outro('Take care, see you soon! 👋')
process.exit(0)
```

Called when the user cancels a prompt or selects "No" on a confirmation. Every cancellable
prompt uses `bye()` as its cancel handler.

### `panic(msg)` behavior

```
console.error('\n❌ ' + msg + '\n')
process.exit(1)
```

Called on unrecoverable errors. Error message is prefixed with `❌` and surrounded by
blank lines for visual clarity.

### Package manager detection

```
detectPackageManager()?.name || 'pnpm'
```

Package manager is auto-detected from the project; defaults to `pnpm` if detection fails.
The only exception is the `npm dist-tag` network call in `migrate-v2` Step 5, which always
uses `npm` regardless of detection result.
