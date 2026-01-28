/**
 * Guide Discovery Utilities Tests (F-4)
 */

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  GUIDE_FILENAME_PATTERN,
  parseGuideFilename,
  parseGuideFrontmatter,
  scanGuideFiles,
} from "./guide-discovery-utils";

// =============================================================================
// Filename Pattern Tests
// =============================================================================

describe("GUIDE_FILENAME_PATTERN", () => {
  test("matches guide.md", () => {
    expect("guide.md").toMatch(GUIDE_FILENAME_PATTERN);
  });

  test("matches guide-setup.md", () => {
    expect("guide-setup.md").toMatch(GUIDE_FILENAME_PATTERN);
  });

  test("matches Guide-CamelCase.md (case insensitive)", () => {
    expect("Guide-CamelCase.md").toMatch(GUIDE_FILENAME_PATTERN);
  });

  test("does not match readme.md", () => {
    expect("readme.md").not.toMatch(GUIDE_FILENAME_PATTERN);
  });

  test("does not match my-guide.md (prefix must be guide)", () => {
    expect("my-guide.md").not.toMatch(GUIDE_FILENAME_PATTERN);
  });
});

// =============================================================================
// parseGuideFilename Tests
// =============================================================================

describe("parseGuideFilename", () => {
  test("guide.md -> slug: guide", () => {
    const result = parseGuideFilename("guide.md");
    expect(result).toEqual({ slug: "guide" });
  });

  test("guide-setup.md -> slug: setup", () => {
    const result = parseGuideFilename("guide-setup.md");
    expect(result).toEqual({ slug: "setup" });
  });

  test("guide-multi-word-slug.md -> slug: multi-word-slug", () => {
    const result = parseGuideFilename("guide-multi-word-slug.md");
    expect(result).toEqual({ slug: "multi-word-slug" });
  });

  test("Guide-CamelCase.md -> slug: CamelCase (preserves case)", () => {
    const result = parseGuideFilename("Guide-CamelCase.md");
    expect(result).toEqual({ slug: "CamelCase" });
  });

  test("guide-01-intro.md -> slug: 01-intro", () => {
    const result = parseGuideFilename("guide-01-intro.md");
    expect(result).toEqual({ slug: "01-intro" });
  });

  test("readme.md -> null", () => {
    const result = parseGuideFilename("readme.md");
    expect(result).toBeNull();
  });

  test("my-guide.md -> null", () => {
    const result = parseGuideFilename("my-guide.md");
    expect(result).toBeNull();
  });

  test("notes.md -> null", () => {
    const result = parseGuideFilename("notes.md");
    expect(result).toBeNull();
  });

  test("GUIDE.MD (uppercase) -> slug: guide", () => {
    const result = parseGuideFilename("GUIDE.MD");
    expect(result).toEqual({ slug: "guide" });
  });

  test("guide-.md -> null (invalid, missing slug after dash)", () => {
    const result = parseGuideFilename("guide-.md");
    // The pattern requires content after the dash, so this is invalid
    expect(result).toBeNull();
  });
});

// =============================================================================
// parseGuideFrontmatter Tests
// =============================================================================

describe("parseGuideFrontmatter", () => {
  test("valid frontmatter with title and description", () => {
    const content = `---
title: Setup Guide
description: How to set up your environment
---
# Content here`;

    const result = parseGuideFrontmatter(content);
    expect(result.frontmatter).toEqual({
      title: "Setup Guide",
      description: "How to set up your environment",
    });
    expect(result.error).toBeUndefined();
  });

  test("valid frontmatter with title only", () => {
    const content = `---
title: Quick Start
---
Content`;

    const result = parseGuideFrontmatter(content);
    expect(result.frontmatter).toEqual({ title: "Quick Start" });
    expect(result.error).toBeUndefined();
  });

  test("valid frontmatter with extra fields (passthrough)", () => {
    const content = `---
title: Advanced Guide
description: For power users
author: John Doe
version: 2.0
---
Content`;

    const result = parseGuideFrontmatter(content);
    expect(result.frontmatter).toEqual({
      title: "Advanced Guide",
      description: "For power users",
      author: "John Doe",
      version: 2.0,
    });
    expect(result.error).toBeUndefined();
  });

  test("missing frontmatter returns error", () => {
    const content = `# No Frontmatter
Just content`;

    const result = parseGuideFrontmatter(content);
    expect(result.frontmatter).toBeNull();
    expect(result.error).toBe("No frontmatter found");
  });

  test("invalid YAML syntax returns error", () => {
    const content = `---
title: Bad YAML
  indentation: wrong
    nested: incorrectly
---
Content`;

    const result = parseGuideFrontmatter(content);
    expect(result.frontmatter).toBeNull();
    expect(result.error).toContain("YAML parse error");
  });

  test("missing title field returns error", () => {
    const content = `---
description: Missing the title
author: Someone
---
Content`;

    const result = parseGuideFrontmatter(content);
    expect(result.frontmatter).toBeNull();
    // Zod error message for missing required field
    expect(result.error).toBeDefined();
  });

  test("empty frontmatter block returns error", () => {
    const content = `---
---
Content`;

    const result = parseGuideFrontmatter(content);
    expect(result.frontmatter).toBeNull();
    expect(result.error).toBe("Empty frontmatter block");
  });

  test("empty title returns error", () => {
    const content = `---
title: ""
---
Content`;

    const result = parseGuideFrontmatter(content);
    expect(result.frontmatter).toBeNull();
    expect(result.error).toContain("title");
  });

  test("array frontmatter returns error", () => {
    const content = `---
- item1
- item2
---
Content`;

    const result = parseGuideFrontmatter(content);
    expect(result.frontmatter).toBeNull();
    expect(result.error).toBe("Frontmatter must be a YAML object");
  });

  test("includes raw frontmatter string", () => {
    const content = `---
title: Test Guide
---
Content`;

    const result = parseGuideFrontmatter(content);
    expect(result.raw).toBe("title: Test Guide");
  });
});

// =============================================================================
// scanGuideFiles Tests
// =============================================================================

describe("scanGuideFiles", () => {
  const testDir = path.join(process.cwd(), "test-fixtures", "guide-scan-test");

  beforeAll(() => {
    // Create test directory structure
    fs.mkdirSync(path.join(testDir, "flat"), { recursive: true });
    fs.mkdirSync(path.join(testDir, "nested", "module-01"), { recursive: true });
    fs.mkdirSync(path.join(testDir, "nested", "module-02", "advanced"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(testDir, "mixed"), { recursive: true });
    fs.mkdirSync(path.join(testDir, "empty"), { recursive: true });

    // Flat directory files
    fs.writeFileSync(
      path.join(testDir, "flat", "guide-setup.md"),
      "---\ntitle: Setup\n---\n"
    );
    fs.writeFileSync(
      path.join(testDir, "flat", "guide-troubleshooting.md"),
      "---\ntitle: Troubleshooting\n---\n"
    );

    // Nested directory files
    fs.writeFileSync(
      path.join(testDir, "nested", "guide.md"),
      "---\ntitle: Root Guide\n---\n"
    );
    fs.writeFileSync(
      path.join(testDir, "nested", "module-01", "guide-intro.md"),
      "---\ntitle: Intro\n---\n"
    );
    fs.writeFileSync(
      path.join(testDir, "nested", "module-02", "advanced", "guide-deployment.md"),
      "---\ntitle: Deployment\n---\n"
    );

    // Mixed directory files
    fs.writeFileSync(
      path.join(testDir, "mixed", "guide-setup.md"),
      "---\ntitle: Setup\n---\n"
    );
    fs.writeFileSync(path.join(testDir, "mixed", "notes.md"), "# Notes");
    fs.writeFileSync(path.join(testDir, "mixed", "README.md"), "# README");
  });

  afterAll(() => {
    // Clean up test directories
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test("discovers guides in flat directory", async () => {
    const files = await scanGuideFiles(path.join(testDir, "flat"));
    expect(files).toEqual(["guide-setup.md", "guide-troubleshooting.md"]);
  });

  test("discovers guides in nested directories", async () => {
    const files = await scanGuideFiles(path.join(testDir, "nested"));
    expect(files).toEqual([
      "guide.md",
      "module-01/guide-intro.md",
      "module-02/advanced/guide-deployment.md",
    ]);
  });

  test("filters non-guide markdown files", async () => {
    const files = await scanGuideFiles(path.join(testDir, "mixed"));
    expect(files).toEqual(["guide-setup.md"]);
    expect(files).not.toContain("notes.md");
    expect(files).not.toContain("README.md");
  });

  test("returns empty array for empty directory", async () => {
    const files = await scanGuideFiles(path.join(testDir, "empty"));
    expect(files).toEqual([]);
  });

  test("returns empty array for missing directory (no throw)", async () => {
    const files = await scanGuideFiles(path.join(testDir, "nonexistent"));
    expect(files).toEqual([]);
  });

  test("results are sorted alphabetically", async () => {
    const files = await scanGuideFiles(path.join(testDir, "nested"));
    const sorted = [...files].sort();
    expect(files).toEqual(sorted);
  });

  test("subdirectory filter works", async () => {
    const files = await scanGuideFiles(path.join(testDir, "nested"), {
      subdirectory: "module-01",
    });
    expect(files).toEqual(["module-01/guide-intro.md"]);
  });

  test("subdirectory filter returns empty for nonexistent subdirectory", async () => {
    const files = await scanGuideFiles(path.join(testDir, "nested"), {
      subdirectory: "nonexistent",
    });
    expect(files).toEqual([]);
  });
});
