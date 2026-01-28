# Specification: Platform State Reading

## Overview

Read the current state of lesson, guide, and asset files from the deployment platform (Astro content collections) to enable comparison with source repositories. This is a read-only capability that other features (push, status, validate) depend on to detect drift, conflicts, and sync state. The platform is an Astro site with content collections under `src/content/`.

## User Scenarios

### Scenario 1: Read all platform lessons for a course

- **Given** a platform with `src/content/lessons/supertag-course/01-intro.md` and `src/content/lessons/supertag-course/02-setup.md`
- **When** CourseKit reads platform state for course `supertag-course`
- **Then** it returns both lesson files with their paths, frontmatter, and content hashes

### Scenario 2: Read platform state across all courses

- **Given** a platform with lessons for `supertag-course` and `astro-course`
- **When** CourseKit reads full platform state
- **Then** it returns lessons grouped by course ID with paths, frontmatter, and content hashes

### Scenario 3: Read platform guides for a course

- **Given** a platform with `src/content/guides/supertag-course/getting-started.md`
- **When** CourseKit reads platform state for guides
- **Then** it returns guide files with their paths, frontmatter, and content hashes

### Scenario 4: Handle empty or missing course directory

- **Given** a platform with no `src/content/lessons/new-course/` directory
- **When** CourseKit reads platform state for `new-course`
- **Then** it returns an empty result for that course (not an error)

### Scenario 5: Preserve platform-only fields in state

- **Given** a platform lesson with frontmatter containing `price`, `lemonSqueezyProductId`, and `enrollmentCount`
- **When** CourseKit reads platform state
- **Then** these commerce/platform-owned fields are included in the returned state so sync can detect and protect them

### Scenario 6: Handle corrupted or unparseable platform files

- **Given** a platform lesson file with broken YAML frontmatter
- **When** CourseKit reads platform state
- **Then** the file is included in results but flagged with a parse warning

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Read lesson files from `src/content/lessons/{courseId}/` on the platform | High |
| FR-2 | Read guide files from `src/content/guides/{courseId}/` on the platform | High |
| FR-3 | Read asset references from platform content directories | Medium |
| FR-4 | Parse YAML frontmatter from each platform file | High |
| FR-5 | Compute content hash (body only, excluding frontmatter) for change detection | High |
| FR-6 | Return structured state: course ID, file type, path, frontmatter, content hash | High |
| FR-7 | Identify platform-owned fields (price, lemonSqueezyProductId, etc.) in frontmatter | High |
| FR-8 | Resolve platform root from `coursekit.json` configuration | High |
| FR-9 | Support reading state for a single course or all courses | High |
| FR-10 | Report warnings for parse errors without failing entire read | Medium |

## Non-Functional Requirements

- **Performance:** Reading platform state for 50 files across 5 courses completes in under 500ms
- **Determinism:** Same platform directory state always produces the same result with consistent ordering
- **Robustness:** Filesystem errors (permission denied, missing directories) produce clear errors, not crashes
- **Isolation:** Platform state reading is strictly read-only — no file mutations

## Success Criteria

- [ ] Reads all `.md` files from platform lesson directories
- [ ] Reads all `.md` files from platform guide directories
- [ ] Parses YAML frontmatter from platform files
- [ ] Computes content hashes for body-level change detection
- [ ] Identifies and preserves platform-owned commerce fields
- [ ] Groups results by course ID and content type
- [ ] Returns empty results (not errors) for missing course directories
- [ ] Reads platform root from `coursekit.json`

## Assumptions

- Platform follows Astro content collection structure under `src/content/`
- Lesson files live at `src/content/lessons/{courseId}/{filename}.md`
- Guide files live at `src/content/guides/{courseId}/{filename}.md`
- Platform root path is defined in `coursekit.json`
- [TO BE CLARIFIED] Exact list of platform-owned fields that must be protected during sync
- [TO BE CLARIFIED] Whether asset state includes binary files or only references in markdown
- [TO BE CLARIFIED] Hash algorithm to use for content comparison (e.g., SHA-256 vs simpler)
