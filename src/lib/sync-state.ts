/**
 * Sync State Persistence (F-8)
 *
 * Load, save, and manage sync state for conflict detection.
 * Sync state is stored in .coursekit-sync.json in the platform directory.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { SyncState, SyncRecord } from "../types";

/** Current schema version for sync state */
export const SYNC_STATE_VERSION = 1;

/** Filename for sync state file */
export const SYNC_STATE_FILENAME = ".coursekit-sync.json";

// =============================================================================
// Path Utilities
// =============================================================================

/**
 * Get the path to the sync state file for a platform root.
 *
 * @param platformRoot - Platform root directory
 * @returns Absolute path to .coursekit-sync.json
 */
export function getSyncStateFilePath(platformRoot: string): string {
  return path.join(platformRoot, SYNC_STATE_FILENAME);
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Create an empty sync state with the current schema version.
 *
 * @returns Empty SyncState object
 */
export function initializeSyncState(): SyncState {
  return {
    version: SYNC_STATE_VERSION,
    records: {},
    lastSync: null,
  };
}

// =============================================================================
// Load and Save
// =============================================================================

/**
 * Load sync state from the platform directory.
 * Returns an empty state if the file does not exist.
 *
 * @param platformRoot - Platform root directory
 * @returns Loaded SyncState
 * @throws Error if JSON is invalid or version is unsupported
 */
export async function loadSyncState(platformRoot: string): Promise<SyncState> {
  const filePath = getSyncStateFilePath(platformRoot);

  if (!fs.existsSync(filePath)) {
    return initializeSyncState();
  }

  const content = await Bun.file(filePath).text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new Error(
      `Invalid JSON in sync state file: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Validate structure
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Sync state file must contain a JSON object");
  }

  const state = parsed as Record<string, unknown>;

  // Validate version
  if (typeof state.version !== "number") {
    throw new Error("Sync state file missing version field");
  }

  if (state.version > SYNC_STATE_VERSION) {
    throw new Error(
      `Unsupported sync state version ${state.version}. Maximum supported: ${SYNC_STATE_VERSION}`
    );
  }

  return {
    version: state.version,
    records: (state.records as Record<string, SyncRecord>) ?? {},
    lastSync: (state.lastSync as string) ?? null,
  };
}

/**
 * Save sync state to the platform directory.
 * Creates parent directories if needed.
 *
 * @param platformRoot - Platform root directory
 * @param state - SyncState to save
 */
export async function saveSyncState(
  platformRoot: string,
  state: SyncState
): Promise<void> {
  const filePath = getSyncStateFilePath(platformRoot);
  const dir = path.dirname(filePath);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write atomically: write to temp file, then rename
  const tempPath = `${filePath}.tmp`;
  const content = JSON.stringify(state, null, 2);

  await Bun.write(tempPath, content);
  fs.renameSync(tempPath, filePath);
}

// =============================================================================
// Record Management
// =============================================================================

/**
 * Update or add a sync record in the state.
 * Mutates the state object.
 *
 * @param state - SyncState to update
 * @param key - Canonical key (courseId/slug)
 * @param record - SyncRecord to set
 */
export function updateSyncRecord(
  state: SyncState,
  key: string,
  record: SyncRecord
): void {
  state.records[key] = record;
}

/**
 * Get a sync record by canonical key.
 *
 * @param state - SyncState to query
 * @param key - Canonical key (courseId/slug)
 * @returns SyncRecord or undefined if not found
 */
export function getSyncRecord(
  state: SyncState,
  key: string
): SyncRecord | undefined {
  return state.records[key];
}

/**
 * Delete a sync record by canonical key.
 * Mutates the state object. No-op if key doesn't exist.
 *
 * @param state - SyncState to update
 * @param key - Canonical key (courseId/slug)
 */
export function deleteSyncRecord(state: SyncState, key: string): void {
  delete state.records[key];
}

/**
 * Get all sync records as an array.
 *
 * @param state - SyncState to query
 * @returns Array of all SyncRecord objects
 */
export function getAllSyncRecords(state: SyncState): SyncRecord[] {
  return Object.values(state.records);
}
