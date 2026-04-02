import semver from "semver";

/**
 * A single step in the migration chain.
 */
export interface MigrationStep {
  /** Semver version this migration brings the project to (e.g. "2.0.0") */
  version: string;
  /** Human-readable label (e.g. "v2") */
  label: string;
  /** Function to run the migration */
  run: (rootDir: string) => Promise<void>;
}

/**
 * Build the ordered list of migration steps needed to bring a project from
 * `fromVersion` up to `toVersion`.
 *
 * - If `fromVersion` is null (no Qwik detected), returns ALL registry steps.
 * - Uses semver.coerce() to normalize ranges like "^2.1.0" to "2.1.0".
 * - If coerce() returns null (malformed like "*" or "workspace:*"), returns ALL steps.
 * - Returns only steps where step.version > coerced fromVersion.
 * - Registry is assumed to be pre-ordered; no additional sorting is applied.
 *
 * @param fromVersion - The currently installed version string (may be a range), or null
 * @param toVersion - The target version string
 * @param registry - Ordered array of available migration steps
 * @returns Array of migration steps to run (may be empty if already up to date)
 */
export function buildMigrationChain(
  fromVersion: string | null,
  toVersion: string,
  registry: MigrationStep[],
): MigrationStep[] {
  // If no version found, run everything
  if (fromVersion === null) {
    return [...registry];
  }

  // Normalize the range string to a concrete version
  const coerced = semver.coerce(fromVersion);

  // If coercion fails (malformed version like "*" or "workspace:*"), run everything
  if (coerced === null) {
    return [...registry];
  }

  // Coerce the target version too — this handles pre-release strings like "2.0.0-beta.30"
  // so that a registry step at "2.0.0" is included when targeting "2.0.0-beta.30".
  // Without coercion: semver.lte("2.0.0", "2.0.0-beta.30") === false (stable > pre-release).
  // With coercion: semver.lte("2.0.0", "2.0.0") === true (correct behaviour).
  const coercedTarget = semver.coerce(toVersion);
  const effectiveTarget = coercedTarget?.version ?? toVersion;

  // Return only steps strictly greater than from version AND at or below toVersion
  return registry.filter(
    (step) => semver.gt(step.version, coerced.version) && semver.lte(step.version, effectiveTarget),
  );
}
