import { test } from "@japa/runner";
import { Program } from "../../src/core.js";

// Minimal concrete subclass to test lifecycle ordering
class TestProgram extends Program<{ name?: string }, { name: string }> {
  callOrder: string[] = [];

  protected configure(): void {
    this.callOrder.push("configure");
    this.registerCommand("test", "Test command");
    this.registerOption("name", { type: "string", default: "world" });
  }

  protected parse(argv: string[]): Promise<{ name?: string }> {
    this.callOrder.push("parse");
    return super.parse(argv);
  }

  protected validate(definition: { name?: string }): { name: string } {
    this.callOrder.push("validate");
    return { name: definition.name ?? "world" };
  }

  protected async interact(definition: {
    name?: string;
  }): Promise<{ name: string }> {
    this.callOrder.push("interact");
    return this.validate(definition);
  }

  protected async execute(input: { name: string }): Promise<number> {
    this.callOrder.push(`execute:${input.name}`);
    return 0;
  }
}

test.group("Program - lifecycle ordering (non-interactive)", () => {
  test("run() calls configure -> parse -> validate -> execute in order", async ({
    assert,
  }) => {
    const program = new TestProgram();
    program.setInteractive(false);
    const code = await program.run(["node", "qwik", "test"]);
    assert.strictEqual(code, 0);
    assert.deepEqual(program.callOrder, [
      "configure",
      "parse",
      "validate",
      `execute:world`,
    ]);
  });

  test("run() calls configure -> parse -> interact -> execute when interactive", async ({
    assert,
  }) => {
    const program = new TestProgram();
    program.setInteractive(true);
    const code = await program.run(["node", "qwik", "test"]);
    assert.strictEqual(code, 0);
    assert.deepEqual(program.callOrder, [
      "configure",
      "parse",
      "interact",
      `execute:world`,
    ]);
  });
});

test.group("Program - isIt() CI detection", () => {
  test("isIt() returns false when CI env var is set", ({ assert }) => {
    const program = new TestProgram();
    const originalCI = process.env.CI;
    process.env.CI = "true";
    try {
      assert.isFalse(program.isItPublic());
    } finally {
      if (originalCI === undefined) {
        delete process.env.CI;
      } else {
        process.env.CI = originalCI;
      }
    }
  });

  test("isIt() respects setInteractive(false) override", ({ assert }) => {
    const program = new TestProgram();
    program.setInteractive(false);
    assert.isFalse(program.isItPublic());
  });

  test("isIt() respects setInteractive(true) override", ({ assert }) => {
    const program = new TestProgram();
    program.setInteractive(true);
    // When override is set, it should return the override value
    assert.isTrue(program.isItPublic());
  });
});
