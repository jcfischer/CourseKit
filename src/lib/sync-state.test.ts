/**
 * Sync State Tests (F-8)
 * Tests for sync state persistence and utilities.
 */

import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  loadSyncState,
  saveSyncState,
  initializeSyncState,
  updateSyncRecord,
  getSyncRecord,
  deleteSyncRecord,
  getAllSyncRecords,
  getSyncStateFilePath,
  SYNC_STATE_VERSION,
} from "./sync-state";
import type { SyncState, SyncRecord } from "../types";

const TEST_DIR = path.join(import.meta.dir, "../../test-fixtures/sync-state-test");

// Helper to create a test sync state
function createTestSyncState(): SyncState {
  return {
    version: SYNC_STATE_VERSION,
    records: {
      "astro-course/intro": {
        filePath: "astro-course/01-intro.md",
        contentHash: "abc123",
        syncedAt: "2026-01-28T10:00:00Z",
        sourceRepo: "courses/astro-course",
      },
      "astro-course/setup": {
        filePath: "astro-course/02-setup.md",
        contentHash: "def456",
        syncedAt: "2026-01-28T10:00:00Z",
        sourceRepo: "courses/astro-course",
      },
    },
    lastSync: "2026-01-28T10:00:00Z",
  };
}

describe("Sync State Persistence", () => {
  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe("getSyncStateFilePath", () => {
    it("returns correct path for platform root", () => {
      const result = getSyncStateFilePath("/path/to/platform");
      expect(result).toBe("/path/to/platform/.coursekit-sync.json");
    });
  });

  describe("initializeSyncState", () => {
    it("creates empty state with correct version", () => {
      const state = initializeSyncState();
      expect(state.version).toBe(SYNC_STATE_VERSION);
      expect(state.records).toEqual({});
      expect(state.lastSync).toBeNull();
    });
  });

  describe("loadSyncState", () => {
    it("returns empty state when file does not exist", async () => {
      const state = await loadSyncState(TEST_DIR);
      expect(state.version).toBe(SYNC_STATE_VERSION);
      expect(state.records).toEqual({});
      expect(state.lastSync).toBeNull();
    });

    it("loads valid state file correctly", async () => {
      const testState = createTestSyncState();
      const filePath = getSyncStateFilePath(TEST_DIR);
      fs.writeFileSync(filePath, JSON.stringify(testState, null, 2));

      const state = await loadSyncState(TEST_DIR);
      expect(state.version).toBe(SYNC_STATE_VERSION);
      expect(state.records["astro-course/intro"]).toBeDefined();
      expect(state.records["astro-course/intro"].contentHash).toBe("abc123");
    });

    it("throws error for invalid JSON", async () => {
      const filePath = getSyncStateFilePath(TEST_DIR);
      fs.writeFileSync(filePath, "{ invalid json");

      await expect(loadSyncState(TEST_DIR)).rejects.toThrow();
    });

    it("throws error for unsupported version", async () => {
      const testState = createTestSyncState();
      testState.version = 999;
      const filePath = getSyncStateFilePath(TEST_DIR);
      fs.writeFileSync(filePath, JSON.stringify(testState));

      await expect(loadSyncState(TEST_DIR)).rejects.toThrow(/unsupported.*version/i);
    });
  });

  describe("saveSyncState", () => {
    it("writes valid JSON to file", async () => {
      const testState = createTestSyncState();
      await saveSyncState(TEST_DIR, testState);

      const filePath = getSyncStateFilePath(TEST_DIR);
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(content);
      expect(parsed.version).toBe(SYNC_STATE_VERSION);
      expect(parsed.records["astro-course/intro"]).toBeDefined();
    });

    it("creates parent directory if missing", async () => {
      const nestedDir = path.join(TEST_DIR, "nested", "platform");
      const testState = createTestSyncState();
      await saveSyncState(nestedDir, testState);

      const filePath = getSyncStateFilePath(nestedDir);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it("overwrites existing file", async () => {
      const state1 = createTestSyncState();
      await saveSyncState(TEST_DIR, state1);

      const state2 = initializeSyncState();
      state2.lastSync = "2026-01-29T00:00:00Z";
      await saveSyncState(TEST_DIR, state2);

      const loaded = await loadSyncState(TEST_DIR);
      expect(loaded.lastSync).toBe("2026-01-29T00:00:00Z");
      expect(Object.keys(loaded.records)).toHaveLength(0);
    });
  });

  describe("updateSyncRecord", () => {
    it("adds new record to state", () => {
      const state = initializeSyncState();
      const record: SyncRecord = {
        filePath: "course/lesson.md",
        contentHash: "hash123",
        syncedAt: "2026-01-28T12:00:00Z",
        sourceRepo: "courses/course",
      };

      updateSyncRecord(state, "course/lesson", record);

      expect(state.records["course/lesson"]).toEqual(record);
    });

    it("updates existing record", () => {
      const state = createTestSyncState();
      const newRecord: SyncRecord = {
        filePath: "astro-course/01-intro.md",
        contentHash: "newhash",
        syncedAt: "2026-01-29T00:00:00Z",
        sourceRepo: "courses/astro-course",
      };

      updateSyncRecord(state, "astro-course/intro", newRecord);

      expect(state.records["astro-course/intro"].contentHash).toBe("newhash");
    });

    it("preserves other records", () => {
      const state = createTestSyncState();
      const newRecord: SyncRecord = {
        filePath: "new/file.md",
        contentHash: "hash",
        syncedAt: "2026-01-28T12:00:00Z",
        sourceRepo: "courses/new",
      };

      updateSyncRecord(state, "new/file", newRecord);

      expect(state.records["astro-course/intro"]).toBeDefined();
      expect(state.records["astro-course/setup"]).toBeDefined();
      expect(state.records["new/file"]).toBeDefined();
    });
  });
});

describe("Sync State Utilities", () => {
  describe("getSyncRecord", () => {
    it("returns existing record", () => {
      const state = createTestSyncState();
      const record = getSyncRecord(state, "astro-course/intro");
      expect(record).toBeDefined();
      expect(record?.contentHash).toBe("abc123");
    });

    it("returns undefined for non-existent record", () => {
      const state = createTestSyncState();
      const record = getSyncRecord(state, "nonexistent/key");
      expect(record).toBeUndefined();
    });
  });

  describe("deleteSyncRecord", () => {
    it("removes existing record", () => {
      const state = createTestSyncState();
      deleteSyncRecord(state, "astro-course/intro");
      expect(state.records["astro-course/intro"]).toBeUndefined();
    });

    it("does nothing for non-existent record", () => {
      const state = createTestSyncState();
      const initialCount = Object.keys(state.records).length;
      deleteSyncRecord(state, "nonexistent/key");
      expect(Object.keys(state.records).length).toBe(initialCount);
    });

    it("preserves other records", () => {
      const state = createTestSyncState();
      deleteSyncRecord(state, "astro-course/intro");
      expect(state.records["astro-course/setup"]).toBeDefined();
    });
  });

  describe("getAllSyncRecords", () => {
    it("returns empty array for empty state", () => {
      const state = initializeSyncState();
      const records = getAllSyncRecords(state);
      expect(records).toEqual([]);
    });

    it("returns all records as array", () => {
      const state = createTestSyncState();
      const records = getAllSyncRecords(state);
      expect(records).toHaveLength(2);
      expect(records.map(r => r.contentHash).sort()).toEqual(["abc123", "def456"]);
    });
  });
});
