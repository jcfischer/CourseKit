# F-7: Diff Calculation - Documentation

## Files Created

### New Files
- `src/lib/diff-utils.ts` - Normalization, matching, comparison utilities
- `src/lib/diff-utils.test.ts` - Diff utilities tests (34 tests)
- `src/lib/diff.ts` - Main diff calculation functions
- `src/lib/diff.test.ts` - Diff calculation tests (16 tests)

### Modified Files
- `src/types.ts` - Added diff types (DiffStatus, FieldChange, DiffItem, DiffResult, etc.)
- `src/lib/discovery.ts` - Added sourceRoot option support
- `src/lib/platform-state.ts` - Consistent slug extraction with source discovery

### Test Fixtures
- `test-fixtures/diff/scenario-1/` - 10 source, 4 platform (6 added)
- `test-fixtures/diff/scenario-2/` - Identical content (no changes)
- `test-fixtures/diff/scenario-3/` - Modified body content
- `test-fixtures/diff/scenario-4/` - Deleted from source
- `test-fixtures/diff/scenario-5/` - Platform-owned fields only
- `test-fixtures/diff/scenario-6/` - Frontmatter-only changes

## Usage

```typescript
import { calculateLessonDiff, calculateGuideDiff } from "./lib/diff";
import { loadConfig } from "./config";

// Load configuration
const config = await loadConfig();

// Calculate lesson differences
const lessonDiff = await calculateLessonDiff(config);

console.log(`Summary:`);
console.log(`  Added: ${lessonDiff.summary.added}`);
console.log(`  Modified: ${lessonDiff.summary.modified}`);
console.log(`  Removed: ${lessonDiff.summary.removed}`);
console.log(`  Unchanged: ${lessonDiff.summary.unchanged}`);

// Process diff items
for (const item of lessonDiff.items) {
  console.log(`[${item.status.toUpperCase()}] ${item.key}`);

  if (item.status === "modified") {
    if (item.bodyChanged) {
      console.log(`  - Body content changed`);
    }
    for (const change of item.changes) {
      console.log(`  - Field "${change.field}": ${change.changeType}`);
    }
  }
}

// Filter by course
const courseDiff = await calculateLessonDiff(config, {
  courseId: "astro-course"
});

// Include unchanged items
const fullDiff = await calculateLessonDiff(config, {
  includeUnchanged: true
});
```

## Diff Types

### DiffStatus

```typescript
type DiffStatus = "added" | "modified" | "removed" | "unchanged";
```

### FieldChange

```typescript
interface FieldChange {
  field: string;
  sourceValue?: unknown;
  platformValue?: unknown;
  changeType: "added" | "modified" | "removed";
}
```

### DiffItem

```typescript
interface DiffItem {
  key: string;          // Canonical key (courseId/slug)
  courseId: string;
  slug: string;
  status: DiffStatus;
  sourcePath?: string;
  platformPath?: string;
  changes: FieldChange[];
  bodyChanged: boolean;
}
```

### DiffResult

```typescript
interface DiffResult {
  contentType: "lessons" | "guides";
  items: DiffItem[];
  summary: DiffSummary;
  calculatedAt: Date;
}
```

## Utility Functions

### normalizeContent

Normalizes content for consistent comparison:
- Trims leading/trailing whitespace
- Normalizes line endings to LF
- Collapses multiple blank lines
- Removes trailing whitespace from lines

```typescript
import { normalizeContent } from "./lib/diff-utils";

const normalized = normalizeContent("hello  \r\n\r\n\r\nworld");
// Returns: "hello\n\nworld"
```

### matchFilesBySlug

Matches source and platform files by canonical key:

```typescript
import { matchFilesBySlug } from "./lib/diff-utils";

const matches = matchFilesBySlug(sourceLessons, platformLessons);
// Returns Map<string, { source?, platform? }>
```

### compareFrontmatter

Compares frontmatter, excluding protected fields:

```typescript
import { compareFrontmatter } from "./lib/diff-utils";

const changes = compareFrontmatter(
  sourceFrontmatter,
  platformFrontmatter,
  ["price", "enrollmentCount"]  // Protected fields to ignore
);
```

### classifyDiffStatus

Classifies the diff status for a file pair:

```typescript
import { classifyDiffStatus } from "./lib/diff-utils";

const result = classifyDiffStatus(
  sourceFrontmatter,
  sourceHash,
  platformFrontmatter,
  platformHash,
  protectedFields
);
// Returns { status, changes, bodyChanged }
```

## Item Ordering

Diff items are sorted by:
1. Status priority: added → modified → removed → unchanged
2. Canonical key (alphabetically within each status)

## Protected Fields

The following fields are excluded from comparison (platform-owned):
- `price`
- `lemonSqueezyProductId`
- `enrollmentCount`
- `publishedAt`

## Canonical Keys

Files are matched using canonical keys in the format `{courseId}/{slug}`:
- Source: Extracted from directory path and filename pattern
- Platform: Extracted from content collection path

Example: `astro-course/intro` for file `courses/astro-course/lessons/01-intro.md`

## Performance

- Uses content hashing for efficient body comparison
- Normalizes content before hashing for consistency
- Parallel processing of source and platform files
- Handles 100+ files with sub-second performance
