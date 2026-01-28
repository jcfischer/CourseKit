# F-11: Asset Sync Execution - Technical Plan

## Architecture Overview

F-11 implements asset sync following the same pattern as F-9/F-10. Assets are binary files (images, PDFs) that sync from materials to platform public directory.

### Data Flow

```
Asset Discovery (F-5) ──> discoverAssets() ──> AssetManifest
                                                    │
                                                    ▼
                                           executeAssetSync (F-11)
                                                    │
                         ┌──────────────────────────┼──────────────────────┐
                         ▼                          ▼                      ▼
                   Write Files              Update SyncState          Display Summary
```

## Key Design Decisions

### 1. Directory Structure

**Decision**: Assets sync from materials to platform public directory.

- Source: `{platform}/materials/**/assets/**/*`
- Target: `{platform}/public/courses/{courseSlug}/{relativePath}`

**Rationale**: Assets in public directory are served directly by the platform.

### 2. Binary File Handling

**Decision**: Use streaming copy for all files to handle large assets.

```typescript
// Use Bun's native file handling which streams efficiently
await Bun.write(targetPath, Bun.file(sourcePath));
```

### 3. Path Preservation

**Decision**: Preserve relative path structure from within assets directory.

Example:
- Source: `materials/module-01/assets/images/hero.png`
- Target: `public/courses/astro-course/images/hero.png`

### 4. Hash Calculation

**Decision**: Use SHA-256 of full file content for binary files.

Note: No frontmatter extraction like markdown files.

## API Design

```typescript
async function executeAssetSync(
  config: CourseKitConfig,
  options: SyncOptions
): Promise<SyncResult>

function buildAssetTargetPath(
  platformRoot: string,
  courseSlug: string,
  relativePath: string
): string
```

## File Structure

```
src/lib/
├── asset-sync.ts           # NEW: Asset sync execution
├── asset-sync.test.ts      # NEW: Asset sync tests
```

## Integration Points

### With F-5 (Asset Discovery)

```typescript
import { discoverAssets } from "./asset-discovery";
const manifest = await discoverAssets(materialsRoot);
```

### With Sync Display (F-9)

```typescript
import { displaySyncResult, displaySyncPreview } from "./sync-display";
```
