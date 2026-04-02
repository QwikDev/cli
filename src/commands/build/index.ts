import { readFileSync } from "node:fs";
import { join } from "node:path";
import crossSpawn from "cross-spawn";
import { createRegExp, exactly, oneOrMore, char } from "magic-regexp";
import { Program } from "../../core.js";

type BuildArgs = { _: string[] };
type BuildInput = {
  isPreview: boolean;
  mode: string | undefined;
  scripts: Record<string, string>;
};

function attachMode(script: string, mode: string | undefined): string {
  if (mode === undefined) return script;
  return `${script} --mode ${mode}`;
}

function runSequential(scriptValue: string, cwd: string): void {
  const result = crossSpawn.sync(scriptValue, [], {
    cwd,
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    process.exitCode = 1;
  }
}

function runParallel(scripts: string[], cwd: string): Promise<void[]> {
  const promises = scripts.map((scriptValue) => {
    return new Promise<void>((resolve) => {
      const child = crossSpawn(scriptValue, [], {
        cwd,
        stdio: "inherit",
        shell: true,
      });
      child.on("close", (code) => {
        if (code !== 0) {
          process.exitCode = 1;
        }
        resolve();
      });
      child.on("error", () => {
        process.exitCode = 1;
        resolve();
      });
    });
  });
  return Promise.all(promises);
}

export class BuildProgram extends Program<BuildArgs, BuildInput> {
  protected configure(): void {
    this.registerCommand("build", "Build the application");
    this.registerOption("mode", {
      type: "string",
      description: "Build mode (e.g. staging, production)",
    });
  }

  protected validate(definition: BuildArgs): BuildInput {
    // isPreview: 'preview' in positionals
    const isPreview = definition._.includes("preview");

    // mode: scan process.argv for --mode flag
    let mode: string | undefined;
    const argv = process.argv;
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      if (arg === undefined) continue;
      if (arg === "--mode" && i + 1 < argv.length) {
        mode = argv[i + 1];
        break;
      }
      const modePattern = createRegExp(
        exactly("--mode=")
          .at.lineStart()
          .and(oneOrMore(char).groupedAs("value"))
          .and(exactly("").at.lineEnd()),
      );
      const match = arg.match(modePattern);
      if (match) {
        mode = match.groups?.value;
        break;
      }
    }

    // Read scripts from package.json
    let scripts: Record<string, string> = {};
    try {
      const pkgPath = join(process.cwd(), "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
        scripts?: Record<string, string>;
      };
      scripts = pkg.scripts ?? {};
    } catch {
      console.error("Error: Could not read package.json from", process.cwd());
      process.exitCode = 1;
    }

    return { isPreview, mode, scripts };
  }

  protected async execute(input: BuildInput): Promise<number> {
    const { isPreview, mode, scripts } = input;
    const cwd = process.cwd();

    // 1. Prebuild scripts (sequential)
    const prebuildKeys = Object.keys(scripts).filter((k) => k.startsWith("prebuild."));
    for (const key of prebuildKeys) {
      const scriptVal = scripts[key];
      if (scriptVal) runSequential(scriptVal, cwd);
    }

    // 2. build.client (sequential)
    if (scripts["build.client"]) {
      runSequential(attachMode(scripts["build.client"], mode), cwd);
    }

    // 3. Parallel phase
    const parallelScripts: string[] = [];

    // build.types (no mode)
    if (scripts["build.types"]) {
      parallelScripts.push(scripts["build.types"]);
    }
    // build.lib (with mode)
    if (scripts["build.lib"]) {
      parallelScripts.push(attachMode(scripts["build.lib"], mode));
    }
    // build.preview or build.server (with mode)
    if (isPreview) {
      if (scripts["build.preview"]) {
        parallelScripts.push(attachMode(scripts["build.preview"], mode));
      }
    } else {
      if (scripts["build.server"]) {
        parallelScripts.push(attachMode(scripts["build.server"], mode));
      }
    }
    // build.static (no mode)
    if (scripts["build.static"]) {
      parallelScripts.push(scripts["build.static"]);
    }
    // lint (no mode)
    if (scripts["lint"]) {
      parallelScripts.push(scripts["lint"]);
    }

    if (parallelScripts.length > 0) {
      await runParallel(parallelScripts, cwd);
    }

    // 4. SSG: only if preview AND both build.static and ssg exist
    if (isPreview && scripts["build.static"] && scripts["ssg"]) {
      runSequential(scripts["ssg"], cwd);
    }

    // 5. Postbuild scripts (sequential)
    const postbuildKeys = Object.keys(scripts).filter((k) => k.startsWith("postbuild."));
    for (const key of postbuildKeys) {
      const scriptVal = scripts[key];
      if (scriptVal) runSequential(scriptVal, cwd);
    }

    // CRITICAL: return process.exitCode so router's process.exit() propagates failure
    const exitCode = process.exitCode;
    return typeof exitCode === "number" ? exitCode : 0;
  }
}

export default BuildProgram;
