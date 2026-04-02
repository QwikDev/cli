import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRegExp, exactly, anyOf } from "magic-regexp";

export class AppCommand {
  readonly args: string[];
  readonly task: string | undefined;
  private _rootDir: string;
  readonly cwd: string;

  constructor(opts: { rootDir: string; cwd: string; args: string[] }) {
    this._rootDir = opts.rootDir;
    this.cwd = opts.cwd;
    this.args = opts.args.slice();
    this.task = this.args[0];
  }

  getArg(name: string): string | undefined {
    const matcher = createRegExp(
      exactly("--" + name)
        .at.lineStart()
        .and(anyOf(exactly("="), exactly("").at.lineEnd())),
    );
    const idx = this.args.findIndex((a) => matcher.test(a));
    if (idx === -1) return undefined;
    const arg = this.args[idx];
    if (arg === undefined) return undefined;
    if (arg.includes("=")) return arg.split("=")[1];
    return this.args[idx + 1];
  }

  get rootDir(): string {
    if (!this._rootDir) {
      // walk up from cwd to find nearest package.json (up to 20 directories)
      let dir = this.cwd;
      for (let i = 0; i < 20; i++) {
        if (existsSync(join(dir, "package.json"))) {
          this._rootDir = dir;
          return dir;
        }
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
      throw new Error("Unable to find Qwik app package.json");
    }
    return this._rootDir;
  }
}
