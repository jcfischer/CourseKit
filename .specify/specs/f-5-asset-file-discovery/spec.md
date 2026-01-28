# Specification: Asset File Discovery

## Overview

Discover asset files (images, PDFs, diagrams, videos, etc.) within source repository directories following the `materials/**/assets/**` glob pattern. Assets are non-markdown supporting files used by lessons and guides — diagrams, screenshots, downloadable resources. Discovery produces a manifest of asset files with their paths, file types, and sizes, enabling `coursekit push` to sync them to the platform.

## User Scenarios

### Scenario 1: Discover assets in a flat assets directory

- **Given** a source repo with `materials/assets/diagram.png` and `materials/assets/cheatsheet.pdf`
- **When** CourseKit discovers asset files
- **Then** it returns both files with their paths, MIME types, and file sizes

### Scenario 2: Discover assets in nested module directories

- **Given** a source repo with `materials/module-01/assets/screenshot.png` and `materials/module-02/advanced/assets/architecture.svg`
- **When** CourseKit discovers asset files
- **Then** it returns both files regardless of nesting depth

### Scenario 3: Ignore non-asset files outside assets directories

- **Given** a materials directory containing `lesson-01.md`, `guide-setup.md`, and `assets/diagram.png`
- **When** CourseKit discovers asset files
- **Then** only `assets/diagram.png` is included in results

### Scenario 4: Handle empty assets directory

- **Given** a source repo with an empty `materials/module-01/assets/` directory
- **When** CourseKit discovers asset files
- **Then** it returns an empty result with no error

### Scenario 5: Handle missing assets directories

- **Given** a source repo with `materials/` containing only markdown files and no `assets/` subdirectories
- **When** CourseKit discovers asset files
- **Then** it returns an empty result with no error or warning

### Scenario 6: Discover assets of various file types

- **Given** an assets directory containing `photo.jpg`, `diagram.svg`, `notes.pdf`, `demo.mp4`, and `data.csv`
- **When** CourseKit discovers asset files
- **Then** all files are included regardless of extension

### Scenario 7: Handle large asset files

- **Given** an assets directory containing a 500MB video file
- **When** CourseKit discovers asset files
- **Then** the file is included in the manifest with its size reported (discovery does not read file contents)

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Scan `materials/` recursively for files inside `assets/` directories | High |
| FR-2 | Return structured manifest: file path, relative path within materials, file size, MIME type | High |
| FR-3 | Resolve materials root from `coursekit.json` configuration | High |
| FR-4 | Include all files within `assets/` directories regardless of extension | High |
| FR-5 | Produce deterministic ordering of results (alphabetical by relative path) | Medium |
| FR-6 | Support discovering assets for a single course or all courses | Medium |
| FR-7 | Report total asset count and cumulative size in discovery summary | Low |

## Non-Functional Requirements

- **Performance:** Discovery of 500 asset files across nested directories completes in under 500ms (metadata only, no content reading)
- **Determinism:** Same directory state always produces the same discovery result with consistent ordering
- **Robustness:** Filesystem errors (permission denied, broken symlinks) produce clear errors, not crashes
- **Efficiency:** Discovery reads only filesystem metadata (stat), never file contents

## Success Criteria

- [ ] Discovers all files within `materials/**/assets/**` directories
- [ ] Correctly handles arbitrary nesting depth within materials
- [ ] Includes files of any extension (not filtered by type)
- [ ] Returns empty results (not errors) for missing or empty assets directories
- [ ] Ignores files outside `assets/` directories
- [ ] Reads materials root from `coursekit.json`
- [ ] Results are ordered deterministically
- [ ] Manifest includes file size and MIME type for each asset

## Assumptions

- Asset directories follow `assets/` naming convention within materials tree
- Materials root is defined in `coursekit.json` (as established by F-1 configuration spec)
- Discovery is metadata-only — file contents are never read during discovery
- [TO BE CLARIFIED] Whether hidden files (dotfiles) within assets directories should be included or excluded
- [TO BE CLARIFIED] Whether symlinks within assets directories should be followed or skipped
- [TO BE CLARIFIED] Whether there is a maximum file size threshold that should trigger a warning
