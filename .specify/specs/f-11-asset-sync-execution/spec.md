# Specification: Asset Sync Execution

## Overview

Copy discovered asset files from a source repository to the platform's `public/courses/{slug}/` directory as part of the `coursekit push` command. This is the file-transfer operation for non-markdown supporting files (images, PDFs, diagrams, videos). It reads the asset manifest from F-5 (asset file discovery) and writes files to the correct public directory, preserving relative structure within each course's assets folder.

## User Scenarios

### Scenario 1: Clean sync of all assets

- **Given** a source repo with 15 asset files across 3 modules and a platform with no existing assets
- **When** the user runs `coursekit push`
- **Then** all 15 assets are copied to `public/courses/{slug}/` in the platform directory
- **And** directory structure within each course's assets is preserved
- **And** a summary is printed showing 15 files copied, 0 skipped, 0 conflicts

### Scenario 2: Incremental sync with unchanged assets

- **Given** a platform already containing 10 synced assets identical to source
- **When** the user runs `coursekit push` after replacing 2 images in source
- **Then** only the 2 changed assets are overwritten in the platform
- **And** the 8 unchanged assets are not touched
- **And** the summary shows 2 updated, 8 unchanged

### Scenario 3: Dry-run preview

- **Given** a source repo with assets ready to sync
- **When** the user runs `coursekit push --dry-run`
- **Then** no asset files are written to the platform
- **And** output shows exactly which assets would be created, updated, or skipped

### Scenario 4: Conflict detection for assets

- **Given** an asset file in the platform that has been manually replaced since last sync
- **When** the user runs `coursekit push`
- **Then** the conflicting asset is skipped with a warning
- **And** the user is told to use `--force` to overwrite

### Scenario 5: Force overwrite

- **Given** an asset file in the platform with local modifications
- **When** the user runs `coursekit push --force`
- **Then** the platform asset is overwritten with the source version
- **And** a warning is printed noting the overwrite

### Scenario 6: Missing platform public directory

- **Given** the platform's `public/courses/{slug}/` directory does not exist
- **When** the user runs `coursekit push`
- **Then** the directory structure is created automatically
- **And** assets are copied normally

### Scenario 7: Large asset files

- **Given** a source repo with a 200MB video file in assets
- **When** sync executes for this asset
- **Then** the file is copied via streaming (not buffered entirely in memory)
- **And** progress is reported for files exceeding a size threshold

### Scenario 8: Orphaned assets in platform

- **Given** a platform directory containing an asset `old-diagram.png` that no longer exists in source
- **When** the user runs `coursekit push`
- **Then** the orphaned asset is not deleted (sync is additive-only by default)
- **And** `coursekit status` reports the orphaned file separately

### Scenario 9: Nested asset directory structure

- **Given** a source with `materials/module-01/assets/images/hero.png` and `materials/module-01/assets/downloads/cheatsheet.pdf`
- **When** sync executes
- **Then** the nested structure is preserved: `public/courses/{slug}/images/hero.png` and `public/courses/{slug}/downloads/cheatsheet.pdf`

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Copy asset files from source to platform `public/courses/{slug}/` | High |
| FR-2 | Preserve relative directory structure from within each `assets/` directory | High |
| FR-3 | Detect unchanged files by content hash and skip them during sync | High |
| FR-4 | Support `--dry-run` flag that previews asset changes without writing | High |
| FR-5 | Support `--force` flag that overwrites conflicting asset files | High |
| FR-6 | Detect conflicts where platform assets differ from last-synced version | High |
| FR-7 | Create target directories if they do not exist | Medium |
| FR-8 | Include asset sync results in the push summary (created, updated, unchanged, conflicts) | High |
| FR-9 | Never write asset files outside `public/courses/` during asset sync | High |
| FR-10 | Stream large files instead of buffering entirely in memory | Medium |
| FR-11 | Derive course slug from configuration or source directory structure | High |
| FR-12 | Update the sync manifest (`.coursekit/sync-manifest.json`) with asset hashes after sync | High |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Sync of 100 asset files (total 500MB) completes in under 30 seconds on local filesystem |
| NFR-2 | File operations are atomic per-asset: an asset is either fully synced or not at all |
| NFR-3 | No external network calls required (local filesystem only) |
| NFR-4 | Memory usage stays bounded regardless of individual asset file size (streaming copy) |
| NFR-5 | Output is human-readable and suitable for CI logs |

## Path Mapping

Assets discovered by F-5 follow this mapping from source to platform:

```
Source:   materials/{module}/assets/{relative-path}
Platform: public/courses/{slug}/{relative-path}
```

The `{slug}` is the course slug. The `{relative-path}` preserves everything beneath the `assets/` directory.

[TO BE CLARIFIED] Whether assets from different modules should be merged into a single flat `public/courses/{slug}/` directory or maintain module-level separation (e.g., `public/courses/{slug}/module-01/`).

## Conflict Detection Strategy

Asset conflicts use the same sync manifest as lesson sync (F-9):

1. Source asset hash vs. manifest hash (source changed?)
2. Platform asset hash vs. manifest hash (platform changed?)
3. If both changed, it's a conflict.

Asset hashes use SHA-256 of file contents.

[TO BE CLARIFIED] Whether binary-identical detection should use file size + mtime as a fast-path before computing content hash.

## Success Criteria

- [ ] `coursekit push` copies all discovered assets from source to platform public directory
- [ ] Unchanged assets are detected and skipped (no unnecessary writes)
- [ ] `--dry-run` shows asset changes without modifying the filesystem
- [ ] Conflicts are detected and reported; `--force` overrides them
- [ ] Summary output includes asset-specific counts (created/updated/unchanged/conflicts)
- [ ] Target path never escapes `public/courses/` (path traversal prevention)
- [ ] Large files are streamed without excessive memory usage
- [ ] Sync manifest is updated after successful asset sync

## Assumptions

1. Asset discovery (F-5) provides a manifest of asset file paths, sizes, and MIME types
2. The platform directory path is configured in `coursekit.json`
3. The sync manifest (`.coursekit/sync-manifest.json`) is shared between lesson and asset sync
4. Asset sync runs as part of the same `coursekit push` invocation as lesson sync
5. File content comparison uses SHA-256 hashing

## Dependencies

- **F-5 (Asset file discovery):** Provides the list of assets to sync
- **F-1 (Configuration loading):** Provides platform path and course slug
- **F-8 (Conflict detection):** Provides conflict detection logic (shared with lesson sync)

## Out of Scope

- Syncing lessons or guides (covered by F-9 and F-10)
- Image optimization or resizing during sync
- CDN upload or external storage integration
- Deleting orphaned assets from platform (additive-only sync)
- Asset validation (checking that referenced assets exist in markdown)
