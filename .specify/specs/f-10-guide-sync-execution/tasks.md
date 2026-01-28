# Implementation Tasks: Guide Sync Execution (F-10)

## Progress Tracking

| Task | Status | Notes |
|------|--------|-------|
| T-1.1 | ✅ | Guide sync implementation |
| T-1.2 | ✅ | Tests for guide sync (14 tests) |

## Group 1: Implementation

### T-1.1: Implement guide sync execution [T]
- **File:** `src/lib/guide-sync.ts`
- **Test:** `src/lib/guide-sync.test.ts`
- **Dependencies:** F-4 (Guide Discovery), F-9 (sync-display.ts)
- **Description:** Main `executeGuideSync` function that syncs guides from materials to platform.

**Acceptance Criteria:**
- [ ] `executeGuideSync(config, options)` returns `Promise<SyncResult>`
- [ ] Uses guide discovery to find source guides
- [ ] Writes to `src/content/guides/{slug}.md`
- [ ] Supports dryRun, force options
- [ ] Updates sync state after writes
- [ ] Reuses `SyncResult` and display utilities from F-9

**Test Coverage:**
- Create new guide files
- Skip unchanged guides (hash match)
- Update modified guides
- Handle conflicts
- Dry-run mode
- Force overwrite

---

### T-1.2: Tests for guide sync [T]
- **File:** `src/lib/guide-sync.test.ts`
- **Dependencies:** T-1.1
- **Description:** Comprehensive test coverage for guide sync.

**Test Cases:**
- buildGuideTargetPath constructs correct path
- writeGuideFile copies content
- executeGuideSync creates new guides
- executeGuideSync skips unchanged
- executeGuideSync updates modified
- executeGuideSync handles conflicts
- executeGuideSync dry-run no writes
- executeGuideSync force overwrites
- executeGuideSync updates sync state

---

## Execution Order

1. **T-1.1** and **T-1.2** run together (TDD)

## File Structure Summary

```
src/
├── lib/
│   ├── guide-sync.ts         # NEW: T-1.1
│   └── guide-sync.test.ts    # NEW: T-1.2
```

---

## Summary

**Total Tasks:** 2
**Estimated Effort:** 1-2 hours (follows F-9 pattern)

**Critical Dependencies:**
- F-4 (Guide Discovery) ✅ Complete
- F-9 (Lesson Sync) ✅ Complete (reuse display utilities)

**Ready to Execute:** Yes
