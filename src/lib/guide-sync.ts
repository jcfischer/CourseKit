/**
 * Guide Sync Execution (F-10)
 *
 * Execute one-way sync of guides from materials directory to platform.
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
import { discoverGuides } from "./guide-discovery";
import {
  loadSyncState,
  saveSyncState,
  updateSyncRecord,
  getSyncRecord,
} from "./sync-state";
import { hashContent } from "./platform-utils";
import { normalizeContent } from "./diff-utils";

// =============================================================================
// Path Utilities
// =============================================================================

/**
 * Build the target path for a guide on the platform.
 *
 * @param platformRoot - Platform root directory
 * @param slug - Guide slug
 * @returns Full path to target file
 */
export function buildGuideTargetPath(platformRoot: string, slug: string): string {
  return path.join(platformRoot, "src/content/guides", `${slug}.md`);
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
 * Write a guide file from source to target location.
 * Creates parent directories if needed.
 *
 * @param sourcePath - Path to source file
 * @param targetPath - Path to target file
 * @returns WriteResult indicating success or failure
 */
export async function writeGuideFile(
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
// Hash Utilities
// =============================================================================

/**
 * Calculate content hash for a guide file.
 *
 * @param content - Full file content including frontmatter
 * @returns Hash of body content (excluding frontmatter)
 */
function calculateGuideHash(content: string): string {
  const bodyMatch = content.match(/^---[\s\S]*?---\s*([\s\S]*)$/);
  const body = bodyMatch ? bodyMatch[1] : content;
  return hashContent(normalizeContent(body));
}

/**
 * Read content and calculate hash from a file path.
 *
 * @param filePath - Path to file
 * @returns Content hash
 */
async function getFileHash(filePath: string): Promise<string> {
  const content = await Bun.file(filePath).text();
  return calculateGuideHash(content);
}

// =============================================================================
// Core Sync Execution
// =============================================================================

/**
 * Execute guide sync from materials to platform.
 *
 * @param config - CourseKit configuration
 * @param options - Sync options (dryRun, force)
 * @returns SyncResult with details of what was synced
 */
export async function executeGuideSync(
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

  // Discover source guides
  const manifest = await discoverGuides(config);

  // Return early if no guides found
  if (manifest.guides.length === 0) {
    return {
      success: true,
      created,
      updated,
      unchanged,
      skipped,
      errors,
      summary: {
        total: 0,
        created: 0,
        updated: 0,
        unchanged: 0,
        skipped: 0,
        errors: 0,
      },
      dryRun,
    };
  }

  // Load sync state
  const syncState = await loadSyncState(platformRoot);

  // Process each guide
  for (const guide of manifest.guides) {
    const key = `guides/${guide.slug}`;
    const targetPath = buildGuideTargetPath(platformRoot, guide.slug);

    // Calculate source hash
    const sourceContent = await Bun.file(guide.path).text();
    const sourceHash = calculateGuideHash(sourceContent);

    // Check if target exists
    const targetExists = fs.existsSync(targetPath);

    // Get sync record
    const syncRecord = getSyncRecord(syncState, key);

    // Determine action
    let action: "create" | "update" | "unchanged" | "skip";

    if (!targetExists) {
      // New file - create
      action = "create";
    } else if (!syncRecord) {
      // File exists but no sync record - treat as conflict
      if (force) {
        action = "update";
      } else {
        action = "skip";
      }
    } else {
      // Check if platform was modified
      const currentPlatformHash = await getFileHash(targetPath);

      if (currentPlatformHash !== syncRecord.contentHash) {
        // Platform was modified - conflict
        if (force) {
          action = "update";
        } else {
          action = "skip";
        }
      } else if (sourceHash === syncRecord.contentHash) {
        // Source unchanged since last sync
        action = "unchanged";
      } else {
        // Source changed, platform unchanged - safe to update
        action = "update";
      }
    }

    // Execute action
    switch (action) {
      case "unchanged":
        unchanged.push(key);
        break;

      case "skip":
        skipped.push(key);
        break;

      case "create":
      case "update":
        if (dryRun) {
          if (action === "create") {
            created.push(key);
          } else {
            updated.push(key);
          }
        } else {
          const writeResult = await writeGuideFile(guide.path, targetPath);

          if (!writeResult.success) {
            errors.push({
              key,
              error: writeResult.error!,
              message: `Failed to write ${key}: ${writeResult.error?.message}`,
            });
          } else {
            // Update sync state
            updateSyncRecord(syncState, key, {
              filePath: path.relative(platformRoot, targetPath),
              contentHash: sourceHash,
              syncedAt: new Date().toISOString(),
              sourceRepo: "materials",
            });

            if (action === "create") {
              created.push(key);
            } else {
              updated.push(key);
            }
          }
        }
        break;
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

  // Determine success
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
