import { utimesSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const FIXTURES_DIR = fileURLToPath(new URL("../../fixtures", import.meta.url));

/**
 * Set mtime to a past timestamp to simulate a stale file.
 * atime (access time) is set to same value to avoid OS normalisation.
 */
export function setMtimePast(filePath: string, secondsAgo = 3600): void {
  const past = new Date(Date.now() - secondsAgo * 1000);
  utimesSync(filePath, past, past);
}

/**
 * Set mtime to a future timestamp to simulate a fresh manifest
 * that is newer than all src/ files.
 */
export function setMtimeFuture(filePath: string, secondsAhead = 3600): void {
  const future = new Date(Date.now() + secondsAhead * 1000);
  utimesSync(filePath, future, future);
}

/**
 * Join FIXTURES_DIR with the given path segments for convenient path construction.
 */
export function getFixturePath(...segments: string[]): string {
  return join(FIXTURES_DIR, ...segments);
}
