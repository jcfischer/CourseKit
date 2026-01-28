# Technical Plan: Lesson File Discovery (F-2)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLI Layer                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                                  │
│  │  status  │  │   push   │  │ validate │  (future consumers of discovery) │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                                  │
│       │             │             │                                         │
└───────┼─────────────┼─────────────┼─────────────────────────────────────────┘
        │             │             │
        └─────────────┼─────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Discovery Service                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     discoverLessons()                                │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐            │   │
│  │  │ scanCourses │─>│ scanLessons  │─>│ parseFrontmatter│            │   │
│  │  └─────────────┘  └──────────────┘  └─────────────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LessonManifest                                   │   │
│  │  { courses: { [id]: DiscoveredLesson[] }, warnings: Warning[] }    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Config Layer (F-1)                               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  loadConfig() → { platform: { path: "/abs/path" }, courses: {...} } │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Filesystem                                        │
│  courses/                                                                    │
│  ├── supertag-course/                                                       │
│  │   └── lessons/                                                           │
│  │       ├── 01-intro.md                                                    │
│  │       └── 02-setup.md                                                    │
│  └── astro-course/                                                          │
│      └── lessons/                                                           │
│          └── 01-getting-started.md                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Bun | Project standard, fast FS operations |
| Filesystem | `node:fs/promises` | Async operations, cross-platform |
| Path handling | `node:path` | Platform-agnostic path resolution |
| YAML parsing | `yaml` (npm) | Robust parser, handles edge cases |
| Schema validation | Zod | Project pattern from F-1 config |
| Testing | Bun test | Native, already used for config.test.ts |

**Note on YAML parser:** While Bun doesn't have native YAML, the `yaml` package (formerly `js-yaml`) is lightweight (~50KB) and handles malformed YAML gracefully without crashing.

## Data Model

### Core Types

```typescript
// src/types.ts additions

/**
 * Raw frontmatter extracted from a lesson file.
 * Optional fields allow partial/malformed frontmatter to be captured.
 */
export interface LessonFrontmatter {
  title?: string;
  slug?: string;
  description?: string;
  courseSlug?: string;
  moduleId?: string;
  durationMinutes?: number;
  order?: number;
  resources?: Array<{ label: string; path: string }>;
  // Allow arbitrary additional fields
  [key: string]: unknown;
}

/**
 * A discovered lesson with its filesystem location and parsed metadata.
 */
export interface DiscoveredLesson {
  /** Absolute path to the lesson file */
  path: string;
  /** Relative path from source root (e.g., "courses/supertag/lessons/01-intro.md") */
  relativePath: string;
  /** Course ID this lesson belongs to */
  courseId: string;
  /** Order index parsed from filename (e.g., 1 for "01-intro.md") */
  order: number;
  /** Slug parsed from filename (e.g., "intro" for "01-intro.md") */
  fileSlug: string;
  /** Parsed frontmatter (empty object if none/invalid) */
  frontmatter: LessonFrontmatter;
  /** Raw frontmatter string for debugging */
  rawFrontmatter?: string;
}

/**
 * Warning generated during discovery (non-fatal issues).
 */
export interface DiscoveryWarning {
  /** Path to the file with the issue */
  path: string;
  /** Warning code for programmatic handling */
  code: DiscoveryWarningCode;
  /** Human-readable message */
  message: string;
}

export type DiscoveryWarningCode =
  | 'NO_LESSONS_DIR'        // courses/{id}/lessons/ doesn't exist
  | 'INVALID_FRONTMATTER'   // YAML parse error
  | 'MISSING_FRONTMATTER'   // No frontmatter delimiters
  | 'INVALID_FILENAME'      // Doesn't match {nn}-{slug}.md pattern
  | 'EMPTY_FILE';           // File has no content

/**
 * Complete manifest of discovered lessons.
 */
export interface LessonManifest {
  /** Source root used for discovery */
  sourceRoot: string;
  /** Lessons grouped by course ID */
  courses: Record<string, DiscoveredLesson[]>;
  /** Non-fatal warnings encountered */
  warnings: DiscoveryWarning[];
  /** Timestamp of discovery */
  discoveredAt: Date;
}

/**
 * Options for lesson discovery.
 */
export interface DiscoveryOptions {
  /** Specific course ID to discover (omit for all courses) */
  courseId?: string;
  /** Include files with invalid filenames (default: false) */
  includeInvalid?: boolean;
}
```

### Zod Schemas

```typescript
// src/discovery.ts

import { z } from 'zod';

/**
 * Schema for validating frontmatter structure.
 * All fields optional to allow partial frontmatter.
 */
export const LessonFrontmatterSchema = z.object({
  title: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  courseSlug: z.string().optional(),
  moduleId: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
  order: z.number().int().nonnegative().optional(),
  resources: z.array(z.object({
    label: z.string(),
    path: z.string(),
  })).optional(),
}).passthrough(); // Allow additional fields

/**
 * Regex for valid lesson filename: {nn}-{slug}.md
 * Examples: 01-intro.md, 02-getting-started.md, 10-advanced-topics.md
 */
export const LESSON_FILENAME_PATTERN = /^(\d{2,})-([a-z0-9-]+)\.md$/i;
```

## API Contracts

### Primary Function

```typescript
/**
 * Discover lesson files in the source repository.
 *
 * @param config - Loaded CourseKit configuration (from F-1)
 * @param options - Discovery options (optional)
 * @returns Manifest of discovered lessons with warnings
 * @throws DiscoveryError if source root is inaccessible
 *
 * @example
 * const config = await loadConfig();
 * const manifest = await discoverLessons(config);
 * console.log(manifest.courses['supertag-course']); // DiscoveredLesson[]
 *
 * @example Single course
 * const manifest = await discoverLessons(config, { courseId: 'supertag-course' });
 */
export async function discoverLessons(
  config: CourseKitConfig,
  options?: DiscoveryOptions
): Promise<LessonManifest>;
```

### Helper Functions

```typescript
/**
 * Parse the order index and slug from a lesson filename.
 * Returns null if filename doesn't match expected pattern.
 */
export function parseFilename(filename: string): { order: number; slug: string } | null;

/**
 * Extract and parse YAML frontmatter from file content.
 * Returns empty object if no frontmatter or parse error.
 */
export function parseFrontmatter(content: string): {
  frontmatter: LessonFrontmatter;
  raw?: string;
  error?: string;
};

/**
 * Scan a directory for course folders (directories in courses/).
 */
export async function scanCourses(sourceRoot: string): Promise<string[]>;

/**
 * Scan a course's lessons directory for markdown files.
 */
export async function scanLessonFiles(
  sourceRoot: string,
  courseId: string
): Promise<string[]>;
```

### Error Classes

```typescript
/**
 * Thrown when discovery cannot proceed due to inaccessible paths.
 */
export class DiscoveryError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'DiscoveryError';
  }
}
```

## Implementation Phases

### Phase 1: Core Types and Utilities (1 file)

**Goal:** Establish type definitions and filename parsing utility.

**Files:**
- Add types to `src/types.ts`
- Create `src/lib/discovery-utils.ts` with `parseFilename()` and `parseFrontmatter()`

**Deliverables:**
- `parseFilename()` with regex matching
- `parseFrontmatter()` with YAML parsing (using `yaml` package)
- Unit tests for both utilities

**Test cases:**
- Valid filenames: `01-intro.md`, `10-advanced.md`, `99-final.md`
- Invalid filenames: `intro.md`, `1-short.md`, `01_underscore.md`
- Valid frontmatter with all fields
- Partial frontmatter (missing optional fields)
- Malformed YAML (returns empty with warning)
- No frontmatter delimiters

### Phase 2: Directory Scanning (1 file)

**Goal:** Implement filesystem traversal functions.

**Files:**
- Create `src/lib/discovery.ts` with `scanCourses()` and `scanLessonFiles()`

**Deliverables:**
- `scanCourses()` - lists directories in `courses/`
- `scanLessonFiles()` - lists `.md` files in `courses/{id}/lessons/`
- Handles missing directories gracefully (returns empty + warning)
- Filters out non-markdown files, hidden files, directories

**Test cases:**
- Standard course structure
- Missing `lessons/` directory
- Empty `lessons/` directory
- Mixed file types (md, txt, DS_Store)
- Permission errors (mocked)

### Phase 3: Main Discovery Function (same file)

**Goal:** Implement the primary `discoverLessons()` function.

**Files:**
- Extend `src/lib/discovery.ts` with main function

**Deliverables:**
- `discoverLessons(config, options)` orchestrating the full flow
- Reads config's `platform.path` as source root
- Supports single-course or all-courses discovery
- Returns sorted lessons (by order) per course
- Aggregates all warnings

**Test cases:**
- Single course discovery (Scenario 1)
- Multi-course discovery (Scenario 2)
- Missing lessons directory (Scenario 3)
- Non-markdown files filtered (Scenario 4)
- Malformed frontmatter flagged (Scenario 5)
- Deterministic ordering

### Phase 4: Integration and CLI Preparation

**Goal:** Export discovery for use by future CLI commands.

**Files:**
- Update `src/index.ts` exports if needed
- Create integration test with real filesystem fixtures

**Deliverables:**
- Clean public API exported from `src/lib/discovery.ts`
- Integration test using temp directories
- Performance test: 50 lessons across 5 courses < 500ms

## File Structure

```
src/
├── index.ts                    # CLI entry (no changes needed yet)
├── config.ts                   # F-1 config loading (unchanged)
├── config.test.ts              # F-1 tests (unchanged)
├── types.ts                    # ADD: DiscoveredLesson, LessonManifest, etc.
├── lib/
│   ├── database.ts             # Existing DB operations (unchanged)
│   ├── discovery-utils.ts      # NEW: parseFilename, parseFrontmatter
│   ├── discovery-utils.test.ts # NEW: Unit tests for utilities
│   ├── discovery.ts            # NEW: Main discovery functions
│   └── discovery.test.ts       # NEW: Integration tests
└── commands/
    └── (future commands will import from lib/discovery.ts)

test-fixtures/                  # NEW: Test fixtures directory
├── valid-course/
│   └── courses/
│       └── test-course/
│           └── lessons/
│               ├── 01-intro.md
│               └── 02-setup.md
├── multi-course/
│   └── courses/
│       ├── course-a/
│       │   └── lessons/...
│       └── course-b/
│           └── lessons/...
├── empty-course/
│   └── courses/
│       └── empty/
│           └── (no lessons dir)
├── malformed/
│   └── courses/
│       └── bad/
│           └── lessons/
│               └── 01-bad-yaml.md
└── mixed-files/
    └── courses/
        └── mixed/
            └── lessons/
                ├── 01-valid.md
                ├── notes.txt
                └── .DS_Store
```

## Dependencies

### New Package

```json
{
  "dependencies": {
    "yaml": "^2.4.0"
  }
}
```

**Rationale:** The `yaml` package is the standard YAML parser for Node/Bun. It handles:
- Malformed YAML without crashing (returns error)
- Comments and multi-line strings
- Custom types if needed later

**Alternative considered:** Parsing YAML manually or using regex. Rejected because YAML edge cases are complex and this is a solved problem.

### Existing Dependencies Used

- `zod` - Schema validation for frontmatter
- `node:fs/promises` - Async filesystem operations
- `node:path` - Path manipulation

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| YAML parser crashes on malformed input | Medium | Low | Wrap in try-catch, return empty frontmatter with warning |
| Large lesson files slow parsing | Low | Low | Only read first ~1KB for frontmatter extraction |
| Symlink loops cause infinite recursion | High | Very Low | Use `fs.readdir` not recursive walk; only scan known depths |
| Platform path in config doesn't exist | Medium | Medium | Validate in loadConfig (F-1 already does this) |
| Encoding issues (non-UTF8 files) | Low | Low | Use Buffer with explicit UTF-8 decoding, warn on decode errors |
| Concurrent discovery calls race condition | Low | Low | Discovery is read-only; no shared state to corrupt |

### Edge Cases to Handle

1. **Empty frontmatter delimiters** (`---\n---`) - Valid but empty, return `{}`
2. **Frontmatter without closing delimiter** - Treat as no frontmatter, add warning
3. **Binary files with .md extension** - Will fail frontmatter parse, add warning
4. **Extremely long filenames** - Filesystem handles this; pattern won't match
5. **Course ID with special characters** - Handled as-is (filesystem's problem)
6. **Lessons numbered beyond 99** - Pattern supports `\d{2,}` (00-99, 100+)

## Success Criteria Mapping

| Spec Criterion | Implementation | Test |
|----------------|----------------|------|
| Discovers all `.md` files in `courses/{id}/lessons/` | `scanLessonFiles()` | multi-course fixture |
| Correctly parses numeric order prefix | `parseFilename()` | unit tests |
| Parses YAML frontmatter without crashing | `parseFrontmatter()` with try-catch | malformed fixture |
| Groups results by course ID | `discoverLessons()` return structure | multi-course test |
| Returns empty (not errors) for no lessons | Warning with `NO_LESSONS_DIR` code | empty-course fixture |
| Ignores non-markdown files | `.md` filter in `scanLessonFiles()` | mixed-files fixture |
| Reads source root from config | Uses `config.platform.path` | integration test |

## Open Questions Resolved

1. **Frontmatter schema fields:** Made all optional per spec assumption; validation (F-3) will enforce required fields
2. **Nested subdirectories in lessons/:** Per spec assumption, only top-level files scanned
3. **Course ID source:** From directory name in `courses/` (not from config mapping yet - that's for sync)

## Performance Considerations

- **Lazy loading:** Only read file content when needed (not during directory scan)
- **Parallel file reading:** Use `Promise.all()` for reading multiple lesson files
- **Early termination:** If scanning single course, skip other course directories
- **Frontmatter extraction:** Only read until second `---` delimiter, not entire file

## Future Integration Points

- **F-3 (Frontmatter validation):** Will consume `DiscoveredLesson.frontmatter` and validate required fields
- **F-7 (Diff calculation):** Will use `LessonManifest` to compare source vs platform state
- **F-13 (Status command):** Will call `discoverLessons()` to show current state
