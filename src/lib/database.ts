/**
 * CourseKit Database Operations
 * SQLite operations for course tracking using Bun's native SQLite
 */

import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import type {
  Course,
  CourseStatus,
  CoursePhase,
  CourseContext,
  CourseStats,
} from "../types";

// =============================================================================
// Database Path
// =============================================================================

const COURSEKIT_DIR = ".coursekit";
const DB_NAME = "courses.db";

/**
 * Find the coursekit database, searching up from cwd
 */
export function findDatabase(): string | null {
  let dir = process.cwd();
  const root = dirname(dir);

  while (dir !== root) {
    const dbPath = join(dir, COURSEKIT_DIR, DB_NAME);
    if (existsSync(dbPath)) {
      return dbPath;
    }
    dir = dirname(dir);
  }

  return null;
}

/**
 * Get or create database path in current directory
 */
export function getDatabasePath(): string {
  const dir = join(process.cwd(), COURSEKIT_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return join(dir, DB_NAME);
}

// =============================================================================
// Database Connection
// =============================================================================

let db: Database | null = null;

/**
 * Get database connection (creates if needed)
 */
export function getDatabase(create = false): Database {
  if (db) return db;

  const dbPath = create ? getDatabasePath() : findDatabase();
  if (!dbPath) {
    throw new Error(
      "No CourseKit database found. Run 'coursekit init' first."
    );
  }

  db = new Database(dbPath);
  db.exec("PRAGMA journal_mode = WAL");

  return db;
}

/**
 * Initialize database schema
 */
export function initDatabase(): void {
  const database = getDatabase(true);

  database.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      context TEXT NOT NULL DEFAULT 'online',
      status TEXT NOT NULL DEFAULT 'draft',
      phase TEXT NOT NULL DEFAULT 'none',
      course_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      started_at TEXT,
      launched_at TEXT
    );

    CREATE TABLE IF NOT EXISTS modules (
      id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      name TEXT NOT NULL,
      objective TEXT,
      assessment_type TEXT,
      week_range TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (course_id, id),
      FOREIGN KEY (course_id) REFERENCES courses(id)
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT NOT NULL,
      module_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      title TEXT NOT NULL,
      objective TEXT,
      bloom_level TEXT,
      duration INTEGER DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'planned',
      materials_path TEXT,
      has_practice INTEGER DEFAULT 0,
      has_assessment INTEGER DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (course_id, module_id, id),
      FOREIGN KEY (course_id, module_id) REFERENCES modules(course_id, id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      lesson_path TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      blocked_reason TEXT,
      FOREIGN KEY (course_id) REFERENCES courses(id)
    );

    CREATE TABLE IF NOT EXISTS production (
      lesson_path TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      recorded INTEGER DEFAULT 0,
      edited INTEGER DEFAULT 0,
      uploaded INTEGER DEFAULT 0,
      access_tested INTEGER DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (course_id) REFERENCES courses(id)
    );

    CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
    CREATE INDEX IF NOT EXISTS idx_courses_phase ON courses(phase);
    CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  `);
}

// =============================================================================
// Course Operations
// =============================================================================

/**
 * Generate next course ID
 */
export function generateCourseId(): string {
  const database = getDatabase();
  const result = database
    .query(
      `SELECT MAX(CAST(SUBSTR(id, 3) AS INTEGER)) as max_id FROM courses`
    )
    .get() as { max_id: number | null } | null;

  const nextId = (result?.max_id || 0) + 1;
  return `C-${String(nextId).padStart(3, "0")}`;
}

/**
 * Create a new course
 */
export function createCourse(
  name: string,
  description: string,
  context: CourseContext
): Course {
  const database = getDatabase();
  const id = generateCourseId();

  database
    .query(
      `INSERT INTO courses (id, name, description, context)
       VALUES (?, ?, ?, ?)`
    )
    .run(id, name, description, context);

  return getCourse(id)!;
}

/**
 * Get a course by ID
 */
export function getCourse(id: string): Course | null {
  const database = getDatabase();
  const row = database.query(`SELECT * FROM courses WHERE id = ?`).get(id) as
    | CourseRow
    | null;

  if (!row) return null;
  return rowToCourse(row);
}

/**
 * Get all courses
 */
export function getAllCourses(): Course[] {
  const database = getDatabase();
  const rows = database
    .query(`SELECT * FROM courses ORDER BY created_at DESC`)
    .all() as CourseRow[];

  return rows.map(rowToCourse);
}

/**
 * Update course status
 */
export function updateCourseStatus(id: string, status: CourseStatus): void {
  const database = getDatabase();
  database
    .query(`UPDATE courses SET status = ? WHERE id = ?`)
    .run(status, id);
}

/**
 * Update course phase
 */
export function updateCoursePhase(id: string, phase: CoursePhase): void {
  const database = getDatabase();

  if (phase !== "none" && phase !== "define") {
    database
      .query(
        `UPDATE courses SET phase = ?, started_at = COALESCE(started_at, datetime('now')) WHERE id = ?`
      )
      .run(phase, id);
  } else if (phase === "launch") {
    database
      .query(
        `UPDATE courses SET phase = ?, launched_at = datetime('now') WHERE id = ?`
      )
      .run(phase, id);
  } else {
    database
      .query(`UPDATE courses SET phase = ? WHERE id = ?`)
      .run(phase, id);
  }
}

/**
 * Update course path
 */
export function updateCoursePath(id: string, path: string): void {
  const database = getDatabase();
  database
    .query(`UPDATE courses SET course_path = ? WHERE id = ?`)
    .run(path, id);
}

/**
 * Get course statistics
 */
export function getCourseStats(): CourseStats {
  const database = getDatabase();

  const phaseRows = database
    .query(`SELECT phase, COUNT(*) as count FROM courses GROUP BY phase`)
    .all() as { phase: CoursePhase; count: number }[];

  const statusRows = database
    .query(`SELECT status, COUNT(*) as count FROM courses GROUP BY status`)
    .all() as { status: CourseStatus; count: number }[];

  const totalRow = database
    .query(`SELECT COUNT(*) as total FROM courses`)
    .get() as { total: number } | null;

  const byPhase: Record<CoursePhase, number> = {
    none: 0,
    define: 0,
    design: 0,
    develop: 0,
    produce: 0,
    launch: 0,
  };
  for (const row of phaseRows) {
    byPhase[row.phase] = row.count;
  }

  const byStatus: Record<CourseStatus, number> = {
    draft: 0,
    in_progress: 0,
    ready: 0,
    launched: 0,
    archived: 0,
  };
  for (const row of statusRows) {
    byStatus[row.status] = row.count;
  }

  return {
    totalCourses: totalRow?.total || 0,
    byPhase,
    byStatus,
  };
}

// =============================================================================
// Module Operations
// =============================================================================

/**
 * Add a module to a course
 */
export function addModule(
  courseId: string,
  id: string,
  name: string,
  objective?: string
): void {
  const database = getDatabase();

  const maxOrder = database
    .query(
      `SELECT MAX(sort_order) as max_order FROM modules WHERE course_id = ?`
    )
    .get(courseId) as { max_order: number | null } | null;

  database
    .query(
      `INSERT INTO modules (course_id, id, name, objective, sort_order)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(courseId, id, name, objective || null, (maxOrder?.max_order || 0) + 1);
}

/**
 * Get modules for a course
 */
export function getModules(
  courseId: string
): { id: string; name: string; objective: string | null }[] {
  const database = getDatabase();
  return database
    .query(
      `SELECT id, name, objective FROM modules
       WHERE course_id = ? ORDER BY sort_order`
    )
    .all(courseId) as { id: string; name: string; objective: string | null }[];
}

// =============================================================================
// Lesson Operations
// =============================================================================

/**
 * Add a lesson to a module
 */
export function addLesson(
  courseId: string,
  moduleId: string,
  id: string,
  title: string,
  objective?: string,
  duration?: number
): void {
  const database = getDatabase();

  const maxOrder = database
    .query(
      `SELECT MAX(sort_order) as max_order FROM lessons
       WHERE course_id = ? AND module_id = ?`
    )
    .get(courseId, moduleId) as { max_order: number | null } | null;

  database
    .query(
      `INSERT INTO lessons (course_id, module_id, id, title, objective, duration, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      courseId,
      moduleId,
      id,
      title,
      objective || null,
      duration || 10,
      (maxOrder?.max_order || 0) + 1
    );
}

/**
 * Get lessons for a module
 */
export function getLessons(
  courseId: string,
  moduleId: string
): {
  id: string;
  title: string;
  objective: string | null;
  duration: number;
  status: string;
}[] {
  const database = getDatabase();
  return database
    .query(
      `SELECT id, title, objective, duration, status FROM lessons
       WHERE course_id = ? AND module_id = ? ORDER BY sort_order`
    )
    .all(courseId, moduleId) as {
    id: string;
    title: string;
    objective: string | null;
    duration: number;
    status: string;
  }[];
}

/**
 * Update lesson status
 */
export function updateLessonStatus(
  courseId: string,
  moduleId: string,
  lessonId: string,
  status: string
): void {
  const database = getDatabase();
  database
    .query(
      `UPDATE lessons SET status = ?
       WHERE course_id = ? AND module_id = ? AND id = ?`
    )
    .run(status, courseId, moduleId, lessonId);
}

// =============================================================================
// Helper Types
// =============================================================================

interface CourseRow {
  id: string;
  name: string;
  description: string | null;
  context: string;
  status: string;
  phase: string;
  course_path: string | null;
  created_at: string;
  started_at: string | null;
  launched_at: string | null;
}

function rowToCourse(row: CourseRow): Course {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    context: row.context as CourseContext,
    status: row.status as CourseStatus,
    phase: row.phase as CoursePhase,
    coursePath: row.course_path,
    createdAt: new Date(row.created_at),
    startedAt: row.started_at ? new Date(row.started_at) : null,
    launchedAt: row.launched_at ? new Date(row.launched_at) : null,
  };
}

// =============================================================================
// Close
// =============================================================================

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
