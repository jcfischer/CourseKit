/**
 * Diff Calculation (F-7)
 *
 * Calculate differences between source materials and platform state.
 */

import * as path from "node:path";
import type {
  CourseKitConfig,
  DiffItem,
  DiffOptions,
  DiffResult,
  DiffStatus,
  DiffSummary,
  DiscoveredLesson,
  PlatformLesson,
  PlatformGuide,
} from "../types";
import { DEFAULT_PROTECTED_FIELDS } from "../types";
import { discoverLessons } from "./discovery";
import { readPlatformState } from "./platform-state";
import {
  classifyDiffStatus,
  matchFilesBySlug,
  normalizeContent,
} from "./diff-utils";
import { hashContent } from "./platform-utils";

// =============================================================================
// Lesson Diff Calculation (T-5.1)
// =============================================================================

/**
 * Calculate differences between source lessons and platform lessons.
 *
 * @param config - CourseKit configuration
 * @param options - Diff options (courseId filter, includeUnchanged)
 * @returns DiffResult with items and summary
 */
export async function calculateLessonDiff(
  config: CourseKitConfig,
  options: DiffOptions = {}
): Promise<DiffResult> {
  // Discover source lessons
  const sourceManifest = await discoverLessons(config, {
    courseId: options.courseId,
  });

  // Read platform state
  const platformState = await readPlatformState(config, {
    courseId: options.courseId,
    lessonsOnly: true,
  });

  // Match files by slug
  const matches = matchFilesBySlug(sourceManifest.lessons, platformState.lessons);

  // Build diff items
  const items: DiffItem[] = [];
  const summary: DiffSummary = {
    total: 0,
    added: 0,
    modified: 0,
    removed: 0,
    unchanged: 0,
  };

  for (const [key, match] of matches) {
    const parts = key.split("/");
    const courseId = parts[0];
    const slug = parts.slice(1).join("/");

    // Get content hashes
    let sourceHash: string | undefined;
    let sourceFrontmatter: Record<string, unknown> | undefined;

    if (match.source) {
      // Read source file to get body hash
      const sourceContent = await Bun.file(match.source.path).text();
      const bodyMatch = sourceContent.match(/^---[\s\S]*?---\s*([\s\S]*)$/);
      const body = bodyMatch ? bodyMatch[1] : sourceContent;
      sourceHash = hashContent(normalizeContent(body));
      sourceFrontmatter = match.source.frontmatter as Record<string, unknown>;
    }

    let platformHash: string | undefined;
    let platformFrontmatter: Record<string, unknown> | undefined;

    if (match.platform) {
      platformHash = match.platform.contentHash;
      platformFrontmatter = match.platform.frontmatter;
    }

    // Classify the diff
    const classification = classifyDiffStatus(
      sourceFrontmatter,
      sourceHash,
      platformFrontmatter,
      platformHash,
      DEFAULT_PROTECTED_FIELDS
    );

    // Update summary
    summary.total++;
    summary[classification.status]++;

    // Build diff item
    const item: DiffItem = {
      key,
      courseId,
      slug,
      status: classification.status,
      sourcePath: match.source?.path,
      platformPath: match.platform?.path,
      changes: classification.changes,
      bodyChanged: classification.bodyChanged,
    };

    // Include item based on options
    if (options.includeUnchanged || classification.status !== "unchanged") {
      items.push(item);
    }
  }

  // Sort items by status priority, then by key
  const statusOrder: Record<DiffStatus, number> = {
    added: 0,
    modified: 1,
    removed: 2,
    unchanged: 3,
  };

  items.sort((a, b) => {
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    return a.key.localeCompare(b.key);
  });

  return {
    contentType: "lessons",
    items,
    summary,
    calculatedAt: new Date(),
  };
}

// =============================================================================
// Guide Diff Calculation (T-5.2)
// =============================================================================

/**
 * Calculate differences between source guides and platform guides.
 *
 * @param config - CourseKit configuration
 * @param options - Diff options (courseId filter, includeUnchanged)
 * @returns DiffResult with items and summary
 */
export async function calculateGuideDiff(
  config: CourseKitConfig,
  options: DiffOptions = {}
): Promise<DiffResult> {
  // Read platform state for guides
  const platformState = await readPlatformState(config, {
    courseId: options.courseId,
    guidesOnly: true,
  });

  // For guides, we don't have a discovery function yet, so return empty result
  // TODO: Integrate with guide discovery when F-4 is connected
  const summary: DiffSummary = {
    total: platformState.guides.length,
    added: 0,
    modified: 0,
    removed: platformState.guides.length,
    unchanged: 0,
  };

  const items: DiffItem[] = platformState.guides.map(guide => ({
    key: `${guide.courseId}/${guide.slug}`,
    courseId: guide.courseId,
    slug: guide.slug,
    status: "removed" as DiffStatus,
    platformPath: guide.path,
    changes: [],
    bodyChanged: false,
  }));

  // Sort items
  items.sort((a, b) => a.key.localeCompare(b.key));

  return {
    contentType: "guides",
    items,
    summary,
    calculatedAt: new Date(),
  };
}
