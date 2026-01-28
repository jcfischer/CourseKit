/**
 * Push Command (F-12)
 *
 * Orchestrates one-way sync of lessons, guides, and assets from source to platform.
 * Uses internal sync modules (F-9, F-10, F-11).
 */

import chalk from "chalk";
import { loadConfig } from "../config";
import { executeLessonSync } from "../lib/lesson-sync";
import { executeGuideSync } from "../lib/guide-sync";
import { executeAssetSync } from "../lib/asset-sync";
import { displaySyncResult, displaySyncPreview } from "../lib/sync-display";
import type { SyncOptions, SyncResult, SyncSummary } from "../types";

// =============================================================================
// Types
// =============================================================================

export interface PushCommandOptions {
  dryRun?: boolean;
  force?: boolean;
  course?: string;
}

// =============================================================================
// Result Aggregation
// =============================================================================

/**
 * Combine multiple sync results into an aggregated summary.
 */
function aggregateResults(results: SyncResult[]): SyncResult {
  const created: string[] = [];
  const updated: string[] = [];
  const unchanged: string[] = [];
  const skipped: string[] = [];
  const errors: { key: string; error: Error; message: string }[] = [];

  for (const result of results) {
    created.push(...result.created);
    updated.push(...result.updated);
    unchanged.push(...result.unchanged);
    skipped.push(...result.skipped);
    errors.push(...result.errors);
  }

  const summary: SyncSummary = {
    total: created.length + updated.length + unchanged.length + skipped.length + errors.length,
    created: created.length,
    updated: updated.length,
    unchanged: unchanged.length,
    skipped: skipped.length,
    errors: errors.length,
  };

  const success = skipped.length === 0 && errors.length === 0;
  const dryRun = results.length > 0 ? results[0].dryRun : false;

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

// =============================================================================
// Push Command
// =============================================================================

/**
 * Execute the push command.
 *
 * @param options - Command options (dryRun, force, course)
 */
export async function pushCommand(options: PushCommandOptions = {}): Promise<void> {
  try {
    // Load configuration
    const config = await loadConfig();

    // Build sync options
    const syncOptions: SyncOptions = {
      dryRun: options.dryRun,
      force: options.force,
      courseId: options.course,
    };

    // Display header
    console.log("");
    console.log(chalk.bold("CourseKit Push"));
    console.log("─".repeat(50));
    console.log(`  Platform: ${chalk.dim(config.platform.path)}`);
    if (options.dryRun) {
      console.log(`  Mode:     ${chalk.yellow("DRY RUN")}`);
    }
    if (options.force) {
      console.log(`  Mode:     ${chalk.red("FORCE (overwrite conflicts)")}`);
    }
    if (options.course) {
      console.log(`  Filter:   ${chalk.cyan(options.course)}`);
    }
    console.log("");

    // Execute syncs
    console.log(chalk.dim("Syncing lessons..."));
    const lessonResult = await executeLessonSync(config, syncOptions);

    console.log(chalk.dim("Syncing guides..."));
    const guideResult = await executeGuideSync(config, syncOptions);

    console.log(chalk.dim("Syncing assets..."));
    const assetResult = await executeAssetSync(config, syncOptions);

    // Aggregate results
    const combinedResult = aggregateResults([lessonResult, guideResult, assetResult]);

    // Display results
    if (combinedResult.dryRun) {
      displaySyncPreview(combinedResult);
    } else {
      displaySyncResult(combinedResult);
    }

    // Set exit code based on result
    if (!combinedResult.success) {
      if (combinedResult.skipped.length > 0) {
        // Conflicts detected
        process.exitCode = 2;
      } else {
        // Errors occurred
        process.exitCode = 1;
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("coursekit.json")) {
        console.log(chalk.red("No coursekit.json found."));
        console.log("");
        console.log("Create a coursekit.json configuration file in the current directory.");
        process.exitCode = 1;
        return;
      }
      console.log(chalk.red(`Push failed: ${error.message}`));
    }
    process.exitCode = 1;
  }
}
