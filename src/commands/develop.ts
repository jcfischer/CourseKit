/**
 * develop command - Run DEVELOP phase (content tasks)
 */

import chalk from "chalk";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { getCourse, updateCoursePhase, getModules, getLessons } from "../lib/database";

interface DevelopOptions {
  dryRun?: boolean;
}

export async function developCommand(
  courseId: string,
  options: DevelopOptions
): Promise<void> {
  const course = getCourse(courseId);

  if (!course) {
    console.log(chalk.red(`Course not found: ${courseId}`));
    process.exit(1);
  }

  // Check if DESIGN phase is complete
  if (course.phase !== "design" && course.phase !== "develop") {
    console.log(chalk.yellow("DESIGN phase not complete."));
    console.log(`Run ${chalk.cyan(`coursekit design ${courseId}`)} first.`);
    return;
  }

  if (options.dryRun) {
    console.log(chalk.blue("Dry run - would execute DEVELOP phase"));
    console.log("");
    console.log("This phase will:");
    console.log("  1. Create development tasks for each lesson");
    console.log("  2. Track: script, slides, exercises, assessment");
    console.log("  3. Enable AI-assisted content drafting");
    console.log("");
    console.log(`Output: ${course.coursePath}/develop.md`);
    return;
  }

  console.log("");
  console.log(chalk.bold(`DEVELOP Phase: ${course.name}`));
  console.log("─".repeat(60));
  console.log("");

  // Read design.md to extract module/lesson structure
  const designPath = join(course.coursePath || "", "design.md");
  let designContent = "";
  if (existsSync(designPath)) {
    designContent = readFileSync(designPath, "utf-8");
  }

  // Generate develop.md with task tracking
  const developContent = generateDevelopContent(courseId, designContent);
  const developPath = join(course.coursePath || "", "develop.md");
  writeFileSync(developPath, developContent);

  console.log(chalk.green(`Created: ${developPath}`));
  console.log("");

  console.log(chalk.bold("Development Tasks Created:"));
  console.log("");
  console.log("For each lesson, track:");
  console.log("  [ ] Script/outline");
  console.log("  [ ] Visual aids (slides, diagrams)");
  console.log("  [ ] Practice activity");
  console.log("  [ ] Assessment item");
  console.log("  [ ] Support materials");
  console.log("");

  console.log(chalk.blue("AI-Assisted Content:"));
  console.log(`  Use ${chalk.cyan(`coursekit lesson ${courseId}/M1/L1 --draft`)} to draft content`);
  console.log("");

  console.log(chalk.yellow("Update develop.md as you complete tasks."));
  console.log(`When ready: ${chalk.cyan(`coursekit complete ${courseId} --phase develop`)}`);
  console.log("");

  // Update phase
  updateCoursePhase(courseId, "develop");
}

function generateDevelopContent(courseId: string, designContent: string): string {
  // Parse modules and lessons from design.md (simplified)
  const modules = extractModulesFromDesign(designContent);

  let content = `# Development Tasks: ${courseId}

> Track content creation progress for each lesson.
> Mark tasks complete as you go: [ ] → [x]

## Task Legend

- **Script**: Lesson outline and spoken content
- **Slides**: Visual aids, diagrams, screenshots
- **Exercise**: Practice activity for learners
- **Assessment**: Quiz question or project component
- **Support**: Cheat sheet, links, additional resources

---

`;

  for (const module of modules) {
    content += `## ${module.id}: ${module.name}\n\n`;

    for (const lesson of module.lessons) {
      content += `### ${module.id}/${lesson.id}: ${lesson.title}\n\n`;
      content += `**Objective**: ${lesson.objective || "[From design.md]"}\n`;
      content += `**Duration**: ${lesson.duration || "10"} min\n\n`;
      content += `- [ ] Script\n`;
      content += `- [ ] Slides\n`;
      content += `- [ ] Exercise\n`;
      content += `- [ ] Assessment\n`;
      content += `- [ ] Support materials\n\n`;
    }
  }

  content += `---

## Notes

[Add development notes, blockers, decisions here]
`;

  return content;
}

interface ParsedModule {
  id: string;
  name: string;
  lessons: { id: string; title: string; objective?: string; duration?: string }[];
}

function extractModulesFromDesign(designContent: string): ParsedModule[] {
  // Simple regex-based extraction (can be enhanced)
  const modules: ParsedModule[] = [];
  const moduleRegex = /###\s+(M\d+):\s+(.+)/g;
  const lessonRegex = /\|\s*(L\d+)\s*\|\s*([^|]+)\s*\|\s*(\d+)\s*min\s*\|\s*([^|]+)\s*\|/g;

  let moduleMatch;
  let currentModule: ParsedModule | null = null;

  // Find all module headers
  const lines = designContent.split("\n");
  for (const line of lines) {
    const moduleHeaderMatch = line.match(/###\s+(M\d+):\s+(.+)/);
    if (moduleHeaderMatch) {
      if (currentModule) {
        modules.push(currentModule);
      }
      currentModule = {
        id: moduleHeaderMatch[1],
        name: moduleHeaderMatch[2].trim(),
        lessons: [],
      };
    }

    if (currentModule) {
      const lessonMatch = line.match(/\|\s*(L\d+)\s*\|\s*([^|]+)\s*\|\s*(\d+)\s*(?:min)?\s*\|\s*([^|]*)\s*\|/);
      if (lessonMatch) {
        currentModule.lessons.push({
          id: lessonMatch[1],
          title: lessonMatch[2].trim(),
          duration: lessonMatch[3],
          objective: lessonMatch[4]?.trim(),
        });
      }
    }
  }

  if (currentModule) {
    modules.push(currentModule);
  }

  // If no modules found, create placeholder
  if (modules.length === 0) {
    modules.push({
      id: "M1",
      name: "Module 1",
      lessons: [
        { id: "L1", title: "Lesson 1", duration: "10" },
        { id: "L2", title: "Lesson 2", duration: "10" },
      ],
    });
  }

  return modules;
}
