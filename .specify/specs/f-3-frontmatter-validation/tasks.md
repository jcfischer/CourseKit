# Implementation Tasks: Frontmatter Validation

## Progress Tracking

| Task | Status | Notes |
|------|--------|-------|
| T-1.1 | ☐ | Validation types |
| T-1.2 | ☐ | Zod schema |
| T-2.1 | ☐ | Single-file validation |
| T-2.2 | ☐ | Batch validation |
| T-2.3 | ☐ | Duplicate order detection |
| T-3.1 | ☐ | Unit tests - schema |
| T-3.2 | ☐ | Unit tests - single file |
| T-3.3 | ☐ | Unit tests - batch |
| T-3.4 | ☐ | Unit tests - edge cases |
| T-4.1 | ☐ | CLI integration |
| T-4.2 | ☐ | CLI output formatting |
| T-4.3 | ☐ | Integration tests |

---

## Group 1: Foundation (Types & Schema)

### T-1.1: Add validation types to types.ts [T]
- **File:** `src/types.ts`
- **Test:** N/A (types are compile-time checked)
- **Dependencies:** none
- **Description:** Add `ValidationIssue`, `FileValidation`, and `ValidationResult` interfaces to the existing types file. These types define the shape of validation output.

**Acceptance:**
- `ValidationIssue` has `field`, `message`, `suggestion?` properties
- `FileValidation` has `filePath`, `valid`, `errors[]` properties
- `ValidationResult` has `valid`, `totalFiles`, `validFiles`, `invalidFiles`, `files[]` properties
- TypeScript compiles without errors

### T-1.2: Create Zod validation schema [T]
- **File:** `src/lib/validation.ts`
- **Test:** `src/lib/validation.test.ts` (T-3.1)
- **Dependencies:** T-1.1
- **Description:** Create `FrontmatterValidationSchema` using Zod with strict validation for required fields (`courseSlug`, `moduleId`, `title`, `order`) and type constraints (order must be positive integer). Include `FrontmatterValidationError` class.

**Acceptance:**
- Schema validates all 4 required fields
- `order` validated as positive integer (not zero, not negative, not float)
- String fields validated as non-empty
- Optional fields (`description`, `draft`) allowed
- Unknown fields pass through (FR-9)
- Custom error class extends Error with ValidationResult

---

## Group 2: Core Validation Logic

### T-2.1: Implement single-file validation [T]
- **File:** `src/lib/validation.ts`
- **Test:** `src/lib/validation.test.ts` (T-3.2)
- **Dependencies:** T-1.1, T-1.2
- **Description:** Implement `validateLessonFrontmatter(lesson: DiscoveredLesson, config: CourseKitConfig): FileValidation` function. Must collect ALL errors per file (not stop at first), cross-reference `courseSlug` against `config.courses`, and generate fix suggestions.

**Acceptance:**
- Returns `FileValidation` with all errors collected
- Checks frontmatter exists (from F-2 discovery)
- Runs Zod schema validation with `safeParse()`
- Cross-references `courseSlug` against `Object.keys(config.courses)`
- Generates suggestion for each error type per spec table
- Missing frontmatter returns specific error

### T-2.2: Implement batch validation [T]
- **File:** `src/lib/validation.ts`
- **Test:** `src/lib/validation.test.ts` (T-3.3)
- **Dependencies:** T-2.1
- **Description:** Implement `validateAllLessons(manifest: LessonManifest, config: CourseKitConfig): ValidationResult` function. Iterates all lessons, aggregates results, calculates stats.

**Acceptance:**
- Returns `ValidationResult` with summary stats
- Continues on errors (doesn't stop at first failure)
- Only includes files with errors in `files[]`
- Calculates `totalFiles`, `validFiles`, `invalidFiles` correctly
- Empty manifest returns `{ valid: true, totalFiles: 0, ... }`

### T-2.3: Add duplicate order detection [T] [P with T-2.2]
- **File:** `src/lib/validation.ts`
- **Test:** `src/lib/validation.test.ts` (T-3.3)
- **Dependencies:** T-2.1
- **Description:** Add post-validation check in `validateAllLessons()` for duplicate `order` values within the same `courseSlug:moduleId` combination. Generate warning (not error) for duplicates.

**Acceptance:**
- Groups lessons by `courseSlug:moduleId`
- Detects duplicate order values within each group
- Returns warnings array with duplicate info
- Does not fail validation (warning only)
- Warning includes module key and conflicting orders

---

## Group 3: Test Coverage

### T-3.1: Unit tests - Zod schema [T]
- **File:** `src/lib/validation.test.ts`
- **Test:** Self
- **Dependencies:** T-1.2
- **Description:** Test the `FrontmatterValidationSchema` directly with various inputs.

**Test cases:**
1. Valid frontmatter with all required fields passes
2. Valid frontmatter with optional fields passes
3. Extra unknown fields are allowed (passthrough)
4. Missing `courseSlug` fails with correct error
5. Missing `moduleId` fails with correct error
6. Missing `title` fails with correct error
7. Missing `order` fails with correct error
8. `order` as string fails
9. `order` as negative number fails
10. `order` as zero fails
11. `order` as float fails
12. Empty string `title` fails
13. Empty string `courseSlug` fails

### T-3.2: Unit tests - single-file validation [T] [P with T-3.1]
- **File:** `src/lib/validation.test.ts`
- **Test:** Self
- **Dependencies:** T-2.1
- **Description:** Test `validateLessonFrontmatter()` function with mock lessons and config.

**Test cases:**
1. Valid lesson passes all checks
2. Missing frontmatter returns error with suggestion
3. Unknown `courseSlug` returns error with available courses list
4. Valid `courseSlug` passes cross-reference
5. Multiple errors returns all (not just first)
6. Each error includes file path
7. Each error includes appropriate suggestion
8. Suggestion for missing field includes example syntax
9. Suggestion for unknown courseSlug lists available options

### T-3.3: Unit tests - batch validation [T] [P with T-3.1, T-3.2]
- **File:** `src/lib/validation.test.ts`
- **Test:** Self
- **Dependencies:** T-2.2, T-2.3
- **Description:** Test `validateAllLessons()` function with manifests.

**Test cases:**
1. All valid files returns `valid: true`
2. Mix of valid/invalid aggregates correctly
3. Empty manifest returns `valid: true` with zero counts
4. Stats calculated correctly (totalFiles, validFiles, invalidFiles)
5. Only invalid files appear in `files[]` array
6. Duplicate order values generate warning
7. Duplicate detection scoped to courseSlug:moduleId

### T-3.4: Unit tests - edge cases [T] [P with T-3.3]
- **File:** `src/lib/validation.test.ts`
- **Test:** Self
- **Dependencies:** T-2.1, T-2.2
- **Description:** Edge case coverage for robustness.

**Test cases:**
1. Whitespace-only title fails
2. Whitespace-only courseSlug fails
3. Very large order number (1000000) passes
4. Lesson with only optional fields fails (missing required)
5. Config with no courses defined - all courseSlug checks fail
6. FrontmatterValidationError message includes count

---

## Group 4: CLI Integration

### T-4.1: Add frontmatter validation to CLI [T]
- **File:** `src/commands/validate.ts`
- **Test:** `src/commands/validate.test.ts` (T-4.3)
- **Dependencies:** T-2.2
- **Description:** Modify existing `validateCommand` to support frontmatter validation. Add `--frontmatter` flag or new subcommand. Integrate with F-1 config loading and F-2 discovery.

**Acceptance:**
- New `coursekit validate --frontmatter` option (or make default)
- Loads config via F-1 `loadConfig()`
- Discovers lessons via F-2 `discoverLessons()`
- Runs F-3 `validateAllLessons()`
- Exits with code 1 on validation failure
- Exits with code 0 on success

### T-4.2: Format CLI validation output [T]
- **File:** `src/commands/validate.ts`
- **Test:** `src/commands/validate.test.ts` (T-4.3)
- **Dependencies:** T-4.1
- **Description:** Format validation errors with chalk following spec output format. Show file paths, error messages, and suggestions.

**Acceptance:**
- Output matches spec format with `✗` for failed files
- Each error shows bullet point with message
- Each suggestion shows arrow prefix
- Summary line shows `X/Y files have errors`
- Warnings (duplicate orders) shown separately
- Uses chalk colors (red for errors, dim for suggestions)

### T-4.3: Integration tests for CLI [T]
- **File:** `src/commands/validate.test.ts`
- **Test:** Self
- **Dependencies:** T-4.1, T-4.2
- **Description:** End-to-end tests for the validate command with frontmatter option.

**Test cases:**
1. Valid source directory exits 0
2. Invalid frontmatter exits 1
3. Missing config file shows appropriate error
4. Empty source directory (no lessons) exits 0
5. Output includes file paths relative to source root
6. `--json` flag outputs JSON format

---

## Execution Order

```
Phase 1: Foundation (sequential)
  T-1.1 → T-1.2

Phase 2: Core Logic (T-2.3 can parallel with T-2.2)
  T-2.1 → T-2.2
           ↘
            T-2.3

Phase 3: Tests (high parallelization)
  T-3.1 ─┬─ T-3.2 ─┬─ T-3.3 ─── T-3.4
         └─────────┘

Phase 4: CLI Integration (sequential)
  T-4.1 → T-4.2 → T-4.3
```

**Minimum path:** T-1.1 → T-1.2 → T-2.1 → T-2.2 → T-4.1 → T-4.2

**Parallelization opportunities:**
- T-2.3 can run alongside T-2.2 completion
- All T-3.x tests can run in parallel once their deps are met
- T-3.1 can start as soon as T-1.2 is done

---

## File Summary

| File | Action | Tasks |
|------|--------|-------|
| `src/types.ts` | EXTEND | T-1.1 |
| `src/lib/validation.ts` | CREATE | T-1.2, T-2.1, T-2.2, T-2.3 |
| `src/lib/validation.test.ts` | CREATE | T-3.1, T-3.2, T-3.3, T-3.4 |
| `src/commands/validate.ts` | MODIFY | T-4.1, T-4.2 |
| `src/commands/validate.test.ts` | CREATE | T-4.3 |

---

## Dependencies on Prior Features

| Feature | Dependency | How Used |
|---------|------------|----------|
| F-1 | `loadConfig()` | Get `CourseKitConfig` with `courses` map |
| F-2 | `discoverLessons()` | Get `LessonManifest` with parsed frontmatter |
| F-2 | `DiscoveredLesson` type | Input to `validateLessonFrontmatter()` |

Both F-1 and F-2 are implemented and tested. F-3 builds directly on their outputs.
