/**
 * CourseKit Type Definitions
 * Core types for course development workflow
 */

// =============================================================================
// Sync Configuration (F-1)
// =============================================================================

/** Mapping between a course slug and its source directory */
export interface CourseMapping {
  slug: string;
  sourceDir: string;
}

/** Platform repository configuration */
export interface PlatformConfig {
  path: string;
  remote?: string;
}

/** Top-level coursekit.json configuration */
export interface CourseKitConfig {
  platform: PlatformConfig;
  courses: Record<string, CourseMapping>;
}

// =============================================================================
// Lesson Discovery (F-2)
// =============================================================================

/** Parsed lesson frontmatter - all fields optional */
export interface LessonFrontmatter {
  courseSlug?: string;
  moduleId?: string;
  title?: string;
  description?: string;
  order?: number;
  durationMinutes?: number;
  resources?: Array<{ label: string; path: string }>;
  [key: string]: unknown; // Allow additional fields
}

/** A discovered lesson file with metadata */
export interface DiscoveredLesson {
  /** Absolute path to the lesson file */
  path: string;
  /** Relative path from source root */
  relativePath: string;
  /** Course ID (directory name) */
  courseId: string;
  /** Order extracted from filename (e.g., 01 from 01-intro.md) */
  order: number;
  /** Slug extracted from filename (e.g., intro from 01-intro.md) */
  slug: string;
  /** Parsed frontmatter */
  frontmatter: LessonFrontmatter;
  /** Raw frontmatter string (for debugging) */
  rawFrontmatter?: string;
}

/** Warning codes for non-fatal discovery issues */
export type DiscoveryWarningCode =
  | "INVALID_FILENAME"
  | "MALFORMED_FRONTMATTER"
  | "MISSING_LESSONS_DIR"
  | "EMPTY_LESSONS_DIR"
  | "READ_ERROR";

/** A non-fatal issue encountered during discovery */
export interface DiscoveryWarning {
  /** File path related to the warning */
  path: string;
  /** Warning type code */
  code: DiscoveryWarningCode;
  /** Human-readable message */
  message: string;
}

/** Complete result of lesson discovery */
export interface LessonManifest {
  /** All discovered lessons, sorted by course then order */
  lessons: DiscoveredLesson[];
  /** Non-fatal warnings encountered */
  warnings: DiscoveryWarning[];
  /** Source root path used */
  sourceRoot: string;
  /** Timestamp of discovery */
  discoveredAt: Date;
}

/** Options for the discovery function */
export interface DiscoveryOptions {
  /** Discover only this course (default: all courses) */
  courseId?: string;
  /** Include raw frontmatter in results (default: false) */
  includeRaw?: boolean;
  /** Explicit source root path (default: derived from config or cwd) */
  sourceRoot?: string;
}

// =============================================================================
// Frontmatter Validation (F-3)
// =============================================================================

/** A single validation issue for a file */
export interface ValidationIssue {
  /** Field that failed validation (or "frontmatter" for missing) */
  field: string;
  /** Human-readable error message */
  message: string;
  /** Suggestion for how to fix */
  suggestion?: string;
}

/** Validation result for a single file */
export interface FileValidation {
  /** Path to the file */
  filePath: string;
  /** Relative path from source root */
  relativePath: string;
  /** Whether the file passed validation */
  valid: boolean;
  /** List of validation errors (empty if valid) */
  errors: ValidationIssue[];
}

/** A warning about potential issues (not blocking) */
export interface ValidationWarning {
  /** Warning type code */
  code: "DUPLICATE_ORDER";
  /** Human-readable message */
  message: string;
  /** Files involved */
  files: string[];
}

/** Complete validation result for all files */
export interface ValidationResult {
  /** Whether all files passed validation */
  valid: boolean;
  /** Total number of files checked */
  totalFiles: number;
  /** Number of valid files */
  validFiles: number;
  /** Number of invalid files */
  invalidFiles: number;
  /** Validation results for invalid files only */
  files: FileValidation[];
  /** Non-blocking warnings (e.g., duplicate orders) */
  warnings: ValidationWarning[];
}

// =============================================================================
// Guide Discovery (F-4)
// =============================================================================

/**
 * Parsed frontmatter from a guide file.
 * More permissive than lesson frontmatter - guides are supplementary.
 */
export interface GuideFrontmatter {
  /** Required: guide title */
  title: string;
  /** Optional: brief description */
  description?: string;
  /** Allow extra fields (passthrough) */
  [key: string]: unknown;
}

/**
 * A discovered guide file with parsed metadata.
 * Mirrors DiscoveredLesson structure for consistency.
 */
export interface DiscoveredGuide {
  /** Absolute path to the guide file */
  path: string;
  /** Path relative to materials root (e.g., "module-01/guide-setup.md") */
  relativePath: string;
  /** Slug extracted from filename (e.g., "setup" from "guide-setup.md") */
  slug: string;
  /** Parsed YAML frontmatter */
  frontmatter: GuideFrontmatter;
  /** Raw frontmatter string (optional, for debugging) */
  rawFrontmatter?: string;
}

/** Warning codes for guide discovery issues */
export type GuideDiscoveryWarningCode =
  | "MISSING_MATERIALS_DIR"
  | "EMPTY_MATERIALS_DIR"
  | "MALFORMED_FRONTMATTER"
  | "MISSING_TITLE"
  | "READ_ERROR";

/** A warning from guide discovery (non-fatal) */
export interface GuideDiscoveryWarning {
  /** Warning type code */
  code: GuideDiscoveryWarningCode;
  /** Human-readable message */
  message: string;
  /** Absolute path if file-specific */
  filePath?: string;
  /** Relative path for display */
  relativePath?: string;
}

/** Result of guide discovery operation */
export interface GuideManifest {
  /** All discovered guide files, sorted alphabetically by relativePath */
  guides: DiscoveredGuide[];
  /** Non-fatal issues encountered during discovery */
  warnings: GuideDiscoveryWarning[];
  /** Root directory that was scanned */
  materialsRoot: string;
  /** Timestamp of discovery operation */
  discoveredAt: Date;
}

/** Options for guide discovery */
export interface GuideDiscoveryOptions {
  /** Include raw frontmatter string in results (default: false) */
  includeRawFrontmatter?: boolean;
  /** Filter to guides in a specific subdirectory (e.g., "module-01") */
  subdirectory?: string;
}

// =============================================================================
// Asset Discovery (F-5)
// =============================================================================

/**
 * A discovered asset file with metadata.
 * Assets are non-markdown files in materials/assets directories.
 */
export interface DiscoveredAsset {
  /** Absolute path to the asset file */
  path: string;
  /** Path relative to materials root (e.g., "module-01/assets/diagram.png") */
  relativePath: string;
  /** File extension without dot (e.g., "png", "pdf") */
  extension: string;
  /** MIME type (e.g., "image/png", "application/pdf") */
  mimeType: string;
  /** File size in bytes */
  size: number;
}

/** Warning codes for asset discovery issues */
export type AssetDiscoveryWarningCode =
  | "MISSING_MATERIALS_DIR"
  | "STAT_ERROR"
  | "PERMISSION_DENIED";

/** A warning from asset discovery (non-fatal) */
export interface AssetDiscoveryWarning {
  /** Warning type code */
  code: AssetDiscoveryWarningCode;
  /** Human-readable message */
  message: string;
  /** Absolute path if file-specific */
  filePath?: string;
  /** Relative path for display */
  relativePath?: string;
}

/** Result of asset discovery operation */
export interface AssetManifest {
  /** All discovered asset files, sorted alphabetically by relativePath */
  assets: DiscoveredAsset[];
  /** Non-fatal issues encountered during discovery */
  warnings: AssetDiscoveryWarning[];
  /** Root directory that was scanned */
  materialsRoot: string;
  /** Total size of all assets in bytes */
  totalSize: number;
  /** Timestamp of discovery operation */
  discoveredAt: Date;
}

/** Options for asset discovery */
export interface AssetDiscoveryOptions {
  /** Filter to assets in a specific subdirectory (e.g., "module-01") */
  subdirectory?: string;
  /** Filter to specific MIME types (e.g., ["image/png", "image/jpeg"]) */
  mimeTypes?: string[];
}

// =============================================================================
// Platform State Reading (F-6)
// =============================================================================

/**
 * Platform-owned fields that should be preserved during sync.
 * These are managed by the platform (commerce, analytics, etc.).
 */
export interface PlatformOwnedFields {
  /** Price in cents */
  price?: number;
  /** LemonSqueezy product ID */
  lemonSqueezyProductId?: string;
  /** Number of enrollments */
  enrollmentCount?: number;
  /** When the content was published on platform */
  publishedAt?: string;
  /** Allow additional platform-specific fields */
  [key: string]: unknown;
}

/**
 * A lesson file read from the platform.
 */
export interface PlatformLesson {
  /** Absolute path to the platform file */
  path: string;
  /** Path relative to platform content root */
  relativePath: string;
  /** Course ID extracted from path */
  courseId: string;
  /** Filename without extension */
  slug: string;
  /** Parsed frontmatter */
  frontmatter: Record<string, unknown>;
  /** Platform-owned fields extracted from frontmatter */
  platformFields: PlatformOwnedFields;
  /** SHA-256 hash of body content (excluding frontmatter) */
  contentHash: string;
}

/**
 * A guide file read from the platform.
 */
export interface PlatformGuide {
  /** Absolute path to the platform file */
  path: string;
  /** Path relative to platform content root */
  relativePath: string;
  /** Course ID extracted from path */
  courseId: string;
  /** Filename without extension */
  slug: string;
  /** Parsed frontmatter */
  frontmatter: Record<string, unknown>;
  /** Platform-owned fields extracted from frontmatter */
  platformFields: PlatformOwnedFields;
  /** SHA-256 hash of body content (excluding frontmatter) */
  contentHash: string;
}

/** Warning codes for platform state reading issues */
export type PlatformStateWarningCode =
  | "MISSING_CONTENT_DIR"
  | "MALFORMED_FRONTMATTER"
  | "READ_ERROR"
  | "EMPTY_CONTENT";

/** A warning from platform state reading (non-fatal) */
export interface PlatformStateWarning {
  /** Warning type code */
  code: PlatformStateWarningCode;
  /** Human-readable message */
  message: string;
  /** Absolute path if file-specific */
  filePath?: string;
  /** Relative path for display */
  relativePath?: string;
}

/** Result of platform state reading operation */
export interface PlatformStateManifest {
  /** All lessons grouped by courseId */
  lessons: PlatformLesson[];
  /** All guides grouped by courseId */
  guides: PlatformGuide[];
  /** Non-fatal issues encountered */
  warnings: PlatformStateWarning[];
  /** Platform root that was scanned */
  platformRoot: string;
  /** Timestamp of read operation */
  readAt: Date;
}

/** Options for platform state reading */
export interface PlatformStateOptions {
  /** Filter to a specific course ID */
  courseId?: string;
  /** Include only lessons (skip guides) */
  lessonsOnly?: boolean;
  /** Include only guides (skip lessons) */
  guidesOnly?: boolean;
}

/** Default platform-owned fields to protect during sync */
export const DEFAULT_PROTECTED_FIELDS = [
  "price",
  "lemonSqueezyProductId",
  "enrollmentCount",
  "publishedAt",
];

// =============================================================================
// Course Status & Phase
// =============================================================================

/**
 * Status of a course in the queue
 */
export type CourseStatus = "draft" | "in_progress" | "ready" | "launched" | "archived";

/**
 * CourseKit phase for a course
 * Each course progresses through: define -> design -> develop -> produce -> launch
 */
export type CoursePhase = "none" | "define" | "design" | "develop" | "produce" | "launch";

/**
 * Course context type
 */
export type CourseContext = "online" | "university";

/**
 * Bloom's Taxonomy levels
 */
export type BloomLevel = "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";

// =============================================================================
// Course
// =============================================================================

/**
 * A course in the development queue
 */
export interface Course {
  /** Unique course ID (e.g., "C-001") */
  id: string;
  /** Course name */
  name: string;
  /** Course description */
  description: string;
  /** Context: online or university */
  context: CourseContext;
  /** Current status */
  status: CourseStatus;
  /** Current phase */
  phase: CoursePhase;
  /** Path to course directory */
  coursePath: string | null;
  /** When the course was created */
  createdAt: Date;
  /** When development started */
  startedAt: Date | null;
  /** When course was launched */
  launchedAt: Date | null;
}

// =============================================================================
// Module & Lesson
// =============================================================================

/**
 * Lesson status
 */
export type LessonStatus = "planned" | "drafted" | "recorded" | "edited" | "published";

/**
 * A lesson within a module
 */
export interface Lesson {
  /** Lesson ID within module (e.g., "L1", "L2") */
  id: string;
  /** Lesson title */
  title: string;
  /** Learning objective (with Bloom verb) */
  objective: string;
  /** Bloom level */
  bloomLevel: BloomLevel;
  /** Estimated duration in minutes */
  duration: number;
  /** Current status */
  status: LessonStatus;
  /** Path to lesson materials */
  materialsPath: string | null;
  /** Has practice activity? */
  hasPractice: boolean;
  /** Has assessment item? */
  hasAssessment: boolean;
}

/**
 * A module within a course
 */
export interface Module {
  /** Module ID (e.g., "M1", "M2") */
  id: string;
  /** Module name */
  name: string;
  /** Module objective */
  objective: string;
  /** Lessons in this module */
  lessons: Lesson[];
  /** Module assessment type */
  assessmentType: string | null;
  /** Week range (for university context) */
  weekRange: string | null;
}

// =============================================================================
// Learning Objective
// =============================================================================

/**
 * A learning objective with Bloom's taxonomy metadata
 */
export interface LearningObjective {
  /** Objective ID */
  id: string;
  /** The objective text */
  text: string;
  /** Bloom's taxonomy level */
  bloomLevel: BloomLevel;
  /** The action verb used */
  verb: string;
  /** Assessment method */
  assessmentMethod: string | null;
  /** Which module/lesson covers this */
  coveredBy: string | null;
}

// =============================================================================
// Course Definition (Phase 1 output)
// =============================================================================

/**
 * Output of the DEFINE phase
 */
export interface CourseDefinition {
  /** Course ID */
  courseId: string;
  /** Target audience description */
  audience: {
    description: string;
    priorKnowledge: string[];
    constraints: string[];
  };
  /** Learning objectives */
  objectives: LearningObjective[];
  /** Assessment strategy */
  assessmentStrategy: {
    objectiveId: string;
    method: string;
    timing: string;
  }[];
  /** Course context details */
  context: {
    format: CourseContext;
    duration: string;
    sessionLength: string;
  };
  /** Scope boundaries */
  scope: {
    inScope: string[];
    outOfScope: string[];
  };
}

// =============================================================================
// Course Design (Phase 2 output)
// =============================================================================

/**
 * Output of the DESIGN phase
 */
export interface CourseDesign {
  /** Course ID */
  courseId: string;
  /** Module structure */
  modules: Module[];
  /** Learning path (dependency graph) */
  learningPath: {
    from: string;
    to: string;
    optional: boolean;
  }[];
  /** Engagement strategy */
  engagement: {
    practicePerModule: number;
    communityActivities: string[];
    projects: string[];
  };
  /** Time budget */
  timeBudget: {
    videos: number;
    exercises: number;
    projects: number;
    total: number;
  };
}

// =============================================================================
// Development Tasks (Phase 3 output)
// =============================================================================

/**
 * Task status
 */
export type TaskStatus = "pending" | "in_progress" | "completed" | "blocked";

/**
 * A development task for a lesson
 */
export interface DevelopmentTask {
  /** Task ID */
  id: string;
  /** Lesson path (e.g., "M1/L2") */
  lessonPath: string;
  /** Task type */
  type: "script" | "slides" | "exercise" | "assessment" | "support";
  /** Task description */
  description: string;
  /** Current status */
  status: TaskStatus;
  /** Blocked reason (if blocked) */
  blockedReason: string | null;
}

// =============================================================================
// Production Tracking (Phase 4 output)
// =============================================================================

/**
 * Production status for a lesson
 */
export interface ProductionStatus {
  /** Lesson path */
  lessonPath: string;
  /** Recording complete? */
  recorded: boolean;
  /** Editing complete? */
  edited: boolean;
  /** Uploaded to platform? */
  uploaded: boolean;
  /** Access tested? */
  accessTested: boolean;
  /** Notes */
  notes: string | null;
}

// =============================================================================
// Course Stats
// =============================================================================

/**
 * Aggregate statistics about course development
 */
export interface CourseStats {
  /** Total courses */
  totalCourses: number;
  /** Courses by phase */
  byPhase: Record<CoursePhase, number>;
  /** Courses by status */
  byStatus: Record<CourseStatus, number>;
}

/**
 * Statistics for a single course
 */
export interface SingleCourseStats {
  /** Course ID */
  courseId: string;
  /** Total modules */
  totalModules: number;
  /** Total lessons */
  totalLessons: number;
  /** Lessons by status */
  lessonsByStatus: Record<LessonStatus, number>;
  /** Development tasks */
  tasksTotal: number;
  /** Tasks completed */
  tasksCompleted: number;
  /** Percentage complete */
  percentComplete: number;
}

// =============================================================================
// Bloom's Taxonomy Helpers
// =============================================================================

/**
 * Bloom's taxonomy action verbs by level
 */
export const BLOOM_VERBS: Record<BloomLevel, string[]> = {
  remember: ["list", "define", "recall", "identify", "name", "state", "describe"],
  understand: ["explain", "summarize", "paraphrase", "classify", "compare", "interpret"],
  apply: ["use", "demonstrate", "implement", "execute", "solve", "apply", "show"],
  analyze: ["differentiate", "organize", "attribute", "compare", "contrast", "examine"],
  evaluate: ["assess", "critique", "judge", "justify", "evaluate", "argue", "defend"],
  create: ["design", "construct", "produce", "develop", "formulate", "build", "compose"],
};

/**
 * Detect Bloom level from an objective text
 */
export function detectBloomLevel(objective: string): BloomLevel | null {
  const lowerObjective = objective.toLowerCase();
  for (const [level, verbs] of Object.entries(BLOOM_VERBS)) {
    for (const verb of verbs) {
      if (lowerObjective.includes(verb)) {
        return level as BloomLevel;
      }
    }
  }
  return null;
}

// =============================================================================
// Diff Calculation (F-7)
// =============================================================================

/**
 * Status of a file when comparing source to platform.
 */
export type DiffStatus = "added" | "modified" | "removed" | "unchanged";

/**
 * A single field that changed between source and platform.
 */
export interface FieldChange {
  /** Field name that changed */
  field: string;
  /** Value in source (undefined if removed) */
  sourceValue?: unknown;
  /** Value on platform (undefined if added) */
  platformValue?: unknown;
  /** Type of change */
  changeType: "added" | "modified" | "removed";
}

/**
 * A single item in the diff result.
 */
export interface DiffItem {
  /** Canonical key for the item (courseId/slug) */
  key: string;
  /** Course ID */
  courseId: string;
  /** Content slug */
  slug: string;
  /** Diff status */
  status: DiffStatus;
  /** Source file path (undefined if removed) */
  sourcePath?: string;
  /** Platform file path (undefined if added) */
  platformPath?: string;
  /** Field-level changes (populated for modified items) */
  changes: FieldChange[];
  /** Whether body content changed (based on hash comparison) */
  bodyChanged: boolean;
}

/**
 * Summary statistics for a diff operation.
 */
export interface DiffSummary {
  /** Total items compared */
  total: number;
  /** Items only in source (to be added to platform) */
  added: number;
  /** Items that differ between source and platform */
  modified: number;
  /** Items only on platform (to be removed) */
  removed: number;
  /** Items identical in source and platform */
  unchanged: number;
}

/**
 * Complete result of a diff operation.
 */
export interface DiffResult {
  /** Content type being compared */
  contentType: "lessons" | "guides";
  /** All diff items, sorted by status then key */
  items: DiffItem[];
  /** Summary statistics */
  summary: DiffSummary;
  /** Timestamp of diff operation */
  calculatedAt: Date;
}

/**
 * Options for diff calculation.
 */
export interface DiffOptions {
  /** Filter to a specific course ID */
  courseId?: string;
  /** Include unchanged items in results (default: false) */
  includeUnchanged?: boolean;
}

// =============================================================================
// Conflict Detection (F-8)
// =============================================================================

/**
 * Record of a single synced file, stored in .coursekit-sync.json.
 */
export interface SyncRecord {
  /** Relative path of the synced file in the platform */
  filePath: string;
  /** SHA-256 hash of file content at time of last successful sync */
  contentHash: string;
  /** ISO 8601 timestamp of last successful sync */
  syncedAt: string;
  /** Which source repository the file came from */
  sourceRepo: string;
}

/**
 * Complete sync state stored in .coursekit-sync.json.
 */
export interface SyncState {
  /** Schema version for migration support */
  version: number;
  /** Map of canonical key (courseId/slug) to sync record */
  records: Record<string, SyncRecord>;
  /** ISO 8601 timestamp of last sync operation */
  lastSync: string | null;
}

/**
 * Type of conflict detected between platform and sync state.
 */
export type ConflictType = "modified" | "deleted" | "new_on_platform";

/**
 * A single conflict item detected during push.
 */
export interface ConflictItem {
  /** Canonical key (courseId/slug) */
  key: string;
  /** Path to file on platform (if exists) */
  platformPath?: string;
  /** Expected hash from sync state */
  expectedHash?: string;
  /** Current hash of platform file */
  currentHash?: string;
  /** When the file was last synced */
  lastSyncedAt?: string;
  /** Type of conflict */
  conflictType: ConflictType;
  /** Human-readable summary of the conflict */
  changeSummary: string;
}

/**
 * Result of conflict detection operation.
 */
export interface ConflictDetectionResult {
  /** Whether any conflicts were detected */
  hasConflicts: boolean;
  /** List of all conflicts found */
  conflicts: ConflictItem[];
  /** Total number of files checked */
  totalChecked: number;
}

/**
 * Options for conflict detection.
 */
export interface ConflictDetectionOptions {
  /** Filter to a specific course ID */
  courseId?: string;
}

/**
 * Options for the push command.
 */
export interface PushOptions {
  /** Force push even with conflicts */
  force?: boolean;
  /** Show what would change without writing */
  dryRun?: boolean;
  /** Filter to specific course ID */
  course?: string;
}

// =============================================================================
// Lesson Sync Execution (F-9)
// =============================================================================

/**
 * Options for sync execution.
 */
export interface SyncOptions {
  /** Preview changes without writing files */
  dryRun?: boolean;
  /** Overwrite conflicting files */
  force?: boolean;
  /** Filter to specific course ID */
  courseId?: string;
  /** Filter to specific lesson slug */
  slug?: string;
}

/**
 * An error that occurred during sync.
 */
export interface SyncError {
  /** Canonical key (courseId/slug) of the file */
  key: string;
  /** Error that occurred */
  error: Error;
  /** Human-readable error message */
  message: string;
}

/**
 * Summary of sync operation counts.
 */
export interface SyncSummary {
  /** Total files processed */
  total: number;
  /** Files created on platform */
  created: number;
  /** Files updated on platform */
  updated: number;
  /** Files unchanged (skipped) */
  unchanged: number;
  /** Files skipped due to conflicts */
  skipped: number;
  /** Files with errors */
  errors: number;
}

/**
 * Result of a sync operation.
 */
export interface SyncResult {
  /** Whether sync completed successfully (no conflicts/errors blocking) */
  success: boolean;
  /** Keys of files that were created */
  created: string[];
  /** Keys of files that were updated */
  updated: string[];
  /** Keys of files that were unchanged */
  unchanged: string[];
  /** Keys of files skipped due to conflicts */
  skipped: string[];
  /** Errors encountered during sync */
  errors: SyncError[];
  /** Summary counts */
  summary: SyncSummary;
  /** Whether this was a dry run */
  dryRun: boolean;
}
