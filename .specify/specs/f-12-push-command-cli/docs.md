# F-12: Push Command CLI - Documentation

## Files Created

### New Files
- `src/commands/push.ts` - Push command implementation

### Modified Files
- `src/index.ts` - Registered push command

## Usage

### Basic Push

```bash
# Push all content (lessons, guides, assets)
coursekit push

# Preview without writing files
coursekit push --dry-run

# Force overwrite conflicts
coursekit push --force

# Filter to specific course
coursekit push --course astro-course
```

### Options

| Option | Short | Description |
|--------|-------|-------------|
| `--dry-run` | `-d` | Preview changes without writing |
| `--force` | `-f` | Overwrite conflicting files |
| `--course <id>` | `-c` | Filter to specific course |

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Errors occurred |
| 2 | Conflicts detected (use --force) |

## Output Example

```
CourseKit Push
──────────────────────────────────────────────────
  Platform: /path/to/platform
  Mode:     DRY RUN

Syncing lessons...
Syncing guides...
Syncing assets...

═══ DRY RUN ═══════════════════════════════════════════════════
No files were written. Preview of what would happen:

Would create:
  + astro-course/intro
  + astro-course/setup

Would update:
  ~ astro-course/basics

Summary: 10 files, 2 created, 1 updated, 7 unchanged
═══════════════════════════════════════════════════════════════
```

## Integration

The push command orchestrates:
- **F-9**: Lesson sync execution
- **F-10**: Guide sync execution
- **F-11**: Asset sync execution

Results from all three are aggregated into a single combined result.
