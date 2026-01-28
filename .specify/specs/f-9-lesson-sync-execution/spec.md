# Specification: Lesson Sync Execution

## Overview

Copy lesson files from a source repository to the platform's `src/content/lessons/{slug}/` directory as part of the `coursekit push` command. This is the core file-transfer operation that makes one-way sync work. It reads discovered lesson files (from F-2), validates frontmatter (from F-3), and writes them to the correct platform location while respecting ownership boundaries.

## User Scenarios

### Scenario 1: Clean sync of all lessons

- **Given** a source repo with 10 lessons and a platform with no existing lesson files
- **When** the user runs `coursekit push`
- **Then** all 10 lessons are copied to `src/content/lessons/{slug}/` in the platform directory
- **And** each lesson retains its original frontmatter and content
- **And** a summary is printed showing 10 files copied, 0 skipped, 0 conflicts

### Scenario 2: Incremental sync with unchanged files

- **Given** a platform already containing 8 synced lessons identical to source
- **When** the user runs `coursekit push` after editing 2 lessons in source
- **Then** only the 2 changed lessons are overwritten in the platform
- **And** the 8 unchanged lessons are not touched
- **And** the summary shows 2 updated, 8 unchanged

### Scenario 3: Dry-run preview

- **Given** a source repo with lessons ready to sync
- **When** the user runs `coursekit push --dry-run`
- **Then** no files are written to the platform
- **And** output shows exactly which files would be created, updated, or skipped
- **And** exit code is 0

### Scenario 4: Conflict detection

- **Given** a lesson file in the platform that has been manually edited since last sync
- **When** the user runs `coursekit push`
- **Then** the conflicting file is skipped with a warning
- **And** the summary lists conflicting files separately
- **And** the user is told to use `--force` to overwrite

### Scenario 5: Force overwrite

- **Given** a lesson file in the platform with local modifications
- **When** the user runs `coursekit push --force`
- **Then** the platform file is overwritten with the source version
- **And** a warning is printed noting the overwrite

### Scenario 6: Missing platform directory

- **Given** the platform's `src/content/lessons/` directory does not exist
- **When** the user runs `coursekit push`
- **Then** the directory structure is created automatically
- **And** lessons are copied normally

### Scenario 7: Slug directory structure

- **Given** a lesson with slug `intro-to-tana`
- **When** sync executes for this lesson
- **Then** the file is placed at `src/content/lessons/intro-to-tana/index.md` (or the appropriate filename)
- **And** any co-located assets referenced by the lesson are included

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Copy lesson markdown files from source to platform `src/content/lessons/{slug}/` | High |
| FR-2 | Determine the slug from the lesson's directory name or frontmatter slug field | High |
| FR-3 | Detect unchanged files (by content hash) and skip them during sync | High |
| FR-4 | Support `--dry-run` flag that previews changes without writing | High |
| FR-5 | Support `--force` flag that overwrites conflicting files | High |
| FR-6 | Detect conflicts where platform files differ from last-synced version | High |
| FR-7 | Create target directories if they do not exist | Medium |
| FR-8 | Print a summary after sync: created, updated, unchanged, skipped, conflicts | High |
| FR-9 | Preserve lesson frontmatter exactly as-is (no field injection or modification) | High |
| FR-10 | Never write to files outside `src/content/lessons/` during lesson sync | High |
| FR-11 | Support syncing a single lesson by slug (`coursekit push --lesson intro-to-tana`) | Medium |
| FR-12 | Return non-zero exit code when conflicts prevent full sync (without `--force`) | Medium |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Sync of 50 lessons completes in under 5 seconds on local filesystem |
| NFR-2 | File operations are atomic per-lesson: a lesson is either fully synced or not at all |
| NFR-3 | No external network calls required (local filesystem only) |
| NFR-4 | Output is human-readable and suitable for CI logs |
| NFR-5 | [TO BE CLARIFIED] Whether a lock file or sync manifest should track last-synced state for conflict detection |

## Conflict Detection Strategy

Conflicts arise when a platform file has been modified since the last sync. Detection requires knowing what was last synced.

**Approach:** Maintain a `.coursekit/sync-manifest.json` in the platform directory that records the content hash of each file at last sync time. On push, compare:
1. Source file hash vs. manifest hash (source changed?)
2. Platform file hash vs. manifest hash (platform changed?)
3. If both changed, it's a conflict.

[TO BE CLARIFIED] Whether the sync manifest lives in `.coursekit/` at platform root or inside each lesson directory.

## Success Criteria

- [ ] `coursekit push` copies all lessons from source to platform lesson directory
- [ ] Unchanged files are detected and skipped (no unnecessary writes)
- [ ] `--dry-run` shows changes without modifying the filesystem
- [ ] Conflicts are detected and reported; `--force` overrides them
- [ ] Summary output shows created/updated/unchanged/conflict counts
- [ ] Commerce fields in platform are never modified (ownership boundary respected)
- [ ] Exit code reflects sync outcome (0 = success, non-zero = conflicts)

## Assumptions

1. Lesson discovery (F-2) provides a list of lesson file paths and their slugs
2. Frontmatter validation (F-3) has already run before sync executes
3. The platform directory path is configured in `coursekit.json`
4. Source repo path is the current working directory or configured in `coursekit.json`
5. File content comparison uses SHA-256 hashing

## Dependencies

- **F-2 (Lesson file discovery):** Provides the list of lessons to sync
- **F-3 (Frontmatter validation):** Ensures lessons are valid before copying

## Out of Scope

- Syncing guides or assets (covered by separate features)
- Modifying or merging frontmatter fields
- Two-way sync (platform to source)
- Git integration (committing synced files)
