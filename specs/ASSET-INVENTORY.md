---
title: Starter/Adapter/Feature Asset Inventory
phase: 08-starter-adapter-assets-coupling-report
plan: 01
verified_commit: bfe19e8d9
verified_branch: build/v2
date: 2026-04-01
---

# Asset Inventory: Starters, Adapters, and Features

Complete catalog of every starter, adapter, and feature integration the Qwik CLI can scaffold or install, together with the `loadIntegrations()` discovery flow and the full `qwik add` adapter installation flow.

---

## Source Files

| File Path                                          | Purpose                                                                                                                                        |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/qwik/src/cli/utils/integrations.ts`      | `loadIntegrations()`, `sortIntegrationsAndReturnAsClackOptions()` — discovery entry point and sort helper                                      |
| `packages/qwik/src/cli/types.ts`                   | Type definitions: `IntegrationData`, `IntegrationType`, `IntegrationPackageJson`, `QwikIntegrationConfig`, `ViteConfigUpdates`, `EnsureImport` |
| `packages/qwik/src/cli/add/run-add-command.ts`     | `runAddCommand(app)` — `qwik add` CLI entry point                                                                                              |
| `packages/qwik/src/cli/add/run-add-interactive.ts` | `runAddInteractive(app, id?)` — full add flow including postInstall, viteConfig, commit, process.exit                                          |
| `packages/qwik/src/cli/add/print-add-help.ts`      | `printAddHelp(app)` — renders adapter/feature lists, re-enters interactive flow                                                                |
| `packages/qwik/src/cli/add/update-app.ts`          | `updateApp()` — file merge, dep collection, CODE_MOD gate for viteConfig, commit closure                                                       |
| `packages/qwik/src/cli/utils/install-deps.ts`      | `runInPkg()`, `installDeps()`, `backgroundInstallDeps()` — package manager invocation                                                          |
| `scripts/submodule-cli.ts`                         | Builds `packages/qwik/dist/cli.mjs`; copies `['features', 'adapters']` starters; sets `CODE_MOD=true`                                          |
| `scripts/create-qwik-cli.ts`                       | Builds `packages/create-qwik/dist/index.mjs`; copies `['apps']` starters; sets `CODE_MOD=false`; defines `isValidFsItem()` filter              |
| `starters/apps/base/package.json`                  | Invisible foundation layer; provides all base devDependencies for generated projects                                                           |
| `starters/apps/empty/package.json`                 | "Empty App" starter metadata                                                                                                                   |
| `starters/apps/playground/package.json`            | "Playground App" starter metadata                                                                                                              |
| `starters/apps/library/package.json`               | "Library" starter metadata                                                                                                                     |
| `starters/adapters/*/package.json`                 | Per-adapter metadata (14 adapters)                                                                                                             |
| `starters/features/*/package.json`                 | Per-feature metadata (22 features)                                                                                                             |

---

## Asset Locations: Source vs Distribution

Each CLI bundle resolves starters from its own adjacent `starters/` directory. The two bundles receive different asset types at build time.

| Asset type                 | Source (monorepo)     | `@qwik.dev/core` dist (`cli.mjs`) | `create-qwik` dist (`index.mjs`) |
| -------------------------- | --------------------- | --------------------------------- | -------------------------------- |
| `app` starters             | `starters/apps/`      | NOT copied                        | `dist/starters/apps/`            |
| `feature` integrations     | `starters/features/`  | `dist/starters/features/`         | NOT copied                       |
| `adapter` integrations     | `starters/adapters/`  | `dist/starters/adapters/`         | NOT copied                       |
| templates (for `qwik new`) | `starters/templates/` | `dist/templates/`                 | NOT copied                       |

**Source:** `scripts/submodule-cli.ts` line 50: `copyStartersDir(config, config.distQwikPkgDir, ['features', 'adapters'])`
**Source:** `scripts/create-qwik-cli.ts` line 27: `copyStartersDir(config, distCliDir, ['apps'])`

Templates are a separate copy (not the integrations system): `scripts/submodule-cli.ts` copies `starters/templates/` to `packages/qwik/dist/templates/`.

### `isValidFsItem()` filter (applies during copy)

`scripts/create-qwik-cli.ts` defines a filter that gates which directories are copied into the dist bundle:

```typescript
function isValidFsItem(fsItemName: string) {
  return !IGNORE[fsItemName] && !fsItemName.includes(".prod") && !fsItemName.endsWith("-test");
}

const IGNORE = {
  ".rollup.cache": true,
  build: true,
  server: true,
  e2e: true,
  node_modules: true,
  "package-lock.json": true,
  "starter.tsconfig.json": true,
  "tsconfig.tsbuildinfo": true,
  "yarn.lock": true,
  "pnpm-lock.yaml": true,
};
```

This means the following subdirectories present in `starters/apps/` are NOT copied to the dist bundle and therefore are NOT available to the CLI at runtime:

- `e2e` — explicitly in `IGNORE`
- `qwikrouter-test` — ends in `-test`

Neither directory has a `package.json`, so `loadIntegrations()` would never surface them anyway (see Per-Integration Object Construction below). They are used as local test fixtures only.

---

## App Starters Catalog (`starters/apps/`)

| Directory         | `__qwik__.displayName`                  | `__qwik__.priority` | Shown in interactive prompt | Notes                                                                                                                                                                                                                                           |
| ----------------- | --------------------------------------- | ------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base`            | (absent — no `__qwik__` key)            | (absent)            | No                          | Invisible foundation layer. Never loaded by `loadIntegrations()` because it has no `package.json` `__qwik__` section; filtered via `BASE_ID = 'base'` constant in create-qwik. Provides all base `devDependencies` for every generated project. |
| `empty`           | `"Empty App (Qwik + Qwik Router)"`      | `1`                 | Yes                         | Default interactive selection; sorted second by priority                                                                                                                                                                                        |
| `playground`      | `"Playground App (Qwik + Qwik Router)"` | `2`                 | Yes                         | Sorted first (highest priority); demo app with sample routes                                                                                                                                                                                    |
| `library`         | `"Library (Qwik)"`                      | `-1`                | Yes                         | Sorted last by priority; uses self-contained bootstrap with no base layer merge                                                                                                                                                                 |
| `e2e`             | (no `package.json`)                     | N/A                 | No                          | Local E2E test fixture; excluded by `IGNORE['e2e']` in `isValidFsItem()`                                                                                                                                                                        |
| `qwikrouter-test` | (no `package.json`)                     | N/A                 | No                          | Local router test fixture; excluded by `endsWith('-test')` in `isValidFsItem()`                                                                                                                                                                 |

### `base` devDependencies (full list)

These are the core dependencies present in every generated project, contributed by the `base` layer:

```json
{
  "@qwik.dev/core": "latest",
  "@qwik.dev/router": "latest",
  "@eslint/js": "latest",
  "@types/node": "latest",
  "typescript-eslint": "latest",
  "eslint": "latest",
  "eslint-plugin-qwik": "latest",
  "globals": "latest",
  "prettier": "latest",
  "typescript": "latest",
  "typescript-plugin-css-modules": "latest",
  "vite": "latest",
  "vite-tsconfig-paths": "^4.2.1"
}
```

Note: `syncBaseStarterVersionsFromQwik()` in `scripts/create-qwik-cli.ts` overwrites `@qwik.dev/core`, `@qwik.dev/router`, `eslint-plugin-qwik`, `typescript`, and `vite` with the actual build version at dist time.

---

## Feature Integrations Catalog (`starters/features/`)

Total: **22 features** (verified against directory listing on branch `build/v2`).

The plan anticipated 23 — the actual count is 22.

| Directory                | `__qwik__.displayName`                                     | `__qwik__.priority` | `postInstall`                         | Has `viteConfig` | `viteConfig` keys               |
| ------------------------ | ---------------------------------------------------------- | ------------------- | ------------------------------------- | ---------------- | ------------------------------- |
| `auth`                   | `"Integration: Auth.js (authentication)"`                  | `-10`               | (none)                                | No               | —                               |
| `bootstrap`              | `"Integration: Boostrap"`                                  | `-10`               | (none)                                | Yes (empty `{}`) | —                               |
| `builder.io`             | `"Integration: Builder.io"`                                | `-10`               | (none)                                | Yes              | `imports`, `vitePluginsPrepend` |
| `compiled-i18n`          | `"Integration: compiled-i18n (compile time translations)"` | `-10`               | (none)                                | Yes              | `imports`, `vitePlugins`        |
| `csr`                    | `"Integration: Qwik in browser-only mode"`                 | `-10`               | (none)                                | Yes (empty `{}`) | —                               |
| `cypress`                | `"Integration: Cypress"`                                   | `-10`               | (none)                                | No               | —                               |
| `drizzle`                | `"Integration: Drizzle (Database ORM)"`                    | `-10`               | (none)                                | Yes (empty `{}`) | —                               |
| `leaflet-map`            | `"Integration: Leaflet Maps"`                              | `-10`               | (none)                                | Yes (empty `{}`) | —                               |
| `orama`                  | `"Integration: Orama (full-text search engine)"`           | `-10`               | (none)                                | Yes (empty `{}`) | —                               |
| `pandacss`               | `"Integration: PandaCSS (styling)"`                        | `-10`               | `"panda codegen --silent"`            | Yes              | `imports`, `vitePluginsPrepend` |
| `partytown`              | `"Integration: Partytown (3rd-party scripts)"`             | `-10`               | (none)                                | Yes              | `imports`, `vitePlugins`        |
| `playwright`             | `"Integration: Playwright (E2E Test)"`                     | `-10`               | `"playwright install"`                | Yes (empty `{}`) | —                               |
| `postcss`                | `"Integration: PostCSS (styling)"`                         | `-10`               | (none)                                | Yes (empty `{}`) | —                               |
| `prisma`                 | `"Integration: Prisma (Database ORM)"`                     | `-10`               | `"prisma migrate dev --name initial"` | Yes (empty `{}`) | —                               |
| `react`                  | `"Framework: React"`                                       | `-20`               | (none)                                | Yes              | `imports`, `vitePlugins`        |
| `service-worker`         | `"Feature: Service Worker"`                                | `10`                | (none)                                | No               | —                               |
| `storybook`              | `"Integration: Storybook"`                                 | `-10`               | (none)                                | No               | —                               |
| `styled-vanilla-extract` | `"Integration: Styled-Vanilla-Extract (styling)"`          | `-10`               | (none)                                | Yes              | `imports`, `vitePlugins`        |
| `tailwind`               | `"Integration: Tailwind v4 (styling)"`                     | `-10`               | (none)                                | Yes              | `imports`, `vitePlugins`        |
| `tailwind-v3`            | `"Integration: Tailwind v3 (styling)"`                     | `-10`               | (none)                                | Yes (empty `{}`) | —                               |
| `turso`                  | `"Integration: Turso (database)"`                          | `-10`               | (none)                                | Yes (empty `{}`) | —                               |
| `vitest`                 | `"Integration: Vitest (Unit Test)"`                        | `-15`               | (none)                                | Yes (empty `{}`) | —                               |

**Notes on `viteConfig` column:**

- "No" = `__qwik__.viteConfig` key is absent from the package.json entirely. `updateViteConfigs()` receives `undefined` for this integration and makes no changes.
- "Yes (empty `{}`)" = key is present but the object has no sub-keys. `updateViteConfigs()` is called but applies no modifications.
- "Yes + keys" = the named sub-keys contain actual import/plugin update instructions.

**postInstall exact command strings:**

- `pandacss`: `"panda codegen --silent"` → split by space → args: `['panda', 'codegen', '--silent']`
- `playwright`: `"playwright install"` → split by space → args: `['playwright', 'install']`
- `prisma`: `"prisma migrate dev --name initial"` → split by space → args: `['prisma', 'migrate', 'dev', '--name', 'initial']`

---

## Adapter Integrations Catalog (`starters/adapters/`)

Total: **14 adapters** (verified against directory listing on branch `build/v2`).

| Directory            | `__qwik__.displayName`                            | `__qwik__.priority` | Has `nextSteps` | `devDependencies` (key packages)                                              | `deploy` script | `serve` script |
| -------------------- | ------------------------------------------------- | ------------------- | --------------- | ----------------------------------------------------------------------------- | --------------- | -------------- |
| `aws-lambda`         | `"Adapter: AWS Lambda"`                           | `30`                | No              | `source-map-support`, `serverless`, `serverless-http`, `serverless-offline`   | Yes             | Yes            |
| `azure-swa`          | `"Adapter: Azure Static Web Apps"`                | `30`                | Yes             | `@azure/functions`, `@azure/static-web-apps-cli`                              | No              | Yes            |
| `bun`                | `"Adapter: Bun Server"`                           | `20`                | Yes             | `@types/bun`                                                                  | No              | Yes            |
| `cloud-run`          | `"Adapter: Google Cloud Run server"`              | `20`                | Yes             | (none)                                                                        | Yes             | No             |
| `cloudflare-pages`   | `"Adapter: Cloudflare Pages"`                     | `40`                | Yes             | `wrangler`                                                                    | Yes             | Yes            |
| `cloudflare-workers` | `"Adapter: Cloudflare Workers"`                   | `40`                | Yes             | `@cloudflare/workers-types`, `wrangler`                                       | Yes             | Yes            |
| `deno`               | `"Adapter: Deno Server"`                          | `20`                | Yes             | (none)                                                                        | No              | Yes            |
| `express`            | `"Adapter: Node.js Express Server"`               | `20`                | Yes             | `express`, `@types/compression`, `@types/express`, `compression`, `dotenv`    | No              | Yes            |
| `fastify`            | `"Adapter: Node.js Fastify Server"`               | `20`                | Yes             | `@fastify/compress`, `@fastify/static`, `fastify`, `fastify-plugin`, `dotenv` | No              | Yes            |
| `firebase`           | `"Adapter: Firebase"`                             | `30`                | Yes             | `firebase-tools`                                                              | Yes             | Yes            |
| `netlify-edge`       | `"Adapter: Netlify Edge"`                         | `30`                | Yes             | `@netlify/edge-functions`, `netlify-cli`                                      | Yes             | No             |
| `node-server`        | `"Adapter: Node.js Server"`                       | `19`                | Yes             | (none)                                                                        | No              | Yes            |
| `ssg`                | `"Adapter: Static Site Generation (.html files)"` | `10`                | Yes             | (none)                                                                        | No              | No             |
| `vercel-edge`        | `"Adapter: Vercel Edge"`                          | `30`                | Yes             | `vercel`                                                                      | Yes             | No             |

All 14 adapters include a `build.server` script. Only `aws-lambda` has no `nextSteps` in its `__qwik__` config (it had a separate `nextSteps` title field — verified absent).

**Sorted by priority (descending), then id (ascending):**

1. `cloudflare-pages` (40), `cloudflare-workers` (40)
2. `aws-lambda` (30), `azure-swa` (30), `firebase` (30), `netlify-edge` (30), `vercel-edge` (30)
3. `bun` (20), `cloud-run` (20), `deno` (20), `express` (20), `fastify` (20)
4. `node-server` (19)
5. `ssg` (10)

---

## `loadIntegrations()`: Discovery Flow

Source: `packages/qwik/src/cli/utils/integrations.ts`

### Module-Level Cache

```typescript
let integrations: IntegrationData[] | null = null;

export async function loadIntegrations() {
  if (!integrations) {
    const loadingIntegrations: IntegrationData[] = [];
    // ... build loadingIntegrations ...
    integrations = loadingIntegrations;
  }
  return integrations;
}
```

The cache variable is module-level. **First call** performs all filesystem reads. **Subsequent calls** return the cached array immediately without any I/O. The cache is process-scoped — it lasts for the lifetime of the CLI process and is reset between process invocations.

### starters Directory Resolution

```typescript
const __dirname = dirname(fileURLToPath(import.meta.url));
// ...
const integrationsDir = join(__dirname, "starters");
```

After esbuild bundling, `import.meta.url` points to the compiled output file, so `__dirname` is the directory containing that bundle:

| Bundle                                | `__dirname` at runtime       | `integrationsDir`                     |
| ------------------------------------- | ---------------------------- | ------------------------------------- |
| `packages/qwik/dist/cli.mjs`          | `packages/qwik/dist/`        | `packages/qwik/dist/starters/`        |
| `packages/create-qwik/dist/index.mjs` | `packages/create-qwik/dist/` | `packages/create-qwik/dist/starters/` |

**This is the critical path-coupling mechanism.** Each bundle reads its own adjacent `starters/` directory. There is no shared or configurable path — the starters location is always `join(dirname(bundle), 'starters')`. The asset split (apps vs features+adapters) is enforced purely by what gets copied into each bundle's dist directory at build time.

### Type Category Discovery

```typescript
const integrationTypes: IntegrationType[] = ['app', 'feature', 'adapter'];
const integrationsDirNames = await fs.promises.readdir(integrationsDir);
// e.g. integrationsDirNames = ['adapters', 'apps', 'features']

for each integrationsDirName of integrationsDirNames:
  const integrationType = integrationsDirName.slice(0, integrationsDirName.length - 1);
  // 'adapters' → 'adapter'
  // 'apps'     → 'app'
  // 'features' → 'feature'

  if (integrationTypes.includes(integrationType)):
    // process this directory
```

**Key constraint:** `slice(0, length - 1)` is the **only** mechanism mapping directory names to `IntegrationType` values. It strips exactly one character from the end — the trailing `'s'`. Any directory name whose last character, when stripped, does not produce one of `['app', 'feature', 'adapter']` is **silently ignored**. There is no warning or error for unrecognized directories.

### Per-Integration Object Construction

Executed concurrently via `Promise.all()` at two levels: over `integrationsDirNames`, and over `dirItems` within each type directory.

```typescript
for each dirItem (subdirectory) in dir:
  const dirPath = join(dir, dirItem);
  const stat = await fs.promises.stat(dirPath);

  if (stat.isDirectory()):
    const pkgJson = await readPackageJson(dirPath);
    const integration: IntegrationData = {
      id:          dirItem,                                       // directory name
      name:        pkgJson.__qwik__?.displayName ?? dashToTitleCase(dirItem),
      type:        integrationType,                               // 'app' | 'feature' | 'adapter'
      dir:         dirPath,                                       // absolute path
      pkgJson:     pkgJson,
      docs:        pkgJson.__qwik__?.docs ?? [],
      priority:    pkgJson?.__qwik__?.priority ?? 0,
      alwaysInRoot: pkgJson.__qwik__?.alwaysInRoot ?? [],
    };
    loadingIntegrations.push(integration);
```

Note: only directories are processed (files are skipped). Non-directory filesystem entries in the starters subdirectories are silently ignored.

### Sort Order

Applied once after all concurrent reads complete — sorting is deterministic despite concurrent reads.

```typescript
loadingIntegrations.sort((a, b) => {
  if (a.priority > b.priority) return -1; // descending by priority
  if (a.priority < b.priority) return 1;
  return a.id < b.id ? -1 : 1; // ascending by id (tiebreaker)
});
```

`sortIntegrationsAndReturnAsClackOptions()` applies the same sort independently when called (on a different array reference).

### Concurrency

`Promise.all()` is used at two levels:

1. Outer: over all `integrationsDirNames` (i.e., `apps`, `features`, `adapters` processed concurrently)
2. Inner: over all `dirItems` within each type directory

All reads happen concurrently. The sort is applied only after all reads complete, so the final order is deterministic regardless of I/O completion order.

---

## `IntegrationData`: Metadata Shape

Source: `packages/qwik/src/cli/types.ts`

### `IntegrationData` fields

| Field          | Type                              | Source                                                                                                 | Required                                                                        |
| -------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `id`           | `string`                          | directory name (`dirItem`)                                                                             | Always set                                                                      |
| `type`         | `'app' \| 'feature' \| 'adapter'` | parent dir name with trailing `'s'` stripped                                                           | Always set                                                                      |
| `name`         | `string`                          | `__qwik__.displayName` if present, else `dashToTitleCase(id)`                                          | Always set (fallback guaranteed)                                                |
| `pkgJson`      | `IntegrationPackageJson`          | parsed `package.json` in the starter directory                                                         | Always set                                                                      |
| `dir`          | `string`                          | absolute path to the starter directory                                                                 | Always set                                                                      |
| `priority`     | `number`                          | `__qwik__?.priority ?? 0`                                                                              | Defaults to `0` if absent                                                       |
| `docs`         | `string[]`                        | `__qwik__?.docs ?? []`                                                                                 | Defaults to `[]` if absent                                                      |
| `alwaysInRoot` | `string[]`                        | `__qwik__?.alwaysInRoot ?? []`                                                                         | Defaults to `[]` if absent                                                      |
| `target`       | `string \| undefined`             | Set externally before `backgroundInstallDeps()`                                                        | Optional; not set by `loadIntegrations()`                                       |
| `viteConfig`   | `ViteConfigUpdates \| undefined`  | NOT set by `loadIntegrations()`; read from `pkgJson.__qwik__?.viteConfig` inside `updateViteConfigs()` | Optional; accessed from `pkgJson` directly, not on the `IntegrationData` object |

### `QwikIntegrationConfig` fields (from `__qwik__` in `package.json`)

| Field          | Type                | Required by interface | Default if absent            | Used by                                                                                                       |
| -------------- | ------------------- | --------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `displayName`  | `string`            | No (`?`)              | `dashToTitleCase(id)`        | `loadIntegrations()` → `integration.name`                                                                     |
| `priority`     | `number`            | Yes (no `?`)          | `0` (via `?? 0` in consumer) | `loadIntegrations()` → `integration.priority`; sort order                                                     |
| `docs`         | `string[]`          | No (`?`)              | `[]`                         | `loadIntegrations()` → `integration.docs`; surfaced in `logUpdateAppCommitResult`                             |
| `nextSteps`    | `NextSteps`         | No (`?`)              | Absent                       | `logUpdateAppCommitResult()` — shown after commit as "Action Required!" note                                  |
| `postInstall`  | `string`            | No (`?`)              | Absent                       | `runAddInteractive()` — run via `runInPkg()` after commit; split by `' '` to get args                         |
| `viteConfig`   | `ViteConfigUpdates` | No (`?`)              | Absent                       | `updateViteConfigs()` — applied only when `CODE_MOD=true`                                                     |
| `alwaysInRoot` | `string[]`          | No (`?`)              | `[]`                         | `getFinalDestPath()` in `mergeIntegrationDir()` — named files/dirs go to `rootDir` regardless of `projectDir` |

Note: `priority` is required by the `QwikIntegrationConfig` interface definition, but `loadIntegrations()` applies `?? 0` defensively, so missing `priority` in a real file would not crash — it would default to `0`.

### `ViteConfigUpdates` shape

| Field                | Type                        | Effect when set                                           |
| -------------------- | --------------------------- | --------------------------------------------------------- |
| `imports`            | `EnsureImport[]`            | Add `import` statements to `vite.config.ts`               |
| `viteConfig`         | `{ [key: string]: string }` | Add or update top-level vite config keys                  |
| `vitePlugins`        | `string[]`                  | Append plugin expressions to the `plugins` array          |
| `vitePluginsPrepend` | `string[]`                  | Prepend plugin expressions to the `plugins` array         |
| `qwikViteConfig`     | `{ [key: string]: string }` | Add or update keys inside the `qwikVite()` call arguments |

---

## `dashToTitleCase(id)` Fallback Behavior

When `__qwik__.displayName` is absent, the integration name is derived:

```typescript
str
  .split("-")
  .map((s) => s.slice(0, 1).toUpperCase() + s.substring(1))
  .join(" ");
```

Examples:

- `'aws-lambda'` → `'Aws Lambda'`
- `'node-server'` → `'Node Server'`
- `'e2e'` → `'E2e'`

Note: This fallback is cosmetic only — it would apply to any starter that has no `__qwik__.displayName` but does have a `package.json` (e.g., `base` on `library` if they lacked the field). In practice, every starter with a `package.json` and an `__qwik__` section defines `displayName`.

---

## `qwik add` Adapter Installation Flow

### Step 1: Entry — `runAddCommand(app)`

Source: `packages/qwik/src/cli/add/run-add-command.ts`

```typescript
export async function runAddCommand(app: AppCommand) {
  try {
    const id = app.args[1];
    if (id === "help") {
      await printAddHelp(app);
    } else {
      await runAddInteractive(app, id);
    }
  } catch (e) {
    console.error(`❌ ${red(String(e))}\n`);
    process.exit(1);
  }
}
```

- `app.args[1]` is the second CLI argument (e.g., `qwik add cloudflare-pages` → `id = 'cloudflare-pages'`).
- `id === 'help'` → goes to `printAddHelp` flow (see below).
- Any other value (including `undefined` if no argument was given) → goes to `runAddInteractive`.
- Any uncaught exception: printed as `❌ <message>` and `process.exit(1)`.

### Step 2a: `printAddHelp(app)` (when `id === 'help'`)

Source: `packages/qwik/src/cli/add/print-add-help.ts`

1. Calls `loadIntegrations()` → gets all integrations.
2. Filters: `adapters = integrations.filter(i => i.type === 'adapter')`, `features = integrations.filter(i => i.type === 'feature')`.
3. Renders each group with `renderIntegration()`: `id + padding(max(25 - id.length, 2) spaces) + dim(description)`. Max hint length: 50 characters.
4. Shows `confirm('Do you want to install an integration?', initialValue: true)`.
5. If cancel or `false` → `bye()` (exits cleanly).
6. Shows `select('Select an integration', sortIntegrationsAndReturnAsClackOptions(integrations))` — note: passes ALL integrations (adapters + features combined), not just one group.
7. If cancel → `bye()`.
8. Calls `runAddInteractive(app, command as string)` — re-enters the interactive flow with the selected id.

### Step 2b: `runAddInteractive(app, id?)` — Non-Interactive Path

Source: `packages/qwik/src/cli/add/run-add-interactive.ts`

When `id` is a string (direct CLI argument):

```typescript
integration = integrations.find((i) => i.id === id);
if (!integration) throw new Error(`Invalid integration: ${id}`);
intro(`🦋 Add Integration ${bold(magenta(integration.id))}`);
// skips selection prompt entirely
```

### Step 2c: `runAddInteractive(app, undefined)` — Interactive Path

When `id` is `undefined` (no CLI argument):

```typescript
intro(`🦋 Add Integration`);
const integrationChoices = [
  ...integrations.filter((i) => i.type === "adapter"),
  ...integrations.filter((i) => i.type === "feature"),
];
const integrationAnswer = await select({
  message: "What integration would you like to add?",
  options: await sortIntegrationsAndReturnAsClackOptions(integrationChoices),
});
if (isCancel(integrationAnswer)) bye();
integration = integrations.find((i) => i.id === integrationAnswer);
if (!integration) throw new Error(`Invalid integration: ${id}`);
```

Note: `app` starters are excluded from `integrationChoices`. Only adapters and features appear in the interactive selection.

### Step 3: Install Decision

```typescript
const integrationHasDeps =
  Object.keys({
    ...integration.pkgJson.dependencies,
    ...integration.pkgJson.devDependencies,
  }).length > 0;

let runInstall = false;
if (integrationHasDeps) runInstall = true;
```

`installDeps` in `UpdateAppOptions` is set to `runInstall`. This is `true` only when the integration's `package.json` declares at least one `dependencies` or `devDependencies` entry.

### Step 4: `updateApp()` Call

```typescript
const updateAppOptions: UpdateAppOptions = {
  rootDir: app.rootDir,
  integration: integration.id,
  installDeps: runInstall,
};
if (app.getArg("projectDir")) {
  updateAppOptions.projectDir = projectDir;
}
const result = await updateApp(pkgManager, updateAppOptions);
```

Inside `updateApp()` (source: `packages/qwik/src/cli/add/update-app.ts`):

1. Calls `loadIntegrations()` again (returns cached result).
2. Finds integration by id; throws if not found.
3. Collects `fileUpdates.installedScripts` from `integration.pkgJson.scripts` keys.
4. If `opts.installDeps`: sets `fileUpdates.installedDeps = { ...dependencies, ...devDependencies }`.
5. Calls `mergeIntegrationDir()` to collect file create/overwrite/modify operations.
6. **CODE_MOD gate:**

   ```typescript
   if ((globalThis as any).CODE_MOD) {
     await updateViteConfigs(fileUpdates, integration, opts.rootDir);
   }
   ```

   - `CODE_MOD = true` in `packages/qwik/dist/cli.mjs` → viteConfig updates ARE applied when `qwik add` runs.
   - `CODE_MOD = false` in `packages/create-qwik/dist/index.mjs` → viteConfig updates are NOT applied during `create-qwik` scaffolding.

7. Returns a `result` object with a `commit` closure.

### Step 5: Confirmation Gate (`logUpdateAppResult`)

Only executed when `app.getArg('skipConfirmation') !== 'true'`.

- Renders: modify files, create files, overwrite files, deps to install, scripts to add.
- **Empty check:** if all lists are empty, calls `panic('No updates made')` → logs message + exits.
- Shows `select('Ready to apply...?', [Yes/No])`.
- If cancel or `false` → `bye()`.

### Step 6: Commit

```typescript
await result.commit(true); // showSpinner = true
```

Inside the `commit` closure:

1. Creates all necessary directories with `fs.mkdirSync(dir, { recursive: true })`.
2. Launches `fsWrites = Promise.all(files.map(f => fs.promises.writeFile(f.path, f.content)))`.
3. If `opts.installDeps` and there are deps: runs `installDeps(pkgManager, opts.rootDir)` which calls `runCommand(pkgManager, ['install'], dir)`.
4. Awaits both `fsWrites` and install concurrently.
5. Displays `s.stop('App updated')`.
6. On install failure: logs error message suggesting manual `pkgManager install`.

### Step 7: Post-Install Script

```typescript
const postInstall = result.integration.pkgJson.__qwik__?.postInstall;
if (postInstall) {
  const s = spinner();
  s.start(`Running post install script: ${postInstall}`);
  await runInPkg(pkgManager, postInstall.split(" "), app.rootDir);
  s.stop("Post install script complete");
}
```

`runInPkg(pkgManager, args, cwd)`:

- If `pkgManager === 'npm'`: runs `npx` as the command (not `npm`).
- Otherwise: runs `pkgManager` directly (e.g., `pnpm panda codegen --silent`).
- Returns `runCommand(cmd, args, cwd)`.

Post-install is executed after the commit — file writes and dep installs are already complete.

### Step 8: After Commit

```typescript
logUpdateAppCommitResult(result, pkgManager);
// - If installedScripts: shows "New scripts added" note with each script name
// - If nextSteps: shows "🟣 Action Required!" note with nextSteps.lines
outro(`🦄 Success! Added ${cyan(result.integration.id)} to your app`);

process.exit(0); // always exits 0 on success
```

`process.exit(0)` is called unconditionally on the success path. There is no return from `runAddInteractive()` to the caller on success — the process terminates.

---

## Verification

The following conditions confirm this document's completeness:

- `loadIntegrations()`, `IntegrationData`, `postInstall`, `CODE_MOD`, `qwik add`, adapters, and features are all documented.
- All 14 adapter directories named and described.
- All 22 feature directories named and described (plan estimated 23; actual count is 22 on branch `build/v2`).
- All 4 user-visible app starters named (base, empty, playground, library); plus `e2e` and `qwikrouter-test` documented as non-CLI fixtures.
- `loadIntegrations()` flow covers: module-level cache, `__dirname`-relative path resolution (two bundles resolved separately), `slice(0, -1)` pluralized-to-singular type derivation, concurrent `Promise.all()` reads, and deterministic sort.
- `CODE_MOD` gate for viteConfig documented with both true/false values and their source locations.
- `qwik add` flow documented from entry through `process.exit(0)`.
