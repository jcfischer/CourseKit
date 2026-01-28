/**
 * show command - Show detailed course information with modules and lessons
 */

import chalk from "chalk";
import {
  getCourse,
  getModules,
  getLessons,
} from "../lib/database";
import type { CoursePhase } from "../types";

interface ShowOptions {
  json?: boolean;
}

export async function showCommand(
  courseId: string,
  options: ShowOptions = {}
): Promise<void> {
  try {
    const course = getCourse(courseId);

    if (!course) {
      console.log(chalk.red(`Course not found: ${courseId}`));
      console.log("");
      console.log("Use " + chalk.cyan("coursekit status") + " to list all courses.");
      return;
    }

    const modules = getModules(courseId);
    const modulesWithLessons = modules.map((m) => ({
      ...m,
      lessons: getLessons(courseId, m.id),
    }));

    if (options.json) {
      console.log(JSON.stringify({ course, modules: modulesWithLessons }, null, 2));
      return;
    }

    // Header
    console.log("");
    console.log(chalk.bold(`Course: ${course.name}`));
    console.log("═".repeat(60));
    console.log("");

    // Course metadata
    console.log(chalk.dim("Metadata"));
    console.log("─".repeat(40));
    console.log(`  ID:          ${chalk.cyan(course.id)}`);
    console.log(`  Context:     ${course.context}`);
    console.log(`  Phase:       ${phaseLabel(course.phase)}`);
    console.log(`  Status:      ${course.status}`);
    if (course.coursePath) {
      console.log(`  Path:        ${chalk.dim(course.coursePath)}`);
    }
    console.log(`  Created:     ${course.createdAt.toLocaleDateString()}`);
    if (course.startedAt) {
      console.log(`  Started:     ${course.startedAt.toLocaleDateString()}`);
    }
    console.log("");

    // Calculate totals
    let totalLessons = 0;
    let totalDuration = 0;
    let lessonsByStatus: Record<string, number> = {};

    for (const module of modulesWithLessons) {
      for (const lesson of module.lessons) {
        totalLessons++;
        totalDuration += lesson.duration;
        lessonsByStatus[lesson.status] = (lessonsByStatus[lesson.status] || 0) + 1;
      }
    }

    // Summary
    console.log(chalk.dim("Summary"));
    console.log("─".repeat(40));
    console.log(`  Modules:     ${chalk.cyan(modules.length)}`);
    console.log(`  Lessons:     ${chalk.cyan(totalLessons)}`);
    console.log(`  Duration:    ${chalk.cyan(formatDuration(totalDuration))}`);
    console.log("");

    // Lesson status breakdown
    if (Object.keys(lessonsByStatus).length > 0) {
      console.log(chalk.dim("Lesson Status"));
      console.log("─".repeat(40));
      for (const [status, count] of Object.entries(lessonsByStatus).sort()) {
        const icon = lessonStatusIcon(status);
        const pct = Math.round((count / totalLessons) * 100);
        console.log(`  ${icon} ${status}: ${count} (${pct}%)`);
      }
      console.log("");
    }

    // Modules and lessons
    if (modulesWithLessons.length > 0) {
      console.log(chalk.dim("Modules & Lessons"));
      console.log("─".repeat(40));
      console.log("");

      for (const module of modulesWithLessons) {
        const moduleDuration = module.lessons.reduce((sum, l) => sum + l.duration, 0);
        console.log(`  ${chalk.bold.cyan(module.id)}: ${chalk.bold(module.name)}`);
        if (module.objective) {
          console.log(`     ${chalk.dim(module.objective)}`);
        }
        console.log(`     ${chalk.dim(`${module.lessons.length} lessons, ${formatDuration(moduleDuration)}`)}`);
        console.log("");

        for (const lesson of module.lessons) {
          const icon = lessonStatusIcon(lesson.status);
          const duration = chalk.dim(`(${lesson.duration} min)`);
          console.log(`     ${icon} ${lesson.id}: ${lesson.title} ${duration}`);
          if (lesson.objective) {
            console.log(`        ${chalk.dim(lesson.objective)}`);
          }
        }
        console.log("");
      }
    } else {
      console.log(chalk.yellow("  No modules defined yet."));
      console.log("");
      console.log(`  Add modules with: ${chalk.cyan(`coursekit add-module ${courseId} "Module Name"`)}`);
      console.log("");
    }

    // Next actions
    console.log(chalk.dim("Next Actions"));
    console.log("─".repeat(40));

    if (modules.length === 0) {
      console.log(`  ${chalk.cyan("→")} Add modules: ${chalk.cyan(`coursekit add-module ${courseId} "Module Name"`)}`);
    } else if (totalLessons === 0) {
      console.log(`  ${chalk.cyan("→")} Add lessons: ${chalk.cyan(`coursekit add-lesson ${courseId}/M1 "Lesson Title"`)}`);
    } else {
      const pendingLessons = lessonsByStatus["planned"] || 0;
      if (pendingLessons > 0) {
        console.log(`  ${chalk.cyan("→")} ${pendingLessons} lessons to draft`);
        console.log(`     Work on a lesson: ${chalk.cyan(`coursekit lesson ${courseId}/M1/L1`)}`);
      }

      const nextPhase = getNextPhase(course.phase);
      if (nextPhase) {
        console.log(`  ${chalk.cyan("→")} Advance phase: ${chalk.cyan(`coursekit ${nextPhase} ${courseId}`)}`);
      }
    }
    console.log("");

  } catch (error) {
    if (error instanceof Error && error.message.includes("No CourseKit database")) {
      console.log(chalk.yellow("No CourseKit project found."));
      console.log(`Run ${chalk.cyan("coursekit init <name>")} to create one.`);
      return;
    }
    throw error;
  }
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

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
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
