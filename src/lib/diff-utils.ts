/**
 * Diff Utilities (F-7)
 *
 * Content normalization, file matching, frontmatter comparison,
 * and diff status classification for sync operations.
 */

import type {
  DiffStatus,
  DiscoveredLesson,
  FieldChange,
  PlatformLesson,
} from "../types";

// =============================================================================
// Content Normalization (T-1.1)
// =============================================================================

/**
 * Normalize content for consistent comparison.
 * - Trims leading/trailing whitespace
 * - Normalizes line endings to LF
 * - Collapses multiple blank lines to single blank line
 * - Removes trailing whitespace from lines
 *
 * @param content - Raw content string
 * @returns Normalized content string
 */
export function normalizeContent(content: string): string {
  if (!content) return "";

  return content
    // Normalize all line endings to LF
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Remove trailing whitespace from each line
    .split("\n")
    .map(line => line.trimEnd())
    .join("\n")
    // Collapse multiple blank lines to single
    .replace(/\n{3,}/g, "\n\n")
    // Trim overall content
    .trim();
}

// =============================================================================
// File Matching by Slug (T-2.1)
// =============================================================================

/**
 * Result of matching files between source and platform.
 */
export interface FileMatch<S, P> {
  source?: S;
  platform?: P;
}

/**
 * Match source and platform files by their canonical key (courseId/slug).
 *
 * @param source - Array of discovered source lessons
 * @param platform - Array of platform lessons
 * @returns Map of canonical key to matched files
 */
export function matchFilesBySlug<
  S extends { courseId: string; slug: string },
  P extends { courseId: string; slug: string }
>(source: S[], platform: P[]): Map<string, FileMatch<S, P>> {
  const matches = new Map<string, FileMatch<S, P>>();

  // Add all source files
  for (const s of source) {
    const key = `${s.courseId}/${s.slug}`;
    matches.set(key, { source: s });
  }

  // Add/merge platform files
  for (const p of platform) {
    const key = `${p.courseId}/${p.slug}`;
    const existing = matches.get(key);
    if (existing) {
      existing.platform = p;
    } else {
      matches.set(key, { platform: p });
    }
  }

  return matches;
}

// =============================================================================
// Frontmatter Comparison (T-3.1)
// =============================================================================

/**
 * Deep equality check for values.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === "object") {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, idx) => deepEqual(val, b[idx]));
    }

    if (Array.isArray(a) || Array.isArray(b)) return false;

    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(key =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    );
  }

  return false;
}

/**
 * Compare frontmatter between source and platform, excluding protected fields.
 *
 * @param sourceFrontmatter - Frontmatter from source file
 * @param platformFrontmatter - Frontmatter from platform file
 * @param protectedFields - Fields to exclude from comparison (platform-owned)
 * @returns Array of field changes
 */
export function compareFrontmatter(
  sourceFrontmatter: Record<string, unknown>,
  platformFrontmatter: Record<string, unknown>,
  protectedFields: string[]
): FieldChange[] {
  const changes: FieldChange[] = [];
  const protectedSet = new Set(protectedFields);

  // Get all unique keys from both
  const allKeys = new Set([
    ...Object.keys(sourceFrontmatter),
    ...Object.keys(platformFrontmatter),
  ]);

  for (const key of allKeys) {
    // Skip protected fields
    if (protectedSet.has(key)) continue;

    const sourceValue = sourceFrontmatter[key];
    const platformValue = platformFrontmatter[key];

    const sourceHasKey = key in sourceFrontmatter;
    const platformHasKey = key in platformFrontmatter;

    if (sourceHasKey && !platformHasKey) {
      // Field added in source
      changes.push({
        field: key,
        sourceValue,
        platformValue: undefined,
        changeType: "added",
      });
    } else if (!sourceHasKey && platformHasKey) {
      // Field removed from source
      changes.push({
        field: key,
        sourceValue: undefined,
        platformValue,
        changeType: "removed",
      });
    } else if (!deepEqual(sourceValue, platformValue)) {
      // Field value changed
      changes.push({
        field: key,
        sourceValue,
        platformValue,
        changeType: "modified",
      });
    }
  }

  return changes;
}

// =============================================================================
// Diff Status Classification (T-4.1)
// =============================================================================

/**
 * Result of classifying a diff.
 */
export interface ClassificationResult {
  status: DiffStatus;
  changes: FieldChange[];
  bodyChanged: boolean;
}

/**
 * Classify the diff status for a file comparison.
 *
 * @param sourceFrontmatter - Frontmatter from source (undefined if removed)
 * @param sourceHash - Content hash from source (undefined if removed)
 * @param platformFrontmatter - Frontmatter from platform (undefined if added)
 * @param platformHash - Content hash from platform (undefined if added or missing)
 * @param protectedFields - Platform-owned fields to exclude
 * @returns Classification result with status, changes, and bodyChanged flag
 */
export function classifyDiffStatus(
  sourceFrontmatter: Record<string, unknown> | undefined,
  sourceHash: string | undefined,
  platformFrontmatter: Record<string, unknown> | undefined,
  platformHash: string | undefined,
  protectedFields: string[]
): ClassificationResult {
  // Source-only: file to be added to platform
  if (sourceFrontmatter && !platformFrontmatter) {
    return {
      status: "added",
      changes: [],
      bodyChanged: false,
    };
  }

  // Platform-only: file was removed from source
  if (!sourceFrontmatter && platformFrontmatter) {
    return {
      status: "removed",
      changes: [],
      bodyChanged: false,
    };
  }

  // Both exist: compare them
  if (sourceFrontmatter && platformFrontmatter) {
    // If platform hash is missing, treat as modified to be safe
    if (!platformHash) {
      const changes = compareFrontmatter(
        sourceFrontmatter,
        platformFrontmatter,
        protectedFields
      );
      return {
        status: "modified",
        changes,
        bodyChanged: true,
      };
    }

    const bodyChanged = sourceHash !== platformHash;
    const changes = compareFrontmatter(
      sourceFrontmatter,
      platformFrontmatter,
      protectedFields
    );

    if (!bodyChanged && changes.length === 0) {
      return {
        status: "unchanged",
        changes: [],
        bodyChanged: false,
      };
    }

    return {
      status: "modified",
      changes,
      bodyChanged,
    };
  }

  // Shouldn't happen, but handle edge case
  return {
    status: "unchanged",
    changes: [],
    bodyChanged: false,
  };
}
