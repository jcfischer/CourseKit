# Specification: Push Command CLI

## Overview

Implement the `coursekit push` command that performs one-way sync of lessons, guides, and assets from source repositories to the deployment platform. Supports `--dry-run` for previewing changes and `--force` for overriding conflict warnings. This is the primary user-facing command for publishing course content.

## User Scenarios

### Scenario 1: Standard push with no conflicts

- **Given** a configured source repo with modified lesson files
- **When** the user runs `coursekit push`
- **Then** all changed lessons are synced to the platform directory, unchanged files are skipped, and a summary of changes is displayed

### Scenario 2: Dry-run preview

- **Given** a source repo with pending changes
- **When** the user runs `coursekit push --dry-run`
- **Then** the command displays exactly what would be created, updated, or deleted without writing any files

### Scenario 3: Push with conflicts detected

- **Given** the platform has local edits to files that would be overwritten
- **When** the user runs `coursekit push`
- **Then** the command warns about each conflict, lists affected files, and exits without making changes

### Scenario 4: Force push past conflicts

- **Given** the platform has local edits to synced files
- **When** the user runs `coursekit push --force`
- **Then** the source files overwrite platform files, a warning is logged for each overwritten file, and commerce fields remain untouched

### Scenario 5: Missing platform course

- **Given** the source references a course slug not present in the platform
- **When** the user runs `coursekit push`
- **Then** the command exits with an error explaining which course is missing and how to create it

### Scenario 6: Commerce field protection

- **Given** platform lesson files contain `price`, `lemonSqueezyProductId`, or other commerce fields
- **When** the user runs `coursekit push` or `coursekit push --force`
- **Then** commerce fields in platform files are never modified, only content fields are synced

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | `coursekit push` syncs lesson, guide, and asset files from source to platform | High |
| FR-2 | `--dry-run` flag shows planned changes without writing files | High |
| FR-3 | `--force` flag overrides conflict warnings and proceeds with sync | High |
| FR-4 | Conflict detection compares source and platform file states before writing | High |
| FR-5 | Commerce fields (`price`, `lemonSqueezyProductId`, enrollment data) are never modified by push | High |
| FR-6 | Exit with clear error if source references a course not in platform | Medium |
| FR-7 | Display summary after push: files created, updated, skipped, conflicts | Medium |
| FR-8 | Read configuration from `coursekit.json` for source/platform paths | High |
| FR-9 | Support multiple source repositories pushing to the same platform | Medium |
| FR-10 | Reject push if two sources claim ownership of the same course | Medium |

## Non-Functional Requirements

- **Performance:** Push completes in <5 seconds for a typical course (10-20 lessons)
- **Safety:** No partial writes — if an error occurs mid-sync, no files are left in an inconsistent state
- **Output:** Human-readable CLI output with clear file-by-file status
- **Exit codes:** 0 for success, 1 for errors, 2 for conflicts (without `--force`)

## Success Criteria

- [ ] `coursekit push` syncs all lesson/guide/asset files from source to platform
- [ ] `--dry-run` produces accurate preview matching actual push behavior
- [ ] `--force` bypasses conflict detection and completes sync
- [ ] Commerce fields are preserved in all scenarios (standard, force, dry-run)
- [ ] Conflicts are detected and clearly reported with file paths
- [ ] Multiple source repos can push without collision
- [ ] Push completes in <5 seconds for typical course size

## Assumptions

- `coursekit.json` configuration format is already defined or will be defined by a prior feature
- Diff calculation (F-7) and conflict detection (F-8) are available as internal modules
- Lesson file discovery (F-2), guide file discovery (F-4), and asset file discovery (F-5) provide the file lists to sync
- The platform directory structure follows the Astro content collections pattern (`src/content/lessons/`, `src/content/courses/`)

## Open Questions

- [TO BE CLARIFIED] Which commerce fields exactly constitute the protected set? Currently assumed: `price`, `lemonSqueezyProductId`. Are there others (e.g., `enrollmentCount`, `publishedAt`)?
- [TO BE CLARIFIED] Should `--force` also force-push when the platform course doesn't exist, or only override file-level conflicts?
- [TO BE CLARIFIED] What is the rollback strategy on partial failure — revert written files, or leave them and report?
