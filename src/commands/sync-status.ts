/**
 * Sync Status Command (F-13)
 *
 * Display sync state between source and platform.
 */

import chalk from "chalk";
import { loadConfig } from "../config";
import { calculateLessonDiff } from "../lib/diff";
import { detectConflicts } from "../lib/conflict-detection";
import { displayConflictStatus } from "../lib/conflict-display";

export interface SyncStatusOptions {
  course?: string;
  json?: boolean;
}

/**
 * Display sync status for all configured courses.
 */
export async function syncStatusCommand(options: SyncStatusOptions = {}): Promise<void> {
  try {
    const config = await loadConfig();

    console.log("");
    console.log(chalk.bold("Sync Status"));
    console.log("─".repeat(50));

    // Calculate diff
    const diff = await calculateLessonDiff(config, {
      courseId: options.course,
      includeUnchanged: true,
    });

    // Detect conflicts
    const conflicts = await detectConflicts(config, {
      courseId: options.course,
    });

    // JSON output
    if (options.json) {
      console.log(JSON.stringify({ diff: diff.summary, conflicts }, null, 2));
      return;
    }

    // Display summary
    console.log(`  Platform: ${chalk.dim(config.platform.path)}`);
    if (options.course) {
      console.log(`  Course:   ${chalk.cyan(options.course)}`);
    }
    console.log("");

    // Lessons summary
    console.log(chalk.bold("Lessons:"));
    console.log(`  ${chalk.green(diff.summary.unchanged.toString())} synced`);
    if (diff.summary.added > 0) {
      console.log(`  ${chalk.blue(diff.summary.added.toString())} to add`);
    }
    if (diff.summary.modified > 0) {
      console.log(`  ${chalk.yellow(diff.summary.modified.toString())} modified`);
    }
    if (diff.summary.removed > 0) {
      console.log(`  ${chalk.red(diff.summary.removed.toString())} removed from source`);
    }
    console.log("");

    // Show conflicts if any
    if (conflicts.hasConflicts) {
      displayConflictStatus(conflicts);
    } else {
      console.log(chalk.green("No conflicts detected."));
    }

    // Show individual changes if any
    const changes = diff.items.filter(item => item.status !== "unchanged");
    if (changes.length > 0) {
      console.log("");
      console.log(chalk.bold("Pending changes:"));
      for (const item of changes) {
        const icon = item.status === "added" ? "+" :
                     item.status === "modified" ? "~" :
                     item.status === "removed" ? "-" : "?";
        const color = item.status === "added" ? chalk.blue :
                      item.status === "modified" ? chalk.yellow :
                      item.status === "removed" ? chalk.red : chalk.dim;
        console.log(`  ${color(icon)} ${item.key}`);
      }
    }

    console.log("");
    if (changes.length > 0 || conflicts.hasConflicts) {
      console.log(chalk.dim("Run 'coursekit push' to sync changes."));
    } else {
      console.log(chalk.green("Everything is up to date."));
    }

  } catch (error) {
    if (error instanceof Error && error.message.includes("coursekit.json")) {
      console.log(chalk.red("No coursekit.json found."));
      process.exitCode = 2;
      return;
    }
    throw error;
  }
}
