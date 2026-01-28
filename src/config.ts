/**
 * Configuration loading for CourseKit sync (F-1)
 *
 * Loads and validates coursekit.json from the working directory.
 */

import { z } from "zod";
import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import type { CourseKitConfig } from "./types";

// =============================================================================
// Zod Schemas
// =============================================================================

const CourseMappingSchema = z.object({
  slug: z.string().min(1, "slug must not be empty"),
  sourceDir: z.string().min(1, "sourceDir must not be empty"),
});

const PlatformConfigSchema = z.object({
  path: z.string().min(1, "platform.path must not be empty"),
  remote: z.string().optional(),
});

export const CourseKitConfigSchema = z.object({
  platform: PlatformConfigSchema,
  courses: z.record(z.string(), CourseMappingSchema),
});

// =============================================================================
// Error Classes
// =============================================================================

export class ConfigNotFoundError extends Error {
  constructor(public configPath: string) {
    super(
      `Configuration file not found: ${configPath}\nRun 'coursekit init' to create one.`
    );
    this.name = "ConfigNotFoundError";
  }
}

export class ConfigParseError extends Error {
  constructor(
    public configPath: string,
    public parseError: Error
  ) {
    super(`Invalid JSON in ${configPath}: ${parseError.message}`);
    this.name = "ConfigParseError";
  }
}

export class ConfigValidationError extends Error {
  constructor(
    public configPath: string,
    public issues: z.ZodIssue[]
  ) {
    super(
      `Configuration validation failed in ${configPath}:\n${formatIssues(issues)}`
    );
    this.name = "ConfigValidationError";
  }
}

function formatIssues(issues: z.ZodIssue[]): string {
  return issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
}

// =============================================================================
// Config Loading
// =============================================================================

const CONFIG_FILENAME = "coursekit.json";

/**
 * Load and validate coursekit.json from the given directory (defaults to cwd).
 * Resolves relative platform.path against the config file's directory.
 * Verifies the platform directory exists.
 */
export async function loadConfig(cwd?: string): Promise<CourseKitConfig> {
  const dir = cwd ?? process.cwd();
  const configPath = join(dir, CONFIG_FILENAME);

  // 1. Check file exists
  if (!existsSync(configPath)) {
    throw new ConfigNotFoundError(configPath);
  }

  // 2. Read and parse JSON
  let raw: unknown;
  try {
    const content = readFileSync(configPath, "utf-8");
    raw = JSON.parse(content);
  } catch (err) {
    throw new ConfigParseError(configPath, err as Error);
  }

  // 3. Validate schema
  const result = CourseKitConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new ConfigValidationError(configPath, result.error.issues);
  }

  const config = result.data as CourseKitConfig;

  // 4. Resolve relative platform path
  config.platform.path = resolve(dir, config.platform.path);

  // 5. Verify platform directory exists
  if (!existsSync(config.platform.path)) {
    throw new ConfigValidationError(configPath, [
      {
        code: "custom",
        path: ["platform", "path"],
        message: `Platform directory not found: ${config.platform.path}`,
      },
    ]);
  }

  return config;
}
