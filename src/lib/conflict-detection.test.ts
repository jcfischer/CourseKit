/**
 * Conflict Detection Tests (F-8)
 * Tests for conflict detection and classification.
 */

import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  detectConflicts,
  classifyConflict,
} from "./conflict-detection";
import { saveSyncState, SYNC_STATE_VERSION } from "./sync-state";
import { hashContent } from "./platform-utils";
import type { CourseKitConfig, SyncState, SyncRecord, PlatformLesson } from "../types";

const FIXTURES_ROOT = path.join(import.meta.dir, "../../test-fixtures/conflict-detection");

// Helper to create config for test scenarios
function createConfig(scenarioDir: string): CourseKitConfig {
  return {
    platform: {
      path: path.join(scenarioDir, "platform"),
    },
    courses: {
      "astro-course": {
        slug: "astro-course",
        sourceDir: path.join(scenarioDir, "source/courses/astro-course"),
      },
    },
  };
}

// Helper to create a sync record
function createSyncRecord(filePath: string, contentHash: string): SyncRecord {
  return {
    filePath,
    contentHash,
    syncedAt: "2026-01-28T10:00:00Z",
    sourceRepo: "courses/astro-course",
  };
}

// Helper to create a platform lesson
function createPlatformLesson(
  courseId: string,
  slug: string,
  contentHash: string
): PlatformLesson {
  return {
    path: `/platform/src/content/lessons/${courseId}/${slug}.md`,
    relativePath: `${courseId}/${slug}.md`,
    courseId,
    slug,
    frontmatter: { title: slug },
    platformFields: {},
    contentHash,
  };
}

describe("classifyConflict", () => {
  it("returns null when hashes match (no conflict)", () => {
    const syncRecord = createSyncRecord("astro-course/01-intro.md", "hash123");
    const platformFile = createPlatformLesson("astro-course", "intro", "hash123");

    const result = classifyConflict("astro-course/intro", syncRecord, platformFile);

    expect(result).toBeNull();
  });

  it("returns modified conflict when hashes differ", () => {
    const syncRecord = createSyncRecord("astro-course/01-intro.md", "oldhash");
    const platformFile = createPlatformLesson("astro-course", "intro", "newhash");

    const result = classifyConflict("astro-course/intro", syncRecord, platformFile);

    expect(result).not.toBeNull();
    expect(result?.conflictType).toBe("modified");
    expect(result?.expectedHash).toBe("oldhash");
    expect(result?.currentHash).toBe("newhash");
  });

  it("returns deleted conflict when platform file is null", () => {
    const syncRecord = createSyncRecord("astro-course/01-intro.md", "hash123");

    const result = classifyConflict("astro-course/intro", syncRecord, null);

    expect(result).not.toBeNull();
    expect(result?.conflictType).toBe("deleted");
    expect(result?.changeSummary).toContain("deleted");
  });

  it("returns new_on_platform conflict when sync record is null", () => {
    const platformFile = createPlatformLesson("astro-course", "intro", "hash123");

    const result = classifyConflict("astro-course/intro", null, platformFile);

    expect(result).not.toBeNull();
    expect(result?.conflictType).toBe("new_on_platform");
    expect(result?.changeSummary).toContain("platform");
  });

  it("returns null when both are null", () => {
    const result = classifyConflict("astro-course/intro", null, null);
    expect(result).toBeNull();
  });
});

describe("detectConflicts", () => {
  beforeEach(() => {
    // Ensure test fixtures directory exists
    if (!fs.existsSync(FIXTURES_ROOT)) {
      fs.mkdirSync(FIXTURES_ROOT, { recursive: true });
    }
  });

  describe("Scenario: No sync state file", () => {
    const scenarioDir = path.join(FIXTURES_ROOT, "no-sync-state");

    beforeEach(async () => {
      // Create platform with a lesson
      const platformDir = path.join(scenarioDir, "platform/src/content/lessons/astro-course");
      fs.mkdirSync(platformDir, { recursive: true });
      fs.writeFileSync(
        path.join(platformDir, "01-intro.md"),
        "---\ntitle: Intro\n---\n\n# Introduction\n"
      );
    });

    afterEach(() => {
      if (fs.existsSync(scenarioDir)) {
        fs.rmSync(scenarioDir, { recursive: true });
      }
    });

    it("treats all platform files as conflicts (new_on_platform)", async () => {
      const config = createConfig(scenarioDir);
      const result = await detectConflicts(config);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].conflictType).toBe("new_on_platform");
    });
  });

  describe("Scenario: Platform hash matches sync state", () => {
    const scenarioDir = path.join(FIXTURES_ROOT, "no-conflicts");

    beforeEach(async () => {
      // Create platform with a lesson
      const platformDir = path.join(scenarioDir, "platform/src/content/lessons/astro-course");
      fs.mkdirSync(platformDir, { recursive: true });
      const content = "---\ntitle: Intro\n---\n\n# Introduction\n";
      fs.writeFileSync(path.join(platformDir, "01-intro.md"), content);

      // Create sync state with matching hash
      const bodyContent = "# Introduction";
      const hash = hashContent(bodyContent);
      const syncState: SyncState = {
        version: SYNC_STATE_VERSION,
        records: {
          "astro-course/intro": {
            filePath: "astro-course/01-intro.md",
            contentHash: hash,
            syncedAt: "2026-01-28T10:00:00Z",
            sourceRepo: "courses/astro-course",
          },
        },
        lastSync: "2026-01-28T10:00:00Z",
      };
      await saveSyncState(path.join(scenarioDir, "platform"), syncState);
    });

    afterEach(() => {
      if (fs.existsSync(scenarioDir)) {
        fs.rmSync(scenarioDir, { recursive: true });
      }
    });

    it("detects no conflicts when hashes match", async () => {
      const config = createConfig(scenarioDir);
      const result = await detectConflicts(config);

      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toEqual([]);
    });
  });

  describe("Scenario: Platform hash differs from sync state", () => {
    const scenarioDir = path.join(FIXTURES_ROOT, "modified");

    beforeEach(async () => {
      // Create platform with a lesson
      const platformDir = path.join(scenarioDir, "platform/src/content/lessons/astro-course");
      fs.mkdirSync(platformDir, { recursive: true });
      fs.writeFileSync(
        path.join(platformDir, "01-intro.md"),
        "---\ntitle: Intro\n---\n\n# Introduction MODIFIED\n"
      );

      // Create sync state with different hash
      const syncState: SyncState = {
        version: SYNC_STATE_VERSION,
        records: {
          "astro-course/intro": {
            filePath: "astro-course/01-intro.md",
            contentHash: "oldhash-does-not-match",
            syncedAt: "2026-01-28T10:00:00Z",
            sourceRepo: "courses/astro-course",
          },
        },
        lastSync: "2026-01-28T10:00:00Z",
      };
      await saveSyncState(path.join(scenarioDir, "platform"), syncState);
    });

    afterEach(() => {
      if (fs.existsSync(scenarioDir)) {
        fs.rmSync(scenarioDir, { recursive: true });
      }
    });

    it("detects modified conflict when hashes differ", async () => {
      const config = createConfig(scenarioDir);
      const result = await detectConflicts(config);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].conflictType).toBe("modified");
      expect(result.conflicts[0].key).toBe("astro-course/intro");
    });
  });

  describe("Scenario: Platform file deleted but in sync state", () => {
    const scenarioDir = path.join(FIXTURES_ROOT, "deleted");

    beforeEach(async () => {
      // Create empty platform directory
      const platformDir = path.join(scenarioDir, "platform/src/content/lessons/astro-course");
      fs.mkdirSync(platformDir, { recursive: true });

      // Create sync state with record for deleted file
      const syncState: SyncState = {
        version: SYNC_STATE_VERSION,
        records: {
          "astro-course/intro": {
            filePath: "astro-course/01-intro.md",
            contentHash: "somehash",
            syncedAt: "2026-01-28T10:00:00Z",
            sourceRepo: "courses/astro-course",
          },
        },
        lastSync: "2026-01-28T10:00:00Z",
      };
      await saveSyncState(path.join(scenarioDir, "platform"), syncState);
    });

    afterEach(() => {
      if (fs.existsSync(scenarioDir)) {
        fs.rmSync(scenarioDir, { recursive: true });
      }
    });

    it("detects deleted conflict when file is missing from platform", async () => {
      const config = createConfig(scenarioDir);
      const result = await detectConflicts(config);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].conflictType).toBe("deleted");
    });
  });

  describe("Scenario: Multiple conflicts", () => {
    const scenarioDir = path.join(FIXTURES_ROOT, "multiple");

    beforeEach(async () => {
      // Create platform with modified files
      const platformDir = path.join(scenarioDir, "platform/src/content/lessons/astro-course");
      fs.mkdirSync(platformDir, { recursive: true });
      fs.writeFileSync(
        path.join(platformDir, "01-intro.md"),
        "---\ntitle: Intro\n---\n\n# Modified\n"
      );
      fs.writeFileSync(
        path.join(platformDir, "03-new.md"),
        "---\ntitle: New\n---\n\n# New on platform\n"
      );

      // Create sync state
      const syncState: SyncState = {
        version: SYNC_STATE_VERSION,
        records: {
          "astro-course/intro": {
            filePath: "astro-course/01-intro.md",
            contentHash: "oldhash",
            syncedAt: "2026-01-28T10:00:00Z",
            sourceRepo: "courses/astro-course",
          },
          "astro-course/setup": {
            filePath: "astro-course/02-setup.md",
            contentHash: "setuphash",
            syncedAt: "2026-01-28T10:00:00Z",
            sourceRepo: "courses/astro-course",
          },
        },
        lastSync: "2026-01-28T10:00:00Z",
      };
      await saveSyncState(path.join(scenarioDir, "platform"), syncState);
    });

    afterEach(() => {
      if (fs.existsSync(scenarioDir)) {
        fs.rmSync(scenarioDir, { recursive: true });
      }
    });

    it("detects all conflicts", async () => {
      const config = createConfig(scenarioDir);
      const result = await detectConflicts(config);

      expect(result.hasConflicts).toBe(true);
      // intro: modified, setup: deleted, new: new_on_platform
      expect(result.conflicts.length).toBe(3);

      const types = result.conflicts.map(c => c.conflictType).sort();
      expect(types).toContain("modified");
      expect(types).toContain("deleted");
      expect(types).toContain("new_on_platform");
    });
  });

  describe("Scenario: Empty platform and sync state", () => {
    const scenarioDir = path.join(FIXTURES_ROOT, "empty");

    beforeEach(async () => {
      // Create empty platform
      fs.mkdirSync(path.join(scenarioDir, "platform/src/content/lessons"), { recursive: true });

      // Create empty sync state
      const syncState: SyncState = {
        version: SYNC_STATE_VERSION,
        records: {},
        lastSync: "2026-01-28T10:00:00Z",
      };
      await saveSyncState(path.join(scenarioDir, "platform"), syncState);
    });

    afterEach(() => {
      if (fs.existsSync(scenarioDir)) {
        fs.rmSync(scenarioDir, { recursive: true });
      }
    });

    it("detects no conflicts", async () => {
      const config = createConfig(scenarioDir);
      const result = await detectConflicts(config);

      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toEqual([]);
      expect(result.totalChecked).toBe(0);
    });
  });
});
