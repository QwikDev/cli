import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const BIN = join(ROOT, "bin", "qwik.ts");
const CREATE_QWIK_BIN = join(ROOT, "bin", "create-qwik.ts");

export interface CliResult {
  status: number;
  stdout: string;
  stderr: string;
}

export interface RunCliOptions {
  /** Optional stdin data to pipe to the child process (e.g. "y\n" to confirm, "\x03" to cancel) */
  input?: string;
}

export function runCli(args: string[], cwd?: string, options?: RunCliOptions): CliResult {
  const result = spawnSync("node", [BIN, ...args], {
    encoding: "utf-8",
    cwd: cwd ?? ROOT,
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    ...(options?.input !== undefined ? { input: options.input } : {}),
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export function runCreateQwik(args: string[], cwd?: string): CliResult {
  const result = spawnSync("node", [CREATE_QWIK_BIN, ...args], {
    encoding: "utf-8",
    cwd: cwd ?? ROOT,
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}
