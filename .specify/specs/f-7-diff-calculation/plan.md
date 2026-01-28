# Technical Plan: Diff Calculation (F-7)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLI Layer                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│  │   push   │  │  status  │  │   sync   │  │  --dry-  │  (consumers)       │
│  │          │  │          │  │          │  │   run    │                     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘                    │
│       │             │             │             │                           │
└───────┼─────────────┼─────────────┼─────────────┼───────────────────────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Diff Calculation Engine                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     calculateDiff()                                 │   │
│  │  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐          │   │
│  │  │ Match files  │─>│ Compare       │─>│ Classify        │          │   │
│  │  │ by slug      │  │ source-owned  │  │ added/modified/ │          │   │
│  │  │              │  │ fields only   │  │ unchanged/      │          │   │
│  │  │              │  │               │  │ removed         │          │   │
│  │  └──────────────┘  └───────────────┘  └─────────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          DiffResult                                 │   │
│  │  { summary: {...}, items: [...] }                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
        │                              │
        ▼                              ▼
┌───────────────────┐         ┌────────────────────┐
│   Source State    │         │  Platform State    │
│  (F-2, F-4, F-5)  │         │      (F-6)         │
│                   │         │                    │
│  discoverLessons()│         │ readPlatformState()│
│  discoverGuides() │         │                    │
│  discoverAssets() │         │                    │
└───────────────────┘         └────────────────────┘
```

**Flow:**
1. CLI commands call `calculateDiff(sourceManifest, platformManifest, config)`
2. Engine matches files by slug (canonical key)
3. For each matched pair: compare source-owned fields only
4. Classify as added/modified/unchanged/removed
5. For modified files: detect which specific fields changed
6. Return structured DiffResult with summary and item-level details
7. Pure function: no filesystem access, no side effects

## Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Bun | Project standard, consistent with F-2–F-6 |
| Input data | Manifests from F-2, F-4, F-5, F-6 | Reuse existing discovery/platform reading |
| Comparison | Pure TypeScript functions | No dependencies, fully testable |
| Normalization | String trimming + line ending normalization | Avoid false positives |
| Content comparison | SHA-256 hash from F-6 | Fast, deterministic, already computed |
| Field filtering | Config-driven exclusion list | Platform-owned fields from config |
| Testing | Bun test | Consistent with project patterns |

**Note on purity:** The diff engine is a pure function. It receives pre-loaded manifests and config, performs comparisons, and returns a result object. No I/O, no side effects. This enables 100% unit test coverage and deterministic behavior.

## Data Model

### Core Types

```typescript
// src/types.ts additions (F-7)

/**
 * Status classification for a file in the diff.
 */
export type DiffStatus = "added" | "modified" | "unchanged" | "removed";

/**
 * A single field change detected during comparison.
 */
export interface FieldChange {
  /** Field name (e.g., "title", "description", "body") */
  field: string;
  /** Value from source (or hash for body content) */
  source: string | undefined;
  /** Value from platform (or hash for body content) */
  platform: string | undefined;
}

/**
 * A single file's diff result.
 */
export interface DiffItem {
  /** Relative file path (from source root) */
  path: string;
  /** Course ID */
  courseId: string;
  /** File slug (canonical matching key) */
  slug: string;
  /** Classification status */
  status: DiffStatus;
  /** Specific field changes (only for "modified" status) */
  changes?: FieldChange[];
}

/**
 * Summary statistics for a diff operation.
 */
export interface DiffSummary {
  /** Total files in source */
  totalSource: number;
  /** Total files on platform */
  totalPlatform: number;
  /** Files to be added (exist in source, not platform) */
  added: number;
  /** Files modified (exist in both, but differ) */
  modified: number;
  /** Files unchanged (exist in both, identical) */
  unchanged: number;
  /** Files removed from source (exist on platform, not source) */
  removed: number;
}

/**
 * Complete diff result for a sync operation.
 */
export interface DiffResult {
  /** Summary statistics */
  summary: DiffSummary;
  /** Per-file diff items */
  items: DiffItem[];
  /** Content type being diffed */
  contentType: "lessons" | "guides" | "assets";
  /** Timestamp of diff calculation */
  calculatedAt: Date;
}

/**
 * Options for diff calculation.
 */
export interface DiffOptions {
  /** Course filter (default: compare all courses) */
  courseId?: string;
  /** Include unchanged files in items array (default: false) */
  includeUnchanged?: boolean;
  /** Normalize whitespace before comparison (default: true) */
  normalizeWhitespace?: boolean;
}
```

### Ownership Boundary

Platform-owned fields are read from `config.platform.protectedFields` (see F-6). Default list:
- `price`
- `lemonSqueezyProductId`
- `enrollmentCount`
- `publishedAt`

**Implementation:** When comparing frontmatter, filter out any field present in `protectedFields`. Only compare fields that are source-owned.

## API Contracts

### Primary Function

```typescript
/**
 * Calculate differences between source content and platform content.
 *
 * Pure function: takes pre-loaded manifests as input, returns diff result.
 * Never reads from filesystem or modifies any data.
 *
 * @param source - Source lessons/guides manifest (from F-2/F-4)
 * @param platform - Platform state manifest (from F-6)
 * @param config - CourseKit configuration
 * @param options - Diff calculation options
 * @returns Structured diff result with summary and item-level details
 *
 * @example Calculate lesson diff
 * const sourceManifest = discoverLessons(config);
 * const platformManifest = await readPlatformState(config);
 * const diff = calculateLessonDiff(
 *   sourceManifest,
 *   platformManifest,
 *   config
 * );
 * console.log(`${diff.summary.added} to add, ${diff.summary.modified} to update`);
 */
export function calculateLessonDiff(
  source: LessonManifest,
  platform: PlatformStateManifest,
  config: CourseKitConfig,
  options?: DiffOptions
): DiffResult;

export function calculateGuideDiff(
  source: GuideManifest,
  platform: PlatformStateManifest,
  config: CourseKitConfig,
  options?: DiffOptions
): DiffResult;
```

### Helper Functions

```typescript
/**
 * Match source and platform files by slug (canonical key).
 *
 * @param sourceLessons - Lessons from source discovery
 * @param platformLessons - Lessons from platform state
 * @returns Map of slug to { source?, platform? }
 */
export function matchFilesBySlug<S, P>(
  sourceItems: S[],
  platformItems: P[],
  slugExtractor: (item: S | P) => string
): Map<string, { source?: S; platform?: P }>;

/**
 * Normalize content for comparison to avoid whitespace false positives.
 *
 * @param content - Raw content string
 * @returns Normalized content (trimmed, consistent line endings)
 */
export function normalizeContent(content: string): string;

/**
 * Compare two frontmatter objects, excluding platform-owned fields.
 *
 * @param sourceFrontmatter - Source frontmatter
 * @param platformFrontmatter - Platform frontmatter
 * @param protectedFields - Fields to exclude from comparison
 * @returns Array of field changes
 */
export function compareFrontmatter(
  sourceFrontmatter: Record<string, unknown>,
  platformFrontmatter: Record<string, unknown>,
  protectedFields: string[]
): FieldChange[];

/**
 * Classify a matched file pair into diff status.
 *
 * @param source - Source file (or undefined if not present)
 * @param platform - Platform file (or undefined if not present)
 * @param changes - Field changes (if both present)
 * @returns Diff status classification
 */
export function classifyDiffStatus(
  source: unknown | undefined,
  platform: unknown | undefined,
  changes: FieldChange[]
): DiffStatus;
```

## Implementation Phases

### Phase 1: Content Normalization

**Goal:** Establish content normalization to avoid whitespace false positives.

**Files:**
- Create `src/lib/diff-utils.ts` with `normalizeContent()`

**Deliverables:**
- `normalizeContent(content: string): string`
  - Trim leading/trailing whitespace
  - Normalize line endings to `\n`
  - Collapse multiple blank lines to single blank line
- Unit tests verifying normalization behavior

**Test cases:**
- Different line endings (`\r\n` vs `\n`) → same output
- Trailing whitespace → removed
- Multiple blank lines → collapsed
- Unicode content → preserved

### Phase 2: File Matching by Slug

**Goal:** Match source and platform files by canonical key (slug).

**Files:**
- Extend `src/lib/diff-utils.ts` with `matchFilesBySlug()`

**Deliverables:**
- Generic matching function that builds a map of slug → { source?, platform? }
- Handles cases where file exists in only one location
- Preserves file metadata during matching

**Test cases:**
- File in both source and platform
- File only in source (will be "added")
- File only in platform (will be "removed")
- Multiple courses (correct slug scoping)
- Empty source (all platform files are "removed")
- Empty platform (all source files are "added")

### Phase 3: Frontmatter Comparison

**Goal:** Compare frontmatter fields, excluding platform-owned fields.

**Files:**
- Extend `src/lib/diff-utils.ts` with `compareFrontmatter()`

**Deliverables:**
- Field-by-field comparison of source vs platform frontmatter
- Filter out fields in `protectedFields` list
- Detect added fields (in source, not platform)
- Detect removed fields (in platform, not source)
- Detect changed fields (different values)
- Return `FieldChange[]` array

**Test cases:**
- Identical frontmatter → no changes
- Changed title field → 1 change
- Platform-owned field changed → ignored (no change)
- Field added in source → detected
- Field removed in source → detected
- Multiple fields changed → all detected
- Undefined vs null vs empty string → handled correctly

### Phase 4: Diff Classification

**Goal:** Classify each matched file into added/modified/unchanged/removed.

**Files:**
- Extend `src/lib/diff-utils.ts` with `classifyDiffStatus()`

**Deliverables:**
- Logic to determine status:
  - `added`: exists in source, not in platform
  - `removed`: exists in platform, not in source
  - `modified`: exists in both, has field changes OR content hash differs
  - `unchanged`: exists in both, no changes
- For `modified`: populate `changes` array with field-level details

**Test cases:**
- Source-only file → "added"
- Platform-only file → "removed"
- Both exist, identical content → "unchanged"
- Both exist, frontmatter changed → "modified" with field changes
- Both exist, body changed (hash differs) → "modified" with body change
- Both exist, platform-only field changed → "unchanged"

### Phase 5: Main Diff Function

**Goal:** Orchestrate full diff calculation for lessons and guides.

**Files:**
- Create `src/lib/diff.ts` with main functions

**Deliverables:**
- `calculateLessonDiff(source, platform, config, options)`
- `calculateGuideDiff(source, platform, config, options)`
- Match files by slug
- For each matched pair:
  - Compare frontmatter (excluding protected fields)
  - Compare content hash (from F-6)
  - Classify status
  - Build DiffItem
- Aggregate summary statistics
- Sort items by status, then by path
- Handle courseId filter if provided

**Test cases:**
- Scenario 1: 10 source lessons, 4 platform lessons → 6 added, 4 compared
- Scenario 2: Identical content → all unchanged
- Scenario 3: Modified lesson content → detected as modified
- Scenario 4: Deleted lesson in source → detected as removed
- Scenario 5: Platform-owned fields ignored → no false modifications
- Scenario 6: Frontmatter-only changes → detected correctly
- Empty platform (first sync) → all added
- CourseId filter → only compare specified course

### Phase 6: Integration and Testing

**Goal:** Export API and create comprehensive integration tests.

**Files:**
- Update `src/types.ts` with new types
- Create `src/lib/diff.test.ts` with integration tests
- Create test fixtures in `test-fixtures/diff/`

**Deliverables:**
- Clean public API exported from `src/lib/diff.ts`
- Integration test using discovery + platform state + diff
- Test all user scenarios from spec
- Verify determinism (same inputs → same output)
- Performance test (100 lessons in <2 seconds)

**Test fixtures:**
- `test-fixtures/diff/scenario-1/` - 10 source, 4 platform (add/compare)
- `test-fixtures/diff/scenario-2/` - Identical content
- `test-fixtures/diff/scenario-3/` - Modified content
- `test-fixtures/diff/scenario-4/` - Deleted from source
- `test-fixtures/diff/scenario-5/` - Platform fields only changed
- `test-fixtures/diff/scenario-6/` - Frontmatter-only changes

## File Structure

```
src/
├── index.ts                          # CLI entry (no changes yet)
├── types.ts                          # ADD: Diff*, FieldChange types
├── lib/
│   ├── database.ts                   # Existing (unchanged)
│   ├── discovery.ts                  # F-2 (provides LessonManifest)
│   ├── guide-discovery.ts            # F-4 (provides GuideManifest)
│   ├── asset-discovery.ts            # F-5 (provides AssetManifest)
│   ├── platform-state.ts             # F-6 (provides PlatformStateManifest)
│   ├── diff-utils.ts                 # NEW: Matching, comparison, normalization
│   ├── diff-utils.test.ts            # NEW: Unit tests for utilities
│   ├── diff.ts                       # NEW: Main diff calculation functions
│   └── diff.test.ts                  # NEW: Integration tests
└── commands/
    └── (future: push.ts, status.ts will import calculateLessonDiff)

test-fixtures/diff/                   # NEW: Diff calculation test fixtures
├── scenario-1-add-new/
│   ├── source/courses/course-a/lessons/
│   │   ├── 01-intro.md               (10 lessons)
│   │   └── ...
│   └── platform/src/content/lessons/course-a/
│       ├── 01-intro.md               (4 lessons)
│       └── ...
├── scenario-2-no-changes/
│   └── (identical content in source and platform)
├── scenario-3-modified-content/
│   └── (source has updated body content)
├── scenario-4-deleted-from-source/
│   └── (platform has lesson not in source)
├── scenario-5-platform-fields-only/
│   └── (only price/lemonSqueezyProductId changed)
└── scenario-6-frontmatter-only/
    └── (title/description changed, body identical)
```

## Dependencies

### Existing Dependencies Used

- TypeScript built-in types (Map, Set)
- `src/lib/discovery.ts` (F-2) - provides `LessonManifest`
- `src/lib/guide-discovery.ts` (F-4) - provides `GuideManifest`
- `src/lib/platform-state.ts` (F-6) - provides `PlatformStateManifest`, `contentHash`
- `src/types.ts` - existing manifest types

### No New Packages Required

All functionality uses pure TypeScript with existing project infrastructure. The diff engine is a pure function operating on in-memory data structures.

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Whitespace differences cause false positives | High | Medium | Normalize content before comparison |
| Platform-owned field not in protected list | Medium | Medium | Make list configurable, document clearly |
| Slug collision (two files same slug, different courses) | High | Low | Scope slugs by courseId in matching |
| Content hash not computed (missing in platform manifest) | Medium | Low | Handle undefined hash gracefully, compare raw content |
| Large file sets exceed memory | Medium | Very Low | Diff is pure function on manifests (already loaded) |
| Frontmatter field type mismatch (string vs number) | Low | Medium | Use strict equality, detect type changes |
| Line ending inconsistency | Low | High | Normalize to `\n` before comparison |
| Unicode normalization (NFC vs NFD) | Low | Low | Document assumption: use platform default |
| Empty frontmatter vs undefined field | Medium | Medium | Treat undefined and empty string as different |
| Concurrent access during diff | None | Zero | Diff is read-only, no shared state |

### Edge Cases to Handle

1. **Source file exists, platform file doesn't** → "added"
2. **Platform file exists, source file doesn't** → "removed"
3. **Both exist, identical** → "unchanged"
4. **Both exist, only platform-owned fields differ** → "unchanged"
5. **Both exist, content hash differs** → "modified" with `body` in changes
6. **Both exist, frontmatter field added** → "modified" with field change
7. **Both exist, frontmatter field removed** → "modified" with field change
8. **Both exist, frontmatter field changed** → "modified" with field change
9. **Empty source manifest** → all platform files "removed"
10. **Empty platform manifest** → all source files "added"
11. **Undefined content hash** → fallback to string comparison (slower)
12. **Null vs undefined vs empty string** → treat as distinct values

## Success Criteria Mapping

| Spec Criterion | Implementation | Test |
|----------------|----------------|------|
| Compare by canonical key (slug) | `matchFilesBySlug()` | scenario-1 |
| Classify added/modified/unchanged/removed | `classifyDiffStatus()` | all scenarios |
| Report which fields changed | `compareFrontmatter()` | scenario-3, scenario-6 |
| Exclude platform-owned fields | Filter by `protectedFields` | scenario-5 |
| Support lessons, guides, assets | Separate functions per type | multiple tests |
| Return structured DiffResult | Type definitions + construction | all tests |
| Provide human-readable summary | `summary` object with counts | all tests |
| Handle missing platform directory gracefully | Accept empty platform manifest | scenario-1 (first sync) |
| Normalize content before comparison | `normalizeContent()` | whitespace test |

## Performance Considerations

- **Pure function:** No I/O, operates on pre-loaded manifests
- **Matching complexity:** O(n + m) where n=source files, m=platform files (single Map build + lookup)
- **Comparison complexity:** O(k) per file where k=number of frontmatter fields (typically <10)
- **Content comparison:** Hash comparison is O(1) (hashes pre-computed in F-6)
- **Sorting:** Single sort pass at end: O(n log n) where n=total files
- **Memory:** Linear in number of files (DiffItem per file)

**Expected performance:** 100 lessons compared in <100ms (matching: 10ms, comparison: 50ms, sorting: 10ms)

**Target:** Diff calculation completes in <2 seconds for up to 100 lesson files (spec requirement)

## Future Integration Points

- **F-8 (Push command):** Will use `calculateLessonDiff()` to determine which files to sync
- **F-9 (Status command):** Will display `DiffResult` in human-readable format
- **F-10 (Dry run):** Will show `DiffResult` without executing sync
- **F-11 (Conflict resolution):** Will use `DiffItem.changes` to show user what would be overwritten

## Configuration Integration

Diff calculation reads protected fields from `coursekit.json`:

```json
{
  "platform": {
    "path": "/path/to/platform",
    "protectedFields": [
      "price",
      "lemonSqueezyProductId",
      "enrollmentCount",
      "publishedAt"
    ]
  }
}
```

**Default behavior:** If `protectedFields` not specified, use `DEFAULT_PROTECTED_FIELDS` from `src/types.ts` (defined in F-6).

## Open Questions for Clarification

1. **Body diff granularity:** Should `changes` include line-level diff for body content, or just a "body changed" flag?
   - **Recommendation:** Start with flag (`{ field: "body", source: hash1, platform: hash2 }`), add line diff later if needed

2. **Asset diff scope:** Should F-7 diff binary asset files, or only references in markdown?
   - **Recommendation:** Defer binary asset diff to future feature; focus on lessons/guides for F-7

3. **Unchanged files in output:** Should `DiffResult.items` include unchanged files, or only changed ones?
   - **Recommendation:** Exclude by default, add `includeUnchanged` option for status commands

4. **Field removal handling:** If a field exists on platform but not in source, is that "removed from source" or "ignore"?
   - **Recommendation:** Treat as "removed" (source is authoritative for source-owned fields)

5. **Normalization scope:** Should normalization include Unicode normalization (NFC/NFD)?
   - **Recommendation:** No; assume platform uses consistent Unicode encoding (add if needed later)

**Note:** These are clarifications, not blockers. Plan proceeds with recommended defaults.
