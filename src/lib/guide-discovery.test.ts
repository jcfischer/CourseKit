/**
 * Guide Discovery Tests (F-4)
 */

import { describe, expect, test } from "bun:test";
import * as path from "node:path";
import { discoverGuides } from "./guide-discovery";
import type { CourseKitConfig } from "../types";

const fixturesDir = path.join(process.cwd(), "test-fixtures");

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
// Scenario 1: Flat Structure
// =============================================================================

describe("Scenario 1: Flat guides", () => {
  test("discovers guides in flat materials directory", async () => {
    const config = createConfig("guides-flat");
    const manifest = await discoverGuides(config);

    expect(manifest.guides.length).toBe(2);
    expect(manifest.warnings.length).toBe(0);
  });

  test("parses frontmatter correctly", async () => {
    const config = createConfig("guides-flat");
    const manifest = await discoverGuides(config);

    const setupGuide = manifest.guides.find((g) => g.slug === "setup");
    expect(setupGuide).toBeDefined();
    expect(setupGuide?.frontmatter.title).toBe("Setup Guide");
    expect(setupGuide?.frontmatter.description).toBe(
      "How to set up your development environment"
    );
  });

  test("extracts slug from filename", async () => {
    const config = createConfig("guides-flat");
    const manifest = await discoverGuides(config);

    const slugs = manifest.guides.map((g) => g.slug).sort();
    expect(slugs).toEqual(["setup", "troubleshooting"]);
  });

  test("includes correct paths", async () => {
    const config = createConfig("guides-flat");
    const manifest = await discoverGuides(config);

    const setupGuide = manifest.guides.find((g) => g.slug === "setup");
    expect(setupGuide?.relativePath).toBe("guide-setup.md");
    expect(setupGuide?.path).toContain("guides-flat/materials/guide-setup.md");
  });
});

// =============================================================================
// Scenario 2: Nested Structure
// =============================================================================

describe("Scenario 2: Nested guides", () => {
  test("discovers guides in nested directories", async () => {
    const config = createConfig("guides-nested");
    const manifest = await discoverGuides(config);

    expect(manifest.guides.length).toBe(2);
    expect(manifest.warnings.length).toBe(0);
  });

  test("handles arbitrary nesting depth", async () => {
    const config = createConfig("guides-nested");
    const manifest = await discoverGuides(config);

    const relativePaths = manifest.guides.map((g) => g.relativePath).sort();
    expect(relativePaths).toEqual([
      "module-01/guide-intro.md",
      "module-02/advanced/guide-deployment.md",
    ]);
  });

  test("extracts slug from deeply nested file", async () => {
    const config = createConfig("guides-nested");
    const manifest = await discoverGuides(config);

    const deployGuide = manifest.guides.find((g) => g.slug === "deployment");
    expect(deployGuide).toBeDefined();
    expect(deployGuide?.frontmatter.title).toBe("Deployment Guide");
  });
});

// =============================================================================
// Scenario 3: Mixed Files
// =============================================================================

describe("Scenario 3: Mixed files", () => {
  test("only discovers guide files", async () => {
    const config = createConfig("guides-mixed");
    const manifest = await discoverGuides(config);

    expect(manifest.guides.length).toBe(1);
    expect(manifest.guides[0].slug).toBe("setup");
  });

  test("ignores non-guide markdown files", async () => {
    const config = createConfig("guides-mixed");
    const manifest = await discoverGuides(config);

    const relativePaths = manifest.guides.map((g) => g.relativePath);
    expect(relativePaths).not.toContain("notes.md");
    expect(relativePaths).not.toContain("README.md");
  });
});

// =============================================================================
// Scenario 4: Empty Directory
// =============================================================================

describe("Scenario 4: Empty materials directory", () => {
  test("returns empty result with warning", async () => {
    const config = createConfig("guides-empty");
    const manifest = await discoverGuides(config);

    expect(manifest.guides.length).toBe(0);
    expect(manifest.warnings.length).toBe(1);
    expect(manifest.warnings[0].code).toBe("EMPTY_MATERIALS_DIR");
  });

  test("does not throw error", async () => {
    const config = createConfig("guides-empty");
    await expect(discoverGuides(config)).resolves.toBeDefined();
  });
});

// =============================================================================
// Scenario 5: Missing Directory
// =============================================================================

describe("Scenario 5: Missing materials directory", () => {
  test("returns empty result with warning", async () => {
    const config = createConfig("no-materials");
    const manifest = await discoverGuides(config);

    expect(manifest.guides.length).toBe(0);
    expect(manifest.warnings.length).toBe(1);
    expect(manifest.warnings[0].code).toBe("MISSING_MATERIALS_DIR");
  });

  test("does not throw error", async () => {
    const config = createConfig("no-materials");
    await expect(discoverGuides(config)).resolves.toBeDefined();
  });
});

// =============================================================================
// Scenario 6: Malformed Frontmatter
// =============================================================================

describe("Scenario 6: Malformed frontmatter", () => {
  test("includes files but with warnings", async () => {
    const config = createConfig("guides-malformed");
    const manifest = await discoverGuides(config);

    // Files are still included (with empty frontmatter)
    expect(manifest.guides.length).toBe(2);
    // But warnings are generated
    expect(manifest.warnings.length).toBe(2);
  });

  test("generates MALFORMED_FRONTMATTER warning for bad YAML", async () => {
    const config = createConfig("guides-malformed");
    const manifest = await discoverGuides(config);

    const badYamlWarning = manifest.warnings.find(
      (w) => w.relativePath === "guide-bad-yaml.md"
    );
    expect(badYamlWarning).toBeDefined();
    expect(badYamlWarning?.code).toBe("MALFORMED_FRONTMATTER");
  });

  test("generates MISSING_TITLE warning for missing title", async () => {
    const config = createConfig("guides-malformed");
    const manifest = await discoverGuides(config);

    const noTitleWarning = manifest.warnings.find(
      (w) => w.relativePath === "guide-no-title.md"
    );
    expect(noTitleWarning).toBeDefined();
    expect(noTitleWarning?.code).toBe("MISSING_TITLE");
  });
});

// =============================================================================
// Options Tests
// =============================================================================

describe("Discovery options", () => {
  test("includeRawFrontmatter option includes raw string", async () => {
    const config = createConfig("guides-flat");
    const manifest = await discoverGuides(config, {
      includeRawFrontmatter: true,
    });

    expect(manifest.guides[0].rawFrontmatter).toBeDefined();
    expect(manifest.guides[0].rawFrontmatter).toContain("title:");
  });

  test("subdirectory option filters to specific directory", async () => {
    const config = createConfig("guides-nested");
    const manifest = await discoverGuides(config, {
      subdirectory: "module-01",
    });

    expect(manifest.guides.length).toBe(1);
    expect(manifest.guides[0].relativePath).toBe("module-01/guide-intro.md");
  });

  test("subdirectory option with nonexistent dir returns warning", async () => {
    const config = createConfig("guides-nested");
    const manifest = await discoverGuides(config, {
      subdirectory: "nonexistent",
    });

    expect(manifest.guides.length).toBe(0);
    expect(manifest.warnings.length).toBe(1);
    expect(manifest.warnings[0].code).toBe("EMPTY_MATERIALS_DIR");
  });
});

// =============================================================================
// Manifest Metadata Tests
// =============================================================================

describe("Manifest metadata", () => {
  test("includes materialsRoot", async () => {
    const config = createConfig("guides-flat");
    const manifest = await discoverGuides(config);

    expect(manifest.materialsRoot).toContain("guides-flat");
    expect(manifest.materialsRoot).toContain("materials");
  });

  test("includes discoveredAt timestamp", async () => {
    const config = createConfig("guides-flat");
    const before = new Date();
    const manifest = await discoverGuides(config);
    const after = new Date();

    expect(manifest.discoveredAt).toBeInstanceOf(Date);
    expect(manifest.discoveredAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime()
    );
    expect(manifest.discoveredAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  test("results are sorted alphabetically by relativePath", async () => {
    const config = createConfig("guides-flat");
    const manifest = await discoverGuides(config);

    const paths = manifest.guides.map((g) => g.relativePath);
    const sorted = [...paths].sort();
    expect(paths).toEqual(sorted);
  });
});
