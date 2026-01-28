# F-6: Platform State Reading - Documentation

## Files Created

### New Files
- `src/lib/platform-state.ts` - Main readPlatformState function
- `src/lib/platform-state.test.ts` - Platform state tests (25 tests)
- `src/lib/platform-utils.ts` - Hashing, scanning, parsing utilities
- `src/lib/platform-utils.test.ts` - Utility tests (23 tests)

### Modified Files
- `src/types.ts` - Added platform state types

### Test Fixtures
- `test-fixtures/platform/single-course/` - Single course with lessons + platform fields
- `test-fixtures/platform/multi-course/` - Multiple courses with lessons and guides
- `test-fixtures/platform/empty-course/` - Empty course directory
- `test-fixtures/platform/corrupted/` - Lesson with malformed YAML

## Usage

```typescript
import { readPlatformState } from "./lib/platform-state";
import { loadConfig } from "./config";

// Load configuration
const config = await loadConfig();

// Read all platform state
const state = await readPlatformState(config);

console.log(`Found ${state.lessons.length} lessons on platform`);
console.log(`Found ${state.guides.length} guides on platform`);

// Process lessons
for (const lesson of state.lessons) {
  console.log(`- ${lesson.courseId}/${lesson.slug}`);
  console.log(`  Content hash: ${lesson.contentHash}`);
  console.log(`  Platform fields:`, lesson.platformFields);
}

// Check for warnings
if (state.warnings.length > 0) {
  console.log(`\nWarnings:`);
  for (const warning of state.warnings) {
    console.log(`  [${warning.code}] ${warning.message}`);
  }
}
```

## Platform Directory Structure

CourseKit expects Astro content collection structure:

```
platform-root/
└── src/
    └── content/
        ├── lessons/
        │   ├── course-a/
        │   │   ├── 01-intro.md
        │   │   └── 02-setup.md
        │   └── course-b/
        │       └── 01-basics.md
        └── guides/
            └── course-a/
                └── getting-started.md
```

## Platform-Owned Fields

These fields are managed by the platform and preserved during sync:

| Field | Type | Description |
|-------|------|-------------|
| `price` | number | Price in cents |
| `lemonSqueezyProductId` | string | LemonSqueezy product ID |
| `enrollmentCount` | number | Number of enrollments |
| `publishedAt` | string | ISO 8601 publish timestamp |

## Reading Options

```typescript
interface PlatformStateOptions {
  // Filter to a specific course
  courseId?: string;

  // Include only lessons
  lessonsOnly?: boolean;

  // Include only guides
  guidesOnly?: boolean;
}

// Example: Read only astro-course lessons
const state = await readPlatformState(config, {
  courseId: "astro-course",
  lessonsOnly: true,
});
```

## Content Hashing

Content hashes use SHA-256 and hash only the body content (excluding frontmatter).
This enables efficient change detection without comparing full file contents.

```typescript
import { hashContent } from "./lib/platform-utils";

const hash = hashContent("# Hello World\n\nContent here.");
// Returns 64-character hex string
```

## Warning Codes

| Code | Meaning |
|------|---------|
| `MISSING_CONTENT_DIR` | Platform src/content directory not found |
| `MALFORMED_FRONTMATTER` | YAML parse error in frontmatter |
| `READ_ERROR` | File read failed |
| `EMPTY_CONTENT` | File has no content |

## Return Type

```typescript
interface PlatformStateManifest {
  lessons: PlatformLesson[];
  guides: PlatformGuide[];
  warnings: PlatformStateWarning[];
  platformRoot: string;
  readAt: Date;
}

interface PlatformLesson {
  path: string;           // Absolute path
  relativePath: string;   // Relative to content/lessons
  courseId: string;       // Extracted from path
  slug: string;           // Filename without extension
  frontmatter: Record<string, unknown>;
  platformFields: PlatformOwnedFields;
  contentHash: string;    // SHA-256 of body
}
```

## Performance

- Uses Bun.Glob for efficient file scanning
- Parses frontmatter without reading entire file contents multiple times
- SHA-256 hashing for change detection
- Handles 50+ files across 5 courses in under 500ms
