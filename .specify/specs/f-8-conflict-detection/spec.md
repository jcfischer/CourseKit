# Specification: Conflict Detection

## Overview

Detect when the deployment platform contains local changes to files that were previously synced from a source repository. When `coursekit push` would overwrite locally-modified platform files, warn the user and require explicit confirmation (`--force`) before proceeding. This protects against silent data loss when someone edits lesson files directly in the platform between syncs.

## User Scenarios

### Scenario 1: Push detects locally modified platform files

- **Given** lessons were previously synced from source to platform
- **And** a platform file was manually edited after the last sync
- **When** the user runs `coursekit push`
- **Then** the command warns about each conflicting file with a diff summary
- **And** the push is aborted with exit code 1
- **And** the user is told to use `--force` to overwrite

### Scenario 2: Force push overwrites conflicts

- **Given** the platform has local changes to synced files
- **When** the user runs `coursekit push --force`
- **Then** the conflicting platform files are overwritten with source versions
- **And** the sync state is updated to reflect the new baseline

### Scenario 3: Dry-run shows conflicts without modifying anything

- **Given** the platform has local changes to synced files
- **When** the user runs `coursekit push --dry-run`
- **Then** conflicts are listed with file paths and change summaries
- **And** no files are modified

### Scenario 4: No conflicts detected

- **Given** no platform files were modified since the last sync
- **When** the user runs `coursekit push`
- **Then** the sync proceeds normally without warnings

### Scenario 5: Status command shows conflict state

- **Given** the platform has local changes to synced files
- **When** the user runs `coursekit status`
- **Then** conflicting files are listed with "modified on platform" indicators

### Scenario 6: First sync has no baseline for comparison

- **Given** a file exists in the platform but has never been synced
- **When** the user runs `coursekit push`
- **Then** the file is treated as a conflict (platform has unknown local content)
- **And** the user is warned and asked to use `--force` for initial overwrite

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Store a content hash for each synced file at push time in sync state | High |
| FR-2 | On push, compute current hash of each platform target file and compare to stored hash | High |
| FR-3 | If hashes differ, the file is a conflict: display file path and summary of changes | High |
| FR-4 | Abort push with non-zero exit code when any conflicts exist (without `--force`) | High |
| FR-5 | `--force` flag bypasses conflict check and overwrites all target files | High |
| FR-6 | `--dry-run` reports conflicts without writing any files | High |
| FR-7 | `coursekit status` includes conflict detection in its output | Medium |
| FR-8 | Conflict detection applies only to synced content files (lessons, guides, assets), never to commerce-owned files | High |
| FR-9 | When a platform target file exists but has no sync state entry, treat as conflict | Medium |
| FR-10 | Conflict output shows file path relative to platform root and a brief change indicator (e.g., "modified", "deleted", "new on platform") | Medium |

## Non-Functional Requirements

- **Performance:** Conflict detection must complete in under 2 seconds for up to 100 files
- **Reliability:** Hash comparison must use a deterministic algorithm (e.g., SHA-256 of file content)
- **Transparency:** Conflict warnings must be clear enough that a user can decide whether `--force` is safe without inspecting files manually
- **Atomicity:** If conflict detection itself fails (e.g., platform directory unreadable), the push must abort with a clear error rather than proceeding silently

## Sync State Requirements

Conflict detection depends on persisted sync state. Each sync record must include:

| Field | Purpose |
|-------|---------|
| `filePath` | Relative path of the synced file in the platform |
| `contentHash` | Hash of file content at time of last successful sync |
| `syncedAt` | Timestamp of last successful sync |
| `sourceRepo` | Which source repository the file came from |

[TO BE CLARIFIED]: Where sync state is stored—options include a `.coursekit-sync.json` in the platform directory, a SQLite database, or entries in `coursekit.json`. This depends on decisions made in the sync state tracking feature.

## Assumptions

- A sync state mechanism exists or will be implemented alongside this feature to record what was last synced and when
- Content hashing operates on file content only (not metadata like timestamps)
- Commerce-owned files (course pricing, LemonSqueezy IDs) are excluded from conflict detection by design since they are never synced

## Success Criteria

- [ ] `coursekit push` detects and warns about all locally-modified platform files
- [ ] Push aborts on conflicts unless `--force` is used
- [ ] `--dry-run` correctly reports conflicts without side effects
- [ ] `coursekit status` shows conflict state
- [ ] Commerce-owned fields are never flagged as conflicts
- [ ] Conflict detection completes in <2 seconds for typical course sizes
