---
name: CourseKit
description: Backward Design course development workflow for creating structured educational content. USE WHEN creating courses, lesson plans, educational materials, curriculum design, or "backward design".
triggers:
  - pattern: "/coursekit"
    type: command
    priority: 100
  - pattern: "create course"
    type: keyword
    priority: 50
  - pattern: "backward design"
    type: keyword
    priority: 50
  - pattern: "lesson plan"
    type: keyword
    priority: 40
  - pattern: "curriculum"
    type: keyword
    priority: 40
---

# CourseKit - Backward Design Course Development

Course development workflow using backward design methodology for creating structured educational content.

## Overview

CourseKit guides the creation of courses by starting with learning outcomes and working backward to design content, assessments, and lessons that achieve those outcomes.

## Workflow

### 1. Define Interview

Start by gathering course requirements:
- Target audience and prerequisites
- Learning objectives and outcomes
- Time constraints and format
- Assessment requirements

**Prompt template:** `prompts/define-interview.md`

### 2. Design Structure

Based on the interview, design the course structure:
- Module breakdown
- Lesson sequencing
- Assessment alignment

**Prompt template:** `prompts/design-structure.md`

### 3. Draft Lessons

Create individual lesson content:
- Learning activities
- Content materials
- Practice exercises

**Prompt template:** `prompts/draft-lesson.md`

## CLI Usage

```bash
# Run CourseKit CLI
bun ~/.claude/skills/CourseKit/src/index.ts [command]

# Or if compiled
~/.claude/skills/CourseKit/dist/index.js [command]
```

## Directory Structure

```
CourseKit/
├── src/           # CLI implementation
├── dist/          # Compiled binary
├── prompts/       # Prompt templates for each phase
└── templates/     # Output templates
```
