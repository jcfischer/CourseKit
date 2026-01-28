# Implementation Tasks: Asset File Discovery (F-5)

## Progress Tracking

| Task | Status | Notes |
|------|--------|-------|
| T-1.1 | ☐ | |
| T-1.2 | ☐ | |
| T-1.3 | ☐ | |
| T-2.1 | ☐ | |
| T-2.2 | ☐ | |
| T-3.1 | ☐ | |
| T-3.2 | ☐ | |
| T-4.1 | ☐ | |
| T-4.2 | ☐ | |

## Overview

This breakdown implements asset file discovery per F-5 specification. Assets are non-markdown supporting files (images, PDFs, diagrams, videos) located in `materials/**/assets/**` directories. Discovery produces a manifest with paths, MIME types, and sizes without reading file contents.

Key architectural decisions:
- Extension-based MIME detection (no content sniffing)
- Metadata-only operations (stat, not read)
- Glob-based recursive scanning
- Deterministic alphabetical ordering

## Group 1: Foundation (Utilities)

### T-1.1: Define data model and types [T]
- **File:** `src/types.ts` (append to existing)
- **Test:** N/A (types only)
- **Dependencies:** None
- **Description:** Add TypeScript interfaces for `DiscoveredAsset`, `AssetManifest`, `AssetDiscoveryOptions`, `AssetDiscoveryWarning`, and `AssetDiscoveryWarningCode` type. See Technical Plan "Data Model" section for complete definitions.
- **Spec mapping:** FR-2 (structured manifest), FR-7 (discovery summary)
- **Deliverables:**
  - `DiscoveredAsset` interface (path, relativePath, size, mimeType, extension)
  - `AssetManifest` interface (assets array, totalSize, warnings, metadata)
  - `AssetDiscoveryOptions` interface (subdirectory, mimeTypes filters)
  - `AssetDiscoveryWarning` interface + `AssetDiscoveryWarningCode` type
  - `AssetDiscoveryError` class extending Error

### T-1.2: Create MIME type detection utility [T]
- **File:** `src/lib/asset-discovery-utils.ts`
- **Test:** `src/lib/asset-discovery-utils.test.ts`
- **Dependencies:** T-1.1
- **Description:** Implement `MIME_TYPE_MAP` constant (30+ extensions from Technical Plan) and `detectMimeType(filename)` function with fallback to `application/octet-stream`. Case-insensitive extension matching.
- **Spec mapping:** FR-2 (MIME type in manifest)
- **Deliverables:**
  - `MIME_TYPE_MAP` covering images, documents, videos, audio, archives, data, code
  - `detectMimeType()` with `.toLowerCase()` normalization
- **Test cases:**
  - Known image: `.png` → `image/png`
  - Known document: `.pdf` → `application/pdf`
  - Unknown extension: `.xyz` → `application/octet-stream`
  - Case insensitive: `.PNG` → `image/png`
  - Multi-extension: `archive.tar.gz` → uses final `.gz`

### T-1.3: Create file stat utility [T] [P with T-1.2]
- **File:** `src/lib/asset-discovery-utils.ts` (same file as T-1.2)
- **Test:** `src/lib/asset-discovery-utils.test.ts` (same file as T-1.2)
- **Dependencies:** T-1.1
- **Description:** Implement `getFileSize(absolutePath)` wrapping `fs.statSync()` to return file size in bytes. Throw clear error if file is inaccessible.
- **Spec mapping:** FR-2 (file size in manifest), NFR (metadata-only, no content reading)
- **Deliverables:**
  - `getFileSize()` using `fs.statSync(path).size`
  - Error handling for ENOENT, EACCES
- **Test cases:**
  - Read size of test fixture file
  - Handle non-existent file (throws)
  - Handle permission denied (throws)

## Group 2: Core Discovery Logic

### T-2.1: Implement asset file scanning [T]
- **File:** `src/lib/asset-discovery-utils.ts` (extend existing)
- **Test:** `src/lib/asset-discovery-utils.test.ts` (extend existing)
- **Dependencies:** T-1.1
- **Description:** Implement `scanAssetFiles(materialsRoot, subdirectory?)` using Bun's `Glob` API with pattern `**/assets/**/*`. Filter out directories and dotfiles. Return sorted array of relative paths.
- **Spec mapping:** FR-1 (recursive scan), FR-4 (all file types), FR-5 (deterministic ordering)
- **Deliverables:**
  - `scanAssetFiles()` with glob pattern matching
  - Directory filtering (only files)
  - Dotfile filtering (exclude paths starting with `/.`)
  - Optional subdirectory filtering
  - Alphabetical sorting by relative path
- **Test cases:**
  - Flat structure: `materials/assets/diagram.png` (Scenario 1)
  - Nested: `materials/module-01/assets/screenshot.png` (Scenario 2)
  - Deep nesting: `materials/module-02/advanced/assets/architecture.svg`
  - Mixed file types: images, PDFs, videos, data (Scenario 6)
  - Empty assets directory returns empty array (Scenario 4)
  - No assets directories returns empty array (Scenario 5)
  - Subdirectory filter: only `module-01/assets/*`
  - Dotfiles excluded: `.DS_Store` not in results

### T-2.2: Implement main discovery function [T]
- **File:** `src/lib/asset-discovery.ts` (new file)
- **Test:** `src/lib/asset-discovery.test.ts` (new file)
- **Dependencies:** T-1.1, T-1.2, T-1.3, T-2.1
- **Description:** Implement `discoverAssets(config, options?)` orchestrating full discovery flow. Reads materials root from `config.platform.path + "/materials"`, scans asset files, stats each for size, detects MIME types, builds `DiscoveredAsset` objects, aggregates warnings, returns sorted `AssetManifest`.
- **Spec mapping:** All functional requirements (FR-1 through FR-7), all NFRs
- **Deliverables:**
  - `discoverAssets()` function with full orchestration
  - Materials root resolution from config (FR-3)
  - Per-file metadata collection (path, size, MIME type)
  - Warning aggregation for stat errors
  - Total size calculation (FR-7)
  - Deterministic sorting (FR-5)
  - MIME type filtering (if `options.mimeTypes` provided)
  - Course filtering (if `options.subdirectory` provided) (FR-6)
- **Test cases:**
  - Single asset file (Scenario 1)
  - Multiple nested assets (Scenario 2)
  - Empty assets directory (Scenario 4)
  - Missing materials directory (warning, empty result)
  - Various file types (Scenario 6)
  - Large file metadata (500MB) - stat only, no read (Scenario 7)
  - Deterministic ordering verified
  - Total size calculation verified
  - MIME type filtering works
  - Subdirectory filtering works
  - Warning collection for permission errors

## Group 3: Test Infrastructure

### T-3.1: Create test fixtures for asset discovery [P with T-2.2]
- **Files:**
  - `test-fixtures/assets/flat-structure/`
  - `test-fixtures/assets/nested-structure/`
  - `test-fixtures/assets/empty-assets/`
  - `test-fixtures/assets/no-assets/`
  - `test-fixtures/assets/mixed-types/`
- **Test:** N/A (fixtures for other tests)
- **Dependencies:** None (can run in parallel with T-2.2)
- **Description:** Create realistic test fixture directories with actual asset files (small PNGs, PDFs, SVGs) matching the structures described in Technical Plan "File Structure" section. Each fixture includes a `coursekit.json` pointing to its materials directory.
- **Spec mapping:** All scenarios (1-7)
- **Deliverables:**
  - Flat structure: `materials/assets/diagram.png` (1KB), `cheatsheet.pdf` (2KB)
  - Nested structure: `materials/module-01/assets/screenshot.png`, `module-02/advanced/assets/architecture.svg`
  - Empty assets: `materials/assets/` (empty directory)
  - No assets: `materials/` with only markdown files
  - Mixed types: `materials/assets/` with `.jpg`, `.svg`, `.pdf`, `.mp4`, `.csv`

### T-3.2: Create integration tests [T]
- **File:** `src/lib/asset-discovery.test.ts` (extend from T-2.2)
- **Test:** Same file
- **Dependencies:** T-2.2, T-3.1
- **Description:** Add end-to-end integration tests using real test fixtures from T-3.1. Verify full discovery flow from config loading through manifest generation.
- **Spec mapping:** All success criteria
- **Deliverables:**
  - Integration test: flat structure fixture
  - Integration test: nested structure fixture
  - Integration test: empty assets fixture
  - Integration test: no assets fixture
  - Integration test: mixed types fixture
  - Performance test: 500 files < 500ms (create fixture on demand)
- **Test cases:**
  - Load config, discover assets, verify manifest structure
  - Verify all expected files present in results
  - Verify MIME types correct
  - Verify file sizes correct
  - Verify total size calculation
  - Verify deterministic ordering across runs
  - Verify warnings for missing directories

## Group 4: Integration and Documentation

### T-4.1: Export public API
- **File:** `src/lib/asset-discovery.ts` (update exports)
- **Test:** N/A (covered by existing tests)
- **Dependencies:** T-2.2
- **Description:** Ensure clean public API exports from `asset-discovery.ts`: `discoverAssets()`, `AssetDiscoveryError`. Utilities remain internal to `asset-discovery-utils.ts`.
- **Deliverables:**
  - Export `discoverAssets` function
  - Export `AssetDiscoveryError` class
  - JSDoc comments on public API (already in T-2.2)

### T-4.2: Update type exports
- **File:** `src/types.ts`
- **Test:** N/A
- **Dependencies:** T-1.1
- **Description:** Ensure all new types (`DiscoveredAsset`, `AssetManifest`, `AssetDiscoveryOptions`, `AssetDiscoveryWarning`, `AssetDiscoveryWarningCode`) are exported for external use by future commands.
- **Deliverables:**
  - Export all asset discovery types from `src/types.ts`
  - Verify no circular dependencies

## Execution Order

### Phase 1: Foundation (can parallelize within phase)
1. **T-1.1** (types) - No dependencies
2. **T-1.2** (MIME detection) and **T-1.3** (file stat) - Can run in parallel after T-1.1

### Phase 2: Core Logic (sequential after Phase 1)
3. **T-2.1** (file scanning) - After T-1.1
4. **T-2.2** (main discovery) - After T-1.2, T-1.3, T-2.1

### Phase 3: Testing (can parallelize with Phase 2 end)
5. **T-3.1** (test fixtures) - Can run in parallel with T-2.2
6. **T-3.2** (integration tests) - After T-2.2 and T-3.1

### Phase 4: Integration (after all testing passes)
7. **T-4.1** (export API) - After T-2.2
8. **T-4.2** (export types) - After T-1.1

### Parallelization Opportunities
- **Group 1:** T-1.2 and T-1.3 can run simultaneously
- **Between groups:** T-3.1 can start while T-2.2 is in progress
- **Total critical path:** T-1.1 → T-1.2 → T-2.1 → T-2.2 → T-3.2 → T-4.1

## Risk Mitigation per Task

| Task | Risk | Mitigation |
|------|------|------------|
| T-1.2 | Incomplete MIME map | Use comprehensive map from plan (30+ types), fallback to `application/octet-stream` |
| T-2.1 | Symlink loops | Bun's Glob doesn't follow symlinks by default; add warning code if needed |
| T-2.2 | Stat errors on permission denied | Catch and add to warnings, don't fail entire discovery |
| T-3.1 | Large fixture files bloat repo | Use small test files (<5KB each), generate large file test on-demand in T-3.2 |

## Success Criteria Verification

| Spec Criterion | Verified By |
|----------------|-------------|
| Discovers files within `materials/**/assets/**` | T-2.1 tests (nested-structure fixture) |
| Handles arbitrary nesting depth | T-2.1 tests (deep nesting case) |
| Includes files of any extension | T-2.1 tests (mixed-types fixture) |
| Returns empty for missing assets directories | T-2.2 tests (no-assets fixture) |
| Ignores files outside `assets/` directories | T-2.1 tests (no-assets fixture) |
| Reads materials root from config | T-2.2 tests (integration test with config) |
| Results ordered deterministically | T-2.2 tests (ordering verification) |
| Manifest includes size and MIME type | T-2.2 tests (metadata verification) |

## File Tree After Implementation

```
src/
├── types.ts                          # UPDATED: Add asset types (T-1.1, T-4.2)
├── lib/
│   ├── asset-discovery-utils.ts      # NEW: MIME, stat, scan utilities (T-1.2, T-1.3, T-2.1)
│   ├── asset-discovery-utils.test.ts # NEW: Unit tests for utilities (T-1.2, T-1.3, T-2.1)
│   ├── asset-discovery.ts            # NEW: Main discovery function (T-2.2, T-4.1)
│   └── asset-discovery.test.ts       # NEW: Integration tests (T-2.2, T-3.2)
test-fixtures/assets/                 # NEW: Test fixtures (T-3.1)
├── flat-structure/
│   └── materials/assets/
├── nested-structure/
│   └── materials/
│       ├── module-01/assets/
│       └── module-02/advanced/assets/
├── empty-assets/
│   └── materials/assets/
├── no-assets/
│   └── materials/
└── mixed-types/
    └── materials/assets/
```

## Notes

- **No new dependencies required** - Uses only `node:fs`, `node:path`, and Bun's native Glob
- **Metadata-only operations** - Never reads file contents (performance critical)
- **Deterministic output** - Alphabetical sorting ensures consistent results across runs
- **Graceful degradation** - Missing directories produce empty results with warnings, not errors
- **Extension-based MIME detection** - Fast, deterministic, covers 99% of real-world cases
- **Future integration points** - F-7 (diff), F-8 (upload), F-13 (status), F-14 (push) will consume this API
