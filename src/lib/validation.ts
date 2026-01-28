/**
 * Frontmatter validation for CourseKit sync (F-3)
 *
 * Validates lesson frontmatter against required fields and config.
 */

import { z } from "zod";
import type {
  CourseKitConfig,
  DiscoveredLesson,
  FileValidation,
  LessonManifest,
  ValidationIssue,
  ValidationResult,
  ValidationWarning,
} from "../types";

// =============================================================================
// Zod Schema
// =============================================================================

/**
 * Strict validation schema for lesson frontmatter.
 * All required fields must be present and valid.
 */
export const FrontmatterValidationSchema = z
  .object({
    courseSlug: z.string().min(1, "courseSlug must not be empty"),
    moduleId: z.string().min(1, "moduleId must not be empty"),
    title: z.string().min(1, "title must not be empty"),
    order: z
      .number()
      .int("order must be an integer")
      .positive("order must be a positive integer"),
    // Optional fields
    description: z.string().optional(),
    durationMinutes: z.number().optional(),
    draft: z.boolean().optional(),
    resources: z
      .array(
        z.object({
          label: z.string(),
          path: z.string(),
        })
      )
      .optional(),
  })
  .passthrough(); // Allow unknown fields

// =============================================================================
// Error Class
// =============================================================================

export class FrontmatterValidationError extends Error {
  constructor(public result: ValidationResult) {
    const count = result.invalidFiles;
    super(
      `Frontmatter validation failed: ${count} file${count === 1 ? "" : "s"} with errors`
    );
    this.name = "FrontmatterValidationError";
  }
}

// =============================================================================
// Suggestions
// =============================================================================

const SUGGESTIONS: Record<string, string> = {
  courseSlug: 'Add courseSlug field, e.g., courseSlug: "my-course"',
  moduleId: 'Add moduleId field, e.g., moduleId: "m1"',
  title: 'Add title field, e.g., title: "Introduction"',
  order: "Add order field as positive integer, e.g., order: 1",
  frontmatter: "Add YAML frontmatter between --- delimiters at start of file",
};

function getSuggestion(field: string, availableCourses?: string[]): string {
  if (field === "courseSlug" && availableCourses?.length) {
    return `Use one of: ${availableCourses.join(", ")}`;
  }
  return SUGGESTIONS[field] || `Check the ${field} field`;
}

// =============================================================================
// Single File Validation
// =============================================================================

/**
 * Validate frontmatter for a single discovered lesson.
 *
 * @param lesson - Discovered lesson from F-2
 * @param config - CourseKit configuration from F-1
 * @returns Validation result with all errors (not just first)
 */
export function validateLessonFrontmatter(
  lesson: DiscoveredLesson,
  config: CourseKitConfig
): FileValidation {
  const errors: ValidationIssue[] = [];

  // Check if frontmatter exists (from F-2 discovery)
  const fm = lesson.frontmatter;
  const hasAnyField = Object.keys(fm).length > 0;

  if (!hasAnyField) {
    return {
      filePath: lesson.path,
      relativePath: lesson.relativePath,
      valid: false,
      errors: [
        {
          field: "frontmatter",
          message: "No frontmatter found",
          suggestion: SUGGESTIONS.frontmatter,
        },
      ],
    };
  }

  // Run Zod schema validation
  const result = FrontmatterValidationSchema.safeParse(fm);

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0]?.toString() || "unknown";
      errors.push({
        field,
        message: issue.message,
        suggestion: getSuggestion(field),
      });
    }
  }

  // Cross-reference courseSlug against config
  const courseSlug = fm.courseSlug;
  if (typeof courseSlug === "string" && courseSlug.length > 0) {
    const availableCourses = Object.keys(config.courses);
    if (!availableCourses.includes(courseSlug)) {
      errors.push({
        field: "courseSlug",
        message: `Unknown course: "${courseSlug}"`,
        suggestion: getSuggestion("courseSlug", availableCourses),
      });
    }
  }

  return {
    filePath: lesson.path,
    relativePath: lesson.relativePath,
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// Batch Validation
// =============================================================================

/**
 * Validate frontmatter for all lessons in a manifest.
 *
 * @param manifest - Lesson manifest from F-2 discovery
 * @param config - CourseKit configuration from F-1
 * @returns Aggregated validation result
 */
export function validateAllLessons(
  manifest: LessonManifest,
  config: CourseKitConfig
): ValidationResult {
  const files: FileValidation[] = [];
  let validCount = 0;
  let invalidCount = 0;

  // Validate each lesson
  for (const lesson of manifest.lessons) {
    const validation = validateLessonFrontmatter(lesson, config);

    if (validation.valid) {
      validCount++;
    } else {
      invalidCount++;
      files.push(validation);
    }
  }

  // Check for duplicate orders within same courseSlug:moduleId
  const warnings = detectDuplicateOrders(manifest.lessons);

  return {
    valid: invalidCount === 0,
    totalFiles: manifest.lessons.length,
    validFiles: validCount,
    invalidFiles: invalidCount,
    files,
    warnings,
  };
}

// =============================================================================
// Duplicate Order Detection
// =============================================================================

/**
 * Detect duplicate order values within the same courseSlug:moduleId combination.
 */
function detectDuplicateOrders(
  lessons: DiscoveredLesson[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Group lessons by courseSlug:moduleId
  const groups = new Map<string, DiscoveredLesson[]>();

  for (const lesson of lessons) {
    const slug = lesson.frontmatter.courseSlug;
    const moduleId = lesson.frontmatter.moduleId;

    if (typeof slug === "string" && typeof moduleId === "string") {
      const key = `${slug}:${moduleId}`;
      const group = groups.get(key) || [];
      group.push(lesson);
      groups.set(key, group);
    }
  }

  // Check for duplicate orders in each group
  for (const [key, group] of groups) {
    const orderMap = new Map<number, DiscoveredLesson[]>();

    for (const lesson of group) {
      const order = lesson.frontmatter.order;
      if (typeof order === "number") {
        const existing = orderMap.get(order) || [];
        existing.push(lesson);
        orderMap.set(order, existing);
      }
    }

    // Report duplicates
    for (const [order, lessonsWithOrder] of orderMap) {
      if (lessonsWithOrder.length > 1) {
        warnings.push({
          code: "DUPLICATE_ORDER",
          message: `Duplicate order ${order} in ${key}`,
          files: lessonsWithOrder.map((l) => l.relativePath),
        });
      }
    }
  }

  return warnings;
}
