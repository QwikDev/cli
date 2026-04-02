---
spec: migrate-v2-mutation-rules
version: 1.0
branch: build/v2
commit: bfe19e8d9
verified_date: 2026-04-02
source_files:
  - packages/qwik/src/cli/migrate-v2/rename-import.ts
  - packages/qwik/src/cli/migrate-v2/replace-package.ts
  - packages/qwik/src/cli/migrate-v2/run-migration.ts
---

# MIG-MUTATION-RULES — migrate-v2 Import Rewrite and Package Substitution Rules

> Complete specification of every mutation applied by `migrate-v2`: AST import renames,
> package name substitutions, file skip rules, and package.json field mutation rules.
> A reader must be able to state every rule without running the migration or reading source code.

## Source Files

| File path                                             | Purpose                                                           |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| `packages/qwik/src/cli/migrate-v2/run-migration.ts`   | Orchestrator — calls all steps in sequence, defines all arguments |
| `packages/qwik/src/cli/migrate-v2/rename-import.ts`   | Step 2: ts-morph AST import rename implementation                 |
| `packages/qwik/src/cli/migrate-v2/replace-package.ts` | Step 3: text-replace package names, package.json key rename       |

---

## Part 1: AST Import Renames (Step 2 — ts-morph)

### Mechanism

**Tool:** ts-morph `Project` — dynamically imported (`await import('ts-morph')`) after ts-morph is installed by Step 1.

**Setup:** One `new Project()` is created. All `.ts` and `.tsx` files found by `visitNotIgnoredFiles('.')` are added via `project.addSourceFileAtPath(path)`. Only `.ts`/`.tsx` extensions are added — all other extensions are skipped by an explicit guard:

```ts
if (!path.endsWith(".ts") && !path.endsWith(".tsx")) {
  return;
}
```

**Invocations:** Three sequential calls to `replaceImportInFiles(changes, library)` from `run-migration.ts`:

1. Round A — library `'@qwik.dev/router'`
2. Round B — library `'@qwik-router-config'`
3. Round C — library `'@qwik.dev/core'`

Each call operates on the same `Project` instance... actually each call to `replaceImportInFiles` creates a **new** `Project()` internally. The three rounds are independent executions.

**Per-file, per-invocation algorithm:**

For each source file in the project:

1. Get all `ImportDeclaration` nodes via `sourceFile.getImportDeclarations()`.
2. For each import declaration where `getModuleSpecifierValue().startsWith(library)` is true:
   - Iterate the `changes` array; for each `[oldImport, newImport]`:
     - Find all named imports; if `namedImport.getName() === oldImport`, call `namedImport.setName(newImport)` and set `hasChanges = true`.
3. After processing all import declarations, iterate ALL `Identifier` descendants of the entire source file (not scoped to the matching import) via `sourceFile.getDescendantsOfKind(ts.SyntaxKind.Identifier)`:
   - For each identifier, for each `[oldImport, newImport]` in changes: if `identifier.getText() === oldImport`, call `identifier.replaceWithText(newImport)` and set `hasChanges = true`.
4. If `hasChanges` is true: call `sourceFile.saveSync()` and log `Updated imports in {filePath}`.

**IMPORTANT — `startsWith` not strict equality:** Step 2 uses `startsWith(library)` to match import specifiers. An import like `'@qwik.dev/router/middleware/node'` (a subpath import) will also match Round A's library `'@qwik.dev/router'`. The named imports from subpath imports are also subject to rename.

**RISK — global identifier rename:** Step 3 (identifier descendants) is not scoped to imports from the matching library. It renames every `Identifier` node in the file whose text matches an old import name. Any local variable, function parameter, type alias, or other identifier that happens to share a name with an old import (e.g., a local variable named `qwikCity`) will be renamed.

---

### Round A — library: `'@qwik.dev/router'`

Matches: `'@qwik.dev/router'` AND any specifier that starts with `'@qwik.dev/router'` (subpath imports).

| Old named import             | New named import               |
| ---------------------------- | ------------------------------ |
| `QwikCityProvider`           | `QwikRouterProvider`           |
| `qwikCity`                   | `qwikRouter`                   |
| `QwikCityVitePluginOptions`  | `QwikRouterVitePluginOptions`  |
| `QwikCityPlugin`             | `QwikRouterPlugin`             |
| `createQwikCity`             | `createQwikRouter`             |
| `QwikCityNodeRequestOptions` | `QwikRouterNodeRequestOptions` |

Note: The module specifier string `'@qwik.dev/router'` itself is NOT changed in Step 2. The specifier string is renamed in Step 3 (replacePackage text replacement). Step 2 only renames the imported symbol names.

---

### Round B — library: `'@qwik-router-config'`

Matches: `'@qwik-router-config'` (old virtual module name). Uses the old name because Step 2 runs before Step 3 renames the specifier.

| Old named import | New named import   |
| ---------------- | ------------------ |
| `qwikCityPlan`   | `qwikRouterConfig` |

Note: The module specifier `'@qwik-router-config'` is renamed to `'@qwik-router-config'` in Step 3 (Call 1).

---

### Round C — library: `'@qwik.dev/core'`

Matches: `'@qwik.dev/core'` exactly (no subpath variants exist for this specifier).

| Old named import | New named import |
| ---------------- | ---------------- |
| `jsxs`           | `jsx`            |

Note: The module specifier `'@qwik.dev/core'` is renamed to `'@qwik.dev/core'` in Step 3 (Call 4).

---

### Summary: All 8 Named Import Renames

| Round | Source library (startsWith) | Old named import             | New named import               |
| ----- | --------------------------- | ---------------------------- | ------------------------------ |
| A     | `@qwik.dev/router`          | `QwikCityProvider`           | `QwikRouterProvider`           |
| A     | `@qwik.dev/router`          | `qwikCity`                   | `qwikRouter`                   |
| A     | `@qwik.dev/router`          | `QwikCityVitePluginOptions`  | `QwikRouterVitePluginOptions`  |
| A     | `@qwik.dev/router`          | `QwikCityPlugin`             | `QwikRouterPlugin`             |
| A     | `@qwik.dev/router`          | `createQwikCity`             | `createQwikRouter`             |
| A     | `@qwik.dev/router`          | `QwikCityNodeRequestOptions` | `QwikRouterNodeRequestOptions` |
| B     | `@qwik-router-config`       | `qwikCityPlan`               | `qwikRouterConfig`             |
| C     | `@qwik.dev/core`            | `jsxs`                       | `jsx`                          |

---

### Scope of AST Rename

**Files in scope:** All `.ts` and `.tsx` files that are NOT gitignored (visited by `visitNotIgnoredFiles('.')`).

**Files NOT in scope:** `.js`, `.jsx`, `.mjs`, `.cjs`, `.json`, `.md`, `.yaml`, `.toml`, `.html`, `.css`, or any other non-`.ts`/`.tsx` extension. These are filtered out by the extension guard in `replaceImportInFiles`.

**No-op condition:** If a source file contains no import declarations matching the given library prefix, `hasChanges` remains false and the file is not written.

**Identifier rename scope:** ALL identifiers in the file, not just within the matching import declaration. The identifier scan iterates `sourceFile.getDescendantsOfKind(ts.SyntaxKind.Identifier)` across the entire file.

---

## Part 2: Package Name Substitutions (Step 3 — text replace)

### Mechanism: `replacePackage(oldName, newName, skipDependencies?)`

Each call to `replacePackage` executes two internal sub-operations in sequence:

- **Phase A** — `replacePackageInDependencies(oldName, newName)`: renames keys in package.json dependency sections. **Skipped when `skipDependencies=true`.**
- **Phase B** — `replaceMentions(oldName, newName)`: global string replace in all non-lockfile, non-binary files. Always runs regardless of `skipDependencies`.

---

### Call Sequence (exact order required)

| #   | Old package name      | New package name      | skipDependencies  | Phase A runs? |
| --- | --------------------- | --------------------- | ----------------- | ------------- |
| 1   | `@qwik-router-config` | `@qwik-router-config` | `true`            | No            |
| 2   | `@qwik.dev/router`    | `@qwik.dev/router`    | `false` (default) | Yes           |
| 3   | `@qwik.dev/react`     | `@qwik.dev/react`     | `false` (default) | Yes           |
| 4   | `@qwik.dev/core`      | `@qwik.dev/core`      | `false` (default) | Yes           |
| 5   | `@qwik.dev/core`      | `@qwik.dev/core`      | `false` (default) | Yes           |

Source confirmation (from `run-migration.ts`):

```ts
replacePackage("@qwik-router-config", "@qwik-router-config", true);
replacePackage("@qwik.dev/router", "@qwik.dev/router");
replacePackage("@qwik.dev/react", "@qwik.dev/react");
replacePackage("@qwik.dev/core", "@qwik.dev/core");
replacePackage("@qwik.dev/core", "@qwik.dev/core");
```

---

### Ordering Constraint

**Call 5 MUST be last.** The string `'@qwik.dev/core'` is a prefix of:

- `'@qwik.dev/router'` (handled by Call 2)
- `'@qwik.dev/react'` (handled by Call 3)
- `'@qwik.dev/core'` (handled by Call 4)

If Call 5 ran first, `replaceMentions` would replace all occurrences of `'@qwik.dev/core'` with `'@qwik.dev/core'` — corrupting the other three package names:

- `'@qwik.dev/router'` → `'@qwik.dev/core-city'` (broken)
- `'@qwik.dev/react'` → `'@qwik.dev/core-react'` (broken)
- `'@qwik.dev/core'` → `'@qwik.dev/core/jsx-runtime'` (broken)

**Call 1 uses `skipDependencies=true`** because `@qwik-router-config` is a virtual module specifier (a build-time alias), not a real npm package key. It does not appear as a key in any package.json dependency section — it appears only in source code import strings. Phase A would find nothing to rename for this package name, so it is skipped to avoid unnecessary package.json traversal.

---

### Phase A: `replacePackageInDependencies` (package.json key rename)

**Triggered by:** Every `replacePackage` call where `skipDependencies !== true` (Calls 2, 3, 4, 5).

**File scope:** Every `package.json` found by `visitNotIgnoredFiles('.')`.

**Algorithm per package.json:**

1. `JSON.parse(readFileSync(path, 'utf-8'))` — parse current contents.
2. Check four dependency sections: `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`. Missing sections are treated as empty objects (`?? {}`).
3. For each section containing `oldPackageName` as a key:
   - `deps[newPackageName] = deps[oldPackageName]` — copy version value to new key.
   - `delete deps[oldPackageName]` — remove old key.
4. `writeFileSync(path, JSON.stringify(packageJson, null, 2))` — write updated JSON.
5. Log: `"${path}" has been updated`.
6. On parse/write error: `console.warn('Could not replace ... in ...')` — non-fatal, continues to next file.

**Fields mutated by Phase A:**

| Field                  | Mutation                                                             |
| ---------------------- | -------------------------------------------------------------------- |
| `dependencies`         | Key renamed (old key deleted, new key added with same version value) |
| `devDependencies`      | Key renamed (old key deleted, new key added with same version value) |
| `peerDependencies`     | Key renamed (old key deleted, new key added with same version value) |
| `optionalDependencies` | Key renamed (old key deleted, new key added with same version value) |

**Fields NOT mutated by Phase A:**

| Field            | Reason not mutated                                                            |
| ---------------- | ----------------------------------------------------------------------------- |
| `name`           | Not a dependency section                                                      |
| `version`        | Not a dependency section                                                      |
| `scripts`        | Not a dependency section                                                      |
| `engines`        | Not a dependency section                                                      |
| `exports`        | Not a dependency section (mutated by Phase B string replace)                  |
| `files`          | Not a dependency section                                                      |
| `main`, `module` | Not a dependency section                                                      |
| All other fields | Not a dependency section                                                      |
| Version values   | Preserved intentionally — overwritten later in Step 5 by `updateDependencies` |

**Indentation side effect:** `JSON.stringify(packageJson, null, 2)` always writes 2-space indented JSON. If the original `package.json` used a different indentation style (tabs, 4 spaces, etc.), Phase A normalizes it to 2-space indentation.

---

### Phase B: `replaceMentions` (global string replace)

**Triggered by:** Every `replacePackage` call — always runs, regardless of `skipDependencies`.

**File scope:** Every file found by `visitNotIgnoredFiles('.')` EXCEPT the following:

**Skipped — binary extension** (`isBinaryPath(path)` check):

- Any file whose path extension is in the hardcoded binary extensions set.
- Includes: images (`.png`, `.jpg`, `.gif`, `.svg`, `.ico`, `.webp`, etc.), audio/video (`.mp3`, `.mp4`, `.wav`, etc.), archives (`.zip`, `.tar`, `.gz`, etc.), fonts (`.woff`, `.woff2`, `.ttf`, `.eot`, etc.), compiled binaries (`.exe`, `.dll`, `.so`, `.wasm`, etc.).
- Detection is extension-only — no magic bytes inspection of file contents.

**Skipped — lockfile/changelog** (`ignoredFiles.includes(basename(path))` check):

- `yarn.lock`
- `package-lock.json`
- `pnpm-lock.yaml`
- `bun.lockb`
- `CHANGELOG.md`

**Not skipped** (Phase B runs on all of these):

- All `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs` source files
- All `package.json` files — Phase B runs the global string replace here too, renaming specifier strings in non-key positions (e.g., `exports` field values, inline script strings). Note: Phase A already ran for keys; Phase B may modify additional string positions in the same file.
- All `.md` files EXCEPT `CHANGELOG.md`
- All `.yaml`, `.toml`, `.json` (non-package.json) config files
- All `.html`, `.css`, `.scss`, `.svelte`, `.vue`, `.astro`, `.txt` and other non-binary text files

**Replace algorithm:**

```ts
const contents = readFileSync(path, "utf-8");
if (!contents.includes(oldPackageName)) {
  return; // skip — no match, file not written
}
updateFileContent(path, contents.replace(new RegExp(oldPackageName, "g"), newPackageName));
```

The `contents.includes(oldPackageName)` guard prevents unnecessary writes — a file is only written if it contains the old package name string.

**On read/write error:** `log.warn('An error was thrown when trying to update {path}. ...')` — non-fatal, continues to next file.

**RISK — unescaped regex:** `new RegExp(oldPackageName, 'g')` uses the old package name directly as a regex pattern without escaping. The package names contain `.` (which matches any character in regex) and `/` (which is not a regex special character but is significant in paths). For the package names in use:

- `@qwik-router-config` — the `-` between words is NOT a special regex character outside of character classes; the `.` in the name... there is no `.` in this name. Safe in practice.
- `@qwik.dev/router` — contains `.` (after `builder`) which matches any character. A file containing `@buildXrio/qwik-city` would also be replaced. In practice benign because the literal strings are distinctive.
- Similar unescaped `.` risk exists for `@qwik.dev/react` and `@qwik.dev/core`.

---

## Part 3: Version Preservation Invariant

**Invariant:** After Step 3 Phase A completes, all renamed dependency keys retain their original (stale) version string.

**Example:** `"@qwik.dev/router": "^1.9.0"` becomes `"@qwik.dev/router": "^1.9.0"` after Step 3 Phase A runs Call 2.

The stale version `"^1.9.0"` is intentionally preserved. Source comment in `replace-package.ts`:

```ts
// We keep the old version intentionally. It will be updated later within another step of the migration.
```

**Transient inconsistency window:** Between Step 3 completion and Step 5 (`updateDependencies`), the project's `package.json` is in an inconsistent state:

- Package names are new (`@qwik.dev/router`, `@qwik.dev/core`, etc.)
- Version strings are old (e.g., `^1.9.0`)
- This state is not installable — `npm install` would install old package versions under new names.

**If the migration is killed between Step 3 and Step 5:** The project is left with new package names but old version strings. Manual cleanup is required.

---

## Part 4: Files the Migration Can Write

Complete enumeration of file categories written during a full migration run, grouped by step.

| Step | Step name                           | Mechanism               | Files written                                                                            |
| ---- | ----------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| 1    | `installTsMorph`                    | `writePackageJson`      | `process.cwd()/package.json` — adds `ts-morph` as devDependency                          |
| 2    | `replaceImportInFiles` (×3)         | `sourceFile.saveSync()` | Any `.ts`/`.tsx` file not gitignored that contains matching imports or identifiers       |
| 3A   | `replacePackageInDependencies` (×4) | `writeFileSync`         | Any `package.json` not gitignored that contains an old package name as a dependency key  |
| 3B   | `replaceMentions` (×5)              | `writeFileSync`         | Any non-binary, non-lockfile, non-gitignored file containing the old package name string |
| 4    | `removeTsMorphFromPackageJson`      | `writePackageJson`      | `process.cwd()/package.json` — removes `ts-morph` devDependency                          |
| 5    | `updateDependencies`                | `writePackageJson`      | `process.cwd()/package.json` — overwrites version strings with current v2 versions       |

**Note on Step 4:** Step 4 only runs if `installTsMorph()` returned `true` (i.e., ts-morph was not already installed before the migration). If the project already had ts-morph, it is not removed.

**Note on `process.cwd()/package.json` write count:** The root `package.json` can be written up to **4 times** during a complete migration run:

1. Step 1 (add ts-morph)
2. Step 3A Calls 2-5 (key renames for each old package name found) — up to 4 Phase A writes, but only if root `package.json` is a dependency file
3. Step 3B (string replace for any package name string in non-key positions)
4. Step 4 (remove ts-morph, conditional)
5. Step 5 (update versions)

At minimum: 2 writes (Steps 1 and 5) if ts-morph was pre-installed and no package names appear in `package.json` non-key positions.
At maximum: Steps 1 + (3A × 4) + (3B × 5) + 4 + 5 = many writes, though each 3A and 3B write is conditional on file contents.

---

## Part 5: File Skip Rules — Complete Reference

### Step 2 (ts-morph AST rename)

| Condition                                      | Skip reason                                     |
| ---------------------------------------------- | ----------------------------------------------- |
| File extension is not `.ts` or `.tsx`          | Hard guard in `replaceImportInFiles`            |
| File is gitignored                             | `visitNotIgnoredFiles` skips gitignored paths   |
| File has no import matching the library prefix | `hasChanges` stays false; `saveSync` not called |

### Step 3A (replacePackageInDependencies)

| Condition                                                  | Skip reason                                                                |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| File basename is not `package.json`                        | Hard guard in `replacePackageInDependencies`                               |
| File is gitignored                                         | `visitNotIgnoredFiles` skips gitignored paths                              |
| `package.json` does not contain old key in any dep section | Loop finds no match; write still occurs (JSON round-trip) on parse success |
| `skipDependencies=true` for this call                      | Phase A not invoked at all (Call 1 only)                                   |
| Parse/write error                                          | `console.warn` — non-fatal skip                                            |

### Step 3B (replaceMentions)

| Condition                                     | Skip reason                                      |
| --------------------------------------------- | ------------------------------------------------ |
| File is gitignored                            | `visitNotIgnoredFiles` skips gitignored paths    |
| File has binary extension                     | `isBinaryPath(path)` returns true                |
| File basename is a lockfile/changelog         | `ignoredFiles.includes(basename(path))` check    |
| File does not contain old package name string | `contents.includes(oldPackageName)` early return |
| Read/write error                              | `log.warn` — non-fatal skip                      |

---

## Verified from Source

- Branch: `build/v2`
- Commit: `bfe19e8d9` (as of 2026-04-02)
- Files inspected:
  - `packages/qwik/src/cli/migrate-v2/run-migration.ts` — confirmed all 3 `replaceImportInFiles` calls and all 5 `replacePackage` calls with exact arguments
  - `packages/qwik/src/cli/migrate-v2/rename-import.ts` — confirmed `startsWith` matching, global identifier scan, `saveSync` write, `.ts`/`.tsx` extension guard
  - `packages/qwik/src/cli/migrate-v2/replace-package.ts` — confirmed Phase A/B structure, 4 dep sections, `JSON.stringify(null, 2)`, lockfile skip list, `isBinaryPath` skip, unescaped regex
