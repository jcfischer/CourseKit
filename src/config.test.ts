/**
 * Tests for config loading (F-1)
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  loadConfig,
  ConfigNotFoundError,
  ConfigParseError,
  ConfigValidationError,
} from "./config";

describe("loadConfig", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "coursekit-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function writeConfig(config: unknown) {
    writeFileSync(
      join(tempDir, "coursekit.json"),
      JSON.stringify(config, null, 2)
    );
  }

  test("loads valid config successfully", async () => {
    // Create platform dir
    const platformPath = join(tempDir, "platform");
    mkdirSync(platformPath);

    writeConfig({
      platform: { path: "./platform" },
      courses: {
        "my-course": {
          slug: "my-course",
          sourceDir: "courses/c-001",
        },
      },
    });

    const config = await loadConfig(tempDir);

    expect(config.platform.path).toBe(platformPath);
    expect(config.courses["my-course"].slug).toBe("my-course");
    expect(config.courses["my-course"].sourceDir).toBe("courses/c-001");
  });

  test("resolves relative platform path against cwd", async () => {
    const platformPath = join(tempDir, "nested", "platform");
    mkdirSync(platformPath, { recursive: true });

    writeConfig({
      platform: { path: "./nested/platform" },
      courses: {},
    });

    const config = await loadConfig(tempDir);

    expect(config.platform.path).toBe(platformPath);
  });

  test("throws ConfigNotFoundError when file missing", async () => {
    await expect(loadConfig(tempDir)).rejects.toBeInstanceOf(
      ConfigNotFoundError
    );
  });

  test("ConfigNotFoundError includes path and help message", async () => {
    try {
      await loadConfig(tempDir);
      throw new Error("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigNotFoundError);
      const e = err as ConfigNotFoundError;
      expect(e.configPath).toContain("coursekit.json");
      expect(e.message).toContain("coursekit init");
    }
  });

  test("throws ConfigParseError on invalid JSON", async () => {
    writeFileSync(join(tempDir, "coursekit.json"), "{ invalid json }");

    await expect(loadConfig(tempDir)).rejects.toBeInstanceOf(ConfigParseError);
  });

  test("ConfigParseError includes original error message", async () => {
    writeFileSync(join(tempDir, "coursekit.json"), "{ not: valid }");

    try {
      await loadConfig(tempDir);
      throw new Error("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigParseError);
      const e = err as ConfigParseError;
      expect(e.message).toContain("Invalid JSON");
    }
  });

  test("throws ConfigValidationError when platform.path missing", async () => {
    writeConfig({
      platform: {},
      courses: {},
    });

    await expect(loadConfig(tempDir)).rejects.toBeInstanceOf(
      ConfigValidationError
    );
  });

  test("throws ConfigValidationError for empty platform.path", async () => {
    writeConfig({
      platform: { path: "" },
      courses: {},
    });

    try {
      await loadConfig(tempDir);
      throw new Error("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigValidationError);
      const e = err as ConfigValidationError;
      expect(e.message).toContain("platform.path");
    }
  });

  test("throws ConfigValidationError when platform directory does not exist", async () => {
    writeConfig({
      platform: { path: "./nonexistent" },
      courses: {},
    });

    try {
      await loadConfig(tempDir);
      throw new Error("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigValidationError);
      const e = err as ConfigValidationError;
      expect(e.message).toContain("Platform directory not found");
    }
  });

  test("accepts config with optional platform.remote", async () => {
    const platformPath = join(tempDir, "platform");
    mkdirSync(platformPath);

    writeConfig({
      platform: {
        path: "./platform",
        remote: "git@github.com:user/repo.git",
      },
      courses: {},
    });

    const config = await loadConfig(tempDir);

    expect(config.platform.remote).toBe("git@github.com:user/repo.git");
  });

  test("accepts empty courses object", async () => {
    const platformPath = join(tempDir, "platform");
    mkdirSync(platformPath);

    writeConfig({
      platform: { path: "./platform" },
      courses: {},
    });

    const config = await loadConfig(tempDir);

    expect(Object.keys(config.courses)).toHaveLength(0);
  });

  test("validates course mapping has required fields", async () => {
    const platformPath = join(tempDir, "platform");
    mkdirSync(platformPath);

    writeConfig({
      platform: { path: "./platform" },
      courses: {
        "my-course": {
          slug: "my-course",
          // missing sourceDir
        },
      },
    });

    await expect(loadConfig(tempDir)).rejects.toBeInstanceOf(
      ConfigValidationError
    );
  });
});
