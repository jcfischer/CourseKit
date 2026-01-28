/**
 * Discovery utilities for lesson file parsing (F-2)
 *
 * Provides filename parsing and frontmatter extraction.
 */

import { z } from "zod";
import { parse as parseYaml } from "yaml";
import type { LessonFrontmatter } from "../types";

// =============================================================================
// Zod Schemas
// =============================================================================

/** Schema for lesson frontmatter validation */
export const LessonFrontmatterSchema = z
  .object({
    courseSlug: z.string().optional(),
    moduleId: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    order: z.number().optional(),
    durationMinutes: z.number().optional(),
    resources: z
      .array(
        z.object({
          label: z.string(),
          path: z.string(),
        })
      )
      .optional(),
  })
  .passthrough(); // Allow additional fields

/** Regex pattern for valid lesson filenames: {nn}-{slug}.md */
export const LESSON_FILENAME_PATTERN = /^(\d{2,})-([a-z0-9-]+)\.md$/i;

// =============================================================================
// Filename Parsing
// =============================================================================

export interface ParsedFilename {
  order: number;
  slug: string;
}

/**
 * Parse order and slug from a lesson filename.
 *
 * @param filename - The filename to parse (e.g., "01-intro.md")
 * @returns Parsed order and slug, or null if invalid format
 *
 * @example
 * parseFilename("01-intro.md") // { order: 1, slug: "intro" }
 * parseFilename("10-advanced-topics.md") // { order: 10, slug: "advanced-topics" }
 * parseFilename("intro.md") // null (no order prefix)
 */
export function parseFilename(filename: string): ParsedFilename | null {
  const match = filename.match(LESSON_FILENAME_PATTERN);
  if (!match) {
    return null;
  }

  const [, orderStr, slug] = match;
  return {
    order: parseInt(orderStr, 10),
    slug: slug.toLowerCase(),
  };
}

// =============================================================================
// Frontmatter Parsing
// =============================================================================

export interface ParsedFrontmatter {
  frontmatter: LessonFrontmatter;
  raw?: string;
  error?: string;
}

/** Regex to extract frontmatter block between --- delimiters */
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n?---/;

/**
 * Extract and parse YAML frontmatter from markdown content.
 *
 * Never throws - returns empty frontmatter with error message on failure.
 *
 * @param content - Full markdown file content
 * @returns Parsed frontmatter, optional raw string, and optional error
 *
 * @example
 * parseFrontmatter("---\ntitle: Intro\n---\nContent")
 * // { frontmatter: { title: "Intro" }, raw: "title: Intro" }
 *
 * parseFrontmatter("No frontmatter here")
 * // { frontmatter: {}, error: "No frontmatter found" }
 */
export function parseFrontmatter(content: string): ParsedFrontmatter {
  // Check for frontmatter delimiters
  const match = content.match(FRONTMATTER_REGEX);

  if (!match) {
    // Check if content starts with --- but has no closing delimiter
    if (content.trimStart().startsWith("---")) {
      return {
        frontmatter: {},
        error: "Frontmatter opening found but no closing delimiter",
      };
    }
    return {
      frontmatter: {},
      error: "No frontmatter found",
    };
  }

  const raw = match[1];

  // Handle empty frontmatter
  if (!raw.trim()) {
    return {
      frontmatter: {},
      raw,
    };
  }

  // Parse YAML
  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    return {
      frontmatter: {},
      raw,
      error: `Invalid YAML: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Validate with Zod (but allow extra fields via passthrough)
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      frontmatter: {},
      raw,
      error: "Frontmatter must be an object",
    };
  }

  const result = LessonFrontmatterSchema.safeParse(parsed);
  if (!result.success) {
    return {
      frontmatter: parsed as LessonFrontmatter,
      raw,
      error: `Validation warning: ${result.error.issues.map((i) => i.message).join(", ")}`,
    };
  }

  return {
    frontmatter: result.data as LessonFrontmatter,
    raw,
  };
}
