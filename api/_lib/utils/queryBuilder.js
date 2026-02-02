/**
 * Query Builder Utilities
 *
 * Helper functions for building complex SQL queries with CTEs
 */

/**
 * Build an atomic workout creation with draft deletion CTE
 * This ensures the draft is deleted only if the workout is successfully created
 *
 * @param {import('@neondatabase/serverless').NeonQueryFunction<false, false>} sql - Neon SQL template function
 * @param {Object} workoutData - Workout data
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Created workout
 */
export async function createWorkoutWithDraftDeletion(sql, workoutData, userId) {
  const {
    name,
    startedAt,
    completedAt,
    durationSeconds,
    totalVolume,
    notes,
    templateId
  } = workoutData;

  // Atomic CTE: Delete draft and create workout in single transaction
  const result = await sql`
    WITH deleted_draft AS (
      DELETE FROM workout_draft
      WHERE user_id = ${userId}
      RETURNING id as draft_id
    ),
    inserted_workout AS (
      INSERT INTO workout (
        user_id,
        name,
        started_at,
        completed_at,
        duration_seconds,
        total_volume,
        notes,
        template_id
      )
      VALUES (
        ${userId},
        ${name},
        ${startedAt || new Date().toISOString()},
        ${completedAt || null},
        ${durationSeconds || null},
        ${totalVolume || 0},
        ${notes || null},
        ${templateId || null}
      )
      RETURNING *
    )
    SELECT
      w.*,
      COALESCE(json_agg(d.draft_id) FILTER (WHERE d.draft_id IS NOT NULL), '[]'::json) as deleted_draft_ids
    FROM inserted_workout w
    LEFT JOIN deleted_draft d ON true
    GROUP BY w.id, w.user_id, w.name, w.started_at, w.completed_at,
             w.duration_seconds, w.total_volume, w.notes, w.template_id, w.created_at
  `;

  return result[0];
}

/**
 * Build a CTE for bulk insert with conflict handling
 *
 * @param {string} table - Table name
 * @param {Array<Object>} rows - Array of row objects to insert
 * @param {Array<string>} conflictColumns - Columns to check for conflicts
 * @param {Array<string>} updateColumns - Columns to update on conflict
 * @returns {string} CTE SQL fragment
 */
export function buildUpsertCTE(table, rows, conflictColumns, updateColumns) {
  // This is a helper for constructing bulk upsert queries
  // Note: Due to Neon's parameterized query requirements, this returns a template
  // that should be used with sql tagged templates
  return {
    table,
    rows,
    conflictColumns,
    updateColumns
  };
}
