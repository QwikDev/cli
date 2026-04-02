import { Program } from "../../core.js";

type NewArgs = { _: string[] };
type NewInput = Record<string, never>;

export class NewProgram extends Program<NewArgs, NewInput> {
  protected configure(): void {
    this.registerCommand("new", "Create a new component or route");
  }

  protected validate(_definition: NewArgs): NewInput {
    return {};
  }

  protected async execute(_input: NewInput): Promise<number> {
    console.log("new command (stub)");
    return 0;
  }
}

export default NewProgram;
