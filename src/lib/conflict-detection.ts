/**
 * Conflict Detection (F-8)
 *
 * Detect conflicts between platform state and sync state baseline.
 * Conflicts occur when platform files have been modified since the last sync.
 */

import type {
  ConflictDetectionOptions,
  ConflictDetectionResult,
  ConflictItem,
  ConflictType,
  CourseKitConfig,
  PlatformLesson,
  PlatformGuide,
  SyncRecord,
  SyncState,
} from "../types";
import { loadSyncState, getSyncRecord } from "./sync-state";
import { readPlatformState } from "./platform-state";

// =============================================================================
// Conflict Classification (T-2.2)
// =============================================================================

/**
 * Classify a single file as a conflict or not.
 *
 * @param key - Canonical key (courseId/slug)
 * @param syncRecord - Sync record from state (null if not previously synced)
 * @param platformFile - Platform file (null if deleted from platform)
 * @returns ConflictItem if conflict detected, null otherwise
 */
export function classifyConflict(
  key: string,
  syncRecord: SyncRecord | null,
  platformFile: PlatformLesson | PlatformGuide | null
): ConflictItem | null {
  // Both null: nothing to compare
  if (!syncRecord && !platformFile) {
    return null;
  }

  // Platform file exists but was never synced: new_on_platform
  if (!syncRecord && platformFile) {
    return {
      key,
      platformPath: platformFile.path,
      currentHash: platformFile.contentHash,
      conflictType: "new_on_platform",
      changeSummary: "File exists on platform but was never synced",
    };
  }

  // Sync record exists but platform file is missing: deleted
  if (syncRecord && !platformFile) {
    return {
      key,
      expectedHash: syncRecord.contentHash,
      lastSyncedAt: syncRecord.syncedAt,
      conflictType: "deleted",
      changeSummary: "File was deleted from platform since last sync",
    };
  }

  // Both exist: compare hashes
  if (syncRecord && platformFile) {
    if (syncRecord.contentHash === platformFile.contentHash) {
      // No conflict - hashes match
      return null;
    }

    // Hashes differ: modified
    return {
      key,
      platformPath: platformFile.path,
      expectedHash: syncRecord.contentHash,
      currentHash: platformFile.contentHash,
      lastSyncedAt: syncRecord.syncedAt,
      conflictType: "modified",
      changeSummary: "File was modified on platform since last sync",
    };
  }

  return null;
}

// =============================================================================
// Main Detection Function (T-2.1)
// =============================================================================

/**
 * Detect conflicts between current platform state and sync state baseline.
 *
 * Conflict types:
 * - modified: Platform file hash differs from sync state
 * - deleted: Platform file missing but exists in sync state
 * - new_on_platform: Platform file exists but not in sync state
 *
 * @param config - CourseKit configuration
 * @param options - Detection options (courseId filter)
 * @returns Conflict detection result
 */
export async function detectConflicts(
  config: CourseKitConfig,
  options: ConflictDetectionOptions = {}
): Promise<ConflictDetectionResult> {
  const conflicts: ConflictItem[] = [];

  // Load sync state from platform directory
  const syncState = await loadSyncState(config.platform.path);

  // Read current platform state
  const platformState = await readPlatformState(config, {
    courseId: options.courseId,
    lessonsOnly: true, // For now, only lessons
  });

  // Build a map of platform files by canonical key
  const platformFilesByKey = new Map<string, PlatformLesson>();
  for (const lesson of platformState.lessons) {
    const key = `${lesson.courseId}/${lesson.slug}`;
    platformFilesByKey.set(key, lesson);
  }

  // Track which keys we've checked
  const checkedKeys = new Set<string>();

  // Check all sync records against platform state
  for (const [key, syncRecord] of Object.entries(syncState.records)) {
    // Apply courseId filter if specified
    if (options.courseId && !key.startsWith(`${options.courseId}/`)) {
      continue;
    }

    checkedKeys.add(key);
    const platformFile = platformFilesByKey.get(key) ?? null;
    const conflict = classifyConflict(key, syncRecord, platformFile);

    if (conflict) {
      conflicts.push(conflict);
    }
  }

  // Check for platform files not in sync state (new_on_platform)
  for (const [key, platformFile] of platformFilesByKey) {
    if (checkedKeys.has(key)) {
      continue;
    }

    // Apply courseId filter if specified
    if (options.courseId && !key.startsWith(`${options.courseId}/`)) {
      continue;
    }

    checkedKeys.add(key);
    const conflict = classifyConflict(key, null, platformFile);

    if (conflict) {
      conflicts.push(conflict);
    }
  }

  // Sort conflicts by key for consistent output
  conflicts.sort((a, b) => a.key.localeCompare(b.key));

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    totalChecked: checkedKeys.size,
  };
}
