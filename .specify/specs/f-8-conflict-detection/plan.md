# Technical Plan: Conflict Detection (F-8)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONFLICT DETECTION FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

                        ┌──────────────────┐
                        │  coursekit push  │
                        │   (CLI command)  │
                        └────────┬─────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Load sync state JSON    │
                    │  (.coursekit-sync.json)  │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Read platform state     │
                    │  (existing F-6 function) │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Detect conflicts        │
                    │  (compare hashes)        │
                    └────────────┬─────────────┘
                                 │
                       ┌─────────▼──────────┐
                       │  Any conflicts?     │
                       └──┬──────────────┬───┘
                          │              │
                     YES  │              │ NO
                          │              │
              ┌───────────▼──────┐       │
              │ --force passed?   │       │
              └──┬──────────┬────┘       │
                 │          │            │
            NO   │          │ YES        │
                 │          │            │
        ┌────────▼──┐   ┌──▼────────┐   │
        │  Abort    │   │  Proceed  │   │
        │ exit(1)   │   │  with push│◄──┘
        └───────────┘   └──┬────────┘
                           │
              ┌────────────▼────────────┐
              │  Write files to platform│
              │  Update sync state JSON  │
              └─────────────────────────┘
```

## Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Bun | Project standard, fast file I/O |
| Storage | JSON file | Simple, human-readable, no DB needed |
| Hashing | SHA-256 (existing) | Already implemented in platform-utils.ts |
| CLI | Commander.js | Project pattern, supports --force flag |
| File location | `.coursekit-sync.json` | Platform directory, gitignored |

## Data Model

### Sync State File Structure

```typescript
/**
 * Single file's sync record.
 */
interface SyncRecord {
  /** Relative path in platform (e.g., "src/content/lessons/astro-course/01-intro.md") */
  filePath: string;

  /** SHA-256 hash of file content at time of last sync */
  contentHash: string;

  /** ISO 8601 timestamp of last successful sync */
  syncedAt: string;

  /** Source repository identifier (courseId for now) */
  sourceRepo: string;
}

/**
 * Complete sync state JSON file.
 */
interface SyncState {
  /** Schema version for future migrations */
  version: 1;

  /** All synced files keyed by canonical key (courseId/slug) */
  records: Record<string, SyncRecord>;

  /** When the sync state was last updated */
  lastSync: string;
}
```

### Example `.coursekit-sync.json`

```json
{
  "version": 1,
  "lastSync": "2026-01-28T18:00:00.000Z",
  "records": {
    "astro-course/intro": {
      "filePath": "src/content/lessons/astro-course/01-intro.md",
      "contentHash": "a1b2c3d4e5f6...",
      "syncedAt": "2026-01-28T18:00:00.000Z",
      "sourceRepo": "astro-course"
    },
    "astro-course/components": {
      "filePath": "src/content/lessons/astro-course/02-components.md",
      "contentHash": "f6e5d4c3b2a1...",
      "syncedAt": "2026-01-28T18:00:00.000Z",
      "sourceRepo": "astro-course"
    }
  }
}
```

### Conflict Detection Data Structure

```typescript
/**
 * Single detected conflict.
 */
interface ConflictItem {
  /** Canonical key (courseId/slug) */
  key: string;

  /** Platform file path */
  platformPath: string;

  /** Hash in sync state (what we expect) */
  expectedHash: string;

  /** Current hash on platform (what exists now) */
  currentHash: string;

  /** When it was last synced */
  lastSyncedAt: string;

  /** Brief change summary for display */
  changeSummary: "modified" | "deleted" | "new_on_platform";
}

/**
 * Result of conflict detection.
 */
interface ConflictDetectionResult {
  /** Whether any conflicts were found */
  hasConflicts: boolean;

  /** List of all conflicts */
  conflicts: ConflictItem[];

  /** Total files checked */
  totalChecked: number;
}
```

## Implementation Phases

### Phase 1: Sync State Persistence (2-3 hours)

**Goal:** Store and load sync state JSON file.

**Tasks:**
1. Create `src/lib/sync-state.ts` with:
   - `loadSyncState(platformRoot: string): SyncState`
   - `saveSyncState(platformRoot: string, state: SyncState): void`
   - `initializeSyncState(): SyncState`
   - `updateSyncRecord(state: SyncState, key: string, record: SyncRecord): void`

2. Add types to `src/types.ts`:
   - `SyncRecord`
   - `SyncState`
   - `ConflictItem`
   - `ConflictDetectionResult`

3. Write tests in `src/lib/sync-state.test.ts`:
   - Load non-existent file (returns empty state)
   - Load valid state file (parses correctly)
   - Save state file (writes valid JSON)
   - Update record (merges correctly)

**Deliverable:** Sync state persistence functions with 100% test coverage.

---

### Phase 2: Conflict Detection Logic (3-4 hours)

**Goal:** Detect conflicts by comparing platform state to sync state baseline.

**Tasks:**
1. Create `src/lib/conflict-detection.ts` with:
   - `detectConflicts(config: CourseKitConfig, options: ConflictDetectionOptions): Promise<ConflictDetectionResult>`
   - `classifyConflict(syncRecord: SyncRecord, platformFile: PlatformLesson | PlatformGuide | null): ConflictItem | null`

2. Integrate with existing infrastructure:
   - Reuse `readPlatformState()` from F-6
   - Reuse `hashContent()` from platform-utils.ts
   - Reuse `matchFilesBySlug()` from diff-utils.ts

3. Write tests in `src/lib/conflict-detection.test.ts`:
   - No sync state → treat all platform files as conflicts
   - Platform hash matches sync state → no conflict
   - Platform hash differs from sync state → conflict detected
   - File deleted from platform → conflict (missing expected file)
   - File added to platform (not in sync state) → conflict

**Deliverable:** Conflict detection function that identifies all three conflict types (modified, deleted, new).

---

### Phase 3: CLI Integration (2-3 hours)

**Goal:** Add conflict detection to `coursekit push` command.

**Tasks:**
1. Create `src/commands/push.ts` (new file):
   - Main push workflow
   - Conflict detection gate
   - `--force` flag support
   - `--dry-run` flag support

2. Command flow:
   ```typescript
   async function pushCommand(options: PushOptions): Promise<void> {
     // 1. Load config
     const config = await loadConfig();

     // 2. Detect conflicts (unless --force)
     if (!options.force) {
       const conflicts = await detectConflicts(config, options);

       if (conflicts.hasConflicts) {
         displayConflicts(conflicts);
         console.error("Push aborted. Use --force to overwrite.");
         process.exit(1);
       }
     }

     // 3. Calculate diff (what needs to be synced)
     const diff = await calculateLessonDiff(config, options);

     // 4. Write files to platform (unless --dry-run)
     if (!options.dryRun) {
       await writeFilesToPlatform(diff);
       await updateSyncState(config, diff);
     } else {
       displayDryRunSummary(diff);
     }
   }
   ```

3. Add conflict display function:
   ```typescript
   function displayConflicts(result: ConflictDetectionResult): void {
     console.error(chalk.red(`Conflicts detected (${result.conflicts.length} files):`));

     for (const conflict of result.conflicts) {
       console.error(`  ${conflict.key}`);
       console.error(`    Platform: ${conflict.platformPath}`);
       console.error(`    Status: ${conflict.changeSummary}`);
       console.error(`    Last synced: ${formatDate(conflict.lastSyncedAt)}`);
     }
   }
   ```

4. Register command in CLI:
   - Add to `src/cli.ts`
   - Support flags: `--force`, `--dry-run`, `--course <id>`

**Deliverable:** Working `coursekit push` command with conflict detection.

---

### Phase 4: Status Command Enhancement (1-2 hours)

**Goal:** Show conflict state in `coursekit status` output.

**Tasks:**
1. Enhance `src/commands/status.ts`:
   - Add conflict detection
   - Display conflicts in output

2. Example output:
   ```
   Status: astro-course

   Platform state: /path/to/platform
   Lessons: 10 synced, 2 conflicts

   Conflicts:
     astro-course/intro [modified on platform]
     astro-course/setup [deleted on platform]

   Run 'coursekit push --force' to overwrite.
   ```

**Deliverable:** Status command showing conflict information.

---

## File Structure

```
src/
├── commands/
│   ├── push.ts              # NEW: Push command with conflict detection
│   └── status.ts            # MODIFIED: Add conflict reporting
│
├── lib/
│   ├── sync-state.ts        # NEW: Sync state persistence
│   ├── sync-state.test.ts   # NEW: Sync state tests
│   ├── conflict-detection.ts     # NEW: Conflict detection logic
│   ├── conflict-detection.test.ts # NEW: Conflict detection tests
│   ├── platform-state.ts    # EXISTING: Reused for reading platform
│   ├── platform-utils.ts    # EXISTING: Reused for hashContent()
│   └── diff-utils.ts        # EXISTING: Reused for matchFilesBySlug()
│
├── types.ts                 # MODIFIED: Add SyncState, ConflictItem types
└── cli.ts                   # MODIFIED: Register push command
```

## API Contracts

### Sync State Functions

```typescript
/**
 * Load sync state from platform directory.
 * Creates empty state if file doesn't exist.
 */
export function loadSyncState(platformRoot: string): SyncState;

/**
 * Save sync state to platform directory.
 * Writes to .coursekit-sync.json.
 */
export function saveSyncState(platformRoot: string, state: SyncState): void;

/**
 * Create an empty sync state.
 */
export function initializeSyncState(): SyncState;

/**
 * Update a single sync record in the state.
 */
export function updateSyncRecord(
  state: SyncState,
  key: string,
  record: SyncRecord
): void;
```

### Conflict Detection Functions

```typescript
/**
 * Detect conflicts between platform state and sync state baseline.
 *
 * @param config - CourseKit configuration
 * @param options - Detection options (courseId filter)
 * @returns Conflict detection result
 */
export async function detectConflicts(
  config: CourseKitConfig,
  options: ConflictDetectionOptions
): Promise<ConflictDetectionResult>;

/**
 * Classify a single file as conflicted or not.
 *
 * @param syncRecord - The baseline record from sync state
 * @param platformFile - Current platform file state (null if deleted)
 * @returns ConflictItem if conflict detected, null otherwise
 */
export function classifyConflict(
  syncRecord: SyncRecord,
  platformFile: PlatformLesson | PlatformGuide | null
): ConflictItem | null;
```

### Push Command Interface

```typescript
interface PushOptions {
  /** Force push even with conflicts */
  force?: boolean;

  /** Dry run - show what would change without writing */
  dryRun?: boolean;

  /** Filter to specific course ID */
  courseId?: string;
}

/**
 * Push source materials to platform.
 *
 * @param options - Push options
 */
export async function pushCommand(options: PushOptions): Promise<void>;
```

## Dependencies

### External Packages

| Package | Purpose | Already installed? |
|---------|---------|-------------------|
| `bun` | Runtime, file I/O | ✅ Yes |
| `chalk` | Terminal colors | ✅ Yes |
| `commander` | CLI framework | ✅ Yes |
| `yaml` | Parse frontmatter | ✅ Yes |

### Internal Dependencies

| Feature | Function | Location |
|---------|----------|----------|
| F-6 | `readPlatformState()` | `src/lib/platform-state.ts` |
| F-6 | `hashContent()` | `src/lib/platform-utils.ts` |
| F-7 | `matchFilesBySlug()` | `src/lib/diff-utils.ts` |
| F-7 | `calculateLessonDiff()` | `src/lib/diff.ts` |

### Git Configuration

Add to `.gitignore` in platform repository:

```gitignore
# CourseKit sync state
.coursekit-sync.json
```

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Sync state corruption** | High - could cause false positives/negatives | Low | - Validate JSON schema on load<br>- Version field for migrations<br>- Atomic writes (write to temp, rename) |
| **Hash collision** | Medium - false negative (missed conflict) | Very Low | SHA-256 is cryptographically secure |
| **Platform directory unreadable** | High - push aborts | Low | - Check permissions before starting<br>- Clear error messages |
| **First sync treats all files as conflicts** | Low - expected behavior, documented | High | - Clear warning message<br>- Documentation explains --force needed for initial sync |
| **Merge conflict in .coursekit-sync.json** | Medium - team working on same platform | Medium | - JSON structure is keyed by canonical key (no array)<br>- Git merge tools handle JSON well<br>- Document resolution strategy |
| **Performance with 1000+ files** | Medium - slow conflict detection | Low | - Lazy load sync state<br>- Use Map for O(1) lookups<br>- Parallel hash computation if needed |
| **Race condition (simultaneous pushes)** | High - sync state corruption | Very Low | - Document single-user assumption<br>- Future: file locking or atomic updates |

### Mitigation Details

#### Sync State Corruption
```typescript
const SYNC_STATE_SCHEMA_VERSION = 1;

function loadSyncState(platformRoot: string): SyncState {
  const filePath = path.join(platformRoot, '.coursekit-sync.json');

  if (!fs.existsSync(filePath)) {
    return initializeSyncState();
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);

    // Validate schema version
    if (parsed.version !== SYNC_STATE_SCHEMA_VERSION) {
      throw new Error(`Unsupported sync state version: ${parsed.version}`);
    }

    // TODO: Add Zod validation for full schema

    return parsed;
  } catch (err) {
    throw new Error(`Failed to load sync state: ${err.message}`);
  }
}
```

#### First Sync Workflow
```typescript
function detectConflicts(
  config: CourseKitConfig,
  options: ConflictDetectionOptions
): ConflictDetectionResult {
  const syncState = loadSyncState(config.platform.path);

  // Empty state = first sync
  if (Object.keys(syncState.records).length === 0) {
    const platformState = await readPlatformState(config, options);

    if (platformState.lessons.length > 0 || platformState.guides.length > 0) {
      console.warn(
        chalk.yellow('First sync detected. Platform has existing files.')
      );
      console.warn(
        chalk.yellow('Use --force to establish initial baseline.')
      );

      // Treat all platform files as conflicts
      // (forces user to explicitly acknowledge overwrite)
    }
  }

  // ... rest of conflict detection
}
```

## Performance Considerations

### Conflict Detection Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Load sync state | O(1) file read | ~1ms for 1000 records |
| Read platform state | O(n) file reads | ~100ms for 100 files (already optimized in F-6) |
| Hash comparison | O(n) | Platform state already includes hashes |
| Match files by key | O(n) | Using Map for O(1) lookups |

**Total:** Sub-second for typical course sizes (<100 files).

### Optimization Strategies

1. **Reuse platform state hashes:** F-6 already computes hashes during read
2. **Lazy load sync state:** Only load when needed (before push)
3. **Use Map for key lookups:** O(1) instead of O(n) array search
4. **Parallel hash computation:** If needed, use worker threads for large files

## Edge Cases

| Case | Behavior | Test Coverage |
|------|----------|---------------|
| **No sync state file** | Create empty state, treat all platform files as conflicts | ✅ Required |
| **Sync state exists, platform file missing** | Conflict: "deleted on platform" | ✅ Required |
| **Platform file exists, not in sync state** | Conflict: "new on platform" | ✅ Required |
| **Hash matches sync state** | No conflict | ✅ Required |
| **Hash differs from sync state** | Conflict: "modified on platform" | ✅ Required |
| **Commerce-owned fields changed** | NOT a conflict (excluded from hash) | ✅ Required |
| **--force flag passed** | Skip conflict detection, proceed with push | ✅ Required |
| **--dry-run flag passed** | Show conflicts, don't write anything | ✅ Required |

## Integration Points

### With F-6 (Platform State Reading)

```typescript
// F-8 calls F-6 to get current platform state
const platformState = await readPlatformState(config, options);

// Reuses existing hash computation
for (const lesson of platformState.lessons) {
  const key = `${lesson.courseId}/${lesson.slug}`;
  const syncRecord = syncState.records[key];

  if (syncRecord && syncRecord.contentHash !== lesson.contentHash) {
    // Conflict detected
  }
}
```

### With F-7 (Diff Calculation)

```typescript
// F-8 uses F-7's file matching utility
const matches = matchFilesBySlug(sourceLessons, platformLessons);

// Both F-7 and F-8 use the same canonical key format
const key = `${courseId}/${slug}`;
```

### With Push Command (Future)

```typescript
async function pushCommand(options: PushOptions): Promise<void> {
  // 1. Conflict detection (F-8)
  if (!options.force) {
    const conflicts = await detectConflicts(config, options);
    if (conflicts.hasConflicts) {
      displayConflicts(conflicts);
      process.exit(1);
    }
  }

  // 2. Diff calculation (F-7)
  const diff = await calculateLessonDiff(config, options);

  // 3. Write files (future feature)
  await writeFilesToPlatform(diff);

  // 4. Update sync state (F-8)
  await updateSyncStateFromDiff(config, diff);
}
```

## Testing Strategy

### Unit Tests

```typescript
// src/lib/sync-state.test.ts
describe('loadSyncState', () => {
  test('returns empty state when file missing');
  test('loads valid JSON state file');
  test('throws error for invalid JSON');
  test('throws error for unsupported schema version');
});

describe('saveSyncState', () => {
  test('writes valid JSON to file');
  test('creates parent directory if missing');
  test('uses atomic write (temp + rename)');
});

// src/lib/conflict-detection.test.ts
describe('detectConflicts', () => {
  test('no conflicts when hashes match');
  test('conflict when platform hash differs');
  test('conflict when platform file deleted');
  test('conflict when platform file not in sync state');
  test('no conflict for commerce-owned field changes');
});

describe('classifyConflict', () => {
  test('returns null when hashes match');
  test('returns modified when hashes differ');
  test('returns deleted when platform file is null');
  test('returns new_on_platform when sync record is null');
});
```

### Integration Tests

```typescript
// test/integration/push.test.ts
describe('coursekit push with conflicts', () => {
  test('aborts when conflicts detected');
  test('proceeds with --force flag');
  test('shows conflicts in --dry-run mode');
  test('updates sync state after successful push');
});
```

### Test Fixtures

```
test-fixtures/
└── conflict-detection/
    ├── scenario-1-no-conflicts/
    │   ├── .coursekit-sync.json     # Baseline state
    │   └── platform/                # Platform matches baseline
    ├── scenario-2-modified/
    │   ├── .coursekit-sync.json     # Baseline state
    │   └── platform/                # File modified on platform
    ├── scenario-3-deleted/
    │   ├── .coursekit-sync.json     # Baseline state
    │   └── platform/                # File deleted from platform
    └── scenario-4-new/
        ├── .coursekit-sync.json     # Baseline state
        └── platform/                # New file added to platform
```

## Future Enhancements

| Enhancement | Description | Priority |
|-------------|-------------|----------|
| **Three-way merge** | Detect when both source and platform changed (requires source baseline) | Medium |
| **Interactive conflict resolution** | Prompt user for each conflict (keep platform / overwrite / skip) | Low |
| **Conflict diff viewer** | Show actual content diff for conflicts | Low |
| **Sync state in DB** | Move from JSON to SQLite for better performance | Low |
| **Multi-user locking** | File locking to prevent race conditions | Low |
| **Sync state migration** | Automatic migration when schema version changes | Medium |

## Success Criteria

- [x] Sync state JSON structure defined
- [x] File location specified (.coursekit-sync.json in platform root)
- [x] Conflict detection algorithm designed
- [x] Integration with F-6 (platform state reading) planned
- [x] Integration with F-7 (diff calculation) planned
- [x] Push command workflow designed
- [x] Risk assessment completed with mitigation strategies
- [x] Test strategy defined with fixtures
- [x] All edge cases documented

---

**Ready for implementation:** Yes

**Estimated effort:** 8-12 hours total
- Phase 1 (Sync state): 2-3 hours
- Phase 2 (Conflict detection): 3-4 hours
- Phase 3 (CLI integration): 2-3 hours
- Phase 4 (Status command): 1-2 hours

**Blocked by:** None - all dependencies (F-6, F-7) are complete
