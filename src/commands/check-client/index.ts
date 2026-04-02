import { Program } from "../../core.js";

type CheckClientArgs = { _: string[] };
type CheckClientInput = Record<string, never>;

export class CheckClientProgram extends Program<
  CheckClientArgs,
  CheckClientInput
> {
  protected configure(): void {
    this.registerCommand("check-client", "Check client build freshness");
  }

  protected validate(_definition: CheckClientArgs): CheckClientInput {
    return {};
  }

  protected async execute(_input: CheckClientInput): Promise<number> {
    console.log("check-client command (stub)");
    return 0;
  }
}

export default CheckClientProgram;
