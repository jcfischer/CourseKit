/**
 * Sync Display Tests (F-9)
 * Tests for sync result display utilities.
 */

import { describe, expect, it, beforeEach, afterEach, spyOn } from "bun:test";
import {
  formatSyncSummary,
  displaySyncResult,
  displaySyncPreview,
} from "./sync-display";
import type { SyncResult } from "../types";

// Helper to create a sync result
function createSyncResult(overrides: Partial<SyncResult> = {}): SyncResult {
  return {
    success: true,
    created: [],
    updated: [],
    unchanged: [],
    skipped: [],
    errors: [],
    summary: {
      total: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      skipped: 0,
      errors: 0,
    },
    dryRun: false,
    ...overrides,
  };
}

describe("formatSyncSummary", () => {
  it("formats empty summary", () => {
    const result = createSyncResult();
    const summary = formatSyncSummary(result.summary);

    expect(summary).toContain("0 files");
  });

  it("formats summary with creates", () => {
    const result = createSyncResult({
      created: ["a/intro", "a/setup"],
      summary: { total: 2, created: 2, updated: 0, unchanged: 0, skipped: 0, errors: 0 },
    });
    const summary = formatSyncSummary(result.summary);

    expect(summary).toContain("2 created");
  });

  it("formats summary with updates", () => {
    const result = createSyncResult({
      updated: ["a/intro"],
      summary: { total: 1, created: 0, updated: 1, unchanged: 0, skipped: 0, errors: 0 },
    });
    const summary = formatSyncSummary(result.summary);

    expect(summary).toContain("1 updated");
  });

  it("formats summary with skipped (conflicts)", () => {
    const result = createSyncResult({
      skipped: ["a/intro"],
      summary: { total: 1, created: 0, updated: 0, unchanged: 0, skipped: 1, errors: 0 },
    });
    const summary = formatSyncSummary(result.summary);

    expect(summary).toContain("1 skipped");
  });

  it("formats summary with errors", () => {
    const result = createSyncResult({
      errors: [{ key: "a/intro", error: new Error("fail"), message: "fail" }],
      summary: { total: 1, created: 0, updated: 0, unchanged: 0, skipped: 0, errors: 1 },
    });
    const summary = formatSyncSummary(result.summary);

    expect(summary).toContain("1 error");
  });

  it("formats mixed summary", () => {
    const result = createSyncResult({
      summary: { total: 10, created: 3, updated: 2, unchanged: 4, skipped: 1, errors: 0 },
    });
    const summary = formatSyncSummary(result.summary);

    expect(summary).toContain("3 created");
    expect(summary).toContain("2 updated");
    expect(summary).toContain("4 unchanged");
    expect(summary).toContain("1 skipped");
  });
});

describe("displaySyncResult", () => {
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

  it("displays success message when no changes", () => {
    const result = createSyncResult({
      unchanged: ["a/intro"],
      summary: { total: 1, created: 0, updated: 0, unchanged: 1, skipped: 0, errors: 0 },
    });

    displaySyncResult(result);

    const fullOutput = output.join("\n");
    expect(fullOutput).toContain("Sync complete");
    expect(fullOutput).toContain("1 unchanged");
  });

  it("displays created files", () => {
    const result = createSyncResult({
      created: ["astro-course/intro", "astro-course/setup"],
      summary: { total: 2, created: 2, updated: 0, unchanged: 0, skipped: 0, errors: 0 },
    });

    displaySyncResult(result);

    const fullOutput = output.join("\n");
    expect(fullOutput).toContain("Created:");
    expect(fullOutput).toContain("astro-course/intro");
    expect(fullOutput).toContain("astro-course/setup");
  });

  it("displays updated files", () => {
    const result = createSyncResult({
      updated: ["astro-course/intro"],
      summary: { total: 1, created: 0, updated: 1, unchanged: 0, skipped: 0, errors: 0 },
    });

    displaySyncResult(result);

    const fullOutput = output.join("\n");
    expect(fullOutput).toContain("Updated:");
    expect(fullOutput).toContain("astro-course/intro");
  });

  it("displays skipped files with warning", () => {
    const result = createSyncResult({
      success: false,
      skipped: ["astro-course/intro"],
      summary: { total: 1, created: 0, updated: 0, unchanged: 0, skipped: 1, errors: 0 },
    });

    displaySyncResult(result);

    const fullOutput = output.join("\n");
    expect(fullOutput).toContain("Skipped (conflicts):");
    expect(fullOutput).toContain("astro-course/intro");
    expect(fullOutput).toContain("--force");
  });

  it("displays errors", () => {
    const result = createSyncResult({
      success: false,
      errors: [{ key: "astro-course/intro", error: new Error("fail"), message: "Write failed" }],
      summary: { total: 1, created: 0, updated: 0, unchanged: 0, skipped: 0, errors: 1 },
    });

    displaySyncResult(result);

    const fullOutput = output.join("\n");
    expect(fullOutput).toContain("Errors:");
    expect(fullOutput).toContain("astro-course/intro");
    expect(fullOutput).toContain("Write failed");
  });
});

describe("displaySyncPreview", () => {
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

  it("displays dry-run header", () => {
    const result = createSyncResult({
      dryRun: true,
      created: ["a/intro"],
      summary: { total: 1, created: 1, updated: 0, unchanged: 0, skipped: 0, errors: 0 },
    });

    displaySyncPreview(result);

    const fullOutput = output.join("\n");
    expect(fullOutput).toContain("DRY RUN");
    expect(fullOutput).toContain("No files were written");
  });

  it("shows what would be created", () => {
    const result = createSyncResult({
      dryRun: true,
      created: ["astro-course/intro"],
      summary: { total: 1, created: 1, updated: 0, unchanged: 0, skipped: 0, errors: 0 },
    });

    displaySyncPreview(result);

    const fullOutput = output.join("\n");
    expect(fullOutput).toContain("Would create:");
    expect(fullOutput).toContain("astro-course/intro");
  });

  it("shows what would be updated", () => {
    const result = createSyncResult({
      dryRun: true,
      updated: ["astro-course/intro"],
      summary: { total: 1, created: 0, updated: 1, unchanged: 0, skipped: 0, errors: 0 },
    });

    displaySyncPreview(result);

    const fullOutput = output.join("\n");
    expect(fullOutput).toContain("Would update:");
    expect(fullOutput).toContain("astro-course/intro");
  });

  it("shows unchanged files", () => {
    const result = createSyncResult({
      dryRun: true,
      unchanged: ["astro-course/intro"],
      summary: { total: 1, created: 0, updated: 0, unchanged: 1, skipped: 0, errors: 0 },
    });

    displaySyncPreview(result);

    const fullOutput = output.join("\n");
    expect(fullOutput).toContain("Unchanged:");
  });
});
