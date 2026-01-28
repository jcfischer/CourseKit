# Specification: Validate Command CLI

## Overview

Implement the `coursekit validate` command that runs pre-sync structure checks on the source repository. This command orchestrates all validation logic (configuration loading, file discovery, frontmatter validation, guide structure, asset references) into a single CLI entry point. It provides a clear pass/fail report so authors can fix issues before attempting `coursekit push`.

## User Scenarios

### Scenario 1: Clean validation pass

- **Given** a properly configured source repo with valid lessons, guides, and assets
- **When** the user runs `coursekit validate`
- **Then** all checks pass, a success summary is displayed, and the command exits with code 0

### Scenario 2: Invalid frontmatter detected

- **Given** a source repo where two lesson files have missing or malformed frontmatter
- **When** the user runs `coursekit validate`
- **Then** both files are reported with specific field-level errors, a failure summary is displayed, and the command exits with code 1

### Scenario 3: Missing configuration file

- **Given** a directory with no `coursekit.json`
- **When** the user runs `coursekit validate`
- **Then** the command exits with a clear error: "No coursekit.json found. Run `coursekit init` to create one."

### Scenario 4: Guide structure errors

- **Given** a source repo where a guide references a non-existent lesson slug
- **When** the user runs `coursekit validate`
- **Then** the broken reference is reported with the guide file path and the invalid slug

### Scenario 5: Asset reference errors

- **Given** a source repo where a lesson references an asset file that does not exist
- **When** the user runs `coursekit validate`
- **Then** the missing asset is reported with the referencing lesson path and expected asset path

### Scenario 6: Validate specific course only

- **Given** a source repo with multiple courses configured
- **When** the user runs `coursekit validate --course bridge-your-tana`
- **Then** only the specified course is validated, other courses are skipped

### Scenario 7: Multiple error categories

- **Given** a source repo with frontmatter errors, a broken guide reference, and a missing asset
- **When** the user runs `coursekit validate`
- **Then** all errors are reported grouped by category (frontmatter, guides, assets), with a summary count per category

### Scenario 8: Duplicate lesson order detected

- **Given** two lessons in the same module with identical `order` values
- **When** the user runs `coursekit validate`
- **Then** a warning is reported identifying the conflicting lessons and their shared order value

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | `coursekit validate` loads and validates `coursekit.json` configuration | High |
| FR-2 | Discovers all lesson files using configured source paths | High |
| FR-3 | Validates frontmatter of every discovered lesson file (delegates to F-3 logic) | High |
| FR-4 | Discovers and validates guide file structure (delegates to F-4 logic) | High |
| FR-5 | Discovers and validates asset file references (delegates to F-5 logic) | High |
| FR-6 | Reports all errors across all categories, not just the first failure | High |
| FR-7 | Groups errors by category (config, frontmatter, guides, assets) in output | Medium |
| FR-8 | Displays a summary line with total errors and warnings per category | Medium |
| FR-9 | `--course <slug>` flag filters validation to a single course | Medium |
| FR-10 | Detects duplicate `order` values within the same module as warnings | Medium |
| FR-11 | Cross-validates that all `courseSlug` values in lessons match configured courses | High |
| FR-12 | Validates that every configured course has at least one lesson file | Low |

## Non-Functional Requirements

- **Performance:** Validate a typical course (20 lessons, 5 guides, 10 assets) in <1 second
- **Exit codes:** 0 for all checks pass, 1 for errors found, 2 for configuration/setup errors
- **Output:** Human-readable grouped report with file paths, field names, and fix suggestions
- **CI-friendly:** Non-zero exit code on failure enables use in CI pipelines and git hooks
- **Composability:** Validation logic is reusable -- `coursekit push` calls the same validation before syncing

## Success Criteria

- [ ] `coursekit validate` runs all checks and reports a pass/fail summary
- [ ] Frontmatter validation catches missing/invalid required fields with fix suggestions
- [ ] Guide and asset reference validation catches broken references
- [ ] Errors grouped by category with per-category counts
- [ ] `--course` flag correctly scopes validation to one course
- [ ] Exit code 0 on success, non-zero on failure
- [ ] `coursekit push` reuses validate logic as a pre-sync gate

## Assumptions

1. Configuration loading (F-1) provides parsed `coursekit.json` data
2. Lesson discovery (F-2), guide discovery (F-4), and asset discovery (F-5) are available as importable modules
3. Frontmatter validation (F-3) exposes a function that returns structured error objects
4. The validate command is a composition layer -- it does not duplicate logic from F-1 through F-5

## Open Questions

- [TO BE CLARIFIED] Should validate check platform-side state (e.g., course exists in platform) or only source-side structure?
- [TO BE CLARIFIED] Should `--fix` flag be supported to auto-correct simple issues (e.g., missing `order` field with inferrable value)?
- [TO BE CLARIFIED] Should validation output support `--json` for machine-readable output alongside human-readable default?
