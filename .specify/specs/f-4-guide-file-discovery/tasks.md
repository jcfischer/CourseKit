# Implementation Tasks: Guide File Discovery (F-4)

## Progress Tracking

| Task | Status | Notes |
|------|--------|-------|
| T-1.1 | ☐ | Type definitions |
| T-1.2 | ☐ | Filename parsing utils |
| T-1.3 | ☐ | Frontmatter parsing utils |
| T-2.1 | ☐ | Glob scanning |
| T-2.2 | ☐ | Main discovery function |
| T-3.1 | ☐ | Test fixtures - flat |
| T-3.2 | ☐ | Test fixtures - nested |
| T-3.3 | ☐ | Test fixtures - mixed |
| T-3.4 | ☐ | Test fixtures - empty/missing |
| T-3.5 | ☐ | Test fixtures - malformed |
| T-4.1 | ☐ | Integration tests |
| T-4.2 | ☐ | Performance tests |

## Group 1: Foundation (Type System & Utilities)

### T-1.1: Create guide discovery type definitions [T]
- **File:** `src/types.ts` (additions)
- **Test:** Type compilation validation
- **Dependencies:** none
- **Description:** Add guide discovery types to existing types.ts:
  - `GuideFrontmatter` interface (title required, description optional)
  - `GuideFrontmatterSchema` Zod schema with passthrough
  - `DiscoveredGuide` interface (path, relativePath, slug, frontmatter, rawFrontmatter)
  - `GuideManifest` interface (guides array, warnings, materialsRoot, discoveredAt)
  - `GuideDiscoveryWarning` and `GuideDiscoveryWarningCode` types
  - `GuideDiscoveryOptions` interface
  - Export all new types

**Acceptance Criteria:**
- [ ] TypeScript compiles without errors
- [ ] All types exported from src/types.ts
- [ ] Zod schema allows passthrough for extra fields
- [ ] Mirrors lesson discovery type structure

### T-1.2: Implement filename parsing utilities [T] [P with T-1.3]
- **File:** `src/lib/guide-discovery-utils.ts`
- **Test:** `src/lib/guide-discovery-utils.test.ts`
- **Dependencies:** T-1.1
- **Description:** Create guide-specific filename parsing:
  - `GUIDE_FILENAME_PATTERN` regex: `/^guide(?:-(.+))?\.md$/i`
  - `parseGuideFilename(filename: string)` function
  - Extract slug from guide-{slug}.md pattern
  - Handle bare "guide.md" → slug: "guide"

**Test Cases:**
- [ ] `guide.md` → `{ slug: "guide" }`
- [ ] `guide-setup.md` → `{ slug: "setup" }`
- [ ] `guide-multi-word-slug.md` → `{ slug: "multi-word-slug" }`
- [ ] `Guide-CamelCase.md` → `{ slug: "CamelCase" }`
- [ ] `readme.md` → `null`
- [ ] `my-guide.md` → `null`
- [ ] `guide-01-intro.md` → `{ slug: "01-intro" }`

### T-1.3: Implement frontmatter parsing utilities [T] [P with T-1.2]
- **File:** `src/lib/guide-discovery-utils.ts` (additions)
- **Test:** `src/lib/guide-discovery-utils.test.ts` (additions)
- **Dependencies:** T-1.1
- **Description:** Create frontmatter parsing for guides:
  - `parseGuideFrontmatter(content: string)` function
  - Return `{ frontmatter, raw?, error? }`
  - Reuse pattern from discovery-utils.ts (F-2)
  - Handle missing/malformed YAML gracefully

**Test Cases:**
- [ ] Valid frontmatter with title + description
- [ ] Valid frontmatter with title only
- [ ] Valid frontmatter with extra fields (passthrough)
- [ ] Missing frontmatter → error
- [ ] Invalid YAML syntax → error
- [ ] Missing title field → error
- [ ] Empty frontmatter block → error

## Group 2: Core Discovery Logic

### T-2.1: Implement directory scanning with Bun.Glob [T]
- **File:** `src/lib/guide-discovery-utils.ts` (additions)
- **Test:** `src/lib/guide-discovery-utils.test.ts` (additions)
- **Dependencies:** T-1.1
- **Description:** Create glob-based guide file scanner:
  - `scanGuideFiles(materialsRoot: string, options?)` function
  - Use `new Bun.Glob("**/guide*.md").scan({ cwd: materialsRoot })`
  - Handle missing materials directory (return empty, no throw)
  - Handle empty directory (return empty)
  - Filter hidden files (.DS_Store, etc.)
  - Return paths sorted alphabetically
  - Support subdirectory filtering via options

**Test Cases:**
- [ ] Flat directory with multiple guides
- [ ] Nested directories at various depths
- [ ] Mixed guide and non-guide markdown files
- [ ] Empty materials directory
- [ ] Missing materials directory (no throw)
- [ ] Hidden files excluded
- [ ] Results sorted alphabetically
- [ ] Subdirectory filter works

### T-2.2: Implement main discovery function [T]
- **File:** `src/lib/guide-discovery.ts`
- **Test:** `src/lib/guide-discovery.test.ts`
- **Dependencies:** T-1.1, T-1.2, T-1.3, T-2.1
- **Description:** Create main `discoverGuides()` function:
  - Accept `CourseKitConfig` and `GuideDiscoveryOptions`
  - Resolve materials root from config
  - Call `scanGuideFiles()` for file list
  - For each file:
    - Parse filename for slug (T-1.2)
    - Read file content with Bun.file()
    - Parse frontmatter (T-1.3)
    - Build `DiscoveredGuide` object
    - Collect warnings for issues (don't throw)
  - Sort results alphabetically by relativePath
  - Return `GuideManifest` with guides, warnings, metadata

**Test Cases:**
- [ ] Discovers guides in flat structure
- [ ] Discovers guides in nested structure
- [ ] Filters non-guide markdown files
- [ ] Returns empty for missing materials dir + warning
- [ ] Returns empty for empty materials dir + warning
- [ ] Includes malformed files with warnings
- [ ] Respects subdirectory filter option
- [ ] Includes rawFrontmatter when option enabled
- [ ] Results sorted alphabetically
- [ ] Timestamps in discoveredAt field

## Group 3: Test Fixtures

### T-3.1: Create flat structure test fixtures [P with T-3.2, T-3.3, T-3.4, T-3.5]
- **Directory:** `test-fixtures/guides-flat/`
- **Test:** Used by T-2.2 tests
- **Dependencies:** none
- **Description:** Create fixture for Scenario 1:
  - `coursekit.json` with materialsRoot
  - `materials/guide-setup.md` (valid frontmatter)
  - `materials/guide-troubleshooting.md` (valid frontmatter)

**Files to create:**
- [ ] coursekit.json
- [ ] materials/guide-setup.md
- [ ] materials/guide-troubleshooting.md

### T-3.2: Create nested structure test fixtures [P with T-3.1, T-3.3, T-3.4, T-3.5]
- **Directory:** `test-fixtures/guides-nested/`
- **Test:** Used by T-2.2 tests
- **Dependencies:** none
- **Description:** Create fixture for Scenario 2:
  - `coursekit.json` with materialsRoot
  - `materials/module-01/guide-intro.md`
  - `materials/module-02/advanced/guide-deployment.md`

**Files to create:**
- [ ] coursekit.json
- [ ] materials/module-01/guide-intro.md
- [ ] materials/module-02/advanced/guide-deployment.md

### T-3.3: Create mixed files test fixtures [P with T-3.1, T-3.2, T-3.4, T-3.5]
- **Directory:** `test-fixtures/guides-mixed/`
- **Test:** Used by T-2.2 tests
- **Dependencies:** none
- **Description:** Create fixture for Scenario 3:
  - `coursekit.json` with materialsRoot
  - `materials/guide-setup.md` (should be discovered)
  - `materials/notes.md` (should be filtered)
  - `materials/README.md` (should be filtered)

**Files to create:**
- [ ] coursekit.json
- [ ] materials/guide-setup.md
- [ ] materials/notes.md
- [ ] materials/README.md

### T-3.4: Create empty/missing directory fixtures [P with T-3.1, T-3.2, T-3.3, T-3.5]
- **Directories:** `test-fixtures/guides-empty/`, `test-fixtures/no-materials/`
- **Test:** Used by T-2.2 tests
- **Dependencies:** none
- **Description:** Create fixtures for Scenarios 4 & 5:
  - **guides-empty/**: coursekit.json + empty materials/ + .gitkeep
  - **no-materials/**: coursekit.json only (no materials dir)

**Files to create:**
- [ ] guides-empty/coursekit.json
- [ ] guides-empty/materials/.gitkeep
- [ ] no-materials/coursekit.json

### T-3.5: Create malformed frontmatter fixtures [P with T-3.1, T-3.2, T-3.3, T-3.4]
- **Directory:** `test-fixtures/guides-malformed/`
- **Test:** Used by T-2.2 tests
- **Dependencies:** none
- **Description:** Create fixture for Scenario 6:
  - `coursekit.json` with materialsRoot
  - `materials/guide-bad-yaml.md` (invalid YAML syntax)
  - `materials/guide-no-title.md` (valid YAML but missing title)

**Files to create:**
- [ ] coursekit.json
- [ ] materials/guide-bad-yaml.md
- [ ] materials/guide-no-title.md

## Group 4: Integration & Performance

### T-4.1: Create integration tests [T]
- **File:** `src/lib/guide-discovery.integration.test.ts`
- **Test:** Self-testing
- **Dependencies:** T-2.2, T-3.1, T-3.2, T-3.3, T-3.4, T-3.5
- **Description:** End-to-end tests with real config loading:
  - Test discovery with loadConfig() from F-1
  - Test filtering by subdirectory option
  - Test includeRawFrontmatter option
  - Verify deterministic ordering across runs
  - Test all 6 spec scenarios with fixtures

**Test Scenarios:**
- [ ] Scenario 1: Flat guides (guides-flat fixture)
- [ ] Scenario 2: Nested guides (guides-nested fixture)
- [ ] Scenario 3: Mixed files (guides-mixed fixture)
- [ ] Scenario 4: Empty directory (guides-empty fixture)
- [ ] Scenario 5: Missing directory (no-materials fixture)
- [ ] Scenario 6: Malformed frontmatter (guides-malformed fixture)
- [ ] Config integration with loadConfig()
- [ ] Subdirectory filter option
- [ ] includeRawFrontmatter option

### T-4.2: Create performance benchmarks [T]
- **File:** `src/lib/guide-discovery.perf.test.ts`
- **Test:** Self-testing
- **Dependencies:** T-2.2
- **Description:** Performance validation per spec requirements:
  - Create fixture with 100 guides at various depths
  - Run discovery 10 times, measure average
  - Verify completion < 500ms (non-functional requirement)
  - Report timing statistics

**Test Cases:**
- [ ] Generate 100 guide fixture
- [ ] Average discovery time < 500ms
- [ ] Timing statistics logged
- [ ] No memory issues with large sets

## Execution Order

### Phase 1: Foundation (Parallel)
1. T-1.1 (type definitions - no deps)
2. T-1.2, T-1.3 (can run in parallel after T-1.1)

### Phase 2: Core Logic (Sequential)
3. T-2.1 (scanning - after T-1.1)
4. T-2.2 (discovery - after all of Phase 1 + T-2.1)

### Phase 3: Test Fixtures (Parallel)
5. T-3.1, T-3.2, T-3.3, T-3.4, T-3.5 (all parallel - no deps)

### Phase 4: Integration (Sequential)
6. T-4.1 (integration - after T-2.2 + all Phase 3)
7. T-4.2 (performance - after T-2.2)

## Summary

- **Total Tasks:** 12
- **Parallelizable:** 7 tasks (T-1.2, T-1.3, all of Group 3)
- **Critical Path:** T-1.1 → T-2.1 → T-2.2 → T-4.1
- **Estimated Time:** ~4 hours (per technical plan)

## Notes

- All tasks marked [T] require comprehensive test coverage
- Parallelizable tasks marked [P] with compatible task IDs
- File paths are exact - no ambiguity in where code lives
- Dependencies explicitly declared - no hidden blockers
- Mirrors F-2 lesson discovery patterns for consistency
- Uses Bun.Glob (native) - no new dependencies required
