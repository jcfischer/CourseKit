/**
 * validate command - Validate phase completion
 */

import chalk from "chalk";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { getCourse, getModules, getLessons } from "../lib/database";
import type { CoursePhase } from "../types";

interface ValidateOptions {
  phase?: string;
  json?: boolean;
}

interface ValidationResult {
  phase: string;
  valid: boolean;
  issues: string[];
}

export async function validateCommand(
  courseId: string,
  options: ValidateOptions
): Promise<void> {
  const course = getCourse(courseId);

  if (!course) {
    console.log(chalk.red(`Course not found: ${courseId}`));
    process.exit(1);
  }

  const results: ValidationResult[] = [];

  if (options.phase) {
    // Validate specific phase
    const result = validatePhase(
      options.phase as CoursePhase,
      courseId,
      course.coursePath
    );
    results.push(result);
  } else {
    // Validate all phases
    const phases: CoursePhase[] = ["define", "design", "develop", "produce"];
    for (const phase of phases) {
      const result = validatePhase(phase, courseId, course.coursePath);
      results.push(result);
    }
  }

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // Display results
  console.log("");
  console.log(chalk.bold(`Validation: ${course.name}`));
  console.log("─".repeat(60));
  console.log("");

  let allValid = true;

  for (const result of results) {
    const icon = result.valid ? chalk.green("✓") : chalk.red("✗");
    console.log(`${icon} ${result.phase.toUpperCase()}`);

    if (result.issues.length > 0) {
      allValid = false;
      for (const issue of result.issues) {
        console.log(chalk.dim(`    ${issue}`));
      }
    }
  }

  console.log("");

  if (allValid) {
    console.log(chalk.green("All validations passed!"));
  } else {
    console.log(chalk.yellow("Fix issues above before proceeding."));
  }
  console.log("");
}

function validatePhase(
  phase: CoursePhase,
  courseId: string,
  coursePath: string | null
): ValidationResult {
  const issues: string[] = [];

  if (!coursePath) {
    return { phase, valid: false, issues: ["Course path not set"] };
  }

  switch (phase) {
    case "define":
      issues.push(...validateDefine(coursePath));
      break;
    case "design":
      issues.push(...validateDesign(coursePath));
      break;
    case "develop":
      issues.push(...validateDevelop(coursePath, courseId));
      break;
    case "produce":
      issues.push(...validateProduce(coursePath));
      break;
  }

  return {
    phase,
    valid: issues.length === 0,
    issues,
  };
}

function validateDefine(coursePath: string): string[] {
  const issues: string[] = [];
  const definePath = join(coursePath, "define.md");

  if (!existsSync(definePath)) {
    issues.push("define.md not found");
    return issues;
  }

  const content = readFileSync(definePath, "utf-8");

  // Check for required sections
  if (!content.includes("## Audience")) {
    issues.push("Missing Audience section");
  }
  if (!content.includes("## Learning Objectives")) {
    issues.push("Missing Learning Objectives section");
  }
  if (!content.includes("## Assessment Strategy")) {
    issues.push("Missing Assessment Strategy section");
  }
  if (!content.includes("## Scope")) {
    issues.push("Missing Scope section");
  }

  // Check for placeholder text
  if (content.includes("[To be defined]")) {
    issues.push("Contains placeholder text '[To be defined]'");
  }

  return issues;
}

function validateDesign(coursePath: string): string[] {
  const issues: string[] = [];
  const designPath = join(coursePath, "design.md");

  if (!existsSync(designPath)) {
    issues.push("design.md not found");
    return issues;
  }

  const content = readFileSync(designPath, "utf-8");

  // Check for module structure
  if (!content.includes("## Module Structure") && !content.includes("### M1")) {
    issues.push("No module structure defined");
  }

  // Check for at least one lesson table
  if (!content.includes("| L")) {
    issues.push("No lessons defined in module tables");
  }

  return issues;
}

function validateDevelop(coursePath: string, courseId: string): string[] {
  const issues: string[] = [];
  const developPath = join(coursePath, "develop.md");

  if (!existsSync(developPath)) {
    issues.push("develop.md not found");
    return issues;
  }

  const content = readFileSync(developPath, "utf-8");

  // Count uncompleted tasks
  const uncheckedTasks = (content.match(/- \[ \]/g) || []).length;
  const checkedTasks = (content.match(/- \[x\]/gi) || []).length;
  const total = uncheckedTasks + checkedTasks;

  if (total > 0) {
    const percent = Math.round((checkedTasks / total) * 100);
    if (percent < 80) {
      issues.push(`Only ${percent}% of tasks completed (${checkedTasks}/${total})`);
    }
  }

  return issues;
}

function validateProduce(coursePath: string): string[] {
  const issues: string[] = [];
  const producePath = join(coursePath, "produce.md");

  if (!existsSync(producePath)) {
    issues.push("produce.md not found");
    return issues;
  }

  const content = readFileSync(producePath, "utf-8");

  // Count uncompleted production tasks
  const uncheckedTasks = (content.match(/- \[ \]/g) || []).length;
  const checkedTasks = (content.match(/- \[x\]/gi) || []).length;
  const total = uncheckedTasks + checkedTasks;

  if (total > 0) {
    const percent = Math.round((checkedTasks / total) * 100);
    if (percent < 100) {
      issues.push(`Production ${percent}% complete (${checkedTasks}/${total} tasks)`);
    }
  }

  // Check for platform setup
  if (content.includes("## Platform Setup")) {
    const platformSection = content.split("## Platform Setup")[1]?.split("##")[0] || "";
    const platformUnchecked = (platformSection.match(/- \[ \]/g) || []).length;
    if (platformUnchecked > 0) {
      issues.push(`${platformUnchecked} platform setup tasks incomplete`);
    }
  }

  return issues;
}
