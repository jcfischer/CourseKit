/**
 * Asset Discovery Utilities Tests (F-5)
 */

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  MIME_TYPE_MAP,
  detectMimeType,
  getFileSize,
  scanAssetFiles,
} from "./asset-discovery-utils";

// =============================================================================
// MIME Type Detection Tests
// =============================================================================

describe("MIME_TYPE_MAP", () => {
  test("contains image types", () => {
    expect(MIME_TYPE_MAP.png).toBe("image/png");
    expect(MIME_TYPE_MAP.jpg).toBe("image/jpeg");
    expect(MIME_TYPE_MAP.jpeg).toBe("image/jpeg");
    expect(MIME_TYPE_MAP.gif).toBe("image/gif");
    expect(MIME_TYPE_MAP.svg).toBe("image/svg+xml");
    expect(MIME_TYPE_MAP.webp).toBe("image/webp");
  });

  test("contains document types", () => {
    expect(MIME_TYPE_MAP.pdf).toBe("application/pdf");
    expect(MIME_TYPE_MAP.doc).toBe("application/msword");
    expect(MIME_TYPE_MAP.xlsx).toContain("spreadsheetml");
  });

  test("contains video types", () => {
    expect(MIME_TYPE_MAP.mp4).toBe("video/mp4");
    expect(MIME_TYPE_MAP.webm).toBe("video/webm");
    expect(MIME_TYPE_MAP.mov).toBe("video/quicktime");
  });

  test("contains audio types", () => {
    expect(MIME_TYPE_MAP.mp3).toBe("audio/mpeg");
    expect(MIME_TYPE_MAP.wav).toBe("audio/wav");
  });

  test("contains data types", () => {
    expect(MIME_TYPE_MAP.json).toBe("application/json");
    expect(MIME_TYPE_MAP.csv).toBe("text/csv");
    expect(MIME_TYPE_MAP.xml).toBe("application/xml");
  });
});

describe("detectMimeType", () => {
  test("detects known image type", () => {
    expect(detectMimeType("image.png")).toBe("image/png");
    expect(detectMimeType("photo.jpg")).toBe("image/jpeg");
  });

  test("detects known document type", () => {
    expect(detectMimeType("document.pdf")).toBe("application/pdf");
  });

  test("returns application/octet-stream for unknown extension", () => {
    expect(detectMimeType("file.xyz")).toBe("application/octet-stream");
    expect(detectMimeType("unknown.abc123")).toBe("application/octet-stream");
  });

  test("is case insensitive", () => {
    expect(detectMimeType("IMAGE.PNG")).toBe("image/png");
    expect(detectMimeType("photo.JPG")).toBe("image/jpeg");
    expect(detectMimeType("doc.PDF")).toBe("application/pdf");
  });

  test("handles multi-extension files (uses final extension)", () => {
    expect(detectMimeType("archive.tar.gz")).toBe("application/gzip");
    expect(detectMimeType("data.backup.json")).toBe("application/json");
  });

  test("handles paths with directories", () => {
    expect(detectMimeType("path/to/image.png")).toBe("image/png");
    expect(detectMimeType("/absolute/path/doc.pdf")).toBe("application/pdf");
  });

  test("handles files without extension", () => {
    expect(detectMimeType("noextension")).toBe("application/octet-stream");
  });
});

// =============================================================================
// File Stats Tests
// =============================================================================

describe("getFileSize", () => {
  const testDir = path.join(process.cwd(), "test-fixtures", "asset-size-test");
  const testFile = path.join(testDir, "test.txt");

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(testFile, "Hello, World!"); // 13 bytes
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test("returns correct file size", () => {
    const size = getFileSize(testFile);
    expect(size).toBe(13);
  });

  test("throws for non-existent file", () => {
    expect(() => getFileSize(path.join(testDir, "nonexistent.txt"))).toThrow(
      "File not found"
    );
  });
});

// =============================================================================
// Directory Scanning Tests
// =============================================================================

describe("scanAssetFiles", () => {
  const fixturesDir = path.join(process.cwd(), "test-fixtures", "assets");

  test("discovers assets in flat structure", async () => {
    const materialsRoot = path.join(fixturesDir, "flat-structure", "materials");
    const files = await scanAssetFiles(materialsRoot);

    expect(files.length).toBe(2);
    expect(files).toContain("assets/cheatsheet.pdf");
    expect(files).toContain("assets/diagram.png");
  });

  test("discovers assets in nested structure", async () => {
    const materialsRoot = path.join(fixturesDir, "nested-structure", "materials");
    const files = await scanAssetFiles(materialsRoot);

    expect(files.length).toBe(2);
    expect(files).toContain("module-01/assets/screenshot.png");
    expect(files).toContain("module-02/advanced/assets/architecture.svg");
  });

  test("returns empty for empty assets directory", async () => {
    const materialsRoot = path.join(fixturesDir, "empty-assets", "materials");
    const files = await scanAssetFiles(materialsRoot);

    // Only .gitkeep which might be filtered as dotfile
    expect(files.length).toBe(0);
  });

  test("returns empty for materials without assets directories", async () => {
    const materialsRoot = path.join(fixturesDir, "no-assets", "materials");
    const files = await scanAssetFiles(materialsRoot);

    expect(files.length).toBe(0);
  });

  test("returns empty for missing directory (no throw)", async () => {
    const files = await scanAssetFiles("/nonexistent/path");
    expect(files).toEqual([]);
  });

  test("results are sorted alphabetically", async () => {
    const materialsRoot = path.join(fixturesDir, "flat-structure", "materials");
    const files = await scanAssetFiles(materialsRoot);

    const sorted = [...files].sort();
    expect(files).toEqual(sorted);
  });

  test("discovers mixed file types", async () => {
    const materialsRoot = path.join(fixturesDir, "mixed-types", "materials");
    const files = await scanAssetFiles(materialsRoot);

    expect(files.length).toBe(5);
    expect(files).toContain("assets/photo.jpg");
    expect(files).toContain("assets/diagram.svg");
    expect(files).toContain("assets/notes.pdf");
    expect(files).toContain("assets/demo.mp4");
    expect(files).toContain("assets/data.csv");
  });

  test("subdirectory filter works", async () => {
    const materialsRoot = path.join(fixturesDir, "nested-structure", "materials");
    const files = await scanAssetFiles(materialsRoot, {
      subdirectory: "module-01",
    });

    expect(files.length).toBe(1);
    expect(files[0]).toBe("module-01/assets/screenshot.png");
  });
});
