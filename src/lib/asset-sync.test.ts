/**
 * Asset Sync Execution Tests (F-11)
 * Tests for syncing assets from materials to platform public directory.
 */

import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  executeAssetSync,
  buildAssetTargetPath,
  writeAssetFile,
  calculateBinaryHash,
} from "./asset-sync";
import { loadSyncState, saveSyncState, initializeSyncState } from "./sync-state";
import type { CourseKitConfig } from "../types";

// Test fixture directory
const TEST_ROOT = path.join(process.cwd(), "test-fixtures/asset-sync");

// Helper to create a test config
function createTestConfig(platformDir: string): CourseKitConfig {
  return {
    platform: { path: platformDir },
    courses: {
      "test-course": {
        slug: "test-course",
        sourceDir: path.join(platformDir, "courses/test-course"),
      },
    },
  };
}

// Helper to create asset file in materials directory
async function createMaterialsAsset(
  platformDir: string,
  subdir: string,
  filename: string,
  content: Buffer | string
): Promise<string> {
  const assetDir = path.join(platformDir, "materials", subdir, "assets");
  await fs.promises.mkdir(assetDir, { recursive: true });
  const filePath = path.join(assetDir, filename);
  await Bun.write(filePath, content);
  return filePath;
}

// Helper to create platform asset file
async function createPlatformAsset(
  platformDir: string,
  courseSlug: string,
  relativePath: string,
  content: Buffer | string
): Promise<string> {
  const assetDir = path.join(platformDir, "public/courses", courseSlug);
  const fullPath = path.join(assetDir, relativePath);
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  await Bun.write(fullPath, content);
  return fullPath;
}

// Helper to clean up test directory
async function cleanTestDir(dir: string): Promise<void> {
  try {
    await fs.promises.rm(dir, { recursive: true });
  } catch {
    // Directory may not exist
  }
}

// Create a simple PNG buffer for testing
function createTestImage(): Buffer {
  // Minimal valid PNG (1x1 red pixel)
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
    0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe, 0xd4, 0xef, 0x00, 0x00,
    0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
}

describe("buildAssetTargetPath", () => {
  it("constructs correct path for asset", () => {
    const platformRoot = "/platform";
    const courseSlug = "astro-course";
    const relativePath = "hero.png";

    const result = buildAssetTargetPath(platformRoot, courseSlug, relativePath);

    expect(result).toBe("/platform/public/courses/astro-course/hero.png");
  });

  it("preserves nested directory structure", () => {
    const platformRoot = "/platform";
    const courseSlug = "astro-course";
    const relativePath = "images/diagrams/architecture.png";

    const result = buildAssetTargetPath(platformRoot, courseSlug, relativePath);

    expect(result).toBe("/platform/public/courses/astro-course/images/diagrams/architecture.png");
  });
});

describe("calculateBinaryHash", () => {
  it("calculates consistent hash for binary content", async () => {
    const testDir = path.join(TEST_ROOT, "hash-test");
    await cleanTestDir(testDir);
    await fs.promises.mkdir(testDir, { recursive: true });

    const content = createTestImage();
    const filePath = path.join(testDir, "test.png");
    await Bun.write(filePath, content);

    const hash1 = await calculateBinaryHash(filePath);
    const hash2 = await calculateBinaryHash(filePath);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex

    await cleanTestDir(testDir);
  });
});

describe("writeAssetFile", () => {
  const testDir = path.join(TEST_ROOT, "write-test");

  beforeEach(async () => {
    await cleanTestDir(testDir);
    await fs.promises.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await cleanTestDir(testDir);
  });

  it("copies binary file content", async () => {
    const content = createTestImage();
    const sourcePath = path.join(testDir, "source.png");
    const targetPath = path.join(testDir, "target/image.png");

    await Bun.write(sourcePath, content);

    const result = await writeAssetFile(sourcePath, targetPath);

    expect(result.success).toBe(true);
    const written = await Bun.file(targetPath).arrayBuffer();
    expect(Buffer.from(written)).toEqual(content);
  });

  it("creates parent directories if needed", async () => {
    const content = createTestImage();
    const sourcePath = path.join(testDir, "source.png");
    const targetPath = path.join(testDir, "deep/nested/dir/image.png");

    await Bun.write(sourcePath, content);

    const result = await writeAssetFile(sourcePath, targetPath);

    expect(result.success).toBe(true);
    expect(fs.existsSync(targetPath)).toBe(true);
  });

  it("returns error for missing source file", async () => {
    const sourcePath = path.join(testDir, "nonexistent.png");
    const targetPath = path.join(testDir, "target.png");

    const result = await writeAssetFile(sourcePath, targetPath);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("executeAssetSync", () => {
  const testDir = path.join(TEST_ROOT, "sync-test");
  let platformDir: string;
  let config: CourseKitConfig;

  beforeEach(async () => {
    await cleanTestDir(testDir);
    platformDir = path.join(testDir, "platform");
    await fs.promises.mkdir(platformDir, { recursive: true });
    config = createTestConfig(platformDir);
  });

  afterEach(async () => {
    await cleanTestDir(testDir);
  });

  it("creates new asset files when platform is empty", async () => {
    const content = createTestImage();
    await createMaterialsAsset(platformDir, "module-01", "hero.png", content);

    const result = await executeAssetSync(config, {});

    expect(result.success).toBe(true);
    expect(result.created.some(k => k.includes("hero.png"))).toBe(true);
    expect(result.summary.created).toBe(1);

    // Verify file was written
    const targetPath = path.join(platformDir, "public/courses/test-course/hero.png");
    expect(fs.existsSync(targetPath)).toBe(true);
  });

  it("skips unchanged assets based on content hash", async () => {
    const content = createTestImage();

    // Create source and platform with identical content
    await createMaterialsAsset(platformDir, "module-01", "hero.png", content);
    await createPlatformAsset(platformDir, "test-course", "hero.png", content);

    // Initialize sync state with matching hash
    const state = initializeSyncState();
    const sourcePath = path.join(platformDir, "materials/module-01/assets/hero.png");
    const hash = await calculateBinaryHash(sourcePath);
    state.records["assets/test-course/hero.png"] = {
      filePath: "public/courses/test-course/hero.png",
      contentHash: hash,
      syncedAt: new Date().toISOString(),
      sourceRepo: "materials",
    };
    await saveSyncState(platformDir, state);

    const result = await executeAssetSync(config, {});

    expect(result.success).toBe(true);
    expect(result.unchanged.some(k => k.includes("hero.png"))).toBe(true);
    expect(result.summary.unchanged).toBe(1);
  });

  it("updates modified assets", async () => {
    const sourceContent = createTestImage();
    const platformContent = Buffer.from("old content");

    await createMaterialsAsset(platformDir, "module-01", "hero.png", sourceContent);
    const platformPath = await createPlatformAsset(platformDir, "test-course", "hero.png", platformContent);

    // Initialize sync state with hash matching current platform (platform unchanged since last sync)
    // This simulates: source was modified but platform wasn't touched
    const state = initializeSyncState();
    const platformHash = await calculateBinaryHash(platformPath);
    state.records["assets/test-course/hero.png"] = {
      filePath: "public/courses/test-course/hero.png",
      contentHash: platformHash, // Match current platform = platform unchanged
      syncedAt: new Date().toISOString(),
      sourceRepo: "materials",
    };
    await saveSyncState(platformDir, state);

    const result = await executeAssetSync(config, {});

    expect(result.success).toBe(true);
    expect(result.updated.some(k => k.includes("hero.png"))).toBe(true);

    // Verify platform now has source content
    const targetPath = path.join(platformDir, "public/courses/test-course/hero.png");
    const written = await Bun.file(targetPath).arrayBuffer();
    expect(Buffer.from(written)).toEqual(sourceContent);
  });

  it("skips assets with conflicts unless force flag is set", async () => {
    const sourceContent = createTestImage();
    const platformContent = Buffer.from("manually modified");

    await createMaterialsAsset(platformDir, "module-01", "hero.png", sourceContent);
    await createPlatformAsset(platformDir, "test-course", "hero.png", platformContent);

    // Create sync state with original hash (different from current platform)
    const state = initializeSyncState();
    state.records["assets/test-course/hero.png"] = {
      filePath: "public/courses/test-course/hero.png",
      contentHash: "original-hash",
      syncedAt: new Date().toISOString(),
      sourceRepo: "materials",
    };
    await saveSyncState(platformDir, state);

    const result = await executeAssetSync(config, {});

    expect(result.success).toBe(false);
    expect(result.skipped.some(k => k.includes("hero.png"))).toBe(true);
  });

  it("overwrites conflicts when force flag is set", async () => {
    const sourceContent = createTestImage();
    const platformContent = Buffer.from("manually modified");

    await createMaterialsAsset(platformDir, "module-01", "hero.png", sourceContent);
    await createPlatformAsset(platformDir, "test-course", "hero.png", platformContent);

    // Create sync state with original hash
    const state = initializeSyncState();
    state.records["assets/test-course/hero.png"] = {
      filePath: "public/courses/test-course/hero.png",
      contentHash: "original-hash",
      syncedAt: new Date().toISOString(),
      sourceRepo: "materials",
    };
    await saveSyncState(platformDir, state);

    const result = await executeAssetSync(config, { force: true });

    expect(result.success).toBe(true);
    expect(result.updated.some(k => k.includes("hero.png"))).toBe(true);
  });

  it("does not write files in dry-run mode", async () => {
    const content = createTestImage();
    await createMaterialsAsset(platformDir, "module-01", "hero.png", content);

    const result = await executeAssetSync(config, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.created.some(k => k.includes("hero.png"))).toBe(true);

    // File should NOT have been written
    const targetPath = path.join(platformDir, "public/courses/test-course/hero.png");
    expect(fs.existsSync(targetPath)).toBe(false);
  });

  it("updates sync state after successful write", async () => {
    const content = createTestImage();
    await createMaterialsAsset(platformDir, "module-01", "hero.png", content);

    await executeAssetSync(config, {});

    // Verify sync state was updated
    const state = await loadSyncState(platformDir);
    const keys = Object.keys(state.records);
    expect(keys.some(k => k.includes("hero.png"))).toBe(true);
  });

  it("returns empty result when no assets found", async () => {
    // No materials directory created
    const result = await executeAssetSync(config, {});

    expect(result.success).toBe(true);
    expect(result.summary.total).toBe(0);
  });
});
