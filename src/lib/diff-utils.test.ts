/**
 * Diff Utilities Tests (F-7)
 * Tests for content normalization, file matching, frontmatter comparison,
 * and diff status classification.
 */

import { describe, expect, it } from "bun:test";
import {
  normalizeContent,
  matchFilesBySlug,
  compareFrontmatter,
  classifyDiffStatus,
} from "./diff-utils";
import type { DiscoveredLesson, PlatformLesson } from "../types";

// =============================================================================
// T-1.1 & T-1.2: Content Normalization
// =============================================================================

describe("normalizeContent", () => {
  it("trims leading and trailing whitespace", () => {
    expect(normalizeContent("  hello world  ")).toBe("hello world");
  });

  it("normalizes CRLF to LF", () => {
    expect(normalizeContent("line1\r\nline2\r\n")).toBe("line1\nline2");
  });

  it("normalizes CR to LF", () => {
    expect(normalizeContent("line1\rline2")).toBe("line1\nline2");
  });

  it("collapses multiple blank lines to single blank line", () => {
    const input = "line1\n\n\n\nline2";
    expect(normalizeContent(input)).toBe("line1\n\nline2");
  });

  it("preserves single blank lines", () => {
    const input = "line1\n\nline2";
    expect(normalizeContent(input)).toBe("line1\n\nline2");
  });

  it("handles empty string", () => {
    expect(normalizeContent("")).toBe("");
  });

  it("handles whitespace-only string", () => {
    expect(normalizeContent("   \n\n   ")).toBe("");
  });

  it("preserves Unicode content", () => {
    expect(normalizeContent("こんにちは\n世界")).toBe("こんにちは\n世界");
  });

  it("removes trailing whitespace from lines", () => {
    expect(normalizeContent("line1   \nline2  ")).toBe("line1\nline2");
  });

  it("handles mixed line endings", () => {
    expect(normalizeContent("a\r\nb\rc\nd")).toBe("a\nb\nc\nd");
  });
});

// =============================================================================
// T-2.1 & T-2.2: File Matching by Slug
// =============================================================================

describe("matchFilesBySlug", () => {
  const createSourceLesson = (courseId: string, slug: string): DiscoveredLesson => ({
    path: `/source/${courseId}/${slug}.md`,
    relativePath: `${courseId}/${slug}.md`,
    courseId,
    order: 1,
    slug,
    frontmatter: { title: slug },
  });

  const createPlatformLesson = (courseId: string, slug: string): PlatformLesson => ({
    path: `/platform/${courseId}/${slug}.md`,
    relativePath: `${courseId}/${slug}.md`,
    courseId,
    slug,
    frontmatter: { title: slug },
    platformFields: {},
    contentHash: "abc123",
  });

  it("matches files present in both source and platform", () => {
    const source = [createSourceLesson("course-a", "01-intro")];
    const platform = [createPlatformLesson("course-a", "01-intro")];

    const result = matchFilesBySlug(source, platform);

    expect(result.size).toBe(1);
    const match = result.get("course-a/01-intro");
    expect(match?.source).toBeDefined();
    expect(match?.platform).toBeDefined();
  });

  it("identifies files only in source", () => {
    const source = [createSourceLesson("course-a", "01-intro")];
    const platform: PlatformLesson[] = [];

    const result = matchFilesBySlug(source, platform);

    expect(result.size).toBe(1);
    const match = result.get("course-a/01-intro");
    expect(match?.source).toBeDefined();
    expect(match?.platform).toBeUndefined();
  });

  it("identifies files only on platform", () => {
    const source: DiscoveredLesson[] = [];
    const platform = [createPlatformLesson("course-a", "01-intro")];

    const result = matchFilesBySlug(source, platform);

    expect(result.size).toBe(1);
    const match = result.get("course-a/01-intro");
    expect(match?.source).toBeUndefined();
    expect(match?.platform).toBeDefined();
  });

  it("handles multiple courses with same slug", () => {
    const source = [
      createSourceLesson("course-a", "01-intro"),
      createSourceLesson("course-b", "01-intro"),
    ];
    const platform = [
      createPlatformLesson("course-a", "01-intro"),
    ];

    const result = matchFilesBySlug(source, platform);

    expect(result.size).toBe(2);
    expect(result.get("course-a/01-intro")?.platform).toBeDefined();
    expect(result.get("course-b/01-intro")?.platform).toBeUndefined();
  });

  it("returns empty map for empty inputs", () => {
    const result = matchFilesBySlug([], []);
    expect(result.size).toBe(0);
  });

  it("handles mixed scenarios", () => {
    const source = [
      createSourceLesson("course-a", "01-intro"),
      createSourceLesson("course-a", "02-setup"),
      createSourceLesson("course-a", "03-new"),
    ];
    const platform = [
      createPlatformLesson("course-a", "01-intro"),
      createPlatformLesson("course-a", "02-setup"),
      createPlatformLesson("course-a", "99-deleted"),
    ];

    const result = matchFilesBySlug(source, platform);

    expect(result.size).toBe(4);
    // Both in source and platform
    expect(result.get("course-a/01-intro")?.source).toBeDefined();
    expect(result.get("course-a/01-intro")?.platform).toBeDefined();
    // Only in source
    expect(result.get("course-a/03-new")?.source).toBeDefined();
    expect(result.get("course-a/03-new")?.platform).toBeUndefined();
    // Only on platform
    expect(result.get("course-a/99-deleted")?.source).toBeUndefined();
    expect(result.get("course-a/99-deleted")?.platform).toBeDefined();
  });
});

// =============================================================================
// T-3.1 & T-3.2: Frontmatter Comparison
// =============================================================================

describe("compareFrontmatter", () => {
  const protectedFields = ["price", "lemonSqueezyProductId", "enrollmentCount", "publishedAt"];

  it("returns empty array for identical frontmatter", () => {
    const source = { title: "Hello", description: "World" };
    const platform = { title: "Hello", description: "World", price: 999 };

    const changes = compareFrontmatter(source, platform, protectedFields);

    expect(changes).toEqual([]);
  });

  it("detects changed field value", () => {
    const source = { title: "New Title" };
    const platform = { title: "Old Title", price: 0 };

    const changes = compareFrontmatter(source, platform, protectedFields);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({
      field: "title",
      sourceValue: "New Title",
      platformValue: "Old Title",
      changeType: "modified",
    });
  });

  it("ignores platform-owned field changes", () => {
    const source = { title: "Hello" };
    const platform = { title: "Hello", price: 2999, enrollmentCount: 100 };

    const changes = compareFrontmatter(source, platform, protectedFields);

    expect(changes).toEqual([]);
  });

  it("detects added field in source", () => {
    const source = { title: "Hello", author: "John" };
    const platform = { title: "Hello", price: 0 };

    const changes = compareFrontmatter(source, platform, protectedFields);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({
      field: "author",
      sourceValue: "John",
      platformValue: undefined,
      changeType: "added",
    });
  });

  it("detects removed field from source", () => {
    const source = { title: "Hello" };
    const platform = { title: "Hello", description: "Old desc", price: 0 };

    const changes = compareFrontmatter(source, platform, protectedFields);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({
      field: "description",
      sourceValue: undefined,
      platformValue: "Old desc",
      changeType: "removed",
    });
  });

  it("detects multiple field changes", () => {
    const source = { title: "New", description: "New desc", author: "Jane" };
    const platform = { title: "Old", category: "tech", price: 0 };

    const changes = compareFrontmatter(source, platform, protectedFields);

    expect(changes).toHaveLength(4);
    const fields = changes.map(c => c.field).sort();
    expect(fields).toEqual(["author", "category", "description", "title"]);
  });

  it("handles undefined and null values correctly", () => {
    const source = { title: "Hello", description: null };
    const platform = { title: "Hello", description: undefined, price: 0 };

    const changes = compareFrontmatter(source, platform, protectedFields);

    // null vs undefined should be detected as a change
    expect(changes).toHaveLength(1);
  });

  it("handles empty string vs undefined", () => {
    const source = { title: "Hello", description: "" };
    const platform = { title: "Hello", price: 0 };

    const changes = compareFrontmatter(source, platform, protectedFields);

    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe("description");
    expect(changes[0].changeType).toBe("added");
  });

  it("handles nested objects with deep comparison", () => {
    const source = { title: "Hello", meta: { key: "value1" } };
    const platform = { title: "Hello", meta: { key: "value2" }, price: 0 };

    const changes = compareFrontmatter(source, platform, protectedFields);

    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe("meta");
  });

  it("handles arrays", () => {
    const source = { title: "Hello", tags: ["a", "b", "c"] };
    const platform = { title: "Hello", tags: ["a", "b"], price: 0 };

    const changes = compareFrontmatter(source, platform, protectedFields);

    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe("tags");
  });
});

// =============================================================================
// T-4.1 & T-4.2: Diff Status Classification
// =============================================================================

describe("classifyDiffStatus", () => {
  const protectedFields = ["price", "lemonSqueezyProductId", "enrollmentCount", "publishedAt"];

  it("classifies source-only as added", () => {
    const result = classifyDiffStatus(
      { title: "Hello" },
      "abc123",
      undefined,
      undefined,
      protectedFields
    );

    expect(result.status).toBe("added");
    expect(result.changes).toEqual([]);
    expect(result.bodyChanged).toBe(false);
  });

  it("classifies platform-only as removed", () => {
    const result = classifyDiffStatus(
      undefined,
      undefined,
      { title: "Hello", price: 0 },
      "abc123",
      protectedFields
    );

    expect(result.status).toBe("removed");
    expect(result.changes).toEqual([]);
    expect(result.bodyChanged).toBe(false);
  });

  it("classifies identical content as unchanged", () => {
    const hash = "samehash123";
    const result = classifyDiffStatus(
      { title: "Hello" },
      hash,
      { title: "Hello", price: 999 },
      hash,
      protectedFields
    );

    expect(result.status).toBe("unchanged");
    expect(result.changes).toEqual([]);
    expect(result.bodyChanged).toBe(false);
  });

  it("classifies different body hash as modified", () => {
    const result = classifyDiffStatus(
      { title: "Hello" },
      "newhash",
      { title: "Hello", price: 0 },
      "oldhash",
      protectedFields
    );

    expect(result.status).toBe("modified");
    expect(result.bodyChanged).toBe(true);
  });

  it("classifies frontmatter changes as modified", () => {
    const hash = "samehash";
    const result = classifyDiffStatus(
      { title: "New Title" },
      hash,
      { title: "Old Title", price: 0 },
      hash,
      protectedFields
    );

    expect(result.status).toBe("modified");
    expect(result.bodyChanged).toBe(false);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].field).toBe("title");
  });

  it("classifies platform-only field changes as unchanged", () => {
    const hash = "samehash";
    const result = classifyDiffStatus(
      { title: "Hello" },
      hash,
      { title: "Hello", price: 2999, enrollmentCount: 500 },
      hash,
      protectedFields
    );

    expect(result.status).toBe("unchanged");
    expect(result.changes).toEqual([]);
    expect(result.bodyChanged).toBe(false);
  });

  it("handles both frontmatter and body changes", () => {
    const result = classifyDiffStatus(
      { title: "New Title", author: "John" },
      "newhash",
      { title: "Old Title", price: 0 },
      "oldhash",
      protectedFields
    );

    expect(result.status).toBe("modified");
    expect(result.bodyChanged).toBe(true);
    expect(result.changes.length).toBeGreaterThan(0);
  });

  it("handles missing platform hash by comparing content", () => {
    const result = classifyDiffStatus(
      { title: "Hello" },
      "hash123",
      { title: "Hello", price: 0 },
      undefined,
      protectedFields
    );

    // When platform hash is missing, treat as modified to be safe
    expect(result.status).toBe("modified");
  });
});
