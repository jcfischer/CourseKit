/**
 * Lesson Sync Execution Tests (F-9)
 * Tests for syncing lessons from source to platform.
 */

import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { executeLessonSync, writeLessonFile, buildTargetPath } from "./lesson-sync";
import { loadSyncState, saveSyncState, initializeSyncState } from "./sync-state";
import type { CourseKitConfig, SyncOptions } from "../types";

// Test fixture directory
const TEST_ROOT = path.join(process.cwd(), "test-fixtures/sync");

// Helper to create a test config
function createTestConfig(sourceDir: string, platformDir: string): CourseKitConfig {
  return {
    platform: { path: platformDir },
    courses: {
      "test-course": {
        slug: "test-course",
        sourceDir: path.join(sourceDir, "courses/test-course"),
      },
    },
  };
}

// Helper to create test fixture files
async function createSourceLesson(
  sourceDir: string,
  courseId: string,
  filename: string,
  content: string
): Promise<string> {
  const lessonDir = path.join(sourceDir, "courses", courseId, "lessons");
  await fs.promises.mkdir(lessonDir, { recursive: true });
  const filePath = path.join(lessonDir, filename);
  await Bun.write(filePath, content);
  return filePath;
}

// Helper to create platform directory structure
async function createPlatformDir(platformDir: string, courseId: string): Promise<string> {
  const lessonsDir = path.join(platformDir, "src/content/lessons", courseId);
  await fs.promises.mkdir(lessonsDir, { recursive: true });
  return lessonsDir;
}

// Helper to create platform lesson file
async function createPlatformLesson(
  platformDir: string,
  courseId: string,
  filename: string,
  content: string
): Promise<string> {
  const lessonsDir = await createPlatformDir(platformDir, courseId);
  const filePath = path.join(lessonsDir, filename);
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

describe("buildTargetPath", () => {
  it("constructs correct platform path for lesson", () => {
    const platformRoot = "/platform";
    const courseId = "astro-course";
    const filename = "01-intro.md";

    const result = buildTargetPath(platformRoot, courseId, filename);

    expect(result).toBe("/platform/src/content/lessons/astro-course/01-intro.md");
  });

  it("handles courseId with special characters", () => {
    const platformRoot = "/platform";
    const courseId = "my-course-2024";
    const filename = "02-setup.md";

    const result = buildTargetPath(platformRoot, courseId, filename);

    expect(result).toBe("/platform/src/content/lessons/my-course-2024/02-setup.md");
  });
});

describe("writeLessonFile", () => {
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
title: Test Lesson
---

# Introduction

This is the lesson content.`;

    const sourcePath = path.join(testDir, "source.md");
    const targetPath = path.join(testDir, "target/lesson.md");

    await Bun.write(sourcePath, sourceContent);

    const result = await writeLessonFile(sourcePath, targetPath);

    expect(result.success).toBe(true);
    const written = await Bun.file(targetPath).text();
    expect(written).toBe(sourceContent);
  });

  it("creates parent directories if needed", async () => {
    const sourceContent = "# Test";
    const sourcePath = path.join(testDir, "source.md");
    const targetPath = path.join(testDir, "deep/nested/dir/lesson.md");

    await Bun.write(sourcePath, sourceContent);

    const result = await writeLessonFile(sourcePath, targetPath);

    expect(result.success).toBe(true);
    expect(fs.existsSync(targetPath)).toBe(true);
  });

  it("returns error for missing source file", async () => {
    const sourcePath = path.join(testDir, "nonexistent.md");
    const targetPath = path.join(testDir, "target.md");

    const result = await writeLessonFile(sourcePath, targetPath);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("executeLessonSync", () => {
  const testDir = path.join(TEST_ROOT, "sync-test");
  let sourceDir: string;
  let platformDir: string;
  let config: CourseKitConfig;

  beforeEach(async () => {
    await cleanTestDir(testDir);
    sourceDir = path.join(testDir, "source");
    platformDir = path.join(testDir, "platform");
    await fs.promises.mkdir(sourceDir, { recursive: true });
    await fs.promises.mkdir(platformDir, { recursive: true });
    config = createTestConfig(sourceDir, platformDir);
  });

  afterEach(async () => {
    await cleanTestDir(testDir);
  });

  it("creates new lesson files when platform is empty", async () => {
    // Create source lesson
    await createSourceLesson(
      sourceDir,
      "test-course",
      "01-intro.md",
      `---
title: Introduction
---

# Introduction

Welcome to the course.`
    );

    const result = await executeLessonSync(config, {});

    expect(result.success).toBe(true);
    expect(result.created).toContain("test-course/intro");
    expect(result.summary.created).toBe(1);

    // Verify file was written
    const targetPath = path.join(
      platformDir,
      "src/content/lessons/test-course/01-intro.md"
    );
    expect(fs.existsSync(targetPath)).toBe(true);
  });

  it("skips unchanged files based on content hash", async () => {
    const content = `---
title: Introduction
---

# Introduction

Same content.`;

    // Create source and platform with identical content
    await createSourceLesson(sourceDir, "test-course", "01-intro.md", content);
    await createPlatformLesson(platformDir, "test-course", "01-intro.md", content);

    // Initialize sync state with matching hash
    const state = initializeSyncState();
    const { hashContent } = await import("./platform-utils");
    const bodyMatch = content.match(/^---[\s\S]*?---\s*([\s\S]*)$/);
    const body = bodyMatch ? bodyMatch[1] : content;
    state.records["test-course/intro"] = {
      filePath: "src/content/lessons/test-course/01-intro.md",
      contentHash: hashContent(body.trim()),
      syncedAt: new Date().toISOString(),
      sourceRepo: "test-course",
    };
    await saveSyncState(platformDir, state);

    const result = await executeLessonSync(config, {});

    expect(result.success).toBe(true);
    expect(result.unchanged).toContain("test-course/intro");
    expect(result.summary.unchanged).toBe(1);
    expect(result.summary.created).toBe(0);
    expect(result.summary.updated).toBe(0);
  });

  it("updates modified files", async () => {
    const sourceContent = `---
title: Introduction
---

# Introduction

Updated content from source.`;

    const platformContent = `---
title: Introduction
---

# Introduction

Old platform content.`;

    // Create source with updated content
    await createSourceLesson(sourceDir, "test-course", "01-intro.md", sourceContent);
    await createPlatformLesson(platformDir, "test-course", "01-intro.md", platformContent);

    // Initialize sync state with old platform hash
    const state = initializeSyncState();
    const { hashContent } = await import("./platform-utils");
    const oldBodyMatch = platformContent.match(/^---[\s\S]*?---\s*([\s\S]*)$/);
    const oldBody = oldBodyMatch ? oldBodyMatch[1] : platformContent;
    state.records["test-course/intro"] = {
      filePath: "src/content/lessons/test-course/01-intro.md",
      contentHash: hashContent(oldBody.trim()),
      syncedAt: new Date().toISOString(),
      sourceRepo: "test-course",
    };
    await saveSyncState(platformDir, state);

    const result = await executeLessonSync(config, {});

    expect(result.success).toBe(true);
    expect(result.updated).toContain("test-course/intro");
    expect(result.summary.updated).toBe(1);

    // Verify platform now has source content
    const targetPath = path.join(
      platformDir,
      "src/content/lessons/test-course/01-intro.md"
    );
    const written = await Bun.file(targetPath).text();
    expect(written).toBe(sourceContent);
  });

  it("skips files with conflicts unless force flag is set", async () => {
    const sourceContent = `---
title: Introduction
---

# Source content`;

    const platformContent = `---
title: Introduction
---

# Platform was modified manually`;

    // Create source and platform files
    await createSourceLesson(sourceDir, "test-course", "01-intro.md", sourceContent);
    await createPlatformLesson(platformDir, "test-course", "01-intro.md", platformContent);

    // Create sync state with original hash (different from current platform)
    const state = initializeSyncState();
    state.records["test-course/intro"] = {
      filePath: "src/content/lessons/test-course/01-intro.md",
      contentHash: "original-hash-that-no-longer-matches",
      syncedAt: new Date().toISOString(),
      sourceRepo: "test-course",
    };
    await saveSyncState(platformDir, state);

    const result = await executeLessonSync(config, {});

    expect(result.success).toBe(false);
    expect(result.skipped).toContain("test-course/intro");
    expect(result.summary.skipped).toBe(1);

    // Platform file should NOT have been overwritten
    const targetPath = path.join(
      platformDir,
      "src/content/lessons/test-course/01-intro.md"
    );
    const current = await Bun.file(targetPath).text();
    expect(current).toBe(platformContent);
  });

  it("overwrites conflicts when force flag is set", async () => {
    const sourceContent = `---
title: Introduction
---

# Source content`;

    const platformContent = `---
title: Introduction
---

# Platform was modified manually`;

    // Create source and platform files
    await createSourceLesson(sourceDir, "test-course", "01-intro.md", sourceContent);
    await createPlatformLesson(platformDir, "test-course", "01-intro.md", platformContent);

    // Create sync state with original hash (different from current platform)
    const state = initializeSyncState();
    state.records["test-course/intro"] = {
      filePath: "src/content/lessons/test-course/01-intro.md",
      contentHash: "original-hash-that-no-longer-matches",
      syncedAt: new Date().toISOString(),
      sourceRepo: "test-course",
    };
    await saveSyncState(platformDir, state);

    const result = await executeLessonSync(config, { force: true });

    expect(result.success).toBe(true);
    expect(result.updated).toContain("test-course/intro");
    expect(result.summary.updated).toBe(1);
    expect(result.summary.skipped).toBe(0);

    // Platform file SHOULD have been overwritten
    const targetPath = path.join(
      platformDir,
      "src/content/lessons/test-course/01-intro.md"
    );
    const current = await Bun.file(targetPath).text();
    expect(current).toBe(sourceContent);
  });

  it("does not write files in dry-run mode", async () => {
    await createSourceLesson(
      sourceDir,
      "test-course",
      "01-intro.md",
      `---
title: Introduction
---

# Introduction`
    );

    const result = await executeLessonSync(config, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.created).toContain("test-course/intro");

    // File should NOT have been written
    const targetPath = path.join(
      platformDir,
      "src/content/lessons/test-course/01-intro.md"
    );
    expect(fs.existsSync(targetPath)).toBe(false);
  });

  it("updates sync state after successful write", async () => {
    await createSourceLesson(
      sourceDir,
      "test-course",
      "01-intro.md",
      `---
title: Introduction
---

# Introduction`
    );

    await executeLessonSync(config, {});

    // Verify sync state was updated
    const state = await loadSyncState(platformDir);
    expect(state.records["test-course/intro"]).toBeDefined();
    expect(state.records["test-course/intro"].syncedAt).toBeDefined();
  });

  it("does not update sync state in dry-run mode", async () => {
    await createSourceLesson(
      sourceDir,
      "test-course",
      "01-intro.md",
      `---
title: Introduction
---

# Introduction`
    );

    await executeLessonSync(config, { dryRun: true });

    // Verify sync state was NOT updated
    const state = await loadSyncState(platformDir);
    expect(state.records["test-course/intro"]).toBeUndefined();
  });

  it("handles multiple lessons correctly", async () => {
    await createSourceLesson(
      sourceDir,
      "test-course",
      "01-intro.md",
      `---
title: Introduction
---

# Lesson 1`
    );

    await createSourceLesson(
      sourceDir,
      "test-course",
      "02-setup.md",
      `---
title: Setup
---

# Lesson 2`
    );

    const result = await executeLessonSync(config, {});

    expect(result.success).toBe(true);
    expect(result.created).toHaveLength(2);
    expect(result.summary.created).toBe(2);
    expect(result.summary.total).toBe(2);
  });

  it("filters by courseId when specified", async () => {
    // Add a second course to config
    const multiCourseConfig: CourseKitConfig = {
      ...config,
      courses: {
        ...config.courses,
        "other-course": {
          slug: "other-course",
          sourceDir: path.join(sourceDir, "courses/other-course"),
        },
      },
    };

    await createSourceLesson(
      sourceDir,
      "test-course",
      "01-intro.md",
      `---
title: Test Course Intro
---

# Test Course`
    );

    await createSourceLesson(
      sourceDir,
      "other-course",
      "01-intro.md",
      `---
title: Other Course Intro
---

# Other Course`
    );

    const result = await executeLessonSync(multiCourseConfig, { courseId: "test-course" });

    expect(result.success).toBe(true);
    expect(result.created).toContain("test-course/intro");
    expect(result.created).not.toContain("other-course/intro");
    expect(result.summary.created).toBe(1);
  });
});
