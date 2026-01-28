# F-4: Guide File Discovery - Documentation

## Files Created

### New Files
- `src/lib/guide-discovery.ts` - Main discovery function
- `src/lib/guide-discovery.test.ts` - Discovery tests (22 tests)
- `src/lib/guide-discovery-utils.ts` - Filename parsing and frontmatter utilities
- `src/lib/guide-discovery-utils.test.ts` - Utility tests (33 tests)

### Modified Files
- `src/types.ts` - Added guide discovery types

### Test Fixtures
- `test-fixtures/guides-flat/` - Flat structure scenario
- `test-fixtures/guides-nested/` - Nested directories scenario
- `test-fixtures/guides-mixed/` - Mixed files (filtering) scenario
- `test-fixtures/guides-empty/` - Empty materials directory scenario
- `test-fixtures/no-materials/` - Missing materials directory scenario
- `test-fixtures/guides-malformed/` - Malformed frontmatter scenario

## Usage

```typescript
import { discoverGuides } from "./lib/guide-discovery";
import { loadConfig } from "./config";

// Load configuration
const config = await loadConfig();

// Discover all guides
const manifest = await discoverGuides(config);

console.log(`Found ${manifest.guides.length} guides`);

// Process discovered guides
for (const guide of manifest.guides) {
  console.log(`- ${guide.frontmatter.title} (${guide.relativePath})`);
}

// Check for warnings
if (manifest.warnings.length > 0) {
  console.log(`\n${manifest.warnings.length} warnings:`);
  for (const warning of manifest.warnings) {
    console.log(`  [${warning.code}] ${warning.message}`);
  }
}
```

## Guide File Naming Convention

Guide files must match the pattern `guide*.md`:

| Filename | Slug |
|----------|------|
| `guide.md` | "guide" |
| `guide-setup.md` | "setup" |
| `guide-multi-word.md` | "multi-word" |
| `Guide-CamelCase.md` | "CamelCase" |

Non-matching files like `README.md`, `notes.md`, or `my-guide.md` are ignored.

## Required Frontmatter

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Guide title (non-empty) |
| `description` | string | No | Brief description |

Unknown fields are allowed and passed through.

## Discovery Options

```typescript
interface GuideDiscoveryOptions {
  // Include raw frontmatter string in results
  includeRawFrontmatter?: boolean;

  // Filter to guides in a specific subdirectory
  subdirectory?: string;
}

// Example: Filter to specific module
const manifest = await discoverGuides(config, {
  subdirectory: "module-01"
});
```

## Warning Codes

| Code | Meaning |
|------|---------|
| `MISSING_MATERIALS_DIR` | materials/ directory doesn't exist |
| `EMPTY_MATERIALS_DIR` | materials/ exists but no guides found |
| `MALFORMED_FRONTMATTER` | YAML parse error |
| `MISSING_TITLE` | Frontmatter exists but no title field |
| `READ_ERROR` | File read failed (permissions, etc.) |

## Return Type

```typescript
interface GuideManifest {
  guides: DiscoveredGuide[];      // Sorted alphabetically by relativePath
  warnings: GuideDiscoveryWarning[];
  materialsRoot: string;          // Absolute path to materials dir
  discoveredAt: Date;             // Timestamp
}

interface DiscoveredGuide {
  path: string;                   // Absolute path
  relativePath: string;           // Relative to materials root
  slug: string;                   // Extracted from filename
  frontmatter: GuideFrontmatter;
  rawFrontmatter?: string;        // If includeRawFrontmatter option set
}
```

## Performance

- Uses `Bun.Glob` for efficient recursive scanning
- Handles 100+ guides in under 500ms
- Produces deterministic ordering (alphabetical)
