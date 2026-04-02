export interface IntegrationData {
  id: string;
  name: string;
  pkgJson: Record<string, unknown>;
  dir: string;
  filePaths: string[];
}

export interface UpdateAppOptions {
  rootDir: string;
  integration: IntegrationData;
  installDeps: boolean;
  applyViteConfig: boolean; // EB-03: explicit parameter replaces CODE_MOD global
}

export interface UpdateAppResult {
  updates: FileUpdate[];
  integration: IntegrationData;
  commit: (dryRun?: boolean) => Promise<void>;
}

export interface FileUpdate {
  path: string;
  content: string;
  type: "create" | "modify";
}

export interface CreateAppResult {
  outDir: string;
  appId: string;
}

// QWIK_VERSION is injected at build time via tsdown define (EB-05)
declare const QWIK_VERSION: string;
