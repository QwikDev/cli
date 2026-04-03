import { test } from "@japa/runner";
import * as consoleModule from "../../src/console.ts";

test.group("console.ts - bye", () => {
  test("bye() calls process.exit(0)", ({ assert }) => {
    const original = process.exit;
    let capturedCode: number | undefined;
    (process as any).exit = (code?: number): never => {
      capturedCode = code;
      throw new Error(`exit:${code}`);
    };
    try {
      consoleModule.bye();
    } catch (e: unknown) {
      if (!(e instanceof Error) || !e.message.startsWith("exit:")) throw e;
    } finally {
      process.exit = original;
    }
    assert.strictEqual(capturedCode, 0);
  });
});

test.group("console.ts - panic", () => {
  test("panic() calls process.exit(1) and writes to stderr", ({ assert }) => {
    const original = process.exit;
    let capturedCode: number | undefined;
    const stderrChunks: string[] = [];
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      stderrChunks.push(args.map(String).join(" "));
    };
    (process as any).exit = (code?: number): never => {
      capturedCode = code;
      throw new Error(`exit:${code}`);
    };

    try {
      consoleModule.panic("test error message");
    } catch (e: unknown) {
      if (!(e instanceof Error) || !e.message.startsWith("exit:")) throw e;
    } finally {
      process.exit = original;
      console.error = originalConsoleError;
    }

    assert.strictEqual(capturedCode, 1);
    assert.isTrue(
      stderrChunks.some((c) => c.includes("test error message")),
      "stderr should include the error message",
    );
  });
});

test.group("console.ts - printHeader", () => {
  test("printHeader() outputs ASCII art logo fragments", ({ assert }) => {
    const chunks: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      chunks.push(args.map(String).join(" "));
    };

    try {
      consoleModule.printHeader();
    } finally {
      console.log = originalLog;
    }

    const output = chunks.join("\n");
    assert.isTrue(output.length > 0, "printHeader should produce output");
    assert.include(output, ":::");
    assert.include(output, "---");
  });
});
