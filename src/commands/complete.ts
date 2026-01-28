/**
 * complete command - Mark a phase or course complete
 */

import chalk from "chalk";
import { existsSync } from "fs";
import { join } from "path";
import { getCourse, updateCoursePhase, updateCourseStatus } from "../lib/database";
import type { CoursePhase } from "../types";

interface CompleteOptions {
  phase?: string;
  force?: boolean;
}

export async function completeCommand(
  courseId: string,
  options: CompleteOptions
): Promise<void> {
  const course = getCourse(courseId);

  if (!course) {
    console.log(chalk.red(`Course not found: ${courseId}`));
    process.exit(1);
  }

  if (options.phase) {
    // Complete a specific phase
    completePhase(courseId, options.phase as CoursePhase, course.coursePath, options.force);
  } else {
    // Complete entire course (must be in produce phase)
    if (course.phase !== "produce" && !options.force) {
      console.log(chalk.yellow(`Course is in ${course.phase} phase, not ready for launch.`));
      console.log(`Complete remaining phases or use ${chalk.cyan("--force")}.`);
      return;
    }

    // Validate all phases
    const phases: CoursePhase[] = ["define", "design", "develop", "produce"];
    let allValid = true;

    for (const phase of phases) {
      const valid = validatePhase(phase, course.coursePath);
      if (!valid && !options.force) {
        console.log(chalk.red(`Phase ${phase} not complete.`));
        allValid = false;
      }
    }

    if (!allValid && !options.force) {
      console.log("");
      console.log(chalk.yellow("Complete all phases before launching."));
      return;
    }

    // Mark as launched
    updateCoursePhase(courseId, "launch");
    updateCourseStatus(courseId, "launched");

    console.log("");
    console.log(chalk.green("Course marked as LAUNCHED!"));
    console.log("");
    console.log(chalk.bold("Post-Launch Checklist:"));
    console.log("  [ ] Announce to audience");
    console.log("  [ ] Monitor first purchases");
    console.log("  [ ] Respond to questions");
    console.log("  [ ] Gather feedback");
    console.log("");
  }
}

function completePhase(
  courseId: string,
  phase: CoursePhase,
  coursePath: string | null,
  force?: boolean
): void {
  const validPhases: CoursePhase[] = ["define", "design", "develop", "produce"];

  if (!validPhases.includes(phase)) {
    console.log(chalk.red(`Invalid phase: ${phase}`));
    console.log(`Valid phases: ${validPhases.join(", ")}`);
    process.exit(1);
  }

  // Validate phase
  if (!force) {
    const valid = validatePhase(phase, coursePath);
    if (!valid) {
      console.log(chalk.red(`Phase ${phase} validation failed.`));
      console.log(`Use ${chalk.cyan("--force")} to bypass.`);
      return;
    }
  }

  // Get next phase
  const phaseOrder: CoursePhase[] = ["define", "design", "develop", "produce", "launch"];
  const currentIndex = phaseOrder.indexOf(phase);
  const nextPhase = phaseOrder[currentIndex + 1] || "launch";

  updateCoursePhase(courseId, phase);
  updateCourseStatus(courseId, "in_progress");

  console.log(chalk.green(`Completed phase: ${phase.toUpperCase()}`));
  console.log("");

  if (nextPhase !== "launch") {
    console.log(`Next: ${chalk.cyan(`coursekit ${nextPhase} ${courseId}`)}`);
  } else {
    console.log(`Ready to launch: ${chalk.cyan(`coursekit complete ${courseId}`)}`);
  }
}

function validatePhase(phase: CoursePhase, coursePath: string | null): boolean {
  if (!coursePath) return false;

  switch (phase) {
    case "define":
      return existsSync(join(coursePath, "define.md"));
    case "design":
      return existsSync(join(coursePath, "design.md"));
    case "develop":
      return existsSync(join(coursePath, "develop.md"));
    case "produce":
      return existsSync(join(coursePath, "produce.md"));
    default:
      return true;
  }
}
