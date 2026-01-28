/**
 * Platform State Reading Tests (F-6) - TDD
 */

import { describe, expect, test } from "bun:test";
import * as path from "node:path";
import { readPlatformState } from "./platform-state";
import type { CourseKitConfig } from "../types";

const fixturesDir = path.join(process.cwd(), "test-fixtures", "platform");

// Helper to create config pointing to a fixture
function createConfig(fixtureName: string): CourseKitConfig {
  return {
    platform: {
      path: path.join(fixturesDir, fixtureName),
    },
    courses: {},
  };
}

// =============================================================================
// Scenario 1: Read all platform lessons for a course
// =============================================================================

describe("Scenario 1: Read platform lessons for single course", () => {
  test("returns lessons with paths and frontmatter", async () => {
    const config = createConfig("single-course");
    const manifest = await readPlatformState(config);

    expect(manifest.lessons.length).toBe(2);
    expect(manifest.warnings.length).toBe(0);
  });

  test("includes content hashes for each lesson", async () => {
    const config = createConfig("single-course");
    const manifest = await readPlatformState(config);

    for (const lesson of manifest.lessons) {
      expect(lesson.contentHash).toBeDefined();
      expect(lesson.contentHash).toHaveLength(64); // SHA-256 hex
    }
  });

  test("extracts courseId from path", async () => {
    const config = createConfig("single-course");
    const manifest = await readPlatformState(config);

    for (const lesson of manifest.lessons) {
      expect(lesson.courseId).toBe("supertag-course");
    }
  });

  test("extracts slug from filename", async () => {
    const config = createConfig("single-course");
    const manifest = await readPlatformState(config);

    const slugs = manifest.lessons.map((l) => l.slug).sort();
    expect(slugs).toEqual(["01-intro", "02-setup"]);
  });
});

// =============================================================================
// Scenario 2: Read platform state across all courses
// =============================================================================

describe("Scenario 2: Read platform state across all courses", () => {
  test("returns lessons from multiple courses", async () => {
    const config = createConfig("multi-course");
    const manifest = await readPlatformState(config);

    expect(manifest.lessons.length).toBe(2);

    const courseIds = manifest.lessons.map((l) => l.courseId);
    expect(courseIds).toContain("supertag-course");
    expect(courseIds).toContain("astro-course");
  });

  test("can filter by courseId", async () => {
    const config = createConfig("multi-course");
    const manifest = await readPlatformState(config, {
      courseId: "astro-course",
    });

    expect(manifest.lessons.length).toBe(1);
    expect(manifest.lessons[0].courseId).toBe("astro-course");
  });
});

// =============================================================================
// Scenario 3: Read platform guides for a course
// =============================================================================

describe("Scenario 3: Read platform guides", () => {
  test("returns guides with paths and frontmatter", async () => {
    const config = createConfig("multi-course");
    const manifest = await readPlatformState(config);

    expect(manifest.guides.length).toBe(1);
    expect(manifest.guides[0].frontmatter.title).toBe("Getting Started Guide");
  });

  test("includes content hashes for guides", async () => {
    const config = createConfig("multi-course");
    const manifest = await readPlatformState(config);

    for (const guide of manifest.guides) {
      expect(guide.contentHash).toBeDefined();
      expect(guide.contentHash).toHaveLength(64);
    }
  });

  test("lessonsOnly option excludes guides", async () => {
    const config = createConfig("multi-course");
    const manifest = await readPlatformState(config, { lessonsOnly: true });

    expect(manifest.guides.length).toBe(0);
    expect(manifest.lessons.length).toBe(2);
  });

  test("guidesOnly option excludes lessons", async () => {
    const config = createConfig("multi-course");
    const manifest = await readPlatformState(config, { guidesOnly: true });

    expect(manifest.lessons.length).toBe(0);
    expect(manifest.guides.length).toBe(1);
  });
});

// =============================================================================
// Scenario 4: Handle empty or missing course directory
// =============================================================================

describe("Scenario 4: Empty or missing course directory", () => {
  test("returns empty result for empty course", async () => {
    const config = createConfig("empty-course");
    const manifest = await readPlatformState(config);

    expect(manifest.lessons.length).toBe(0);
    expect(manifest.guides.length).toBe(0);
  });

  test("does not throw error for empty course", async () => {
    const config = createConfig("empty-course");
    await expect(readPlatformState(config)).resolves.toBeDefined();
  });

  test("returns warning for missing content directory", async () => {
    const config: CourseKitConfig = {
      platform: { path: "/nonexistent/platform" },
      courses: {},
    };
    const manifest = await readPlatformState(config);

    expect(manifest.lessons.length).toBe(0);
    expect(manifest.warnings.length).toBeGreaterThan(0);
    expect(manifest.warnings[0].code).toBe("MISSING_CONTENT_DIR");
  });
});

// =============================================================================
// Scenario 5: Preserve platform-only fields in state
// =============================================================================

describe("Scenario 5: Preserve platform-owned fields", () => {
  test("extracts price field to platformFields", async () => {
    const config = createConfig("single-course");
    const manifest = await readPlatformState(config);

    const introLesson = manifest.lessons.find((l) => l.slug === "01-intro");
    expect(introLesson?.platformFields.price).toBe(4999);
  });

  test("extracts lemonSqueezyProductId field", async () => {
    const config = createConfig("single-course");
    const manifest = await readPlatformState(config);

    const introLesson = manifest.lessons.find((l) => l.slug === "01-intro");
    expect(introLesson?.platformFields.lemonSqueezyProductId).toBe("prod_123abc");
  });

  test("extracts enrollmentCount field", async () => {
    const config = createConfig("single-course");
    const manifest = await readPlatformState(config);

    const setupLesson = manifest.lessons.find((l) => l.slug === "02-setup");
    expect(setupLesson?.platformFields.enrollmentCount).toBe(150);
  });

  test("extracts publishedAt field", async () => {
    const config = createConfig("single-course");
    const manifest = await readPlatformState(config);

    const introLesson = manifest.lessons.find((l) => l.slug === "01-intro");
    expect(introLesson?.platformFields.publishedAt).toBe("2024-01-15T10:00:00Z");
  });
});

// =============================================================================
// Scenario 6: Handle corrupted or unparseable platform files
// =============================================================================

describe("Scenario 6: Handle corrupted platform files", () => {
  test("includes file with warning for malformed YAML", async () => {
    const config = createConfig("corrupted");
    const manifest = await readPlatformState(config);

    expect(manifest.warnings.length).toBeGreaterThan(0);
    const yamlWarning = manifest.warnings.find(
      (w) => w.code === "MALFORMED_FRONTMATTER"
    );
    expect(yamlWarning).toBeDefined();
  });

  test("does not throw error for corrupted file", async () => {
    const config = createConfig("corrupted");
    await expect(readPlatformState(config)).resolves.toBeDefined();
  });
});

// =============================================================================
// Manifest Metadata Tests
// =============================================================================

describe("Manifest metadata", () => {
  test("includes platformRoot", async () => {
    const config = createConfig("single-course");
    const manifest = await readPlatformState(config);

    expect(manifest.platformRoot).toContain("single-course");
  });

  test("includes readAt timestamp", async () => {
    const config = createConfig("single-course");
    const before = new Date();
    const manifest = await readPlatformState(config);
    const after = new Date();

    expect(manifest.readAt).toBeInstanceOf(Date);
    expect(manifest.readAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(manifest.readAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  test("lessons are sorted alphabetically by relativePath", async () => {
    const config = createConfig("single-course");
    const manifest = await readPlatformState(config);

    const paths = manifest.lessons.map((l) => l.relativePath);
    const sorted = [...paths].sort();
    expect(paths).toEqual(sorted);
  });
});
