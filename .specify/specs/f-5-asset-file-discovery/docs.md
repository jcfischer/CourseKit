# F-5: Asset File Discovery - Documentation

## Files Created

### New Files
- `src/lib/asset-discovery.ts` - Main discovery function
- `src/lib/asset-discovery.test.ts` - Discovery tests (23 tests)
- `src/lib/asset-discovery-utils.ts` - MIME detection, file stats, scanning utilities
- `src/lib/asset-discovery-utils.test.ts` - Utility tests (20 tests)

### Modified Files
- `src/types.ts` - Added asset discovery types

### Test Fixtures
- `test-fixtures/assets/flat-structure/` - Single assets directory
- `test-fixtures/assets/nested-structure/` - Multi-level nesting
- `test-fixtures/assets/empty-assets/` - Empty assets directory
- `test-fixtures/assets/no-assets/` - Materials without assets
- `test-fixtures/assets/mixed-types/` - Various file types

## Usage

```typescript
import { discoverAssets } from "./lib/asset-discovery";
import { loadConfig } from "./config";

// Load configuration
const config = await loadConfig();

// Discover all assets
const manifest = await discoverAssets(config);

console.log(`Found ${manifest.assets.length} assets`);
console.log(`Total size: ${manifest.totalSize} bytes`);

// Process discovered assets
for (const asset of manifest.assets) {
  console.log(`- ${asset.relativePath} (${asset.mimeType}, ${asset.size} bytes)`);
}

// Check for warnings
if (manifest.warnings.length > 0) {
  console.log(`\n${manifest.warnings.length} warnings:`);
  for (const warning of manifest.warnings) {
    console.log(`  [${warning.code}] ${warning.message}`);
  }
}
```

## Asset Discovery Pattern

Assets must be located in directories named `assets/` within the materials tree:

```
materials/
├── assets/                    # Root-level assets
│   ├── diagram.png
│   └── cheatsheet.pdf
├── module-01/
│   └── assets/               # Module-specific assets
│       └── screenshot.png
└── module-02/
    └── advanced/
        └── assets/           # Deeply nested assets
            └── architecture.svg
```

## MIME Type Detection

MIME types are detected by file extension:

| Category | Extensions |
|----------|------------|
| Images | png, jpg, jpeg, gif, svg, webp, bmp, tiff |
| Documents | pdf, doc, docx, xls, xlsx, ppt, pptx |
| Videos | mp4, webm, mov, avi, mkv |
| Audio | mp3, wav, ogg, m4a, flac |
| Data | json, xml, csv, txt |
| Archives | zip, tar, gz, 7z |

Unknown extensions default to `application/octet-stream`.

## Discovery Options

```typescript
interface AssetDiscoveryOptions {
  // Filter to assets in a specific subdirectory
  subdirectory?: string;

  // Filter to specific MIME types
  mimeTypes?: string[];
}

// Example: Only images from module-01
const manifest = await discoverAssets(config, {
  subdirectory: "module-01",
  mimeTypes: ["image/png", "image/jpeg", "image/svg+xml"]
});
```

## Warning Codes

| Code | Meaning |
|------|---------|
| `MISSING_MATERIALS_DIR` | materials/ directory doesn't exist |
| `STAT_ERROR` | Could not get file stats |
| `PERMISSION_DENIED` | File access denied |

## Return Type

```typescript
interface AssetManifest {
  assets: DiscoveredAsset[];      // Sorted by relativePath
  warnings: AssetDiscoveryWarning[];
  materialsRoot: string;          // Absolute path
  totalSize: number;              // Sum of all asset sizes
  discoveredAt: Date;
}

interface DiscoveredAsset {
  path: string;                   // Absolute path
  relativePath: string;           // Relative to materials root
  extension: string;              // Without dot (e.g., "png")
  mimeType: string;               // Detected MIME type
  size: number;                   // File size in bytes
}
```

## Performance

- Uses `Bun.Glob` for efficient recursive scanning
- Metadata-only operations (stat, not read)
- 500+ assets in under 500ms
- Deterministic alphabetical ordering
