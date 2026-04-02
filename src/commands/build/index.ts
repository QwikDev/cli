import { Program } from "../../core.js";

type BuildArgs = { _: string[] };
type BuildInput = Record<string, never>;

export class BuildProgram extends Program<BuildArgs, BuildInput> {
  protected configure(): void {
    this.registerCommand("build", "Build the application");
  }

  protected validate(_definition: BuildArgs): BuildInput {
    return {};
  }

  protected async execute(_input: BuildInput): Promise<number> {
    console.log("build command (stub)");
    return 0;
  }
}

export default BuildProgram;
