/**
 * sync command - Sync course materials to the course platform
 *
 * Calls the course-platform sync script to update the platform with
 * the latest course materials from CourseKit.
 */

import chalk from "chalk";
import { getCourse } from "../lib/database";
import { existsSync } from "fs";
import { join } from "path";
import { $ } from "bun";

// Default course platform location
const DEFAULT_PLATFORM_ROOT = join(
  process.env.HOME || "~",
  "work/web/course-platform"
);

interface SyncOptions {
  dryRun?: boolean;
  platformRoot?: string;
}

export async function syncCommand(
  courseId: string,
  options: SyncOptions = {}
): Promise<void> {
  try {
    const course = getCourse(courseId);

    if (!course) {
      console.log(chalk.red(`Course not found: ${courseId}`));
      console.log("");
      console.log(
        "Use " + chalk.cyan("coursekit status") + " to list all courses."
      );
      return;
    }

    if (!course.coursePath) {
      console.log(chalk.red(`Course ${courseId} has no path set.`));
      console.log("");
      console.log(
        "The course path is set during the DEFINE phase. Run:"
      );
      console.log(chalk.cyan(`  coursekit define ${courseId}`));
      return;
    }

    if (!existsSync(course.coursePath)) {
      console.log(
        chalk.red(`Course path does not exist: ${course.coursePath}`)
      );
      return;
    }

    const platformRoot = options.platformRoot || DEFAULT_PLATFORM_ROOT;
    const syncScript = join(platformRoot, "scripts/sync-course.ts");

    if (!existsSync(syncScript)) {
      console.log(
        chalk.red(`Sync script not found: ${syncScript}`)
      );
      console.log("");
      console.log(
        "Make sure the course-platform is set up at:"
      );
      console.log(chalk.dim(`  ${platformRoot}`));
      console.log("");
      console.log(
        "Or specify a different location with --platform-root"
      );
      return;
    }

    console.log(chalk.bold(`Syncing ${course.name} to course platform`));
    console.log("─".repeat(50));
    console.log(`  Course:   ${chalk.cyan(course.id)} - ${course.name}`);
    console.log(`  Source:   ${chalk.dim(course.coursePath)}`);
    console.log(`  Platform: ${chalk.dim(platformRoot)}`);
    if (options.dryRun) {
      console.log(`  Mode:     ${chalk.yellow("DRY RUN")}`);
    }
    console.log("");

    // Build command arguments
    const args = [course.coursePath, "--platform-root", platformRoot];
    if (options.dryRun) {
      args.push("--dry-run");
    }

    // Run the sync script
    const result = await $`bun ${syncScript} ${args}`.text();
    console.log(result);

    if (!options.dryRun) {
      console.log(chalk.green("Sync complete!"));
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("No CourseKit database")) {
        console.log(chalk.yellow("No CourseKit project found."));
        console.log(
          `Run ${chalk.cyan("coursekit init <name>")} to create one.`
        );
        return;
      }
      console.log(chalk.red(`Sync failed: ${error.message}`));
    }
    throw error;
  }
}
