# Implementation Tasks: Platform State Reading (F-6)

## Progress Tracking

| Task | Status | Notes |
|------|--------|-------|
| T-1.1 | ☐ | |
| T-1.2 | ☐ | |
| T-1.3 | ☐ | |
| T-2.1 | ☐ | |
| T-2.2 | ☐ | |
| T-3.1 | ☐ | |
| T-3.2 | ☐ | |
| T-4.1 | ☐ | |
| T-4.2 | ☐ | |
| T-5.1 | ☐ | |

## Group 1: Foundation - Content Hashing

### T-1.1: Create content hashing utility [T]
- **File:** src/lib/platform-utils.ts
- **Test:** src/lib/platform-utils.test.ts
- **Dependencies:** none
- **Description:** Implement `hashContent(body: string): string` using Node.js `crypto.createHash('sha256')`. Returns hex-encoded SHA-256 hash of body content (excluding frontmatter). This enables change detection for platform state comparison.

### T-1.2: Add hashing unit tests [T] [P with T-1.3]
- **File:** src/lib/platform-utils.test.ts
- **Test:** (same file)
- **Dependencies:** T-1.1
- **Description:** Test cases for content hashing:
  - Empty string produces consistent hash
  - Identical content produces identical hashes
  - Different content produces different hashes
  - Unicode content hashes correctly
  - Hash output is deterministic (same input = same output every time)

### T-1.3: Create platform state types [T]
- **File:** src/types.ts (extend existing)
- **Test:** src/lib/platform-state.test.ts (type validation)
- **Dependencies:** none
- **Description:** Add TypeScript interfaces to `src/types.ts`:
  - `PlatformOwnedFields` - Commerce/platform-only fields (price, lemonSqueezyProductId, etc.)
  - `PlatformLesson` - Lesson file with path, frontmatter, contentHash
  - `PlatformGuide` - Guide file with path, frontmatter, contentHash
  - `PlatformAsset` - Asset reference with path, mimeType, size
  - `PlatformStateWarningCode` - Warning type enum
  - `PlatformStateWarning` - Warning structure
  - `PlatformStateManifest` - Complete state result
  - `PlatformStateOptions` - Function options

## Group 2: Platform File Scanning

### T-2.1: Implement platform lesson scanning [T]
- **File:** src/lib/platform-utils.ts
- **Test:** src/lib/platform-utils.test.ts
- **Dependencies:** T-1.3
- **Description:** Add `scanPlatformLessons(platformRoot: string, courseId?: string): Promise<string[]>`. Uses Bun glob to find `src/content/lessons/**/*.md` files. Filters by courseId if provided. Returns sorted array of absolute file paths.

### T-2.2: Implement platform guide scanning [T] [P with T-2.1]
- **File:** src/lib/platform-utils.ts
- **Test:** src/lib/platform-utils.test.ts
- **Dependencies:** T-1.3
- **Description:** Add `scanPlatformGuides(platformRoot: string, courseId?: string): Promise<string[]>`. Uses Bun glob to find `src/content/guides/**/*.md` files. Filters by courseId if provided. Returns sorted array of absolute file paths.

## Group 3: Frontmatter Parsing with Platform Fields

### T-3.1: Add platform file parsing [T]
- **File:** src/lib/platform-utils.ts
- **Test:** src/lib/platform-utils.test.ts
- **Dependencies:** T-1.3
- **Description:** Add `parsePlatformFile(filePath: string): { frontmatter: Record<string, unknown>, body: string, error?: string }`. Reuses existing `parseFrontmatter` from `discovery-utils.ts` (F-2/F-4). Catches YAML parse errors and returns them in `error` field instead of throwing.

### T-3.2: Add platform field extraction [T]
- **File:** src/lib/platform-utils.ts
- **Test:** src/lib/platform-utils.test.ts
- **Dependencies:** T-1.3, T-3.1
- **Description:** Add `extractPlatformFields(frontmatter: Record<string, unknown>, config: CourseKitConfig): PlatformOwnedFields`. Reads `config.platform.protectedFields` array (or uses defaults: price, lemonSqueezyProductId, enrollmentCount, publishedAt). Returns object containing only platform-owned fields from frontmatter.

## Group 4: Main Reading Function

### T-4.1: Implement readPlatformState orchestration [T]
- **File:** src/lib/platform-state.ts (new file)
- **Test:** src/lib/platform-state.test.ts
- **Dependencies:** T-1.1, T-2.1, T-2.2, T-3.1, T-3.2
- **Description:** Create main `readPlatformState(config: CourseKitConfig, options?: PlatformStateOptions): Promise<PlatformStateManifest>` function. Orchestrates:
  1. Read platform root from `config.platform.path`
  2. Scan lessons and guides using T-2.1/T-2.2 utilities
  3. For each file: parse frontmatter (T-3.1), extract platform fields (T-3.2), hash body (T-1.1)
  4. Group results by courseId
  5. Aggregate warnings for parse/hash errors
  6. Return sorted `PlatformStateManifest`

### T-4.2: Add platform state integration tests [T]
- **File:** src/lib/platform-state.test.ts
- **Test:** (same file)
- **Dependencies:** T-4.1
- **Description:** Integration tests covering all spec scenarios:
  - Scenario 1: Read all platform lessons for a course
  - Scenario 2: Read platform state across all courses
  - Scenario 3: Read platform guides for a course
  - Scenario 4: Handle empty or missing course directory
  - Scenario 5: Preserve platform-only fields in state
  - Scenario 6: Handle corrupted or unparseable platform files

## Group 5: Test Fixtures and Polish

### T-5.1: Create platform state test fixtures
- **File:** test-fixtures/platform/ (directory structure)
- **Test:** Used by T-4.2
- **Dependencies:** none (can run early, parallel with other groups)
- **Description:** Create test fixture directories:
  - `single-course/` - One course with lessons + platform fields
  - `multi-course/` - Multiple courses with lessons and guides
  - `empty-course/` - Empty course directory
  - `corrupted/` - Lesson file with malformed YAML frontmatter
  Each fixture includes `coursekit.json` and Astro-like `src/content/` structure.

## Execution Order

### Phase 1: Foundation (Parallel Start)
1. **T-1.1** - Content hashing utility (no deps)
2. **T-1.3** - Platform state types (no deps, parallel with T-1.1)
3. **T-5.1** - Test fixtures (no deps, parallel with above)

### Phase 2: Foundation Tests
4. **T-1.2** - Hashing tests (after T-1.1)

### Phase 3: Scanning (Parallel)
5. **T-2.1** - Lesson scanning (after T-1.3)
6. **T-2.2** - Guide scanning (after T-1.3, parallel with T-2.1)

### Phase 4: Parsing (Sequential)
7. **T-3.1** - File parsing (after T-1.3)
8. **T-3.2** - Platform field extraction (after T-3.1)

### Phase 5: Integration
9. **T-4.1** - Main reading function (after T-1.1, T-2.1, T-2.2, T-3.1, T-3.2)
10. **T-4.2** - Integration tests (after T-4.1 and T-5.1)

## Parallelization Opportunities

| Wave | Parallel Tasks | Reason |
|------|----------------|--------|
| 1 | T-1.1, T-1.3, T-5.1 | No dependencies, different files |
| 2 | T-2.1, T-2.2 | Both scanning, different content types |

## Summary

- **Total tasks:** 10
- **Parallelizable tasks:** 5 (marked with [P])
- **Test tasks:** 10 (all tasks require tests, marked with [T])
- **New files:** 2 (platform-utils.ts, platform-state.ts)
- **Test files:** 2 (platform-utils.test.ts, platform-state.test.ts)
- **Critical path:** T-1.1 → T-4.1 → T-4.2 (foundation → orchestration → integration)
