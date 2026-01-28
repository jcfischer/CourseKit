# Implementation Tasks: Lesson Sync Execution (F-9)

## Progress Tracking

| Task | Status | Notes |
|------|--------|-------|
| T-1.1 | ✅ | Sync types in types.ts |
| T-1.2 | ✅ | Core sync execution (15 tests) |
| T-2.1 | ✅ | File writing logic (included in T-1.2) |
| T-2.2 | ✅ | Sync state updates (included in T-1.2) |
| T-3.1 | ✅ | Sync display utilities (15 tests) |
| T-3.2 | ✅ | Summary formatting (included in T-3.1) |

## Group 1: Foundation - Types and Core Logic

### T-1.1: Add sync types [T]
- **File:** `src/types.ts`
- **Test:** `src/lib/lesson-sync.test.ts`
- **Dependencies:** none
- **Description:** Define TypeScript interfaces for sync execution.

**Acceptance Criteria:**
- [ ] `SyncOptions` interface with dryRun, force, courseId, slug
- [ ] `SyncResult` interface with success, created, updated, unchanged, skipped, errors
- [ ] `SyncSummary` interface with counts
- [ ] `SyncError` interface with key, error, message

---

### T-1.2: Implement core sync execution [T]
- **File:** `src/lib/lesson-sync.ts`
- **Test:** `src/lib/lesson-sync.test.ts`
- **Dependencies:** T-1.1, F-7, F-8
- **Description:** Main `executeLessonSync` function that orchestrates the sync process.

**Acceptance Criteria:**
- [ ] `executeLessonSync(config, options)` returns `Promise<SyncResult>`
- [ ] Calls `calculateLessonDiff` to get diff
- [ ] Calls `detectConflicts` to check for conflicts
- [ ] If conflicts and not force, returns with skipped items
- [ ] If dryRun, returns without writing files
- [ ] Otherwise, writes files and updates sync state
- [ ] Returns complete SyncResult

**Test Coverage:**
- Sync with no changes → all unchanged
- Sync with new files → files created
- Sync with modified files → files updated
- Sync with conflicts → files skipped (without force)
- Sync with conflicts + force → files overwritten
- Dry-run → no files written
- Course filter → only matching course synced

---

## Group 2: File Operations

### T-2.1: Implement file writing [T]
- **File:** `src/lib/lesson-sync.ts`
- **Test:** `src/lib/lesson-sync.test.ts`
- **Dependencies:** T-1.2
- **Description:** Write lesson files to platform directory.

**Acceptance Criteria:**
- [ ] `writeLessonFile(sourcePath, targetPath)` copies file content
- [ ] Creates parent directories if needed
- [ ] Returns success/failure status
- [ ] Handles file read errors gracefully
- [ ] Handles file write errors gracefully

**Test Coverage:**
- Write to existing directory
- Write creates missing directories
- Write handles read error
- Write handles write error

---

### T-2.2: Implement sync state updates [T] [P with T-2.1]
- **File:** `src/lib/lesson-sync.ts`
- **Test:** `src/lib/lesson-sync.test.ts`
- **Dependencies:** T-1.2, F-8
- **Description:** Update sync state after successful writes.

**Acceptance Criteria:**
- [ ] After each file write, update sync state with new hash
- [ ] Use `updateSyncRecord` from sync-state.ts
- [ ] Save sync state after all writes complete
- [ ] Handle sync state save failures (log warning, don't fail sync)

**Test Coverage:**
- Sync state updated after write
- Sync state reflects new content hash
- Sync state save failure is non-fatal

---

## Group 3: Display and Summary

### T-3.1: Implement sync display utilities [T]
- **File:** `src/lib/sync-display.ts`
- **Test:** `src/lib/sync-display.test.ts`
- **Dependencies:** T-1.1
- **Description:** Display sync results in terminal.

**Acceptance Criteria:**
- [ ] `displaySyncResult(result: SyncResult)` shows sync outcome
- [ ] Shows created, updated, unchanged, skipped counts
- [ ] Lists individual files for created/updated/skipped
- [ ] Uses color coding (green=success, yellow=warning, red=error)

**Test Coverage:**
- Display with all unchanged
- Display with creates and updates
- Display with skipped files
- Display with errors

---

### T-3.2: Implement summary formatting [T] [P with T-3.1]
- **File:** `src/lib/sync-display.ts`
- **Test:** `src/lib/sync-display.test.ts`
- **Dependencies:** T-1.1
- **Description:** Format sync summary for output.

**Acceptance Criteria:**
- [ ] `formatSyncSummary(summary: SyncSummary)` returns formatted string
- [ ] Shows counts in human-readable format
- [ ] `displaySyncPreview(result: SyncResult)` for dry-run output
- [ ] Preview clearly indicates no files were written

**Test Coverage:**
- Summary with all zeros
- Summary with various counts
- Preview output format

---

## Execution Order

### Critical Path (Sequential)
1. **T-1.1** → Define types (foundation)
2. **T-1.2** → Core sync execution (main logic)
3. **T-2.1** → File writing (execution)
4. **T-2.2** → Sync state updates (persistence)

### Parallel Opportunities
- **T-2.1** and **T-2.2** can run in parallel after T-1.2
- **T-3.1** and **T-3.2** can run in parallel after T-1.1

### Dependency Graph
```
T-1.1 (types)
  ├─→ T-1.2 (core sync) ──→ T-2.1 (file writing)
  │                     └─→ T-2.2 (sync state)
  └─→ T-3.1 (display) ──→ T-3.2 (summary)
```

---

## File Structure Summary

```
src/
├── lib/
│   ├── lesson-sync.ts         # NEW: T-1.2, T-2.1, T-2.2
│   ├── lesson-sync.test.ts    # NEW: T-1.2, T-2.1, T-2.2
│   ├── sync-display.ts        # NEW: T-3.1, T-3.2
│   └── sync-display.test.ts   # NEW: T-3.1, T-3.2
│
└── types.ts                   # MODIFIED: T-1.1
```

---

## Summary

**Total Tasks:** 6
**Parallelizable:** 4 tasks (T-2.1/T-2.2, T-3.1/T-3.2)
**Estimated Effort:** 3-4 hours

**Critical Dependencies:**
- F-7 (Diff Calculation) ✅ Complete
- F-8 (Conflict Detection) ✅ Complete

**Ready to Execute:** Yes
