import os from "node:os";
import { existsSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import { confirm, intro, isCancel, note, outro, select, spinner, text } from "@clack/prompts";
import { bye } from "../console.ts";
import { getRandomJoke } from "../commands/joke/jokes.ts";
import { installDeps } from "../integrations/update-app.ts";
import { loadAppStarters } from "../integrations/load-app-starters.ts";
import { name as detectedPm } from "panam/pm";
import { backgroundInstallDeps } from "./background-install.ts";
import { createApp } from "./create-app.ts";
import { initGitRepo } from "./git-init.ts";

/**
 * Run the create-qwik interactive CLI.
 *
 * Presents a 6-step prompt flow:
 *   1. Intro + 500ms pause
 *   2. Project directory selection
 *   3. Starter template selection
 *   4. Package manager selection
 *   5. Install dependencies confirmation (with joke while waiting)
 *   6. Git init confirmation
 *
 * Background dependency install begins immediately after Prompt 2 to
 * overlap with the remaining user prompts.
 */
export async function runCreateInteractiveCli(): Promise<void> {
  // Load starters upfront
  const starters = await loadAppStarters();
  const baseApp = starters.find((s) => s.id === "base");
  const selectableStarters = starters.filter((s) => s.id !== "base");

  if (!baseApp) {
    throw new Error("base starter not found in stubs/apps/");
  }

  // Step 1: Intro + 500ms pause (spec-required delay)
  intro("Let's create a Qwik app");
  await new Promise<void>((r) => setTimeout(r, 500));

  // We track bgInstall across prompts so cancel handlers can abort it
  let bgInstall: ReturnType<typeof backgroundInstallDeps> | null = null;

  try {
    // -------------------------------------------------------------------------
    // Prompt 2: Project directory
    // -------------------------------------------------------------------------
    const dirAnswer = await text({
      message: "Where would you like to create your new project?",
      placeholder: "./qwik-app",
      defaultValue: "./qwik-app",
    });

    if (isCancel(dirAnswer)) {
      bye();
    }

    const dirRaw = (dirAnswer as string) || "./qwik-app";

    // Resolve path: support ~/... or relative to cwd
    let resolvedOutDir: string;
    if (dirRaw.startsWith("~/")) {
      resolvedOutDir = resolve(os.homedir(), dirRaw.slice(2));
    } else {
      resolvedOutDir = resolve(process.cwd(), dirRaw);
    }

    // Start background install immediately (runs concurrently with remaining prompts)
    bgInstall = backgroundInstallDeps(baseApp.dir, resolvedOutDir);

    // Guard: if outDir already exists and is non-empty, abort and error
    if (existsSync(resolvedOutDir)) {
      const entries = readdirSync(resolvedOutDir);
      if (entries.length > 0) {
        await bgInstall.abort();
        throw new Error(`Directory already exists and is not empty: ${resolvedOutDir}`);
      }
    }

    // -------------------------------------------------------------------------
    // Prompt 3: Starter selection
    // -------------------------------------------------------------------------
    const starterAnswer = await select({
      message: "Select a starter",
      options: selectableStarters.map((s) => ({
        value: s.id,
        label: s.name,
        hint: s.id,
      })),
    });

    if (isCancel(starterAnswer)) {
      await bgInstall.abort();
      bye();
    }

    const selectedStarter = starterAnswer as string;

    // -------------------------------------------------------------------------
    // Prompt 4: Package manager selection
    // -------------------------------------------------------------------------
    const pmAnswer = await select({
      message: "Which package manager do you prefer?",
      options: (["npm", "pnpm", "yarn", "bun"] as const).map((pm) => {
        const opt: { value: string; label: string; hint?: string } = { value: pm, label: pm };
        if (pm === detectedPm) {
          opt.hint = "(detected)";
        }
        return opt;
      }),
      initialValue: detectedPm,
    });

    if (isCancel(pmAnswer)) {
      await bgInstall.abort();
      bye();
    }

    const selectedPm = pmAnswer as string;

    // -------------------------------------------------------------------------
    // Prompt 5: Install dependencies
    // -------------------------------------------------------------------------
    const installAnswer = await confirm({
      message: "Would you like to install dependencies?",
    });

    if (isCancel(installAnswer)) {
      await bgInstall.abort();
      bye();
    }

    const shouldInstall = installAnswer as boolean;

    // If user wants deps and background install is still running, display a joke
    // while we wait for it to finish
    if (shouldInstall && bgInstall.success === undefined) {
      const [setup, punchline] = getRandomJoke();
      note(`${setup}\n\n${punchline}`, "While you wait...");

      const s = spinner();
      s.start("Installing dependencies");
      // Wait for the background install result (complete() is called later)
      await new Promise<void>((r) => {
        const check = () => {
          if (bgInstall!.success !== undefined) {
            r();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
      s.stop("Dependencies install ready");
    }

    // -------------------------------------------------------------------------
    // Prompt 6: Git init
    // -------------------------------------------------------------------------
    const gitAnswer = await confirm({
      message: "Initialize a new git repository?",
    });

    if (isCancel(gitAnswer)) {
      await bgInstall.abort();
      bye();
    }

    const shouldGitInit = gitAnswer as boolean;

    // -------------------------------------------------------------------------
    // Create the project
    // -------------------------------------------------------------------------
    await createApp({
      appId: selectedStarter,
      outDir: resolvedOutDir,
      pkgManager: selectedPm,
    });

    // Handle dependency installation
    if (shouldInstall) {
      if (bgInstall.success !== false) {
        // Background install succeeded (or is still running) — move results in
        const ok = await bgInstall.complete(resolvedOutDir);
        if (!ok) {
          // Background install failed — fall back to running install synchronously
          await installDeps(resolvedOutDir);
        }
      } else {
        // Background install already failed — run deps synchronously
        await installDeps(resolvedOutDir);
      }
    } else {
      // User declined deps — abort background install and clean up
      await bgInstall.abort();
    }

    // Initialize git repository (non-fatal)
    if (shouldGitInit) {
      initGitRepo(resolvedOutDir);
    }

    // Print next steps
    const relDir = relative(process.cwd(), resolvedOutDir);
    const nextSteps = [
      `cd ${relDir}`,
      ...(!shouldInstall ? [`${selectedPm} install`] : []),
      `${selectedPm} run dev`,
    ].join("\n");

    note(nextSteps, "Next steps");

    outro("Happy coding!");
    process.exit(0);
  } catch (e: unknown) {
    // On any error, abort background install to avoid orphan tmp dirs
    if (bgInstall) {
      await bgInstall.abort().catch(() => {});
    }
    throw e;
  }
}
