import { Program } from "../../core.js";

type VersionArgs = { _: string[] };
type VersionInput = Record<string, never>;

export class VersionProgram extends Program<VersionArgs, VersionInput> {
  protected configure(): void {
    this.registerCommand("version", "Print CLI version");
  }

  protected validate(_definition: VersionArgs): VersionInput {
    return {};
  }

  protected async execute(_input: VersionInput): Promise<number> {
    console.log("version command (stub)");
    return 0;
  }
}

export default VersionProgram;
