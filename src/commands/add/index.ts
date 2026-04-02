import { Program } from "../../core.js";

type AddArgs = { _: string[] };
type AddInput = Record<string, never>;

export class AddProgram extends Program<AddArgs, AddInput> {
  protected configure(): void {
    this.registerCommand("add", "Add an integration to this app");
  }

  protected validate(_definition: AddArgs): AddInput {
    return {};
  }

  protected async execute(_input: AddInput): Promise<number> {
    console.log("add command (stub)");
    return 0;
  }
}

export default AddProgram;
