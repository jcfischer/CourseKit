# F-10: Guide Sync Execution - Technical Plan

## Architecture Overview

F-10 implements guide sync following the same pattern as F-9 (Lesson Sync). Guides are course-agnostic supplementary materials that sync from the materials directory to platform.

### Data Flow

```
Guide Discovery (F-4) ──> discoverGuides() ──> GuideManifest
                                                    │
                                                    ▼
                                           executeGuideSync (F-10)
                                                    │
                         ┌──────────────────────────┼──────────────────────┐
                         ▼                          ▼                      ▼
                   Write Files              Update SyncState          Display Summary
```

## Key Design Decisions

### 1. Directory Structure

**Decision**: Guides sync from materials to platform guides directory.

- Source: `{platform}/materials/**/guide-*.md`
- Target: `{platform}/src/content/guides/{slug}.md`

**Rationale**: Guides are platform-level content, not course-specific.

### 2. Reuse F-9 Infrastructure

**Decision**: Reuse sync display utilities from F-9.

- `displaySyncResult()` and `displaySyncPreview()` work for guides too
- Same `SyncResult` type structure

### 3. Sync State Keys

**Decision**: Use `guides/{slug}` as canonical key in sync state.

**Rationale**: Differentiates from lesson keys (`{courseId}/{slug}`).

### 4. Simplified Conflict Detection

**Decision**: Guides use hash comparison similar to lessons, but without course-level filtering.

## API Design

### Main Function

```typescript
async function executeGuideSync(
  config: CourseKitConfig,
  options: SyncOptions
): Promise<SyncResult>
```

### Helper Functions

```typescript
function buildGuideTargetPath(platformRoot: string, slug: string): string
async function writeGuideFile(sourcePath: string, targetPath: string): Promise<WriteResult>
```

## File Structure

```
src/lib/
├── guide-sync.ts           # NEW: Guide sync execution
├── guide-sync.test.ts      # NEW: Guide sync tests
├── lesson-sync.ts          # Existing (F-9)
└── sync-display.ts         # Reused from F-9
```

## Integration Points

### With F-4 (Guide Discovery)

```typescript
import { discoverGuides } from "./guide-discovery";
const manifest = await discoverGuides(config);
```

### With F-9 (Shared Display)

```typescript
import { displaySyncResult, displaySyncPreview } from "./sync-display";
```

## Test Strategy

### Unit Tests
- `executeGuideSync` with various scenarios
- Path building utilities
- Integration with guide discovery

### Test Cases
- Sync new guides to empty platform
- Skip unchanged guides
- Update modified guides
- Handle conflicts
- Dry-run mode
- Force overwrite
