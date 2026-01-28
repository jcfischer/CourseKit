/**
 * init command - Initialize a new course project
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import {
  initDatabase,
  createCourse,
  updateCoursePath,
  findDatabase,
} from "../lib/database";
import type { CourseContext } from "../types";

interface InitOptions {
  context: string;
  description?: string;
  fromPlan?: string;
  force?: boolean;
}

export async function initCommand(
  name: string,
  options: InitOptions
): Promise<void> {
  // Check if database already exists
  const existingDb = findDatabase();
  if (existingDb && !options.force) {
    console.log(
      chalk.yellow("CourseKit database already exists in this project.")
    );
    console.log(`Use ${chalk.cyan("--force")} to reinitialize.`);
    return;
  }

  // Validate context
  const context = options.context as CourseContext;
  if (context !== "online" && context !== "university") {
    console.log(
      chalk.red(`Invalid context: ${context}. Use 'online' or 'university'.`)
    );
    process.exit(1);
  }

  // Initialize database
  console.log(chalk.blue("Initializing CourseKit..."));
  initDatabase();

  // Create course
  const description = options.description || `A ${context} course`;
  const course = createCourse(name, description, context);

  // Create course directory
  const courseDirName = `${course.id.toLowerCase()}-${slugify(name)}`;
  const courseDir = join(process.cwd(), "courses", courseDirName);
  mkdirSync(join(courseDir, "materials"), { recursive: true });

  // Update course with path
  updateCoursePath(course.id, courseDir);

  // Create initial files
  createInitialFiles(courseDir, course.id, name, context);

  // Output success
  console.log("");
  console.log(chalk.green("Course initialized successfully!"));
  console.log("");
  console.log(`  Course ID:   ${chalk.cyan(course.id)}`);
  console.log(`  Name:        ${name}`);
  console.log(`  Context:     ${context}`);
  console.log(`  Directory:   ${courseDir}`);
  console.log("");
  console.log(chalk.blue("Next steps:"));
  console.log(`  1. Run ${chalk.cyan(`coursekit define ${course.id}`)} to define learning objectives`);
  console.log(`  2. Run ${chalk.cyan(`coursekit design ${course.id}`)} to structure modules`);
  console.log(`  3. Run ${chalk.cyan(`coursekit status`)} to view progress`);
  console.log("");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createInitialFiles(
  courseDir: string,
  courseId: string,
  name: string,
  context: CourseContext
): void {
  // Create define.md template
  const defineContent = `# Course Definition: ${name}

> This file is created during the DEFINE phase.
> Run \`coursekit define ${courseId}\` to complete it through an interview.

## Audience

### Who are they?
[To be defined]

### Prior knowledge required
- [Prerequisite 1]
- [Prerequisite 2]

### Constraints
- Time available: [X hours/week]
- Technical level: [Beginner/Intermediate/Advanced]

## Learning Objectives

By the end of this course, learners will be able to:

1. **[Bloom Verb]** [specific, measurable outcome]
2. **[Bloom Verb]** [specific, measurable outcome]
3. **[Bloom Verb]** [specific, measurable outcome]

## Assessment Strategy

| Objective | Assessment Method | When |
|-----------|-------------------|------|
| 1 | [Quiz/Project/Demo] | [Module X] |
| 2 | [Quiz/Project/Demo] | [Module Y] |

## Context

- **Format**: ${context === "online" ? "Online (self-paced)" : "University (semester)"}
- **Duration**: [X weeks / Self-paced]
- **Session length**: ${context === "online" ? "[5-15 minutes per video]" : "[90 minutes per lecture]"}

## Scope

### In Scope
- [Topic 1]
- [Topic 2]

### Out of Scope
- [Explicitly excluded topic]
`;

  // Create design.md template
  const designContent = `# Course Design: ${name}

> This file is created during the DESIGN phase.
> Run \`coursekit design ${courseId}\` to complete it.

## Module Structure

### M1: [Module Name]${context === "university" ? " (Week 1-2)" : ""}
**Objective**: [What learners achieve]

| Lesson | Title | Duration | Objective |
|--------|-------|----------|-----------|
| L1 | [Title] | 10 min | [Bloom verb + outcome] |
| L2 | [Title] | 8 min | [Bloom verb + outcome] |

**Assessment**: [Quiz/Project for this module]

### M2: [Module Name]${context === "university" ? " (Week 3-4)" : ""}
...

## Learning Path

\`\`\`
M1 (Foundation)
  └─→ M2 (Core Skills)
        └─→ M3 (Application)
              └─→ M4 (Advanced) [Optional]
\`\`\`

## Engagement Strategy

- **Practice**: [Exercises per module]
- **Community**: [Discord/Forum activities]
- **Projects**: [Hands-on projects]

## Time Budget

| Component | Hours |
|-----------|-------|
| Videos/Lectures | X |
| Exercises | X |
| Projects | X |
| **Total** | X |
`;

  writeFileSync(join(courseDir, "define.md"), defineContent);
  writeFileSync(join(courseDir, "design.md"), designContent);
}
