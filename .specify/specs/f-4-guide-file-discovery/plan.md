# Technical Plan: Guide File Discovery

## Architecture Overview

Guide discovery follows the same layered architecture as lesson discovery (F-2), with recursive glob support for the `materials/**/guide*.md` pattern.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CourseKit Architecture                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  coursekit.json ──► loadConfig() ──► CourseKitConfig                       │
│        (F-1)                              │                                 │
│                                           ▼                                 │
│                          ┌────────────────────────────────┐                │
│                          │     Discovery Layer            │                │
│                          ├────────────────────────────────┤                │
│                          │  discoverLessons() [F-2]       │                │
│                          │  discoverGuides()  [F-4] ◄──── │ NEW            │
│                          └────────────────────────────────┘                │
│                                           │                                 │
│                                           ▼                                 │
│                          ┌────────────────────────────────┐                │
│                          │     Validation Layer           │                │
│                          ├────────────────────────────────┤                │
│                          │  validateAllLessons() [F-3]    │                │
│                          │  validateAllGuides() [Future]  │                │
│                          └────────────────────────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Guide Discovery Data Flow:
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  CourseKitConfig │────►│  discoverGuides  │────►│   GuideManifest  │
│  (materialsRoot) │     │  (glob + parse)  │     │  (guides + warn) │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ Glob Scan │ │ Read File│ │ Parse FM │
              │materials/ │ │ content  │ │ (YAML)   │
              └──────────┘ └──────────┘ └──────────┘
```

## Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Bun | Project standard, fast filesystem ops |
| Glob | `Bun.Glob` or `fast-glob` | Native Bun glob or fast-glob for recursive pattern matching |
| YAML | `yaml` | Already used in discovery-utils.ts |
| Validation | Zod | Project pattern, schema validation |
| Testing | `bun:test` | Project standard |

### Glob Library Decision

**Option A: Bun.Glob (Recommended)**
- Native Bun API, no extra dependency
- Pattern: `new Bun.Glob("**/guide*.md").scan({ cwd: materialsRoot })`
- Performance: Built into runtime, optimized

**Option B: fast-glob**
- More battle-tested for complex patterns
- Already common in Node ecosystem
- Extra dependency

**Recommendation:** Use `Bun.Glob` for consistency with Bun-first approach. Fall back to fast-glob if edge cases emerge.

## Data Model

### Type Definitions (additions to `src/types.ts`)

```typescript
// ════════════════════════════════════════════════════════════════════════════
// Guide Discovery Types (F-4)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Parsed frontmatter from a guide file.
 * More permissive than lesson frontmatter - guides are supplementary.
 */
export interface GuideFrontmatter {
  title: string;                    // Required: guide title
  description?: string;             // Optional: brief description
  [key: string]: unknown;           // Allow extra fields (passthrough)
}

/**
 * Zod schema for guide frontmatter validation.
 * Only title is required; guides are flexible supplementary content.
 */
export const GuideFrontmatterSchema = z.object({
  title: z.string().min(1, "Guide must have a title"),
  description: z.string().optional(),
}).passthrough();

/**
 * A discovered guide file with parsed metadata.
 * Mirrors DiscoveredLesson structure for consistency.
 */
export interface DiscoveredGuide {
  /** Absolute path to the guide file */
  path: string;

  /** Path relative to materials root (e.g., "module-01/guide-setup.md") */
  relativePath: string;

  /** Slug extracted from filename (e.g., "setup" from "guide-setup.md") */
  slug: string;

  /** Parsed YAML frontmatter */
  frontmatter: GuideFrontmatter;

  /** Raw frontmatter string (optional, for debugging) */
  rawFrontmatter?: string;
}

/**
 * Result of guide discovery operation.
 * Contains all discovered guides plus any warnings encountered.
 */
export interface GuideManifest {
  /** All discovered guide files, sorted alphabetically by relativePath */
  guides: DiscoveredGuide[];

  /** Non-fatal issues encountered during discovery */
  warnings: GuideDiscoveryWarning[];

  /** Root directory that was scanned (from config or default) */
  materialsRoot: string;

  /** Timestamp of discovery operation */
  discoveredAt: Date;
}

/**
 * Warning codes for guide discovery issues.
 * Mirrors lesson discovery warning codes for consistency.
 */
export type GuideDiscoveryWarningCode =
  | "MISSING_MATERIALS_DIR"     // materials/ directory doesn't exist
  | "EMPTY_MATERIALS_DIR"       // materials/ exists but no guides found
  | "MALFORMED_FRONTMATTER"     // YAML parse error or validation failure
  | "MISSING_TITLE"             // Frontmatter exists but no title field
  | "READ_ERROR";               // File read failed (permissions, etc.)

/**
 * A warning from guide discovery.
 * Warnings are non-fatal; discovery continues and reports all issues.
 */
export interface GuideDiscoveryWarning {
  code: GuideDiscoveryWarningCode;
  message: string;
  filePath?: string;            // Absolute path if file-specific
  relativePath?: string;        // Relative path for display
}

/**
 * Options for guide discovery.
 */
export interface GuideDiscoveryOptions {
  /** Include raw frontmatter string in results (default: false) */
  includeRawFrontmatter?: boolean;

  /** Filter to guides in a specific subdirectory (e.g., "module-01") */
  subdirectory?: string;
}
```

### Filename Pattern

Guide filenames must match: `guide*.md`

Examples of valid filenames:
- `guide.md` → slug: `"guide"` (bare guide)
- `guide-setup.md` → slug: `"setup"`
- `guide-advanced-deployment.md` → slug: `"advanced-deployment"`
- `guide-01-intro.md` → slug: `"01-intro"`

```typescript
// Regex for extracting slug from guide filename
export const GUIDE_FILENAME_PATTERN = /^guide(?:-(.+))?\.md$/i;

export function parseGuideFilename(filename: string): { slug: string } | null {
  const match = filename.match(GUIDE_FILENAME_PATTERN);
  if (!match) return null;

  // If no suffix after "guide-", use "guide" as slug
  const slug = match[1] || "guide";
  return { slug };
}
```

## API Contracts

### Main Discovery Function

```typescript
/**
 * Discover all guide files in the materials directory.
 *
 * @param config - Loaded CourseKit configuration
 * @param options - Discovery options
 * @returns GuideManifest with guides and warnings
 *
 * @example
 * const config = await loadConfig();
 * const manifest = await discoverGuides(config);
 * console.log(`Found ${manifest.guides.length} guides`);
 */
export async function discoverGuides(
  config: CourseKitConfig,
  options: GuideDiscoveryOptions = {}
): Promise<GuideManifest>;
```

### Utility Functions

```typescript
/**
 * Parse guide filename to extract slug.
 * Returns null if filename doesn't match guide*.md pattern.
 */
export function parseGuideFilename(filename: string): { slug: string } | null;

/**
 * Parse frontmatter from guide file content.
 * Returns parsed frontmatter or error details (never throws).
 */
export function parseGuideFrontmatter(content: string): {
  frontmatter: GuideFrontmatter | null;
  raw?: string;
  error?: string;
};

/**
 * Scan materials directory for guide files.
 * Returns array of relative paths matching guide*.md pattern.
 */
export async function scanGuideFiles(
  materialsRoot: string,
  options?: { subdirectory?: string }
): Promise<string[]>;
```

## Implementation Phases

### Phase 1: Types and Schemas (30 min)

**Goal:** Define all types in `src/types.ts`

**Tasks:**
1. Add `GuideFrontmatter` interface
2. Add `GuideFrontmatterSchema` Zod schema
3. Add `DiscoveredGuide` interface
4. Add `GuideManifest` interface
5. Add `GuideDiscoveryWarning` and `GuideDiscoveryWarningCode` types
6. Add `GuideDiscoveryOptions` interface
7. Export all new types

**Verification:** TypeScript compiles without errors

### Phase 2: Filename Parsing Utilities (30 min)

**Goal:** Create `src/lib/guide-discovery-utils.ts`

**Tasks:**
1. Implement `GUIDE_FILENAME_PATTERN` regex
2. Implement `parseGuideFilename()` function
3. Implement `parseGuideFrontmatter()` function (reuse pattern from discovery-utils.ts)
4. Write unit tests in `src/lib/guide-discovery-utils.test.ts`

**Test Cases:**
- `guide.md` → slug: "guide"
- `guide-setup.md` → slug: "setup"
- `guide-multi-word-slug.md` → slug: "multi-word-slug"
- `Guide-CamelCase.md` → slug: "CamelCase" (case preserved)
- `readme.md` → null (not a guide)
- `my-guide.md` → null (prefix must be "guide")

### Phase 3: Directory Scanning (45 min)

**Goal:** Implement glob-based file scanning

**Tasks:**
1. Implement `scanGuideFiles()` using Bun.Glob
2. Handle missing materials directory (return warning, not error)
3. Handle empty directory (return warning)
4. Exclude hidden files (`.DS_Store`, etc.)
5. Return paths sorted alphabetically
6. Write unit tests

**Test Cases:**
- Flat directory with guides
- Nested directories at various depths
- Mixed guide and non-guide files
- Empty directory
- Missing directory
- Hidden files filtered

### Phase 4: Main Discovery Function (1 hour)

**Goal:** Implement `discoverGuides()` in `src/lib/guide-discovery.ts`

**Tasks:**
1. Resolve materials root from config
2. Call `scanGuideFiles()` for file list
3. For each file:
   - Parse filename for slug
   - Read file content
   - Parse frontmatter
   - Collect warnings for issues
4. Build `DiscoveredGuide` objects
5. Sort results alphabetically by `relativePath`
6. Return `GuideManifest`
7. Write comprehensive tests

**Integration Points:**
- Uses `loadConfig()` from F-1
- Follows warning pattern from F-2
- Frontmatter parsing mirrors F-2/F-3 approach

### Phase 5: Test Fixtures (30 min)

**Goal:** Create test fixtures for all scenarios

**Tasks:**
1. Create `test-fixtures/guides-flat/` - flat structure
2. Create `test-fixtures/guides-nested/` - multi-level nesting
3. Create `test-fixtures/guides-mixed/` - guides + other files
4. Create `test-fixtures/guides-empty/` - empty materials dir
5. Create `test-fixtures/guides-malformed/` - bad frontmatter
6. Update existing fixtures if needed for integration tests

### Phase 6: Integration Testing (30 min)

**Goal:** End-to-end tests with config loading

**Tasks:**
1. Test discovery with real config file
2. Test filtering by subdirectory
3. Test includeRawFrontmatter option
4. Verify deterministic ordering
5. Performance test with 100+ files (must complete < 500ms)

## File Structure

```
src/
├── types.ts                      # + Guide types (Phase 1)
├── lib/
│   ├── guide-discovery.ts        # Main discovery function (Phase 4)
│   ├── guide-discovery.test.ts   # Discovery tests (Phase 4)
│   ├── guide-discovery-utils.ts  # Filename/frontmatter parsing (Phase 2)
│   └── guide-discovery-utils.test.ts  # Utils tests (Phase 2)
└── commands/
    └── (future: sync command will use guide discovery)

test-fixtures/
├── guides-flat/                  # Scenario 1: flat structure
│   ├── coursekit.json
│   └── materials/
│       ├── guide-setup.md
│       └── guide-troubleshooting.md
├── guides-nested/                # Scenario 2: nested directories
│   ├── coursekit.json
│   └── materials/
│       ├── module-01/
│       │   └── guide-intro.md
│       └── module-02/
│           └── advanced/
│               └── guide-deployment.md
├── guides-mixed/                 # Scenario 3: mixed files
│   ├── coursekit.json
│   └── materials/
│       ├── guide-setup.md
│       ├── notes.md              # Should be filtered
│       └── README.md             # Should be filtered
├── guides-empty/                 # Scenario 4: empty materials
│   ├── coursekit.json
│   └── materials/
│       └── .gitkeep
├── no-materials/                 # Scenario 5: missing directory
│   └── coursekit.json
└── guides-malformed/             # Scenario 6: bad frontmatter
    ├── coursekit.json
    └── materials/
        ├── guide-bad-yaml.md     # Invalid YAML
        └── guide-no-title.md     # Missing required title
```

## Dependencies

### External Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `yaml` | ^2.x | Already installed, YAML parsing |
| `zod` | ^3.x | Already installed, schema validation |

No new dependencies required - Bun.Glob is built-in.

### Internal Dependencies

| Module | Dependency |
|--------|------------|
| `guide-discovery.ts` | `types.ts`, `config.ts`, `guide-discovery-utils.ts` |
| `guide-discovery-utils.ts` | `types.ts`, `yaml` |

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Bun.Glob API differences from fast-glob | Medium | Low | Test patterns thoroughly; have fast-glob as fallback |
| Performance with deep nesting (100+ guides) | Medium | Low | Benchmark early; Bun.Glob is native and fast |
| Inconsistent path separators (Windows) | Low | Medium | Use `path.join()` and normalize paths |
| Symlink handling in materials | Low | Low | Document behavior; follow symlinks by default |
| Large files causing memory issues | Low | Low | Guides are markdown, typically small |
| Concurrent access during discovery | Low | Low | Discovery is read-only; no locking needed |

### Performance Benchmark

**Target:** 100 guide files across nested directories in < 500ms

**Test Plan:**
1. Create fixture with 100 guides at various depths
2. Run discovery 10 times, measure average
3. If > 500ms, investigate:
   - Parallel file reads
   - Caching frontmatter parser
   - Streaming glob results

## Testing Strategy

### Unit Tests

| Module | Test Count | Focus |
|--------|------------|-------|
| `guide-discovery-utils.ts` | ~15 | Filename parsing, frontmatter parsing |
| `guide-discovery.ts` | ~20 | Discovery scenarios, warning codes |

### Integration Tests

| Scenario | Fixture | Verification |
|----------|---------|--------------|
| Flat guides | `guides-flat/` | Both guides discovered |
| Nested guides | `guides-nested/` | Depth doesn't matter |
| Mixed files | `guides-mixed/` | Only guide* files |
| Empty dir | `guides-empty/` | Empty result + warning |
| Missing dir | `no-materials/` | Empty result + warning |
| Malformed | `guides-malformed/` | Files included with warnings |

### Edge Cases

- Guide filename with numbers: `guide-01-intro.md`
- Guide at root: `materials/guide.md`
- Guide deeply nested: `materials/a/b/c/d/guide-deep.md`
- Duplicate slugs in different directories
- Unicode in filenames (if supported)
- Very long filenames
- Empty guide file (no content, no frontmatter)

## Success Criteria Mapping

| Spec Criterion | Implementation | Test |
|----------------|----------------|------|
| Discovers `materials/**/guide*.md` | `scanGuideFiles()` with Bun.Glob | Scenario 1, 2 |
| Handles arbitrary nesting | Glob `**` pattern | Scenario 2 |
| Parses YAML without crashing | Try/catch + warning | Scenario 6 |
| Empty results for missing/empty dirs | Check existence, return warning | Scenario 4, 5 |
| Ignores non-guide markdown | Glob pattern `guide*.md` | Scenario 3 |
| Reads materials root from config | `config.platform.materialsRoot` | All scenarios |
| Deterministic ordering | Sort by `relativePath` | All scenarios |

## Open Questions (Resolved)

| Question | Resolution | Rationale |
|----------|------------|-----------|
| Required frontmatter fields | Only `title` required | Guides are supplementary; keep flexible |
| Guide-course association | None (guides are global) | Spec says "global materials" |
| Ordering | Alphabetical by relativePath | Spec says "deterministic"; alpha is simple |
| Materials root config | `config.platform.materialsRoot` | Follows existing config structure |
