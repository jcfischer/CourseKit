/**
 * CourseKit Type Definitions
 * Core types for course development workflow
 */

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
