# F-14: Validate Command CLI - Technical Plan

## Implementation

Created `coursekit sync-validate` command that:
- Discovers lessons (F-2)
- Validates frontmatter (F-3)
- Reports validation results

## Files
- `src/commands/sync-validate.ts` - Command implementation
- `src/index.ts` - Registration
