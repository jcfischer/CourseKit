# F-11: Asset Sync Execution - Documentation

## Files Created

### New Files
- `src/lib/asset-sync.ts` - Asset sync execution logic
- `src/lib/asset-sync.test.ts` - Asset sync tests (14 tests)

## Usage

```typescript
import { executeAssetSync } from "./lib/asset-sync";
import { displaySyncResult } from "./lib/sync-display";
import { loadConfig } from "./config";

const config = await loadConfig();
const result = await executeAssetSync(config);
displaySyncResult(result);
```

## Directory Structure

- Source: `{platform}/materials/**/assets/**/*`
- Target: `{platform}/public/courses/{courseSlug}/{relativePath}`

Example:
- Source: `materials/module-01/assets/images/hero.png`
- Target: `public/courses/astro-course/images/hero.png`

## Sync Behavior

| Scenario | Action |
|----------|--------|
| New asset | Create |
| Unchanged (hash match) | Skip |
| Source modified, platform unchanged | Update |
| Platform modified (conflict) | Skip (or update with --force) |

## Integration

Asset sync shares the same `SyncResult` type and display utilities as lesson/guide sync (F-9/F-10).
