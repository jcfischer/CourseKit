/**
 * add-module command - Add a new module to a course
 */

import chalk from "chalk";
import { getCourse, addModule, getModules } from "../lib/database";

interface AddModuleOptions {
  objective?: string;
}

export async function addModuleCommand(
  courseId: string,
  name: string,
  options: AddModuleOptions
): Promise<void> {
  const course = getCourse(courseId);

  if (!course) {
    console.log(chalk.red(`Course not found: ${courseId}`));
    process.exit(1);
  }

  // Get existing modules to determine next ID
  const modules = getModules(courseId);
  const nextNum = modules.length + 1;
  const moduleId = `M${nextNum}`;

  addModule(courseId, moduleId, name, options.objective);

  console.log(chalk.green(`Added module: ${moduleId} - ${name}`));
  console.log("");
  console.log(`Add lessons with: ${chalk.cyan(`coursekit add-lesson ${courseId}/${moduleId} "Lesson Title"`)}`);
}
