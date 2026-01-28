/**
 * Tests for discovery utilities (F-2)
 */

import { describe, test, expect } from "bun:test";
import { parseFilename, parseFrontmatter, LESSON_FILENAME_PATTERN } from "./discovery-utils";

describe("parseFilename", () => {
  describe("valid filenames", () => {
    test("parses 01-intro.md", () => {
      const result = parseFilename("01-intro.md");
      expect(result).toEqual({ order: 1, slug: "intro" });
    });

    test("parses 10-advanced.md", () => {
      const result = parseFilename("10-advanced.md");
      expect(result).toEqual({ order: 10, slug: "advanced" });
    });

    test("parses 99-final.md", () => {
      const result = parseFilename("99-final.md");
      expect(result).toEqual({ order: 99, slug: "final" });
    });

    test("parses 100-bonus.md (three digits)", () => {
      const result = parseFilename("100-bonus.md");
      expect(result).toEqual({ order: 100, slug: "bonus" });
    });

    test("parses multi-word slug with hyphens", () => {
      const result = parseFilename("05-getting-started-guide.md");
      expect(result).toEqual({ order: 5, slug: "getting-started-guide" });
    });

    test("handles uppercase extension (case insensitive)", () => {
      const result = parseFilename("01-intro.MD");
      expect(result).toEqual({ order: 1, slug: "intro" });
    });

    test("normalizes slug to lowercase", () => {
      const result = parseFilename("01-INTRO.md");
      expect(result).toEqual({ order: 1, slug: "intro" });
    });
  });

  describe("invalid filenames", () => {
    test("returns null for no order prefix", () => {
      expect(parseFilename("intro.md")).toBeNull();
    });

    test("returns null for single digit order", () => {
      expect(parseFilename("1-short.md")).toBeNull();
    });

    test("returns null for underscore separator", () => {
      expect(parseFilename("01_underscore.md")).toBeNull();
    });

    test("returns null for non-md extension", () => {
      expect(parseFilename("01-intro.txt")).toBeNull();
    });

    test("returns null for empty string", () => {
      expect(parseFilename("")).toBeNull();
    });

    test("returns null for just .md", () => {
      expect(parseFilename(".md")).toBeNull();
    });

    test("returns null for numbers only", () => {
      expect(parseFilename("01.md")).toBeNull();
    });

    test("returns null for missing slug", () => {
      expect(parseFilename("01-.md")).toBeNull();
    });
  });
});

describe("parseFrontmatter", () => {
  describe("valid frontmatter", () => {
    test("parses complete frontmatter with all fields", () => {
      const content = `---
title: Introduction
description: Getting started
courseSlug: my-course
moduleId: m1
order: 1
durationMinutes: 10
---

# Content here`;

      const result = parseFrontmatter(content);

      expect(result.error).toBeUndefined();
      expect(result.frontmatter.title).toBe("Introduction");
      expect(result.frontmatter.description).toBe("Getting started");
      expect(result.frontmatter.courseSlug).toBe("my-course");
      expect(result.frontmatter.moduleId).toBe("m1");
      expect(result.frontmatter.order).toBe(1);
      expect(result.frontmatter.durationMinutes).toBe(10);
    });

    test("parses partial frontmatter (some fields missing)", () => {
      const content = `---
title: Just a Title
---

Content`;

      const result = parseFrontmatter(content);

      expect(result.error).toBeUndefined();
      expect(result.frontmatter.title).toBe("Just a Title");
      expect(result.frontmatter.courseSlug).toBeUndefined();
    });

    test("preserves additional fields via passthrough", () => {
      const content = `---
title: Test
customField: custom value
anotherField: 123
---`;

      const result = parseFrontmatter(content);

      expect(result.error).toBeUndefined();
      expect(result.frontmatter.title).toBe("Test");
      expect(result.frontmatter.customField).toBe("custom value");
      expect(result.frontmatter.anotherField).toBe(123);
    });

    test("parses resources array", () => {
      const content = `---
title: Test
resources:
  - label: Cheat Sheet
    path: /courses/test/cheatsheet.pdf
  - label: Slides
    path: /courses/test/slides.pdf
---`;

      const result = parseFrontmatter(content);

      expect(result.error).toBeUndefined();
      expect(result.frontmatter.resources).toHaveLength(2);
      expect(result.frontmatter.resources?.[0].label).toBe("Cheat Sheet");
    });

    test("includes raw frontmatter string", () => {
      const content = `---
title: Test
---`;

      const result = parseFrontmatter(content);

      expect(result.raw).toBe("title: Test");
    });
  });

  describe("edge cases", () => {
    test("returns empty frontmatter for missing delimiters", () => {
      const content = `# Just content
No frontmatter here`;

      const result = parseFrontmatter(content);

      expect(result.frontmatter).toEqual({});
      expect(result.error).toBe("No frontmatter found");
    });

    test("handles empty frontmatter (--- followed by ---)", () => {
      const content = `---
---

Content`;

      const result = parseFrontmatter(content);

      expect(result.frontmatter).toEqual({});
      expect(result.error).toBeUndefined();
      expect(result.raw).toBe("");
    });

    test("handles frontmatter without closing delimiter", () => {
      const content = `---
title: Incomplete

# Content continues without end marker`;

      const result = parseFrontmatter(content);

      expect(result.frontmatter).toEqual({});
      expect(result.error).toContain("no closing delimiter");
    });

    test("handles Windows line endings (CRLF)", () => {
      const content = "---\r\ntitle: Windows\r\n---\r\nContent";

      const result = parseFrontmatter(content);

      expect(result.frontmatter.title).toBe("Windows");
      expect(result.error).toBeUndefined();
    });
  });

  describe("malformed YAML", () => {
    test("returns error for invalid YAML syntax", () => {
      const content = `---
title: Test
invalid: yaml: syntax: here:
---`;

      const result = parseFrontmatter(content);

      expect(result.frontmatter).toEqual({});
      expect(result.error).toContain("Invalid YAML");
    });

    test("returns error for non-object frontmatter", () => {
      const content = `---
- just
- a
- list
---`;

      const result = parseFrontmatter(content);

      expect(result.frontmatter).toEqual({});
      expect(result.error).toBe("Frontmatter must be an object");
    });

    test("handles YAML with quotes", () => {
      const content = `---
title: "Quoted: with colons"
description: 'Single quoted'
---`;

      const result = parseFrontmatter(content);

      expect(result.frontmatter.title).toBe("Quoted: with colons");
      expect(result.frontmatter.description).toBe("Single quoted");
    });
  });
});

describe("LESSON_FILENAME_PATTERN", () => {
  test("matches standard lesson filename", () => {
    expect(LESSON_FILENAME_PATTERN.test("01-intro.md")).toBe(true);
  });

  test("does not match invalid patterns", () => {
    expect(LESSON_FILENAME_PATTERN.test("intro.md")).toBe(false);
    expect(LESSON_FILENAME_PATTERN.test("1-short.md")).toBe(false);
  });
});
