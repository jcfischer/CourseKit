# Specification: Guide File Discovery

## Overview

Discover guide markdown files within source repository directories following the `materials/**/guide*.md` glob pattern. Guides are supplementary teaching materials (walkthroughs, how-tos, reference guides) that accompany course lessons. Discovery must handle nested directory structures, multiple guides per module, and produce a manifest of guide files with their paths and parsed metadata.

## User Scenarios

### Scenario 1: Discover guides in a flat materials directory

- **Given** a source repo with `materials/guide-setup.md` and `materials/guide-troubleshooting.md`
- **When** CourseKit discovers guide files
- **Then** it returns both guide files with their paths and parsed frontmatter

### Scenario 2: Discover guides in nested directories

- **Given** a source repo with `materials/module-01/guide-intro.md` and `materials/module-02/advanced/guide-deployment.md`
- **When** CourseKit discovers guide files
- **Then** it returns both files regardless of nesting depth

### Scenario 3: Ignore non-guide markdown files

- **Given** a materials directory containing `guide-setup.md`, `notes.md`, and `README.md`
- **When** CourseKit discovers guide files
- **Then** only `guide-setup.md` is included in results

### Scenario 4: Handle empty materials directory

- **Given** a source repo with an empty `materials/` directory
- **When** CourseKit discovers guide files
- **Then** it returns an empty result with no error

### Scenario 5: Handle missing materials directory

- **Given** a source repo with no `materials/` directory
- **When** CourseKit discovers guide files
- **Then** it returns an empty result with a warning (not an error)

### Scenario 6: Handle malformed frontmatter in guide file

- **Given** a guide file with invalid or missing YAML frontmatter
- **When** CourseKit discovers guide files
- **Then** the file is included in results but flagged with a validation warning

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Scan `materials/` recursively for files matching `guide*.md` glob pattern | High |
| FR-2 | Parse YAML frontmatter from each guide file (title, description) | High |
| FR-3 | Return structured manifest: file path, relative path within materials, frontmatter | High |
| FR-4 | Resolve materials root from `coursekit.json` configuration | High |
| FR-5 | Report warnings for structural issues without failing discovery | Medium |
| FR-6 | Support discovering guides for a single course or all courses | Medium |
| FR-7 | Produce deterministic ordering of results (alphabetical by relative path) | Medium |

## Non-Functional Requirements

- **Performance:** Discovery of 100 guide files across nested directories completes in under 500ms
- **Determinism:** Same directory state always produces the same discovery result with consistent ordering
- **Robustness:** Filesystem errors (permission denied, broken symlinks) produce clear errors, not crashes

## Success Criteria

- [ ] Discovers all files matching `materials/**/guide*.md` pattern
- [ ] Correctly handles arbitrary nesting depth within materials
- [ ] Parses YAML frontmatter without crashing on malformed files
- [ ] Returns empty results (not errors) for missing or empty materials directories
- [ ] Ignores markdown files that do not match the `guide*` prefix
- [ ] Reads materials root from `coursekit.json`
- [ ] Results are ordered deterministically

## Assumptions

- Guide filenames follow `guide*.md` convention (e.g., `guide-setup.md`, `guide.md`, `guide-advanced-deploy.md`)
- Frontmatter uses standard YAML between `---` delimiters
- Materials root is defined in `coursekit.json` (path TBD by config spec)
- [TO BE CLARIFIED] Exact frontmatter schema for guides — which fields are required vs. optional
- [TO BE CLARIFIED] Whether guides are associated with specific courses or are global materials
- [TO BE CLARIFIED] Whether guide ordering matters (alphabetical vs. explicit order field)
