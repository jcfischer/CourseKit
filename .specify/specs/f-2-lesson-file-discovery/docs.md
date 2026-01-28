# F-2: Lesson File Discovery - Documentation

## Files Created

### New Files
- `src/lib/discovery-utils.ts` - Filename parsing and frontmatter extraction utilities
- `src/lib/discovery-utils.test.ts` - Utility tests (29 tests)
- `src/lib/discovery.ts` - Main discovery module with scan and discover functions
- `src/lib/discovery.test.ts` - Discovery tests (20 tests)
- `test-fixtures/` - Test fixture directories for all scenarios

### Modified Files
- `src/types.ts` - Added discovery-related types (LessonFrontmatter, DiscoveredLesson, etc.)
- `package.json` - Added `yaml` dependency

## Usage

```typescript
import { discoverLessons } from "./lib/discovery";
import type { CourseKitConfig } from "./types";

const config: CourseKitConfig = { /* ... */ };

// Discover all lessons in cwd
const manifest = discoverLessons(config);

// Discover specific course
const manifest = discoverLessons(config, { courseId: "my-course" });

// Include raw frontmatter
const manifest = discoverLessons(config, { includeRaw: true });

// Access results
console.log(manifest.lessons);    // DiscoveredLesson[]
console.log(manifest.warnings);   // DiscoveryWarning[]
console.log(manifest.sourceRoot); // string
```

## Types Reference

| Type | Description |
|------|-------------|
| `LessonFrontmatter` | Parsed YAML frontmatter fields |
| `DiscoveredLesson` | Lesson file with path, order, slug, frontmatter |
| `DiscoveryWarning` | Non-fatal issue (path, code, message) |
| `DiscoveryWarningCode` | Warning type: INVALID_FILENAME, MALFORMED_FRONTMATTER, etc. |
| `LessonManifest` | Complete discovery result |
| `DiscoveryOptions` | Options (courseId, includeRaw) |

## Expected Directory Structure

```
source-repo/
└── courses/
    └── {course-id}/
        └── lessons/
            ├── 01-intro.md
            ├── 02-setup.md
            └── 03-advanced.md
```

## Lesson Filename Format

```
{NN}-{slug}.md

Where:
- NN = two or more digit order (01, 02, 10, 100)
- slug = lowercase kebab-case identifier
```

## Warning Codes

| Code | Description |
|------|-------------|
| `INVALID_FILENAME` | Filename doesn't match NN-slug.md pattern |
| `MALFORMED_FRONTMATTER` | YAML parsing error in frontmatter |
| `MISSING_LESSONS_DIR` | Course has no lessons/ directory |
| `EMPTY_LESSONS_DIR` | lessons/ directory has no .md files |
| `READ_ERROR` | Failed to read file |
