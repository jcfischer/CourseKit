/**
 * Asset Discovery Utilities (F-5)
 *
 * MIME detection, file stats, and directory scanning for asset files.
 */

import * as fs from "node:fs";
import * as path from "node:path";

// =============================================================================
// MIME Type Detection
// =============================================================================

/**
 * Comprehensive MIME type map for common file extensions.
 * Falls back to application/octet-stream for unknown types.
 */
export const MIME_TYPE_MAP: Record<string, string> = {
  // Images
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  ico: "image/x-icon",
  bmp: "image/bmp",
  tiff: "image/tiff",
  tif: "image/tiff",

  // Documents
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",

  // Videos
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  m4v: "video/x-m4v",

  // Audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  flac: "audio/flac",
  aac: "audio/aac",

  // Archives
  zip: "application/zip",
  tar: "application/x-tar",
  gz: "application/gzip",
  "7z": "application/x-7z-compressed",
  rar: "application/vnd.rar",

  // Data
  json: "application/json",
  xml: "application/xml",
  csv: "text/csv",
  txt: "text/plain",
  md: "text/markdown",
  yaml: "text/yaml",
  yml: "text/yaml",

  // Code
  js: "text/javascript",
  ts: "text/typescript",
  jsx: "text/javascript",
  tsx: "text/typescript",
  css: "text/css",
  html: "text/html",
  py: "text/x-python",
  rb: "text/x-ruby",
  java: "text/x-java",
  go: "text/x-go",
  rs: "text/x-rust",
  sh: "text/x-shellscript",

  // Fonts
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
};

/**
 * Detect MIME type from filename extension.
 * Returns application/octet-stream for unknown extensions.
 *
 * @param filename - File name or path
 * @returns MIME type string
 */
export function detectMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase().slice(1);
  return MIME_TYPE_MAP[ext] || "application/octet-stream";
}

// =============================================================================
// File Stats
// =============================================================================

/**
 * Get file size in bytes.
 * Throws if file doesn't exist or is inaccessible.
 *
 * @param absolutePath - Absolute path to the file
 * @returns File size in bytes
 * @throws Error if file doesn't exist or is inaccessible
 */
export function getFileSize(absolutePath: string): number {
  try {
    const stats = fs.statSync(absolutePath);
    return stats.size;
  } catch (err) {
    if (err instanceof Error) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        throw new Error(`File not found: ${absolutePath}`);
      }
      if (code === "EACCES") {
        throw new Error(`Permission denied: ${absolutePath}`);
      }
    }
    throw err;
  }
}

// =============================================================================
// Directory Scanning
// =============================================================================

/**
 * Scan materials directory for asset files using Bun.Glob.
 * Returns array of relative paths to files in assets directories.
 *
 * @param materialsRoot - Absolute path to materials directory
 * @param options - Scan options
 * @returns Array of relative file paths, sorted alphabetically
 */
export async function scanAssetFiles(
  materialsRoot: string,
  options?: { subdirectory?: string }
): Promise<string[]> {
  // Check if materials directory exists
  if (!fs.existsSync(materialsRoot)) {
    return [];
  }

  // Determine scan root
  const scanRoot = options?.subdirectory
    ? path.join(materialsRoot, options.subdirectory)
    : materialsRoot;

  if (!fs.existsSync(scanRoot)) {
    return [];
  }

  // Use Bun.Glob for recursive scanning of assets directories
  const glob = new Bun.Glob("**/assets/**/*");
  const files: string[] = [];

  for await (const file of glob.scan({ cwd: scanRoot, dot: false })) {
    // Skip directories (Bun.Glob may include them)
    const absolutePath = path.join(scanRoot, file);
    try {
      const stats = fs.statSync(absolutePath);
      if (!stats.isFile()) continue;
    } catch {
      // Skip files we can't stat
      continue;
    }

    // Construct relative path from materials root
    const relativePath = options?.subdirectory
      ? `${options.subdirectory}/${file}`
      : file;

    files.push(relativePath);
  }

  // Sort alphabetically for deterministic ordering
  return files.sort();
}
