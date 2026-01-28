/**
 * Lesson Sync Execution (F-9)
 *
 * Execute one-way sync of lessons from source repositories to platform.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type {
  CourseKitConfig,
  SyncOptions,
  SyncResult,
  SyncSummary,
  SyncError,
} from "../types";
import { calculateLessonDiff } from "./diff";
import { detectConflicts } from "./conflict-detection";
import {
  loadSyncState,
  saveSyncState,
  updateSyncRecord,
} from "./sync-state";
import { hashContent } from "./platform-utils";
import { normalizeContent } from "./diff-utils";

// =============================================================================
// Path Utilities
// =============================================================================

/**
 * Build the target path for a lesson on the platform.
 *
 * @param platformRoot - Platform root directory
 * @param courseId - Course identifier
 * @param filename - Original filename (e.g., "01-intro.md")
 * @returns Full path to target file
 */
export function buildTargetPath(
  platformRoot: string,
  courseId: string,
  filename: string
): string {
  return path.join(platformRoot, "src/content/lessons", courseId, filename);
}

// =============================================================================
// File Writing
// =============================================================================

/**
 * Result of a file write operation.
 */
export interface WriteResult {
  /** Whether the write succeeded */
  success: boolean;
  /** Error if write failed */
  error?: Error;
}

/**
 * Write a lesson file from source to target location.
 * Creates parent directories if needed.
 *
 * @param sourcePath - Path to source file
 * @param targetPath - Path to target file
 * @returns WriteResult indicating success or failure
 */
export async function writeLessonFile(
  sourcePath: string,
  targetPath: string
): Promise<WriteResult> {
  try {
    // Read source file
    const content = await Bun.file(sourcePath).text();

    // Create parent directory if needed
    const targetDir = path.dirname(targetPath);
    await fs.promises.mkdir(targetDir, { recursive: true });

    // Write to target
    await Bun.write(targetPath, content);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

// =============================================================================
// Core Sync Execution
// =============================================================================

/**
 * Execute lesson sync from source to platform.
 *
 * @param config - CourseKit configuration
 * @param options - Sync options (dryRun, force, courseId, slug)
 * @returns SyncResult with details of what was synced
 */
export async function executeLessonSync(
  config: CourseKitConfig,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const platformRoot = config.platform.path;
  const dryRun = options.dryRun ?? false;
  const force = options.force ?? false;

  // Initialize result tracking
  const created: string[] = [];
  const updated: string[] = [];
  const unchanged: string[] = [];
  const skipped: string[] = [];
  const errors: SyncError[] = [];

  // Calculate diff to know what needs syncing
  const diff = await calculateLessonDiff(config, {
    courseId: options.courseId,
    includeUnchanged: true,
  });

  // Check for conflicts (unless force mode)
  let conflictKeys: Set<string> = new Set();
  if (!force) {
    const conflicts = await detectConflicts(config, {
      courseId: options.courseId,
    });
    conflictKeys = new Set(conflicts.conflicts.map((c) => c.key));
  }

  // Load sync state for updates
  const syncState = await loadSyncState(platformRoot);

  // Process each diff item
  for (const item of diff.items) {
    // Filter by slug if specified
    if (options.slug && item.slug !== options.slug) {
      continue;
    }

    // Handle based on diff status
    if (item.status === "unchanged") {
      unchanged.push(item.key);
      continue;
    }

    if (item.status === "removed") {
      // Source was removed - skip (don't delete platform files)
      continue;
    }

    // Check for conflicts
    if (conflictKeys.has(item.key)) {
      skipped.push(item.key);
      continue;
    }

    // Determine if creating or updating
    const isCreate = item.status === "added";

    // Skip actual write in dry-run mode
    if (dryRun) {
      if (isCreate) {
        created.push(item.key);
      } else {
        updated.push(item.key);
      }
      continue;
    }

    // Perform the write
    if (!item.sourcePath) {
      errors.push({
        key: item.key,
        error: new Error("Missing source path"),
        message: `No source path for ${item.key}`,
      });
      continue;
    }

    const filename = path.basename(item.sourcePath);
    const targetPath = buildTargetPath(platformRoot, item.courseId, filename);

    const writeResult = await writeLessonFile(item.sourcePath, targetPath);

    if (!writeResult.success) {
      errors.push({
        key: item.key,
        error: writeResult.error!,
        message: `Failed to write ${item.key}: ${writeResult.error?.message}`,
      });
      continue;
    }

    // Update sync state with new hash
    const content = await Bun.file(item.sourcePath).text();
    const bodyMatch = content.match(/^---[\s\S]*?---\s*([\s\S]*)$/);
    const body = bodyMatch ? bodyMatch[1] : content;
    const contentHash = hashContent(normalizeContent(body));

    updateSyncRecord(syncState, item.key, {
      filePath: path.relative(platformRoot, targetPath),
      contentHash,
      syncedAt: new Date().toISOString(),
      sourceRepo: item.courseId,
    });

    if (isCreate) {
      created.push(item.key);
    } else {
      updated.push(item.key);
    }
  }

  // Save sync state (unless dry-run)
  if (!dryRun && (created.length > 0 || updated.length > 0)) {
    syncState.lastSync = new Date().toISOString();
    await saveSyncState(platformRoot, syncState);
  }

  // Build summary
  const summary: SyncSummary = {
    total: created.length + updated.length + unchanged.length + skipped.length + errors.length,
    created: created.length,
    updated: updated.length,
    unchanged: unchanged.length,
    skipped: skipped.length,
    errors: errors.length,
  };

  // Determine success (no conflicts blocking sync)
  const success = skipped.length === 0 && errors.length === 0;

  return {
    success,
    created,
    updated,
    unchanged,
    skipped,
    errors,
    summary,
    dryRun,
  };
}
