# F-3: Frontmatter Validation

## Problem Statement

Lesson markdown files use YAML frontmatter to define metadata (course association, module placement, title, ordering). If frontmatter is missing, incomplete, or malformed, sync will either fail silently or produce broken content on the platform. Validation must catch these issues before any sync attempt.

## Users & Context

**Primary user:** Course author running `coursekit validate` or `coursekit push` from a source repository.

**Context:** Each lesson is a markdown file with YAML frontmatter. Validation runs as a pre-sync gate -- no lesson with invalid frontmatter should reach the platform. This feature has no dependencies and can be implemented standalone.

## Requirements

### Functional

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Parse YAML frontmatter from markdown lesson files | High |
| FR-2 | Validate presence of required fields: `courseSlug`, `moduleId`, `title`, `order` | High |
| FR-3 | Validate `order` is a positive integer | High |
| FR-4 | Validate `courseSlug` matches a known course from config | High |
| FR-5 | Validate `title` is a non-empty string | High |
| FR-6 | Validate `moduleId` is a non-empty string | High |
| FR-7 | Return all validation errors per file (not just the first) | Medium |
| FR-8 | Aggregate validation results across all lesson files | Medium |
| FR-9 | Support optional frontmatter fields without erroring on them | Low |

### Non-Functional

1. Validate 100 lesson files in <500ms
2. Error messages include file path and field name
3. Error messages suggest fixes (e.g., "Missing required field 'title' in lessons/01-intro.md")
4. Exit with non-zero code when validation fails (for CI integration)

## Frontmatter Schema

```yaml
---
courseSlug: bridge-your-tana        # Required: must match a course in coursekit.json
moduleId: module-01                 # Required: non-empty string
title: Introduction to Tana         # Required: non-empty string
order: 1                            # Required: positive integer
description: Optional description   # Optional
draft: false                        # Optional
---
```

## User Scenarios

### Scenario 1: Valid frontmatter passes validation
- **Given** a lesson file with all required fields present and valid
- **When** validation runs on the file
- **Then** the file passes with no errors

### Scenario 2: Missing required field detected
- **Given** a lesson file missing the `title` field
- **When** validation runs on the file
- **Then** an error reports the missing field with file path and field name

### Scenario 3: Invalid order value detected
- **Given** a lesson file with `order: -1` or `order: "first"`
- **When** validation runs on the file
- **Then** an error reports that `order` must be a positive integer

### Scenario 4: Multiple errors reported per file
- **Given** a lesson file missing `title` and with an invalid `order`
- **When** validation runs on the file
- **Then** both errors are reported (not just the first one found)

### Scenario 5: Unknown courseSlug detected
- **Given** a lesson file with `courseSlug: nonexistent-course`
- **When** validation runs with a loaded config
- **Then** an error reports the slug doesn't match any configured course

### Scenario 6: Batch validation across all lessons
- **Given** a source directory with 10 lesson files, 2 of which have errors
- **When** `coursekit validate` runs
- **Then** validation reports errors for both files and exits non-zero

### Scenario 7: File without frontmatter
- **Given** a markdown file with no YAML frontmatter block
- **When** validation runs on the file
- **Then** an error reports "No frontmatter found" with the file path

## Success Criteria

- [ ] All four required fields validated (courseSlug, moduleId, title, order)
- [ ] Type validation enforced (order is positive integer, strings are non-empty)
- [ ] Cross-reference validation works (courseSlug checked against config)
- [ ] All errors per file reported, not just first
- [ ] Clear error messages with file path, field name, and fix suggestion
- [ ] Non-zero exit code on validation failure

## Assumptions

1. Frontmatter uses standard YAML delimited by `---` markers
2. Config (F-1) is loaded before validation runs for courseSlug cross-referencing
3. Lesson file discovery (F-2) provides the list of files to validate

## Open Questions

- [TO BE CLARIFIED]: Should `moduleId` be validated against a known list of modules, or is any non-empty string acceptable?
- [TO BE CLARIFIED]: Should duplicate `order` values within the same module be detected as an error?
- [TO BE CLARIFIED]: Should `draft: true` lessons be validated with relaxed rules (e.g., allow missing description)?
