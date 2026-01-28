/**
 * Tests for lesson discovery (F-2)
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import {
  discoverLessons,
  scanCourses,
  scanLessonFiles,
  DiscoveryError,
} from "./discovery";
import type { CourseKitConfig } from "../types";

// Test fixtures directory
const FIXTURES_ROOT = join(import.meta.dir, "../../test-fixtures");

// Mock config (not used by current implementation but required by API)
const mockConfig: CourseKitConfig = {
  platform: { path: "/mock/platform" },
  courses: {},
};

describe("scanCourses", () => {
  test("returns course directories from valid-course fixture", () => {
    const sourceRoot = join(FIXTURES_ROOT, "valid-course");
    const courses = scanCourses(sourceRoot);

    expect(courses).toEqual(["test-course"]);
  });

  test("returns multiple courses sorted alphabetically", () => {
    const sourceRoot = join(FIXTURES_ROOT, "multi-course");
    const courses = scanCourses(sourceRoot);

    expect(courses).toEqual(["course-a", "course-b"]);
  });

  test("returns empty array when courses directory missing", () => {
    const sourceRoot = "/nonexistent/path";
    const courses = scanCourses(sourceRoot);

    expect(courses).toEqual([]);
  });

  test("excludes hidden directories", () => {
    const sourceRoot = join(FIXTURES_ROOT, "valid-course");
    const courses = scanCourses(sourceRoot);

    // Should not include any .hidden directories
    expect(courses.every((c) => !c.startsWith("."))).toBe(true);
  });
});

describe("scanLessonFiles", () => {
  test("returns lesson files from valid course", () => {
    const sourceRoot = join(FIXTURES_ROOT, "valid-course");
    const { files, warning } = scanLessonFiles(sourceRoot, "test-course");

    expect(warning).toBeUndefined();
    expect(files).toEqual(["01-intro.md", "02-setup.md"]);
  });

  test("returns warning for missing lessons directory", () => {
    const sourceRoot = join(FIXTURES_ROOT, "empty-course");
    const { files, warning } = scanLessonFiles(sourceRoot, "empty");

    expect(files).toEqual([]);
    expect(warning?.code).toBe("MISSING_LESSONS_DIR");
  });

  test("filters out non-markdown files", () => {
    const sourceRoot = join(FIXTURES_ROOT, "mixed-files");
    const { files } = scanLessonFiles(sourceRoot, "mixed");

    expect(files).toEqual(["01-valid.md"]);
    expect(files).not.toContain("notes.txt");
  });

  test("filters out hidden files", () => {
    const sourceRoot = join(FIXTURES_ROOT, "mixed-files");
    const { files } = scanLessonFiles(sourceRoot, "mixed");

    expect(files.every((f) => !f.startsWith("."))).toBe(true);
  });
});

describe("discoverLessons", () => {
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  test("Scenario 1: Single course with multiple lessons", () => {
    process.chdir(join(FIXTURES_ROOT, "valid-course"));

    const manifest = discoverLessons(mockConfig);

    expect(manifest.lessons).toHaveLength(2);
    expect(manifest.lessons[0].slug).toBe("intro");
    expect(manifest.lessons[0].order).toBe(1);
    expect(manifest.lessons[0].frontmatter.title).toBe("Introduction");
    expect(manifest.lessons[1].slug).toBe("setup");
    expect(manifest.lessons[1].order).toBe(2);
  });

  test("Scenario 2: Multiple courses discovery", () => {
    process.chdir(join(FIXTURES_ROOT, "multi-course"));

    const manifest = discoverLessons(mockConfig);

    expect(manifest.lessons).toHaveLength(2);

    // Sorted by course then order
    expect(manifest.lessons[0].courseId).toBe("course-a");
    expect(manifest.lessons[1].courseId).toBe("course-b");
  });

  test("Scenario 3: Missing lessons directory (warning, not error)", () => {
    process.chdir(join(FIXTURES_ROOT, "empty-course"));

    const manifest = discoverLessons(mockConfig);

    expect(manifest.lessons).toHaveLength(0);
    expect(manifest.warnings).toHaveLength(1);
    expect(manifest.warnings[0].code).toBe("MISSING_LESSONS_DIR");
  });

  test("Scenario 4: Non-markdown files filtered", () => {
    process.chdir(join(FIXTURES_ROOT, "mixed-files"));

    const manifest = discoverLessons(mockConfig);

    expect(manifest.lessons).toHaveLength(1);
    expect(manifest.lessons[0].slug).toBe("valid");
  });

  test("Scenario 5: Malformed frontmatter flagged as warning", () => {
    process.chdir(join(FIXTURES_ROOT, "malformed"));

    const manifest = discoverLessons(mockConfig);

    // Both files should be discovered but one has warning
    expect(manifest.lessons.length).toBeGreaterThanOrEqual(1);

    const frontmatterWarnings = manifest.warnings.filter(
      (w) => w.code === "MALFORMED_FRONTMATTER"
    );
    expect(frontmatterWarnings.length).toBeGreaterThanOrEqual(1);
  });

  test("discoveredAt timestamp is set", () => {
    process.chdir(join(FIXTURES_ROOT, "valid-course"));

    const before = new Date();
    const manifest = discoverLessons(mockConfig);
    const after = new Date();

    expect(manifest.discoveredAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime()
    );
    expect(manifest.discoveredAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  test("sourceRoot is set correctly", () => {
    const fixtureRoot = join(FIXTURES_ROOT, "valid-course");
    process.chdir(fixtureRoot);

    const manifest = discoverLessons(mockConfig);

    expect(manifest.sourceRoot).toBe(fixtureRoot);
  });

  test("single course option limits discovery", () => {
    process.chdir(join(FIXTURES_ROOT, "multi-course"));

    const manifest = discoverLessons(mockConfig, { courseId: "course-a" });

    expect(manifest.lessons).toHaveLength(1);
    expect(manifest.lessons[0].courseId).toBe("course-a");
  });

  test("includeRaw option includes raw frontmatter", () => {
    process.chdir(join(FIXTURES_ROOT, "valid-course"));

    const manifest = discoverLessons(mockConfig, { includeRaw: true });

    expect(manifest.lessons[0].rawFrontmatter).toBeDefined();
    expect(manifest.lessons[0].rawFrontmatter).toContain("title:");
  });

  test("lessons are sorted by course then order", () => {
    process.chdir(join(FIXTURES_ROOT, "valid-course"));

    const manifest = discoverLessons(mockConfig);

    // Verify order within course
    for (let i = 1; i < manifest.lessons.length; i++) {
      const prev = manifest.lessons[i - 1];
      const curr = manifest.lessons[i];

      if (prev.courseId === curr.courseId) {
        expect(prev.order).toBeLessThan(curr.order);
      } else {
        expect(prev.courseId.localeCompare(curr.courseId)).toBeLessThan(0);
      }
    }
  });

  test("relativePath is correct", () => {
    process.chdir(join(FIXTURES_ROOT, "valid-course"));

    const manifest = discoverLessons(mockConfig);

    expect(manifest.lessons[0].relativePath).toBe(
      "courses/test-course/lessons/01-intro.md"
    );
  });
});

describe("DiscoveryError", () => {
  test("has correct name and code", () => {
    const error = new DiscoveryError("Test error", "TEST_CODE");

    expect(error.name).toBe("DiscoveryError");
    expect(error.code).toBe("TEST_CODE");
    expect(error.message).toBe("Test error");
  });
});
