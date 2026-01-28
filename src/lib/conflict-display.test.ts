/**
 * Conflict Display Tests (F-8)
 * Tests for conflict display utilities.
 */

import { describe, expect, it, beforeEach, afterEach, spyOn } from "bun:test";
import {
  formatConflictSummary,
  displayConflicts,
  displayConflictStatus,
} from "./conflict-display";
import type { ConflictDetectionResult, ConflictItem } from "../types";

// Helper to create a conflict item
function createConflict(
  key: string,
  type: "modified" | "deleted" | "new_on_platform",
  platformPath?: string
): ConflictItem {
  return {
    key,
    platformPath,
    expectedHash: type !== "new_on_platform" ? "oldhash" : undefined,
    currentHash: type !== "deleted" ? "newhash" : undefined,
    lastSyncedAt: type !== "new_on_platform" ? "2026-01-28T10:00:00Z" : undefined,
    conflictType: type,
    changeSummary: `File was ${type}`,
  };
}

describe("formatConflictSummary", () => {
  it("formats modified conflict", () => {
    const conflict = createConflict(
      "astro-course/intro",
      "modified",
      "/path/to/platform/file.md"
    );
    const result = formatConflictSummary(conflict);

    expect(result).toContain("astro-course/intro");
    expect(result).toContain("/path/to/platform/file.md");
    expect(result).toContain("modified on platform");
    expect(result).toContain("Last synced:");
  });

  it("formats deleted conflict", () => {
    const conflict = createConflict("astro-course/intro", "deleted");
    const result = formatConflictSummary(conflict);

    expect(result).toContain("astro-course/intro");
    expect(result).toContain("deleted from platform");
    expect(result).toContain("Last synced:");
  });

  it("formats new_on_platform conflict", () => {
    const conflict = createConflict(
      "astro-course/intro",
      "new_on_platform",
      "/path/to/platform/file.md"
    );
    const result = formatConflictSummary(conflict);

    expect(result).toContain("astro-course/intro");
    expect(result).toContain("new on platform");
    expect(result).not.toContain("Last synced:");
  });

  it("includes platform path when present", () => {
    const conflict = createConflict(
      "astro-course/intro",
      "modified",
      "/custom/path.md"
    );
    const result = formatConflictSummary(conflict);

    expect(result).toContain("Platform: /custom/path.md");
  });
});

describe("displayConflicts", () => {
  let logSpy: ReturnType<typeof spyOn>;
  let output: string[];

  beforeEach(() => {
    output = [];
    logSpy = spyOn(console, "log").mockImplementation((msg?: unknown) => {
      if (msg !== undefined) output.push(String(msg));
    });
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("displays message when no conflicts", () => {
    const result: ConflictDetectionResult = {
      hasConflicts: false,
      conflicts: [],
      totalChecked: 5,
    };

    displayConflicts(result);

    expect(output.join("\n")).toContain("No conflicts detected");
  });

  it("displays single conflict", () => {
    const result: ConflictDetectionResult = {
      hasConflicts: true,
      conflicts: [createConflict("astro-course/intro", "modified", "/path/file.md")],
      totalChecked: 5,
    };

    displayConflicts(result);

    const fullOutput = output.join("\n");
    expect(fullOutput).toContain("Conflicts detected (1 file)");
    expect(fullOutput).toContain("astro-course/intro");
    expect(fullOutput).toContain("--force");
  });

  it("displays multiple conflicts", () => {
    const result: ConflictDetectionResult = {
      hasConflicts: true,
      conflicts: [
        createConflict("astro-course/intro", "modified", "/path/file1.md"),
        createConflict("astro-course/setup", "deleted"),
      ],
      totalChecked: 5,
    };

    displayConflicts(result);

    const fullOutput = output.join("\n");
    expect(fullOutput).toContain("Conflicts detected (2 files)");
    expect(fullOutput).toContain("astro-course/intro");
    expect(fullOutput).toContain("astro-course/setup");
  });

  it("displays all three conflict types correctly", () => {
    const result: ConflictDetectionResult = {
      hasConflicts: true,
      conflicts: [
        createConflict("a/mod", "modified", "/path/mod.md"),
        createConflict("b/del", "deleted"),
        createConflict("c/new", "new_on_platform", "/path/new.md"),
      ],
      totalChecked: 3,
    };

    displayConflicts(result);

    const fullOutput = output.join("\n");
    expect(fullOutput).toContain("modified on platform");
    expect(fullOutput).toContain("deleted from platform");
    expect(fullOutput).toContain("new on platform");
  });
});

describe("displayConflictStatus", () => {
  let logSpy: ReturnType<typeof spyOn>;
  let output: string[];

  beforeEach(() => {
    output = [];
    logSpy = spyOn(console, "log").mockImplementation((msg?: unknown) => {
      if (msg !== undefined) output.push(String(msg));
    });
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("displays nothing when no conflicts", () => {
    const result: ConflictDetectionResult = {
      hasConflicts: false,
      conflicts: [],
      totalChecked: 5,
    };

    displayConflictStatus(result);

    expect(output).toEqual([]);
  });

  it("displays conflicts in compact format", () => {
    const result: ConflictDetectionResult = {
      hasConflicts: true,
      conflicts: [
        createConflict("astro-course/intro", "modified"),
        createConflict("astro-course/setup", "deleted"),
      ],
      totalChecked: 5,
    };

    displayConflictStatus(result);

    const fullOutput = output.join("\n");
    expect(fullOutput).toContain("Conflicts (2)");
    expect(fullOutput).toContain("astro-course/intro [modified on platform]");
    expect(fullOutput).toContain("astro-course/setup [deleted from platform]");
    expect(fullOutput).toContain("coursekit push --force");
  });
});
