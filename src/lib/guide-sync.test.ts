/**
 * Guide Sync Execution Tests (F-10)
 * Tests for syncing guides from materials to platform.
 */

import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { executeGuideSync, buildGuideTargetPath, writeGuideFile } from "./guide-sync";
import { loadSyncState, saveSyncState, initializeSyncState } from "./sync-state";
import { hashContent } from "./platform-utils";
import type { CourseKitConfig } from "../types";

// Test fixture directory
const TEST_ROOT = path.join(process.cwd(), "test-fixtures/guide-sync");

// Helper to create a test config
function createTestConfig(platformDir: string): CourseKitConfig {
  return {
    platform: { path: platformDir },
    courses: {},
  };
}

// Helper to create guide file in materials directory
async function createMaterialsGuide(
  platformDir: string,
  subdir: string,
  filename: string,
  content: string
): Promise<string> {
  const guideDir = path.join(platformDir, "materials", subdir);
  await fs.promises.mkdir(guideDir, { recursive: true });
  const filePath = path.join(guideDir, filename);
  await Bun.write(filePath, content);
  return filePath;
}

// Helper to create platform guide file
async function createPlatformGuide(
  platformDir: string,
  slug: string,
  content: string
): Promise<string> {
  const guidesDir = path.join(platformDir, "src/content/guides");
  await fs.promises.mkdir(guidesDir, { recursive: true });
  const filePath = path.join(guidesDir, `${slug}.md`);
  await Bun.write(filePath, content);
  return filePath;
}

// Helper to clean up test directory
async function cleanTestDir(dir: string): Promise<void> {
  try {
    await fs.promises.rm(dir, { recursive: true });
  } catch {
    // Directory may not exist
  }
}

describe("buildGuideTargetPath", () => {
  it("constructs correct platform path for guide", () => {
    const platformRoot = "/platform";
    const slug = "setup-guide";

    const result = buildGuideTargetPath(platformRoot, slug);

    expect(result).toBe("/platform/src/content/guides/setup-guide.md");
  });

  it("handles slug with special characters", () => {
    const platformRoot = "/platform";
    const slug = "getting-started-2024";

    const result = buildGuideTargetPath(platformRoot, slug);

    expect(result).toBe("/platform/src/content/guides/getting-started-2024.md");
  });
});

describe("writeGuideFile", () => {
  const testDir = path.join(TEST_ROOT, "write-test");

  beforeEach(async () => {
    await cleanTestDir(testDir);
    await fs.promises.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await cleanTestDir(testDir);
  });

  it("copies file content from source to target", async () => {
    const sourceContent = `---
title: Setup Guide
---

# Getting Started

Follow these steps.`;

    const sourcePath = path.join(testDir, "source.md");
    const targetPath = path.join(testDir, "target/guide.md");

    await Bun.write(sourcePath, sourceContent);

    const result = await writeGuideFile(sourcePath, targetPath);

    expect(result.success).toBe(true);
    const written = await Bun.file(targetPath).text();
    expect(written).toBe(sourceContent);
  });

  it("creates parent directories if needed", async () => {
    const sourceContent = "# Test";
    const sourcePath = path.join(testDir, "source.md");
    const targetPath = path.join(testDir, "deep/nested/guide.md");

    await Bun.write(sourcePath, sourceContent);

    const result = await writeGuideFile(sourcePath, targetPath);

    expect(result.success).toBe(true);
    expect(fs.existsSync(targetPath)).toBe(true);
  });

  it("returns error for missing source file", async () => {
    const sourcePath = path.join(testDir, "nonexistent.md");
    const targetPath = path.join(testDir, "target.md");

    const result = await writeGuideFile(sourcePath, targetPath);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("executeGuideSync", () => {
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

  it("creates new guide files when platform is empty", async () => {
    await createMaterialsGuide(
      platformDir,
      "module-01",
      "guide-setup.md",
      `---
title: Setup Guide
---

# Setup

Instructions here.`
    );

    const result = await executeGuideSync(config, {});

    expect(result.success).toBe(true);
    expect(result.created).toContain("guides/setup");
    expect(result.summary.created).toBe(1);

    // Verify file was written
    const targetPath = path.join(platformDir, "src/content/guides/setup.md");
    expect(fs.existsSync(targetPath)).toBe(true);
  });

  it("skips unchanged guides based on content hash", async () => {
    const content = `---
title: Setup Guide
---

# Setup

Same content.`;

    // Create source and platform with identical content
    await createMaterialsGuide(platformDir, "module-01", "guide-setup.md", content);
    await createPlatformGuide(platformDir, "setup", content);

    // Initialize sync state with matching hash
    const state = initializeSyncState();
    const bodyMatch = content.match(/^---[\s\S]*?---\s*([\s\S]*)$/);
    const body = bodyMatch ? bodyMatch[1] : content;
    state.records["guides/setup"] = {
      filePath: "src/content/guides/setup.md",
      contentHash: hashContent(body.trim()),
      syncedAt: new Date().toISOString(),
      sourceRepo: "materials",
    };
    await saveSyncState(platformDir, state);

    const result = await executeGuideSync(config, {});

    expect(result.success).toBe(true);
    expect(result.unchanged).toContain("guides/setup");
    expect(result.summary.unchanged).toBe(1);
    expect(result.summary.created).toBe(0);
  });

  it("updates modified guides", async () => {
    const sourceContent = `---
title: Setup Guide
---

# Setup

Updated content from source.`;

    const platformContent = `---
title: Setup Guide
---

# Setup

Old platform content.`;

    await createMaterialsGuide(platformDir, "module-01", "guide-setup.md", sourceContent);
    await createPlatformGuide(platformDir, "setup", platformContent);

    // Initialize sync state with old platform hash
    const state = initializeSyncState();
    const oldBodyMatch = platformContent.match(/^---[\s\S]*?---\s*([\s\S]*)$/);
    const oldBody = oldBodyMatch ? oldBodyMatch[1] : platformContent;
    state.records["guides/setup"] = {
      filePath: "src/content/guides/setup.md",
      contentHash: hashContent(oldBody.trim()),
      syncedAt: new Date().toISOString(),
      sourceRepo: "materials",
    };
    await saveSyncState(platformDir, state);

    const result = await executeGuideSync(config, {});

    expect(result.success).toBe(true);
    expect(result.updated).toContain("guides/setup");
    expect(result.summary.updated).toBe(1);

    // Verify platform now has source content
    const targetPath = path.join(platformDir, "src/content/guides/setup.md");
    const written = await Bun.file(targetPath).text();
    expect(written).toBe(sourceContent);
  });

  it("skips guides with conflicts unless force flag is set", async () => {
    const sourceContent = `---
title: Setup Guide
---

# Source content`;

    const platformContent = `---
title: Setup Guide
---

# Platform was modified manually`;

    await createMaterialsGuide(platformDir, "module-01", "guide-setup.md", sourceContent);
    await createPlatformGuide(platformDir, "setup", platformContent);

    // Create sync state with original hash (different from current platform)
    const state = initializeSyncState();
    state.records["guides/setup"] = {
      filePath: "src/content/guides/setup.md",
      contentHash: "original-hash-that-no-longer-matches",
      syncedAt: new Date().toISOString(),
      sourceRepo: "materials",
    };
    await saveSyncState(platformDir, state);

    const result = await executeGuideSync(config, {});

    expect(result.success).toBe(false);
    expect(result.skipped).toContain("guides/setup");
    expect(result.summary.skipped).toBe(1);

    // Platform file should NOT have been overwritten
    const targetPath = path.join(platformDir, "src/content/guides/setup.md");
    const current = await Bun.file(targetPath).text();
    expect(current).toBe(platformContent);
  });

  it("overwrites conflicts when force flag is set", async () => {
    const sourceContent = `---
title: Setup Guide
---

# Source content`;

    const platformContent = `---
title: Setup Guide
---

# Platform was modified manually`;

    await createMaterialsGuide(platformDir, "module-01", "guide-setup.md", sourceContent);
    await createPlatformGuide(platformDir, "setup", platformContent);

    // Create sync state with original hash
    const state = initializeSyncState();
    state.records["guides/setup"] = {
      filePath: "src/content/guides/setup.md",
      contentHash: "original-hash-that-no-longer-matches",
      syncedAt: new Date().toISOString(),
      sourceRepo: "materials",
    };
    await saveSyncState(platformDir, state);

    const result = await executeGuideSync(config, { force: true });

    expect(result.success).toBe(true);
    expect(result.updated).toContain("guides/setup");
    expect(result.summary.skipped).toBe(0);

    // Platform file SHOULD have been overwritten
    const targetPath = path.join(platformDir, "src/content/guides/setup.md");
    const current = await Bun.file(targetPath).text();
    expect(current).toBe(sourceContent);
  });

  it("does not write files in dry-run mode", async () => {
    await createMaterialsGuide(
      platformDir,
      "module-01",
      "guide-setup.md",
      `---
title: Setup Guide
---

# Setup`
    );

    const result = await executeGuideSync(config, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.created).toContain("guides/setup");

    // File should NOT have been written
    const targetPath = path.join(platformDir, "src/content/guides/setup.md");
    expect(fs.existsSync(targetPath)).toBe(false);
  });

  it("updates sync state after successful write", async () => {
    await createMaterialsGuide(
      platformDir,
      "module-01",
      "guide-setup.md",
      `---
title: Setup Guide
---

# Setup`
    );

    await executeGuideSync(config, {});

    // Verify sync state was updated
    const state = await loadSyncState(platformDir);
    expect(state.records["guides/setup"]).toBeDefined();
    expect(state.records["guides/setup"].syncedAt).toBeDefined();
  });

  it("handles multiple guides correctly", async () => {
    await createMaterialsGuide(
      platformDir,
      "module-01",
      "guide-setup.md",
      `---
title: Setup Guide
---

# Guide 1`
    );

    await createMaterialsGuide(
      platformDir,
      "module-02",
      "guide-resources.md",
      `---
title: Resources Guide
---

# Guide 2`
    );

    const result = await executeGuideSync(config, {});

    expect(result.success).toBe(true);
    expect(result.created).toHaveLength(2);
    expect(result.summary.created).toBe(2);
    expect(result.summary.total).toBe(2);
  });

  it("returns empty result when no guides found", async () => {
    // No materials directory created
    const result = await executeGuideSync(config, {});

    expect(result.success).toBe(true);
    expect(result.summary.total).toBe(0);
  });
});
