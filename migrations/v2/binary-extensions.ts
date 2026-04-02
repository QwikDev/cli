import { extname } from "node:path";

/**
 * Set of known binary file extensions (lowercased, including the dot).
 * Based on the sindresorhus/binary-extensions list.
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
  ".psd",
  ".ai",
  ".eps",
  ".raw",
  ".cr2",
  ".nef",
  ".orf",
  ".sr2",
  ".avif",
  ".heic",
  ".heif",
  ".jxl",
  ".apng",
  ".cur",
  ".ani",
  ".jfif",
  ".jp2",
  ".j2k",
  ".jpf",
  ".jpx",
  ".jpm",

  // Documents
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".odt",
  ".ods",
  ".odp",
  ".pages",
  ".numbers",
  ".key",

  // Archives
  ".zip",
  ".gz",
  ".tar",
  ".rar",
  ".7z",
  ".bz2",
  ".xz",
  ".lz",
  ".lzma",
  ".z",
  ".tgz",
  ".tbz",
  ".tbz2",
  ".txz",
  ".tlz",
  ".cab",
  ".deb",
  ".rpm",
  ".apk",
  ".ipa",
  ".crx",
  ".iso",
  ".img",
  ".dmg",
  ".pkg",
  ".msi",

  // Executables and binaries
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".lib",
  ".a",
  ".o",
  ".obj",
  ".pdb",
  ".com",
  ".bat",
  ".cmd",
  ".scr",
  ".msc",
  ".bin",
  ".elf",
  ".out",
  ".app",

  // Fonts
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
  ".fon",
  ".fnt",
  ".pfb",
  ".pfm",

  // Audio
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".aac",
  ".m4a",
  ".wma",
  ".aiff",
  ".aif",
  ".au",
  ".opus",
  ".mid",
  ".midi",
  ".ra",
  ".ram",
  ".amr",

  // Video
  ".mp4",
  ".avi",
  ".mov",
  ".mkv",
  ".wmv",
  ".flv",
  ".webm",
  ".m4v",
  ".3gp",
  ".3g2",
  ".ogv",
  ".mts",
  ".m2ts",
  ".vob",
  ".mpg",
  ".mpeg",
  ".m2v",
  ".m4p",
  ".m4b",
  ".m4r",
  ".f4v",
  ".f4a",
  ".f4b",
  ".f4p",
  ".swf",
  ".asf",
  ".rm",
  ".rmvb",
  ".divx",

  // Java / compiled bytecode
  ".class",
  ".jar",
  ".war",
  ".ear",

  // Python compiled
  ".pyc",
  ".pyo",
  ".pyd",

  // WebAssembly
  ".wasm",

  // Databases / data stores
  ".sqlite",
  ".sqlite3",
  ".db",
  ".db3",
  ".s3db",
  ".sl3",
  ".mdb",
  ".accdb",

  // 3D / game assets
  ".blend",
  ".fbx",
  ".obj",
  ".dae",
  ".3ds",
  ".max",
  ".ma",
  ".mb",
  ".stl",
  ".glb",
  ".gltf",
  ".nif",
  ".bsa",
  ".pak",
  ".unity",
  ".unitypackage",

  // Flash
  ".swf",
  ".fla",

  // Disk images
  ".vmdk",
  ".vhd",
  ".vdi",
  ".qcow2",

  // Certificates / keys
  ".der",
  ".cer",
  ".crt",
  ".p12",
  ".pfx",
  ".p7b",

  // Other binary formats
  ".nupkg",
  ".snupkg",
  ".rdb",
  ".ldb",
  ".lnk",
  ".DS_Store",
  ".plist",
  ".xib",
  ".nib",
  ".icns",
  ".dSYM",
  ".map",
  ".min",
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
