import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const BIN = join(ROOT, "bin", "qwik.ts");
const CREATE_QWIK_BIN = join(ROOT, "bin", "create-qwik.ts");
// Absolute path to tsx ESM loader — required so --import resolves correctly
// when cwd is a temp directory outside the project root (Node.js ESM loader
// resolution is not affected by NODE_PATH).
const TSX_ESM = join(ROOT, "node_modules", "tsx", "dist", "esm", "index.mjs");

export interface CliResult {
  status: number;
  stdout: string;
  stderr: string;
}

export function runCli(args: string[], cwd?: string): CliResult {
  const result = spawnSync(
    "node",
    ["--import", TSX_ESM, BIN, ...args],
    {
      encoding: "utf-8",
      cwd: cwd ?? ROOT,
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    },
  );
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export function runCreateQwik(args: string[], cwd?: string): CliResult {
  const result = spawnSync(
    "node",
    ["--import", TSX_ESM, CREATE_QWIK_BIN, ...args],
    {
      encoding: "utf-8",
      cwd: cwd ?? ROOT,
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    },
  );
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}
