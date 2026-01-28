/**
 * Platform State Utilities (F-6)
 *
 * Content hashing, file scanning, and parsing for platform state reading.
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { parse as parseYaml } from "yaml";
import type { CourseKitConfig, PlatformOwnedFields } from "../types";
import { DEFAULT_PROTECTED_FIELDS } from "../types";

// =============================================================================
// Content Hashing
// =============================================================================

/**
 * Compute SHA-256 hash of content.
 *
 * @param content - Content string to hash
 * @returns Hex-encoded SHA-256 hash (64 characters)
 */
export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

// =============================================================================
// Platform File Scanning
// =============================================================================

/**
 * Scan platform for lesson files.
 *
 * @param platformRoot - Absolute path to platform root
 * @param courseId - Optional course ID to filter by
 * @returns Array of absolute file paths, sorted alphabetically
 */
export async function scanPlatformLessons(
  platformRoot: string,
  courseId?: string
): Promise<string[]> {
  const contentDir = path.join(platformRoot, "src", "content", "lessons");

  if (!fs.existsSync(contentDir)) {
    return [];
  }

  const pattern = courseId
    ? `${courseId}/**/*.md`
    : "**/*.md";

  const glob = new Bun.Glob(pattern);
  const files: string[] = [];

  for await (const file of glob.scan({ cwd: contentDir, dot: false })) {
    const absolutePath = path.join(contentDir, file);
    try {
      const stats = fs.statSync(absolutePath);
      if (stats.isFile()) {
        files.push(absolutePath);
      }
    } catch {
      // Skip files we can't stat
    }
  }

  return files.sort();
}

/**
 * Scan platform for guide files.
 *
 * @param platformRoot - Absolute path to platform root
 * @param courseId - Optional course ID to filter by
 * @returns Array of absolute file paths, sorted alphabetically
 */
export async function scanPlatformGuides(
  platformRoot: string,
  courseId?: string
): Promise<string[]> {
  const contentDir = path.join(platformRoot, "src", "content", "guides");

  if (!fs.existsSync(contentDir)) {
    return [];
  }

  const pattern = courseId
    ? `${courseId}/**/*.md`
    : "**/*.md";

  const glob = new Bun.Glob(pattern);
  const files: string[] = [];

  for await (const file of glob.scan({ cwd: contentDir, dot: false })) {
    const absolutePath = path.join(contentDir, file);
    try {
      const stats = fs.statSync(absolutePath);
      if (stats.isFile()) {
        files.push(absolutePath);
      }
    } catch {
      // Skip files we can't stat
    }
  }

  return files.sort();
}

// =============================================================================
// Platform File Parsing
// =============================================================================

export interface ParsedPlatformFile {
  frontmatter: Record<string, unknown>;
  body: string;
  error?: string;
}

/**
 * Parse a platform file's frontmatter and body.
 * Never throws - returns error in result object.
 *
 * @param filePath - Absolute path to the file
 * @returns Parsed frontmatter, body, and optional error
 */
export async function parsePlatformFile(
  filePath: string
): Promise<ParsedPlatformFile> {
  try {
    const content = await Bun.file(filePath).text();

    // Match frontmatter block
    const frontmatterMatch = content.match(/^---\r?\n?([\s\S]*?)\r?\n?---/);

    if (!frontmatterMatch) {
      return {
        frontmatter: {},
        body: content,
        error: "No frontmatter found",
      };
    }

    const rawFrontmatter = frontmatterMatch[1].trim();
    const body = content.slice(frontmatterMatch[0].length).trim();

    if (!rawFrontmatter) {
      return {
        frontmatter: {},
        body,
        error: "Empty frontmatter block",
      };
    }

    try {
      const parsed = parseYaml(rawFrontmatter);

      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return {
          frontmatter: {},
          body,
          error: "Frontmatter must be a YAML object",
        };
      }

      return {
        frontmatter: parsed as Record<string, unknown>,
        body,
      };
    } catch (err) {
      return {
        frontmatter: {},
        body,
        error: `YAML parse error: ${err instanceof Error ? err.message : "Unknown error"}`,
      };
    }
  } catch (err) {
    return {
      frontmatter: {},
      body: "",
      error: `File read error: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}

// =============================================================================
// Platform Field Extraction
// =============================================================================

/**
 * Extract platform-owned fields from frontmatter.
 *
 * @param frontmatter - Parsed frontmatter object
 * @param config - CourseKit configuration (may contain custom protected fields)
 * @returns Object containing only platform-owned fields
 */
export function extractPlatformFields(
  frontmatter: Record<string, unknown>,
  _config: CourseKitConfig
): PlatformOwnedFields {
  // Use default protected fields (could be extended via config in future)
  const protectedFields = DEFAULT_PROTECTED_FIELDS;

  const platformFields: PlatformOwnedFields = {};

  for (const field of protectedFields) {
    if (field in frontmatter && frontmatter[field] !== undefined) {
      platformFields[field] = frontmatter[field];
    }
  }

  return platformFields;
}
