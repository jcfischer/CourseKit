# Technical Plan: Asset File Discovery (F-5)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLI Layer                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                                  │
│  │   sync   │  │   push   │  │  status  │  (future consumers of discovery) │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                                  │
│       │             │             │                                         │
└───────┼─────────────┼─────────────┼─────────────────────────────────────────┘
        │             │             │
        └─────────────┼─────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Asset Discovery Service                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     discoverAssets()                                │   │
│  │  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐          │   │
│  │  │ scanAssets   │─>│ detectMIME    │─>│ statFile        │          │   │
│  │  │ (glob-based) │  │ (extension)   │  │ (size)          │          │   │
│  │  └──────────────┘  └───────────────┘  └─────────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    AssetManifest                                    │   │
│  │  { assets: DiscoveredAsset[], totalSize: number, warnings: [] }    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Config Layer (F-1)                               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  loadConfig() → { platform: { path: "/abs/path" }, ... }            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Filesystem                                        │
│  materials/                                                                  │
│  ├── assets/                  (flat structure)                              │
│  │   ├── diagram.png                                                        │
│  │   └── cheatsheet.pdf                                                     │
│  ├── module-01/                                                             │
│  │   └── assets/             (nested structure)                            │
│  │       ├── screenshot.png                                                 │
│  │       └── notes.pdf                                                      │
│  └── module-02/advanced/                                                    │
│      └── assets/             (deep nesting)                                 │
│          └── architecture.svg                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Bun | Project standard, fast FS operations, native glob support |
| Filesystem | `node:fs` | Sync operations sufficient for metadata-only reads |
| Path handling | `node:path` | Platform-agnostic path resolution |
| Glob pattern | `**` recursive | Matches `materials/**/assets/**` as per spec |
| MIME detection | Extension mapping | No file reading needed (fast, sufficient for most cases) |
| Testing | Bun test | Native, consistent with F-2/F-4 patterns |

**Note on MIME detection:** Using extension-based mapping (`.png` → `image/png`) rather than content sniffing. This is metadata-only (no file reading), deterministic, and covers 99% of real-world cases. Edge cases (wrong extension) are user errors, not discovery failures.

## Data Model

### Core Types

```typescript
// src/types.ts additions

/**
 * A discovered asset file with metadata.
 * Assets are non-markdown supporting files (images, PDFs, videos, etc.)
 * located in materials/**/assets/** directories.
 */
export interface DiscoveredAsset {
  /** Absolute path to the asset file */
  path: string;
  /** Path relative to materials root (e.g., "module-01/assets/diagram.png") */
  relativePath: string;
  /** File size in bytes */
  size: number;
  /** MIME type derived from extension (e.g., "image/png") */
  mimeType: string;
  /** File extension (e.g., ".png") */
  extension: string;
}

/** Warning codes for asset discovery issues */
export type AssetDiscoveryWarningCode =
  | "MISSING_MATERIALS_DIR"    // materials/ doesn't exist
  | "EMPTY_ASSETS_DIRS"         // No assets/ directories found
  | "STAT_ERROR"                // Failed to read file metadata
  | "UNKNOWN_MIME_TYPE"         // Extension not in MIME map (still included)
  | "PERMISSION_DENIED"         // Cannot access file/directory
  | "BROKEN_SYMLINK";           // Symlink points to non-existent file

/** A warning from asset discovery (non-fatal) */
export interface AssetDiscoveryWarning {
  /** Warning type code */
  code: AssetDiscoveryWarningCode;
  /** Human-readable message */
  message: string;
  /** Absolute path if file-specific */
  filePath?: string;
  /** Relative path for display */
  relativePath?: string;
}

/** Result of asset discovery operation */
export interface AssetManifest {
  /** All discovered asset files, sorted alphabetically by relativePath */
  assets: DiscoveredAsset[];
  /** Total size of all assets in bytes */
  totalSize: number;
  /** Non-fatal issues encountered during discovery */
  warnings: AssetDiscoveryWarning[];
  /** Root directory that was scanned */
  materialsRoot: string;
  /** Timestamp of discovery operation */
  discoveredAt: Date;
}

/** Options for asset discovery */
export interface AssetDiscoveryOptions {
  /** Filter to assets in a specific subdirectory (e.g., "module-01") */
  subdirectory?: string;
  /** Filter to specific asset types (e.g., ["image/png", "application/pdf"]) */
  mimeTypes?: string[];
}
```

### MIME Type Mapping

```typescript
// src/lib/asset-discovery-utils.ts

/**
 * Extension to MIME type mapping.
 * Covers common asset types for educational content.
 */
export const MIME_TYPE_MAP: Record<string, string> = {
  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',

  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Videos
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',

  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',

  // Archives
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',

  // Data
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.xml': 'application/xml',

  // Code (for downloadable samples)
  '.js': 'text/javascript',
  '.ts': 'text/typescript',
  '.py': 'text/x-python',
  '.sh': 'application/x-sh',
};

/**
 * Detect MIME type from file extension.
 * Returns "application/octet-stream" for unknown extensions.
 */
export function detectMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME_TYPE_MAP[ext] || 'application/octet-stream';
}
```

## API Contracts

### Primary Function

```typescript
/**
 * Discover asset files in the materials directory.
 *
 * Scans materials/**/assets/** directories for non-markdown files,
 * returning metadata (path, size, MIME type) without reading file contents.
 *
 * @param config - Loaded CourseKit configuration (from F-1)
 * @param options - Discovery options (optional)
 * @returns Manifest of discovered assets with warnings
 * @throws DiscoveryError if materials root is inaccessible
 *
 * @example
 * const config = await loadConfig();
 * const manifest = await discoverAssets(config);
 * console.log(`Found ${manifest.assets.length} assets (${manifest.totalSize} bytes)`);
 *
 * @example Filter by subdirectory
 * const manifest = await discoverAssets(config, { subdirectory: 'module-01' });
 *
 * @example Filter by MIME type
 * const manifest = await discoverAssets(config, { mimeTypes: ['image/png', 'image/jpeg'] });
 */
export async function discoverAssets(
  config: CourseKitConfig,
  options?: AssetDiscoveryOptions
): Promise<AssetManifest>;
```

### Helper Functions

```typescript
/**
 * Scan materials directory for all files within assets/ subdirectories.
 * Returns relative paths (e.g., "module-01/assets/diagram.png").
 *
 * @param materialsRoot - Absolute path to materials directory
 * @param subdirectory - Optional subdirectory filter (e.g., "module-01")
 * @returns Array of relative paths, sorted alphabetically
 */
export async function scanAssetFiles(
  materialsRoot: string,
  subdirectory?: string
): Promise<string[]>;

/**
 * Get file metadata (size) without reading content.
 *
 * @param absolutePath - Path to file
 * @returns File size in bytes
 * @throws If file is inaccessible
 */
export function getFileSize(absolutePath: string): number;

/**
 * Detect MIME type from file extension.
 * Returns "application/octet-stream" for unknown types.
 */
export function detectMimeType(filename: string): string;
```

### Error Classes

```typescript
/**
 * Thrown when asset discovery cannot proceed due to inaccessible paths.
 * Mirrors DiscoveryError pattern from F-2.
 */
export class AssetDiscoveryError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'AssetDiscoveryError';
  }
}
```

## Implementation Phases

### Phase 1: Core Utilities (1 file)

**Goal:** Establish MIME detection and file stat utilities.

**Files:**
- Create `src/lib/asset-discovery-utils.ts` with `detectMimeType()` and `getFileSize()`

**Deliverables:**
- `MIME_TYPE_MAP` constant with 30+ common extensions
- `detectMimeType()` with fallback to `application/octet-stream`
- `getFileSize()` wrapping `fs.statSync()`
- Unit tests for MIME detection (known types, unknown types, case insensitivity)

**Test cases:**
- Known image: `.png` → `image/png`
- Known document: `.pdf` → `application/pdf`
- Unknown extension: `.xyz` → `application/octet-stream`
- Case insensitive: `.PNG` → `image/png`
- File size retrieval from test fixture

### Phase 2: File Scanning (same file)

**Goal:** Implement glob-based asset file scanning.

**Files:**
- Extend `src/lib/asset-discovery-utils.ts` with `scanAssetFiles()`

**Deliverables:**
- `scanAssetFiles()` using Bun's `Glob` API with pattern `**/assets/**/*`
- Filters out directories (only files)
- Filters out hidden files (starting with `.`)
- Optional subdirectory filtering
- Returns sorted array of relative paths

**Test cases:**
- Flat assets directory (`materials/assets/diagram.png`)
- Nested assets (`materials/module-01/assets/screenshot.png`)
- Deep nesting (`materials/module-02/advanced/assets/architecture.svg`)
- Mixed file types (images, PDFs, videos)
- Empty assets directories (returns empty array)
- Subdirectory filtering (only `module-01/assets/*`)

### Phase 3: Main Discovery Function (new file)

**Goal:** Implement the primary `discoverAssets()` function.

**Files:**
- Create `src/lib/asset-discovery.ts` with main function

**Deliverables:**
- `discoverAssets(config, options)` orchestrating the full flow
- Reads `config.platform.path + "/materials"` as materials root
- Scans for asset files using `scanAssetFiles()`
- For each file: stat for size, detect MIME type, build `DiscoveredAsset`
- Aggregates warnings for stat errors
- Returns sorted assets (by relativePath) with total size
- Handles missing materials directory gracefully (empty result with warning)

**Test cases:**
- Single asset file (Scenario 1)
- Multiple nested assets (Scenario 2)
- Empty assets directory (Scenario 4)
- Missing assets directories (Scenario 5)
- Various file types (Scenario 6)
- Large file (500MB) - metadata only, no content read (Scenario 7)
- Deterministic ordering (alphabetical by relativePath)
- MIME type filtering (options.mimeTypes)

### Phase 4: Integration and Testing

**Goal:** Export discovery for CLI use, validate performance.

**Files:**
- Update `src/types.ts` with new types
- Create `src/lib/asset-discovery.test.ts` with integration tests
- Create test fixtures in `test-fixtures/assets/`

**Deliverables:**
- Clean public API exported from `src/lib/asset-discovery.ts`
- Integration test using temp directories with real files
- Performance test: 500 asset files across nested directories < 500ms
- Total size calculation verified
- Warning collection verified

## File Structure

```
src/
├── index.ts                          # CLI entry (no changes yet)
├── config.ts                         # F-1 config loading (unchanged)
├── types.ts                          # ADD: DiscoveredAsset, AssetManifest, etc.
├── lib/
│   ├── database.ts                   # Existing DB operations (unchanged)
│   ├── discovery.ts                  # F-2 lesson discovery (unchanged)
│   ├── discovery-utils.ts            # F-2 utilities (unchanged)
│   ├── guide-discovery.ts            # F-4 guide discovery (unchanged)
│   ├── guide-discovery-utils.ts      # F-4 utilities (unchanged)
│   ├── asset-discovery-utils.ts      # NEW: MIME detection, file stat
│   ├── asset-discovery-utils.test.ts # NEW: Unit tests for utilities
│   ├── asset-discovery.ts            # NEW: Main discovery function
│   └── asset-discovery.test.ts       # NEW: Integration tests
└── commands/
    └── (future commands will import from lib/asset-discovery.ts)

test-fixtures/assets/                 # NEW: Test fixtures for assets
├── flat-structure/
│   └── materials/
│       └── assets/
│           ├── diagram.png           (1KB test image)
│           └── cheatsheet.pdf        (2KB test PDF)
├── nested-structure/
│   └── materials/
│       ├── module-01/
│       │   └── assets/
│       │       └── screenshot.png
│       └── module-02/advanced/
│           └── assets/
│               └── architecture.svg
├── empty-assets/
│   └── materials/
│       └── assets/                   (empty directory)
├── no-assets/
│   └── materials/
│       ├── lesson-01.md
│       └── guide-setup.md            (no assets/ directories)
└── mixed-types/
    └── materials/
        └── assets/
            ├── photo.jpg
            ├── diagram.svg
            ├── notes.pdf
            ├── demo.mp4
            └── data.csv
```

## Dependencies

### No New Packages Required

**Existing dependencies used:**
- `node:fs` - File stat operations (`statSync`)
- `node:path` - Path manipulation (`join`, `extname`, `relative`)
- `bun` - Native glob support via `Glob` API

**Note:** Unlike F-2 (YAML parsing) and F-4 (YAML parsing), asset discovery requires no new dependencies. MIME detection is simple extension mapping, and file size comes from stat (no content reading).

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Unknown MIME types not mapped | Low | Medium | Fallback to `application/octet-stream`, add warning if needed |
| Symlink loops in materials directory | High | Very Low | Use glob (doesn't follow symlinks by default), add symlink warning code |
| Very large files (>1GB) slow stat calls | Low | Very Low | Stat is metadata-only (fast), no content reading |
| Permission denied on asset files | Medium | Low | Catch stat errors, add warning with `PERMISSION_DENIED` code |
| Non-UTF8 filenames cause path issues | Low | Very Low | Bun handles binary filenames gracefully |
| Broken symlinks cause stat errors | Medium | Low | Catch and warn with `BROKEN_SYMLINK` code |
| Concurrent discovery calls | Low | Very Low | Discovery is read-only; no shared state |

### Edge Cases to Handle

1. **Dotfiles in assets directories** (e.g., `.DS_Store`) - Filter out (starts with `.`)
2. **Directories named `assets`** - Only include files, not directories
3. **Files with no extension** - MIME type falls back to `application/octet-stream`
4. **Multiple extensions** (e.g., `archive.tar.gz`) - Use final extension (`.gz`)
5. **Case sensitivity in extensions** - Normalize to lowercase before lookup
6. **Empty assets directories** - Return empty array, no warning (valid state)
7. **Assets at different nesting levels** - All included, sorted by full relative path
8. **Files with spaces in names** - Handled by glob/path libraries
9. **Very long paths (>255 chars)** - Filesystem's problem, not discovery's

## Success Criteria Mapping

| Spec Criterion | Implementation | Test |
|----------------|----------------|------|
| Discovers files within `materials/**/assets/**` | `scanAssetFiles()` with `**/assets/**/*` glob | nested-structure fixture |
| Handles arbitrary nesting depth | Recursive `**` glob pattern | deep nesting test case |
| Includes files of any extension | No extension filtering in scan | mixed-types fixture |
| Returns empty for missing assets directories | Check for empty results, add warning | no-assets fixture |
| Ignores files outside `assets/` directories | Glob pattern only matches `**/assets/**` | no-assets fixture |
| Reads materials root from config | Uses `config.platform.path + "/materials"` | integration test |
| Results ordered deterministically | Sort by `relativePath` (alphabetical) | ordering test |
| Manifest includes size and MIME type | `statSync` + `detectMimeType()` | metadata verification test |

## Performance Considerations

- **Metadata-only:** Never read file contents (stat for size, extension for MIME)
- **Glob efficiency:** Bun's native glob is optimized for recursive patterns
- **Parallel stat calls:** Could use `Promise.all()` for large asset counts (optimization for future)
- **Early filtering:** Exclude dotfiles and directories during glob phase
- **Deterministic sorting:** Single sort pass at end (O(n log n) negligible for typical counts)

**Expected performance:** 500 asset files across nested directories in ~200-300ms (glob: 100ms, stat: 200ms)

## Future Integration Points

- **F-7 (Diff calculation):** Will use `AssetManifest` to detect new/modified/deleted assets
- **F-8 (Asset upload):** Will consume `DiscoveredAsset` array to upload files to platform
- **F-13 (Status command):** Will call `discoverAssets()` to show asset inventory
- **F-14 (Push command):** Will use asset manifest to sync assets to platform

## Open Questions for User Clarification

The spec includes these assumptions to be clarified:

1. **Hidden files (dotfiles):** Should files like `.DS_Store` or `.gitkeep` within `assets/` directories be included or excluded?
   - **Recommendation:** Exclude (filter out files starting with `.`)

2. **Symlinks:** Should symlinks within `assets/` directories be followed or skipped?
   - **Recommendation:** Skip symlinks (add `BROKEN_SYMLINK` warning if encountered)

3. **Maximum file size threshold:** Should discovery warn if individual assets exceed a size threshold (e.g., >100MB)?
   - **Recommendation:** No threshold in discovery phase (let platform/upload logic handle size constraints)

**Note:** These are clarifications, not blockers. We can proceed with recommended defaults and adjust if needed.
