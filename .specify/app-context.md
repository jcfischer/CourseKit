# App Context: CourseKit

## Problem Statement

Course content and commerce metadata drift out of sync when edited in different locations. Multiple source repositories create lessons, but pricing, LemonSqueezy IDs, and enrollment data live in the deployment platform. Without clear ownership boundaries and one-way sync, changes made directly in the platform get overwritten or lost.

**Why now:** Production shows 4 lessons while dev shows 10. Platform has correct pricing (CHF 79) but source repo shows price: 0. This is actively breaking the course business.

**If not solved:** Content drift continues, pricing errors, lost work, manual reconciliation.

## Users & Stakeholders

**Primary user:** Solo course creator managing 2+ courses across source repo and deployment platform.

**Technical level:** Comfortable with CLI, git, TypeScript. Not a full-time developer.

**Workflow:** Write lessons in source repo → sync to platform → set pricing in platform → deploy.

## Current State

- **Source repos:** `supertag-course/` with lesson markdown, define.md, design.md
- **Platform:** `course-platform/` Astro site with `src/content/lessons/`, `src/content/courses/`
- **Sync:** Manual copy, no tooling, no ownership boundaries
- **Problem:** Platform-owned fields (pricing) were accidentally in source, causing drift

## Constraints & Requirements

1. **One-way sync only** - Source → Platform, never reverse
2. **Multi-source support** - Multiple source repos feed one platform
3. **Clear ownership** - Lessons in source, commerce in platform
4. **Non-destructive** - Platform commerce fields never touched by sync
5. **CLI-first** - Commands like `coursekit push`, `coursekit status`
6. **Fast** - Sync should complete in seconds

## User Experience

**Discovery:** User runs `coursekit push` after editing lessons.

**Mental model:** "I write lessons here, pricing lives there, sync publishes."

**Error handling:**
- Warn on conflicts (platform has local changes to synced files)
- Never silently overwrite commerce data
- Dry-run mode for preview

## Edge Cases & Error Handling

1. **Conflict:** Platform has manual edits to synced lesson files → Warn, require --force
2. **Missing course:** Source references course not in platform → Error with guidance
3. **Partial sync:** Network failure mid-sync → Rollback or clear error state
4. **Multiple sources:** Two repos try to own same course → Reject with clear error
5. **Schema mismatch:** Source frontmatter doesn't match platform expectations → Validate before sync

## Success Criteria

1. `coursekit push` syncs lessons in <5 seconds
2. Platform commerce fields (price, lemonSqueezyProductId) never modified by sync
3. `coursekit status` shows sync state clearly
4. Multi-source repos can coexist without collision
5. Dry-run mode shows exactly what would change

## Scope

### In Scope
- `coursekit push` command with --dry-run and --force
- `coursekit status` command showing sync state
- `coursekit validate` command for pre-sync checks
- `coursekit.json` configuration file
- One-way lesson/guide/asset sync
- Conflict detection and warning

### Explicitly Out of Scope
- Two-way sync (platform → source)
- Database sync (enrollments, progress)
- Video upload integration
- Multiple platform destinations (only one platform supported)
- GUI/web interface
