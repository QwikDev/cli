import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAppStartersCache,
  loadAppStarters,
} from "../../../src/integrations/load-app-starters.ts";
import { loadIntegrations } from "../../../src/integrations/load-integrations.ts";

describe("loadAppStarters", () => {
  // Clear cache before each test to ensure fresh discovery
  beforeEach(() => {
    clearAppStartersCache();
  });

  it("discovers all 4 starters from stubs/apps/ (base, empty, library, playground)", async () => {
    const starters = await loadAppStarters();
    expect(starters).toHaveLength(4);
    const ids = starters.map((s) => s.id).sort();
    expect(ids).toEqual(["base", "empty", "library", "playground"]);
  });

  it("includes base starter even though it has no __qwik__ key", async () => {
    const starters = await loadAppStarters();
    const base = starters.find((s) => s.id === "base");
    expect(base).toBeDefined();
    expect(base?.pkgJson.__qwik__).toBeUndefined();
  });

  it("each starter has id, name, pkgJson, dir, filePaths properties", async () => {
    const starters = await loadAppStarters();
    for (const starter of starters) {
      expect(starter).toHaveProperty("id");
      expect(starter).toHaveProperty("name");
      expect(starter).toHaveProperty("pkgJson");
      expect(starter).toHaveProperty("dir");
      expect(starter).toHaveProperty("filePaths");
      expect(typeof starter.id).toBe("string");
      expect(typeof starter.name).toBe("string");
      expect(Array.isArray(starter.filePaths)).toBe(true);
    }
  });
});

describe("loadIntegrations (sanity check)", () => {
  it("still discovers adapters and features (count >= 30)", async () => {
    const integrations = await loadIntegrations();
    expect(integrations.length).toBeGreaterThanOrEqual(30);
  });
});
