/**
 * Diff Calculation Tests (F-7)
 * Tests for lesson and guide diff calculation.
 */

import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import { calculateLessonDiff, calculateGuideDiff } from "./diff";
import type { CourseKitConfig } from "../types";

const FIXTURES_ROOT = path.join(import.meta.dir, "../../test-fixtures/diff");

// Helper to create config for test scenarios
function createConfig(scenario: string): CourseKitConfig {
  const sourceRoot = path.join(FIXTURES_ROOT, scenario, "source");
  return {
    platform: {
      path: path.join(FIXTURES_ROOT, scenario, "platform"),
    },
    courses: {
      "astro-course": {
        slug: "astro-course",
        sourceDir: path.join(sourceRoot, "courses/astro-course"),
      },
    },
  };
}

// =============================================================================
// T-5.1: Lesson Diff Calculation
// =============================================================================

describe("calculateLessonDiff", () => {
  describe("Scenario 1: Preview changes before sync", () => {
    it("detects 6 added lessons (10 source, 4 platform)", async () => {
      const config = createConfig("scenario-1");
      const result = await calculateLessonDiff(config);

      expect(result.contentType).toBe("lessons");
      expect(result.summary.total).toBe(10);
      expect(result.summary.added).toBe(6);
      expect(result.summary.unchanged).toBe(4);
      expect(result.summary.modified).toBe(0);
      expect(result.summary.removed).toBe(0);
    });

    it("returns items sorted by status then key", async () => {
      const config = createConfig("scenario-1");
      const result = await calculateLessonDiff(config);

      // Added items should come first
      const addedItems = result.items.filter(i => i.status === "added");
      expect(addedItems.length).toBe(6);

      // Keys should be sorted within each status group
      const addedKeys = addedItems.map(i => i.key);
      const sortedKeys = [...addedKeys].sort();
      expect(addedKeys).toEqual(sortedKeys);
    });
  });

  describe("Scenario 2: No changes detected", () => {
    it("detects all items as unchanged", async () => {
      const config = createConfig("scenario-2");
      const result = await calculateLessonDiff(config);

      expect(result.summary.unchanged).toBe(1);
      expect(result.summary.added).toBe(0);
      expect(result.summary.modified).toBe(0);
      expect(result.summary.removed).toBe(0);
    });

    it("returns empty items by default (excludes unchanged)", async () => {
      const config = createConfig("scenario-2");
      const result = await calculateLessonDiff(config);

      expect(result.items).toEqual([]);
    });

    it("includes unchanged items when requested", async () => {
      const config = createConfig("scenario-2");
      const result = await calculateLessonDiff(config, { includeUnchanged: true });

      expect(result.items.length).toBe(1);
      expect(result.items[0].status).toBe("unchanged");
    });
  });

  describe("Scenario 3: Modified lesson content", () => {
    it("detects modified body content", async () => {
      const config = createConfig("scenario-3");
      const result = await calculateLessonDiff(config);

      expect(result.summary.modified).toBe(1);

      const modifiedItem = result.items.find(i => i.status === "modified");
      expect(modifiedItem).toBeDefined();
      expect(modifiedItem?.bodyChanged).toBe(true);
    });
  });

  describe("Scenario 4: Deleted lesson in source", () => {
    it("detects removed item (only on platform)", async () => {
      const config = createConfig("scenario-4");
      const result = await calculateLessonDiff(config);

      expect(result.summary.removed).toBe(1);
      expect(result.summary.unchanged).toBe(1);

      const removedItem = result.items.find(i => i.status === "removed");
      expect(removedItem).toBeDefined();
      expect(removedItem?.slug).toBe("deleted");
      expect(removedItem?.platformPath).toBeDefined();
      expect(removedItem?.sourcePath).toBeUndefined();
    });
  });

  describe("Scenario 5: Platform-owned fields ignored", () => {
    it("treats platform-owned field differences as unchanged", async () => {
      const config = createConfig("scenario-5");
      const result = await calculateLessonDiff(config);

      expect(result.summary.unchanged).toBe(1);
      expect(result.summary.modified).toBe(0);
    });
  });

  describe("Scenario 6: Frontmatter-only changes", () => {
    it("detects frontmatter changes with same body", async () => {
      const config = createConfig("scenario-6");
      const result = await calculateLessonDiff(config);

      expect(result.summary.modified).toBe(1);

      const modifiedItem = result.items.find(i => i.status === "modified");
      expect(modifiedItem).toBeDefined();
      expect(modifiedItem?.bodyChanged).toBe(false);
      expect(modifiedItem?.changes.length).toBeGreaterThan(0);
    });

    it("reports which fields changed", async () => {
      const config = createConfig("scenario-6");
      const result = await calculateLessonDiff(config);

      const modifiedItem = result.items.find(i => i.status === "modified");
      const changedFields = modifiedItem?.changes.map(c => c.field) ?? [];

      expect(changedFields).toContain("title");
      expect(changedFields).toContain("description");
    });
  });

  describe("Options", () => {
    it("filters by courseId", async () => {
      const config = createConfig("scenario-1");
      const result = await calculateLessonDiff(config, { courseId: "astro-course" });

      // Should include all lessons from astro-course
      expect(result.items.every(i => i.courseId === "astro-course")).toBe(true);
    });
  });

  describe("Metadata", () => {
    it("includes calculatedAt timestamp", async () => {
      const config = createConfig("scenario-1");
      const before = new Date();
      const result = await calculateLessonDiff(config);
      const after = new Date();

      expect(result.calculatedAt).toBeDefined();
      expect(result.calculatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.calculatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("returns deterministic results", async () => {
      const config = createConfig("scenario-1");
      const result1 = await calculateLessonDiff(config);
      const result2 = await calculateLessonDiff(config);

      // Same summary
      expect(result1.summary).toEqual(result2.summary);

      // Same item order
      expect(result1.items.map(i => i.key)).toEqual(result2.items.map(i => i.key));
    });
  });
});

// =============================================================================
// T-5.2: Guide Diff Calculation
// =============================================================================

describe("calculateGuideDiff", () => {
  it("follows same pattern as lesson diff", async () => {
    // For now, basic smoke test - guides follow same pattern
    const config = createConfig("scenario-2");
    const result = await calculateGuideDiff(config);

    expect(result.contentType).toBe("guides");
    expect(result.summary).toBeDefined();
    expect(result.items).toBeDefined();
    expect(result.calculatedAt).toBeDefined();
  });
});

// =============================================================================
// T-6.3: Integration Tests
// =============================================================================

describe("Integration", () => {
  it("handles missing platform directory gracefully", async () => {
    const config: CourseKitConfig = {
      platform: {
        path: "/nonexistent/path",
      },
      courses: {
        "astro-course": {
          slug: "astro-course",
          sourceDir: path.join(FIXTURES_ROOT, "scenario-1/source/courses/astro-course"),
        },
      },
    };

    // Should not throw, should return all as added
    const result = await calculateLessonDiff(config);

    expect(result.summary.added).toBeGreaterThan(0);
    expect(result.summary.removed).toBe(0);
  });

  it("handles empty source gracefully", async () => {
    const config: CourseKitConfig = {
      platform: {
        path: path.join(FIXTURES_ROOT, "scenario-1/platform"),
      },
      courses: {
        "empty-course": {
          slug: "empty-course",
          sourceDir: "/nonexistent/path",
        },
      },
    };

    // Should not throw, should return all platform files as removed
    const result = await calculateLessonDiff(config);

    // Will have removed items from platform (astro-course)
    expect(result).toBeDefined();
  });
});
