# F-1: Configuration Loading - Documentation

## Files Updated

### New Files
- `src/config.ts` - Configuration loading module with Zod validation
- `src/config.test.ts` - Comprehensive test suite (12 tests)

### Modified Files
- `src/types.ts` - Added `CourseMapping`, `PlatformConfig`, `CourseKitConfig` interfaces
- `package.json` - Added `zod` dependency

## Usage

```typescript
import { loadConfig } from "./config";

// Load from current directory
const config = await loadConfig();

// Load from specific directory
const config = await loadConfig("/path/to/project");

// Access config
console.log(config.platform.path);    // Absolute path to platform
console.log(config.courses);          // Course mappings
```

## Configuration Schema

Create `coursekit.json` in your project root:

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
    }
  }
}
```

## Error Handling

The module throws three specific error types:

| Error | When | User Action |
|-------|------|-------------|
| `ConfigNotFoundError` | `coursekit.json` missing | Run `coursekit init` |
| `ConfigParseError` | Invalid JSON syntax | Fix JSON syntax |
| `ConfigValidationError` | Missing/invalid fields, platform dir missing | Check config values |

## API Reference

### `loadConfig(cwd?: string): Promise<CourseKitConfig>`

Loads and validates configuration.

**Parameters:**
- `cwd` - Directory to load from (default: `process.cwd()`)

**Returns:** Validated `CourseKitConfig` with absolute platform path

**Throws:** `ConfigNotFoundError`, `ConfigParseError`, `ConfigValidationError`
