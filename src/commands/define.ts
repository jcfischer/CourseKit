/**
 * define command - Run DEFINE phase (interview + objectives)
 */

import chalk from "chalk";
import { getCourse, updateCoursePhase } from "../lib/database";
import { BLOOM_VERBS } from "../types";

interface DefineOptions {
  dryRun?: boolean;
}

export async function defineCommand(
  courseId: string,
  options: DefineOptions
): Promise<void> {
  const course = getCourse(courseId);

  if (!course) {
    console.log(chalk.red(`Course not found: ${courseId}`));
    process.exit(1);
  }

  if (options.dryRun) {
    console.log(chalk.blue("Dry run - would execute DEFINE phase"));
    console.log("");
    console.log("This phase will:");
    console.log("  1. Interview you about target audience");
    console.log("  2. Define learning objectives (with Bloom verbs)");
    console.log("  3. Establish assessment strategy");
    console.log("  4. Set scope boundaries");
    console.log("");
    console.log(`Output: ${course.coursePath}/define.md`);
    return;
  }

  console.log("");
  console.log(chalk.bold(`DEFINE Phase: ${course.name}`));
  console.log("─".repeat(60));
  console.log("");

  // Output the prompt for the AI interview
  console.log(chalk.blue("To complete the DEFINE phase, use this prompt with Claude:"));
  console.log("");
  console.log("─".repeat(60));
  console.log(generateDefinePrompt(course.id, course.name, course.context));
  console.log("─".repeat(60));
  console.log("");

  // Show Bloom's verbs reference
  console.log(chalk.bold("Bloom's Taxonomy Verbs Reference:"));
  console.log("");
  for (const [level, verbs] of Object.entries(BLOOM_VERBS)) {
    console.log(`  ${chalk.cyan(level.toUpperCase())}: ${verbs.slice(0, 5).join(", ")}`);
  }
  console.log("");

  console.log(chalk.yellow("After completing the interview:"));
  console.log(`  1. Update ${chalk.cyan(`${course.coursePath}/define.md`)}`);
  console.log(`  2. Run ${chalk.cyan(`coursekit complete ${courseId} --phase define`)}`);
  console.log("");

  // Update phase to indicate we've started
  updateCoursePhase(courseId, "define");
}

function generateDefinePrompt(
  courseId: string,
  name: string,
  context: string
): string {
  return `
# CourseKit DEFINE Phase Interview

I'm developing a ${context} course called "${name}" (${courseId}).

Please interview me to define:

## 1. Audience Analysis
- Who are my target learners?
- What prior knowledge do they have?
- What constraints do they face (time, technical level)?

## 2. Learning Objectives
Help me write 3-5 SMART learning objectives using Bloom's Taxonomy verbs:
- Remember: list, define, recall, identify
- Understand: explain, summarize, describe
- Apply: use, demonstrate, implement
- Analyze: compare, differentiate, examine
- Evaluate: assess, critique, justify
- Create: design, build, construct

Format: "By the end of this course, learners will be able to [VERB] [specific outcome]"

## 3. Assessment Strategy
For each objective, what assessment method will verify learning?
- Quizzes
- Projects
- Demonstrations
- Peer review

## 4. Scope Boundaries
- What's explicitly IN scope?
- What's explicitly OUT of scope?

After the interview, please generate a complete define.md file I can save.
`;
}
