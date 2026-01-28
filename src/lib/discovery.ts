/**
 * Lesson discovery for CourseKit sync (F-2)
 *
 * Discovers lesson markdown files in source repositories.
 */

import { existsSync, readdirSync, readFileSync } from "fs";
import { join, relative } from "path";
import type {
  CourseKitConfig,
  DiscoveredLesson,
  DiscoveryOptions,
  DiscoveryWarning,
  LessonManifest,
} from "../types";
import { parseFilename, parseFrontmatter } from "./discovery-utils";

// =============================================================================
// Error Classes
// =============================================================================

export class DiscoveryError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "DiscoveryError";
  }
}

// =============================================================================
// Directory Scanning
// =============================================================================

/**
 * Scan for course directories in the source root.
 *
 * @param sourceRoot - Root directory containing courses/
 * @returns Array of course IDs (directory names)
 */
export function scanCourses(sourceRoot: string): string[] {
  const coursesDir = join(sourceRoot, "courses");

  if (!existsSync(coursesDir)) {
    return [];
  }

  const entries = readdirSync(coursesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Scan for lesson markdown files in a course's lessons directory.
 *
 * @param sourceRoot - Root directory containing courses/
 * @param courseId - Course directory name
 * @returns Object with files array and optional warning
 */
export function scanLessonFiles(
  sourceRoot: string,
  courseId: string
): { files: string[]; warning?: DiscoveryWarning } {
  const lessonsDir = join(sourceRoot, "courses", courseId, "lessons");

  if (!existsSync(lessonsDir)) {
    return {
      files: [],
      warning: {
        path: lessonsDir,
        code: "MISSING_LESSONS_DIR",
        message: `No lessons directory found for course ${courseId}`,
      },
    };
  }

  const entries = readdirSync(lessonsDir, { withFileTypes: true });
  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".md") &&
        !entry.name.startsWith(".")
    )
    .map((entry) => entry.name)
    .sort();

  if (files.length === 0) {
    return {
      files: [],
      warning: {
        path: lessonsDir,
        code: "EMPTY_LESSONS_DIR",
        message: `No lesson files found in ${courseId}/lessons/`,
      },
    };
  }

  return { files };
}

// =============================================================================
// Main Discovery Function
// =============================================================================

/**
 * Discover all lessons in the configured source repository.
 *
 * @param config - CourseKit configuration
 * @param options - Discovery options
 * @returns Complete lesson manifest with warnings
 */
export function discoverLessons(
  config: CourseKitConfig,
  options: DiscoveryOptions = {}
): LessonManifest {
  // Use sourceRoot from options, or derive from first course's sourceDir, or fall back to cwd
  let sourceRoot = options.sourceRoot;
  if (!sourceRoot) {
    const courses = Object.values(config.courses);
    if (courses.length > 0 && courses[0].sourceDir) {
      // Extract parent of courses/ directory from sourceDir
      // sourceDir is like "/path/to/source/courses/astro-course/lessons"
      // We want "/path/to/source"
      const courseSourceDir = courses[0].sourceDir;
      const coursesMatch = courseSourceDir.match(/^(.+)\/courses\//);
      if (coursesMatch) {
        sourceRoot = coursesMatch[1];
      }
    }
  }
  if (!sourceRoot) {
    sourceRoot = process.cwd();
  }

  const lessons: DiscoveredLesson[] = [];
  const warnings: DiscoveryWarning[] = [];

  // Get courses to scan
  const courseIds = options.courseId
    ? [options.courseId]
    : scanCourses(sourceRoot);

  // Process each course
  for (const courseId of courseIds) {
    const { files, warning } = scanLessonFiles(sourceRoot, courseId);

    if (warning) {
      warnings.push(warning);
      continue;
    }

    // Process each lesson file
    for (const filename of files) {
      const parsed = parseFilename(filename);

      if (!parsed) {
        warnings.push({
          path: join(sourceRoot, "courses", courseId, "lessons", filename),
          code: "INVALID_FILENAME",
          message: `Invalid lesson filename format: ${filename} (expected NN-slug.md)`,
        });
        continue;
      }

      const filePath = join(
        sourceRoot,
        "courses",
        courseId,
        "lessons",
        filename
      );

      // Read file content
      let content: string;
      try {
        content = readFileSync(filePath, "utf-8");
      } catch (err) {
        warnings.push({
          path: filePath,
          code: "READ_ERROR",
          message: `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
        });
        continue;
      }

      // Parse frontmatter
      const { frontmatter, raw, error } = parseFrontmatter(content);

      if (error && error !== "No frontmatter found") {
        warnings.push({
          path: filePath,
          code: "MALFORMED_FRONTMATTER",
          message: error,
        });
      }

      // Build discovered lesson
      const lesson: DiscoveredLesson = {
        path: filePath,
        relativePath: relative(sourceRoot, filePath),
        courseId,
        order: parsed.order,
        slug: parsed.slug,
        frontmatter,
      };

      if (options.includeRaw && raw !== undefined) {
        lesson.rawFrontmatter = raw;
      }

      lessons.push(lesson);
    }
  }

  // Sort lessons by course, then by order
  lessons.sort((a, b) => {
    if (a.courseId !== b.courseId) {
      return a.courseId.localeCompare(b.courseId);
    }
    return a.order - b.order;
  });

  return {
    lessons,
    warnings,
    sourceRoot,
    discoveredAt: new Date(),
  };
}

// =============================================================================
// Exports
// =============================================================================

export { parseFilename, parseFrontmatter } from "./discovery-utils";
