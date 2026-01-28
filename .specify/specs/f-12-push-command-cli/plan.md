# F-12: Push Command CLI - Technical Plan

## Architecture Overview

The `coursekit push` command orchestrates lesson, guide, and asset sync operations from F-9, F-10, F-11 into a single CLI command.

### Data Flow

```
coursekit push [options]
        │
        ├──> loadConfig() ──> CourseKitConfig
        │
        ├──> executeLessonSync() ──> SyncResult (lessons)
        │
        ├──> executeGuideSync() ──> SyncResult (guides)
        │
        ├──> executeAssetSync() ──> SyncResult (assets)
        │
        └──> Display combined results
```

## Key Design Decisions

### 1. Command Registration

**Decision**: Add `push` as new command alongside existing `sync`.

The old `sync` command calls external scripts; `push` uses internal modules.

### 2. Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview without writing |
| `--force` | Overwrite conflicts |
| `--course <id>` | Filter to specific course |

### 3. Exit Codes

- 0: Success
- 1: Errors during sync
- 2: Conflicts detected (without --force)

### 4. Output

Combine results from all three sync types and display unified summary.

## API Design

```typescript
interface PushCommandOptions {
  dryRun?: boolean;
  force?: boolean;
  course?: string;
}

async function pushCommand(options: PushCommandOptions): Promise<void>
```

## File Structure

```
src/
├── commands/
│   ├── push.ts         # NEW: Push command
│   └── push.test.ts    # NEW: Push command tests
└── index.ts            # MODIFIED: Register push command
```

## Integration

```typescript
// In index.ts
import { pushCommand } from "./commands/push";

program
  .command("push")
  .description("Push course materials to platform")
  .option("-d, --dry-run", "Preview without writing")
  .option("-f, --force", "Overwrite conflicts")
  .option("-c, --course <id>", "Filter to specific course")
  .action(pushCommand);
```
