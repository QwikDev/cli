import os from "node:os";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import yargs from "yargs";
import { outro } from "../console.ts";
import { installDeps } from "../integrations/update-app.ts";
import { getPackageManagerName } from "../utils/package-manager.ts";
import { createApp } from "./create-app.ts";
import { initGitRepo } from "./git-init.ts";
import { loadAppStarters } from "../integrations/load-app-starters.ts";

/**
 * Run the create-qwik CLI in non-interactive mode.
 * Args format: <template> <outDir> [--force] [--installDeps]
 */
export async function runCreateCli(args: string[]): Promise<void> {
  const starters = await loadAppStarters();

  // Exclude 'base' — it is not a user-selectable template
  const templateIds = starters.filter((s) => s.id !== "base").map((s) => s.id);

  const parsed = await yargs(args)
    .command("$0 <template> <outDir>", "Create a new Qwik project")
    .positional("template", {
      type: "string",
      choices: templateIds,
      demandOption: true,
      description: "Starter template to use",
    })
    .positional("outDir", {
      type: "string",
      demandOption: true,
      description: "Output directory for the new project",
    })
    .option("force", {
      type: "boolean",
      alias: "f",
      default: false,
      description: "Overwrite existing directory",
    })
    .option("installDeps", {
      type: "boolean",
      alias: "i",
      default: false,
      description: "Install dependencies after scaffolding",
    })
    .strict()
    .parseAsync();

  const template = parsed.template as string;
  const outDirRaw = parsed.outDir as string;

  // Resolve outDir: handle ~/... paths, otherwise resolve against cwd
  let resolvedOutDir: string;
  if (outDirRaw.startsWith("~/")) {
    resolvedOutDir = resolve(os.homedir(), outDirRaw.slice(2));
  } else {
    resolvedOutDir = resolve(process.cwd(), outDirRaw);
  }

  // Check if outDir exists and is non-empty (without --force)
  if (!parsed.force && existsSync(resolvedOutDir)) {
    const entries = readdirSync(resolvedOutDir);
    if (entries.length > 0) {
      throw new Error(
        `Directory already exists and is not empty: ${resolvedOutDir}\nUse --force to overwrite.`,
      );
    }
  }

  await createApp({
    appId: template,
    outDir: resolvedOutDir,
    pkgManager: getPackageManagerName(),
  });

  // Initialize git repo with initial commit (CRQW-13)
  // Non-fatal: initGitRepo returns false on failure, execution continues
  initGitRepo(resolvedOutDir);

  if (parsed.installDeps) {
    await installDeps(resolvedOutDir);
  }

  const pm = getPackageManagerName();
  outro(
    `Project created at ${resolvedOutDir}\n\nNext steps:\n  cd ${resolvedOutDir}\n  ${pm} install\n  ${pm} run dev`,
  );

  process.exit(0);
}
