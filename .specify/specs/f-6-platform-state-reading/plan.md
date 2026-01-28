# Technical Plan: Platform State Reading (F-6)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLI Layer                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│  │   sync   │  │   push   │  │  status  │  │validate  │  (future consumers)│
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘                    │
│       │             │             │             │                           │
└───────┼─────────────┼─────────────┼─────────────┼───────────────────────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Platform State Reading Service                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     readPlatformState()                             │   │
│  │  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐          │   │
│  │  │ scanPlatform │─>│ parseFrontmtr │─>│ hashContent     │          │   │
│  │  │ (content/*)  │  │ (YAML)        │  │ (body only)     │          │   │
│  │  └──────────────┘  └───────────────┘  └─────────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PlatformStateManifest                            │   │
│  │  { lessons: [], guides: [], assets: [], warnings: [] }             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Config Layer (F-1)                               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  loadConfig() → { platform: { path: "/path/to/astro" }, ... }       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Platform Filesystem (Astro)                         │
│  src/content/                                                               │
│  ├── lessons/                     (Astro content collection)                │
│  │   ├── supertag-course/                                                   │
│  │   │   ├── 01-intro.md          (has frontmatter + commerce fields)       │
│  │   │   └── 02-setup.md                                                    │
│  │   └── astro-course/                                                      │
│  │       └── 01-basics.md                                                   │
│  ├── guides/                      (Astro content collection)                │
│  │   └── supertag-course/                                                   │
│  │       └── getting-started.md                                             │
│  └── (other Astro collections...)                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Flow:**
1. CLI commands call `readPlatformState(config, courseId?)`
2. Service scans Astro content collections at `platform.path/src/content/`
3. For each `.md` file: parse frontmatter, compute content hash
4. Identify platform-owned fields (price, lemonSqueezyProductId, etc.)
5. Return structured manifest grouped by course and content type
6. Missing directories return empty results (not errors)

## Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Bun | Project standard, fast I/O |
| Filesystem | `node:fs` | Sync operations sufficient for metadata reads |
| Path handling | `node:path` | Platform-agnostic path resolution |
| YAML parsing | `yaml` | Already used in F-2/F-4, handles frontmatter |
| Hashing | `node:crypto` | Native SHA-256 for content change detection |
| Glob pattern | `**/*.md` | Matches all markdown in content collections |
| Testing | Bun test | Consistent with existing patterns |

**Note on hashing:** Using SHA-256 of body content (excluding frontmatter) for change detection. This allows sync to detect content modifications while preserving platform-owned frontmatter fields.

## Data Model

### Core Types

```typescript
// src/types.ts additions

/**
 * Platform-owned fields that sync should preserve.
 * These fields exist only on the platform, never in source repos.
 */
export interface PlatformOwnedFields {
  /** Lemon Squeezy product ID for course commerce */
  lemonSqueezyProductId?: string;
  /** Course price in cents */
  price?: number;
  /** Enrollment count */
  enrollmentCount?: number;
  /** Published date on platform */
  publishedAt?: string;
  /** Other platform-managed fields */
  [key: string]: unknown;
}

/**
 * A lesson file discovered on the platform.
 */
export interface PlatformLesson {
  /** Absolute path to the file */
  path: string;
  /** Relative path from platform root (e.g., "src/content/lessons/course-x/01-intro.md") */
  relativePath: string;
  /** Course ID (directory name) */
  courseId: string;
  /** Order extracted from filename */
  order: number;
  /** Slug extracted from filename */
  slug: string;
  /** Full frontmatter including platform-owned fields */
  frontmatter: LessonFrontmatter & PlatformOwnedFields;
  /** SHA-256 hash of body content (for change detection) */
  contentHash: string;
  /** Raw frontmatter string (optional, for debugging) */
  rawFrontmatter?: string;
}

/**
 * A guide file discovered on the platform.
 */
export interface PlatformGuide {
  /** Absolute path to the file */
  path: string;
  /** Relative path from platform root */
  relativePath: string;
  /** Course ID (directory name) */
  courseId: string;
  /** Slug extracted from filename */
  slug: string;
  /** Full frontmatter */
  frontmatter: GuideFrontmatter;
  /** SHA-256 hash of body content */
  contentHash: string;
  /** Raw frontmatter string (optional) */
  rawFrontmatter?: string;
}

/**
 * An asset reference discovered on the platform.
 * (For F-6, this may just be references in markdown; binary handling TBD)
 */
export interface PlatformAsset {
  /** Absolute path to the asset */
  path: string;
  /** Relative path from platform root */
  relativePath: string;
  /** Course ID if asset is course-specific */
  courseId?: string;
  /** File extension */
  extension: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
}

/** Warning codes for platform state reading */
export type PlatformStateWarningCode =
  | "MISSING_PLATFORM_DIR"        // platform.path doesn't exist
  | "MISSING_CONTENT_DIR"         // src/content/ doesn't exist
  | "PARSE_ERROR"                 // Corrupted YAML frontmatter
  | "HASH_ERROR"                  // Failed to compute content hash
  | "READ_ERROR"                  // Cannot read file
  | "INVALID_FILENAME";           // Filename doesn't match pattern

/** A warning from platform state reading */
export interface PlatformStateWarning {
  /** Warning type code */
  code: PlatformStateWarningCode;
  /** Human-readable message */
  message: string;
  /** File path if file-specific */
  filePath?: string;
  /** Relative path for display */
  relativePath?: string;
}

/** Result of platform state reading */
export interface PlatformStateManifest {
  /** Lessons grouped by course */
  lessons: Record<string, PlatformLesson[]>;
  /** Guides grouped by course */
  guides: Record<string, PlatformGuide[]>;
  /** Assets (TBD: binary files or just references?) */
  assets: PlatformAsset[];
  /** Non-fatal issues encountered */
  warnings: PlatformStateWarning[];
  /** Platform root path used */
  platformRoot: string;
  /** Timestamp of read operation */
  readAt: Date;
}

/** Options for platform state reading */
export interface PlatformStateOptions {
  /** Read only this course (default: all courses) */
  courseId?: string;
  /** Include raw frontmatter for debugging */
  includeRaw?: boolean;
  /** Include asset state (default: false, TBD) */
  includeAssets?: boolean;
}
```

### Platform-Owned Fields Specification

**Fields that must be preserved during sync:**
- `price` (number) - Course/lesson pricing
- `lemonSqueezyProductId` (string) - Commerce integration ID
- `enrollmentCount` (number) - Student enrollment tracking
- `publishedAt` (string/date) - Platform publication timestamp
- `platformId` (string) - Internal platform identifier
- `commerceEnabled` (boolean) - Feature flags

**Note:** Full list should be configurable in `coursekit.json` for extensibility:

```json
{
  "platform": {
    "path": "/path/to/astro",
    "protectedFields": [
      "price",
      "lemonSqueezyProductId",
      "enrollmentCount",
      "publishedAt",
      "platformId"
    ]
  }
}
```

## API Contracts

### Primary Function

```typescript
/**
 * Read current state of lesson, guide, and asset files from platform.
 *
 * Scans Astro content collections at platform.path/src/content/ and returns
 * structured state including frontmatter and content hashes. This is read-only;
 * never mutates platform files.
 *
 * @param config - Loaded CourseKit configuration (from F-1)
 * @param options - Reading options (optional)
 * @returns Manifest of platform state with warnings
 *
 * @example Read all platform state
 * const config = await loadConfig();
 * const state = await readPlatformState(config);
 * console.log(`Found ${Object.keys(state.lessons).length} courses`);
 *
 * @example Read single course
 * const state = await readPlatformState(config, { courseId: 'supertag-course' });
 *
 * @example Include raw frontmatter for debugging
 * const state = await readPlatformState(config, { includeRaw: true });
 */
export async function readPlatformState(
  config: CourseKitConfig,
  options?: PlatformStateOptions
): Promise<PlatformStateManifest>;
```

### Helper Functions

```typescript
/**
 * Scan platform content collection for lesson files.
 *
 * @param platformRoot - Absolute path to Astro platform root
 * @param courseId - Optional course filter
 * @returns Array of absolute paths to lesson files
 */
export async function scanPlatformLessons(
  platformRoot: string,
  courseId?: string
): Promise<string[]>;

/**
 * Scan platform content collection for guide files.
 *
 * @param platformRoot - Absolute path to Astro platform root
 * @param courseId - Optional course filter
 * @returns Array of absolute paths to guide files
 */
export async function scanPlatformGuides(
  platformRoot: string,
  courseId?: string
): Promise<string[]>;

/**
 * Parse markdown file and extract frontmatter + body.
 * Reuses existing parseFrontmatter from discovery-utils.
 *
 * @param filePath - Absolute path to markdown file
 * @returns Parsed frontmatter and body content
 */
export function parsePlatformFile(filePath: string): {
  frontmatter: Record<string, unknown>;
  body: string;
  error?: string;
};

/**
 * Compute SHA-256 hash of body content (excluding frontmatter).
 *
 * @param body - Markdown body content
 * @returns Hex-encoded SHA-256 hash
 */
export function hashContent(body: string): string;

/**
 * Identify platform-owned fields in frontmatter.
 * Reads protected field list from config.
 *
 * @param frontmatter - Parsed frontmatter object
 * @param config - CourseKit configuration
 * @returns Object containing only platform-owned fields
 */
export function extractPlatformFields(
  frontmatter: Record<string, unknown>,
  config: CourseKitConfig
): PlatformOwnedFields;
```

## Implementation Phases

### Phase 1: Content Hashing Utility

**Goal:** Establish content hashing for change detection.

**Files:**
- Create `src/lib/platform-utils.ts` with `hashContent()`

**Deliverables:**
- `hashContent(body: string): string` using `crypto.createHash('sha256')`
- Unit tests verifying deterministic hashing
- Test that identical content produces identical hashes
- Test that different content produces different hashes

**Test cases:**
- Empty string → consistent hash
- Same content → same hash
- Different content → different hashes
- Unicode content → correct hash

### Phase 2: Platform File Scanning

**Goal:** Scan Astro content collections for lesson/guide files.

**Files:**
- Extend `src/lib/platform-utils.ts` with scanning functions

**Deliverables:**
- `scanPlatformLessons(platformRoot, courseId?)` using glob `src/content/lessons/**/*.md`
- `scanPlatformGuides(platformRoot, courseId?)` using glob `src/content/guides/**/*.md`
- Course filtering by directory name
- Returns sorted absolute paths

**Test cases:**
- Single course lessons
- Multiple courses lessons
- Empty course directory (no error)
- Missing content directory (returns empty array)
- Course filter applied correctly

### Phase 3: Frontmatter Parsing with Platform Fields

**Goal:** Parse frontmatter and identify platform-owned fields.

**Files:**
- Extend `src/lib/platform-utils.ts` with parsing functions

**Deliverables:**
- `parsePlatformFile(filePath)` reusing `parseFrontmatter` from F-2/F-4
- `extractPlatformFields(frontmatter, config)` to isolate protected fields
- Read `config.platform.protectedFields` array
- Return separated platform fields vs source fields

**Test cases:**
- File with both source and platform fields
- File with only source fields
- File with corrupted YAML (parse error warning)
- Platform fields correctly identified from config
- Unknown platform fields passed through

### Phase 4: Main Reading Function

**Goal:** Orchestrate full platform state reading.

**Files:**
- Create `src/lib/platform-state.ts` with main function

**Deliverables:**
- `readPlatformState(config, options)` orchestrating full flow
- Read platform root from `config.platform.path`
- Scan lessons and guides using Phase 2 utilities
- For each file: parse frontmatter, extract platform fields, hash body
- Group results by course ID
- Aggregate warnings for parse/hash errors
- Return sorted results within each course

**Test cases:**
- Read all platform state (Scenario 2)
- Read single course state (Scenario 1)
- Read guides for course (Scenario 3)
- Empty course directory (Scenario 4)
- Preserve platform-only fields (Scenario 5)
- Handle corrupted files (Scenario 6)
- Missing platform directory (warning, not error)

### Phase 5: Integration and Type Definitions

**Goal:** Export API and integrate with config system.

**Files:**
- Update `src/types.ts` with new types
- Create `src/lib/platform-state.test.ts` with integration tests
- Extend `coursekit.json` schema to support `protectedFields`

**Deliverables:**
- Clean public API exported from `src/lib/platform-state.ts`
- Integration test using Astro-like test fixture
- Verify protected fields preservation
- Verify content hash stability
- Test with real-world frontmatter complexity

## File Structure

```
src/
├── index.ts                          # CLI entry (no changes yet)
├── types.ts                          # ADD: Platform* types, PlatformStateManifest
├── lib/
│   ├── database.ts                   # Existing (unchanged)
│   ├── discovery.ts                  # F-2 lesson discovery (unchanged)
│   ├── discovery-utils.ts            # F-2 utilities (reused for parsing)
│   ├── guide-discovery.ts            # F-4 guide discovery (unchanged)
│   ├── asset-discovery.ts            # F-5 asset discovery (unchanged)
│   ├── platform-utils.ts             # NEW: Hashing, scanning, parsing
│   ├── platform-utils.test.ts        # NEW: Unit tests
│   ├── platform-state.ts             # NEW: Main reading function
│   └── platform-state.test.ts        # NEW: Integration tests
└── commands/
    └── (future commands will import from lib/platform-state.ts)

test-fixtures/platform/               # NEW: Platform state test fixtures
├── single-course/
│   ├── coursekit.json
│   └── src/content/
│       └── lessons/supertag-course/
│           ├── 01-intro.md           (with platform fields)
│           └── 02-setup.md
├── multi-course/
│   ├── coursekit.json
│   └── src/content/
│       ├── lessons/
│       │   ├── supertag-course/
│       │   │   └── 01-intro.md
│       │   └── astro-course/
│       │       └── 01-basics.md
│       └── guides/
│           └── supertag-course/
│               └── getting-started.md
├── empty-course/
│   └── src/content/
│       └── lessons/new-course/       (empty directory)
└── corrupted/
    └── src/content/
        └── lessons/broken-course/
            └── 01-broken.md          (malformed YAML)
```

## Dependencies

### Existing Dependencies Used

- `node:fs` - File reading (`readFileSync`)
- `node:path` - Path manipulation (`join`, `relative`, `basename`)
- `node:crypto` - SHA-256 hashing (`createHash`)
- `yaml` - YAML parsing (already used in F-2/F-4)
- `bun` - Native glob support

### No New Packages Required

All functionality can be implemented with existing dependencies. The `crypto` module is Node.js built-in and provides fast, deterministic hashing.

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Corrupted platform frontmatter breaks read | Medium | Medium | Catch parse errors, add warning, continue with partial data |
| Hash computation fails on large files | Low | Very Low | Content hashing is fast; use streaming if needed |
| Platform directory structure changes | High | Low | Document assumptions, make scanning configurable |
| Platform-owned fields list incomplete | Medium | Medium | Make field list configurable via `coursekit.json` |
| Content hash collision | Very Low | Near Zero | SHA-256 has negligible collision probability |
| Missing platform directory | Medium | Low | Return empty manifest with warning, not error |
| Permission denied on platform files | Medium | Low | Catch read errors, add warning for specific files |
| Astro content collection schema changes | High | Medium | Design for flexibility; rely on glob patterns, not hardcoded paths |

### Edge Cases to Handle

1. **Platform directory doesn't exist** - Return empty manifest with `MISSING_PLATFORM_DIR` warning
2. **src/content/ missing** - Return empty manifest with `MISSING_CONTENT_DIR` warning
3. **Course directory exists but is empty** - Return empty array for that course (not an error)
4. **File with only frontmatter (no body)** - Hash empty string (valid)
5. **File with no frontmatter** - Parse succeeds with empty object (valid for assets)
6. **Filename doesn't match NN-slug.md pattern** - Add `INVALID_FILENAME` warning, skip file
7. **Frontmatter YAML parse error** - Add `PARSE_ERROR` warning, include file with empty frontmatter
8. **Platform field not in protected list** - Pass through in frontmatter (conservative approach)
9. **Binary files in content collections** - Skip (glob filters to `*.md` only)
10. **Symlinks to content** - Follow symlinks (default behavior), but add warning if broken

## Success Criteria Mapping

| Spec Criterion | Implementation | Test |
|----------------|----------------|------|
| Reads lessons from `src/content/lessons/{courseId}/` | `scanPlatformLessons()` with glob | single-course fixture |
| Reads guides from `src/content/guides/{courseId}/` | `scanPlatformGuides()` with glob | multi-course fixture |
| Parses YAML frontmatter | Reuse `parseFrontmatter` from discovery-utils | corrupted fixture |
| Computes content hash (body only) | `hashContent()` with SHA-256 | hash stability test |
| Returns structured state by course/type | Group by courseId in manifest | multi-course fixture |
| Identifies platform-owned fields | `extractPlatformFields()` using config | platform fields test |
| Resolves platform root from config | Read `config.platform.path` | integration test |
| Supports single course or all courses | `options.courseId` parameter | filtering tests |
| Reports warnings for parse errors | Catch exceptions, add to warnings array | corrupted fixture |
| Returns empty results for missing directories | Check existence, return empty array | empty-course fixture |

## Performance Considerations

- **Read-only operations:** Never mutate platform files (pure read)
- **Glob efficiency:** Bun's native glob is optimized for recursive patterns
- **Hashing performance:** SHA-256 is fast (~500 MB/s); typical lessons <50KB hash instantly
- **Parallel file reads:** Could use `Promise.all()` for large lesson counts (future optimization)
- **Frontmatter parsing:** YAML parsing is fast; typical frontmatter <1KB parses in <1ms
- **Deterministic ordering:** Single sort pass at end (negligible overhead)

**Expected performance:** Reading platform state for 50 lessons across 5 courses in ~200-300ms (glob: 50ms, parse+hash: 250ms)

## Future Integration Points

- **F-7 (Diff calculation):** Will compare `PlatformStateManifest` with source repo state
- **F-8 (Push command):** Will use platform state to detect conflicts before writing
- **F-9 (Status command):** Will call `readPlatformState()` to show drift from source
- **F-10 (Validate command):** Will verify platform state integrity

## Configuration Extension

Extend `coursekit.json` schema to support protected fields:

```json
{
  "platform": {
    "path": "/Users/fischer/work/astro-platform",
    "remote": "git@github.com:org/platform.git",
    "protectedFields": [
      "price",
      "lemonSqueezyProductId",
      "enrollmentCount",
      "publishedAt",
      "platformId",
      "commerceEnabled"
    ]
  },
  "courses": {
    "supertag-course": {
      "slug": "supertag-course",
      "sourceDir": "/Users/fischer/work/supertag-course"
    }
  }
}
```

**Default protected fields** (if not specified):
```typescript
const DEFAULT_PROTECTED_FIELDS = [
  'price',
  'lemonSqueezyProductId',
  'enrollmentCount',
  'publishedAt',
];
```

## Open Questions for Clarification

The spec includes these assumptions to be clarified:

1. **Asset state inclusion:** Should F-6 include binary asset files, or only track references in markdown?
   - **Recommendation:** Start with references only (markdown content), defer binary asset state to F-7

2. **Hash algorithm:** SHA-256 (strong, slower) vs SHA-1 (weaker, faster) vs CRC32 (weak, fastest)?
   - **Recommendation:** SHA-256 for robustness and zero collision risk

3. **Protected fields list:** Is the provided list exhaustive, or should it be configurable per-platform?
   - **Recommendation:** Make configurable via `coursekit.json` with sensible defaults

4. **Broken frontmatter handling:** Include file with empty frontmatter + warning, or exclude entirely?
   - **Recommendation:** Include with warning (allows visibility into platform issues)

5. **Content hash scope:** Body only (excluding frontmatter), or full file hash?
   - **Recommendation:** Body only (spec requirement) to allow frontmatter-only changes without hash mismatch

**Note:** These are clarifications, not blockers. Plan proceeds with recommended defaults.
