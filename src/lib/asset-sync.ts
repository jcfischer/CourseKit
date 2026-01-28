/**
 * Asset Sync Execution (F-11)
 *
 * Execute one-way sync of assets from materials directory to platform public directory.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import type {
  CourseKitConfig,
  SyncOptions,
  SyncResult,
  SyncSummary,
  SyncError,
} from "../types";
import { discoverAssets } from "./asset-discovery";
import {
  loadSyncState,
  saveSyncState,
  updateSyncRecord,
  getSyncRecord,
} from "./sync-state";

// =============================================================================
// Path Utilities
// =============================================================================

/**
 * Build the target path for an asset on the platform.
 *
 * @param platformRoot - Platform root directory
 * @param courseSlug - Course slug
 * @param relativePath - Relative path within assets (e.g., "images/hero.png")
 * @returns Full path to target file
 */
export function buildAssetTargetPath(
  platformRoot: string,
  courseSlug: string,
  relativePath: string
): string {
  return path.join(platformRoot, "public/courses", courseSlug, relativePath);
}

// =============================================================================
// Hash Utilities
// =============================================================================

/**
 * Calculate SHA-256 hash of a binary file.
 *
 * @param filePath - Path to file
 * @returns SHA-256 hash as hex string
 */
export async function calculateBinaryHash(filePath: string): Promise<string> {
  const content = await Bun.file(filePath).arrayBuffer();
  const hash = crypto.createHash("sha256");
  hash.update(Buffer.from(content));
  return hash.digest("hex");
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
 * Write an asset file from source to target location.
 * Creates parent directories if needed.
 * Uses Bun's native file handling for efficient streaming.
 *
 * @param sourcePath - Path to source file
 * @param targetPath - Path to target file
 * @returns WriteResult indicating success or failure
 */
export async function writeAssetFile(
  sourcePath: string,
  targetPath: string
): Promise<WriteResult> {
  try {
    // Create parent directory if needed
    const targetDir = path.dirname(targetPath);
    await fs.promises.mkdir(targetDir, { recursive: true });

    // Use Bun's file API for efficient streaming copy
    await Bun.write(targetPath, Bun.file(sourcePath));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

// =============================================================================
// Path Extraction
// =============================================================================

/**
 * Extract the relative asset path from a materials path.
 *
 * Input: "module-01/assets/images/hero.png"
 * Output: "images/hero.png"
 *
 * @param relativePath - Path relative to materials root
 * @returns Path relative to assets directory
 */
function extractAssetRelativePath(relativePath: string): string {
  // Find the "assets" segment and take everything after it
  const parts = relativePath.split(path.sep);
  const assetsIndex = parts.findIndex(p => p === "assets");
  if (assetsIndex >= 0 && assetsIndex < parts.length - 1) {
    return parts.slice(assetsIndex + 1).join(path.sep);
  }
  // Fallback: use filename only
  return path.basename(relativePath);
}

// =============================================================================
// Core Sync Execution
// =============================================================================

/**
 * Execute asset sync from materials to platform public directory.
 *
 * @param config - CourseKit configuration
 * @param options - Sync options (dryRun, force, courseId)
 * @returns SyncResult with details of what was synced
 */
export async function executeAssetSync(
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

  // Discover source assets
  const manifest = await discoverAssets(config);

  // Return early if no assets found
  if (manifest.assets.length === 0) {
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

  // Get default course slug (use first course in config)
  const courseIds = Object.keys(config.courses);
  const defaultCourseSlug = courseIds.length > 0 ? config.courses[courseIds[0]].slug : "default";

  // Process each asset
  for (const asset of manifest.assets) {
    // Determine course slug (could be derived from asset path in future)
    const courseSlug = options.courseId ?? defaultCourseSlug;

    // Extract relative path within assets
    const assetRelativePath = extractAssetRelativePath(asset.relativePath);

    // Build canonical key and target path
    const key = `assets/${courseSlug}/${assetRelativePath}`;
    const targetPath = buildAssetTargetPath(platformRoot, courseSlug, assetRelativePath);

    // Calculate source hash
    const sourceHash = await calculateBinaryHash(asset.path);

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
      const currentPlatformHash = await calculateBinaryHash(targetPath);

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
          const writeResult = await writeAssetFile(asset.path, targetPath);

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
