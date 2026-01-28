# F-1: Configuration Loading - Tasks

## Task Breakdown

### T-1.1: Create type definitions [T]
**File:** `src/types.ts`
**Effort:** 10 min

- Define `CourseMapping` interface
- Define `PlatformConfig` interface
- Define `CourseKitConfig` interface
- Export all types

**Test:** Type compilation passes

---

### T-1.2: Create Zod schemas [T]
**File:** `src/config.ts`
**Effort:** 15 min
**Depends:** T-1.1

- Create `CourseMappingSchema`
- Create `PlatformConfigSchema`
- Create `CourseKitConfigSchema`
- Export inferred types

**Test:** Schema validates sample config correctly

---

### T-1.3: Create error classes
**File:** `src/config.ts`
**Effort:** 10 min

- Create `ConfigNotFoundError` with path and help message
- Create `ConfigParseError` with path and parse error
- Create `ConfigValidationError` with path and Zod issues
- Add `formatIssues()` helper for readable error messages

**Test:** Error messages are clear and actionable

---

### T-1.4: Implement loadConfig function [T]
**File:** `src/config.ts`
**Effort:** 20 min
**Depends:** T-1.2, T-1.3

- Read `coursekit.json` from cwd (or provided path)
- Parse JSON with try/catch
- Validate with Zod schema
- Resolve relative `platform.path` against cwd
- Verify platform directory exists
- Return validated config

**Test:**
- Loads valid config
- Throws correct errors for each failure mode

---

### T-1.5: Write comprehensive tests [T]
**File:** `src/config.test.ts`
**Effort:** 25 min
**Depends:** T-1.4

Test cases:
- [ ] Loads valid config successfully
- [ ] Resolves relative platform path
- [ ] Throws ConfigNotFoundError when missing
- [ ] Throws ConfigParseError on invalid JSON
- [ ] Throws ConfigValidationError for missing platform.path
- [ ] Throws ConfigValidationError for empty courses
- [ ] Throws ConfigValidationError when platform dir missing

**Test:** All tests pass with `bun test`

---

## Summary

| Task | Est. Time | Dependencies |
|------|-----------|--------------|
| T-1.1 | 10 min | - |
| T-1.2 | 15 min | T-1.1 |
| T-1.3 | 10 min | - |
| T-1.4 | 20 min | T-1.2, T-1.3 |
| T-1.5 | 25 min | T-1.4 |
| **Total** | **~80 min** | |

## Verification

```bash
# All tests pass
bun test src/config.test.ts

# Type check passes
bun run typecheck

# Manual verification
echo '{"platform":{"path":"../test"},"courses":{}}' > coursekit.json
bun run src/config.ts  # Should load or error appropriately
```
