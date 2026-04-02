import ignore from "ignore";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

type Ignore = ReturnType<typeof ignore>;

/**
 * Recursively visits all files in a directory, skipping files and directories
 * matched by .gitignore patterns. The .git/ directory is always excluded.
 *
 * The visitor is called with the path relative to process.cwd() (not absolute).
 *
 * NOTE: This always adds `.git` to the ignore rules even without a .gitignore
 * file (safety improvement over the reference implementation).
 *
 * @param dirPath - Absolute path to the directory to traverse
 * @param visitor - Called for each non-ignored file with its relative path
 * @param _ig - Internal: the ignore instance (omit on first call)
 */
export async function visitNotIgnoredFiles(
  dirPath: string,
  visitor: (filePath: string) => void,
  _ig?: Ignore,
): Promise<void> {
  let ig: Ignore;

  if (_ig === undefined) {
    // First call — initialize the ignore instance
    ig = ignore();

    // Always exclude .git, regardless of whether a .gitignore exists
    ig.add(".git");

    const gitignorePath = join(process.cwd(), ".gitignore");
    if (existsSync(gitignorePath)) {
      const contents = readFileSync(gitignorePath, "utf-8");
      ig.add(contents);
    }
  } else {
    ig = _ig;
  }

  const relDir = relative(process.cwd(), dirPath);

  // Skip this directory if it's ignored (only applies to non-root dirs)
  if (relDir && ig.ignores(relDir)) {
    return;
  }

  let entries: string[];
  try {
    entries = readdirSync(dirPath);
  } catch {
    // Directory not readable — skip silently
    return;
  }

  for (const entry of entries) {
    const relPath = relDir ? join(relDir, entry) : entry;

    if (ig.ignores(relPath)) {
      continue;
    }

    const fullPath = join(dirPath, entry);
    let stat;
    try {
      stat = lstatSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      await visitNotIgnoredFiles(fullPath, visitor, ig);
    } else if (stat.isFile()) {
      visitor(relPath);
    }
    // Symlinks are intentionally skipped (not followed)
  }
}
