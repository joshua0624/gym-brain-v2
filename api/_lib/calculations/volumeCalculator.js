/**
 * Volume Calculation Utilities
 *
 * Single source of truth for volume calculations across the codebase.
 * Volume = weight × reps (for weighted and bodyweight exercises, excluding warmup sets)
 */

/**
 * Returns SQL fragment for volume calculation
 * Use this in SELECT clauses or aggregate queries
 *
 * @returns {string} SQL expression for calculating volume
 *
 * @example
 * const query = sql`
 *   SELECT COALESCE(SUM(${sql.raw(calculateVolumeSQL())}), 0) as total_volume
 *   FROM set s
 *   JOIN workout_exercise we ON s.workout_exercise_id = we.id
 *   JOIN exercise e ON we.exercise_id = e.id
 *   WHERE we.workout_id = ${workoutId}
 * `;
 */
export function calculateVolumeSQL() {
  return `
    CASE
      WHEN e.type IN ('weighted', 'bodyweight') AND s.is_warmup = false
      THEN COALESCE(s.weight, 0) * COALESCE(s.reps, 0)
      ELSE 0
    END
  `;
}

/**
 * Returns full SQL query for calculating workout total volume
 *
 * @param {import('@neondatabase/serverless').NeonQueryFunction<false, false>} sql - Neon SQL template function
 * @param {string} workoutId - Workout UUID
 * @returns {Promise<number>} Total volume in lbs
 *
 * @example
 * const volume = await calculateWorkoutVolume(sql, workoutId);
 */
export async function calculateWorkoutVolume(sql, workoutId) {
  const result = await sql`
    SELECT COALESCE(SUM(
      CASE
        WHEN e.type IN ('weighted', 'bodyweight') AND s.is_warmup = false
        THEN COALESCE(s.weight, 0) * COALESCE(s.reps, 0)
        ELSE 0
      END
    ), 0) as total_volume
    FROM set s
    JOIN workout_exercise we ON s.workout_exercise_id = we.id
    JOIN exercise e ON we.exercise_id = e.id
    WHERE we.workout_id = ${workoutId}
  `;

  return parseFloat(result[0].total_volume);
}

/**
 * Calculate volume for a single set (client-side calculation)
 *
 * @param {Object} set - Set object
 * @param {number} set.weight - Weight in lbs
 * @param {number} set.reps - Number of reps
 * @param {boolean} set.isWarmup - Whether this is a warmup set
 * @param {string} exerciseType - Exercise type ('weighted', 'bodyweight', 'cardio', 'duration')
 * @returns {number} Volume in lbs (0 for cardio/duration or warmup sets)
 */
export function calculateSetVolume(set, exerciseType) {
  // Skip warmup sets
  if (set.isWarmup) return 0;

  // Only weighted and bodyweight exercises contribute to volume
  if (exerciseType !== 'weighted' && exerciseType !== 'bodyweight') {
    return 0;
  }

  const weight = parseFloat(set.weight) || 0;
  const reps = parseInt(set.reps) || 0;

  return weight * reps;
}

/**
 * Calculate total volume for an array of sets
 *
 * @param {Array} sets - Array of set objects
 * @param {string} exerciseType - Exercise type
 * @returns {number} Total volume in lbs
 */
export function calculateSetsVolume(sets, exerciseType) {
  return sets.reduce((total, set) => {
    return total + calculateSetVolume(set, exerciseType);
  }, 0);
}
