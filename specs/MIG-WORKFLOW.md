# migrate-v2 Orchestration Workflow

**Behavioral spec for `qwik migrate-v2`**

Derived by source-inspecting `packages/qwik/src/cli/migrate-v2/*` on the `build/v2` branch at commit `bfe19e8d9` (2026-04-01). All behavioral claims are verifiable against the source files listed in the Source Files table.

---

## Source Files

| File Path                                                           | Purpose                                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `packages/qwik/src/cli/migrate-v2/run-migration.ts`                 | Top-level orchestration: confirmation gate, Step 1–5 sequence, disabled step                |
| `packages/qwik/src/cli/migrate-v2/update-dependencies.ts`           | Steps 1, 4, 5: `installTsMorph()`, `removeTsMorphFromPackageJson()`, `updateDependencies()` |
| `packages/qwik/src/cli/migrate-v2/rename-import.ts`                 | Step 2: `replaceImportInFiles()` — AST-based import rename via ts-morph                     |
| `packages/qwik/src/cli/migrate-v2/replace-package.ts`               | Step 3: `replacePackage()` — text-based package name replacement                            |
| `packages/qwik/src/cli/migrate-v2/versions.ts`                      | Step 5 support: `packageNames` array and `versionTagPriority` array                         |
| `packages/qwik/src/cli/migrate-v2/tools/visit-not-ignored-files.ts` | File traversal utility used by Steps 2 and 3                                                |
| `packages/qwik/src/cli/migrate-v2/tools/binary-extensions.ts`       | Binary file detection used in Step 3 Phase B                                                |

---

## Entry Point: runV2Migration(app)

**Signature:** `export async function runV2Migration(app: AppCommand)` in `run-migration.ts`

**Working root:** `process.cwd()` — all migration steps resolve paths and read/write files relative to the current working directory. `app` is NOT used as a working root.

**`app` usage:** The `AppCommand` parameter provides package manager detection context only (`getPackageManager()` reads from `app`). No path resolution is done through `app.rootDir` in any migration step.

**Precondition:** The function is invoked after the CLI dispatches the `migrate-v2` command. The user's terminal must be in the project root they wish to migrate.

**Important — monorepo behavior:** Because all steps use `process.cwd()` rather than `app.rootDir`, if `qwik migrate-v2` is run from a monorepo root, migration operates on the repo root's `package.json` and source files, not a sub-package. This is documented as an INVESTIGATE item in COMPATIBILITY-CONTRACT.md §Open Questions.

---

## Step 0 — Confirmation Gate

**Location:** `run-migration.ts`, before the `try` block

### Banner

```
intro(
  `✨  ${bgMagenta(' This command will migrate your Qwik application from v1 to v2')}\n` +
  `This includes the following: \n` +
  `  - "@qwik.dev/core", "@qwik.dev/router" and "@qwik.dev/react" packages will be rescoped to "@qwik.dev/core", "@qwik.dev/router" and "@qwik.dev/react" respectively \n` +
  `  - related dependencies will be updated \n\n` +
  `${bold(bgRed('Warning: migration tool is experimental and will migrate your application to the "alpha" release of Qwik V2'))}`
)
```

- Rendered with `@clack/prompts` `intro()`
- Package scope: `bgMagenta` on the first line; `bold(bgRed(...))` on the warning line

### Confirmation Prompt

```
const proceed = await confirm({
  message: 'Do you want to proceed?',
  initialValue: true,
});
```

- Default selection: `true` (Yes)

### Cancel / No Path

```typescript
if (isCancel(proceed) || !proceed) {
  bye();
}
```

- `bye()` calls `clack.outro('Take care, see you soon! 👋')` then `process.exit(0)`
- Exit code: `0` — cancellation is NOT treated as an error (MUST PRESERVE per COMPATIBILITY-CONTRACT.md)
- No migration steps run

### Yes Path

Enters the `try` block and executes Steps 1–5 in sequence.

---

## Step 1 — Install ts-morph (conditional)

**Function:** `installTsMorph()` in `update-dependencies.ts`

**Precondition:** `process.cwd()/package.json` must be readable.

**Guard — skip if already present:**

```typescript
if (packageJson.dependencies?.["ts-morph"] || packageJson.devDependencies?.["ts-morph"]) {
  return false;
}
```

If `ts-morph` is found in either `dependencies` or `devDependencies`, the function returns `false` immediately. No spinner, no install.

**When installing (ts-morph not present):**

1. Spinner starts: `'Fetching migration tools..'`
2. Sets `packageJson.devDependencies['ts-morph'] = '23'` (using `??=` to create `devDependencies` if absent)
3. Writes `package.json` to `process.cwd()`
4. Calls `runInstall()` → `installDeps(getPackageManager(), process.cwd())` using the detected package manager
5. Spinner stops: `'Migration tools have been loaded'`
6. Returns `true`

**Returns:** `true` if ts-morph was installed by this step; `false` if it was already present.

**On failure:** `runInstall()` throws `Error('Failed to install dependencies')`. This propagates out of `installTsMorph()` → reaches the outer `catch` in `run-migration.ts` → `console.error(error); throw error;` → caller calls `panic(String(e))` → `process.exit(1)`.

**Postcondition:** `ts-morph` version `23` is resolvable as a module from `process.cwd()`.

---

## Step 2 — AST Import Rename (ts-morph)

**Function:** `replaceImportInFiles(changes, library)` in `rename-import.ts`

**Dynamic import:** Step 2 is reached via:

```typescript
const { replaceImportInFiles } = await import("./rename-import");
```

This dynamic import ensures Step 1's install has completed before ts-morph is loaded.

**File scope:** All `.ts` and `.tsx` files found by `visitNotIgnoredFiles('.')`. Other file extensions are filtered out early:

```typescript
if (!path.endsWith(".ts") && !path.endsWith(".tsx")) {
  return;
}
```

**Three invocations in source order:**

| Round | Library                 | Changes                                                                                                                                                                                                                                                                        |
| ----- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A     | `'@qwik.dev/router'`    | `QwikCityProvider` → `QwikRouterProvider`, `qwikCity` → `qwikRouter`, `QwikCityVitePluginOptions` → `QwikRouterVitePluginOptions`, `QwikCityPlugin` → `QwikRouterPlugin`, `createQwikCity` → `createQwikRouter`, `QwikCityNodeRequestOptions` → `QwikRouterNodeRequestOptions` |
| B     | `'@qwik-router-config'` | `qwikCityPlan` → `qwikRouterConfig`                                                                                                                                                                                                                                            |
| C     | `'@qwik.dev/core'`      | `jsxs` → `jsx`                                                                                                                                                                                                                                                                 |

**Per-file processing:**

1. Each `.ts`/`.tsx` file is added to a ts-morph `Project` via `project.addSourceFileAtPath(path)`
2. For each source file: checks all `importDeclarations`
3. Match condition: `importDeclaration.getModuleSpecifierValue().startsWith(library)` — uses `startsWith`, not exact match, so nested subpath imports (e.g., `@qwik.dev/router/middleware`) also match
4. For each matching import declaration: renames named import specifiers where `namedImport.getName() === oldImport` → `namedImport.setName(newImport)`
5. For each source file: also scans ALL `Identifier` descendants (not limited to import declarations) and renames any that match an old import name

**Save and log:**

```typescript
if (hasChanges) {
  sourceFile.saveSync();
  log.info(`Updated imports in ${sourceFile.getFilePath()}`);
}
```

Files with no changes are not written.

**Postcondition:** All `.ts`/`.tsx` files have v2 import names for identifiers sourced from the 3 renamed packages.

---

## Step 3 — Text-Replacement Package Renaming

**Function:** `replacePackage(oldName, newName, skipDependencies?)` in `replace-package.ts`

**Note:** `replacePackage` is synchronous (not `async`). However, because it calls `visitNotIgnoredFiles` which is async, Step 3 actually uses the sync-wrapped form. Looking at the source: `replace-package.ts` calls `visitNotIgnoredFiles` which returns a `Promise`, but `replacePackage` itself is declared as `void`. In practice, the promises from internal calls to `visitNotIgnoredFiles` inside `replacePackageInDependencies` and `replaceMentions` are not awaited — these traversals run synchronously through their `readdirSync` / `readFileSync` calls. The `visitNotIgnoredFiles` call at Step 3's level is not awaited in `run-migration.ts`.

**Five invocations in exact order:**

| Call | Old Name              | New Name              | skipDependencies  |
| ---- | --------------------- | --------------------- | ----------------- |
| 1    | `@qwik-router-config` | `@qwik-router-config` | `true`            |
| 2    | `@qwik.dev/router`    | `@qwik.dev/router`    | `false` (default) |
| 3    | `@qwik.dev/react`     | `@qwik.dev/react`     | `false` (default) |
| 4    | `@qwik.dev/core`      | `@qwik.dev/core`      | `false` (default) |
| 5    | `@qwik.dev/core`      | `@qwik.dev/core`      | `false` (default) |

**Ordering constraint:** Call 5 (`@qwik.dev/core`) MUST be last because its name is a substring of calls 2, 3, and 4. Running it earlier would incorrectly match and rename those packages. The source comment reads: `// "@qwik.dev/core" should be the last one because it's name is a substring of the package names above`.

**Phase A — replacePackageInDependencies() (runs when !skipDependencies):**

- Traverses all files via `visitNotIgnoredFiles('.')`
- Filters to only `package.json` files: `if (basename(path) !== 'package.json') return`
- For each `package.json`: parses JSON, checks `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`
- If `oldPackageName in deps`: sets `deps[newPackageName] = deps[oldPackageName]`, then `delete deps[oldPackageName]` — the version value is preserved unchanged
- Writes the updated JSON back with `JSON.stringify(packageJson, null, 2)` and logs `'"${path}" has been updated'`
- On parse error: catches and warns `Could not replace ${oldPackageName} with ${newPackageName} in ${path}.`

**Phase B — replaceMentions() (always runs):**

Ignored files (skipped entirely):

- Binary files: `if (isBinaryPath(path)) return`
- Lock files and CHANGELOG: `yarn.lock`, `package-lock.json`, `pnpm-lock.yaml`, `bun.lockb`, `CHANGELOG.md`

For all other files:

- Reads file contents as UTF-8
- If content does not include `oldPackageName`: skips (no write)
- If content includes `oldPackageName`: replaces all occurrences using `new RegExp(oldPackageName, 'g')` and writes the file
- On read/write error: warns `An error was thrown when trying to update ${path}...` but continues

**Postcondition:** All old package name strings in all non-lockfile, non-binary files are replaced with new names. All `package.json` dependency section keys are renamed. Version values are unchanged.

---

## Step 4 — Remove ts-morph (conditional)

**Function:** `removeTsMorphFromPackageJson()` in `update-dependencies.ts`

**Condition:** Only executes if `installedTsMorph === true` (i.e., ts-morph was NOT already present before Step 1):

```typescript
if (installedTsMorph) {
  await removeTsMorphFromPackageJson();
}
```

**Action:**

```typescript
const packageJson = await readPackageJson(process.cwd());
delete packageJson.dependencies?.["ts-morph"];
delete packageJson.devDependencies?.["ts-morph"];
await writePackageJson(process.cwd(), packageJson);
```

**Important:** No install or uninstall command is run. Only `package.json` is rewritten. The `ts-morph` package remains in `node_modules` until the next install run (which occurs in Step 5).

**Postcondition:** `ts-morph` entry is absent from `package.json`. The user's `package.json` has no net change to their original dependency set.

---

## Disabled Step: updateConfigurations()

**Location:** Commented out in `run-migration.ts`, between Step 4 and Step 5:

```typescript
// COMMENTED OUT FOR NOW 👇 (as this is fixed in https://github.com/QwikDev/qwik/pull/7159)
// updateConfigurations();
```

**Behavioral contract:** This step does NOT run in any migration today. A future `@qwik.dev/cli` MUST NOT assume this step runs.

**Risk:** If configuration file migration was needed for edge cases not covered by PR #7159, those cases are silently skipped. There is no warning to the user that configuration migration was skipped.

---

## Step 5 — Update Dependency Versions

**Function:** `updateDependencies()` in `update-dependencies.ts`

**Precondition:** `process.cwd()/package.json` exists and is readable.

**Packages updated:** `packageNames` from `versions.ts` — the 4 packages: `@qwik.dev/core`, `@qwik.dev/router`, `@qwik.dev/react`, `eslint-plugin-qwik`.

**Version resolution:**

1. Calls `npm dist-tag @qwik.dev/core` via `execSync` (hardcoded npm — does NOT use the project's package manager)
2. Parses the `tag: version` output lines
3. Sorts by `versionTagPriority` from `versions.ts`
4. Iterates sorted tags; returns the first tag whose version has `major(version) === 2`
5. Fallback: if no v2 tag found, logs a warning and returns `'2.0.0'`

**Dependency update:** For each of the 4 package names, updates the version string in all 4 dep sections (`dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`) if the key is already present. Does not add new keys.

**Spinner:**

- Start: `'Updating dependencies...'`
- Stop: `'Dependencies have been updated'`

**Install:** Calls `runInstall()` → `installDeps(getPackageManager(), process.cwd())`. This second install run also cleans up `ts-morph` from `node_modules` if it was added ephemerally in Step 1 and removed from `package.json` in Step 4.

**Postcondition:** `@qwik.dev/core`, `@qwik.dev/router`, `@qwik.dev/react`, `eslint-plugin-qwik` all have the resolved v2 version string in `package.json`. Install has run with the updated dependencies.

---

## Success / Error Paths

### Success

After all 5 steps complete without throwing:

```typescript
log.success(`${green(`Your application has been successfully migrated to v2!`)}`);
```

### Error

Any step that throws propagates to the outer `catch`:

```typescript
catch (error) {
  console.error(error);
  throw error;
}
```

The re-thrown error reaches `runCli()` → `panic(String(e))` → `process.exit(1)`.

There is no partial-recovery or rollback mechanism. If Step 3 fails partway through, files already modified by earlier replacePackage calls are NOT reverted.

---

## process.cwd() vs app.rootDir

| Property        | Value                                                                               | Usage                                                     |
| --------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `process.cwd()` | Shell's current directory at CLI invocation                                         | All migrate-v2 steps use this as the working root         |
| `app.rootDir`   | Directory resolved by walking up from `process.cwd()` to the nearest `package.json` | Used by all other CLI subcommands (add, build, new, etc.) |

**Why it matters:** In a standard project, `process.cwd()` and `app.rootDir` resolve to the same directory. In a monorepo, they may differ: if `qwik migrate-v2` is run from the repo root, all migration steps operate on the repo root's `package.json` and source files, not the sub-package. This is classified as INVESTIGATE in COMPATIBILITY-CONTRACT.md §Open Questions #2.

---

## File Traversal: visitNotIgnoredFiles(dirPath, visitor)

**Source:** `packages/qwik/src/cli/migrate-v2/tools/visit-not-ignored-files.ts`

**Signature:** `async function visitNotIgnoredFiles(dirPath: string, visitor: (path: string) => void): Promise<void>`

**Call sites:** All migration steps call with `'.'` as `dirPath`.

### .gitignore Loading

Runs once per top-level `visitNotIgnoredFiles('.')` call (not per recursive call):

```typescript
const { default: ignore } = await import("ignore");
let ig: ReturnType<typeof ignore> | undefined;
if (existsSync(".gitignore")) {
  ig = ignore();
  ig.add(".git");
  ig.add(readFileSync(".gitignore", "utf-8"));
}
```

- If `.gitignore` exists at `process.cwd()/.gitignore`: creates an `ignore` instance, adds `.git` explicitly, adds the full `.gitignore` contents
- If no `.gitignore` exists: `ig` is `undefined` — no files are filtered at all (all files including `.git/` contents are visited)

**Note:** `.gitignore` is loaded from the current working directory of the process, not from `dirPath`. The `existsSync('.gitignore')` check is relative to `process.cwd()`.

### Traversal Algorithm

```typescript
dirPath = relative(process.cwd(), dirPath);
if (dirPath !== "" && ig?.ignores(dirPath)) {
  return;
}
const dirResults = readdirSync(join(process.cwd(), dirPath));
for (let i = 0; i < dirResults.length; i++) {
  const child = dirResults[i];
  const fullPath = join(dirPath, child);
  if (ig?.ignores(fullPath)) {
    continue;
  }
  if (lstatSync(fullPath).isFile()) {
    visitor(fullPath);
  } else {
    await visitNotIgnoredFiles(fullPath, visitor);
  }
}
```

Step by step:

1. Normalizes `dirPath` to be relative to `process.cwd()` via `relative()`
2. If the normalized `dirPath` is non-empty AND ignored: returns immediately (the root directory `'.'` normalizes to `''` and skips this check)
3. Reads directory contents synchronously via `readdirSync(join(process.cwd(), dirPath))`
4. For each child entry: constructs `fullPath = join(dirPath, child)` (relative to `process.cwd()`)
5. If `ig?.ignores(fullPath)`: skips the entry (no recursion into ignored directories)
6. If `lstatSync(fullPath).isFile()`: calls `visitor(fullPath)` — path is RELATIVE to `process.cwd()`
7. Else: recurses via `await visitNotIgnoredFiles(fullPath, visitor)`

**Key behaviors:**

- Paths passed to `visitor` are RELATIVE to `process.cwd()`, not absolute
- `lstatSync` is used (not `statSync`) — symlinks are NOT followed for the `isFile()` check; a symlink to a file will return `false` for `isFile()` and will be recursed into as a directory
- If `ig` is undefined (no `.gitignore`), the `?.ignores()` calls short-circuit to `undefined` (falsy), so no entries are filtered

---

## Binary File Detection: isBinaryPath(path)

**Source:** `packages/qwik/src/cli/migrate-v2/tools/binary-extensions.ts`

**Signature:** `export function isBinaryPath(path: string): boolean`

**Implementation:**

```typescript
return binaryExtensions.has(extname(path).toLowerCase());
```

- Uses a hardcoded `Set` of ~200 binary file extensions sourced from `sindresorhus/binary-extensions` (pinned commit `40e44b510d87a63dcf42300bc8fbcb105f45a61c`)
- Detection is extension-based only — does NOT read file contents or check magic bytes
- Extension comparison is lowercased

**Usage scope:**

- Used in: `replaceMentions()` (Step 3 Phase B) — binary files are skipped from text replacement
- NOT used in: `replacePackageInDependencies()` (Step 3 Phase A) — only `package.json` files are targeted there
- NOT used in: `replaceImportInFiles()` (Step 2) — `.ts`/`.tsx` filter already excludes binary files

**Extension note:** The `extname()` function returns the extension including the dot (e.g., `.png`). The `binaryExtensions` Set also stores extensions with the leading dot. The `isBinaryPath` function applies `.toLowerCase()` to handle mixed-case extensions.
