# Implementation Tasks: Lesson File Discovery (F-2)

## Progress Tracking

| Task | Status | Notes |
|------|--------|-------|
| T-1.1 | ☐ | Types in src/types.ts |
| T-1.2 | ☐ | Zod schemas |
| T-2.1 | ☐ | parseFilename utility |
| T-2.2 | ☐ | parseFrontmatter utility |
| T-2.3 | ☐ | Utility tests |
| T-3.1 | ☐ | scanCourses function |
| T-3.2 | ☐ | scanLessonFiles function |
| T-3.3 | ☐ | discoverLessons main function |
| T-3.4 | ☐ | Discovery tests |
| T-4.1 | ☐ | Test fixtures |
| T-4.2 | ☐ | Integration tests |
| T-4.3 | ☐ | Export public API |

---

## Group 1: Foundation - Type Definitions

### T-1.1: Add discovery types to types.ts [T]
- **File:** src/types.ts
- **Test:** (validated by T-2.3 usage)
- **Dependencies:** none
- **Description:** Add TypeScript interfaces for discovery system:
  - `LessonFrontmatter` - parsed frontmatter fields (all optional)
  - `DiscoveredLesson` - lesson with path, order, courseId, frontmatter
  - `DiscoveryWarning` - non-fatal issue with path, code, message
  - `DiscoveryWarningCode` - union type for warning codes
  - `LessonManifest` - complete discovery result
  - `DiscoveryOptions` - options for discovery function

### T-1.2: Create Zod schemas for frontmatter [T] [P with T-1.1]
- **File:** src/lib/discovery-utils.ts (schema section)
- **Test:** src/lib/discovery-utils.test.ts
- **Dependencies:** none
- **Description:** Define validation schemas:
  - `LessonFrontmatterSchema` - validates frontmatter with `.passthrough()`
  - `LESSON_FILENAME_PATTERN` - regex constant for `{nn}-{slug}.md`

---

## Group 2: Core Utilities

### T-2.1: Implement parseFilename utility [T]
- **File:** src/lib/discovery-utils.ts
- **Test:** src/lib/discovery-utils.test.ts
- **Dependencies:** T-1.2
- **Description:** Parse order and slug from lesson filename:
  - Input: `"01-intro.md"` → Output: `{ order: 1, slug: "intro" }`
  - Return `null` for non-matching filenames
  - Handle multi-digit orders (01, 10, 100)
  - Case-insensitive matching

### T-2.2: Implement parseFrontmatter utility [T] [P with T-2.1]
- **File:** src/lib/discovery-utils.ts
- **Test:** src/lib/discovery-utils.test.ts
- **Dependencies:** T-1.2, yaml package
- **Description:** Extract and parse YAML frontmatter:
  - Find content between `---` delimiters
  - Parse YAML using `yaml` package (add dependency)
  - Return `{ frontmatter, raw?, error? }`
  - Handle: valid YAML, malformed YAML, missing delimiters, empty frontmatter
  - Never throw - return empty object with error message

### T-2.3: Write utility unit tests [T]
- **File:** src/lib/discovery-utils.test.ts
- **Test:** (this is the test file)
- **Dependencies:** T-2.1, T-2.2
- **Description:** Comprehensive tests for both utilities:

  **parseFilename tests:**
  - Valid: `01-intro.md`, `10-advanced.md`, `99-final.md`, `100-bonus.md`
  - Invalid: `intro.md`, `1-short.md`, `01_underscore.md`, `01-CAPS.MD`
  - Edge: empty string, just `.md`, numbers only

  **parseFrontmatter tests:**
  - Valid frontmatter with all fields
  - Partial frontmatter (some fields missing)
  - Malformed YAML (returns empty + error)
  - No frontmatter delimiters
  - Empty frontmatter (`---\n---`)
  - Frontmatter without closing delimiter
  - Content after frontmatter preserved indication

---

## Group 3: Discovery Functions

### T-3.1: Implement scanCourses function [T]
- **File:** src/lib/discovery.ts
- **Test:** src/lib/discovery.test.ts
- **Dependencies:** T-1.1
- **Description:** List course directories in source root:
  - Read `courses/` directory
  - Filter to directories only (not files)
  - Return array of course IDs (directory names)
  - Handle missing `courses/` directory gracefully

### T-3.2: Implement scanLessonFiles function [T] [P with T-3.1]
- **File:** src/lib/discovery.ts
- **Test:** src/lib/discovery.test.ts
- **Dependencies:** T-1.1
- **Description:** List lesson files in a course:
  - Read `courses/{courseId}/lessons/` directory
  - Filter to `.md` files only
  - Exclude hidden files (starting with `.`)
  - Exclude directories
  - Handle missing `lessons/` directory (return empty + warning)

### T-3.3: Implement discoverLessons main function [T]
- **File:** src/lib/discovery.ts
- **Test:** src/lib/discovery.test.ts
- **Dependencies:** T-2.1, T-2.2, T-3.1, T-3.2
- **Description:** Main discovery orchestration:
  - Accept `CourseKitConfig` and optional `DiscoveryOptions`
  - Get source root from `config.platform.path`
  - If `options.courseId` set, discover single course
  - Otherwise discover all courses via `scanCourses()`
  - For each course: scan files, parse filenames, read content, parse frontmatter
  - Build `DiscoveredLesson` for each valid file
  - Sort lessons by order within each course
  - Aggregate warnings from all stages
  - Return complete `LessonManifest`

### T-3.4: Write discovery integration tests [T]
- **File:** src/lib/discovery.test.ts
- **Test:** (this is the test file)
- **Dependencies:** T-3.3, T-4.1
- **Description:** Test all spec scenarios:
  - Scenario 1: Single course with multiple lessons
  - Scenario 2: Multiple courses discovery
  - Scenario 3: Missing lessons directory (warning, not error)
  - Scenario 4: Non-markdown files filtered
  - Scenario 5: Malformed frontmatter flagged
  - Deterministic ordering verification
  - Performance: 50 lessons in < 500ms

---

## Group 4: Integration & Fixtures

### T-4.1: Create test fixtures [P]
- **File:** test-fixtures/ directory structure
- **Test:** (used by T-3.4, T-4.2)
- **Dependencies:** none
- **Description:** Create filesystem fixtures for testing:

  ```
  test-fixtures/
  ├── valid-course/
  │   └── courses/
  │       └── test-course/
  │           └── lessons/
  │               ├── 01-intro.md (valid frontmatter)
  │               └── 02-setup.md (valid frontmatter)
  ├── multi-course/
  │   └── courses/
  │       ├── course-a/
  │       │   └── lessons/
  │       │       └── 01-first.md
  │       └── course-b/
  │           └── lessons/
  │               └── 01-start.md
  ├── empty-course/
  │   └── courses/
  │       └── empty/
  │           └── .gitkeep (no lessons dir)
  ├── malformed/
  │   └── courses/
  │       └── bad/
  │           └── lessons/
  │               ├── 01-bad-yaml.md (invalid YAML)
  │               └── 02-no-frontmatter.md (no --- delimiters)
  └── mixed-files/
      └── courses/
          └── mixed/
              └── lessons/
                  ├── 01-valid.md
                  ├── notes.txt
                  ├── .DS_Store
                  └── subdir/ (directory)
  ```

### T-4.2: Write end-to-end integration test [T]
- **File:** src/lib/discovery.integration.test.ts
- **Test:** (this is the test file)
- **Dependencies:** T-3.3, T-4.1
- **Description:** Full integration test:
  - Create temp directory with realistic course structure
  - Run full discovery pipeline
  - Verify all lessons discovered with correct metadata
  - Verify warnings generated for edge cases
  - Clean up temp directory after test

### T-4.3: Export public API [T]
- **File:** src/lib/discovery.ts (exports)
- **Test:** Verified by import in integration test
- **Dependencies:** T-3.3
- **Description:** Export clean public API:
  - `discoverLessons` - main function
  - `parseFilename` - utility (may be useful externally)
  - `parseFrontmatter` - utility (may be useful externally)
  - `DiscoveryError` - error class
  - Re-export types from types.ts as needed

---

## Execution Order

```
Phase 1 (Foundation):
  T-1.1, T-1.2 ─── can run in parallel

Phase 2 (Utilities):
  T-2.1, T-2.2 ─── can run in parallel after Phase 1
  T-2.3 ───────── after T-2.1, T-2.2

Phase 3 (Core Discovery):
  T-4.1 ───────── can start anytime (fixtures, no code deps)
  T-3.1, T-3.2 ── can run in parallel after Phase 1
  T-3.3 ───────── after T-2.1, T-2.2, T-3.1, T-3.2
  T-3.4 ───────── after T-3.3, T-4.1

Phase 4 (Integration):
  T-4.2 ───────── after T-3.4, T-4.1
  T-4.3 ───────── after T-3.3
```

**Parallelization opportunities:**
- T-1.1 || T-1.2 (types and schemas)
- T-2.1 || T-2.2 (filename and frontmatter parsing)
- T-3.1 || T-3.2 (course and lesson scanning)
- T-4.1 can run anytime (filesystem only)

**Critical path:** T-1.1 → T-3.1 → T-3.3 → T-3.4 → T-4.2

---

## Dependencies to Install

```bash
bun add yaml
```

Required for T-2.2 (frontmatter parsing).

---

## Definition of Done

- [ ] All tasks marked complete in progress table
- [ ] All tests passing: `bun test`
- [ ] No TypeScript errors: `bun run typecheck` (if configured)
- [ ] Discovery of test fixtures works correctly
- [ ] Performance target met: 50 lessons < 500ms
