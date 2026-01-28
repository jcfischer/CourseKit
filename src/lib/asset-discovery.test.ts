/**
 * Asset Discovery Tests (F-5)
 */

import { describe, expect, test } from "bun:test";
import * as path from "node:path";
import { discoverAssets } from "./asset-discovery";
import type { CourseKitConfig } from "../types";

const fixturesDir = path.join(process.cwd(), "test-fixtures", "assets");

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

describe("Scenario 1: Flat assets", () => {
  test("discovers assets in flat structure", async () => {
    const config = createConfig("flat-structure");
    const manifest = await discoverAssets(config);

    expect(manifest.assets.length).toBe(2);
    expect(manifest.warnings.length).toBe(0);
  });

  test("includes correct paths", async () => {
    const config = createConfig("flat-structure");
    const manifest = await discoverAssets(config);

    const relativePaths = manifest.assets.map((a) => a.relativePath).sort();
    expect(relativePaths).toEqual([
      "assets/cheatsheet.pdf",
      "assets/diagram.png",
    ]);
  });

  test("detects MIME types correctly", async () => {
    const config = createConfig("flat-structure");
    const manifest = await discoverAssets(config);

    const pngAsset = manifest.assets.find((a) => a.extension === "png");
    const pdfAsset = manifest.assets.find((a) => a.extension === "pdf");

    expect(pngAsset?.mimeType).toBe("image/png");
    expect(pdfAsset?.mimeType).toBe("application/pdf");
  });

  test("includes file sizes", async () => {
    const config = createConfig("flat-structure");
    const manifest = await discoverAssets(config);

    for (const asset of manifest.assets) {
      expect(asset.size).toBeGreaterThan(0);
    }
  });

  test("calculates total size", async () => {
    const config = createConfig("flat-structure");
    const manifest = await discoverAssets(config);

    const expectedTotal = manifest.assets.reduce((sum, a) => sum + a.size, 0);
    expect(manifest.totalSize).toBe(expectedTotal);
  });
});

// =============================================================================
// Scenario 2: Nested Structure
// =============================================================================

describe("Scenario 2: Nested assets", () => {
  test("discovers assets in nested directories", async () => {
    const config = createConfig("nested-structure");
    const manifest = await discoverAssets(config);

    expect(manifest.assets.length).toBe(2);
    expect(manifest.warnings.length).toBe(0);
  });

  test("handles arbitrary nesting depth", async () => {
    const config = createConfig("nested-structure");
    const manifest = await discoverAssets(config);

    const relativePaths = manifest.assets.map((a) => a.relativePath).sort();
    expect(relativePaths).toEqual([
      "module-01/assets/screenshot.png",
      "module-02/advanced/assets/architecture.svg",
    ]);
  });

  test("detects SVG MIME type", async () => {
    const config = createConfig("nested-structure");
    const manifest = await discoverAssets(config);

    const svgAsset = manifest.assets.find((a) => a.extension === "svg");
    expect(svgAsset?.mimeType).toBe("image/svg+xml");
  });
});

// =============================================================================
// Scenario 3: Filter non-asset files
// =============================================================================

describe("Scenario 3: Ignores files outside assets directories", () => {
  test("only includes files in assets directories", async () => {
    const config = createConfig("no-assets");
    const manifest = await discoverAssets(config);

    // no-assets fixture has lesson-01.md but no assets/ directory
    expect(manifest.assets.length).toBe(0);
  });
});

// =============================================================================
// Scenario 4: Empty Assets Directory
// =============================================================================

describe("Scenario 4: Empty assets directory", () => {
  test("returns empty result", async () => {
    const config = createConfig("empty-assets");
    const manifest = await discoverAssets(config);

    expect(manifest.assets.length).toBe(0);
    expect(manifest.totalSize).toBe(0);
  });

  test("does not throw error", async () => {
    const config = createConfig("empty-assets");
    await expect(discoverAssets(config)).resolves.toBeDefined();
  });
});

// =============================================================================
// Scenario 5: Missing Materials Directory
// =============================================================================

describe("Scenario 5: Missing materials directory", () => {
  test("returns empty result with warning", async () => {
    const config: CourseKitConfig = {
      platform: { path: "/nonexistent/path" },
      courses: {},
    };
    const manifest = await discoverAssets(config);

    expect(manifest.assets.length).toBe(0);
    expect(manifest.warnings.length).toBe(1);
    expect(manifest.warnings[0].code).toBe("MISSING_MATERIALS_DIR");
  });

  test("does not throw error", async () => {
    const config: CourseKitConfig = {
      platform: { path: "/nonexistent/path" },
      courses: {},
    };
    await expect(discoverAssets(config)).resolves.toBeDefined();
  });
});

// =============================================================================
// Scenario 6: Mixed File Types
// =============================================================================

describe("Scenario 6: Various file types", () => {
  test("discovers all file types", async () => {
    const config = createConfig("mixed-types");
    const manifest = await discoverAssets(config);

    expect(manifest.assets.length).toBe(5);

    const extensions = manifest.assets.map((a) => a.extension).sort();
    expect(extensions).toEqual(["csv", "jpg", "mp4", "pdf", "svg"]);
  });

  test("detects MIME types for all files", async () => {
    const config = createConfig("mixed-types");
    const manifest = await discoverAssets(config);

    const mimeTypes = manifest.assets.map((a) => a.mimeType).sort();
    expect(mimeTypes).toEqual([
      "application/pdf",
      "image/jpeg",
      "image/svg+xml",
      "text/csv",
      "video/mp4",
    ]);
  });
});

// =============================================================================
// Options Tests
// =============================================================================

describe("Discovery options", () => {
  test("subdirectory option filters to specific directory", async () => {
    const config = createConfig("nested-structure");
    const manifest = await discoverAssets(config, {
      subdirectory: "module-01",
    });

    expect(manifest.assets.length).toBe(1);
    expect(manifest.assets[0].relativePath).toBe("module-01/assets/screenshot.png");
  });

  test("mimeTypes option filters by MIME type", async () => {
    const config = createConfig("mixed-types");
    const manifest = await discoverAssets(config, {
      mimeTypes: ["image/jpeg", "image/svg+xml"],
    });

    expect(manifest.assets.length).toBe(2);
    const extensions = manifest.assets.map((a) => a.extension).sort();
    expect(extensions).toEqual(["jpg", "svg"]);
  });

  test("mimeTypes filter returns empty when no match", async () => {
    const config = createConfig("flat-structure");
    const manifest = await discoverAssets(config, {
      mimeTypes: ["video/mp4"],
    });

    expect(manifest.assets.length).toBe(0);
  });
});

// =============================================================================
// Manifest Metadata Tests
// =============================================================================

describe("Manifest metadata", () => {
  test("includes materialsRoot", async () => {
    const config = createConfig("flat-structure");
    const manifest = await discoverAssets(config);

    expect(manifest.materialsRoot).toContain("flat-structure");
    expect(manifest.materialsRoot).toContain("materials");
  });

  test("includes discoveredAt timestamp", async () => {
    const config = createConfig("flat-structure");
    const before = new Date();
    const manifest = await discoverAssets(config);
    const after = new Date();

    expect(manifest.discoveredAt).toBeInstanceOf(Date);
    expect(manifest.discoveredAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime()
    );
    expect(manifest.discoveredAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  test("results are sorted alphabetically by relativePath", async () => {
    const config = createConfig("mixed-types");
    const manifest = await discoverAssets(config);

    const paths = manifest.assets.map((a) => a.relativePath);
    const sorted = [...paths].sort();
    expect(paths).toEqual(sorted);
  });
});
