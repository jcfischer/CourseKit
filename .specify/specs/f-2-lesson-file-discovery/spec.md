# Specification: Lesson File Discovery

## Overview

Discover lesson markdown files within source repository directories following the `courses/{id}/lessons/` convention. This is the foundational capability that all sync operations depend on — without reliable discovery, push/status/validate commands cannot function. Discovery must handle multiple courses, validate file structure, and produce a manifest of lessons with their metadata.

## User Scenarios

### Scenario 1: Discover lessons in a single course

- **Given** a source repo with `courses/supertag-course/lessons/01-intro.md` and `courses/supertag-course/lessons/02-setup.md`
- **When** CourseKit discovers lessons for course `supertag-course`
- **Then** it returns both lesson files with their paths, order indices, and parsed frontmatter

### Scenario 2: Discover lessons across multiple courses

- **Given** a source repo with courses `supertag-course` and `astro-course`, each containing lessons
- **When** CourseKit discovers all lessons
- **Then** it returns lessons grouped by course ID, each with correct paths and metadata

### Scenario 3: Handle missing lessons directory

- **Given** a source repo with `courses/empty-course/` but no `lessons/` subdirectory
- **When** CourseKit discovers lessons for `empty-course`
- **Then** it returns an empty result for that course with a warning (not an error)

### Scenario 4: Ignore non-markdown files

- **Given** a lessons directory containing `01-intro.md`, `notes.txt`, and `.DS_Store`
- **When** CourseKit discovers lessons
- **Then** only `01-intro.md` is included in results

### Scenario 5: Handle malformed frontmatter

- **Given** a lesson file with invalid or missing YAML frontmatter
- **When** CourseKit discovers lessons
- **Then** the file is included in results but flagged with a validation warning indicating the frontmatter issue

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Scan `courses/{courseId}/lessons/` directories for `.md` files | High |
| FR-2 | Parse lesson order from filename prefix (e.g., `01-`, `02-`) | High |
| FR-3 | Parse YAML frontmatter from each lesson file (title, slug, description) | High |
| FR-4 | Return structured manifest: course ID, lesson path, order, frontmatter | High |
| FR-5 | Support discovering lessons for a single course or all courses | High |
| FR-6 | Validate that discovered files conform to expected structure | Medium |
| FR-7 | Report warnings for structural issues without failing discovery | Medium |
| FR-8 | Resolve source repo root from `coursekit.json` configuration | High |

## Non-Functional Requirements

- **Performance:** Discovery of 50 lessons across 5 courses completes in under 500ms
- **Determinism:** Same directory state always produces same discovery result, with consistent ordering
- **Robustness:** Filesystem errors (permission denied, broken symlinks) produce clear errors, not crashes

## Success Criteria

- [ ] Discovers all `.md` files in `courses/{id}/lessons/` directories
- [ ] Correctly parses numeric order prefix from filenames
- [ ] Parses YAML frontmatter without crashing on malformed files
- [ ] Groups results by course ID
- [ ] Returns empty results (not errors) for courses with no lessons
- [ ] Ignores non-markdown files
- [ ] Reads source root from `coursekit.json`

## Assumptions

- Lesson filenames follow `{nn}-{slug}.md` convention where `{nn}` is a zero-padded number
- Frontmatter uses standard YAML between `---` delimiters
- Source repo root is defined in `coursekit.json` (path TBD by config spec)
- [TO BE CLARIFIED] Exact frontmatter schema — which fields are required vs. optional
- [TO BE CLARIFIED] Whether nested subdirectories within `lessons/` should be traversed or only top-level files
