# Implementation Tasks: F-7 Diff Calculation

## Progress Tracking

| Task | Status | Notes |
|------|--------|-------|
| T-1.1 | ✅ | normalizeContent implemented |
| T-1.2 | ✅ | 10 test cases for normalization |
| T-2.1 | ✅ | matchFilesBySlug implemented |
| T-2.2 | ✅ | 6 test cases for matching |
| T-3.1 | ✅ | compareFrontmatter implemented |
| T-3.2 | ✅ | 9 test cases for comparison |
| T-4.1 | ✅ | classifyDiffStatus implemented |
| T-4.2 | ✅ | 8 test cases for classification |
| T-5.1 | ✅ | calculateLessonDiff implemented |
| T-5.2 | ✅ | calculateGuideDiff implemented |
| T-6.1 | ✅ | Types added to types.ts |
| T-6.2 | ✅ | 6 test fixture scenarios |
| T-6.3 | ✅ | Integration tests passing |

## Group 1: Foundation - Content Normalization

### T-1.1: Create diff utilities module [T]
- **File:** src/lib/diff-utils.ts
- **Test:** src/lib/diff-utils.test.ts
- **Dependencies:** none
- **Description:** Create module with `normalizeContent()` function that trims whitespace, normalizes line endings to `\n`, and collapses multiple blank lines to single blank line

### T-1.2: Test content normalization edge cases [T]
- **File:** src/lib/diff-utils.test.ts
- **Test:** (same file - test-only task)
- **Dependencies:** T-1.1
- **Description:** Add test cases for: different line endings (`\r\n` vs `\n`), trailing whitespace, multiple blank lines, Unicode content preservation

## Group 2: File Matching

### T-2.1: Implement slug-based file matching [T] [P with T-1.2]
- **File:** src/lib/diff-utils.ts
- **Test:** src/lib/diff-utils.test.ts
- **Dependencies:** T-1.1
- **Description:** Add generic `matchFilesBySlug()` function that builds Map of slug → { source?, platform? }, handles files existing in only one location, preserves metadata

### T-2.2: Test file matching scenarios [T]
- **File:** src/lib/diff-utils.test.ts
- **Test:** (same file - test-only task)
- **Dependencies:** T-2.1
- **Description:** Test cases: file in both locations, file only in source, file only in platform, multiple courses with slug scoping, empty source, empty platform

## Group 3: Frontmatter Comparison

### T-3.1: Implement frontmatter comparison [T]
- **File:** src/lib/diff-utils.ts
- **Test:** src/lib/diff-utils.test.ts
- **Dependencies:** T-1.1
- **Description:** Add `compareFrontmatter()` function that compares field-by-field, filters protected fields, detects added/removed/changed fields, returns `FieldChange[]` array

### T-3.2: Test frontmatter comparison edge cases [T]
- **File:** src/lib/diff-utils.test.ts
- **Test:** (same file - test-only task)
- **Dependencies:** T-3.1
- **Description:** Test cases: identical frontmatter, changed title, platform-owned field ignored, field added/removed in source, multiple fields changed, undefined/null/empty string handling

## Group 4: Diff Classification

### T-4.1: Implement diff status classification [T]
- **File:** src/lib/diff-utils.ts
- **Test:** src/lib/diff-utils.test.ts
- **Dependencies:** T-2.1, T-3.1
- **Description:** Add `classifyDiffStatus()` function that determines added/removed/modified/unchanged status, populates `changes` array for modified files

### T-4.2: Test classification logic [T]
- **File:** src/lib/diff-utils.test.ts
- **Test:** (same file - test-only task)
- **Dependencies:** T-4.1
- **Description:** Test cases: source-only → added, platform-only → removed, identical → unchanged, frontmatter changed → modified, body hash differs → modified, platform-only field changed → unchanged

## Group 5: Main Diff Functions

### T-5.1: Implement lesson diff calculation [T]
- **File:** src/lib/diff.ts
- **Test:** src/lib/diff.test.ts
- **Dependencies:** T-1.1, T-2.1, T-3.1, T-4.1
- **Description:** Implement `calculateLessonDiff()` that orchestrates matching, comparison, classification, builds DiffResult with summary statistics, sorts items by status then path, handles courseId filter

### T-5.2: Implement guide diff calculation [T] [P with T-5.1]
- **File:** src/lib/diff.ts
- **Test:** src/lib/diff.test.ts
- **Dependencies:** T-1.1, T-2.1, T-3.1, T-4.1
- **Description:** Implement `calculateGuideDiff()` following same pattern as lesson diff but for guide content type

## Group 6: Integration and Testing

### T-6.1: Add diff types to type definitions [T]
- **File:** src/types.ts
- **Test:** (type definitions - no dedicated test)
- **Dependencies:** none
- **Description:** Add `DiffStatus`, `FieldChange`, `DiffItem`, `DiffSummary`, `DiffResult`, `DiffOptions` type definitions as specified in technical plan

### T-6.2: Create integration test fixtures [T]
- **File:** test-fixtures/diff/
- **Test:** (fixtures for tests)
- **Dependencies:** none
- **Description:** Create 6 test fixture directories: scenario-1 (10 source, 4 platform), scenario-2 (identical), scenario-3 (modified content), scenario-4 (deleted from source), scenario-5 (platform fields only), scenario-6 (frontmatter only)

### T-6.3: Create end-to-end integration tests [T]
- **File:** src/lib/diff.test.ts
- **Test:** (same file - test file)
- **Dependencies:** T-5.1, T-5.2, T-6.1, T-6.2
- **Description:** Integration tests using discovery + platform state + diff for all 6 user scenarios, verify determinism, performance test for 100 lessons in <2 seconds

## Execution Order

### Phase 1: Foundation (Parallel Start)
1. T-1.1 (normalization foundation)
2. T-6.1 (type definitions - no dependencies)
3. T-6.2 (test fixtures - no dependencies)

### Phase 2: Core Utilities (Can parallelize after T-1.1)
4. T-1.2 (normalization tests - sequential after T-1.1)
5. T-2.1 (matching - parallel with T-1.2 after T-1.1)
6. T-3.1 (frontmatter - parallel with T-1.2, T-2.1 after T-1.1)

### Phase 3: Utility Tests and Classification
7. T-2.2 (matching tests - after T-2.1)
8. T-3.2 (frontmatter tests - after T-3.1)
9. T-4.1 (classification - after T-2.1, T-3.1)
10. T-4.2 (classification tests - after T-4.1)

### Phase 4: Main Functions (Can parallelize)
11. T-5.1 (lesson diff - after all utilities)
12. T-5.2 (guide diff - parallel with T-5.1)

### Phase 5: Integration
13. T-6.3 (integration tests - after T-5.1, T-5.2, T-6.1, T-6.2)

## Parallelization Strategy

**Maximum parallel batches:**

1. **Batch 1** (3 parallel): T-1.1, T-6.1, T-6.2
2. **Batch 2** (3 parallel): T-1.2, T-2.1, T-3.1
3. **Batch 3** (3 parallel): T-2.2, T-3.2, T-4.1
4. **Batch 4** (1 task): T-4.2
5. **Batch 5** (2 parallel): T-5.1, T-5.2
6. **Batch 6** (1 task): T-6.3

**Total tasks:** 13
**Parallelizable tasks:** 8 (marked with [P])
**Critical path length:** 6 batches

## Risk Mitigation Per Task

| Task | Risk | Mitigation |
|------|------|------------|
| T-1.1 | Line ending edge cases | Comprehensive test coverage in T-1.2 |
| T-2.1 | Slug collision across courses | Scope slugs by courseId in matching logic |
| T-3.1 | Platform field list incomplete | Make protected fields configurable |
| T-4.1 | Hash missing in platform manifest | Handle undefined hash, fallback to string compare |
| T-5.1 | Large manifest memory usage | Profile with 100-lesson fixture in T-6.3 |
| T-6.3 | Performance target missed | Optimize matching/comparison if needed |

## Success Criteria Verification

| Spec Criterion | Verified By |
|----------------|-------------|
| Compare by canonical key (slug) | T-2.2 |
| Classify added/modified/unchanged/removed | T-4.2 |
| Report which fields changed | T-3.2 |
| Exclude platform-owned fields | T-3.2 scenario |
| Support lessons, guides, assets | T-5.1, T-5.2 |
| Return structured DiffResult | T-5.1, T-5.2 |
| Provide human-readable summary | T-6.3 |
| Handle missing platform directory | T-6.3 scenario-1 |
| Normalize content before comparison | T-1.2 |
| Performance: <2s for 100 files | T-6.3 performance test |
