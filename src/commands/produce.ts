/**
 * produce command - Run PRODUCE phase (recording + editing)
 */

import chalk from "chalk";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { getCourse, updateCoursePhase } from "../lib/database";

interface ProduceOptions {
  dryRun?: boolean;
}

export async function produceCommand(
  courseId: string,
  options: ProduceOptions
): Promise<void> {
  const course = getCourse(courseId);

  if (!course) {
    console.log(chalk.red(`Course not found: ${courseId}`));
    process.exit(1);
  }

  // Check if DEVELOP phase is complete
  if (course.phase !== "develop" && course.phase !== "produce") {
    console.log(chalk.yellow("DEVELOP phase not complete."));
    console.log(`Run ${chalk.cyan(`coursekit develop ${courseId}`)} first.`);
    return;
  }

  if (options.dryRun) {
    console.log(chalk.blue("Dry run - would execute PRODUCE phase"));
    console.log("");
    console.log("This phase will:");
    console.log("  1. Track recording progress per lesson");
    console.log("  2. Track editing status");
    console.log("  3. Track platform upload");
    console.log("  4. Verify access works");
    console.log("");
    console.log(`Output: ${course.coursePath}/produce.md`);
    return;
  }

  console.log("");
  console.log(chalk.bold(`PRODUCE Phase: ${course.name}`));
  console.log("─".repeat(60));
  console.log("");

  // Read develop.md to get lesson structure
  const developPath = join(course.coursePath || "", "develop.md");
  let developContent = "";
  if (existsSync(developPath)) {
    developContent = readFileSync(developPath, "utf-8");
  }

  // Generate produce.md with production tracking
  const produceContent = generateProduceContent(courseId, developContent);
  const producePath = join(course.coursePath || "", "produce.md");
  writeFileSync(producePath, produceContent);

  console.log(chalk.green(`Created: ${producePath}`));
  console.log("");

  console.log(chalk.bold("Production Checklist:"));
  console.log("");
  console.log("For each lesson:");
  console.log("  [ ] Recorded");
  console.log("  [ ] Edited");
  console.log("  [ ] Uploaded");
  console.log("  [ ] Access tested");
  console.log("");

  console.log(chalk.blue("Recording Tips:"));
  console.log("  - Do one practice run before recording");
  console.log("  - Record in one take (imperfections are fine)");
  console.log("  - Minimal editing: cut dead air, add bumpers");
  console.log("");

  console.log(chalk.yellow("Update produce.md as you complete recordings."));
  console.log(`When ready: ${chalk.cyan(`coursekit complete ${courseId}`)}`);
  console.log("");

  // Update phase
  updateCoursePhase(courseId, "produce");
}

function generateProduceContent(courseId: string, developContent: string): string {
  // Extract lesson paths from develop.md
  const lessons = extractLessonsFromDevelop(developContent);

  let content = `# Production Status: ${courseId}

> Track recording, editing, and publishing progress.
> Update checkboxes as you complete each step.

## Production Workflow

1. **Record** - Capture video/audio
2. **Edit** - Cut, add intro/outro, cleanup
3. **Upload** - Push to platform
4. **Test** - Verify access works

---

## Lessons

`;

  for (const lesson of lessons) {
    content += `### ${lesson.path}: ${lesson.title}\n\n`;
    content += `- [ ] Recorded\n`;
    content += `- [ ] Edited\n`;
    content += `- [ ] Uploaded\n`;
    content += `- [ ] Access tested\n\n`;
    content += `**Notes**: \n\n`;
  }

  content += `---

## Platform Setup

- [ ] Course created on platform
- [ ] Pricing configured
- [ ] Welcome email set up
- [ ] Discord/community linked
- [ ] Payment flow tested

## Pre-Launch Checklist

- [ ] All lessons accessible
- [ ] No broken links
- [ ] Downloadable resources attached
- [ ] Support channel ready

---

## Notes

[Recording equipment, platform issues, etc.]
`;

  return content;
}

interface ParsedLesson {
  path: string;
  title: string;
}

function extractLessonsFromDevelop(developContent: string): ParsedLesson[] {
  const lessons: ParsedLesson[] = [];
  const lessonRegex = /###\s+(M\d+\/L\d+):\s+(.+)/g;

  let match;
  while ((match = lessonRegex.exec(developContent)) !== null) {
    lessons.push({
      path: match[1],
      title: match[2].trim(),
    });
  }

  // If no lessons found, create placeholder
  if (lessons.length === 0) {
    lessons.push(
      { path: "M1/L1", title: "Lesson 1" },
      { path: "M1/L2", title: "Lesson 2" }
    );
  }

  return lessons;
}
