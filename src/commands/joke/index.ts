import { Program } from "../../core.ts";
import { getRandomJoke } from "./jokes.ts";

type JokeArgs = { _: string[] };
type JokeInput = Record<string, never>;

export class JokeProgram extends Program<JokeArgs, JokeInput> {
  protected configure(): void {
    this.registerCommand("joke", "Tell a random dad joke");
  }

  protected validate(_definition: JokeArgs): JokeInput {
    return {};
  }

  protected async execute(_input: JokeInput): Promise<number> {
    const [setup, punchline] = getRandomJoke();
    console.log(setup);
    console.log(punchline);
    return 0;
  }
}

export default JokeProgram;
