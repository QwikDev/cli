import { describe, expect, it } from "vitest";
import { BINARY_EXTENSIONS, isBinaryPath } from "../../../migrations/v2/binary-extensions.ts";

describe("isBinaryPath - images", () => {
  it("returns true for common image extensions", () => {
    const images = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".avif", ".svg"];
    for (const ext of images) {
      expect(isBinaryPath(`file${ext}`), `expected true for ${ext}`).toBe(true);
    }
  });
});

describe("isBinaryPath - fonts", () => {
  it("returns true for font extensions", () => {
    const fonts = [".woff", ".woff2", ".ttf", ".otf", ".eot"];
    for (const ext of fonts) {
      expect(isBinaryPath(`file${ext}`), `expected true for ${ext}`).toBe(true);
    }
  });
});

describe("isBinaryPath - archives", () => {
  it("returns true for archive extensions", () => {
    const archives = [".zip", ".gz", ".tar", ".7z", ".tgz"];
    for (const ext of archives) {
      expect(isBinaryPath(`file${ext}`), `expected true for ${ext}`).toBe(true);
    }
  });
});

describe("isBinaryPath - executables", () => {
  it("returns true for executable extensions", () => {
    const executables = [".exe", ".dll", ".so", ".dylib", ".bin"];
    for (const ext of executables) {
      expect(isBinaryPath(`file${ext}`), `expected true for ${ext}`).toBe(true);
    }
  });
});

describe("isBinaryPath - audio", () => {
  it("returns true for audio extensions", () => {
    const audio = [".mp3", ".wav", ".ogg", ".flac", ".aac"];
    for (const ext of audio) {
      expect(isBinaryPath(`file${ext}`), `expected true for ${ext}`).toBe(true);
    }
  });
});

describe("isBinaryPath - video", () => {
  it("returns true for video extensions", () => {
    const video = [".mp4", ".avi", ".mov", ".mkv", ".webm"];
    for (const ext of video) {
      expect(isBinaryPath(`file${ext}`), `expected true for ${ext}`).toBe(true);
    }
  });
});

describe("isBinaryPath - other essentials", () => {
  it("returns true for .wasm, .pdf, .sqlite", () => {
    expect(isBinaryPath("module.wasm")).toBe(true);
    expect(isBinaryPath("doc.pdf")).toBe(true);
    expect(isBinaryPath("data.sqlite")).toBe(true);
  });
});

describe("isBinaryPath - source code", () => {
  it("returns false for source code extensions", () => {
    const sourceFiles = [".ts", ".tsx", ".js", ".json", ".css", ".html", ".md"];
    for (const ext of sourceFiles) {
      expect(isBinaryPath(`file${ext}`), `expected false for ${ext}`).toBe(false);
    }
  });
});

describe("BINARY_EXTENSIONS set", () => {
  it("has between 40 and 60 entries", () => {
    expect(BINARY_EXTENSIONS.size).toBeGreaterThanOrEqual(40);
    expect(BINARY_EXTENSIONS.size).toBeLessThanOrEqual(60);
  });

  it("has no duplicate entries", () => {
    const asArray = Array.from(BINARY_EXTENSIONS);
    const asSet = new Set(asArray);
    expect(asArray.length).toBe(asSet.size);
  });
});
