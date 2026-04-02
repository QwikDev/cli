import { describe, expect, it } from "vitest";
import { buildMigrationChain, type MigrationStep } from "../../../src/upgrade/chain-builder.ts";

const mockRegistry: MigrationStep[] = [
  { version: "2.0.0", label: "v2", run: async () => {} },
  { version: "3.0.0", label: "v3", run: async () => {} },
];

describe("buildMigrationChain", () => {
  it("returns all steps when fromVersion is null", () => {
    const chain = buildMigrationChain(null, "3.0.0", mockRegistry);
    expect(chain).toHaveLength(2);
  });

  it("returns empty chain when already at v2 (exact version '2.1.0')", () => {
    const chain = buildMigrationChain("2.1.0", "2.1.0", mockRegistry);
    expect(chain).toHaveLength(0);
  });

  it("returns empty chain for range string '^2.0.0'", () => {
    const chain = buildMigrationChain("^2.0.0", "2.1.0", mockRegistry);
    expect(chain).toHaveLength(0);
  });

  it("returns v2 step only for v1 project ('^1.9.0')", () => {
    const chain = buildMigrationChain("^1.9.0", "2.1.0", mockRegistry);
    expect(chain).toHaveLength(1);
    expect(chain[0]?.label).toBe("v2");
  });

  it("returns both v2 and v3 for v1 project when target is v3", () => {
    const chain = buildMigrationChain("1.9.0", "3.0.0", mockRegistry);
    expect(chain).toHaveLength(2);
    expect(chain[0]?.label).toBe("v2");
    expect(chain[1]?.label).toBe("v3");
  });

  it("returns v3 only for v2 project", () => {
    const chain = buildMigrationChain("2.1.0", "3.0.0", mockRegistry);
    expect(chain).toHaveLength(1);
    expect(chain[0]?.label).toBe("v3");
  });

  it("returns all steps when fromVersion is malformed ('*')", () => {
    const chain = buildMigrationChain("*", "3.0.0", mockRegistry);
    expect(chain).toHaveLength(2);
  });

  it("returns all steps when fromVersion is 'workspace:*'", () => {
    const chain = buildMigrationChain("workspace:*", "3.0.0", mockRegistry);
    expect(chain).toHaveLength(2);
  });
});
