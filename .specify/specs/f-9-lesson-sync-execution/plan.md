# F-9: Lesson Sync Execution - Technical Plan

## Architecture Overview

F-9 implements the actual file-writing operation for lesson sync. It builds on:
- **F-2**: Lesson discovery (provides source lessons)
- **F-6**: Platform state reading (provides current platform state)
- **F-7**: Diff calculation (determines what needs syncing)
- **F-8**: Conflict detection (detects platform modifications)

### Data Flow

```
Source Lessons (F-2) ──┐
                       ├──> calculateLessonDiff (F-7) ──> DiffResult
Platform State (F-6) ──┘                                     │
                                                             ▼
Sync State (F-8) ───────> detectConflicts (F-8) ──────> ConflictResult
                                                             │
                                                             ▼
                                                    executeLessonSync (F-9)
                                                             │
                                          ┌──────────────────┼──────────────────┐
                                          ▼                  ▼                  ▼
                                    Write Files        Update SyncState    Display Summary
```

## Key Design Decisions

### 1. Sync Execution Strategy

**Decision**: Execute sync as a two-phase operation:
1. **Planning phase**: Calculate diff, detect conflicts, validate
2. **Execution phase**: Write files, update sync state

**Rationale**: Allows dry-run to complete planning without execution, and ensures all validations happen before any writes.

### 2. File Writing Strategy

**Decision**: Copy entire file content (frontmatter + body) from source to platform.

**Rationale**:
- Frontmatter is preserved exactly as-is (FR-9)
- No field injection or modification needed
- Simple and predictable

### 3. Directory Structure

**Decision**: Write to `{platformRoot}/src/content/lessons/{courseId}/{filename}`

Where:
- `platformRoot` is from config.platformDir
- `courseId` is the course identifier
- `filename` is the original source filename (e.g., "01-intro.md")

**Rationale**: Matches platform's expected content collection structure.

### 4. Conflict Handling

**Decision**: Leverage F-8's conflict detection with three modes:
- **Default**: Skip conflicting files, report them, exit non-zero
- **--force**: Overwrite conflicts with warning
- **--dry-run**: Show what would happen, no writes

**Rationale**: Protects accidental overwrites while providing escape hatch.

### 5. Sync State Updates

**Decision**: Update sync state (.coursekit-sync.json) after each successful file write.

**Rationale**: If sync is interrupted, partial progress is preserved.

## API Design

### Main Function

```typescript
interface SyncOptions {
  dryRun?: boolean;    // Preview without writing
  force?: boolean;     // Overwrite conflicts
  courseId?: string;   // Filter to specific course
  slug?: string;       // Filter to specific lesson
}

interface SyncResult {
  success: boolean;
  created: string[];      // Keys of created files
  updated: string[];      // Keys of updated files
  unchanged: string[];    // Keys of unchanged files
  skipped: string[];      // Keys of skipped (conflict) files
  errors: SyncError[];    // Any errors encountered
  summary: SyncSummary;
}

async function executeLessonSync(
  config: CourseKitConfig,
  options: SyncOptions
): Promise<SyncResult>
```

### Display Functions

```typescript
function displaySyncSummary(result: SyncResult): void
function displaySyncPreview(result: SyncResult): void  // For dry-run
```

## File Structure

```
src/lib/
├── lesson-sync.ts           # NEW: Main sync execution
├── lesson-sync.test.ts      # NEW: Sync tests
├── sync-display.ts          # NEW: Sync result display
└── sync-display.test.ts     # NEW: Display tests
```

## Integration Points

### With F-7 (Diff Calculation)

```typescript
import { calculateLessonDiff } from "./diff";
const diff = await calculateLessonDiff(config, { courseId: options.courseId });
```

### With F-8 (Conflict Detection)

```typescript
import { detectConflicts, loadSyncState, saveSyncState, updateSyncRecord } from "./sync-state";
import { detectConflicts } from "./conflict-detection";

// Check conflicts before writing
const conflicts = await detectConflicts(config, { courseId: options.courseId });
if (conflicts.hasConflicts && !options.force) {
  return { success: false, skipped: conflicts.conflicts.map(c => c.key), ... };
}
```

## Error Handling

| Error Type | Handling |
|------------|----------|
| Source file read failure | Log error, skip file, continue sync |
| Target directory creation failure | Log error, abort sync |
| File write failure | Log error, skip file, continue sync |
| Sync state save failure | Log warning, continue (non-fatal) |

## Performance Considerations

- Read source files in parallel where possible
- Write files sequentially to avoid race conditions
- Update sync state after each write (not batched) for crash recovery
- Target: <5 seconds for 50 lessons (NFR-1)

## Constitutional Compliance

- [x] No external network calls (NFR-3)
- [x] Human-readable output (NFR-4)
- [x] Atomic per-lesson operations (NFR-2)
- [x] Never writes outside lessons directory (FR-10)

## Test Strategy

### Unit Tests
- `executeLessonSync` with mocked dependencies
- `displaySyncSummary` output formatting

### Integration Tests
- Full sync with test fixtures
- Dry-run behavior
- Conflict handling
- Force overwrite
- Directory creation
