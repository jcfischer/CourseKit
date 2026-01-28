# F-4: Guide File Discovery - Verification

## Test Results

```
$ bun test
bun test v1.3.6 (d530ed99)

 149 pass
 0 fail
 267 expect() calls
Ran 149 tests across 6 files. [111.00ms]
```

## Test Coverage by Module

| Module | Tests | Status |
|--------|-------|--------|
| guide-discovery-utils.test.ts | 33 | PASS |
| guide-discovery.test.ts | 22 | PASS |
| validation.test.ts | 33 | PASS |
| discovery.test.ts | 20 | PASS |
| discovery-utils.test.ts | 29 | PASS |
| config.test.ts | 12 | PASS |

## Spec Scenarios Verified

| Scenario | Test | Status |
|----------|------|--------|
| Flat guides discovered | Scenario 1 tests | PASS |
| Nested guides discovered | Scenario 2 tests | PASS |
| Non-guide files filtered | Scenario 3 tests | PASS |
| Empty directory returns warning | Scenario 4 tests | PASS |
| Missing directory returns warning | Scenario 5 tests | PASS |
| Malformed frontmatter generates warning | Scenario 6 tests | PASS |

## Filename Parsing Tests (10 tests)

- guide.md -> slug: "guide"
- guide-setup.md -> slug: "setup"
- guide-multi-word-slug.md -> slug: "multi-word-slug"
- Guide-CamelCase.md -> slug: "CamelCase"
- guide-01-intro.md -> slug: "01-intro"
- readme.md -> null
- my-guide.md -> null
- notes.md -> null
- GUIDE.MD -> slug: "guide"
- guide-.md -> null (invalid)

## Frontmatter Parsing Tests (12 tests)

- Valid frontmatter with title + description
- Valid frontmatter with title only
- Valid frontmatter with extra fields (passthrough)
- Missing frontmatter -> error
- Invalid YAML syntax -> error
- Missing title field -> error
- Empty frontmatter block -> error
- Empty title -> error
- Array frontmatter -> error
- Includes raw frontmatter string

## Directory Scanning Tests (9 tests)

- Flat directory discovery
- Nested directory discovery
- Non-guide files filtered
- Empty directory returns []
- Missing directory returns [] (no throw)
- Results sorted alphabetically
- Subdirectory filter works
- Subdirectory filter with nonexistent returns []

## Main Discovery Function Tests (22 tests)

- Scenario 1: Flat guides (4 tests)
- Scenario 2: Nested guides (3 tests)
- Scenario 3: Mixed files (2 tests)
- Scenario 4: Empty directory (2 tests)
- Scenario 5: Missing directory (2 tests)
- Scenario 6: Malformed frontmatter (3 tests)
- Options tests (3 tests)
- Manifest metadata tests (3 tests)

## Success Criteria Checklist

- [x] Discovers all files matching `materials/**/guide*.md` pattern
- [x] Handles arbitrary nesting depth within materials
- [x] Parses YAML frontmatter without crashing on malformed files
- [x] Returns empty results (not errors) for missing or empty materials directories
- [x] Ignores markdown files that don't match `guide*` prefix
- [x] Materials root resolved from config
- [x] Results ordered deterministically (alphabetically by relativePath)

## Warning Code Tests

- [x] MISSING_MATERIALS_DIR for nonexistent materials/
- [x] EMPTY_MATERIALS_DIR for empty materials/
- [x] MALFORMED_FRONTMATTER for bad YAML
- [x] MISSING_TITLE for missing title field

## Verification Date

2026-01-28
