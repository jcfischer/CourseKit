/**
 * Sync Validate Command (F-14)
 *
 * Validate source structure before push.
 */

import chalk from "chalk";
import { loadConfig } from "../config";
import { discoverLessons } from "../lib/discovery";
import { validateAllLessons } from "../lib/validation";

export interface SyncValidateOptions {
  course?: string;
  json?: boolean;
}

/**
 * Validate source structure and frontmatter.
 */
export async function syncValidateCommand(options: SyncValidateOptions = {}): Promise<void> {
  try {
    const config = await loadConfig();

    console.log("");
    console.log(chalk.bold("Validating Source Structure"));
    console.log("─".repeat(50));

    // Discover lessons
    console.log(chalk.dim("Discovering lessons..."));
    const manifest = await discoverLessons(config, {
      courseId: options.course,
    });

    // Validate frontmatter
    console.log(chalk.dim("Validating frontmatter..."));
    const validation = validateAllLessons(manifest, config);

    // JSON output
    if (options.json) {
      console.log(JSON.stringify({
        discovery: {
          lessons: manifest.lessons.length,
          warnings: manifest.warnings,
        },
        validation,
      }, null, 2));
      return;
    }

    // Display results
    console.log("");

    // Discovery summary
    console.log(chalk.bold("Discovery:"));
    console.log(`  Found ${chalk.cyan(manifest.lessons.length.toString())} lessons`);
    if (manifest.warnings.length > 0) {
      console.log(`  ${chalk.yellow(manifest.warnings.length.toString())} warnings`);
      for (const warning of manifest.warnings) {
        console.log(`    ${chalk.yellow("!")} ${warning.message}`);
      }
    }
    console.log("");

    // Validation summary
    console.log(chalk.bold("Frontmatter Validation:"));
    if (validation.valid) {
      console.log(`  ${chalk.green("✓")} All ${validation.totalFiles} files valid`);
    } else {
      console.log(`  ${chalk.green(validation.validFiles.toString())} valid`);
      console.log(`  ${chalk.red(validation.invalidFiles.toString())} invalid`);
      console.log("");

      // Show errors
      for (const file of validation.files) {
        if (!file.valid) {
          console.log(chalk.red(`  ${file.relativePath}:`));
          for (const error of file.errors) {
            console.log(`    ${chalk.red("✗")} ${error.field}: ${error.message}`);
            if (error.suggestion) {
              console.log(`      ${chalk.dim(error.suggestion)}`);
            }
          }
        }
      }
    }

    // Warnings (duplicate orders)
    if (validation.warnings.length > 0) {
      console.log("");
      console.log(chalk.bold("Warnings:"));
      for (const warning of validation.warnings) {
        console.log(`  ${chalk.yellow("!")} ${warning.message}`);
      }
    }

    console.log("");

    // Exit code
    if (!validation.valid) {
      console.log(chalk.red("Validation failed. Fix errors before pushing."));
      process.exitCode = 1;
    } else {
      console.log(chalk.green("Validation passed. Ready to push."));
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
