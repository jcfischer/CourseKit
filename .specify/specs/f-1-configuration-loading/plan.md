# F-1: Configuration Loading - Technical Plan

## Architecture Decision

**Approach:** Single `config.ts` module exporting `loadConfig()` function with Zod schema validation.

**Rationale:**
- Zod provides runtime validation with TypeScript type inference
- Single module keeps config logic contained
- No external dependencies beyond Zod (already common in PAI projects)

## File Structure

```
src/
├── config.ts           # Config loading and validation
├── config.test.ts      # Config tests
└── types.ts            # Shared types (CourseKitConfig)
```

## Data Model

```typescript
// types.ts
export interface CourseMapping {
  slug: string;
  sourceDir: string;
}

export interface PlatformConfig {
  path: string;
  remote?: string;
}

export interface CourseKitConfig {
  platform: PlatformConfig;
  courses: Record<string, CourseMapping>;
}

// config.ts
import { z } from 'zod';

const CourseMappingSchema = z.object({
  slug: z.string().min(1),
  sourceDir: z.string().min(1),
});

const PlatformConfigSchema = z.object({
  path: z.string().min(1),
  remote: z.string().optional(),
});

const CourseKitConfigSchema = z.object({
  platform: PlatformConfigSchema,
  courses: z.record(z.string(), CourseMappingSchema),
});
```

## API Contract

```typescript
// Main function
export async function loadConfig(cwd?: string): Promise<CourseKitConfig>;

// Error types
export class ConfigNotFoundError extends Error {
  constructor(public path: string) {
    super(`Configuration file not found: ${path}\nRun 'coursekit init' to create one.`);
  }
}

export class ConfigParseError extends Error {
  constructor(public path: string, public parseError: Error) {
    super(`Invalid JSON in ${path}: ${parseError.message}`);
  }
}

export class ConfigValidationError extends Error {
  constructor(public path: string, public issues: z.ZodIssue[]) {
    super(`Configuration validation failed:\n${formatIssues(issues)}`);
  }
}
```

## Implementation Steps

1. Define Zod schemas for config structure
2. Implement `loadConfig()` with file reading
3. Add path resolution (relative → absolute)
4. Add error classes with helpful messages
5. Write tests for happy path and error cases

## Failure Mode Analysis

| Failure | Detection | Recovery |
|---------|-----------|----------|
| File not found | `ENOENT` from fs | Throw ConfigNotFoundError |
| Invalid JSON | JSON.parse throws | Throw ConfigParseError |
| Schema violation | Zod parse fails | Throw ConfigValidationError |
| Platform path missing | fs.existsSync check | Throw ConfigValidationError |

## Test Strategy

```typescript
// config.test.ts
describe('loadConfig', () => {
  it('loads valid config from coursekit.json');
  it('resolves relative platform path against cwd');
  it('throws ConfigNotFoundError when file missing');
  it('throws ConfigParseError on invalid JSON');
  it('throws ConfigValidationError when platform.path missing');
  it('throws ConfigValidationError when courses empty');
  it('throws ConfigValidationError when platform path does not exist');
});
```

## Dependencies

- `zod` - Schema validation
- `bun:fs` - File system operations
- `node:path` - Path resolution

## Estimated Effort

~1 hour implementation + tests
