/**
 * design command - Run DESIGN phase (structure + modules)
 */

import chalk from "chalk";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getCourse, updateCoursePhase } from "../lib/database";

interface DesignOptions {
  dryRun?: boolean;
}

export async function designCommand(
  courseId: string,
  options: DesignOptions
): Promise<void> {
  const course = getCourse(courseId);

  if (!course) {
    console.log(chalk.red(`Course not found: ${courseId}`));
    process.exit(1);
  }

  // Check if DEFINE phase is complete
  if (course.phase === "none") {
    console.log(chalk.yellow("DEFINE phase not started."));
    console.log(`Run ${chalk.cyan(`coursekit define ${courseId}`)} first.`);
    return;
  }

  if (options.dryRun) {
    console.log(chalk.blue("Dry run - would execute DESIGN phase"));
    console.log("");
    console.log("This phase will:");
    console.log("  1. Structure course into modules");
    console.log("  2. Define lessons within each module");
    console.log("  3. Establish learning path (dependencies)");
    console.log("  4. Set time budgets");
    console.log("  5. Plan engagement strategy");
    console.log("");
    console.log(`Output: ${course.coursePath}/design.md`);
    return;
  }

  console.log("");
  console.log(chalk.bold(`DESIGN Phase: ${course.name}`));
  console.log("─".repeat(60));
  console.log("");

  // Read define.md if it exists
  let defineContent = "";
  const definePath = join(course.coursePath || "", "define.md");
  if (existsSync(definePath)) {
    defineContent = readFileSync(definePath, "utf-8");
  }

  // Output the prompt for the AI
  console.log(chalk.blue("To complete the DESIGN phase, use this prompt with Claude:"));
  console.log("");
  console.log("─".repeat(60));
  console.log(generateDesignPrompt(course.id, course.name, course.context, defineContent));
  console.log("─".repeat(60));
  console.log("");

  console.log(chalk.yellow("After completing the design:"));
  console.log(`  1. Update ${chalk.cyan(`${course.coursePath}/design.md`)}`);
  console.log(`  2. Run ${chalk.cyan(`coursekit complete ${courseId} --phase design`)}`);
  console.log("");

  // Update phase
  updateCoursePhase(courseId, "design");
}

function generateDesignPrompt(
  courseId: string,
  name: string,
  context: string,
  defineContent: string
): string {
  const contextDetails = context === "online"
    ? "self-paced online course with 5-15 minute videos"
    : "university semester course with 90-minute lectures";

  return `
# CourseKit DESIGN Phase

I'm designing the structure for "${name}" (${courseId}), a ${contextDetails}.

${defineContent ? `## Course Definition (from DEFINE phase)\n\n${defineContent}\n\n` : ""}

Please help me design:

## 1. Module Structure
Break the course into 3-8 modules, each with:
- Module name and number (M1, M2, etc.)
- Module objective (what learners achieve)
- 2-5 lessons per module
- Assessment for the module

For each lesson:
- Lesson ID (L1, L2, etc.)
- Title
- Duration (realistic for ${context})
- Learning objective with Bloom verb

## 2. Learning Path
- What's the dependency between modules?
- Are any modules optional/advanced?
- Visualize as a simple tree

## 3. Engagement Strategy
- Practice exercises per module
- Community activities (if applicable)
- Projects/hands-on work

## 4. Time Budget
- Total video/lecture hours
- Total exercise time
- Total project time

After discussion, generate a complete design.md file.
`;
}
