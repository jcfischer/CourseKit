/**
 * Platform State Reading (F-6)
 *
 * Reads the current state of lesson, guide, and asset files
 * from the deployment platform (Astro content collections).
 */

import * as path from "node:path";
import * as fs from "node:fs";
import type {
  CourseKitConfig,
  PlatformGuide,
  PlatformLesson,
  PlatformStateManifest,
  PlatformStateOptions,
  PlatformStateWarning,
} from "../types";
import {
  extractPlatformFields,
  hashContent,
  parsePlatformFile,
  scanPlatformGuides,
  scanPlatformLessons,
} from "./platform-utils";

/**
 * Read the current state of content from the platform.
 *
 * @param config - CourseKit configuration
 * @param options - Reading options (courseId filter, content type filter)
 * @returns Platform state manifest with lessons, guides, and warnings
 *
 * @example
 * const config = await loadConfig();
 * const state = await readPlatformState(config);
 * console.log(`Found ${state.lessons.length} lessons on platform`);
 */
export async function readPlatformState(
  config: CourseKitConfig,
  options: PlatformStateOptions = {}
): Promise<PlatformStateManifest> {
  const warnings: PlatformStateWarning[] = [];
  const lessons: PlatformLesson[] = [];
  const guides: PlatformGuide[] = [];

  const platformRoot = config.platform.path;
  const contentDir = path.join(platformRoot, "src", "content");

  // Check if content directory exists
  if (!fs.existsSync(contentDir)) {
    warnings.push({
      code: "MISSING_CONTENT_DIR",
      message: `Platform content directory not found: ${contentDir}`,
    });
    return {
      lessons: [],
      guides: [],
      warnings,
      platformRoot,
      readAt: new Date(),
    };
  }

  // Process lessons (unless guidesOnly)
  if (!options.guidesOnly) {
    const lessonFiles = await scanPlatformLessons(platformRoot, options.courseId);

    for (const filePath of lessonFiles) {
      const lesson = await processLessonFile(filePath, platformRoot, config, warnings);
      if (lesson) {
        lessons.push(lesson);
      }
    }
  }

  // Process guides (unless lessonsOnly)
  if (!options.lessonsOnly) {
    const guideFiles = await scanPlatformGuides(platformRoot, options.courseId);

    for (const filePath of guideFiles) {
      const guide = await processGuideFile(filePath, platformRoot, config, warnings);
      if (guide) {
        guides.push(guide);
      }
    }
  }

  // Sort results
  lessons.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  guides.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return {
    lessons,
    guides,
    warnings,
    platformRoot,
    readAt: new Date(),
  };
}

/**
 * Process a single lesson file.
 */
async function processLessonFile(
  filePath: string,
  platformRoot: string,
  config: CourseKitConfig,
  warnings: PlatformStateWarning[]
): Promise<PlatformLesson | null> {
  const contentDir = path.join(platformRoot, "src", "content", "lessons");
  const relativePath = path.relative(contentDir, filePath);

  // Extract courseId and slug from path
  const parts = relativePath.split(path.sep);
  if (parts.length < 2) {
    warnings.push({
      code: "MALFORMED_FRONTMATTER",
      message: `Invalid lesson path structure: ${relativePath}`,
      filePath,
      relativePath,
    });
    return null;
  }

  const courseId = parts[0];
  const filename = parts[parts.length - 1];
  const slug = filename.replace(/\.md$/, "");

  // Parse file
  const parsed = await parsePlatformFile(filePath);

  if (parsed.error) {
    warnings.push({
      code: "MALFORMED_FRONTMATTER",
      message: parsed.error,
      filePath,
      relativePath,
    });
    // Still return the lesson with empty frontmatter
  }

  // Extract platform fields and hash content
  const platformFields = extractPlatformFields(parsed.frontmatter, config);
  const contentHash = hashContent(parsed.body);

  return {
    path: filePath,
    relativePath,
    courseId,
    slug,
    frontmatter: parsed.frontmatter,
    platformFields,
    contentHash,
  };
}

/**
 * Process a single guide file.
 */
async function processGuideFile(
  filePath: string,
  platformRoot: string,
  config: CourseKitConfig,
  warnings: PlatformStateWarning[]
): Promise<PlatformGuide | null> {
  const contentDir = path.join(platformRoot, "src", "content", "guides");
  const relativePath = path.relative(contentDir, filePath);

  // Extract courseId and slug from path
  const parts = relativePath.split(path.sep);
  if (parts.length < 2) {
    warnings.push({
      code: "MALFORMED_FRONTMATTER",
      message: `Invalid guide path structure: ${relativePath}`,
      filePath,
      relativePath,
    });
    return null;
  }

  const courseId = parts[0];
  const filename = parts[parts.length - 1];
  const slug = filename.replace(/\.md$/, "");

  // Parse file
  const parsed = await parsePlatformFile(filePath);

  if (parsed.error) {
    warnings.push({
      code: "MALFORMED_FRONTMATTER",
      message: parsed.error,
      filePath,
      relativePath,
    });
    // Still return the guide with empty frontmatter
  }

  // Extract platform fields and hash content
  const platformFields = extractPlatformFields(parsed.frontmatter, config);
  const contentHash = hashContent(parsed.body);

  return {
    path: filePath,
    relativePath,
    courseId,
    slug,
    frontmatter: parsed.frontmatter,
    platformFields,
    contentHash,
  };
}
