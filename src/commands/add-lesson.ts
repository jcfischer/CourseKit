/**
 * add-lesson command - Add a new lesson to a module
 */

import chalk from "chalk";
import { getCourse, addLesson, getLessons, getModules } from "../lib/database";
import { detectBloomLevel } from "../types";

interface AddLessonOptions {
  objective?: string;
  duration?: string;
}

export async function addLessonCommand(
  path: string,
  title: string,
  options: AddLessonOptions
): Promise<void> {
  // Parse path: C-001/M1
  const parts = path.split("/");
  if (parts.length !== 2) {
    console.log(chalk.red("Invalid path format. Use: C-001/M1"));
    process.exit(1);
  }

  const [courseId, moduleId] = parts;

  const course = getCourse(courseId);
  if (!course) {
    console.log(chalk.red(`Course not found: ${courseId}`));
    process.exit(1);
  }

  // Verify module exists
  const modules = getModules(courseId);
  const module = modules.find((m) => m.id === moduleId);
  if (!module) {
    console.log(chalk.red(`Module not found: ${moduleId}`));
    console.log(`Available modules: ${modules.map((m) => m.id).join(", ") || "none"}`);
    process.exit(1);
  }

  // Get existing lessons to determine next ID
  const lessons = getLessons(courseId, moduleId);
  const nextNum = lessons.length + 1;
  const lessonId = `L${nextNum}`;

  // Check Bloom's verb if objective provided
  if (options.objective) {
    const bloomLevel = detectBloomLevel(options.objective);
    if (!bloomLevel) {
      console.log(chalk.yellow("Tip: Include a Bloom's Taxonomy verb in your objective:"));
      console.log("  Remember: list, define, recall");
      console.log("  Understand: explain, describe, summarize");
      console.log("  Apply: use, demonstrate, implement");
      console.log("  Analyze: compare, differentiate, examine");
      console.log("  Evaluate: assess, critique, justify");
      console.log("  Create: design, build, construct");
      console.log("");
    } else {
      console.log(chalk.dim(`Bloom level detected: ${bloomLevel}`));
    }
  }

  const duration = options.duration ? parseInt(options.duration, 10) : 10;

  addLesson(courseId, moduleId, lessonId, title, options.objective, duration);

  console.log(chalk.green(`Added lesson: ${moduleId}/${lessonId} - ${title}`));
  console.log("");
  console.log(`Work on it: ${chalk.cyan(`coursekit lesson ${courseId}/${moduleId}/${lessonId}`)}`);
}
