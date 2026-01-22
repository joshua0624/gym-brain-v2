/**
 * Database Connection Module
 *
 * CRITICAL: Uses @neondatabase/serverless driver for Vercel serverless functions
 *
 * Why this matters:
 * - Standard pg drivers exhaust connection pools in serverless environments
 * - Vercel functions spin up/down rapidly, creating new connections each time
 * - @neondatabase/serverless has built-in pooling and HTTP-based connections
 * - Prevents 500 errors from connection pool exhaustion
 *
 * Usage:
 * import { sql } from '@/lib/db';
 * const result = await sql`SELECT * FROM users WHERE id = ${userId}`;
 */

import { neon } from '@neondatabase/serverless';

// Validate that DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is not set. ' +
    'Please add it to your .env.local file.'
  );
}

/**
 * Neon SQL client for serverless environments
 *
 * Uses tagged template literals for parameterized queries:
 * @example
 * const users = await sql`SELECT * FROM "user" WHERE email = ${email}`;
 *
 * @example
 * const workouts = await sql`
 *   SELECT w.*, COUNT(we.id) as exercise_count
 *   FROM workout w
 *   LEFT JOIN workout_exercise we ON w.id = we.workout_id
 *   WHERE w.user_id = ${userId}
 *   GROUP BY w.id
 *   ORDER BY w.started_at DESC
 *   LIMIT ${limit}
 * `;
 */
export const sql = neon(process.env.DATABASE_URL);

/**
 * Helper function to run database migrations
 * This is primarily for local development and initial setup
 *
 * @param {string} migrationSQL - The SQL migration script to run
 * @returns {Promise<void>}
 *
 * @example
 * import { readFileSync } from 'fs';
 * import { runMigration } from '@/lib/db';
 *
 * const schema = readFileSync('./migrations/001_initial_schema.sql', 'utf-8');
 * await runMigration(schema);
 */
export async function runMigration(migrationSQL) {
  try {
    // Execute the migration
    await sql(migrationSQL);
    console.log('Migration executed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Helper to check database connection
 * Useful for health checks and debugging
 *
 * @returns {Promise<boolean>}
 */
export async function checkConnection() {
  try {
    const result = await sql`SELECT NOW() as current_time`;
    console.log('Database connected successfully at:', result[0].current_time);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Transaction helper (if needed for complex operations)
 * Note: Neon's HTTP-based protocol handles transactions differently than traditional pg
 * For critical atomic operations (like draft deletion on workout completion),
 * use a single SQL statement with CTEs when possible
 *
 * @example
 * // Atomic workout completion with draft deletion
 * await sql`
 *   WITH inserted_workout AS (
 *     INSERT INTO workout (user_id, name, started_at, completed_at)
 *     VALUES (${userId}, ${name}, ${startedAt}, ${completedAt})
 *     RETURNING id
 *   ),
 *   deleted_draft AS (
 *     DELETE FROM workout_draft WHERE user_id = ${userId}
 *   )
 *   SELECT id FROM inserted_workout;
 * `;
 */

export default sql;
