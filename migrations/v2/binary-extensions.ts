import { extname } from "node:path";

/**
 * Pruned set of binary file extensions relevant to Qwik projects (lowercased, including the dot).
 * Contains ~50 essential entries covering images, fonts, archives, executables, audio, video, and
 * other common binary formats. Excludes niche formats unlikely to appear in a Qwik project.
 */
export const BINARY_EXTENSIONS: Set<string> = new Set([
  // Images
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".ico",
  ".webp",
  ".svg",
  ".tiff",
  ".tif",
  ".avif",
  ".heic",
  ".heif",
  ".apng",

  // Fonts
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",

  // Archives
  ".zip",
  ".gz",
  ".tar",
  ".rar",
  ".7z",
  ".bz2",
  ".xz",
  ".tgz",

  // Executables and binaries
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".a",
  ".o",
  ".bin",

  // Audio
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".aac",
  ".m4a",
  ".opus",

  // Video
  ".mp4",
  ".avi",
  ".mov",
  ".mkv",
  ".webm",
  ".m4v",

  // WebAssembly
  ".wasm",

  // Documents / data
  ".pdf",
  ".sqlite",
  ".db",
  ".plist",
]);

/**
 * Returns true if the given file path has a known binary file extension.
 * The check is case-insensitive.
 */
export function isBinaryPath(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  if (!ext) return false;
  return BINARY_EXTENSIONS.has(ext);
}
