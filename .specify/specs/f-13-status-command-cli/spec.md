# Specification: Status Command CLI

**Feature ID:** F-13
**Priority:** 4
**Dependencies:** None

## Overview

The `coursekit status` command displays the current sync state between source repositories and the deployment platform on a per-course basis. It answers the question: "What would change if I ran `coursekit push` right now?" This gives the course creator visibility into content drift without making any changes.

## User Scenarios

### Scenario 1: View sync state for all courses

- **Given** a configured `coursekit.json` with one or more source repos mapped to courses
- **When** the user runs `coursekit status`
- **Then** the CLI displays each course with its sync state summary (synced, out-of-date, missing lessons, conflicts)

### Scenario 2: View sync state for a specific course

- **Given** a configured `coursekit.json` with multiple courses
- **When** the user runs `coursekit status <course-slug>`
- **Then** the CLI displays detailed per-lesson sync state for that course only

### Scenario 3: All content is in sync

- **Given** all source lessons have been pushed and no changes exist
- **When** the user runs `coursekit status`
- **Then** the CLI shows each course as "up to date" with a zero-change summary

### Scenario 4: Source has new or modified lessons

- **Given** the source repo has lessons not yet pushed or modified since last push
- **When** the user runs `coursekit status`
- **Then** the CLI lists each new/modified lesson with its change type (added, modified)

### Scenario 5: Platform has local edits to synced files (conflict)

- **Given** the platform has manual edits to files previously synced from source
- **When** the user runs `coursekit status`
- **Then** the CLI marks those files as "conflict" and warns the user

### Scenario 6: No configuration found

- **Given** no `coursekit.json` exists in the current directory or parents
- **When** the user runs `coursekit status`
- **Then** the CLI exits with a clear error message explaining how to initialize configuration

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Display per-course sync summary showing counts of synced, added, modified, and conflicting items | High |
| FR-2 | Support an optional `<course-slug>` argument to filter output to a single course | Medium |
| FR-3 | Show per-lesson detail including file path, change type (added/modified/removed/conflict), and source repo | High |
| FR-4 | Detect conflicts where platform files have been modified after last sync | High |
| FR-5 | Read course configuration from `coursekit.json` | High |
| FR-6 | Support multi-source repos — show which source repo owns each lesson | Medium |
| FR-7 | Exit with non-zero code when configuration is missing or invalid | Medium |
| FR-8 | Support `--json` flag for machine-readable output | Low |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Status check completes in <3 seconds for a course with up to 50 lessons |
| NFR-2 | Output is human-readable with clear visual grouping per course |
| NFR-3 | No side effects — status is strictly read-only, never modifies source or platform files |
| NFR-4 | Works from any directory within a project that has `coursekit.json` in its ancestry |

## Conflict Detection

The status command must detect when platform-side files have been modified independently of sync. This requires comparing:

1. **Source state** — current content of lesson files in source repo
2. **Platform state** — current content of corresponding files in platform
3. **Last-synced state** — [TO BE CLARIFIED] How is last-synced state tracked? Options include a `.coursekit-lock` file, git commit hashes, or content hashes stored in a manifest.

## Output Format

Example output for `coursekit status`:

```
supertag-course (source: ~/work/supertag-course)
  Lessons:  8 synced, 2 added, 1 modified, 0 conflicts
  Guides:   3 synced, 0 added, 0 modified, 0 conflicts
  Assets:   5 synced, 1 added, 0 modified, 0 conflicts

another-course (source: ~/work/another-course)
  Lessons:  4 synced, 0 added, 0 modified, 1 conflict
  ⚠ CONFLICT: lesson-03.md (platform modified after last sync)
```

[TO BE CLARIFIED] Exact output format and whether guides/assets are shown separately or grouped.

## Success Criteria

- [ ] `coursekit status` lists all configured courses with sync state
- [ ] Per-lesson detail shows change type accurately
- [ ] Conflicts are clearly identified and warned about
- [ ] Command completes in <3 seconds for typical course sizes
- [ ] Missing configuration produces actionable error message
- [ ] Multi-source repos display correctly without collision
- [ ] `--json` flag produces valid JSON output

## Assumptions

1. `coursekit.json` configuration format is defined by the time this feature is implemented
2. File discovery for lessons, guides, and assets is available (F-2, F-4, F-5)
3. Platform state reading is available (F-6)
4. Diff calculation is available (F-7)
5. The status command is read-only and does not require push/sync infrastructure
