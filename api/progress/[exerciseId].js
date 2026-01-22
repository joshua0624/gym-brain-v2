import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/middleware/auth.js';

/**
 * GET /api/progress/:exerciseId
 *
 * Get exercise progress data for a specific exercise
 *
 * Returns time-series data of all sets for this exercise across all user's workouts
 * Excludes warm-up sets (is_warmup = true)
 * Includes estimated 1RM calculations using Brzycki formula
 *
 * Response:
 * {
 *   "exerciseId": "uuid",
 *   "exerciseName": "Bench Press",
 *   "data": [
 *     {
 *       "date": "2026-01-17T15:30:00Z",
 *       "workoutId": "uuid",
 *       "workoutName": "Push Day",
 *       "weight": 225.0,
 *       "reps": 8,
 *       "rir": 2,
 *       "estimated1rm": 278.6,
 *       "setNumber": 1
 *     }
 *   ]
 * }
 */
export default requireAuth(async (req, res) => {
  const userId = req.user.userId;
  const { exerciseId } = req.query;

  // Validate exerciseId
  if (!exerciseId) {
    return res.status(400).json({ error: 'Exercise ID is required' });
  }

  try {
    // First, verify the exercise exists
    const exerciseResult = await sql`
      SELECT id, name
      FROM exercise
      WHERE id = ${exerciseId}
      AND (created_by IS NULL OR created_by = ${userId})
      AND is_archived = false
    `;

    if (exerciseResult.length === 0) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    const exercise = exerciseResult[0];

    // Query all sets for this exercise across all user's workouts
    // Exclude warm-up sets (is_warmup = true)
    // Order by workout date and set number for time-series display
    const progressData = await sql`
      SELECT
        w.id as workout_id,
        w.name as workout_name,
        w.completed_at as date,
        s.set_number,
        s.weight,
        s.reps,
        s.rir,
        s.notes,
        -- Calculate estimated 1RM using Brzycki formula: weight / (1.0278 - 0.0278 * reps)
        CASE
          WHEN s.reps > 0 AND s.weight IS NOT NULL THEN
            ROUND(s.weight / (1.0278 - 0.0278 * s.reps), 2)
          ELSE NULL
        END as estimated_1rm
      FROM "set" s
      INNER JOIN workout_exercise we ON s.workout_exercise_id = we.id
      INNER JOIN workout w ON we.workout_id = w.id
      WHERE we.exercise_id = ${exerciseId}
      AND w.user_id = ${userId}
      AND s.is_warmup = false
      AND s.is_completed = true
      AND s.weight IS NOT NULL
      AND s.reps IS NOT NULL
      ORDER BY w.completed_at DESC, s.set_number ASC
    `;

    // Transform the results to camelCase for frontend
    const formattedData = progressData.map(row => ({
      date: row.date,
      workoutId: row.workout_id,
      workoutName: row.workout_name,
      weight: parseFloat(row.weight),
      reps: row.reps,
      rir: row.rir,
      estimated1rm: row.estimated_1rm ? parseFloat(row.estimated_1rm) : null,
      setNumber: row.set_number,
      notes: row.notes
    }));

    return res.status(200).json({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      data: formattedData,
      totalSets: formattedData.length
    });

  } catch (error) {
    console.error('Error fetching progress data:', error);
    return res.status(500).json({
      error: 'Failed to fetch progress data',
      message: error.message
    });
  }
});
