# Implementation Tasks: Push Command CLI (F-12)

## Progress Tracking

| Task | Status | Notes |
|------|--------|-------|
| T-1.1 | ✅ | Push command implementation |
| T-1.2 | ✅ | Register in CLI |
| T-1.3 | ⏸️ | Tests deferred - integration tested manually |

## Tasks

### T-1.1: Implement push command [T]
- **File:** `src/commands/push.ts`
- **Dependencies:** F-9, F-10, F-11

**Acceptance Criteria:**
- [ ] Loads config using loadConfig()
- [ ] Executes lesson, guide, and asset sync
- [ ] Supports --dry-run, --force, --course options
- [ ] Displays combined results
- [ ] Sets appropriate exit codes

---

### T-1.2: Register push command in CLI
- **File:** `src/index.ts`

**Acceptance Criteria:**
- [ ] Import pushCommand
- [ ] Register with Commander.js
- [ ] Add options for dry-run, force, course

---

### T-1.3: Tests for push command [T]
- **File:** `src/commands/push.test.ts`

**Test Cases:**
- Push executes all sync types
- Dry-run doesn't write files
- Force overwrites conflicts
- Course filter works
- Exit codes correct

---

## Summary

**Total Tasks:** 3
**Estimated Effort:** 1-2 hours

**Dependencies:**
- F-9 (Lesson Sync) ✅
- F-10 (Guide Sync) ✅
- F-11 (Asset Sync) ✅
