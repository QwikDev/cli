import semver from "semver";
import { execSync } from "node:child_process";

/**
 * The @qwik.dev/* packages whose versions get updated to the latest v2 dist-tag
 * during migration.
 */
export const PACKAGE_NAMES: string[] = [
  "@qwik.dev/core",
  "@qwik.dev/router",
  "@qwik.dev/react",
];

/**
 * Priority order for selecting which dist-tag version to use.
 * Tags with lower index have higher priority.
 */
export const VERSION_TAG_PRIORITY: string[] = [
  "latest",
  "next",
  "beta",
  "alpha",
];

/**
 * Query npm dist-tags for the given package and return the highest-priority
 * v2.x version string, or null if none is found.
 *
 * npm dist-tag output format is: "tag: version\n" per line.
 *
 * @param packageName - e.g. "@qwik.dev/core"
 * @returns A semver string like "2.1.0" or null
 */
export function getLatestV2Version(packageName: string): string | null {
  let output: string;
  try {
    output = execSync(`npm dist-tag ${packageName}`, { encoding: "utf-8" });
  } catch {
    return null;
  }

  // Parse output: each line is "tag: version"
  const tagMap = new Map<string, string>();
  for (const line of output.split("\n")) {
    const colonIdx = line.indexOf(": ");
    if (colonIdx === -1) continue;
    const tag = line.slice(0, colonIdx).trim();
    const version = line.slice(colonIdx + 2).trim();
    if (tag && version) {
      tagMap.set(tag, version);
    }
  }

  // Sort entries by VERSION_TAG_PRIORITY (lower index = higher priority)
  const sorted = [...tagMap.entries()].sort(([tagA], [tagB]) => {
    const indexA = VERSION_TAG_PRIORITY.indexOf(tagA);
    const indexB = VERSION_TAG_PRIORITY.indexOf(tagB);
    // Known tags sort before unknown tags (unknown = index -1 → treat as very low priority)
    const priorityA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
    const priorityB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;
    return priorityA - priorityB;
  });

  // Find first version where semver.major === 2
  for (const [, version] of sorted) {
    const parsed = semver.valid(version);
    if (parsed && semver.major(parsed) === 2) {
      return parsed;
    }
  }

  return null;
}

/**
 * Resolve v2 versions for all packages in PACKAGE_NAMES.
 *
 * @returns A map of packageName → version string (packages with no v2 version are omitted)
 */
export function resolveV2Versions(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pkg of PACKAGE_NAMES) {
    const version = getLatestV2Version(pkg);
    if (version !== null) {
      result[pkg] = version;
    }
  }
  return result;
}
