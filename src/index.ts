#!/usr/bin/env bun
/**
 * CourseKit CLI
 * Backward Design course development workflow
 */

import { Command } from "commander";
import { initCommand } from "./commands/init";
import { statusCommand } from "./commands/status";
import { showCommand } from "./commands/show";
import { defineCommand } from "./commands/define";
import { designCommand } from "./commands/design";
import { developCommand } from "./commands/develop";
import { produceCommand } from "./commands/produce";
import { addModuleCommand } from "./commands/add-module";
import { addLessonCommand } from "./commands/add-lesson";
import { lessonCommand } from "./commands/lesson";
import { completeCommand } from "./commands/complete";
import { validateCommand } from "./commands/validate";
import { syncCommand } from "./commands/sync";

// =============================================================================
// Version from package.json
// =============================================================================

const version = "0.1.0";

// =============================================================================
// Main Program
// =============================================================================

const program = new Command()
  .name("coursekit")
  .description("Backward Design course development workflow")
  .version(version);

// =============================================================================
// Commands
// =============================================================================

program
  .command("init")
  .description("Initialize a new course project")
  .argument("<name>", "Course name")
  .option("--context <type>", "Course context: online or university", "online")
  .option("--description <desc>", "Course description")
  .option("--from-plan <file>", "Import from existing course plan")
  .option("--force", "Overwrite existing database")
  .action(initCommand);

program
  .command("status")
  .description("Show course development status")
  .argument("[course-id]", "Show status for specific course")
  .option("--verbose", "Show detailed status")
  .option("--json", "Output as JSON")
  .action(statusCommand);

program
  .command("show")
  .description("Show detailed course info with modules and lessons")
  .argument("<course-id>", "Course ID (e.g., C-001)")
  .option("--json", "Output as JSON")
  .action(showCommand);

program
  .command("define")
  .description("Run DEFINE phase (interview + objectives)")
  .argument("<course-id>", "Course ID (e.g., C-001)")
  .option("--dry-run", "Show what would happen without executing")
  .action(defineCommand);

program
  .command("design")
  .description("Run DESIGN phase (structure + modules)")
  .argument("<course-id>", "Course ID (e.g., C-001)")
  .option("--dry-run", "Show what would happen without executing")
  .action(designCommand);

program
  .command("develop")
  .description("Run DEVELOP phase (content tasks)")
  .argument("<course-id>", "Course ID (e.g., C-001)")
  .option("--dry-run", "Show what would happen without executing")
  .action(developCommand);

program
  .command("produce")
  .description("Run PRODUCE phase (recording + editing)")
  .argument("<course-id>", "Course ID (e.g., C-001)")
  .option("--dry-run", "Show what would happen without executing")
  .action(produceCommand);

program
  .command("add-module")
  .description("Add a new module to a course")
  .argument("<course-id>", "Course ID (e.g., C-001)")
  .argument("<name>", "Module name")
  .option("--objective <text>", "Module learning objective")
  .action(addModuleCommand);

program
  .command("add-lesson")
  .description("Add a new lesson to a module")
  .argument("<path>", "Path: C-001/M1")
  .argument("<title>", "Lesson title")
  .option("--objective <text>", "Learning objective (with Bloom verb)")
  .option("--duration <min>", "Duration in minutes", "10")
  .action(addLessonCommand);

program
  .command("lesson")
  .description("Work on a specific lesson")
  .argument("<path>", "Lesson path: C-001/M1/L2")
  .option("--draft", "AI-draft content for this lesson")
  .option("--status <status>", "Update lesson status")
  .action(lessonCommand);

program
  .command("complete")
  .description("Mark a phase or course complete")
  .argument("<course-id>", "Course ID (e.g., C-001)")
  .option("--phase <phase>", "Mark specific phase complete")
  .option("--force", "Bypass validation")
  .action(completeCommand);

program
  .command("validate")
  .description("Validate phase completion")
  .argument("<course-id>", "Course ID (e.g., C-001)")
  .option("--phase <phase>", "Validate specific phase")
  .option("--json", "Output as JSON")
  .action(validateCommand);

// =============================================================================
// Future Commands (placeholder for expansion)
// =============================================================================

program
  .command("draft")
  .description("AI-draft lesson content")
  .argument("<path>", "Lesson path: C-001/M1/L2")
  .action(() => {
    console.log("Draft command coming soon - use 'lesson --draft' for now");
  });

program
  .command("quiz")
  .description("AI-generate quiz questions")
  .argument("<path>", "Module path: C-001/M1")
  .option("--count <n>", "Number of questions", "5")
  .action(() => {
    console.log("Quiz generation coming soon");
  });

program
  .command("sync")
  .description("Sync course materials to course platform")
  .argument("<course-id>", "Course ID")
  .option("--dry-run", "Show what would be synced without writing files")
  .option("--platform-root <path>", "Path to course-platform root")
  .action(syncCommand);

// =============================================================================
// Parse and Execute
// =============================================================================

program.parse();
