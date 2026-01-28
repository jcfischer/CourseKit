# CourseKit Sync Specification

> Split Ownership Architecture for Course Development

## Overview

CourseKit uses a **split ownership** model where multiple source repositories publish lessons to a single course-platform deployment. Each repository owns its content; the platform owns commerce.

```
┌─────────────────────┐     ┌─────────────────────┐
│  supertag-course    │     │  other-course-repo  │
│  (source repo 1)    │     │  (source repo 2)    │
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
           │  coursekit push           │  coursekit push
           │                           │
           ▼                           ▼
┌─────────────────────────────────────────────────────┐
│                   course-platform                    │
│              (Astro deployment repo)                 │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   Lessons   │  │   Guides    │  │  Commerce   │  │
│  │  (synced)   │  │  (synced)   │  │  (owned)    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Ownership Boundaries

### Source Repository Owns (Synced)

| Content Type | Source Path | Platform Path |
|--------------|-------------|---------------|
| Lessons | `courses/{course}/lessons/*.md` | `src/content/lessons/{slug}/*.md` |
| Guides | `courses/{course}/materials/**/guide*.md` | `src/content/guides/{slug}/*.md` |
| Assets | `courses/{course}/materials/**/assets/*` | `public/courses/{slug}/**/*` |

**Synced fields in lesson frontmatter:**
- `title` - Lesson title
- `description` - Lesson description
- `moduleId` - Module identifier (m0, m1, m2, etc.)
- `order` - Sort order within module
- `durationMinutes` - Estimated duration
- `resources` - Downloadable resources list

### Platform Owns (Never Synced)

| Content Type | Platform Path | Purpose |
|--------------|---------------|---------|
| Course definition | `src/content/courses/{slug}.md` | Pricing, product IDs, marketing |
| Enrollment data | Database | Student access, progress |
| Analytics | External service | Usage tracking |

**Platform-owned fields (preserved during sync):**
- `price` - Course price
- `currency` - Price currency
- `lemonSqueezyProductId` - Payment integration
- `lemonSqueezyVariantId` - Price variant
- `bunnyVideoId` - Video hosting ID (can be set in platform)
- `status` - Publication status (draft/published)

---

## Source Repository Structure

```
courses/
└── {course-id}/
    ├── define.md           # Learning objectives, audience
    ├── design.md           # Module structure, lesson plan
    ├── develop.md          # Development tasks, progress
    ├── lessons/            # ← SYNCED TO PLATFORM
    │   ├── m0-l1-intro.md
    │   ├── m0-l2-setup.md
    │   ├── m1-l1-basics.md
    │   └── ...
    └── materials/          # Working materials
        └── {module}/
            └── {lesson}/
                ├── script.md
                ├── guide-*.md    # ← SYNCED AS GUIDES
                └── assets/       # ← SYNCED AS ASSETS
```

### Lesson Frontmatter (Source)

```yaml
---
courseSlug: bridge-your-tana          # Maps to platform course
moduleId: m1                          # Module identifier
title: "Installing supertag-cli"      # Synced
description: "Get up and running"     # Synced
durationMinutes: 10                   # Synced
order: 1                              # Synced
resources:                            # Synced
  - label: "Cheat Sheet"
    path: "/courses/bridge-your-tana/m1-cheatsheet.pdf"
---
```

---

## Platform Structure

```
src/content/
├── courses/
│   ├── bridge-your-tana.md           # PLATFORM-OWNED
│   └── bridge-your-tana-complete.md  # PLATFORM-OWNED
├── lessons/
│   ├── bridge-your-tana/             # SYNCED from source
│   │   ├── m0-l1-intro.md
│   │   └── ...
│   └── bridge-your-tana-complete/    # SYNCED from source
│       ├── m3-l1-query-language.md
│       └── ...
└── guides/
    └── bridge-your-tana/             # SYNCED from source
        ├── m1-l1-guide-macos.md
        └── ...

public/courses/
└── bridge-your-tana/                 # SYNCED assets
    └── m1/
        └── screenshot.png
```

### Course Definition (Platform-Owned)

```yaml
---
slug: bridge-your-tana
title: "Bridge your Tana: Essentials"
description: "Marketing description..."    # Platform-owned
price: 0                                   # Platform-owned
currency: USD                              # Platform-owned
lemonSqueezyProductId: "768192"            # Platform-owned
banner: /courses/bridge-your-tana/banner.png
modules:                                   # Platform-owned structure
  - id: "m0"
    title: "The Bridge Concept"
    description: "Why Tana needs bridges..."
  - id: "m1"
    title: "The Backup Bridge"
    description: "Peace of mind..."
---
```

---

## CLI Commands

### `coursekit push`

Push lessons from source to platform. **One-way only.**

```bash
# Push all courses in current repo
coursekit push

# Push specific course
coursekit push bridge-your-tana

# Dry run (show what would sync)
coursekit push --dry-run

# Force push (overwrite even if platform has changes)
coursekit push --force
```

**Behavior:**
1. Reads `courses/{course}/lessons/*.md`
2. Validates frontmatter (courseSlug, moduleId required)
3. Copies to platform `src/content/lessons/{slug}/`
4. Copies guides from `materials/**/guide*.md` to `src/content/guides/{slug}/`
5. Copies assets to `public/courses/{slug}/`
6. **Never touches** `src/content/courses/*.md` (platform-owned)

### `coursekit status`

Show sync status between source and platform.

```bash
coursekit status
```

Output:
```
Course: bridge-your-tana
  Source: 10 lessons, 8 guides
  Platform: 10 lessons, 8 guides
  Status: ✓ In sync

Course: bridge-your-tana-complete
  Source: 31 lessons, 6 guides
  Platform: 30 lessons, 6 guides
  Status: ⚠ 1 lesson pending push (m3-l7-timeline-queries.md)
```

### `coursekit init`

Initialize a new course in source repo.

```bash
coursekit init my-new-course
```

Creates:
```
courses/my-new-course/
├── define.md      # Template
├── design.md      # Template
├── develop.md     # Template
└── lessons/       # Empty
```

### `coursekit validate`

Validate course structure and frontmatter.

```bash
coursekit validate
```

Checks:
- All lessons have required frontmatter
- courseSlug matches a known course
- moduleId follows pattern (m0, m1, m2...)
- No orphaned guides without lessons
- Assets referenced in lessons exist

---

## Configuration

### Source Repo: `coursekit.json`

```json
{
  "platform": {
    "path": "../web/course-platform",
    "remote": "git@github.com:user/course-platform.git"
  },
  "courses": {
    "bridge-your-tana": {
      "slug": "bridge-your-tana",
      "sourceDir": "courses/c-001-bridge-your-tana"
    },
    "bridge-your-tana-complete": {
      "slug": "bridge-your-tana-complete",
      "sourceDir": "courses/c-002-bridge-your-tana-complete"
    }
  }
}
```

### Platform Repo: `.coursekit-platform`

Marker file indicating this is a platform repo (not a source).

```json
{
  "role": "platform",
  "sources": [
    "git@github.com:user/supertag-course.git",
    "git@github.com:user/other-courses.git"
  ]
}
```

---

## Sync Rules

### What Gets Synced

| Source | Destination | Sync Direction |
|--------|-------------|----------------|
| `lessons/*.md` | `src/content/lessons/{slug}/` | Source → Platform |
| `materials/**/guide*.md` | `src/content/guides/{slug}/` | Source → Platform |
| `materials/**/assets/*` | `public/courses/{slug}/` | Source → Platform |

### What Never Gets Synced

| Content | Owner | Reason |
|---------|-------|--------|
| `src/content/courses/*.md` | Platform | Commerce metadata |
| `bunnyVideoId` in lessons | Platform | Set after recording |
| Database records | Platform | Enrollment, progress |
| `.env`, secrets | Platform | Deployment config |

### Conflict Resolution

**Source always wins for synced content.** If platform has local edits to synced files:

1. `coursekit push` warns about conflicts
2. `coursekit push --force` overwrites platform changes
3. Platform-owned files are never touched

```
⚠ Warning: Platform has local changes to synced files:
  - src/content/lessons/bridge-your-tana/m1-l1-installing.md

These changes will be overwritten. Use --force to proceed.
To keep platform changes, copy them to source first.
```

---

## Multi-Source Workflow

When multiple source repos feed one platform:

```bash
# In supertag-course/
coursekit push

# In other-course-repo/
coursekit push

# Each repo only touches its own courses
# Platform courses from different sources coexist
```

**Collision prevention:**
- Each course has unique `courseSlug`
- Source repos can only push courses defined in their `coursekit.json`
- Platform rejects pushes for courses not in source's config

---

## Migration Steps

### 1. Remove Commerce Fields from Source

Edit source `define.md` / `design.md` to remove:
- `price`
- `lemonSqueezyProductId`
- Any payment-related fields

### 2. Create coursekit.json

```bash
# In source repo
cat > coursekit.json << 'EOF'
{
  "platform": {
    "path": "../web/course-platform"
  },
  "courses": {
    "bridge-your-tana": {
      "slug": "bridge-your-tana",
      "sourceDir": "courses/c-001-bridge-your-tana"
    }
  }
}
EOF
```

### 3. Ensure Platform Has Commerce Data

Verify `src/content/courses/{slug}.md` has correct:
- `price`
- `lemonSqueezyProductId`
- `modules` array

### 4. First Sync

```bash
coursekit push --dry-run  # Verify
coursekit push            # Execute
```

---

## Summary

| Concern | Owner | Location |
|---------|-------|----------|
| Lesson content | Source | `courses/{id}/lessons/` |
| Learning objectives | Source | `courses/{id}/define.md` |
| Module structure | Source | `courses/{id}/design.md` |
| Pricing | Platform | `src/content/courses/{slug}.md` |
| Payment integration | Platform | `src/content/courses/{slug}.md` |
| Video IDs | Platform | Lesson frontmatter (post-sync) |
| Enrollment | Platform | Database |

**Golden Rule:** If it's about *what the course teaches*, it's source-owned. If it's about *how the course is sold*, it's platform-owned.
