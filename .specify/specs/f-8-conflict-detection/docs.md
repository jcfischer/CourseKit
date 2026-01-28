# F-8: Conflict Detection - Documentation

## Files Created

### New Files
- `src/lib/sync-state.ts` - Sync state persistence and utilities
- `src/lib/sync-state.test.ts` - Sync state tests (19 tests)
- `src/lib/conflict-detection.ts` - Conflict detection logic
- `src/lib/conflict-detection.test.ts` - Conflict detection tests (11 tests)
- `src/lib/conflict-display.ts` - Display utilities for conflicts
- `src/lib/conflict-display.test.ts` - Display tests (10 tests)

### Modified Files
- `src/types.ts` - Added conflict detection types

## Usage

### Sync State Management

```typescript
import {
  loadSyncState,
  saveSyncState,
  updateSyncRecord,
  getSyncRecord,
} from "./lib/sync-state";

// Load existing sync state
const state = await loadSyncState(platformRoot);

// Update after successful sync
updateSyncRecord(state, "astro-course/intro", {
  filePath: "astro-course/01-intro.md",
  contentHash: hashContent(body),
  syncedAt: new Date().toISOString(),
  sourceRepo: "courses/astro-course",
});

// Save to disk
await saveSyncState(platformRoot, state);
```

### Conflict Detection

```typescript
import { detectConflicts } from "./lib/conflict-detection";
import { displayConflicts } from "./lib/conflict-display";
import { loadConfig } from "./config";

// Load configuration
const config = await loadConfig();

// Detect conflicts
const result = await detectConflicts(config);

if (result.hasConflicts) {
  displayConflicts(result);
  process.exit(1);
}

// Proceed with sync...
```

### Integration with Push Workflow

```typescript
async function push(options: PushOptions) {
  const config = await loadConfig();

  // Step 1: Detect conflicts (unless --force)
  if (!options.force) {
    const conflicts = await detectConflicts(config);
    if (conflicts.hasConflicts) {
      displayConflicts(conflicts);
      console.error("Push aborted. Use --force to overwrite.");
      return;
    }
  }

  // Step 2: Calculate diff
  const diff = await calculateLessonDiff(config);

  // Step 3: Show preview if --dry-run
  if (options.dryRun) {
    displayDiffSummary(diff);
    return;
  }

  // Step 4: Write files and update sync state
  // ... (implemented in F-9)
}
```

## Types

### SyncRecord

```typescript
interface SyncRecord {
  filePath: string;      // Relative path on platform
  contentHash: string;   // SHA-256 of body content
  syncedAt: string;      // ISO 8601 timestamp
  sourceRepo: string;    // Source repository path
}
```

### SyncState

```typescript
interface SyncState {
  version: number;                      // Schema version
  records: Record<string, SyncRecord>;  // Key: courseId/slug
  lastSync: string | null;              // Last sync timestamp
}
```

### ConflictItem

```typescript
interface ConflictItem {
  key: string;              // Canonical key (courseId/slug)
  platformPath?: string;    // Path on platform
  expectedHash?: string;    // Hash from sync state
  currentHash?: string;     // Current platform hash
  lastSyncedAt?: string;    // When last synced
  conflictType: ConflictType;  // modified | deleted | new_on_platform
  changeSummary: string;    // Human-readable description
}
```

### ConflictDetectionResult

```typescript
interface ConflictDetectionResult {
  hasConflicts: boolean;     // Any conflicts found?
  conflicts: ConflictItem[]; // All conflicts
  totalChecked: number;      // Files checked
}
```

## Sync State File

Location: `.coursekit-sync.json` in the platform root directory.

Example:

```json
{
  "version": 1,
  "records": {
    "astro-course/intro": {
      "filePath": "astro-course/01-intro.md",
      "contentHash": "abc123...",
      "syncedAt": "2026-01-28T10:00:00Z",
      "sourceRepo": "courses/astro-course"
    },
    "astro-course/setup": {
      "filePath": "astro-course/02-setup.md",
      "contentHash": "def456...",
      "syncedAt": "2026-01-28T10:00:00Z",
      "sourceRepo": "courses/astro-course"
    }
  },
  "lastSync": "2026-01-28T10:00:00Z"
}
```

## Conflict Types

| Type | Meaning | Detection |
|------|---------|-----------|
| `modified` | Platform file changed since last sync | Hash differs from sync record |
| `deleted` | Platform file was removed | Sync record exists, file missing |
| `new_on_platform` | Platform file never synced | File exists, no sync record |

## Performance

- Sync state load/save: <10ms for typical sizes
- Conflict detection: <100ms for 100 files
- Uses O(1) lookups via canonical key mapping

## Integration Points

- **F-6 Platform State Reading**: Uses `readPlatformState()` to get current platform files
- **F-7 Diff Calculation**: Uses same `hashContent()` for consistent hashing
- **F-9 Lesson Sync**: Will call `detectConflicts()` before writing

## Error Handling

- Invalid JSON in sync state: Throws with clear error message
- Unsupported schema version: Throws to prevent data loss
- Missing sync state file: Returns empty state (first sync scenario)
- Platform directory missing: Returns empty state
