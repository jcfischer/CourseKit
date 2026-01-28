# F-3: Frontmatter Validation - Documentation

## Files Created

### New Files
- `src/lib/validation.ts` - Validation module with Zod schema and functions
- `src/lib/validation.test.ts` - Comprehensive test suite (33 tests)

### Modified Files
- `src/types.ts` - Added ValidationIssue, FileValidation, ValidationWarning, ValidationResult types

## Usage

```typescript
import { validateLessonFrontmatter, validateAllLessons } from "./lib/validation";
import { loadConfig } from "./config";
import { discoverLessons } from "./lib/discovery";

// Load dependencies
const config = await loadConfig();
const manifest = discoverLessons(config);

// Validate all lessons
const result = validateAllLessons(manifest, config);

if (!result.valid) {
  console.log(`${result.invalidFiles} files have errors`);
  for (const file of result.files) {
    console.log(`\n${file.relativePath}:`);
    for (const error of file.errors) {
      console.log(`  - ${error.field}: ${error.message}`);
      if (error.suggestion) {
        console.log(`    → ${error.suggestion}`);
      }
    }
  }
}

// Check for duplicate order warnings
for (const warning of result.warnings) {
  console.log(`Warning: ${warning.message}`);
}
```

## Required Frontmatter Fields

| Field | Type | Description |
|-------|------|-------------|
| `courseSlug` | string | Must match a course in config |
| `moduleId` | string | Non-empty module identifier |
| `title` | string | Non-empty lesson title |
| `order` | number | Positive integer (1, 2, 3...) |

## Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Lesson description |
| `durationMinutes` | number | Estimated duration |
| `draft` | boolean | Draft status |
| `resources` | array | Downloadable resources |

Unknown fields are allowed and passed through.

## Validation Flow

1. Check frontmatter exists (from F-2 discovery)
2. Run Zod schema validation for required fields
3. Cross-reference courseSlug against config.courses
4. Aggregate all errors per file (not just first)
5. Detect duplicate order values within same module
6. Return ValidationResult with stats and warnings

## Error Types

| Error | Suggestion |
|-------|------------|
| Missing frontmatter | Add YAML frontmatter between --- delimiters |
| Missing courseSlug | Add courseSlug field |
| Missing moduleId | Add moduleId field |
| Missing title | Add title field |
| Missing/invalid order | Add order as positive integer |
| Unknown courseSlug | Lists available courses |
| Duplicate order | Warning with conflicting files |
