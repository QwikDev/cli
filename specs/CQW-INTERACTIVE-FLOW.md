---
title: "CQW Interactive Flow — create-qwik CLI Behavioral Spec"
phase: 06-create-qwik-behavioral-spec
plan: 01
verified_at_commit: b197b42200e38e6765d5e28142b35bfa0e310368
verified_date: 2026-04-01
---

# CQW Interactive Flow — create-qwik CLI Behavioral Spec

> A complete specification of the `create-qwik` CLI entry path, mode detection, prompt sequence, and all
> output behavior. A reader can reproduce every user-visible interaction without running the tool.

---

## Source Files

| File                                                     | Purpose                                                                                |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `packages/create-qwik/index.ts`                          | Entry export: `runCli()`, `checkNodeVersion()`, `createApp`, re-exports                |
| `packages/create-qwik/src/run-create-cli.ts`             | Non-interactive CLI: `runCreateCli()`, `parseArgs()`, `writeToCwd()`, `isStackBlitz()` |
| `packages/create-qwik/src/run-create-interactive-cli.ts` | Interactive CLI: `runCreateInteractiveCli()`, full prompt sequence                     |
| `packages/create-qwik/src/helpers/resolveRelativeDir.ts` | `resolveRelativeDir()` — outDir path resolution                                        |
| `packages/create-qwik/src/helpers/installDepsCli.ts`     | `installDepsCli()` — spinner wrapper for dependency install                            |
| `packages/create-qwik/src/helpers/logAppCreated.ts`      | `logAppCreated()` — success output formatter                                           |
| `packages/qwik/src/cli/utils/install-deps.ts`            | `backgroundInstallDeps()`, `installDeps()` — background and foreground install         |

---

## Entry Point: runCli()

**Location:** `packages/create-qwik/index.ts`

### Startup sequence

1. `printHeader()` — prints the Qwik ASCII header (shared with qwik CLI; see CMD-INVENTORY.md)
2. `checkNodeVersion()` — validates Node.js version (see rules below)
3. Parse `process.argv.slice(2)` into `args`
4. Dispatch:
   - If `args.length > 0` → `await runCreateCli(...args)`
   - If `args.length === 0` → `await runCreateInteractiveCli()`
5. `catch (e)` → `panic(e.message || e)` — logs error and exits

### Node.js Version Check Rules

`checkNodeVersion()` reads `process.version` and splits on `.` after stripping the `v` prefix.
It evaluates `[majorVersion, minorVersion]` as numbers.

| Condition                       | Action                                                                                                                                                                                                                                  | Exit?                      |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `major < 16`                    | `console.error(red("Qwik requires Node.js 16.8 or higher. You are currently running Node.js ${version}."))`                                                                                                                             | `process.exit(1)`          |
| `major === 16` AND `minor < 8`  | `console.warn(yellow("Node.js 16.8 or higher is recommended. You are currently running Node.js ${version}."))`                                                                                                                          | No (warning only)          |
| `major === 18` AND `minor < 11` | `console.error(red("Node.js 18.11 or higher is REQUIRED. From Node 18.0.0 to 18.11.0, there is a bug preventing correct behavior of Qwik. You are currently running Node.js ${version}. https://github.com/QwikDev/qwik/issues/3035"))` | No (error logged, no exit) |
| All other versions              | No-op                                                                                                                                                                                                                                   | No                         |

**Note:** The Node 18 branch does NOT call `process.exit()` — it only logs an error.
Only the Node < 16 branch hard-exits.

---

## Non-Interactive Flow: runCreateCli()

**Location:** `packages/create-qwik/src/run-create-cli.ts`

Invoked when `args.length > 0`. Accepts all args as rest parameters.

### Step-by-step

1. `getPackageManager()` — detects package manager (`detectPackageManager()?.name || 'pnpm'`)
2. `makeTemplateManager('app')` — loads all integrations of type `'app'`
3. `templateVariants = templateManager.standaloneTemplates.map(({ id }) => id)` — derives valid `template` choices
4. `parseArgs(args, templateVariants)` — parses via yargs
5. `intro(...)` — shows intro banner (same format as interactive mode)
6. StackBlitz / outDir resolution (see below)
7. `createApp(...)` — scaffolds the project
8. Optionally `installDepsCli(...)` — if `--installDeps` flag is set
9. `logAppCreated(...)` — prints success output

### yargs Argument Schema

```
Usage: npm create qwik@latest base ./my-project <options>
```

| Argument               | Kind       | Type    | Choices                                      | Default  | Description                             |
| ---------------------- | ---------- | ------- | -------------------------------------------- | -------- | --------------------------------------- |
| `template`             | positional | string  | `templateVariants` (standaloneTemplates ids) | required | Starter template                        |
| `outDir`               | positional | string  | —                                            | required | Directory of the project                |
| `--force` / `-f`       | option     | boolean | —                                            | `false`  | Overwrite target directory if it exists |
| `--installDeps` / `-i` | option     | boolean | —                                            | `false`  | Install dependencies                    |

`yargs.strict()` is set — unknown arguments will cause an error.

### StackBlitz Detection and outDir Override

```
writeToCwd() → isStackBlitz() → process.cwd().startsWith('/home/projects/')
```

| `writeToCwd()` result | `isStackBlitz()` condition                    | outDir behavior                                              |
| --------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `true`                | `process.cwd()` starts with `/home/projects/` | `outDir = process.cwd()` — writes in-place, no sub-directory |
| `false` (default)     | Anything else                                 | `outDir = resolveRelativeDir(parsedArgs.outDir)`             |

`isStackBlitz()` wraps `process.cwd().startsWith('/home/projects/')` in a try/catch; returns `false` on error.

### Existing Directory Guard (non-interactive)

Applied only when `writeToCwd()` is `false`:

| Condition                                              | Action                                                                                                                                                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `outDir` exists AND is non-empty AND `force === false` | `log.error('Directory "${outDir}" already exists.')` + `log.info('Please either remove this directory, choose another location or run the command again with \'--force \| -f\' flag.')` + `cancel()` + `process.exit(1)` |
| `outDir` exists AND is non-empty AND `force === true`  | `await clearDir(outDir)` — removes contents, then proceeds                                                                                                                                                               |
| `outDir` does not exist OR is empty                    | Proceeds without action                                                                                                                                                                                                  |

### createApp() Call

```ts
createApp({ outDir, appId: template, pkgManager, templateManager });
```

### Dependency Install (non-interactive)

Triggered only if `--installDeps` / `-i` flag is `true`:

```ts
installDepsCli(async () => await installDepsFn(pkgManager, outDir).install, {
  pkgManager,
  spinner,
});
```

The spinner shows `Installing {pkgManager} dependencies...` and stops with
`Installed {pkgManager} dependencies 📋` or `Failed to install {pkgManager} dependencies 📋`.

**No git-init step** in the non-interactive path.

### Completion

`logAppCreated(pkgManager, result, isDepsInstalled)` — see Output Messaging section.

---

## Interactive Flow: runCreateInteractiveCli()

**Location:** `packages/create-qwik/src/run-create-interactive-cli.ts`

Invoked when `args.length === 0` (bare `npm create qwik`).

### Prompt Sequence Table

| Step    | Type    | Message                                                                                    | Options / Placeholder | Default                 | Cancel behavior                                      |
| ------- | ------- | ------------------------------------------------------------------------------------------ | --------------------- | ----------------------- | ---------------------------------------------------- |
| Pre     | intro   | `Let's create a [blue] Qwik App [/blue] ✨ (v{QWIK_VERSION})`                              | —                     | —                       | —                                                    |
| Pre     | delay   | `wait(500)` — 500ms pause                                                                  | —                     | —                       | —                                                    |
| 1       | text    | `Where would you like to create your new project? (Use '.' or './' for current directory)` | `./qwik-app`          | `./qwik-app` (if empty) | `cancel('Operation cancelled.')` + `process.exit(0)` |
| —       | info    | `Creating new project in [blue] {outDir} [/blue] ... 🐇`                                   | —                     | —                       | —                                                    |
| (cond.) | select  | `Directory "./{relative}" already exists and is not empty. What would you like to do?`     | `exit`, `replace`     | —                       | `cancelProcess()`                                    |
| 2       | select  | `Select a starter`                                                                         | starterApps list      | —                       | `cancelProcess()`                                    |
| 3       | confirm | `Would you like to install {pkgManager} dependencies?`                                     | yes/no                | `true`                  | `cancelProcess()`                                    |
| 4       | confirm | `Initialize a new git repository?`                                                         | yes/no                | `true`                  | No `isCancel` check — answer stored as-is            |
| (cond.) | confirm | `Finishing the install. Wanna hear a joke?`                                                | yes/no                | `true`                  | Skips joke, continues                                |

### Detailed Prompt Sequence

#### Pre-prompt Setup

```ts
pkgManager = getPackageManager(); // detectPackageManager()?.name || 'pnpm'
templateManager = await makeTemplateManager("app");
defaultProjectName = "./qwik-app";
intro(`Let's create a ${bgBlue(" Qwik App ")} ✨ (v${QWIK_VERSION})`);
await wait(500); // 500ms artificial delay
```

---

#### PROMPT 1 — Project Directory (text)

```
Message:     "Where would you like to create your new project? (Use '.' or './' for current directory)"
             The hint "(Use '.' or './'...)" is rendered in gray via kleur.
Placeholder: ./qwik-app
Default:     If the answer is empty or falsy, defaults to './qwik-app' via:
             (await text({...})) || defaultProjectName
Cancel:      isCancel(projectNameAnswer) → cancel('Operation cancelled.') + process.exit(0)
```

**Post-PROMPT 1 setup:**

```ts
baseApp = templateManager.getBaseApp(); // the 'base' integration
starterApps = templateManager.templates
  .filter((a) => a.id !== baseApp.id)
  .sort((a, b) => a.name.localeCompare(b.name)); // alphabetical by name

outDir = resolveRelativeDir(projectNameAnswer.trim());
baseApp.target = outDir;

backgroundInstall = backgroundInstallDeps(pkgManager, baseApp);
// Background install starts HERE, in parallel with remaining prompts

cancelProcess = async () => {
  await backgroundInstall.abort();
  cancel("Operation cancelled.");
  process.exit(0);
};

log.info(`Creating new project in ${bgBlue(" " + outDir + " ")} ... 🐇`);
```

---

#### Existing Directory Guard (interactive)

Triggered when `fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0`:

```
Type:    select
Message: "Directory "./{relative(process.cwd(), outDir)}" already exists and is not empty.
          What would you like to do?"
Options:
  { value: 'exit',    label: 'Do not overwrite this directory and exit' }
  { value: 'replace', label: 'Remove contents of this directory' }
```

| Answer      | Action                                                                       |
| ----------- | ---------------------------------------------------------------------------- |
| `isCancel`  | `cancelProcess()`                                                            |
| `'exit'`    | `cancelProcess()`                                                            |
| `'replace'` | `removeExistingOutDirPromise = clearDir(outDir)` — deferred, not yet awaited |

---

#### PROMPT 2 — Starter Selection (select)

```
Type:    select
Message: "Select a starter"
Options: starterApps.map(s => { label: s.name, value: s.id, hint: s.pkgJson?.description })
         — all 'app' integrations except 'base', sorted alphabetically by name
```

Known options in current dist (sorted alphabetically):

- `empty` — label: "Empty App (Qwik + Qwik Router)", hint: description from pkgJson
- `library` — label: "Library (Qwik)", hint: description from pkgJson
- `playground` — label: "Playground App (Qwik + Qwik Router)", hint: description from pkgJson
- `e2e-library` — may appear with id-derived label if it lacks `displayName` in `__qwik__`

```
Cancel: cancelProcess()
```

---

#### PROMPT 3 — Install Dependencies (confirm)

```
Type:         confirm
Message:      "Would you like to install {pkgManager} dependencies?"
initialValue: true
Cancel:       cancelProcess()
```

---

#### PROMPT 4 — Git Init (confirm)

```
Type:         confirm
Message:      "Initialize a new git repository?"
initialValue: true
Cancel:       No isCancel check — gitInitAnswer stores the raw value including cancel symbols.
              A cancel signal here does NOT trigger cancelProcess(); execution continues.
```

---

#### Post-PROMPT 4: Await Directory Removal

```ts
if (removeExistingOutDirPromise) {
  await removeExistingOutDirPromise; // clearDir(outDir) completes here if 'replace' was chosen
}
const runDepInstall: boolean = runDepInstallAnswer;
```

---

#### Conditional Joke Prompt (during background install wait)

```
Condition: runDepInstall === true AND backgroundInstall.success === undefined
           (background install is still running — not yet resolved)
```

If condition is false (`runDepInstall === false`): `backgroundInstall.abort()` — no joke prompt.

If condition is true:

```
Type:         confirm
Message:      "Finishing the install. Wanna hear a joke?"
initialValue: true
```

| Answer                      | Action                                                            |
| --------------------------- | ----------------------------------------------------------------- |
| Confirmed AND not cancelled | `getRandomJoke()` → `note(magenta("{setup}\n{punchline}"), '🙈')` |
| Cancelled OR `false`        | No joke shown                                                     |
| Any error thrown            | Caught silently — joke errors never crash the CLI                 |

---

#### App Creation

```ts
s.start("Creating App...");
result = await createApp({ appId: starterId, outDir, pkgManager, templateManager });
s.stop("App Created 🐰");
```

---

#### Git Initialization (conditional)

Condition: `gitInitAnswer === true`

| Situation                             | Action                                                             |
| ------------------------------------- | ------------------------------------------------------------------ |
| `.git` dir already exists in `outDir` | `log.info("Git has already been initialized before. Skipping...")` |
| `.git` does not exist                 | Run git commands (see below)                                       |

Git command sequence when `.git` is absent:

```ts
s.start("Git initializing...");
res.push(await runCommand("git", ["init"], outDir).install);
res.push(await runCommand("git", ["add", "-A"], outDir).install);
res.push(await runCommand("git", ["commit", "-m", "Initial commit ⚡️"], outDir).install);
```

| Result                        | Action                                                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| All commands return non-false | `s.stop('Git initialized 🎲')`                                                                                                                  |
| Any command returns `false`   | `throw ''` → `s.stop('Git failed to initialize')` + `log.error(red('Git failed to initialize. You can do this manually by running: git init'))` |

---

#### Dependency Install (conditional)

Condition: `runDepInstall === true`

```ts
successfulDepsInstall = await installDepsCli(
  async () => {
    const success = await backgroundInstall.complete(result.outDir);
    if (success) {
      return await installDeps(pkgManager, result.outDir).install;
    }
    return success;
  },
  { pkgManager, spinner: s },
);
```

The `backgroundInstall.complete()` function:

1. Awaits the background install promise
2. On success: renames `tmpInstallDir/node_modules` → `outDir/node_modules`
3. Renames lock files (each in a separate try/catch — missing lock files are ignored):
   - `package-lock.json`
   - `yarn.lock`
   - `pnpm-lock.yaml`
4. `fs.rmSync(tmpInstallDir, { recursive: true })` — removes tmp dir
5. On success: runs `installDeps(pkgManager, outDir).install` — second install for starter-specific packages
6. On any error: `log.error(red(e.message))` then falls through to failure path

Failure path: `log.error(bgRed(" {pkgManager} install failed ") + " You might need to run "${pkgManager} install" manually...`)`

`installDepsCli()` spinner messages:

- Start: `Installing {pkgManager} dependencies...`
- Stop (success): `Installed {pkgManager} dependencies 📋`
- Stop (failure): `Failed to install {pkgManager} dependencies 📋`

---

#### Completion

```ts
logAppCreated(pkgManager, result, successfulDepsInstall);
```

See Output Messaging section.

---

## Output Messaging: logAppCreated()

**Location:** `packages/create-qwik/src/helpers/logAppCreated.ts`

```ts
isCwdDir = process.cwd() === result.outDir;
relativeProjectPath = relative(process.cwd(), result.outDir);
```

### Success note content (rendered via `note(outString.join('\n'), 'Result')`)

**Line 1 (project location):**

- If `isCwdDir`: `🦄 [bgMagenta] Success! [/bgMagenta]`
- Else: `🦄 [bgMagenta] Success! [/bgMagenta] [cyan]Project created in[/cyan] [bold magenta]{relativeProjectPath}[/bold magenta] [cyan]directory[/cyan]`

**Line 2:** (blank)

**Lines 3–4 (integrations):**

```
🤍 [cyan]Integrations? Add Netlify, Cloudflare, Tailwind...[/cyan]
   {pkgManager !== 'npm' ? '{pkgManager} qwik add' : 'npm run qwik add'}
```

**Line 5:** (blank)

**Lines 6–N (docs footer):**
`logSuccessFooter(result.docs)` — lists documentation URLs from the integration's docs array.

**Lines after docs:**

```
👀 [cyan]Presentations, Podcasts and Videos:[/cyan]
   https://qwik.dev/media/
```

**Line:** (blank)

**Next steps block:**

```
🐰 [cyan]Next steps:[/cyan]
   cd {relativeProjectPath}        (only if !isCwdDir)
   {pkgManager} install            (only if !ranInstall)
   deno task start                  (only if pkgManager === 'deno')
   {pkgManager} start               (otherwise)
```

**Line:** (blank)

**Outro:**

```ts
outro("Happy coding! 🎉");
```

---

## outDir Resolution Rules

**Location:** `packages/create-qwik/src/helpers/resolveRelativeDir.ts`

```ts
function resolveRelativeDir(dir: string) {
  if (dir.startsWith("~/")) {
    return resolve(os.homedir(), dir); // home-dir expansion
  } else {
    return resolve(process.cwd(), dir); // CWD-relative
  }
}
```

| Input pattern    | Resolution                                                                                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `~/foo/bar`      | `resolve(os.homedir(), '~/foo/bar')` — **BUG:** `~/` prefix is NOT stripped before `resolve()`, so the actual result is `os.homedir() + '/~/foo/bar'`, not `os.homedir() + '/foo/bar'` as intended |
| `./my-project`   | `process.cwd() + '/my-project'`                                                                                                                                                                    |
| `my-project`     | `process.cwd() + '/my-project'` (same as `./my-project` via `path.resolve`)                                                                                                                        |
| `.` or `./`      | `process.cwd()` (standard `path.resolve` behavior)                                                                                                                                                 |
| `/absolute/path` | `/absolute/path` unchanged (`path.resolve` returns as-is)                                                                                                                                          |

---

## cancelProcess() Behavior (interactive only)

Defined inline in `runCreateInteractiveCli()`:

```ts
const cancelProcess = async () => {
  await backgroundInstall.abort();
  cancel("Operation cancelled.");
  process.exit(0);
};
```

`backgroundInstall.abort()`:

- Calls the yargs `abort()` signal from `runCommand` (kills install child process)
- Then: `fs.rmSync(tmpInstallDir, { recursive: true })` — removes the temp install directory

Exit code: `0` (user-initiated cancellation is not an error).

---

## Background Install Mechanism

**Location:** `packages/qwik/src/cli/utils/install-deps.ts`

`backgroundInstallDeps(pkgManager, baseApp)` is called immediately after PROMPT 1 resolves, before PROMPT 2 is shown. It runs concurrently with the remaining prompts.

### Setup

```ts
function setupTmpInstall(baseApp: IntegrationData) {
  const tmpId =
    ".create-qwik-" +
    Math.round(Math.random() * Number.MAX_SAFE_INTEGER)
      .toString(36)
      .toLowerCase();
  const tmpInstallDir = path.resolve(baseApp.target!, "..", tmpId);
  // tmpInstallDir is a sibling of outDir on the same filesystem mountpoint
  // (so node_modules rename is fast)
  fs.mkdirSync(tmpInstallDir);
  fs.copyFileSync(baseApp.dir + "/package.json", tmpInstallDir + "/package.json");
  return { tmpInstallDir };
}
```

### Lifecycle

| Event                                | Description                                                                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start                                | Immediately after PROMPT 1. `installDeps(pkgManager, tmpInstallDir)` runs in the background.                                                                         |
| `backgroundInstall.success`          | Initially `undefined`. Set to `true` or `false` when the background install promise resolves.                                                                        |
| `backgroundInstall.abort()`          | Kills background install, then `fs.rmSync(tmpInstallDir, { recursive: true })`. Called on cancel or when `runDepInstall === false`.                                  |
| `backgroundInstall.complete(outDir)` | Awaits install, renames `node_modules` + lock files from `tmpInstallDir` to `outDir`, runs a second `installDeps`, removes `tmpInstallDir`. Returns boolean success. |

**Joke prompt timing:** The joke is offered only when `backgroundInstall.success === undefined` at joke-prompt time — meaning the install is still running. If background install has already finished, no joke is shown.

---

## Verified from Source

- Commit: `b197b42200e38e6765d5e28142b35bfa0e310368`
- Date: 2026-04-01
- All behavior documented above was verified by direct inspection of the source files listed in the Source Files table.
- No inferred or assumed behavior — every claim traces to a specific code path.
