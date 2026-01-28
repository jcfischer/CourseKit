/**
 * Sync Display Utilities (F-9)
 *
 * Format and display sync results in the terminal.
 */

import type { SyncResult, SyncSummary } from "../types";

// =============================================================================
// Formatting Functions
// =============================================================================

/**
 * Format sync summary as a human-readable string.
 *
 * @param summary - Sync summary counts
 * @returns Formatted summary string
 */
export function formatSyncSummary(summary: SyncSummary): string {
  const parts: string[] = [];

  parts.push(`${summary.total} files`);

  if (summary.created > 0) {
    parts.push(`${summary.created} created`);
  }
  if (summary.updated > 0) {
    parts.push(`${summary.updated} updated`);
  }
  if (summary.unchanged > 0) {
    parts.push(`${summary.unchanged} unchanged`);
  }
  if (summary.skipped > 0) {
    parts.push(`${summary.skipped} skipped`);
  }
  if (summary.errors > 0) {
    const errorWord = summary.errors === 1 ? "error" : "errors";
    parts.push(`${summary.errors} ${errorWord}`);
  }

  return parts.join(", ");
}

// =============================================================================
// Display Functions
// =============================================================================

/**
 * Display sync result in the terminal.
 *
 * @param result - Sync result to display
 */
export function displaySyncResult(result: SyncResult): void {
  console.log("");

  // Show summary header
  if (result.success) {
    console.log("✓ Sync complete");
  } else {
    console.log("⚠ Sync completed with issues");
  }

  console.log(`  ${formatSyncSummary(result.summary)}`);
  console.log("");

  // Show created files
  if (result.created.length > 0) {
    console.log("Created:");
    for (const key of result.created) {
      console.log(`  + ${key}`);
    }
    console.log("");
  }

  // Show updated files
  if (result.updated.length > 0) {
    console.log("Updated:");
    for (const key of result.updated) {
      console.log(`  ~ ${key}`);
    }
    console.log("");
  }

  // Show skipped files (conflicts)
  if (result.skipped.length > 0) {
    console.log("Skipped (conflicts):");
    for (const key of result.skipped) {
      console.log(`  ! ${key}`);
    }
    console.log("");
    console.log("Use --force to overwrite conflicting files.");
    console.log("");
  }

  // Show errors
  if (result.errors.length > 0) {
    console.log("Errors:");
    for (const error of result.errors) {
      console.log(`  ✗ ${error.key}: ${error.message}`);
    }
    console.log("");
  }
}

/**
 * Display sync preview (for dry-run mode).
 *
 * @param result - Sync result to display
 */
export function displaySyncPreview(result: SyncResult): void {
  console.log("");
  console.log("═══ DRY RUN ═══════════════════════════════════════════════════");
  console.log("No files were written. Preview of what would happen:");
  console.log("");

  // Show what would be created
  if (result.created.length > 0) {
    console.log("Would create:");
    for (const key of result.created) {
      console.log(`  + ${key}`);
    }
    console.log("");
  }

  // Show what would be updated
  if (result.updated.length > 0) {
    console.log("Would update:");
    for (const key of result.updated) {
      console.log(`  ~ ${key}`);
    }
    console.log("");
  }

  // Show unchanged
  if (result.unchanged.length > 0) {
    console.log(`Unchanged: ${result.unchanged.length} files`);
    console.log("");
  }

  // Show skipped (conflicts)
  if (result.skipped.length > 0) {
    console.log("Would skip (conflicts):");
    for (const key of result.skipped) {
      console.log(`  ! ${key}`);
    }
    console.log("");
    console.log("Use --force to overwrite conflicting files.");
    console.log("");
  }

  // Summary
  console.log(`Summary: ${formatSyncSummary(result.summary)}`);
  console.log("═══════════════════════════════════════════════════════════════");
}
