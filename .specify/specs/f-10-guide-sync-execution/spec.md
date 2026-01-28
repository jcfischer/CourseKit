# Specification: Guide Sync Execution

## Overview

Copy guide files from a source repository to the platform's `src/content/guides/{slug}/` directory as part of the one-way sync pipeline. Guide sync follows the same ownership model as lesson sync: source repos own guide content, the platform owns commerce and enrollment data. This feature enables `coursekit push` to include guides alongside lessons.

## User Scenarios

### Scenario 1: Push guides from source to platform

- **Given** a source repo with guide files under a configured guides directory
- **When** the user runs `coursekit push`
- **Then** each guide is copied to `src/content/guides/{slug}/` in the platform directory
- **And** existing platform-owned fields in guide frontmatter are preserved

### Scenario 2: Dry-run preview of guide sync

- **Given** a source repo with new or modified guides
- **When** the user runs `coursekit push --dry-run`
- **Then** the CLI lists which guide files would be created, updated, or left unchanged
- **And** no files are written to disk

### Scenario 3: Conflict detection on modified platform guides

- **Given** a guide file in the platform that was manually edited after last sync
- **When** the user runs `coursekit push`
- **Then** the CLI warns about the conflict and skips that guide
- **And** the user can override with `--force`

### Scenario 4: Guide removed from source

- **Given** a guide that previously existed in source but has been deleted
- **When** the user runs `coursekit push`
- **Then** the CLI warns that the guide exists in platform but not in source
- **And** does NOT delete the platform copy (non-destructive default)

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Copy guide markdown files from source guides directory to platform `src/content/guides/{slug}/` | High |
| FR-2 | Derive `{slug}` from guide filename or frontmatter slug field | High |
| FR-3 | Preserve platform-owned frontmatter fields during sync (do not overwrite) | High |
| FR-4 | Support `--dry-run` flag showing planned file operations without writing | High |
| FR-5 | Detect conflicts when platform guide was modified after last sync | High |
| FR-6 | Support `--force` flag to overwrite conflicting files | Medium |
| FR-7 | Report sync summary: created, updated, unchanged, skipped (conflict) counts | Medium |
| FR-8 | Support guide asset files (images) co-located with guide markdown | Medium |
| FR-9 | Validate guide frontmatter schema before copying | Medium |

## Non-Functional Requirements

- **Performance:** Guide sync completes in <2 seconds for up to 50 guides
- **Idempotency:** Running sync twice with no source changes produces no file modifications
- **Atomicity:** [TO BE CLARIFIED] Whether guide sync should be all-or-nothing or per-file
- **Logging:** Each file operation logged at debug level for troubleshooting

## Configuration

Guide source directory and platform target are defined in `coursekit.json`:

- `guides.sourcePath` - relative path to guides in source repo
- Platform target is always `src/content/guides/{slug}/`
- [TO BE CLARIFIED] Whether guides support multiple source repos like lessons

## Success Criteria

- [ ] `coursekit push` copies guide files to correct platform directory structure
- [ ] Platform-owned frontmatter fields are never overwritten by sync
- [ ] `--dry-run` accurately previews all guide sync operations
- [ ] Conflicts are detected and reported; `--force` overrides them
- [ ] Sync is idempotent - unchanged guides produce no file writes
- [ ] Guide assets (images) are synced alongside markdown

## Assumptions

- Guide files follow the same markdown + frontmatter format as lessons
- Each guide has a unique slug derivable from filename or frontmatter
- Platform directory `src/content/guides/` already exists or will be created
- Guide sync runs as part of the same `coursekit push` command as lesson sync

## Open Questions

- [TO BE CLARIFIED] What platform-owned fields exist for guides (equivalent to price/lemonSqueezyProductId for courses)?
- [TO BE CLARIFIED] Should guide sync be atomic (all-or-nothing) or per-file?
- [TO BE CLARIFIED] Can multiple source repos contribute guides, or is it single-source?
