/**
 * Guide Discovery Utilities (F-4)
 *
 * Filename parsing and frontmatter extraction for guide files.
 */

import { parse as parseYaml } from "yaml";
import { z } from "zod";
import type { GuideFrontmatter } from "../types";

// =============================================================================
// Filename Parsing
// =============================================================================

/**
 * Pattern for guide filenames: guide.md or guide-{slug}.md
 * - guide.md -> slug: "guide"
 * - guide-setup.md -> slug: "setup"
 * - guide-multi-word-slug.md -> slug: "multi-word-slug"
 */
export const GUIDE_FILENAME_PATTERN = /^guide(?:-(.+))?\.md$/i;

export interface ParsedGuideFilename {
  slug: string;
}

/**
 * Parse a guide filename to extract the slug.
 * Returns null if filename doesn't match guide*.md pattern.
 *
 * @param filename - The filename to parse (e.g., "guide-setup.md")
 * @returns Parsed result with slug, or null if not a guide file
 */
export function parseGuideFilename(filename: string): ParsedGuideFilename | null {
  const match = filename.match(GUIDE_FILENAME_PATTERN);
  if (!match) return null;

  // If no suffix after "guide-", use "guide" as slug
  const slug = match[1] || "guide";
  return { slug };
}

// =============================================================================
// Frontmatter Parsing
// =============================================================================

/**
 * Zod schema for guide frontmatter validation.
 * Only title is required; guides are flexible supplementary content.
 */
export const GuideFrontmatterSchema = z
  .object({
    title: z.string().min(1, "Guide must have a title"),
    description: z.string().optional(),
  })
  .passthrough();

export interface ParsedGuideFrontmatter {
  frontmatter: GuideFrontmatter | null;
  raw?: string;
  error?: string;
}

/**
 * Parse frontmatter from guide file content.
 * Returns parsed frontmatter or error details (never throws).
 *
 * @param content - Full file content with YAML frontmatter
 * @returns Parsed result with frontmatter, raw string, or error
 */
export function parseGuideFrontmatter(content: string): ParsedGuideFrontmatter {
  // Match frontmatter block: starts with ---, ends with ---
  const frontmatterMatch = content.match(/^---\r?\n?([\s\S]*?)\r?\n?---/);

  if (!frontmatterMatch) {
    return {
      frontmatter: null,
      error: "No frontmatter found",
    };
  }

  const raw = frontmatterMatch[1].trim();

  // Handle empty frontmatter block
  if (!raw) {
    return {
      frontmatter: null,
      raw: "",
      error: "Empty frontmatter block",
    };
  }

  try {
    const parsed = parseYaml(raw);

    // Handle non-object YAML (e.g., array, string)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {
        frontmatter: null,
        raw,
        error: "Frontmatter must be a YAML object",
      };
    }

    // Validate against schema
    const result = GuideFrontmatterSchema.safeParse(parsed);

    if (!result.success) {
      const firstError = result.error.issues[0];
      return {
        frontmatter: null,
        raw,
        error: firstError?.message || "Invalid frontmatter",
      };
    }

    return {
      frontmatter: result.data as GuideFrontmatter,
      raw,
    };
  } catch (err) {
    return {
      frontmatter: null,
      raw,
      error: `YAML parse error: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}

// =============================================================================
// Directory Scanning
// =============================================================================

/**
 * Scan materials directory for guide files using Bun.Glob.
 * Returns array of relative paths matching guide*.md pattern.
 *
 * @param materialsRoot - Absolute path to materials directory
 * @param options - Scan options
 * @returns Array of relative file paths, sorted alphabetically
 */
export async function scanGuideFiles(
  materialsRoot: string,
  options?: { subdirectory?: string }
): Promise<string[]> {
  const fs = await import("node:fs");
  const path = await import("node:path");

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

  // Use Bun.Glob for recursive scanning
  const glob = new Bun.Glob("**/guide*.md");
  const files: string[] = [];

  for await (const file of glob.scan({ cwd: scanRoot, dot: false })) {
    // Construct relative path from materials root
    const relativePath = options?.subdirectory
      ? `${options.subdirectory}/${file}`
      : file;
    files.push(relativePath);
  }

  // Sort alphabetically for deterministic ordering
  return files.sort();
}
