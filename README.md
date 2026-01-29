# CourseKit

**Backward Design course development for AI-assisted educational content creation.**

## Philosophy

CourseKit is built on a fundamental insight: most courses fail because they're designed forwards instead of backwards.

### The Forward Design Trap

Traditional course creation follows a seductive but flawed pattern:

1. "I know a lot about X, let me teach it"
2. Dump knowledge into slides/videos
3. Add a quiz at the end
4. Hope learners figure it out

This produces courses that are comprehensive but ineffective—full of content but unclear on outcomes.

### The Backward Design Solution

CourseKit inverts the process using **Backward Design** (Understanding by Design, Wiggins & McTighe):

```
┌─────────────────────────────────────────────────────────────┐
│  1. DEFINE    →    2. DESIGN    →    3. DRAFT              │
│                                                             │
│  What should      How will we       What experiences       │
│  learners be      know they         will get them          │
│  able to DO?      achieved it?      there?                 │
└─────────────────────────────────────────────────────────────┘
```

**Start with the end.** Before writing a single lesson, answer:
- What specific, measurable outcomes should learners achieve?
- How will we verify they achieved them?
- Only then: What content and activities lead to those outcomes?

## Core Principles

### 1. Outcomes Before Content

Every lesson exists to achieve a specific learning objective. If you can't state what the learner will be able to DO after the lesson, the lesson shouldn't exist.

We use **Bloom's Taxonomy** to ensure objectives are actionable:

| Level | Verbs | Example |
|-------|-------|---------|
| Remember | list, define, recall | "List the three types of authentication" |
| Understand | explain, summarize | "Explain why OAuth uses tokens" |
| Apply | implement, use | "Implement JWT authentication in an API" |
| Analyze | compare, differentiate | "Compare session-based vs token-based auth" |
| Evaluate | assess, justify | "Evaluate which auth method fits a given scenario" |
| Create | design, build | "Design a complete auth system for a microservices app" |

### 2. Assessment Drives Design

Assessments aren't afterthoughts—they're the proof that learning happened. For each objective:
- Define how you'll verify achievement
- Design the assessment before the content
- Content exists to prepare learners for the assessment

### 3. Respect Learner Constraints

Courses fail when they ignore reality:
- **Time**: How much can learners actually dedicate?
- **Prerequisites**: What do they already know?
- **Context**: Online self-paced vs. university semester vs. workshop?

CourseKit's interview phase captures these constraints before any content is designed.

### 4. Chunking and Progressive Complexity

Cognitive load is real. CourseKit enforces:
- 3-8 modules per course
- 2-5 lessons per module
- Each lesson: single focused objective
- Video segments: 5-15 minutes max
- Progressive difficulty within and across modules

## Workflow

### Phase 1: DEFINE

Structured interview to capture:
- **Audience**: Who are they? What do they know? What constraints do they have?
- **Objectives**: 3-5 SMART learning outcomes using Bloom's verbs
- **Assessment Strategy**: How each objective will be verified
- **Scope**: What's explicitly in and out

Output: `define.md`

### Phase 2: DESIGN

Module and lesson structure based on objectives:
- Map objectives to modules
- Sequence lessons logically
- Budget time realistically
- Align assessments with objectives

Output: `design.md`

### Phase 3: DRAFT

Content creation for each lesson:
- Opening hook (10% of time)
- Core content matched to Bloom level (70%)
- Practice activity (15%)
- Wrap-up with key takeaways (5%)

Output: Individual lesson files

## Why AI-Assisted?

CourseKit is designed as a PAI (Personal AI Infrastructure) skill because:

1. **Structured interviews** work better with AI—systematic, thorough, patient
2. **Bloom's taxonomy** mapping benefits from AI's knowledge of pedagogical patterns
3. **Consistent structure** is easy for AI to maintain across many lessons
4. **Time estimation** and **chunking** can be calculated systematically

The human provides domain expertise and creative vision. CourseKit provides pedagogical structure and systematic execution.

## CLI Commands

### Content Sync System

CourseKit provides a one-way sync system to push content from your source directory to a platform deployment.

#### Configuration

Create a `coursekit.json` in your project root:

```json
{
  "sourceRoot": "./courses",
  "platformRoot": "../my-platform",
  "courses": [
    {
      "id": "astro-course",
      "slug": "astro-course",
      "title": "Building with Astro"
    }
  ],
  "guides": [
    {
      "slug": "getting-started",
      "sourcePath": "./guides/getting-started.md"
    }
  ],
  "assets": {
    "sourceDir": "./assets",
    "patterns": ["**/*.{png,jpg,gif,svg,pdf}"]
  }
}
```

#### Push Content

Sync all content from source to platform:

```bash
# Preview changes (dry run)
coursekit push --dry-run

# Execute sync
coursekit push

# Force sync (overwrite conflicts)
coursekit push --force

# Sync specific course
coursekit push --course astro-course
```

#### Check Sync Status

View current sync state and pending changes:

```bash
# Human-readable output
coursekit sync-status

# Filter to specific course
coursekit sync-status --course astro-course

# JSON output for scripting
coursekit sync-status --json
```

#### Validate Content

Check frontmatter and content structure:

```bash
# Validate all lessons
coursekit sync-validate

# Validate specific course
coursekit sync-validate --course astro-course

# JSON output
coursekit sync-validate --json
```

### Content Types

| Type | Source Location | Platform Location |
|------|-----------------|-------------------|
| Lessons | `courses/{course}/lessons/*.md` | `src/content/lessons/{course}/*.md` |
| Guides | `guides/*.md` | `src/content/guides/*.md` |
| Assets | `assets/**/*` | `public/assets/{course}/**/*` |

### Frontmatter Requirements

Lessons require valid frontmatter:

```yaml
---
title: "Introduction to Astro"
description: "Learn the basics of Astro framework"
order: 1
duration: 15
objectives:
  - "Explain what Astro is"
  - "Set up a new Astro project"
---
```

### Conflict Detection

The sync system tracks three states:
- **Source**: Your working content
- **Platform**: Deployed content
- **Sync State**: Last known synchronized state

When both source and platform change since last sync, a conflict is detected. Use `--force` to overwrite platform changes with source.

## Usage (PAI Skill)

```bash
# Invoke via PAI
/coursekit

# Or trigger with keywords
"create course"
"backward design"
"lesson plan"
```

## Installation

CourseKit is a PAI skill. Symlink to your skills directory:

```bash
ln -s ~/work/CourseKit ~/.claude/skills/CourseKit
```

## References

- Wiggins, G., & McTighe, J. (2005). *Understanding by Design*
- Anderson, L. W., & Krathwohl, D. R. (2001). *A Taxonomy for Learning, Teaching, and Assessing* (Bloom's Revised Taxonomy)
- Sweller, J. (1988). Cognitive Load Theory

---

**CourseKit** — Because great courses are designed backwards.
