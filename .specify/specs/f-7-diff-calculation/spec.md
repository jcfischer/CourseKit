# Specification: Diff Calculation

## Overview

Calculate differences between source repository content and platform content to produce a sync preview. This is the core comparison engine that powers `coursekit push --dry-run` and `coursekit status`—it tells the user exactly what would change before any sync occurs. The diff must respect ownership boundaries: only source-owned fields (lesson content, frontmatter metadata) are compared, while platform-owned fields (price, lemonSqueezyProductId, enrollments) are excluded from comparison.

## User Scenarios

### Scenario 1: Preview changes before sync

- **Given** a source repo with 10 lessons and a platform with 4 lessons
- **When** the user runs diff calculation (e.g., via `coursekit push --dry-run`)
- **Then** the diff shows 6 lessons as "new", and for the 4 existing lessons, shows any content or frontmatter differences

### Scenario 2: No changes detected

- **Given** source and platform content are identical for all source-owned fields
- **When** diff calculation runs
- **Then** the result indicates no changes, with a clear "up to date" status

### Scenario 3: Modified lesson content

- **Given** a lesson exists in both source and platform, but the source has newer content
- **When** diff calculation runs
- **Then** the diff identifies the lesson as "modified" and reports which fields changed (e.g., body content, title, description)

### Scenario 4: Deleted lesson in source

- **Given** a lesson exists in platform but has been removed from source
- **When** diff calculation runs
- **Then** the diff identifies the lesson as "removed from source" and flags it for user decision

### Scenario 5: Platform-owned fields ignored

- **Given** the platform has `price: 79` and `lemonSqueezyProductId: 12345` on a course
- **When** diff calculation compares source and platform
- **Then** those platform-owned fields are excluded from the diff entirely

### Scenario 6: Frontmatter-only changes

- **Given** a lesson's body content is identical but frontmatter `description` changed in source
- **When** diff calculation runs
- **Then** the diff reports a frontmatter change, listing the specific field

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Compare source lesson files against platform lesson files by matching on a canonical key (slug or file path) | High |
| FR-2 | Classify each file into one of: `added`, `modified`, `unchanged`, `removed` | High |
| FR-3 | For `modified` files, report which fields changed (body, title, description, other frontmatter) | High |
| FR-4 | Exclude platform-owned fields from comparison (price, lemonSqueezyProductId, enrollment data) | High |
| FR-5 | Support diffing lessons, guides, and asset references (not binary asset content) | High |
| FR-6 | Return a structured diff result object suitable for programmatic consumption (not just human-readable text) | High |
| FR-7 | Provide a human-readable summary (e.g., "6 added, 2 modified, 0 removed, 4 unchanged") | Medium |
| FR-8 | Handle missing platform directory gracefully (first-time sync: all files are `added`) | Medium |
| FR-9 | Normalize content before comparison to avoid false positives from trailing whitespace or line endings | Low |

## Non-Functional Requirements

- **Performance:** Diff calculation must complete in <2 seconds for up to 100 lesson files
- **Determinism:** Same inputs must always produce the same diff output
- **No side effects:** Diff calculation is read-only; it must never modify source or platform files
- **Testability:** The diff engine must be a pure function (inputs in, diff result out) with no filesystem coupling in its core logic

## Data Model

The diff result should capture:

```
DiffResult {
  summary: { added: number, modified: number, removed: number, unchanged: number }
  items: DiffItem[]
}

DiffItem {
  path: string           // relative file path
  status: added | modified | removed | unchanged
  changes?: FieldChange[]  // only for modified
}

FieldChange {
  field: string          // e.g., "title", "description", "body"
  source: string         // source value (or hash for body)
  platform: string       // platform value (or hash for body)
}
```

[TO BE CLARIFIED] Whether body diffs should include line-level detail or just a "changed" flag. Line-level is useful for preview but adds complexity.

## Ownership Boundary

The diff engine needs a clear list of platform-owned fields to exclude. This should be configurable but defaults to:

- `price`
- `lemonSqueezyProductId`
- `enrollmentCount`
- `publishedAt` (platform controls publication timing)

[TO BE CLARIFIED] Whether the platform-owned field list is hardcoded, configured in `coursekit.json`, or derived from a schema definition.

## Success Criteria

- [ ] Diff correctly identifies added, modified, removed, and unchanged files
- [ ] Platform-owned fields are never included in diff comparison
- [ ] Diff result is a structured object usable by `push`, `status`, and `--dry-run`
- [ ] Handles first-time sync (empty platform) without errors
- [ ] Completes in <2 seconds for 100 files
- [ ] Pure function with no side effects—fully unit-testable

## Assumptions

- Source and platform files use the same markdown + frontmatter format
- Files are matched by slug derived from filename (e.g., `01-intro.md` matches across source and platform)
- The file discovery features (F-2, F-4, F-5) provide the list of source files; this feature compares against platform files at known paths
