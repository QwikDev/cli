import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Program } from "../../core.ts";

type VersionArgs = { _: string[] };
type VersionInput = Record<string, never>;

function readPackageVersion(): string {
  const __filename = fileURLToPath(import.meta.url);
  const pkgPath = join(dirname(__filename), "..", "..", "..", "package.json");
  const raw = readFileSync(pkgPath, "utf-8");
  return (JSON.parse(raw) as { version: string }).version;
}

export class VersionProgram extends Program<VersionArgs, VersionInput> {
  protected configure(): void {
    this.registerCommand("version", "Print CLI version");
  }

  protected validate(_definition: VersionArgs): VersionInput {
    return {};
  }

  protected async execute(_input: VersionInput): Promise<number> {
    let version: string;
    try {
      version = QWIK_VERSION;
    } catch {
      version = readPackageVersion();
    }
    console.log(version);
    return 0;
  }
}

export default VersionProgram;
