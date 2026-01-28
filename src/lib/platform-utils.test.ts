/**
 * Platform Utilities Tests (F-6) - TDD
 */

import { describe, expect, test } from "bun:test";
import * as path from "node:path";
import {
  hashContent,
  scanPlatformLessons,
  scanPlatformGuides,
  parsePlatformFile,
  extractPlatformFields,
} from "./platform-utils";
import type { CourseKitConfig } from "../types";

const fixturesDir = path.join(process.cwd(), "test-fixtures", "platform");

// =============================================================================
// Content Hashing Tests (T-1.1, T-1.2)
// =============================================================================

describe("hashContent", () => {
  test("empty string produces consistent hash", () => {
    const hash1 = hashContent("");
    const hash2 = hashContent("");
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
  });

  test("identical content produces identical hashes", () => {
    const content = "Hello, World!";
    const hash1 = hashContent(content);
    const hash2 = hashContent(content);
    expect(hash1).toBe(hash2);
  });

  test("different content produces different hashes", () => {
    const hash1 = hashContent("Hello");
    const hash2 = hashContent("World");
    expect(hash1).not.toBe(hash2);
  });

  test("unicode content hashes correctly", () => {
    const hash1 = hashContent("日本語テスト");
    const hash2 = hashContent("日本語テスト");
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  test("hash output is deterministic", () => {
    const content = "Test content for determinism";
    const hashes = Array(10)
      .fill(0)
      .map(() => hashContent(content));
    expect(new Set(hashes).size).toBe(1); // All hashes should be identical
  });

  test("whitespace differences produce different hashes", () => {
    const hash1 = hashContent("Hello World");
    const hash2 = hashContent("Hello  World");
    expect(hash1).not.toBe(hash2);
  });
});

// =============================================================================
// Platform Lesson Scanning Tests (T-2.1)
// =============================================================================

describe("scanPlatformLessons", () => {
  test("finds lessons in single course", async () => {
    const platformRoot = path.join(fixturesDir, "single-course");
    const files = await scanPlatformLessons(platformRoot);

    expect(files.length).toBe(2);
    expect(files.some((f) => f.includes("01-intro.md"))).toBe(true);
    expect(files.some((f) => f.includes("02-setup.md"))).toBe(true);
  });

  test("finds lessons across multiple courses", async () => {
    const platformRoot = path.join(fixturesDir, "multi-course");
    const files = await scanPlatformLessons(platformRoot);

    expect(files.length).toBe(2);
    expect(files.some((f) => f.includes("supertag-course"))).toBe(true);
    expect(files.some((f) => f.includes("astro-course"))).toBe(true);
  });

  test("filters by courseId when provided", async () => {
    const platformRoot = path.join(fixturesDir, "multi-course");
    const files = await scanPlatformLessons(platformRoot, "supertag-course");

    expect(files.length).toBe(1);
    expect(files[0]).toContain("supertag-course");
    expect(files[0]).not.toContain("astro-course");
  });

  test("returns empty for empty course directory", async () => {
    const platformRoot = path.join(fixturesDir, "empty-course");
    const files = await scanPlatformLessons(platformRoot);

    expect(files.length).toBe(0);
  });

  test("returns empty for missing content directory", async () => {
    const files = await scanPlatformLessons("/nonexistent/path");
    expect(files).toEqual([]);
  });

  test("results are sorted alphabetically", async () => {
    const platformRoot = path.join(fixturesDir, "single-course");
    const files = await scanPlatformLessons(platformRoot);

    const sorted = [...files].sort();
    expect(files).toEqual(sorted);
  });
});

// =============================================================================
// Platform Guide Scanning Tests (T-2.2)
// =============================================================================

describe("scanPlatformGuides", () => {
  test("finds guides for a course", async () => {
    const platformRoot = path.join(fixturesDir, "multi-course");
    const files = await scanPlatformGuides(platformRoot);

    expect(files.length).toBe(1);
    expect(files[0]).toContain("getting-started.md");
  });

  test("filters by courseId when provided", async () => {
    const platformRoot = path.join(fixturesDir, "multi-course");
    const files = await scanPlatformGuides(platformRoot, "supertag-course");

    expect(files.length).toBe(1);
    expect(files[0]).toContain("supertag-course");
  });

  test("returns empty when no guides exist", async () => {
    const platformRoot = path.join(fixturesDir, "single-course");
    const files = await scanPlatformGuides(platformRoot);

    expect(files.length).toBe(0);
  });

  test("returns empty for missing content directory", async () => {
    const files = await scanPlatformGuides("/nonexistent/path");
    expect(files).toEqual([]);
  });
});

// =============================================================================
// Platform File Parsing Tests (T-3.1)
// =============================================================================

describe("parsePlatformFile", () => {
  test("parses valid frontmatter and body", async () => {
    const filePath = path.join(
      fixturesDir,
      "single-course/src/content/lessons/supertag-course/01-intro.md"
    );
    const result = await parsePlatformFile(filePath);

    expect(result.frontmatter).toBeDefined();
    expect(result.frontmatter.title).toBe("Introduction to Supertags");
    expect(result.body).toContain("Welcome to the Supertags course");
    expect(result.error).toBeUndefined();
  });

  test("returns error for malformed YAML (no throw)", async () => {
    const filePath = path.join(
      fixturesDir,
      "corrupted/src/content/lessons/broken-course/01-broken.md"
    );
    const result = await parsePlatformFile(filePath);

    expect(result.error).toBeDefined();
    expect(result.error).toContain("YAML");
  });

  test("returns error for missing file", async () => {
    const result = await parsePlatformFile("/nonexistent/file.md");

    expect(result.error).toBeDefined();
    expect(result.frontmatter).toEqual({});
  });

  test("extracts body without frontmatter", async () => {
    const filePath = path.join(
      fixturesDir,
      "single-course/src/content/lessons/supertag-course/01-intro.md"
    );
    const result = await parsePlatformFile(filePath);

    expect(result.body).not.toContain("---");
    expect(result.body).not.toContain("title:");
  });
});

// =============================================================================
// Platform Field Extraction Tests (T-3.2)
// =============================================================================

describe("extractPlatformFields", () => {
  const mockConfig: CourseKitConfig = {
    platform: { path: "." },
    courses: {},
  };

  test("extracts price field", () => {
    const frontmatter = { title: "Test", price: 4999, order: 1 };
    const fields = extractPlatformFields(frontmatter, mockConfig);

    expect(fields.price).toBe(4999);
    expect((fields as Record<string, unknown>).title).toBeUndefined();
    expect((fields as Record<string, unknown>).order).toBeUndefined();
  });

  test("extracts lemonSqueezyProductId field", () => {
    const frontmatter = { title: "Test", lemonSqueezyProductId: "prod_123" };
    const fields = extractPlatformFields(frontmatter, mockConfig);

    expect(fields.lemonSqueezyProductId).toBe("prod_123");
  });

  test("extracts enrollmentCount field", () => {
    const frontmatter = { title: "Test", enrollmentCount: 150 };
    const fields = extractPlatformFields(frontmatter, mockConfig);

    expect(fields.enrollmentCount).toBe(150);
  });

  test("extracts publishedAt field", () => {
    const frontmatter = { title: "Test", publishedAt: "2024-01-15T10:00:00Z" };
    const fields = extractPlatformFields(frontmatter, mockConfig);

    expect(fields.publishedAt).toBe("2024-01-15T10:00:00Z");
  });

  test("returns empty object when no platform fields present", () => {
    const frontmatter = { title: "Test", order: 1, courseSlug: "my-course" };
    const fields = extractPlatformFields(frontmatter, mockConfig);

    expect(Object.keys(fields).length).toBe(0);
  });

  test("extracts multiple platform fields", () => {
    const frontmatter = {
      title: "Test",
      price: 2999,
      enrollmentCount: 50,
      lemonSqueezyProductId: "prod_abc",
    };
    const fields = extractPlatformFields(frontmatter, mockConfig);

    expect(fields.price).toBe(2999);
    expect(fields.enrollmentCount).toBe(50);
    expect(fields.lemonSqueezyProductId).toBe("prod_abc");
  });
});
