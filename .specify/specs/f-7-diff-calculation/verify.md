# F-7: Diff Calculation - Verification

## Pre-Verification Checklist

- [x] All implementation files created
- [x] All test files created
- [x] TDD approach followed (RED → GREEN → REFACTOR)
- [x] Types defined in types.ts
- [x] Test fixtures created for all scenarios
- [x] No TypeScript errors
- [x] No linting errors

## Smoke Test Results

```
$ bun test src/lib/diff.test.ts
bun test v1.3.6 (d530ed99)

 16 pass
 0 fail
 45 expect() calls
Ran 16 tests across 1 file. [101.00ms]
```

All core scenarios verified:
- ✅ Scenario 1: Preview changes (10 source, 4 platform → 6 added)
- ✅ Scenario 2: No changes detected (identical content)
- ✅ Scenario 3: Modified body content detected
- ✅ Scenario 4: Deleted lesson detected
- ✅ Scenario 5: Platform-owned fields ignored
- ✅ Scenario 6: Frontmatter-only changes detected

## Browser Verification

N/A - This is a library module with no browser interface. Verification is done through automated tests.

## API Verification

Verified via programmatic tests:

```typescript
// Verified calculateLessonDiff returns correct DiffResult structure
const result = await calculateLessonDiff(config);
expect(result.contentType).toBe("lessons");
expect(result.summary).toBeDefined();
expect(result.items).toBeInstanceOf(Array);
expect(result.calculatedAt).toBeInstanceOf(Date);
```

## Test Results

```
$ bun test
bun test v1.3.6 (d530ed99)

 290 pass
 0 fail
 552 expect() calls
Ran 290 tests across 12 files. [229.00ms]
```

## Test Coverage by Module

| Module | Tests | Status |
|--------|-------|--------|
| diff-utils.test.ts | 34 | PASS |
| diff.test.ts | 16 | PASS |
| platform-state.test.ts | 25 | PASS |
| platform-utils.test.ts | 23 | PASS |
| discovery.test.ts | 20 | PASS |
| discovery-utils.test.ts | 29 | PASS |
| validation.test.ts | 33 | PASS |
| guide-discovery.test.ts | 22 | PASS |
| guide-discovery-utils.test.ts | 33 | PASS |
| asset-discovery.test.ts | 23 | PASS |
| asset-discovery-utils.test.ts | 20 | PASS |
| config.test.ts | 12 | PASS |

## Spec Scenarios Verified

| Scenario | Test | Status |
|----------|------|--------|
| Preview changes before sync | Scenario 1 tests | PASS |
| No changes detected | Scenario 2 tests | PASS |
| Modified lesson content | Scenario 3 tests | PASS |
| Deleted lesson in source | Scenario 4 tests | PASS |
| Platform-owned fields ignored | Scenario 5 tests | PASS |
| Frontmatter-only changes | Scenario 6 tests | PASS |

## Content Normalization Tests (10 tests)

- Trims leading and trailing whitespace
- Normalizes CRLF to LF
- Normalizes CR to LF
- Collapses multiple blank lines
- Preserves single blank lines
- Handles empty string
- Handles whitespace-only string
- Preserves Unicode content
- Removes trailing whitespace from lines
- Handles mixed line endings

## File Matching Tests (6 tests)

- Matches files in both source and platform
- Identifies files only in source
- Identifies files only on platform
- Handles multiple courses with same slug
- Returns empty map for empty inputs
- Handles mixed scenarios

## Frontmatter Comparison Tests (9 tests)

- Returns empty for identical frontmatter
- Detects changed field value
- Ignores platform-owned field changes
- Detects added field in source
- Detects removed field from source
- Detects multiple field changes
- Handles undefined and null values
- Handles empty string vs undefined
- Handles nested objects and arrays

## Diff Classification Tests (8 tests)

- Classifies source-only as added
- Classifies platform-only as removed
- Classifies identical content as unchanged
- Classifies different body hash as modified
- Classifies frontmatter changes as modified
- Classifies platform-only field changes as unchanged
- Handles both frontmatter and body changes
- Handles missing platform hash

## Lesson Diff Calculation Tests (12 tests)

- Scenario 1: Detects 6 added lessons (10 source, 4 platform)
- Scenario 1: Returns items sorted by status then key
- Scenario 2: Detects all items as unchanged
- Scenario 2: Returns empty items by default
- Scenario 2: Includes unchanged items when requested
- Scenario 3: Detects modified body content
- Scenario 4: Detects removed item
- Scenario 5: Treats platform-owned field differences as unchanged
- Scenario 6: Detects frontmatter changes with same body
- Scenario 6: Reports which fields changed
- Filters by courseId
- Includes calculatedAt timestamp

## Integration Tests (4 tests)

- Handles missing platform directory gracefully
- Handles empty source gracefully
- Returns deterministic results
- Guide diff follows same pattern as lesson diff

## Success Criteria Checklist

- [x] Compare by canonical key (slug)
- [x] Classify added/modified/unchanged/removed
- [x] Report which fields changed
- [x] Exclude platform-owned fields
- [x] Support lessons, guides
- [x] Return structured DiffResult
- [x] Handle missing platform directory
- [x] Normalize content before comparison

## TDD Process Followed

1. **RED**: Wrote 50 tests first (diff-utils.test.ts, diff.test.ts)
2. **GREEN**: Implemented diff-utils.ts and diff.ts
3. **REFACTOR**: Clean code, consistent slug extraction

## Breaking Changes

- Platform state now extracts slugs using the same pattern as source discovery
- Slug for "01-intro.md" is now "intro" instead of "01-intro"
- Updated platform-state.test.ts to match new behavior

## Verification Date

2026-01-28
