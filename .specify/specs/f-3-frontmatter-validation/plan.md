# Technical Plan: Frontmatter Validation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VALIDATION PIPELINE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   F-1        │    │   F-2        │    │   F-3        │                  │
│  │   Config     │───>│   Discovery  │───>│   Validation │                  │
│  │   Loading    │    │   (Lessons)  │    │   (This)     │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│         │                   │                   │                          │
│         v                   v                   v                          │
│  CourseKitConfig    LessonManifest      ValidationResult                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        F-3 INTERNAL FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Input: LessonManifest + CourseKitConfig                                    │
│         │                                                                   │
│         v                                                                   │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │  For each lesson in manifest:                                     │      │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐  │      │
│  │  │ 1. Schema      │  │ 2. Type        │  │ 3. Cross-reference │  │      │
│  │  │    Validation  │─>│    Validation  │─>│    Validation      │  │      │
│  │  │ (required      │  │ (order is int, │  │ (courseSlug in     │  │      │
│  │  │  fields exist) │  │  strings not   │  │  config.courses)   │  │      │
│  │  │                │  │  empty)        │  │                    │  │      │
│  │  └────────────────┘  └────────────────┘  └────────────────────┘  │      │
│  │         │                   │                   │                 │      │
│  │         └───────────────────┼───────────────────┘                 │      │
│  │                             v                                     │      │
│  │                    Collect ALL errors                             │      │
│  │                    (not just first)                               │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│         │                                                                   │
│         v                                                                   │
│  Output: ValidationResult { valid: boolean, files: FileValidation[] }       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Bun | Project standard (already in use) |
| Schema Validation | Zod ^4.3.6 | Already used in F-1 config, `safeParse()` pattern established |
| YAML Parsing | yaml ^2.8.2 | Already used in F-2 discovery-utils |
| CLI Framework | Commander ^12.1.0 | Already integrated, `validate` command exists |
| Terminal Output | chalk ^5.3.0 | Already used for CLI formatting |

**No new dependencies required** - F-3 uses the existing stack entirely.

## Data Model

### Core Types

```typescript
// src/lib/validation.ts

import { z } from "zod";

/**
 * Strict schema for frontmatter validation.
 * Unlike discovery-utils which uses passthrough() for flexibility,
 * this schema enforces all requirements from the spec.
 */
export const FrontmatterValidationSchema = z.object({
  courseSlug: z.string().min(1, "courseSlug is required"),
  moduleId: z.string().min(1, "moduleId is required"),
  title: z.string().min(1, "title is required"),
  order: z
    .number({ message: "order must be a number" })
    .int("order must be an integer")
    .positive("order must be a positive integer"),
  // Optional fields - validated if present, no error if absent
  description: z.string().optional(),
  draft: z.boolean().optional(),
}).passthrough(); // Allow unknown fields without error (FR-9)

export type ValidatedFrontmatter = z.infer<typeof FrontmatterValidationSchema>;
```

### Validation Result Types

```typescript
// src/types.ts (extend existing)

/**
 * Single validation issue for a file
 */
export interface ValidationIssue {
  field: string;           // e.g., "title", "order", "courseSlug"
  message: string;         // Human-readable error
  suggestion?: string;     // Fix suggestion (e.g., "Add 'title: Your Title' to frontmatter")
}

/**
 * Validation result for a single file
 */
export interface FileValidation {
  filePath: string;        // Relative to sourceRoot
  valid: boolean;
  errors: ValidationIssue[];
}

/**
 * Aggregated validation result across all lessons
 */
export interface ValidationResult {
  valid: boolean;          // True if ALL files pass
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  files: FileValidation[]; // Only files with errors (empty if all valid)
}
```

### Error Class

```typescript
// src/lib/validation.ts

/**
 * Custom error for validation failures (follows ConfigValidationError pattern)
 */
export class FrontmatterValidationError extends Error {
  constructor(
    public result: ValidationResult
  ) {
    const summary = `Validation failed: ${result.invalidFiles}/${result.totalFiles} files have errors`;
    super(summary);
    this.name = "FrontmatterValidationError";
  }
}
```

## Implementation Phases

### Phase 1: Core Validation Logic

**Goal:** Implement single-file validation with all error collection.

**Files:** `src/lib/validation.ts`

**Functions:**
```typescript
/**
 * Validate frontmatter for a single lesson.
 * Returns all errors, not just the first.
 */
export function validateLessonFrontmatter(
  lesson: DiscoveredLesson,
  config: CourseKitConfig
): FileValidation;
```

**Logic:**
1. Check if frontmatter exists (from discovery)
2. Run Zod schema validation with `safeParse()`
3. Cross-reference `courseSlug` against `Object.keys(config.courses)`
4. Aggregate all errors into `ValidationIssue[]`
5. Generate suggestions for each error type

**Suggestion Templates:**
| Error | Suggestion |
|-------|------------|
| Missing `title` | `Add 'title: Your Lesson Title' to frontmatter` |
| Missing `courseSlug` | `Add 'courseSlug: <course-id>' (available: ${courses.join(', ')})` |
| Invalid `order` | `Change 'order' to a positive integer (e.g., order: 1)` |
| Unknown `courseSlug` | `courseSlug '${slug}' not found. Available: ${courses.join(', ')}` |

### Phase 2: Batch Validation

**Goal:** Validate all lessons from a manifest, aggregate results.

**Files:** `src/lib/validation.ts`

**Functions:**
```typescript
/**
 * Validate all lessons in a manifest.
 * Continues on errors (doesn't stop at first failure).
 */
export function validateAllLessons(
  manifest: LessonManifest,
  config: CourseKitConfig
): ValidationResult;
```

**Logic:**
1. Iterate over `manifest.lessons`
2. Call `validateLessonFrontmatter()` for each
3. Collect only files with errors into result
4. Calculate summary stats

### Phase 3: Tests

**Goal:** Comprehensive test coverage following existing patterns.

**Files:** `src/lib/validation.test.ts`

**Test Categories:**
1. **Happy path** - Valid frontmatter passes
2. **Missing fields** - Each required field individually
3. **Invalid types** - `order` as string, negative, float
4. **Cross-reference** - Unknown `courseSlug`
5. **Multiple errors** - File with 2+ issues returns all
6. **No frontmatter** - File without `---` block
7. **Batch validation** - Mix of valid/invalid files
8. **Edge cases** - Empty strings, whitespace-only values

**Target:** 25+ test cases

### Phase 4: CLI Integration

**Goal:** Hook validation into `coursekit validate` command.

**Files:** `src/commands/validate.ts` (modify existing)

**Changes:**
1. Add `--frontmatter` flag or make it default validation
2. Load config (F-1)
3. Discover lessons (F-2)
4. Run validation (F-3)
5. Format and display errors with chalk
6. Exit with code 1 if validation fails

**Output Format:**
```
Validating frontmatter...

✗ lessons/module-01/01-intro.md
  • Missing required field 'title'
    → Add 'title: Your Lesson Title' to frontmatter
  • Invalid 'order': must be positive integer (got: -1)
    → Change 'order' to a positive integer (e.g., order: 1)

✗ lessons/module-02/03-advanced.md
  • Unknown courseSlug 'wrong-course'
    → courseSlug 'wrong-course' not found. Available: bridge-your-tana, tana-basics

Validation failed: 2/15 files have errors
```

## File Structure

```
src/
├── lib/
│   ├── validation.ts          # NEW: Core validation logic
│   ├── validation.test.ts     # NEW: Validation tests
│   ├── discovery.ts           # Existing: F-2 lesson discovery
│   └── discovery-utils.ts     # Existing: Frontmatter parsing
├── commands/
│   └── validate.ts            # MODIFY: Add frontmatter validation
└── types.ts                   # EXTEND: Add validation types
```

## Dependencies

### Internal Dependencies (F-1, F-2)

| Dependency | Function | Purpose |
|------------|----------|---------|
| F-1 Config | `loadConfig()` | Get `config.courses` for cross-reference |
| F-2 Discovery | `discoverLessons()` | Get `LessonManifest` with parsed frontmatter |

### External Dependencies

None new - all packages already in `package.json`.

### Prerequisite State

1. `coursekit.json` must exist and be valid (F-1)
2. Source directory must exist with lesson files (F-2)
3. Lesson files must have been discovered (F-2 manifest)

## Open Questions Resolution

### Q1: Should `moduleId` be validated against a known list of modules?

**Decision:** No - any non-empty string is acceptable.

**Rationale:** The spec doesn't define a module registry. Modules are implicit from the `moduleId` values present in lessons. Validating against a list would require:
1. A module definition in config (not in current spec)
2. Or scanning all lessons to build module list (chicken-and-egg)

**Future consideration:** F-4 or later could add module validation if needed.

### Q2: Should duplicate `order` values within the same module be detected?

**Decision:** Yes - warn but don't fail.

**Rationale:** Duplicate orders within a module will cause undefined sorting behavior. However, this is a warning (like discovery warnings) rather than a hard error, since the content itself is valid.

**Implementation:** Add to `validateAllLessons()` as a post-validation check:
```typescript
// After individual validation, check for duplicates
const byModule = groupBy(validLessons, l => `${l.courseSlug}:${l.moduleId}`);
for (const [key, lessons] of Object.entries(byModule)) {
  const orders = lessons.map(l => l.order);
  const duplicates = findDuplicates(orders);
  if (duplicates.length > 0) {
    warnings.push({ type: 'duplicate-order', module: key, orders: duplicates });
  }
}
```

### Q3: Should `draft: true` lessons have relaxed validation?

**Decision:** No - all lessons validate the same way.

**Rationale:** Draft lessons still need valid structure to be synced (even as drafts). If a draft is invalid, it should be fixed before any sync attempt. The `draft` field only affects publish state, not structural validity.

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| F-2 frontmatter format mismatch | High | Low | F-2 already parses frontmatter; reuse its `LessonFrontmatter` type |
| Performance with 100+ files | Medium | Low | Zod `safeParse` is fast; no I/O in validation (already loaded) |
| Breaking existing `validate` command | Medium | Medium | Add `--frontmatter` flag, keep existing phase validation |
| Zod error messages not user-friendly | Low | Medium | Custom error transformation in `formatZodIssue()` helper |
| Cross-reference timing (config not loaded) | Medium | Low | Document that `loadConfig()` must be called first |

## Performance Considerations

**Target:** 100 files in <500ms (per spec NFR-1)

**Analysis:**
- Zod `safeParse()`: ~0.1ms per object
- No file I/O: frontmatter already in memory from F-2
- String comparison for courseSlug: O(n) where n = number of courses
- Expected: 100 files × 1ms = 100ms (well under 500ms)

**No optimization needed** for MVP. If performance becomes an issue:
1. Cache `Object.keys(config.courses)` as a Set
2. Parallelize with `Promise.all()` (unlikely needed)

## Testing Strategy

### Unit Tests (validation.test.ts)

```typescript
describe("validateLessonFrontmatter", () => {
  // Happy path
  test("valid frontmatter passes all checks");

  // Missing required fields
  test("missing courseSlug returns error with suggestion");
  test("missing moduleId returns error with suggestion");
  test("missing title returns error with suggestion");
  test("missing order returns error with suggestion");

  // Type validation
  test("order as string returns type error");
  test("order as negative number returns error");
  test("order as float returns error");
  test("order as zero returns error");

  // Cross-reference
  test("unknown courseSlug returns error with available courses");
  test("valid courseSlug passes");

  // Multiple errors
  test("multiple issues returns all errors not just first");

  // Optional fields
  test("extra unknown fields are allowed");
  test("description field is optional");
  test("draft field is optional");
});

describe("validateAllLessons", () => {
  test("all valid files returns valid=true");
  test("mix of valid/invalid aggregates correctly");
  test("empty manifest returns valid=true with zero files");
  test("duplicate order values generate warning");
});
```

### Integration Tests

```typescript
describe("validate command integration", () => {
  test("exits 0 when all files valid");
  test("exits 1 when any file invalid");
  test("displays formatted errors with chalk");
  test("shows suggestions for each error");
});
```

## Implementation Checklist

- [ ] Create `src/lib/validation.ts` with Zod schema
- [ ] Implement `validateLessonFrontmatter()` function
- [ ] Implement `validateAllLessons()` function
- [ ] Add validation types to `src/types.ts`
- [ ] Create `src/lib/validation.test.ts` with 25+ tests
- [ ] Modify `src/commands/validate.ts` for frontmatter validation
- [ ] Add duplicate order warning detection
- [ ] Test CLI output formatting
- [ ] Verify non-zero exit code on failure
- [ ] Performance test with 100 files
