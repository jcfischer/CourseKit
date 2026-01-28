/**
 * Asset File Discovery (F-5)
 *
 * Discovers asset files in materials/assets directories.
 * Assets are non-markdown files like images, PDFs, videos.
 */

import * as path from "node:path";
import * as fs from "node:fs";
import type {
  AssetDiscoveryOptions,
  AssetDiscoveryWarning,
  AssetManifest,
  CourseKitConfig,
  DiscoveredAsset,
} from "../types";
import {
  detectMimeType,
  getFileSize,
  scanAssetFiles,
} from "./asset-discovery-utils";

/**
 * Error thrown when asset discovery fails critically.
 */
export class AssetDiscoveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssetDiscoveryError";
  }
}

/**
 * Discover all asset files in the materials directory.
 *
 * @param config - Loaded CourseKit configuration
 * @param options - Discovery options
 * @returns AssetManifest with assets and warnings
 *
 * @example
 * const config = await loadConfig();
 * const manifest = await discoverAssets(config);
 * console.log(`Found ${manifest.assets.length} assets (${manifest.totalSize} bytes)`);
 */
export async function discoverAssets(
  config: CourseKitConfig,
  options: AssetDiscoveryOptions = {}
): Promise<AssetManifest> {
  const warnings: AssetDiscoveryWarning[] = [];
  const assets: DiscoveredAsset[] = [];
  let totalSize = 0;

  // Resolve materials root from config
  const materialsRoot = path.join(config.platform.path, "materials");

  // Check if materials directory exists
  if (!fs.existsSync(materialsRoot)) {
    warnings.push({
      code: "MISSING_MATERIALS_DIR",
      message: `Materials directory not found: ${materialsRoot}`,
    });
    return {
      assets: [],
      warnings,
      materialsRoot,
      totalSize: 0,
      discoveredAt: new Date(),
    };
  }

  // Scan for asset files
  const filePaths = await scanAssetFiles(materialsRoot, {
    subdirectory: options.subdirectory,
  });

  // Process each file
  for (const relativePath of filePaths) {
    const absolutePath = path.join(materialsRoot, relativePath);
    const extension = path.extname(relativePath).slice(1).toLowerCase();
    const mimeType = detectMimeType(relativePath);

    // Apply MIME type filter if specified
    if (options.mimeTypes && !options.mimeTypes.includes(mimeType)) {
      continue;
    }

    // Get file size
    let size: number;
    try {
      size = getFileSize(absolutePath);
    } catch (err) {
      const isPermissionError =
        err instanceof Error && err.message.includes("Permission denied");
      warnings.push({
        code: isPermissionError ? "PERMISSION_DENIED" : "STAT_ERROR",
        message: err instanceof Error ? err.message : "Unknown error",
        filePath: absolutePath,
        relativePath,
      });
      continue;
    }

    // Build discovered asset
    const asset: DiscoveredAsset = {
      path: absolutePath,
      relativePath,
      extension,
      mimeType,
      size,
    };

    assets.push(asset);
    totalSize += size;
  }

  // Sort assets alphabetically by relativePath (should already be sorted from scan)
  assets.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return {
    assets,
    warnings,
    materialsRoot,
    totalSize,
    discoveredAt: new Date(),
  };
}
