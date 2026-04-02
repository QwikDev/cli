# CQW-TEMPLATE-BOOTSTRAP: Template Bootstrapping Model and Post-Selection Side Effects

> **Status:** Verified against source
> **Commit:** b197b4220 (build/v2 branch)
> **Verified:** 2026-04-01
> **Scope:** `create-qwik` interactive and non-interactive paths — template selection through project creation

---

## Source Files

| File                                                     | Purpose                                                                                                                                             |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/create-qwik/src/helpers/templateManager.ts`    | `makeTemplateManager()`, `getBootstrapApps()`, `LIBRARY_ID`, `BASE_ID`, `standaloneTemplates`                                                       |
| `packages/create-qwik/src/create-app.ts`                 | `createApp()`, `createFromStarter()`, `validateOptions()`                                                                                           |
| `packages/qwik/src/cli/add/update-app.ts`                | `updateApp()`, `commit()`                                                                                                                           |
| `packages/qwik/src/cli/add/update-files.ts`              | `mergeIntegrationDir()`, `getFinalDestPath()`, `mergePackageJsons()`, `mergeReadmes()`, `mergeIgnoresFile()`, `mergeCss()`, `mergeVSCodeSettings()` |
| `packages/qwik/src/cli/utils/integrations.ts`            | `loadIntegrations()`, integration data shape                                                                                                        |
| `packages/qwik/src/cli/utils/install-deps.ts`            | `backgroundInstallDeps()`, `installDeps()`, `setupTmpInstall()`                                                                                     |
| `packages/create-qwik/src/run-create-interactive-cli.ts` | Interactive CLI flow, git-init sequence, dep install steps                                                                                          |
| `packages/qwik/src/cli/types.ts`                         | `IntegrationData`, `FsUpdates`, `UpdateAppOptions`, `CreateAppResult`                                                                               |
| `packages/qwik/src/cli/utils/utils.ts`                   | `getPackageManager()`, `cleanPackageJson()`, `dashToTitleCase()`                                                                                    |
| `packages/create-qwik/src/helpers/logAppCreated.ts`      | `logAppCreated()` — final output and next-steps                                                                                                     |

---

## Template Manager: `makeTemplateManager('app')`

### `loadIntegrations()` Call

`makeTemplateManager` calls `loadIntegrations()` once (module-level singleton: result cached in `integrations` variable after first call).

`loadIntegrations()` reads `dist/starters/apps/*` directories from the filesystem relative to the CLI's `__dirname`. It looks for subdirectories in `starters/apps/`, `starters/features/`, and `starters/adapters/`. Only items where the directory name corresponds to a recognized `IntegrationType` (`'app'`, `'feature'`, `'adapter'`) are loaded.

### Integration Data Shape (`IntegrationData`)

| Field          | Source                                                          | Default if missing    |
| -------------- | --------------------------------------------------------------- | --------------------- |
| `id`           | Directory name (e.g., `base`, `empty`, `library`)               | —                     |
| `type`         | Parent directory name minus trailing `s` (e.g., `apps` → `app`) | —                     |
| `name`         | `pkgJson.__qwik__?.displayName ?? dashToTitleCase(id)`          | `dashToTitleCase(id)` |
| `dir`          | Absolute path to the starter directory                          | —                     |
| `pkgJson`      | Parsed `package.json` from `dir`                                | —                     |
| `docs`         | `pkgJson.__qwik__?.docs ?? []`                                  | `[]`                  |
| `priority`     | `pkgJson.__qwik__?.priority ?? 0`                               | `0`                   |
| `alwaysInRoot` | `pkgJson.__qwik__?.alwaysInRoot ?? []`                          | `[]`                  |
| `target`       | Set externally before `backgroundInstallDeps()`                 | `undefined`           |

`dashToTitleCase` splits on `-`, capitalizes each segment (e.g., `qwik-router` → `Qwik Router`).

Integrations are sorted by `priority` descending, then alphabetically by `id` ascending.

### Template Filtering

After `loadIntegrations()`, `makeTemplateManager` derives two arrays:

```
templates = integrations.filter(i => i.type === 'app')
standaloneTemplates = templates.filter(i => i.id !== BASE_ID)
// BASE_ID = 'base'
```

`standaloneTemplates` is the list shown in the interactive starter selection prompt. The `base` integration exists only as an invisible foundation — it is never presented to the user directly.

### Constants

| Constant     | Value       |
| ------------ | ----------- |
| `LIBRARY_ID` | `'library'` |
| `BASE_ID`    | `'base'`    |

---

## `getBootstrapApps(id)`: Two Bootstrapping Paths

### `getAppById()` Helper

```
getAppById(id, isStandaloneInstallable = true)
  if isStandaloneInstallable: search standaloneTemplates only
  else: search all templates (includes 'base')
```

### Path A: Regular Starters (all starters except `'library'`)

**Trigger:** `id !== LIBRARY_ID`

```
baseApp   = getAppById('base', false)  // searches ALL templates — finds base
starterApp = getAppById(id)            // searches standaloneTemplates only
```

**Errors:**

- If `baseApp` not found: `AppNotFoundError('base', standaloneTemplates)`
- If `starterApp` not found: `AppNotFoundError(id, standaloneTemplates)`

**Returns:** `{ baseApp, starterApp }`

**Result:** Both `baseApp` and `starterApp` are defined. The project will receive two file layers: base first, then starter on top.

### Path B: Library Starter (`id === 'library'`)

**Trigger:** `id === LIBRARY_ID`

```
libApp = getAppById('library')  // searches standaloneTemplates
```

**Error:**

- If `libApp` not found: `AppNotFoundError('library', standaloneTemplates)`

**Returns:** `{ baseApp: libApp }`

**Result:** Only one app; `starterApp` is `undefined`. The library starter is self-contained — it does NOT layer on top of base. `libApp` is returned as `baseApp` in the destructured result.

**Key distinction:** Library is self-contained; all other starters are a composition of base + starter overlay. This is the only bifurcation point in the bootstrapping model.

---

## `createApp()`: Validation and Directory Setup

```typescript
createApp({ appId, outDir, pkgManager, templateManager });
```

### Execution Order

1. `templateManager.getBootstrapApps(appId)` — resolves `{ baseApp, starterApp }` (Path A or B)
2. `validateOptions(opts)` — validates `outDir`
3. `if (!fs.existsSync(outDir))` → `fs.mkdirSync(decodeURIComponent(outDir), { recursive: true })`
4. `createFromStarter({ baseApp, starterApp, pkgManager, outDir })` — performs file composition
5. Returns `{ starterId: opts.appId, outDir, pkgManager, docs }`

### `validateOptions()`

| Condition                        | Throws                                   |
| -------------------------------- | ---------------------------------------- |
| `outDir` is empty or non-string  | `Error: Missing outDir`                  |
| `outDir` is not an absolute path | `Error: outDir must be an absolute path` |

### `outDir` Directory Creation

- Only creates the directory if it does not already exist (`!fs.existsSync(outDir)`)
- Applies URI decoding: `decodeURIComponent(outDir)` before `mkdirSync` — handles URL-encoded paths
- `{ recursive: true }` — creates all intermediate directories

### Return Value: `CreateAppResult`

```typescript
{
  starterId: string,  // the appId passed in (e.g., 'empty', 'library')
  outDir: string,     // absolute output directory
  pkgManager: string, // 'npm' | 'pnpm' | 'yarn' | 'deno' etc.
  docs: string[],     // documentation URLs from base.docs + starter.docs
}
```

---

## `createFromStarter()`: File Composition

### Pre-Composition: Package.json Initialization

Before any `updateApp()` calls, a minimal `package.json` is written to `outDir`:

```typescript
appInfo = starterApp ?? baseApp; // starter if two-phase; base/library if library path

appPkgJson = cleanPackageJson({
  ...baseApp.pkgJson, // base fields as foundation
  name: `my-${appInfo.pkgJson.name}`, // name prefixed with 'my-'
  description: appInfo.pkgJson.description, // description from starter (or base/library)
  scripts: undefined, // stripped — re-added by mergeIntegrationDir
  dependencies: undefined, // stripped — re-added by mergeIntegrationDir
  devDependencies: undefined, // stripped — re-added by mergeIntegrationDir
});
writePackageJson(outDir, appPkgJson);
```

`cleanPackageJson()` retains only a specific allowlist of fields: `name`, `version`, `description`, `scripts`, `dependencies`, `devDependencies`, `main`, `qwik`, `module`, `types`, `exports`, `files`, `engines`. Any extra fields from `baseApp.pkgJson` are stripped. The `__qwik__` key is always deleted. `engines` defaults to `'^18.17.0 || ^20.3.0 || >=21.0.0'` if not specified.

Since `scripts`, `dependencies`, and `devDependencies` are set to `undefined` in the spread, they are stripped from the initial write — only the non-dep metadata fields from base are preserved as the starting point.

### Pre-Composition: Empty README

```typescript
fs.promises.writeFile(join(outDir, "README.md"), "");
```

An empty `README.md` is written before `updateApp()` runs. This ensures `mergeReadmes()` sees an existing (empty) file and uses `type: 'modify'` semantics.

### Base Layer Application (Both Paths)

```typescript
baseUpdate = await updateApp(pkgManager, {
  rootDir: outDir,
  integration: baseApp.id, // 'base' for Path A, 'library' for Path B
  installDeps: false,
});
await baseUpdate.commit(false); // false = no spinner
```

This writes all files from the base (or library) starter directory into `outDir` via `mergeIntegrationDir()`.

### Starter Overlay Application (Path A Only)

```typescript
if (starterApp) {
  docs.push(...starterApp.docs);

  starterUpdate = await updateApp(pkgManager, {
    rootDir: outDir,
    integration: starterApp.id,
    installDeps: false,
  });
  await starterUpdate.commit(false);
}
```

The starter's files are merged on top of the base layer. Conflicts are resolved by `mergeIntegrationDir()` rules (see below).

### `docs` Array Assembly

| Path             | docs contents                                                                   |
| ---------------- | ------------------------------------------------------------------------------- |
| Path A (regular) | `[...baseApp.docs, ...starterApp.docs]`                                         |
| Path B (library) | `[...libApp.docs]` (initialized as `[...baseApp.docs]` where baseApp is libApp) |

The `docs` array is returned from `createFromStarter()` and included in `CreateAppResult.docs`.

---

## `updateApp()` Internals

`updateApp(pkgManager, opts)` loads the integration by `opts.integration` id, builds a `FsUpdates` object, runs `mergeIntegrationDir()`, then returns a `{ commit }` function.

### `installedDeps` Population

Only populated when `opts.installDeps === true`. In `createFromStarter()`, `installDeps` is always `false`, so `fileUpdates.installedDeps` is always `{}` during app creation.

### `commit(showSpinner?)` Execution

1. Collect unique parent directories from all `fileUpdates.files`
2. For each directory: `fs.mkdirSync(dir, { recursive: true })` — silently ignores errors
3. `Promise.all(fileUpdates.files.map(f => fs.promises.writeFile(f.path, f.content)))` — all writes in parallel
4. If `installDeps && installedDeps` is non-empty: `installDeps(pkgManager, rootDir)` — awaited
5. If `showSpinner`: show/stop spinner

In `createFromStarter()`, `commit(false)` is called — no spinner shown, no dep install performed.

---

## `mergeIntegrationDir()`: File Operation Decision Table

`mergeIntegrationDir` recursively traverses the integration's source directory and for each file determines the operation and destination path.

### File Type Decision Table

| Condition                                                               | Handler                                                  | Result type                                                       |
| ----------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| Item is a directory                                                     | Recurse into `mergeIntegrationDir()`                     | (no file record)                                                  |
| `itemName === 'gitignore'`                                              | Rename destination to `.gitignore`                       | (applies matching rule below)                                     |
| `destName === 'package.json'`                                           | `mergePackageJsons()` — merge scripts/deps into existing | `'modify'` (always; falls back to `'create'` if dest parse fails) |
| `destDir.endsWith('.vscode') && destName === 'settings.json'`           | `mergeVSCodeSettings()` — JSON5-aware merge              | `'modify'` (falls back to `'create'` if parse fails)              |
| `destName === 'README.md'`                                              | `mergeReadmes()` — append src to dest                    | `'modify'` if dest exists; `'create'` if not                      |
| `destName === '.gitignore'` or `'.prettierignore'` or `'.eslintignore'` | `mergeIgnoresFile()` — deduplicate-append                | `'modify'` if dest exists; `'create'` if not                      |
| `ext === '.css'` and `installDeps === false` (new project)              | `mergeCss()` — use src content (overwrite)               | `'overwrite'` (dest existed but overwritten with src)             |
| `ext === '.css'` and `installDeps === true` (adding library)            | `mergeCss()` — prepend src before dest                   | `'modify'`                                                        |
| `ext === '.css'` and dest does not exist                                | `mergeCss()` — copy src                                  | `'create'`                                                        |
| File exists at `finalDestPath`                                          | Generic overwrite                                        | `'overwrite'`                                                     |
| File does not exist at `finalDestPath`                                  | Generic create                                           | `'create'`                                                        |

**Note:** `mergeIntegrationDir` uses `Promise.all` — all items in a directory are processed concurrently.

### `getFinalDestPath()`: `alwaysInRoot` Mechanism

```
projectDir = opts.projectDir ?? ''
destChildPath = join(opts.rootDir, projectDir, destWithoutRoot, destName)

finalDestPath =
  alwaysInRoot.some(rootItem => destName.includes(rootItem) || destDir.includes(rootItem))
    ? destRootPath          // write directly to rootDir, ignoring projectDir
    : destChildPath         // write to rootDir + projectDir + relative path
```

`alwaysInRoot` entries in `__qwik__` cause matching files/directories to be written to `opts.rootDir` regardless of `opts.projectDir`. This is relevant for `qwik add` scenarios with `--projectDir`; app starters typically do not set `alwaysInRoot`.

**Important:** `package.json`, `.gitignore`, and `README.md` merges use `destRootPath` (not `finalDestPath`) for their destination — these handlers receive `destRootPath` directly and bypass the `getFinalDestPath()` result.

### `mergePackageJsons()` Detail

```
props = ['scripts', 'dependencies', 'devDependencies']
for each prop:
  mergePackageJsonSort(srcPkgJson, destPkgJson, prop)
```

`mergePackageJsonSort()` behavior:

- If `src[prop]` is defined: `Object.assign(dest[prop], src[prop])` — src keys overwrite dest keys of same name
- After merge, all keys in `dest[prop]` are sorted alphabetically
- Special case: after all sorting, if `destPkgJson.scripts.qwik` exists — it is deleted and re-added at the end (moved to last position regardless of alphabetical order)
- Result serialized as `JSON.stringify(destPkgJson, null, 2) + '\n'`
- If dest `package.json` cannot be parsed (catch block): src content is used as-is with `type: 'create'`

### `mergeReadmes()` Detail

```
if dest exists:
  destContent = destContent.trim() + '\n\n' + srcContent
  type = 'modify'
else:
  destContent = srcContent
  type = 'create'

if pkgManager !== 'npm':
  destContent = destContent.replace(/\b(npm run|pnpm run|yarn( run)?)\b/g, pkgManager)

push: destContent.trim() + '\n'
```

Package manager substitution replaces `npm run`, `pnpm run`, and `yarn run` / `yarn` with the detected `pkgManager` — but only when `pkgManager !== 'npm'` (npm is the default; no replacement needed).

### `mergeIgnoresFile()` Detail

```
if dest exists:
  srcLines = srcContent.trim().split(/\r?\n/)
  destLines = destContent.trim().split(/\r?\n/)
  for each srcLine not already in destLines:
    if srcLine.startsWith('#'):
      destLines.push('')     // blank line before comment headers
    destLines.push(srcLine)
  push: destLines.join('\n').trim() + '\n', type: 'modify'
else:
  push: srcContent, type: 'create'
```

Line deduplication is exact string match. Comment lines (starting with `#`) get a blank line prepended when appended to an existing file.

### `mergeCss()` Detail

```
if dest exists:
  mergedContent = srcContent.trim() + '\n\n' + destContent.trim() + '\n'
  if opts.installDeps === true:
    push: mergedContent, type: 'modify'   // adding library: src prepended before dest
  else:
    push: srcContent, type: 'overwrite'   // new project: src replaces dest entirely
else:
  push: srcContent, type: 'create'
```

The `opts.installDeps` flag distinguishes "new project initialization" (overwrite) from "library integration into existing project" (prepend).

### `mergeVSCodeSettings()` Detail

Uses `@croct/json5-parser` for JSON5-aware parsing. Calls `destPkgJson.merge(srcPkgJson)` — this merges src into dest in-place. Falls back to `type: 'create'` with raw src content if either file fails to parse.

---

## Background Install Mechanism (Interactive Path Only)

The background install is started immediately after the user enters the project directory name — before any other prompts — to overlap network I/O with the rest of the interactive questions.

### `setupTmpInstall(baseApp)`

```
tmpId = '.create-qwik-' + Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(36).toLowerCase()
tmpInstallDir = path.resolve(baseApp.target!, '..', tmpId)
  // sibling directory of the target (outDir), same filesystem mountpoint for fast rename

fs.mkdirSync(tmpInstallDir)  // on error: log.error with red message (non-fatal)

fs.copyFileSync(baseApp.dir/package.json, tmpInstallDir/package.json)
```

- `baseApp.target` must be set before calling `backgroundInstallDeps()`. In the interactive CLI, `baseApp.target = outDir` is set immediately after `resolveRelativeDir()`.
- `tmpId` format: `.create-qwik-` followed by a base-36 lowercase random string.
- The sibling placement ensures `node_modules` can be renamed (not copied) — requires same filesystem mountpoint.

### `backgroundInstallDeps(pkgManager, baseApp)`

```
{ tmpInstallDir } = setupTmpInstall(baseApp)
{ install, abort } = installDeps(pkgManager, tmpInstallDir)
  // installDeps = runCommand(pkgManager, ['install'], tmpInstallDir)
  // install: Promise<boolean>

out = {
  abort: () => abort().finally(() => fs.rmSync(tmpInstallDir, { recursive: true })),
  complete: async (outDir) => { ... },
  success: undefined,  // set to boolean when install resolves
}
install.then(success => out.success = success)
return out
```

`out.success` is `undefined` while install is running, then `true`/`false` after it resolves.

### `complete(outDir)`

```
installed = await install  // awaits the background install promise
if installed:
  rename tmpInstallDir/node_modules → outDir/node_modules
  try { rename tmpInstallDir/package-lock.json → outDir/package-lock.json } catch {}
  try { rename tmpInstallDir/yarn.lock → outDir/yarn.lock } catch {}
  try { rename tmpInstallDir/pnpm-lock.yaml → outDir/pnpm-lock.yaml } catch {}
  success = true
  fs.rmSync(tmpInstallDir, { recursive: true })
catch e:
  log.error(red(e.message) || red(String(e)))
  // falls through to failure block

if !success:
  log.error(bgRed(` ${pkgManager} install failed `) + hint to run manually)

return success
```

Lock file renames are attempted separately per file in individual try/catch blocks — a missing lock file (wrong package manager) does not stop the operation. `node_modules` rename is not individually try/caught; a failure there goes to the outer catch.

### `abort()`

```
abort().finally(() => fs.rmSync(tmpInstallDir, { recursive: true }))
```

Sends `SIGINT` to the child install process (via `execa`'s `child.kill('SIGINT')`), then cleans up `tmpInstallDir` when the process exits (regardless of how it exits).

### Interactive CLI Install Flow

The full install sequence in `runCreateInteractiveCli()`:

1. `backgroundInstall = backgroundInstallDeps(pkgManager, baseApp)` — starts immediately after project name input
2. All prompts run (starter selection, install deps?, git init?)
3. If user chose not to install: `backgroundInstall.abort()`
4. If user chose to install and `backgroundInstall.success === undefined` (still running): show joke prompt to buy time
5. `createApp()` runs — creates project files
6. Git init (if chosen)
7. `installDepsCli(() => backgroundInstall.complete(result.outDir).then(...))` — finalizes install
   - After `complete()` moves `node_modules`, runs `installDeps(pkgManager, result.outDir)` again to add the actual starter deps on top of base deps
8. `logAppCreated(pkgManager, result, successfulDepsInstall)`

---

## Git Initialization Sequence

Git init occurs in the interactive path only (`runCreateInteractiveCli`). It is not part of `createApp()` or the non-interactive path.

**Condition:** `gitInitAnswer === true` (user confirmed the `Initialize a new git repository?` prompt)

### Guard: `.git` Already Exists

```
if (fs.existsSync(join(outDir, '.git'))):
  log.info('Git has already been initialized before. Skipping...')
  // no git commands run
```

### Initialization Sequence (when .git does not exist)

```
1. s.start('Git initializing...')

2. res[0] = await runCommand('git', ['init'], outDir).install
3. res[1] = await runCommand('git', ['add', '-A'], outDir).install
4. res[2] = await runCommand('git', ['commit', '-m', 'Initial commit ⚡️'], outDir).install

5. if (res.some(r => r === false)):
     throw ''
   s.stop('Git initialized 🎲')

catch (e):
   s.stop('Git failed to initialize')
   log.error(red('Git failed to initialize. You can do this manually by running: git init'))
```

`runCommand()` returns `Promise<boolean>` — `true` on process exit 0, `false` on any error. All three commands are awaited sequentially. If any returns `false`, `throw ''` triggers the catch block.

**Non-fatal:** Git failure does not terminate the CLI. Execution continues to the dependency install step. The user is instructed to run `git init` manually.

**Commit message:** `'Initial commit ⚡️'` — exact string including the lightning bolt emoji.

---

## Package Manager Detection

### `getPackageManager()`

```typescript
// packages/qwik/src/cli/utils/utils.ts
export function getPackageManager() {
  return detectPackageManager()?.name || "pnpm";
}
```

- `detectPackageManager()` comes from the `which-pm-runs` npm package
- Returns `{ name: string }` if a package manager is detected from the process environment, or `undefined`
- Default: `'pnpm'` if detection returns `undefined`

### Supported Package Managers

Any value `which-pm-runs` returns is used as-is. The CLI has explicit handling for:

| Package manager               | Special behavior                                                             |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `npm`                         | `pmRunCmd()` returns `'npm run'` (not just `'npm'`)                          |
| `deno`                        | `logAppCreated()` outputs `deno task start` instead of `${pkgManager} start` |
| Others (`pnpm`, `yarn`, etc.) | No special cases; `pkgManager` used directly                                 |

### Where Package Manager Is Used

| Usage                          | Effect                                                            |
| ------------------------------ | ----------------------------------------------------------------- |
| `installDeps(pkgManager, dir)` | Runs `pkgManager install`                                         |
| `mergeReadmes()`               | Replaces `npm run`/`pnpm run`/`yarn run` in README content        |
| `logAppCreated()`              | Next-steps output: `cd`, `pkgManager install`, `pkgManager start` |
| Prompts                        | `Would you like to install ${pkgManager} dependencies?`           |
| Error messages                 | `${pkgManager} install failed`                                    |

---

## Verified from Source

All behaviors documented above are verified against the actual source code at commit `b197b4220` on branch `build/v2` (2026-04-01).

**Key verification points:**

- `getBootstrapApps()`: library path returns `{ baseApp: libApp }` with no `starterApp` — confirmed in `templateManager.ts` lines 47-55
- `cleanPackageJson()` strips `scripts`/`dependencies`/`devDependencies` when passed `undefined` — confirmed in `utils.ts`; the spread `...baseApp.pkgJson` provides base fields; then named overrides set them to `undefined`
- `mergeReadmes()` always appends (not prepends) src after dest — `destContent.trim() + '\n\n' + srcContent` — confirmed in `update-files.ts` line 164
- `.css` overwrite vs. modify decision is `opts.installDeps === true` check — confirmed in `update-files.ts` line 226
- `backgroundInstallDeps` uses separate try/catch per lock file rename — confirmed in `install-deps.ts` lines 37-58
- Git commit message is exactly `'Initial commit ⚡️'` — confirmed in `run-create-interactive-cli.ts` line 154
- `getPackageManager()` default is `'pnpm'`, not `'npm'` — confirmed in `utils.ts` line 107
- `deno task start` special case confirmed in `logAppCreated.ts` lines 43-47
