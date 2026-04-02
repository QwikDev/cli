# CQW-PROJECT-STATE: Generated Project File and Package State

**Verified from source:** commit `b197b4220` — 2026-04-01
This document describes the **dist artifacts** in `packages/create-qwik/dist/starters/apps/`. The source starters are in `packages/create-qwik/dist/starters/apps/` (app templates). The CLI source for add/update logic lives in `packages/qwik/src/cli/`.

---

## How to Read This Document

The `create-qwik` scaffolder uses a **two-phase composition model** to assemble the final project directory.

**Regular app starters (empty, playground):**

1. Base layer files are written first (from `apps/base/`)
2. Starter overlay files are merged/written second (from `apps/{starter}/`)

- Files in both layers are merged per file type (see merge rules below)
- Files only in the overlay layer overwrite or create on top of the base
- File annotations below use `[BASE]` or `[STARTER]` to identify origin layer
- Files present in both layers are annotated `[OVERWRITE]` where the overlay wins

**Library starter (special case — single-phase):**

- `getBootstrapApps('library')` returns `{ baseApp: libApp }` with no `starterApp`
- Files come entirely from `apps/library/`; the base layer is never applied
- No `[BASE]` annotations apply — all library files are `[LIBRARY]`

**e2e-library (internal testing use):**

- Has only a single `package.json` with no `__qwik__` display metadata
- Not presented in the interactive starter selection; used for e2e testing only

---

## Source Files (table)

| Starter       | Source Directory    | Phase Role               | `__qwik__.displayName`              | Priority |
| ------------- | ------------------- | ------------------------ | ----------------------------------- | -------- |
| `base`        | `apps/base/`        | Base layer (all apps)    | _(none — filtered from selection)_  | —        |
| `empty`       | `apps/empty/`       | Starter overlay          | Empty App (Qwik + Qwik Router)      | 1        |
| `playground`  | `apps/playground/`  | Starter overlay          | Playground App (Qwik + Qwik Router) | 2        |
| `library`     | `apps/library/`     | Self-contained (no base) | Library (Qwik)                      | -1       |
| `e2e-library` | `apps/e2e-library/` | Internal testing only    | _(none — dashToTitleCase used)_     | —        |

---

## package.json Composition Rules

The final `package.json` in a generated project is assembled in three steps.

### Step 1 — Initial write (`cleanPackageJson`)

`cleanPackageJson()` (in `packages/qwik/src/cli/utils/utils.ts`) is called before any files are copied. It is passed a merged input derived from `baseApp.pkgJson` with two overrides:

```ts
cleanPackageJson({
  ...baseApp.pkgJson,
  name: `my-${appInfo.pkgJson.name}`, // appInfo = starterApp ?? baseApp
  description: appInfo.pkgJson.description,
  scripts: undefined,
  dependencies: undefined,
  devDependencies: undefined,
});
```

The function constructs a `cleanedPkg` containing **only these allowed fields** (in this order):

| Field             | Value source                                                                |
| ----------------- | --------------------------------------------------------------------------- |
| `name`            | `my-{appInfo.pkgJson.name}` (see per-starter table below)                   |
| `version`         | From base package.json (undefined for base — omitted)                       |
| `description`     | `appInfo.pkgJson.description`                                               |
| `scripts`         | `undefined` (passed explicitly as undefined — omitted)                      |
| `dependencies`    | `undefined` (passed explicitly as undefined — omitted)                      |
| `devDependencies` | `undefined` (passed explicitly as undefined — omitted)                      |
| `main`            | From base package.json (absent for base — omitted)                          |
| `qwik`            | From base package.json (absent for base — omitted)                          |
| `module`          | From base package.json (absent for base — omitted)                          |
| `types`           | From base package.json (absent for base — omitted)                          |
| `exports`         | From base package.json (absent for base — omitted)                          |
| `files`           | From base package.json (absent for base — omitted)                          |
| `engines`         | `{ node: srcPkg.engines?.node \|\| '^18.17.0 \|\| ^20.3.0 \|\| >=21.0.0' }` |

After extracting the allowed fields, any **remaining keys** from the source (not in the allowed list, not `__qwik__`) are appended in **sorted alphabetical order**. For the base package.json, the remaining sorted keys are: `engines-annotation`, `private`, `type`.

**Fields stripped:** `scripts`, `dependencies`, `devDependencies`, `__qwik__`, plus any field not in the allowed list and not in the remainder set.

**Resulting initial package.json for regular app starters (empty, playground):**

```json
{
  "name": "my-<starter-name>",
  "description": "<starter description>",
  "engines": { "node": "^18.17.0 || ^20.3.0 || >=21.0.0" },
  "engines-annotation": "Mostly required by sharp which needs a Node-API v9 compatible runtime",
  "private": true,
  "type": "module"
}
```

**For library starter** (library's own pkgJson is used as base — `appInfo = baseApp = library`):

```json
{
  "name": "my-qwik-library-name",
  "version": "0.0.1",
  "description": "Create a Qwik library",
  "main": "./lib/index.qwik.mjs",
  "qwik": "./lib/index.qwik.mjs",
  "types": "./lib/index.d.ts",
  "exports": { ".": { "types": "...", "import": "...", "require": "..." } },
  "files": ["lib"],
  "engines": { "node": "^18.17.0 || ^20.3.0 || >=21.0.0" },
  "private": false,
  "sideEffects": false,
  "type": "module"
}
```

### Step 2 — Base layer merge (regular app starters only)

`mergePackageJsons()` merges the base layer's `package.json` scripts, dependencies, and devDependencies into the initial package.json. After merge, each section is **sorted alphabetically by key**. The `qwik` script is then moved to **last position**.

**Base `scripts` (after sort + qwik-last):**

```json
{
  "build": "qwik build",
  "build.client": "vite build",
  "build.preview": "vite build --ssr src/entry.preview.tsx",
  "build.types": "tsc --incremental --noEmit",
  "deploy": "echo 'Run \"npm run qwik add\" to install a server adapter'",
  "dev": "vite --mode ssr",
  "dev.debug": "node --inspect-brk ./node_modules/vite/bin/vite.js --mode ssr --force",
  "fmt": "prettier --write .",
  "fmt.check": "prettier --check .",
  "lint": "eslint \"src/**/*.ts*\"",
  "preview": "qwik build preview && vite preview --open",
  "start": "vite --open --mode ssr",
  "qwik": "qwik"
}
```

**Base `devDependencies` (alphabetically sorted):**

```json
{
  "@eslint/js": "latest",
  "@qwik.dev/core": "^2.0.0-beta.26",
  "@qwik.dev/router": "^2.0.0-beta.26",
  "@types/node": "24.10.0",
  "eslint": "9.39.2",
  "eslint-plugin-qwik": "^2.0.0-beta.26",
  "globals": "17.0.0",
  "prettier": "3.7.4",
  "typescript": "5.9.3",
  "typescript-eslint": "8.52.0",
  "typescript-plugin-css-modules": "latest",
  "vite": "7.3.1",
  "vite-tsconfig-paths": "^4.2.1"
}
```

### Step 3 — Starter overlay merge (if two-phase)

`mergePackageJsons()` is called again to merge the starter's `package.json` scripts, dependencies, and devDependencies into the result from Step 2. The same sort and qwik-last rules apply.

- **empty starter:** its `package.json` has no `scripts`, `dependencies`, or `devDependencies` — no change from base merge
- **playground starter:** its `package.json` has no `scripts`, `dependencies`, or `devDependencies` — no change from base merge

Therefore, for both `empty` and `playground`, the **final package.json scripts and devDependencies are identical to the base layer result** (Step 2 above).

### Library path (single-phase)

For library, `createFromStarter()` runs `updateApp()` only once — against the library integration. `mergePackageJsons()` merges library's `scripts`, `devDependencies` into the initial package.json from Step 1.

**Library final `scripts` (after sort + qwik-last):**

```json
{
  "build": "qwik build",
  "build.lib": "vite build --mode lib",
  "build.types": "tsc -p tsconfig.types.json --emitDeclarationOnly --incremental false",
  "dev": "vite --mode ssr",
  "dev.debug": "node --inspect-brk ./node_modules/vite/bin/vite.js --mode ssr --force",
  "fmt": "prettier --write .",
  "fmt.check": "prettier --check .",
  "lint": "eslint \"src/**/*.ts*\"",
  "release": "np",
  "start": "vite --open --mode ssr",
  "test": "echo \"No test specified\" && exit 0",
  "qwik": "qwik"
}
```

**Library final `devDependencies` (alphabetically sorted):**

```json
{
  "@eslint/js": "latest",
  "@qwik.dev/core": "2.0.0-beta.26",
  "@qwik.dev/router": "latest",
  "@types/node": "24.10.0",
  "eslint": "9.39.2",
  "eslint-plugin-qwik": "2.0.0-beta.26",
  "globals": "17.0.0",
  "np": "^8.0.4",
  "prettier": "3.7.4",
  "typescript": "5.9.3",
  "typescript-eslint": "8.52.0",
  "vite": "7.3.1",
  "vite-tsconfig-paths": "^4.2.1"
}
```

---

## Generated Project State by Starter

### Base Layer Files (common to all regular app starters)

Every regular app starter (empty, playground) begins with these files written from `apps/base/`. The `gitignore` source file is renamed to `.gitignore` in the output project — this rename is performed by `mergeIntegrationDir()` via `const destName = itemName === 'gitignore' ? '.gitignore' : itemName`.

| Source file (in `apps/base/`)       | Destination in project              | Annotation | Merge behavior                         |
| ----------------------------------- | ----------------------------------- | ---------- | -------------------------------------- |
| `.npmrc`                            | `.npmrc`                            | [BASE]     | create                                 |
| `.prettierignore`                   | `.prettierignore`                   | [BASE]     | mergeIgnoresFile (append unique lines) |
| `.vscode/extensions.json`           | `.vscode/extensions.json`           | [BASE]     | create                                 |
| `.vscode/launch.json`               | `.vscode/launch.json`               | [BASE]     | create                                 |
| `.vscode/qwik-router.code-snippets` | `.vscode/qwik-router.code-snippets` | [BASE]     | create                                 |
| `.vscode/qwik.code-snippets`        | `.vscode/qwik.code-snippets`        | [BASE]     | create                                 |
| `.vscode/settings.json`             | `.vscode/settings.json`             | [BASE]     | mergeVSCodeSettings (JSON merge)       |
| `README.md`                         | `README.md`                         | [BASE]     | mergeReadmes (append to empty dest)    |
| `eslint.config.js`                  | `eslint.config.js`                  | [BASE]     | create                                 |
| `gitignore`                         | `.gitignore`                        | [BASE]     | mergeIgnoresFile                       |
| `package.json`                      | `package.json`                      | [BASE]     | mergePackageJsons (scripts+deps)       |
| `public/favicon.svg`                | `public/favicon.svg`                | [BASE]     | create                                 |
| `public/manifest.json`              | `public/manifest.json`              | [BASE]     | create                                 |
| `public/robots.txt`                 | `public/robots.txt`                 | [BASE]     | create                                 |
| `qwik.env.d.ts`                     | `qwik.env.d.ts`                     | [BASE]     | create                                 |
| `src/entry.preview.tsx`             | `src/entry.preview.tsx`             | [BASE]     | create                                 |
| `src/entry.ssr.tsx`                 | `src/entry.ssr.tsx`                 | [BASE]     | create                                 |
| `src/global.css`                    | `src/global.css`                    | [BASE]     | mergeCss (overwrite during init)       |
| `tsconfig.json`                     | `tsconfig.json`                     | [BASE]     | create                                 |
| `vite.config.ts`                    | `vite.config.ts`                    | [BASE]     | create                                 |

**Total base layer files: 20**

---

### Starter: `empty` (Empty App — Qwik + Qwik Router)

- **Starter id:** `empty`
- **Display name:** Empty App (Qwik + Qwik Router)
- **Priority:** 1
- **package.json `name`:** `my-qwik-empty-starter`
  - derivation: `my-` + `appInfo.pkgJson.name` = `my-` + `qwik-empty-starter`
- **package.json `description`:** `Blank project with routing included`
- **qwikRouter:** true
- **docs:** `['https://qwik.dev/docs/getting-started/']`

**Starter overlay files (from `apps/empty/`):**

| Source file (in `apps/empty/`) | Destination in project | Annotation  | Effect on base file                                         |
| ------------------------------ | ---------------------- | ----------- | ----------------------------------------------------------- |
| `package.json`                 | `package.json`         | [STARTER]   | mergePackageJsons (no new scripts/deps — no change)         |
| `public/favicon.svg`           | `public/favicon.svg`   | [OVERWRITE] | overwrites base favicon.svg                                 |
| `public/robots.txt`            | `public/robots.txt`    | [OVERWRITE] | overwrites base robots.txt                                  |
| `src/global.css`               | `src/global.css`       | [STARTER]   | mergeCss overwrite (installDeps=false → overwrite strategy) |
| `src/root.tsx`                 | `src/root.tsx`         | [STARTER]   | create (not in base)                                        |
| `src/routes/index.tsx`         | `src/routes/index.tsx` | [STARTER]   | create (not in base)                                        |

**Final annotated file tree for `empty` project:**

```
my-project/
├── .gitignore                           [BASE]
├── .npmrc                               [BASE]
├── .prettierignore                      [BASE]
├── .vscode/
│   ├── extensions.json                  [BASE]
│   ├── launch.json                      [BASE]
│   ├── qwik-router.code-snippets        [BASE]
│   ├── qwik.code-snippets               [BASE]
│   └── settings.json                    [BASE]
├── README.md                            [BASE]  (base README content)
├── eslint.config.js                     [BASE]
├── package.json                         [BASE+STARTER]  (merged)
├── public/
│   ├── favicon.svg                      [OVERWRITE]  (empty starter wins)
│   ├── manifest.json                    [BASE]
│   └── robots.txt                       [OVERWRITE]  (empty starter wins)
├── qwik.env.d.ts                        [BASE]
├── src/
│   ├── entry.preview.tsx                [BASE]
│   ├── entry.ssr.tsx                    [BASE]
│   ├── global.css                       [STARTER]  (overwritten by empty)
│   ├── root.tsx                         [STARTER]
│   └── routes/
│       └── index.tsx                    [STARTER]
├── tsconfig.json                        [BASE]
└── vite.config.ts                       [BASE]
```

**Total files: 22** (20 base + 6 starter = 26 raw, minus 4 overwrites = 22 unique)

---

### Starter: `playground` (Playground App — Qwik + Qwik Router)

- **Starter id:** `playground`
- **Display name:** Playground App (Qwik + Qwik Router)
- **Priority:** 2
- **package.json `name`:** `my-qwik-basic-starter`
  - derivation: `my-` + `appInfo.pkgJson.name` = `my-` + `qwik-basic-starter`
- **package.json `description`:** `Demo app with sample routes`
- **qwikRouter:** true
- **docs:** `['https://qwik.dev/docs/getting-started/']`

**Starter overlay files (from `apps/playground/`):**

| Source file (in `apps/playground/`)                       | Destination in project                                    | Annotation  | Effect                                              |
| --------------------------------------------------------- | --------------------------------------------------------- | ----------- | --------------------------------------------------- |
| `package.json`                                            | `package.json`                                            | [STARTER]   | mergePackageJsons (no new scripts/deps — no change) |
| `public/favicon.svg`                                      | `public/favicon.svg`                                      | [OVERWRITE] | overwrites base                                     |
| `public/fonts/poppins-400.woff2`                          | `public/fonts/poppins-400.woff2`                          | [STARTER]   | create                                              |
| `public/fonts/poppins-500.woff2`                          | `public/fonts/poppins-500.woff2`                          | [STARTER]   | create                                              |
| `public/fonts/poppins-700.woff2`                          | `public/fonts/poppins-700.woff2`                          | [STARTER]   | create                                              |
| `public/manifest.json`                                    | `public/manifest.json`                                    | [OVERWRITE] | overwrites base                                     |
| `public/robots.txt`                                       | `public/robots.txt`                                       | [OVERWRITE] | overwrites base                                     |
| `src/components/starter/counter/counter.module.css`       | `src/components/starter/counter/counter.module.css`       | [STARTER]   | create                                              |
| `src/components/starter/counter/counter.tsx`              | `src/components/starter/counter/counter.tsx`              | [STARTER]   | create                                              |
| `src/components/starter/footer/footer.module.css`         | `src/components/starter/footer/footer.module.css`         | [STARTER]   | create                                              |
| `src/components/starter/footer/footer.tsx`                | `src/components/starter/footer/footer.tsx`                | [STARTER]   | create                                              |
| `src/components/starter/gauge/gauge.module.css`           | `src/components/starter/gauge/gauge.module.css`           | [STARTER]   | create                                              |
| `src/components/starter/gauge/index.tsx`                  | `src/components/starter/gauge/index.tsx`                  | [STARTER]   | create                                              |
| `src/components/starter/header/header.module.css`         | `src/components/starter/header/header.module.css`         | [STARTER]   | create                                              |
| `src/components/starter/header/header.tsx`                | `src/components/starter/header/header.tsx`                | [STARTER]   | create                                              |
| `src/components/starter/hero/hero.module.css`             | `src/components/starter/hero/hero.module.css`             | [STARTER]   | create                                              |
| `src/components/starter/hero/hero.tsx`                    | `src/components/starter/hero/hero.tsx`                    | [STARTER]   | create                                              |
| `src/components/starter/icons/qwik.tsx`                   | `src/components/starter/icons/qwik.tsx`                   | [STARTER]   | create                                              |
| `src/components/starter/infobox/infobox.module.css`       | `src/components/starter/infobox/infobox.module.css`       | [STARTER]   | create                                              |
| `src/components/starter/infobox/infobox.tsx`              | `src/components/starter/infobox/infobox.tsx`              | [STARTER]   | create                                              |
| `src/components/starter/next-steps/next-steps.module.css` | `src/components/starter/next-steps/next-steps.module.css` | [STARTER]   | create                                              |
| `src/components/starter/next-steps/next-steps.tsx`        | `src/components/starter/next-steps/next-steps.tsx`        | [STARTER]   | create                                              |
| `src/global.css`                                          | `src/global.css`                                          | [STARTER]   | mergeCss overwrite (installDeps=false → overwrite)  |
| `src/media/thunder.png`                                   | `src/media/thunder.png`                                   | [STARTER]   | create                                              |
| `src/root.tsx`                                            | `src/root.tsx`                                            | [STARTER]   | create                                              |
| `src/routes/demo/flower/flower.css`                       | `src/routes/demo/flower/flower.css`                       | [STARTER]   | create                                              |
| `src/routes/demo/flower/index.tsx`                        | `src/routes/demo/flower/index.tsx`                        | [STARTER]   | create                                              |
| `src/routes/demo/todolist/index.tsx`                      | `src/routes/demo/todolist/index.tsx`                      | [STARTER]   | create                                              |
| `src/routes/demo/todolist/todolist.module.css`            | `src/routes/demo/todolist/todolist.module.css`            | [STARTER]   | create                                              |
| `src/routes/index.tsx`                                    | `src/routes/index.tsx`                                    | [STARTER]   | create                                              |
| `src/routes/layout.tsx`                                   | `src/routes/layout.tsx`                                   | [STARTER]   | create                                              |
| `src/routes/styles.css`                                   | `src/routes/styles.css`                                   | [STARTER]   | create                                              |

**Final annotated file tree for `playground` project:**

```
my-project/
├── .gitignore                                        [BASE]
├── .npmrc                                            [BASE]
├── .prettierignore                                   [BASE]
├── .vscode/
│   ├── extensions.json                               [BASE]
│   ├── launch.json                                   [BASE]
│   ├── qwik-router.code-snippets                     [BASE]
│   ├── qwik.code-snippets                            [BASE]
│   └── settings.json                                 [BASE]
├── README.md                                         [BASE]
├── eslint.config.js                                  [BASE]
├── package.json                                      [BASE+STARTER]  (merged)
├── public/
│   ├── favicon.svg                                   [OVERWRITE]  (playground wins)
│   ├── fonts/
│   │   ├── poppins-400.woff2                         [STARTER]
│   │   ├── poppins-500.woff2                         [STARTER]
│   │   └── poppins-700.woff2                         [STARTER]
│   ├── manifest.json                                 [OVERWRITE]  (playground wins)
│   └── robots.txt                                    [OVERWRITE]  (playground wins)
├── qwik.env.d.ts                                     [BASE]
├── src/
│   ├── components/
│   │   └── starter/
│   │       ├── counter/
│   │       │   ├── counter.module.css                [STARTER]
│   │       │   └── counter.tsx                       [STARTER]
│   │       ├── footer/
│   │       │   ├── footer.module.css                 [STARTER]
│   │       │   └── footer.tsx                        [STARTER]
│   │       ├── gauge/
│   │       │   ├── gauge.module.css                  [STARTER]
│   │       │   └── index.tsx                         [STARTER]
│   │       ├── header/
│   │       │   ├── header.module.css                 [STARTER]
│   │       │   └── header.tsx                        [STARTER]
│   │       ├── hero/
│   │       │   ├── hero.module.css                   [STARTER]
│   │       │   └── hero.tsx                          [STARTER]
│   │       ├── icons/
│   │       │   └── qwik.tsx                          [STARTER]
│   │       ├── infobox/
│   │       │   ├── infobox.module.css                [STARTER]
│   │       │   └── infobox.tsx                       [STARTER]
│   │       └── next-steps/
│   │           ├── next-steps.module.css             [STARTER]
│   │           └── next-steps.tsx                    [STARTER]
│   ├── entry.preview.tsx                             [BASE]
│   ├── entry.ssr.tsx                                 [BASE]
│   ├── global.css                                    [STARTER]  (overwritten by playground)
│   ├── media/
│   │   └── thunder.png                               [STARTER]
│   ├── root.tsx                                      [STARTER]
│   └── routes/
│       ├── demo/
│       │   ├── flower/
│       │   │   ├── flower.css                        [STARTER]
│       │   │   └── index.tsx                         [STARTER]
│       │   └── todolist/
│       │       ├── index.tsx                         [STARTER]
│       │       └── todolist.module.css               [STARTER]
│       ├── index.tsx                                 [STARTER]
│       ├── layout.tsx                                [STARTER]
│       └── styles.css                                [STARTER]
├── tsconfig.json                                     [BASE]
└── vite.config.ts                                    [BASE]
```

**Total files: 49** (20 base + 32 starter = 52 raw, minus 3 overwrites = 49 unique)

---

### Starter: `library` (Library — Qwik)

- **Starter id:** `library`
- **Display name:** Library (Qwik)
- **Priority:** -1
- **SPECIAL: Self-contained — no base layer applied.** `getBootstrapApps('library')` returns `{ baseApp: libApp }` with no `starterApp`. The library app acts as its own base.
- **package.json `name`:** `my-qwik-library-name`
  - derivation: `my-` + `appInfo.pkgJson.name` = `my-` + `qwik-library-name` (appInfo = baseApp = library)
- **package.json `description`:** `Create a Qwik library`
- **package.json `private`:** `false` (NOT private — intended for npm publishing)
- **package.json has extra fields:** `main`, `qwik`, `types`, `exports`, `files`, `sideEffects`
- **docs:** `['https://qwik.dev/docs/getting-started/']`

**Differences from app starters:**

| Feature                        | App starters (empty/playground) | Library starter     |
| ------------------------------ | ------------------------------- | ------------------- |
| Base layer applied             | Yes                             | No                  |
| `.vscode/` directory           | Yes [BASE]                      | No                  |
| `.npmrc`                       | Yes [BASE]                      | No                  |
| `qwik.env.d.ts`                | Yes [BASE]                      | No                  |
| `src/entry.preview.tsx`        | Yes [BASE]                      | No                  |
| `tsconfig.types.json`          | No                              | Yes [LIBRARY]       |
| `src/index.ts`                 | No                              | Yes [LIBRARY]       |
| `src/components/`              | No (empty) / Yes (playground)   | Yes (counter, logo) |
| `package.json.private`         | `true`                          | `false`             |
| `package.json.exports`         | No                              | Yes                 |
| `package.json.main/qwik/types` | No                              | Yes                 |

**All library files (from `apps/library/`):**

| Source file (in `apps/library/`)     | Destination in project               | Annotation |
| ------------------------------------ | ------------------------------------ | ---------- |
| `.prettierignore`                    | `.prettierignore`                    | [LIBRARY]  |
| `README.md`                          | `README.md`                          | [LIBRARY]  |
| `eslint.config.js`                   | `eslint.config.js`                   | [LIBRARY]  |
| `gitignore`                          | `.gitignore`                         | [LIBRARY]  |
| `package.json`                       | `package.json`                       | [LIBRARY]  |
| `src/components/counter/counter.tsx` | `src/components/counter/counter.tsx` | [LIBRARY]  |
| `src/components/logo/logo.tsx`       | `src/components/logo/logo.tsx`       | [LIBRARY]  |
| `src/entry.ssr.tsx`                  | `src/entry.ssr.tsx`                  | [LIBRARY]  |
| `src/global.css`                     | `src/global.css`                     | [LIBRARY]  |
| `src/index.ts`                       | `src/index.ts`                       | [LIBRARY]  |
| `src/root.tsx`                       | `src/root.tsx`                       | [LIBRARY]  |
| `src/routes/index.tsx`               | `src/routes/index.tsx`               | [LIBRARY]  |
| `tsconfig.json`                      | `tsconfig.json`                      | [LIBRARY]  |
| `tsconfig.types.json`                | `tsconfig.types.json`                | [LIBRARY]  |
| `vite.config.ts`                     | `vite.config.ts`                     | [LIBRARY]  |

**Final annotated file tree for `library` project:**

```
my-project/
├── .gitignore                           [LIBRARY]  (renamed from gitignore)
├── .prettierignore                      [LIBRARY]
├── README.md                            [LIBRARY]  (library README; no base README appended)
├── eslint.config.js                     [LIBRARY]
├── package.json                         [LIBRARY]  (has exports, main, qwik, types, sideEffects)
├── src/
│   ├── components/
│   │   ├── counter/
│   │   │   └── counter.tsx              [LIBRARY]
│   │   └── logo/
│   │       └── logo.tsx                 [LIBRARY]
│   ├── entry.ssr.tsx                    [LIBRARY]
│   ├── global.css                       [LIBRARY]
│   ├── index.ts                         [LIBRARY]  (public component exports entry point)
│   ├── root.tsx                         [LIBRARY]
│   └── routes/
│       └── index.tsx                    [LIBRARY]
├── tsconfig.json                        [LIBRARY]
├── tsconfig.types.json                  [LIBRARY]  (unique to library — for declaration emit)
└── vite.config.ts                       [LIBRARY]
```

**Total files: 15** (all from library directory; no base layer)

**Library `.gitignore` content differs from app starters:**

- Does NOT have `.env` or `.planning` entries
- Has `.vscode` as an ignored entry (not selectively unignored for code-snippets)

---

### Starter: `e2e-library` (Internal E2E Testing Only)

- **Starter id:** `e2e-library`
- **No `__qwik__` metadata** — this starter has no `displayName`. `dashToTitleCase('e2e-library')` would produce `E2e-library` if referenced via title-case display, but this starter is not user-facing.
- **Not presented in interactive selection** — it is used exclusively by the e2e test suite
- **Only one file:** `package.json` with `{ "name": "e2e-library", "type": "module" }`
- Because this starter has no base layer applied and minimal content, it produces a near-empty project for testing

---

## README.md Generation

`createFromStarter()` writes an empty `README.md` at the project root before any integration files are copied:

```ts
await fs.promises.writeFile(readmePath, "");
```

Then `mergeReadmes()` runs twice for regular app starters (once during base, once during starter overlay if the starter has a README):

**Step 1 — base layer `mergeReadmes()`:**

- `destContent` starts empty (`''`)
- Since the dest file exists but is empty, `destContent.trim()` = `''`
- Result: `'' + '\n\n' + baseSrcContent` = base README content (leading empty lines trimmed on final `.trim() + '\n'`)
- Type: `modify`
- Package manager substitution: if detected pm is not `npm`, replaces `npm run`/`pnpm run`/`yarn run` with the detected pm

**Step 2 — starter overlay `mergeReadmes()` (if starter has README.md):**

- Neither `empty` nor `playground` starters have a `README.md` — only `base` and `library` have one
- Therefore, for both `empty` and `playground`, the README is the base content only

**Library README:**

- Because library is single-phase, there is no initial empty write followed by a mergeReadmes call against the base README
- Wait: `createFromStarter()` **always** writes `await fs.promises.writeFile(readmePath, '')` first, then calls `updateApp(pkgManager, { rootDir: outDir, integration: baseApp.id })` — for library, `baseApp.id = 'library'`
- So `mergeReadmes()` is called once with `apps/library/README.md` as the source
- Result: library's own README is written (appended to the empty initial file)

**Package manager substitution rule (applies to all README generation):**

- Only substitutes if detected package manager is not `npm`
- Regex: `/\b(npm run|pnpm run|yarn( run)?)\b/g` → replaced with detected pm name
- This means the final README command examples use the user's actual package manager

---

## docs Array (logSuccessFooter)

`createFromStarter()` returns `docs = [...baseApp.docs, ...starterApp.docs]`.

For library (single-phase): `docs = [...libApp.docs]` (baseApp is library; no starterApp).

| Starter      | `baseApp.docs`                                 | `starterApp.docs`                            | Final `docs`                                 |
| ------------ | ---------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| `empty`      | `[]` (base `__qwik__.docs` is not set — empty) | `['https://qwik.dev/docs/getting-started/']` | `['https://qwik.dev/docs/getting-started/']` |
| `playground` | `[]`                                           | `['https://qwik.dev/docs/getting-started/']` | `['https://qwik.dev/docs/getting-started/']` |
| `library`    | `['https://qwik.dev/docs/getting-started/']`   | _(no starterApp)_                            | `['https://qwik.dev/docs/getting-started/']` |

**Note:** The base app (`apps/base/package.json`) does **not** have a `__qwik__` field, so `baseApp.docs` is `[]` for regular starters. The docs value of `['https://qwik.dev/docs/getting-started/']` comes entirely from the starter app's `__qwik__.docs`.

`logAppCreated()` (via `logSuccessFooter`) iterates the `docs` array and displays each URL in the post-scaffolding success note.

---

## File Operation Summary Table

| Starter       | Base files | Starter files | Overwritten files | Final unique file count |
| ------------- | ---------- | ------------- | ----------------- | ----------------------- |
| `empty`       | 20         | 6             | 4                 | 22                      |
| `playground`  | 20         | 32            | 3                 | 49                      |
| `library`     | 0          | 15            | 0                 | 15                      |
| `e2e-library` | 0          | 1             | 0                 | 1                       |

**Overwrite details:**

- `empty` overwrites: `public/favicon.svg`, `public/robots.txt`, `src/global.css` (overwrite strategy), `package.json` (merged, not replaced)
- `playground` overwrites: `public/favicon.svg`, `public/manifest.json`, `public/robots.txt`, `src/global.css` (overwrite strategy), `package.json` (merged)

Note: `package.json` is always merged (not overwritten) via `mergePackageJsons()` for all starters. The "overwrite" count above excludes package.json since it is a merge operation, not a full replacement.

---

## Verified from Source

- **Commit:** `b197b4220`
- **Date:** 2026-04-01
- **Scope:** This document describes the `dist/` artifacts, not the source starters directory. The dist starters are the actual files used at runtime by the CLI.
- **Source starters** (for adapters and features, not app templates) are in `packages/qwik/src/cli/starters/`
- **App templates** are in `packages/create-qwik/dist/starters/apps/`
- The `gitignore` → `.gitignore` rename is performed by `mergeIntegrationDir()` in `packages/qwik/src/cli/add/update-files.ts` line 17: `const destName = itemName === 'gitignore' ? '.gitignore' : itemName`
- `cleanPackageJson()` is in `packages/qwik/src/cli/utils/utils.ts`
- `getBootstrapApps()` is in `packages/create-qwik/src/helpers/templateManager.ts`
- `LIBRARY_ID = 'library'` constant confirms the library special-case branch
