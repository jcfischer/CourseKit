/**
 * lesson command - Work on a specific lesson
 */

import chalk from "chalk";
import { getCourse, getLessons, getModules, updateLessonStatus } from "../lib/database";

interface LessonOptions {
  draft?: boolean;
  status?: string;
}

export async function lessonCommand(
  path: string,
  options: LessonOptions
): Promise<void> {
  // Parse path: C-001/M1/L2
  const parts = path.split("/");
  if (parts.length !== 3) {
    console.log(chalk.red("Invalid path format. Use: C-001/M1/L2"));
    process.exit(1);
  }

  const [courseId, moduleId, lessonId] = parts;

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
    process.exit(1);
  }

  // Verify lesson exists
  const lessons = getLessons(courseId, moduleId);
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson) {
    console.log(chalk.red(`Lesson not found: ${lessonId}`));
    console.log(`Available lessons: ${lessons.map((l) => l.id).join(", ") || "none"}`);
    process.exit(1);
  }

  // Update status if provided
  if (options.status) {
    const validStatuses = ["planned", "drafted", "recorded", "edited", "published"];
    if (!validStatuses.includes(options.status)) {
      console.log(chalk.red(`Invalid status. Use: ${validStatuses.join(", ")}`));
      process.exit(1);
    }
    updateLessonStatus(courseId, moduleId, lessonId, options.status);
    console.log(chalk.green(`Updated ${path} status to: ${options.status}`));
    return;
  }

  // Draft content if requested
  if (options.draft) {
    console.log("");
    console.log(chalk.bold(`Draft Content: ${path}`));
    console.log("─".repeat(60));
    console.log("");
    console.log(chalk.blue("Use this prompt with Claude to draft content:"));
    console.log("");
    console.log("─".repeat(60));
    console.log(generateDraftPrompt(courseId, module.name, lesson));
    console.log("─".repeat(60));
    console.log("");
    console.log(chalk.yellow("After drafting:"));
    console.log(`  Save to: ${chalk.cyan(`${course.coursePath}/materials/${moduleId}/${lessonId}/script.md`)}`);
    console.log(`  Update status: ${chalk.cyan(`coursekit lesson ${path} --status drafted`)}`);
    return;
  }

  // Show lesson details
  console.log("");
  console.log(chalk.bold(`Lesson: ${path}`));
  console.log("─".repeat(60));
  console.log("");
  console.log(`  Title:     ${lesson.title}`);
  console.log(`  Objective: ${lesson.objective || "(not set)"}`);
  console.log(`  Duration:  ${lesson.duration} min`);
  console.log(`  Status:    ${lesson.status}`);
  console.log("");
  console.log(chalk.bold("Actions:"));
  console.log(`  Draft content:  ${chalk.cyan(`coursekit lesson ${path} --draft`)}`);
  console.log(`  Update status:  ${chalk.cyan(`coursekit lesson ${path} --status <status>`)}`);
  console.log("");
  console.log(`  Statuses: planned → drafted → recorded → edited → published`);
  console.log("");
}

interface LessonInfo {
  id: string;
  title: string;
  objective: string | null;
  duration: number;
  status: string;
}

function generateDraftPrompt(
  courseId: string,
  moduleName: string,
  lesson: LessonInfo
): string {
  return `
# CourseKit: Draft Lesson Content

Course: ${courseId}
Module: ${moduleName}
Lesson: ${lesson.id} - ${lesson.title}

## Learning Objective
${lesson.objective || "[Please specify the learning objective]"}

## Duration Target
${lesson.duration} minutes

---

Please help me draft content for this lesson:

## 1. Script/Outline
Create a structured outline that:
- Opens with a hook or problem statement
- Covers the core content (matching the objective)
- Includes examples or demonstrations
- Ends with a summary and call-to-action

## 2. Visual Aids
Suggest:
- Key slides or diagrams
- Screenshots or demos needed
- Any animations or transitions

## 3. Practice Activity
Design a hands-on exercise that:
- Reinforces the learning objective
- Can be completed in ~5-10 minutes
- Has a clear success criteria

## 4. Assessment Question
Create 1-2 quiz questions or reflection prompts that verify learning.

Please format the output as a complete lesson script.md file.
`;
}
