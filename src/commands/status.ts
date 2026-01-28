/**
 * status command - Show course development status
 */

import chalk from "chalk";
import {
  getAllCourses,
  getCourse,
  getCourseStats,
  getModules,
  getLessons,
} from "../lib/database";
import type { Course, CoursePhase } from "../types";

interface StatusOptions {
  verbose?: boolean;
  json?: boolean;
}

export async function statusCommand(
  courseId?: string,
  options: StatusOptions = {}
): Promise<void> {
  try {
    if (courseId) {
      showCourseStatus(courseId, options);
    } else {
      showOverallStatus(options);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("No CourseKit database")) {
      console.log(chalk.yellow("No CourseKit project found."));
      console.log(`Run ${chalk.cyan("coursekit init <name>")} to create one.`);
      return;
    }
    throw error;
  }
}

function showOverallStatus(options: StatusOptions): void {
  const courses = getAllCourses();
  const stats = getCourseStats();

  if (options.json) {
    console.log(JSON.stringify({ courses, stats }, null, 2));
    return;
  }

  if (courses.length === 0) {
    console.log(chalk.yellow("No courses found."));
    console.log(`Run ${chalk.cyan("coursekit init <name>")} to create one.`);
    return;
  }

  console.log("");
  console.log(chalk.bold("CourseKit Status"));
  console.log("─".repeat(60));
  console.log("");

  // Summary
  console.log(
    `Total: ${chalk.cyan(stats.totalCourses)} course${stats.totalCourses !== 1 ? "s" : ""}`
  );
  console.log("");

  // Phase distribution
  console.log(chalk.bold("By Phase:"));
  const phases: CoursePhase[] = ["none", "define", "design", "develop", "produce", "launch"];
  for (const phase of phases) {
    const count = stats.byPhase[phase];
    if (count > 0) {
      console.log(`  ${phaseLabel(phase)}: ${count}`);
    }
  }
  console.log("");

  // Course list
  console.log(chalk.bold("Courses:"));
  console.log("");

  for (const course of courses) {
    const statusIcon = getStatusIcon(course.phase);
    console.log(
      `  ${statusIcon} ${chalk.cyan(course.id)} ${course.name}`
    );
    console.log(
      `    Phase: ${phaseLabel(course.phase)} | Context: ${course.context}`
    );
    console.log("");
  }
}

function showCourseStatus(courseId: string, options: StatusOptions): void {
  const course = getCourse(courseId);

  if (!course) {
    console.log(chalk.red(`Course not found: ${courseId}`));
    return;
  }

  if (options.json) {
    const modules = getModules(courseId);
    const modulesWithLessons = modules.map((m) => ({
      ...m,
      lessons: getLessons(courseId, m.id),
    }));
    console.log(JSON.stringify({ course, modules: modulesWithLessons }, null, 2));
    return;
  }

  console.log("");
  console.log(chalk.bold(`Course: ${course.name}`));
  console.log("─".repeat(60));
  console.log("");

  console.log(`  ID:          ${chalk.cyan(course.id)}`);
  console.log(`  Context:     ${course.context}`);
  console.log(`  Status:      ${course.status}`);
  console.log(`  Phase:       ${phaseLabel(course.phase)}`);
  console.log(`  Created:     ${course.createdAt.toLocaleDateString()}`);
  if (course.startedAt) {
    console.log(`  Started:     ${course.startedAt.toLocaleDateString()}`);
  }
  if (course.launchedAt) {
    console.log(`  Launched:    ${course.launchedAt.toLocaleDateString()}`);
  }
  console.log("");

  // Show phase progress
  console.log(chalk.bold("Phase Progress:"));
  console.log("");
  const allPhases: CoursePhase[] = ["define", "design", "develop", "produce", "launch"];
  const currentPhaseIndex = allPhases.indexOf(course.phase);

  for (let i = 0; i < allPhases.length; i++) {
    const phase = allPhases[i];
    let icon: string;
    let color: typeof chalk;

    if (i < currentPhaseIndex) {
      icon = "✓";
      color = chalk.green;
    } else if (i === currentPhaseIndex) {
      icon = "→";
      color = chalk.yellow;
    } else {
      icon = "○";
      color = chalk.dim;
    }

    console.log(`  ${color(`${icon} ${phaseLabel(phase)}`)}`);
  }
  console.log("");

  // Show modules if verbose
  if (options.verbose) {
    const modules = getModules(courseId);
    if (modules.length > 0) {
      console.log(chalk.bold("Modules:"));
      console.log("");
      for (const module of modules) {
        console.log(`  ${chalk.cyan(module.id)}: ${module.name}`);
        const lessons = getLessons(courseId, module.id);
        for (const lesson of lessons) {
          const statusIcon = lessonStatusIcon(lesson.status);
          console.log(
            `    ${statusIcon} ${lesson.id}: ${lesson.title} (${lesson.duration} min)`
          );
        }
        console.log("");
      }
    }
  }

  // Next steps
  console.log(chalk.bold("Next Steps:"));
  console.log("");
  const nextPhase = getNextPhase(course.phase);
  if (nextPhase) {
    console.log(
      `  Run ${chalk.cyan(`coursekit ${nextPhase} ${courseId}`)} to proceed`
    );
  } else {
    console.log(chalk.green("  Course is ready for launch!"));
  }
  console.log("");
}

function phaseLabel(phase: CoursePhase): string {
  const labels: Record<CoursePhase, string> = {
    none: "Not Started",
    define: "DEFINE",
    design: "DESIGN",
    develop: "DEVELOP",
    produce: "PRODUCE",
    launch: "LAUNCH",
  };
  return labels[phase];
}

function getStatusIcon(phase: CoursePhase): string {
  if (phase === "launch") return chalk.green("✓");
  if (phase === "none") return chalk.dim("○");
  return chalk.yellow("◐");
}

function lessonStatusIcon(status: string): string {
  switch (status) {
    case "published":
      return chalk.green("✓");
    case "edited":
      return chalk.blue("◉");
    case "recorded":
      return chalk.cyan("●");
    case "drafted":
      return chalk.yellow("◐");
    default:
      return chalk.dim("○");
  }
}

function getNextPhase(current: CoursePhase): string | null {
  const transitions: Record<CoursePhase, string | null> = {
    none: "define",
    define: "design",
    design: "develop",
    develop: "produce",
    produce: "complete",
    launch: null,
  };
  return transitions[current];
}
