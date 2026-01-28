/**
 * Guide File Discovery (F-4)
 *
 * Discovers guide markdown files within materials directories
 * following the materials / ** / guide*.md glob pattern.
 */

import * as path from "node:path";
import type {
  CourseKitConfig,
  DiscoveredGuide,
  GuideFrontmatter,
  GuideDiscoveryOptions,
  GuideDiscoveryWarning,
  GuideManifest,
} from "../types";
import {
  parseGuideFilename,
  parseGuideFrontmatter,
  scanGuideFiles,
} from "./guide-discovery-utils";

/**
 * Discover all guide files in the materials directory.
 *
 * @param config - Loaded CourseKit configuration
 * @param options - Discovery options
 * @returns GuideManifest with guides and warnings
 *
 * @example
 * const config = await loadConfig();
 * const manifest = await discoverGuides(config);
 * console.log(`Found ${manifest.guides.length} guides`);
 */
export async function discoverGuides(
  config: CourseKitConfig,
  options: GuideDiscoveryOptions = {}
): Promise<GuideManifest> {
  const warnings: GuideDiscoveryWarning[] = [];
  const guides: DiscoveredGuide[] = [];

  // Resolve materials root from config
  // For now, use platform.path + "materials" as default
  // This can be made configurable in the future
  const materialsRoot = path.join(config.platform.path, "materials");

  // Check if materials directory exists
  const fs = await import("node:fs");
  if (!fs.existsSync(materialsRoot)) {
    warnings.push({
      code: "MISSING_MATERIALS_DIR",
      message: `Materials directory not found: ${materialsRoot}`,
    });
    return {
      guides: [],
      warnings,
      materialsRoot,
      discoveredAt: new Date(),
    };
  }

  // Scan for guide files
  const filePaths = await scanGuideFiles(materialsRoot, {
    subdirectory: options.subdirectory,
  });

  // Check for empty directory
  if (filePaths.length === 0) {
    warnings.push({
      code: "EMPTY_MATERIALS_DIR",
      message: "No guide files found in materials directory",
    });
    return {
      guides: [],
      warnings,
      materialsRoot,
      discoveredAt: new Date(),
    };
  }

  // Process each file
  for (const relativePath of filePaths) {
    const absolutePath = path.join(materialsRoot, relativePath);
    const filename = path.basename(relativePath);

    // Parse filename for slug
    const parsed = parseGuideFilename(filename);
    if (!parsed) {
      // This shouldn't happen since scanGuideFiles filters, but be safe
      continue;
    }

    // Read file content
    let content: string;
    try {
      content = await Bun.file(absolutePath).text();
    } catch (err) {
      warnings.push({
        code: "READ_ERROR",
        message: `Failed to read file: ${err instanceof Error ? err.message : "Unknown error"}`,
        filePath: absolutePath,
        relativePath,
      });
      continue;
    }

    // Parse frontmatter
    const frontmatterResult = parseGuideFrontmatter(content);

    if (frontmatterResult.error) {
      // Determine specific warning code based on error content
      let warningCode: GuideDiscoveryWarning["code"] = "MALFORMED_FRONTMATTER";

      // Check for YAML parse errors first (highest priority)
      if (frontmatterResult.error.includes("YAML parse error")) {
        warningCode = "MALFORMED_FRONTMATTER";
      } else if (
        // Check for title-related validation errors
        frontmatterResult.error.includes("Guide must have a title") ||
        frontmatterResult.error.includes("expected string, received undefined")
      ) {
        warningCode = "MISSING_TITLE";
      }

      warnings.push({
        code: warningCode,
        message: frontmatterResult.error,
        filePath: absolutePath,
        relativePath,
      });

      // Still include the file but with empty/default frontmatter
      guides.push({
        path: absolutePath,
        relativePath,
        slug: parsed.slug,
        frontmatter: { title: "" } as GuideFrontmatter,
        ...(options.includeRawFrontmatter && frontmatterResult.raw
          ? { rawFrontmatter: frontmatterResult.raw }
          : {}),
      });
      continue;
    }

    // Build discovered guide
    const guide: DiscoveredGuide = {
      path: absolutePath,
      relativePath,
      slug: parsed.slug,
      frontmatter: frontmatterResult.frontmatter!,
    };

    // Include raw frontmatter if requested
    if (options.includeRawFrontmatter && frontmatterResult.raw) {
      guide.rawFrontmatter = frontmatterResult.raw;
    }

    guides.push(guide);
  }

  // Sort guides alphabetically by relativePath (should already be sorted from scan)
  guides.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return {
    guides,
    warnings,
    materialsRoot,
    discoveredAt: new Date(),
  };
}
