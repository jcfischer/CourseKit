# F-9: Lesson Sync Execution - Documentation

## Files Created

### New Files
- `src/lib/lesson-sync.ts` - Core sync execution logic
- `src/lib/lesson-sync.test.ts` - Sync execution tests (15 tests)
- `src/lib/sync-display.ts` - Display utilities for sync results
- `src/lib/sync-display.test.ts` - Display tests (15 tests)

### Modified Files
- `src/types.ts` - Added sync execution types

## Usage

### Basic Sync Execution

```typescript
import { executeLessonSync } from "./lib/lesson-sync";
import { displaySyncResult, displaySyncPreview } from "./lib/sync-display";
import { loadConfig } from "./config";

// Load configuration
const config = await loadConfig();

// Execute sync
const result = await executeLessonSync(config);

// Display results
if (result.dryRun) {
  displaySyncPreview(result);
} else {
  displaySyncResult(result);
}
```

### With Options

```typescript
// Dry-run (preview without writing)
const preview = await executeLessonSync(config, { dryRun: true });

// Force overwrite conflicts
const forced = await executeLessonSync(config, { force: true });

// Filter to specific course
const filtered = await executeLessonSync(config, { courseId: "astro-course" });

// Filter to specific lesson
const single = await executeLessonSync(config, {
  courseId: "astro-course",
  slug: "intro"
});
```

### Integration with Push Command

```typescript
async function push(options: PushOptions) {
  const config = await loadConfig();

  // Execute sync with options
  const result = await executeLessonSync(config, {
    dryRun: options.dryRun,
    force: options.force,
    courseId: options.course,
  });

  // Display appropriate output
  if (result.dryRun) {
    displaySyncPreview(result);
  } else {
    displaySyncResult(result);
  }

  // Exit with appropriate code
  if (!result.success) {
    process.exit(1);
  }
}
```

## Types

### SyncOptions

```typescript
interface SyncOptions {
  dryRun?: boolean;    // Preview without writing
  force?: boolean;     // Overwrite conflicts
  courseId?: string;   // Filter to course
  slug?: string;       // Filter to lesson
}
```

### SyncResult

```typescript
interface SyncResult {
  success: boolean;      // No conflicts/errors
  created: string[];     // Keys of created files
  updated: string[];     // Keys of updated files
  unchanged: string[];   // Keys unchanged
  skipped: string[];     // Keys skipped (conflicts)
  errors: SyncError[];   // Any errors
  summary: SyncSummary;  // Count summary
  dryRun: boolean;       // Was this a dry run?
}
```

### SyncSummary

```typescript
interface SyncSummary {
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  errors: number;
}
```

## Platform Directory Structure

Files are written to:

```
{platformRoot}/src/content/lessons/{courseId}/{filename}
```

Example:
- Source: `courses/astro-course/lessons/01-intro.md`
- Platform: `platform/src/content/lessons/astro-course/01-intro.md`

## Sync Behavior

| Diff Status | Action | Notes |
|-------------|--------|-------|
| `added` | Create file | New file on platform |
| `modified` | Update file | Overwrite platform file |
| `unchanged` | Skip | Content hashes match |
| `removed` | Skip | Source deleted, platform preserved |

## Conflict Handling

| Scenario | Default | With --force |
|----------|---------|--------------|
| Platform modified since sync | Skip, report | Overwrite |
| Platform deleted | Skip, report | Create |
| New on platform | Skip, report | Overwrite |

## Performance

- Sync of 50 lessons: <5 seconds
- Uses content hash comparison to skip unchanged
- Sequential file writes for safety
- Sync state updated after each write

## Integration Points

- **F-2 (Lesson Discovery)**: Provides source lessons
- **F-6 (Platform State)**: Provides current platform state
- **F-7 (Diff Calculation)**: Determines what needs syncing
- **F-8 (Conflict Detection)**: Detects platform modifications

## Error Handling

| Error | Behavior |
|-------|----------|
| Source file read failure | Log error, skip file, continue |
| Directory creation failure | Log error, skip file, continue |
| File write failure | Log error, skip file, continue |
| Sync state save failure | Log warning, continue (non-fatal) |
