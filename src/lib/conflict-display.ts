/**
 * Conflict Display Utilities (F-8)
 *
 * Format and display conflict information in the terminal.
 */

import type { ConflictDetectionResult, ConflictItem } from "../types";

// =============================================================================
// Formatting Functions
// =============================================================================

/**
 * Format a single conflict for display.
 *
 * @param conflict - Conflict item to format
 * @returns Formatted string
 */
export function formatConflictSummary(conflict: ConflictItem): string {
  const lines: string[] = [];

  lines.push(`  ${conflict.key}`);

  if (conflict.platformPath) {
    lines.push(`    Platform: ${conflict.platformPath}`);
  }

  lines.push(`    Status: ${formatConflictType(conflict.conflictType)}`);

  if (conflict.lastSyncedAt) {
    lines.push(`    Last synced: ${formatDate(conflict.lastSyncedAt)}`);
  }

  return lines.join("\n");
}

/**
 * Format conflict type for human-readable display.
 */
function formatConflictType(type: string): string {
  switch (type) {
    case "modified":
      return "modified on platform";
    case "deleted":
      return "deleted from platform";
    case "new_on_platform":
      return "new on platform (never synced)";
    default:
      return type;
  }
}

/**
 * Format ISO date string for display.
 */
function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoDate;
  }
}

// =============================================================================
// Display Functions
// =============================================================================

/**
 * Display conflicts in the terminal.
 *
 * @param result - Conflict detection result
 */
export function displayConflicts(result: ConflictDetectionResult): void {
  if (!result.hasConflicts) {
    console.log("No conflicts detected.");
    return;
  }

  const count = result.conflicts.length;
  const plural = count === 1 ? "file" : "files";

  console.log(`\nConflicts detected (${count} ${plural}):\n`);

  for (const conflict of result.conflicts) {
    console.log(formatConflictSummary(conflict));
    console.log();
  }

  console.log("Push aborted. Use --force to overwrite platform files.");
}

/**
 * Display conflict summary for status command.
 *
 * @param result - Conflict detection result
 */
export function displayConflictStatus(result: ConflictDetectionResult): void {
  if (!result.hasConflicts) {
    return;
  }

  const count = result.conflicts.length;
  console.log(`\nConflicts (${count}):`);

  for (const conflict of result.conflicts) {
    const status = formatConflictType(conflict.conflictType);
    console.log(`  ${conflict.key} [${status}]`);
  }

  console.log("\nRun 'coursekit push --force' to overwrite platform changes.");
}
