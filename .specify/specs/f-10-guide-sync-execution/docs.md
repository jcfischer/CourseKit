# F-10: Guide Sync Execution - Documentation

## Files Created

### New Files
- `src/lib/guide-sync.ts` - Guide sync execution logic
- `src/lib/guide-sync.test.ts` - Guide sync tests (14 tests)

## Usage

### Basic Guide Sync

```typescript
import { executeGuideSync } from "./lib/guide-sync";
import { displaySyncResult, displaySyncPreview } from "./lib/sync-display";
import { loadConfig } from "./config";

const config = await loadConfig();

// Execute sync
const result = await executeGuideSync(config);

// Display results (reuse from F-9)
if (result.dryRun) {
  displaySyncPreview(result);
} else {
  displaySyncResult(result);
}
```

### With Options

```typescript
// Dry-run preview
const preview = await executeGuideSync(config, { dryRun: true });

// Force overwrite conflicts
const forced = await executeGuideSync(config, { force: true });
```

## Directory Structure

- Source: `{platform}/materials/**/guide-*.md`
- Target: `{platform}/src/content/guides/{slug}.md`

Example:
- Source: `materials/module-01/guide-setup.md`
- Target: `src/content/guides/setup.md`

## Sync Behavior

| Scenario | Action |
|----------|--------|
| New guide (no platform file) | Create |
| Unchanged (hash match) | Skip |
| Source modified, platform unchanged | Update |
| Platform modified (conflict) | Skip (or update with --force) |

## Integration

Guide sync shares the same `SyncResult` type and display utilities as lesson sync (F-9), enabling consistent output formatting across content types.

```typescript
// Combined sync
const lessonResult = await executeLessonSync(config, options);
const guideResult = await executeGuideSync(config, options);

// Display both
displaySyncResult(lessonResult);
displaySyncResult(guideResult);
```
