import detectPackageManager from "which-pm-runs";

export function getPackageManagerName(): string {
  const result = detectPackageManager();
  if (result === undefined) {
    return "pnpm";
  }
  return result.name;
}

export function getPmRunCommand(): string {
  const name = getPackageManagerName();
  if (name === "npm") {
    return "npm run";
  }
  return name;
}
