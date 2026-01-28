# F-1: Configuration Loading

## Problem Statement

CourseKit needs a configuration file (`coursekit.json`) to define:
1. Where the platform repository is located
2. Which courses exist and their mappings between source directory names and platform slugs

Without configuration, the sync tool doesn't know where to push content or how to map course IDs to slugs.

## Users & Context

**Primary user:** Course author running `coursekit push` from a source repository.

**Context:** The configuration file lives in the root of each source repository. Multiple source repos can exist, each with their own config pointing to the same platform.

## Requirements

### Functional
1. Load `coursekit.json` from current working directory
2. Validate required fields: `platform.path`, `courses` object
3. Support relative and absolute paths for `platform.path`
4. Map source directory names to platform slugs
5. Error clearly if config file missing or invalid

### Non-Functional
1. Load config in <10ms
2. Provide clear error messages with fix suggestions
3. Support JSON5 (trailing commas, comments) for developer convenience

## Configuration Schema

```typescript
interface CourseKitConfig {
  platform: {
    path: string;           // Required: path to platform repo
    remote?: string;        // Optional: git remote URL
  };
  courses: {
    [courseSlug: string]: {
      slug: string;         // Platform slug (e.g., "bridge-your-tana")
      sourceDir: string;    // Source directory (e.g., "courses/c-001-bridge-your-tana")
    };
  };
}
```

## Example Configuration

```json
{
  "platform": {
    "path": "../web/course-platform"
  },
  "courses": {
    "bridge-your-tana": {
      "slug": "bridge-your-tana",
      "sourceDir": "courses/c-001-bridge-your-tana"
    },
    "bridge-your-tana-complete": {
      "slug": "bridge-your-tana-complete",
      "sourceDir": "courses/c-002-bridge-your-tana-complete"
    }
  }
}
```

## Edge Cases

1. **Missing config file:** Error with "Run `coursekit init` to create configuration"
2. **Invalid JSON:** Error with line number and parse error
3. **Missing required field:** Error listing which fields are missing
4. **Platform path doesn't exist:** Error with "Platform directory not found: {path}"
5. **Source directory doesn't exist:** Warning (not error) - course may be new

## Success Criteria

1. [ ] `loadConfig()` returns typed config object
2. [ ] Missing file throws ConfigNotFoundError
3. [ ] Invalid JSON throws ConfigParseError with details
4. [ ] Missing fields throws ConfigValidationError
5. [ ] Relative paths resolved against CWD
6. [ ] Config loads in <10ms for typical file

## Out of Scope

- Creating config file (that's `coursekit init`)
- Validating platform repo structure
- Validating course content
