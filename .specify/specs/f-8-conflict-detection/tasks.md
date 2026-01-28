# Implementation Tasks: Conflict Detection (F-8)

## Progress Tracking

| Task | Status | Notes |
|------|--------|-------|
| T-1.1 | ✅ | Data types added to types.ts |
| T-1.2 | ✅ | Sync state persistence (19 tests) |
| T-1.3 | ✅ | Sync state utilities (included in T-1.2) |
| T-2.1 | ✅ | Conflict detection logic (11 tests) |
| T-2.2 | ✅ | Conflict classification (included in T-2.1) |
| T-3.1 | ⏸️ | Push command - deferred to F-9 |
| T-3.2 | ✅ | Conflict display utilities (10 tests) |
| T-3.3 | ⏸️ | CLI registration - deferred to F-12 |
| T-4.1 | ⏸️ | Status command - deferred to F-13 |
| T-4.2 | ✅ | Integration tests in conflict-detection.test.ts |

## Group 1: Foundation - Sync State Persistence

### T-1.1: Create sync state data types [T]
- **File:** `src/types.ts`
- **Test:** `src/lib/sync-state.test.ts` (type validation tests)
- **Dependencies:** none
- **Description:** Define TypeScript interfaces for `SyncRecord`, `SyncState`, `ConflictItem`, and `ConflictDetectionResult`. Add to existing types.ts file.

**Acceptance Criteria:**
- [ ] `SyncRecord` interface with filePath, contentHash, syncedAt, sourceRepo
- [ ] `SyncState` interface with version, records, lastSync
- [ ] `ConflictItem` interface with key, platformPath, expectedHash, currentHash, lastSyncedAt, changeSummary
- [ ] `ConflictDetectionResult` interface with hasConflicts, conflicts, totalChecked
- [ ] All fields properly typed and documented with JSDoc

---

### T-1.2: Implement sync state persistence [T]
- **File:** `src/lib/sync-state.ts`
- **Test:** `src/lib/sync-state.test.ts`
- **Dependencies:** T-1.1
- **Description:** Implement functions to load, save, initialize, and update sync state JSON file (.coursekit-sync.json).

**Acceptance Criteria:**
- [ ] `loadSyncState(platformRoot: string): SyncState` - loads from .coursekit-sync.json or returns empty state
- [ ] `saveSyncState(platformRoot: string, state: SyncState): void` - writes JSON atomically (temp + rename)
- [ ] `initializeSyncState(): SyncState` - creates empty state with version 1
- [ ] `updateSyncRecord(state: SyncState, key: string, record: SyncRecord): void` - updates single record
- [ ] Schema version validation (rejects unsupported versions)
- [ ] Error handling for invalid JSON
- [ ] All functions have 100% test coverage

**Test Coverage:**
- Load non-existent file → empty state
- Load valid state file → parses correctly
- Load invalid JSON → throws error
- Load unsupported version → throws error
- Save state → writes valid JSON
- Save with missing parent dir → creates directory
- Update record → merges correctly
- Update record → preserves other records

---

### T-1.3: Add sync state helper utilities [T] [P with T-1.2]
- **File:** `src/lib/sync-state.ts`
- **Test:** `src/lib/sync-state.test.ts`
- **Dependencies:** T-1.1
- **Description:** Helper functions for sync state operations.

**Acceptance Criteria:**
- [ ] `getSyncRecord(state: SyncState, key: string): SyncRecord | undefined` - lookup by canonical key
- [ ] `deleteSyncRecord(state: SyncState, key: string): void` - remove record
- [ ] `getAllSyncRecords(state: SyncState): SyncRecord[]` - get all records as array
- [ ] `getSyncStateFilePath(platformRoot: string): string` - standardized path construction

**Test Coverage:**
- Get existing record
- Get non-existent record → undefined
- Delete existing record
- Delete non-existent record (no-op)
- Get all records from empty state
- Get all records from populated state

---

## Group 2: Core Logic - Conflict Detection

### T-2.1: Implement conflict detection [T]
- **File:** `src/lib/conflict-detection.ts`
- **Test:** `src/lib/conflict-detection.test.ts`
- **Dependencies:** T-1.2, F-6 (readPlatformState), F-7 (matchFilesBySlug)
- **Description:** Main conflict detection function that compares platform state to sync state baseline.

**Acceptance Criteria:**
- [ ] `detectConflicts(config: CourseKitConfig, options: ConflictDetectionOptions): Promise<ConflictDetectionResult>` - main function
- [ ] Load sync state from platform directory
- [ ] Read current platform state using F-6's `readPlatformState()`
- [ ] For each platform file, compare hash to sync state baseline
- [ ] Detect three conflict types: modified, deleted, new_on_platform
- [ ] Return structured result with all conflicts
- [ ] Performance: complete in <2 seconds for 100 files

**Test Coverage:**
- No sync state file → all platform files are conflicts
- Platform hash matches sync state → no conflict
- Platform hash differs → conflict (modified)
- Platform file missing but in sync state → conflict (deleted)
- Platform file exists but not in sync state → conflict (new_on_platform)
- Empty platform, empty sync state → no conflicts
- Multiple conflicts → all detected
- Filter by courseId → only that course checked

**Integration:**
```typescript
import { readPlatformState } from './platform-state.js';
import { loadSyncState } from './sync-state.js';
import { matchFilesBySlug } from './diff-utils.js';
```

---

### T-2.2: Implement conflict classification [T] [P with T-2.1]
- **File:** `src/lib/conflict-detection.ts`
- **Test:** `src/lib/conflict-detection.test.ts`
- **Dependencies:** T-1.1
- **Description:** Helper function to classify individual conflicts.

**Acceptance Criteria:**
- [ ] `classifyConflict(syncRecord: SyncRecord, platformFile: PlatformLesson | PlatformGuide | null): ConflictItem | null`
- [ ] Return null when hashes match (no conflict)
- [ ] Return "modified" when hashes differ
- [ ] Return "deleted" when platformFile is null
- [ ] Return "new_on_platform" when syncRecord is null
- [ ] Include all required fields in ConflictItem

**Test Coverage:**
- Hashes match → null
- Hashes differ → modified conflict
- Platform file null → deleted conflict
- Sync record null → new_on_platform conflict
- Edge case: both null → null (no conflict)

---

## Group 3: CLI Integration - Push Command

### T-3.1: Create push command [T]
- **File:** `src/commands/push.ts`
- **Test:** `src/commands/push.test.ts`
- **Dependencies:** T-2.1, F-7 (calculateLessonDiff)
- **Description:** Implement `coursekit push` command with conflict detection gate.

**Acceptance Criteria:**
- [ ] `pushCommand(options: PushOptions): Promise<void>` - main command handler
- [ ] Load config using existing `loadConfig()`
- [ ] Detect conflicts (unless --force flag)
- [ ] If conflicts found, display and abort with exit code 1
- [ ] If --force, skip conflict detection
- [ ] Calculate diff using F-7's `calculateLessonDiff()`
- [ ] Display diff summary
- [ ] If --dry-run, stop after displaying diff
- [ ] Otherwise, write files to platform (placeholder for now)
- [ ] Update sync state after successful write
- [ ] Support --course filter flag

**Test Coverage:**
- No conflicts → proceed normally
- Conflicts detected → abort with exit 1
- Conflicts + --force → proceed anyway
- Conflicts + --dry-run → show but don't write
- Update sync state after successful push
- Course filter works

**Placeholder for file writing:**
```typescript
// TODO: Implement in separate feature
async function writeFilesToPlatform(diff: LessonDiff): Promise<void> {
  console.log('Writing files to platform...');
  // Actual implementation deferred
}
```

---

### T-3.2: Implement conflict display utilities [T] [P with T-3.1]
- **File:** `src/lib/conflict-display.ts`
- **Test:** `src/lib/conflict-display.test.ts`
- **Dependencies:** T-1.1
- **Description:** Functions to display conflicts in terminal.

**Acceptance Criteria:**
- [ ] `displayConflicts(result: ConflictDetectionResult): void` - main display function
- [ ] Use chalk for colored output (red for conflicts)
- [ ] Show conflict count
- [ ] For each conflict: key, platformPath, changeSummary, lastSyncedAt
- [ ] Clear instruction to use --force
- [ ] `formatConflictSummary(conflict: ConflictItem): string` - single conflict formatter

**Test Coverage:**
- Display zero conflicts
- Display single conflict
- Display multiple conflicts
- All three conflict types displayed correctly
- Date formatting works

**Example Output:**
```
Conflicts detected (2 files):
  astro-course/intro
    Platform: src/content/lessons/astro-course/01-intro.md
    Status: modified
    Last synced: 2026-01-28 18:00

  astro-course/setup
    Platform: src/content/lessons/astro-course/02-setup.md
    Status: deleted
    Last synced: 2026-01-28 17:30

Push aborted. Use --force to overwrite platform files.
```

---

### T-3.3: Register push command in CLI [T]
- **File:** `src/cli.ts`
- **Test:** `src/cli.test.ts` (if exists) or manual verification
- **Dependencies:** T-3.1
- **Description:** Wire push command to CLI with Commander.js.

**Acceptance Criteria:**
- [ ] Register `push` command in CLI
- [ ] Add `--force` flag (boolean, default false)
- [ ] Add `--dry-run` flag (boolean, default false)
- [ ] Add `--course <id>` option (string, optional)
- [ ] Command description and help text
- [ ] Call `pushCommand()` with parsed options

**Implementation:**
```typescript
program
  .command('push')
  .description('Push source materials to platform')
  .option('-f, --force', 'Force push even with conflicts')
  .option('-d, --dry-run', 'Show what would change without writing')
  .option('-c, --course <id>', 'Filter to specific course ID')
  .action(async (options) => {
    await pushCommand(options);
  });
```

---

## Group 4: Polish - Status Command & Integration Tests

### T-4.1: Enhance status command with conflicts [T]
- **File:** `src/commands/status.ts`
- **Test:** `src/commands/status.test.ts`
- **Dependencies:** T-2.1
- **Description:** Add conflict detection to existing status command output.

**Acceptance Criteria:**
- [ ] Import and call `detectConflicts()` in status command
- [ ] Display conflict count if any found
- [ ] List conflicting files with brief status
- [ ] Suggest using `coursekit push --force` to resolve
- [ ] Don't break existing status output
- [ ] Handle case where sync state doesn't exist (first sync)

**Example Output:**
```
Status: astro-course

Platform: /path/to/platform
Lessons: 10 synced, 2 conflicts

Conflicts:
  astro-course/intro [modified on platform]
  astro-course/setup [deleted on platform]

Run 'coursekit push --force' to overwrite platform changes.
```

**Test Coverage:**
- No conflicts → no conflict section shown
- Conflicts detected → conflict section shown
- No sync state → indicate first sync needed
- Course filter works

---

### T-4.2: Create integration tests [T]
- **File:** `test/integration/conflict-detection.test.ts`
- **Test:** Self-testing
- **Dependencies:** T-3.1, T-4.1
- **Description:** End-to-end integration tests using test fixtures.

**Acceptance Criteria:**
- [ ] Test fixture setup (scenarios from plan)
- [ ] Scenario 1: No conflicts → push succeeds
- [ ] Scenario 2: Conflicts → push aborts
- [ ] Scenario 3: Conflicts + --force → push succeeds
- [ ] Scenario 4: Conflicts + --dry-run → shows conflicts, no write
- [ ] Scenario 5: First sync → warns about existing files
- [ ] Scenario 6: Status shows conflicts
- [ ] Verify sync state updated after successful push

**Test Fixtures:**
```
test-fixtures/conflict-detection/
├── scenario-1-no-conflicts/
│   ├── .coursekit-sync.json
│   └── platform/
├── scenario-2-modified/
│   ├── .coursekit-sync.json
│   └── platform/
├── scenario-3-deleted/
│   ├── .coursekit-sync.json
│   └── platform/
└── scenario-4-new/
    ├── .coursekit-sync.json
    └── platform/
```

---

## Execution Order

### Critical Path (Sequential)
1. **T-1.1** → Define data types (foundation for everything)
2. **T-1.2** → Sync state persistence (needed for conflict detection)
3. **T-2.1** → Conflict detection logic (core algorithm)
4. **T-3.1** → Push command (wires everything together)
5. **T-3.3** → CLI registration (makes command available)

### Parallel Opportunities
- **T-1.3** can run in parallel with **T-1.2** (both depend on T-1.1)
- **T-2.2** can run in parallel with **T-2.1** (both depend on T-1.1)
- **T-3.2** can run in parallel with **T-3.1** (both depend on T-2.1)
- **T-4.1** can run in parallel with **T-3.3** (both depend on T-2.1)
- **T-4.2** runs after everything else (integration testing)

### Dependency Graph
```
T-1.1 (types)
  ├─→ T-1.2 (persistence) ──┬─→ T-2.1 (detection) ──┬─→ T-3.1 (push) ──→ T-3.3 (CLI)
  ├─→ T-1.3 (helpers) ──────┤                       ├─→ T-3.2 (display)
  └─→ T-2.2 (classify) ─────┘                       └─→ T-4.1 (status)
                                                            │
                                                            ↓
                                                         T-4.2 (integration)
```

---

## File Structure Summary

```
src/
├── commands/
│   ├── push.ts              # NEW: T-3.1
│   └── status.ts            # MODIFIED: T-4.1
│
├── lib/
│   ├── sync-state.ts        # NEW: T-1.2, T-1.3
│   ├── sync-state.test.ts   # NEW: T-1.2, T-1.3
│   ├── conflict-detection.ts     # NEW: T-2.1, T-2.2
│   ├── conflict-detection.test.ts # NEW: T-2.1, T-2.2
│   ├── conflict-display.ts  # NEW: T-3.2
│   └── conflict-display.test.ts # NEW: T-3.2
│
├── types.ts                 # MODIFIED: T-1.1
├── cli.ts                   # MODIFIED: T-3.3
│
└── test/
    └── integration/
        └── conflict-detection.test.ts # NEW: T-4.2

test-fixtures/
└── conflict-detection/      # NEW: T-4.2
    ├── scenario-1-no-conflicts/
    ├── scenario-2-modified/
    ├── scenario-3-deleted/
    └── scenario-4-new/
```

---

## Summary

**Total Tasks:** 10
**Parallelizable:** 4 tasks (T-1.3, T-2.2, T-3.2, T-4.1)
**Estimated Effort:** 8-12 hours
- Group 1 (Foundation): 2-3 hours
- Group 2 (Detection): 3-4 hours
- Group 3 (CLI): 2-3 hours
- Group 4 (Polish): 1-2 hours

**Critical Dependencies:**
- F-6 (Platform State Reading) ✅ Complete
- F-7 (Diff Calculation) ✅ Complete

**Ready to Execute:** Yes
