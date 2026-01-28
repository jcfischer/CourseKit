# Implementation Tasks: Asset Sync Execution (F-11)

## Progress Tracking

| Task | Status | Notes |
|------|--------|-------|
| T-1.1 | ✅ | Asset sync implementation |
| T-1.2 | ✅ | Tests for asset sync (14 tests) |

## Group 1: Implementation

### T-1.1: Implement asset sync execution [T]
- **File:** `src/lib/asset-sync.ts`
- **Test:** `src/lib/asset-sync.test.ts`
- **Dependencies:** F-5 (Asset Discovery), F-9 (sync-display.ts)

**Acceptance Criteria:**
- [ ] `executeAssetSync(config, options)` returns `Promise<SyncResult>`
- [ ] Uses asset discovery to find source assets
- [ ] Writes to `public/courses/{courseSlug}/{relativePath}`
- [ ] Supports dryRun, force options
- [ ] Updates sync state after writes
- [ ] Uses streaming copy for large files

---

### T-1.2: Tests for asset sync [T]
- **File:** `src/lib/asset-sync.test.ts`

**Test Cases:**
- buildAssetTargetPath constructs correct path
- writeAssetFile copies binary content
- executeAssetSync creates new assets
- executeAssetSync skips unchanged
- executeAssetSync handles conflicts
- executeAssetSync dry-run no writes
- executeAssetSync force overwrites

---

## Summary

**Total Tasks:** 2
**Estimated Effort:** 1-2 hours (follows F-9/F-10 pattern)

**Dependencies:**
- F-5 (Asset Discovery) ✅ Complete
- F-9 (Lesson Sync) ✅ Complete (reuse display)

**Ready to Execute:** Yes
