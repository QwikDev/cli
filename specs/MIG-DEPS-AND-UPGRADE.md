# migrate-v2: Dependency Side Effects and Upgrade Alias Compatibility

Behavioral spec for the dependency tooling layer of `migrate-v2`.
Covers: ts-morph transient lifecycle, npm dist-tag version resolution, version update algorithm, install sequence, and the compatibility contract for a future `qwik upgrade` alias.

Branch: build/v2
Commit: bfe19e8d9 (verified 2026-04-01)

---

## Source Files

| File                                                      | Purpose                                                                                               |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `packages/qwik/src/cli/migrate-v2/update-dependencies.ts` | `installTsMorph`, `removeTsMorphFromPackageJson`, `updateDependencies`, `getPackageTag`, `runInstall` |
| `packages/qwik/src/cli/migrate-v2/versions.ts`            | `versionTagPriority` array, `packageNames` array                                                      |
| `packages/qwik/src/cli/utils/install-deps.ts`             | `installDeps()` — runs package manager install command                                                |
| `packages/qwik/src/cli/utils/utils.ts`                    | `getPackageManager()` — detects project package manager                                               |

---

## Part 1: ts-morph Transient Lifecycle

### Purpose

ts-morph is a TypeScript AST manipulation library used by Step 2 of migration to rename import paths. It is NOT a permanent dependency of the user's project or the CLI package. It is installed immediately before AST rename operations begin and removed from `package.json` immediately after they complete.

### Install: `installTsMorph()`

Source: `update-dependencies.ts`

**Precondition check (idempotency guard):**

```typescript
const packageJson = await readPackageJson(process.cwd());
if (packageJson.dependencies?.["ts-morph"] || packageJson.devDependencies?.["ts-morph"]) {
  return false; // already installed — skip install and signal caller not to remove later
}
```

- Reads `process.cwd()/package.json`
- If `ts-morph` is found in either `dependencies` or `devDependencies`: return `false` immediately — no install, no write, no spinner

**When installing (ts-morph NOT already present):**

```typescript
const loading = spinner();
loading.start("Fetching migration tools..");
(packageJson.devDependencies ??= {})["ts-morph"] = "23";
await writePackageJson(process.cwd(), packageJson);
await runInstall();
loading.stop("Migration tools have been loaded");
return true;
```

Step-by-step:

1. Start spinner: `'Fetching migration tools..'`
2. `(packageJson.devDependencies ??= {})['ts-morph'] = '23'`
   - Creates `devDependencies` object if it does not exist
   - Adds key `ts-morph` with string value `'23'` (not `'^23.0.0'` — exact string `'23'`)
3. Write `process.cwd()/package.json` (via `writePackageJson(process.cwd(), packageJson)`)
4. Call `runInstall()` (see install mechanism in Part 3)
5. Stop spinner: `'Migration tools have been loaded'`
6. Return `true` — signals to caller that migration installed ts-morph (and must later remove it)

**On failure:** `runInstall()` throws `Error('Failed to install dependencies')` → propagates to outer catch → `process.exit(1)`

### Dynamic Import of `rename-import.ts`

After `installTsMorph()` resolves, the rename-import module is loaded:

```typescript
const { replaceImportInFiles } = await import("./rename-import");
```

This is a **dynamic import**, NOT a static import at module load time.

**Why dynamic import:** `rename-import.ts` uses ts-morph at the top level. A static `import` statement would attempt to resolve ts-morph when the CLI module is first loaded — before `installTsMorph()` has run — causing a module resolution failure. The dynamic import defers resolution until after ts-morph is confirmed installed.

### Remove: `removeTsMorphFromPackageJson()`

Source: `update-dependencies.ts`

```typescript
export async function removeTsMorphFromPackageJson() {
  const packageJson = await readPackageJson(process.cwd());
  delete packageJson.dependencies?.["ts-morph"];
  delete packageJson.devDependencies?.["ts-morph"];
  await writePackageJson(process.cwd(), packageJson);
}
```

**Condition:** Called by the migration orchestrator only if `installedTsMorph === true` (the value returned by `installTsMorph()`). If `installTsMorph()` returned `false` (user already had ts-morph), this function is NOT called.

**What it does:**

- Reads `process.cwd()/package.json`
- `delete packageJson.dependencies?.['ts-morph']` — removes from dependencies if present
- `delete packageJson.devDependencies?.['ts-morph']` — removes from devDependencies if present
- Writes `process.cwd()/package.json`

**What it does NOT do:**

- Does NOT run `npm uninstall` or equivalent
- Does NOT touch `node_modules/` — ts-morph binary remains in `node_modules` until the next clean install
- No spinner — silent file write

### Invariants

| Project state before migration                    | State after migration                                                                        |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| ts-morph NOT in package.json or node_modules      | ts-morph NOT in package.json; ts-morph binary still in node_modules until next clean install |
| ts-morph already in package.json (either section) | ts-morph remains in package.json and node_modules — unchanged by migration                   |

---

## Part 2: npm dist-tag Version Resolution

### Why npm Is Always Used

The dist-tag query **always uses `npm`**, regardless of the project's detected package manager (yarn, pnpm, bun). This is hardcoded in `getPackageTag()`:

```typescript
execSync("npm dist-tag @qwik.dev/core", { encoding: "utf-8" });
```

**Rationale:** `npm dist-tag ls` is the canonical CLI command for querying tag→version mappings from the npm registry. Other package managers do not expose an equivalent command with the same output format. The hardcoded `npm` invocation is intentional — `getPackageManager()` (which detects the project's package manager) is NOT used here.

### `getPackageTag()` Full Algorithm

Source: `update-dependencies.ts`

**Step 1 — Query npm registry (synchronous child process):**

```typescript
const tags = execSync("npm dist-tag @qwik.dev/core", { encoding: "utf-8" });
```

- Synchronous blocking call via `execSync`
- On failure (npm not installed, network error, npm not on PATH): throws → propagates to outer catch → `process.exit(1)`

**Step 2 — Parse output into `[tag, version]` tuples:**

npm dist-tag output format (one line per tag):

```
latest: 1.9.0
v2: 2.0.0-alpha.0
next: 3.0.0-dev.1
```

Parse algorithm:

```typescript
.split('\n')
.filter(Boolean)                                       // remove empty lines
.map(data =>
  data.split(':')                                      // split on first ':'
    .map(v => v?.trim())                               // trim whitespace from each part
    .filter(Boolean)                                   // remove empty strings
)
.filter((v): v is [string, string] => v.length === 2) // keep only valid [tag, version] pairs
```

Result: `[tag: string, version: string][]` — array of two-element tuples

**Note on parsing:** `split(':')` splits on ALL colons. A version string like `2.0.0-alpha.0` contains no colons, so parsing is unambiguous. A tag name cannot contain colons in npm's format.

**Step 3 — Sort by `versionTagPriority`:**

```typescript
// from versions.ts
export const versionTagPriority = ["latest", "v2", "rc", "beta", "alpha"];
```

Sort comparator:

```typescript
.sort((a, b) => {
  let aIndex = versionTagPriority.indexOf(a[0]);
  let bIndex = versionTagPriority.indexOf(b[0]);
  if (aIndex === -1) { aIndex = Infinity; }
  else if (bIndex === -1) { bIndex = Infinity; }
  return aIndex - bIndex;
})
```

- Known tags (in `versionTagPriority`) sort to the front in priority order: `latest` first, then `v2`, `rc`, `beta`, `alpha`
- Unknown tags (not in the array, `indexOf` returns `-1`) sort after all known tags (treated as `Infinity`)

**Step 4 — Select first tag whose version has major === 2:**

```typescript
const { major } = await import("semver");
for (let i = 0; i < tags.length; i++) {
  const [, version] = tags[i];
  if (major(version) === 2) {
    return version;
  }
}
```

- Iterates the sorted array
- Returns the `version` string of the first entry where `semver.major(version) === 2`
- `semver` is a dynamic import (inside the `async` function)

**Step 5 — Fallback when no major-2 tag found:**

```typescript
log.warn('Failed to resolve the Qwik version tag, version "2.0.0" will be installed');
return "2.0.0";
```

- Emits a warning via `@clack/prompts` `log.warn`
- Returns literal string `'2.0.0'` (exact semver, no range prefix)
- Does NOT throw — migration continues with the fallback version

### Version Selection Examples

| npm dist-tags output                           | Selected version     | Reason                                                           |
| ---------------------------------------------- | -------------------- | ---------------------------------------------------------------- |
| `latest: 1.9.0`, `v2: 2.0.1`                   | `2.0.1`              | `latest` is major 1 (skip), `v2` is major 2 — return `v2`        |
| `latest: 2.1.0`, `v2: 2.0.0`                   | `2.1.0`              | `latest` has higher priority and is major 2 — return immediately |
| `latest: 1.9.0`, `alpha: 2.0.0-alpha.1`        | `2.0.0-alpha.1`      | `latest` is major 1, no `v2`/`rc`/`beta`; `alpha` is major 2     |
| `latest: 1.9.0`, `next: 3.0.0`                 | `'2.0.0'` (fallback) | `next` is major 3; no major-2 tag found → fallback               |
| `latest: 1.9.0`, `v2: 2.0.0`, `rc: 2.1.0-rc.1` | `2.0.0`              | `latest` is major 1, `v2` (index 1) sorts before `rc` (index 2)  |

---

## Part 3: `updateDependencies()` — Version Update and Final Install

### Packages Updated

Source: `versions.ts` — `packageNames` array:

```typescript
export const packageNames = [
  "@qwik.dev/core",
  "@qwik.dev/router",
  "@qwik.dev/react",
  "eslint-plugin-qwik",
];
```

These are the **post-rename** package names (Step 3 of migration renames `@builder.io/*` to `@qwik.dev/*` in package.json before this step runs). All 4 receive the same resolved version string.

### Update Algorithm

```typescript
export async function updateDependencies() {
  // TODO(migrate-v2): rely on workspaceRoot instead?
  const packageJson = await readPackageJson(process.cwd());
  const version = await getPackageTag();

  const dependencyNames = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ] as const;

  for (let i = 0; i < packageNames.length; i++) {
    const name = packageNames[i];
    for (let j = 0; j < dependencyNames.length; j++) {
      const propName = dependencyNames[j];
      const prop = packageJson[propName];
      if (prop && prop[name]) {
        prop[name] = version;
      }
    }
  }

  await writePackageJson(process.cwd(), packageJson);
  const loading = spinner();
  loading.start("Updating dependencies...");
  await runInstall();
  loading.stop("Dependencies have been updated");
}
```

Step-by-step:

1. Read `process.cwd()/package.json`
2. Resolve version via `getPackageTag()` — single version string, same for all 4 packages
3. For each of the 4 package names, for each of the 4 dependency sections:
   - If `prop[name]` exists (package is listed in that section): `prop[name] = version`
   - If not in that section: **no-op** — does NOT add the package to a section it was not already in
4. Write `process.cwd()/package.json`
5. Start spinner: `'Updating dependencies...'`
6. Call `runInstall()` — runs the project's detected package manager
7. Stop spinner: `'Dependencies have been updated'`

**TODO in source:** `// TODO(migrate-v2): rely on workspaceRoot instead?` — the `process.cwd()` vs `workspaceRoot` issue is unresolved. Future CLI may change this to use `app.rootDir`.

### Install Mechanism: `runInstall()`

```typescript
async function runInstall() {
  const { install } = installDeps(getPackageManager(), process.cwd());
  const passed = await install;
  if (!passed) {
    throw new Error("Failed to install dependencies");
  }
}
```

- `getPackageManager()`: `detectPackageManager()?.name || 'pnpm'`
  - Uses `which-pm-runs` to detect whichever package manager invoked the CLI
  - Falls back to `'pnpm'` if detection fails
  - **Contrast with dist-tag query:** `runInstall` uses the project's PM; `getPackageTag` hardcodes `npm`
- `installDeps(pkgManager, cwd)`: runs `pkgManager install` via `execa` in the given directory
- Returns `{ install: Promise<boolean> }` — `true` on success, `false` on failure
- On failure: throws `Error('Failed to install dependencies')` → `process.exit(1)`

### `runInstall()` Is Called Twice in a Full Migration

| Call   | When                                   | Purpose                                                          |
| ------ | -------------------------------------- | ---------------------------------------------------------------- |
| Call 1 | Inside `installTsMorph()` (Step 1)     | Install ts-morph so rename-import.ts can be dynamically imported |
| Call 2 | Inside `updateDependencies()` (Step 5) | Install final v2 package versions                                |

---

## Part 4: `qwik upgrade` Alias — Compatibility Contract

### Current State

- `migrate-v2` is callable as `qwik migrate-v2`
- `showInHelp: false` — hidden from the interactive help menu, but registered and callable
- No flags
- Runs relative to `process.cwd()`

### Must-Preserve Behaviors

A `qwik upgrade` alias or successor must preserve ALL of the following to avoid breaking existing users and migration workflows:

**1. Full 5-step sequence, in order**

Steps 1–5 form a dependency chain. Any reordering breaks the migration:

| Step | Action                                               | Dependency                                                         |
| ---- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| 1    | Install ts-morph                                     | Must run before Step 2                                             |
| 2    | AST rename imports (dynamic import of rename-import) | Requires Step 1 to have completed                                  |
| 3    | Text replace package names in all project files      | Must run before Step 5                                             |
| 4    | Remove ts-morph from package.json                    | Conditional on Step 1 return value (`installedTsMorph`)            |
| 5    | Update dependency versions + final install           | Must run last; package.json keys must already be renamed by Step 3 |

Within Step 3, `@qwik.dev/core` must be replaced last (substring ordering — see below).

**2. `@qwik.dev/core` rename runs last among the 5 `replacePackage` calls**

`@qwik.dev/core` is a substring of `@qwik.dev/router`. If the base name is replaced first, subsequent replacements targeting `@qwik.dev/router` would be operating on already-modified text. Non-negotiable substring ordering constraint.

**3. ts-morph is transient: installed and removed**

ts-morph must not arrive as a permanent CLI devDependency or as a permanent project devDependency. Install before Step 2, remove from package.json after Step 2 completes (if migration installed it).

**4. ts-morph presence check before install**

Must not install ts-morph if the user already has it in `dependencies` or `devDependencies`. Must not remove ts-morph from package.json if the user already had it before migration started.

**5. npm hardcoded for dist-tag query**

The version resolution query is `execSync('npm dist-tag @qwik.dev/core')`. Future CLI must not substitute `pnpm`, `yarn`, or `bun` unless the output format parsing is updated to match the replacement tool's output format.

**6. `versionTagPriority` order: `latest` > `v2` > `rc` > `beta` > `alpha`**

Determines which v2 dist-tag is selected when multiple major-2 tags exist. Changing this order changes which version users receive.

**7. Fallback version `'2.0.0'`**

When no dist-tag has major version 2, return literal `'2.0.0'` rather than throwing. Prevents hard failure when registry tags change. Emits a warning, not an error.

**8. All 4 packages updated: `@qwik.dev/core`, `@qwik.dev/router`, `@qwik.dev/react`, `eslint-plugin-qwik`**

Missing any one leaves an inconsistent dependency graph. All 4 must receive the same resolved version string. All 4 dependency sections (`dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`) must be checked.

**9. Lockfiles and binary files are excluded from text replacement**

The 5 excluded filenames (`yarn.lock`, `package-lock.json`, `pnpm-lock.yaml`, `bun.lockb`, `CHANGELOG.md`) and binary file extensions must remain excluded in any reimplementation. These files must not be modified by the text replacement step.

**10. `.gitignore`-respected file traversal**

Build outputs, vendored code, and machine-generated files must not be modified. File traversal must respect `.gitignore` patterns.

**11. Confirmation prompt before any mutation**

User consent gate: the user must explicitly confirm before migration begins. Any future CLI must not auto-migrate without this prompt.

**12. Exit code 0 on user cancel**

`bye()` → `process.exit(0)`. Cancellation is not an error. Scripts or CI pipelines that treat non-zero exit codes as failures must not be broken by a user pressing Ctrl-C or selecting "no".

**13. `qwik migrate-v2` must remain callable (alias required)**

Even if the canonical command becomes `qwik upgrade`, the original `qwik migrate-v2` invocation must route to the same behavior. Users have this hard-coded in documentation, CI scripts, and migration guides.

### What May Change Safely

| Item                                  | Notes                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Command name in help output           | Currently `showInHelp: false`; MAY be surfaced in help                                                        |
| Banner text and color styling         | Cosmetic — no behavioral impact                                                                               |
| `updateConfigurations()`              | Currently commented out; MAY be re-enabled or reimplemented                                                   |
| `--dry-run` or `--from-version` flags | Additive flags that do not change existing behavior                                                           |
| `process.cwd()` vs `app.rootDir`      | MAY be changed to `app.rootDir` after verifying monorepo behavior — there is already a TODO comment in source |

---

## Verified from Source

- Branch: `build/v2`
- Commit: `bfe19e8d9` (as of 2026-04-01)
- Files inspected: `update-dependencies.ts`, `versions.ts`, `install-deps.ts`, `utils.ts`
- All code excerpts verified against live source
