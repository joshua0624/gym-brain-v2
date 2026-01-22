import { sql } from './_lib/db.js';
import { requireAuth } from './_lib/middleware/auth.js';

/**
 * GET /api/prs
 *
 * Get all Personal Records (PRs) for the user
 *
 * Calculates PRs by exercise and rep range (1RM, 3RM, 5RM, 10RM)
 * Excludes warm-up sets (is_warmup = true)
 * Uses Brzycki formula for estimated 1RM: weight / (1.0278 - 0.0278 * reps)
 *
 * Query params:
 * - exerciseId: Filter PRs for a specific exercise (optional)
 *
 * Response:
 * {
 *   "prs": [
 *     {
 *       "exerciseId": "uuid",
 *       "exerciseName": "Bench Press",
 *       "repRange": "1RM",
 *       "maxWeight": 315.0,
 *       "reps": 1,
 *       "rir": 0,
 *       "estimated1rm": 315.0,
 *       "date": "2026-01-15T10:30:00Z",
 *       "workoutId": "uuid",
 *       "workoutName": "Heavy Push Day"
 *     },
 *     {
 *       "exerciseId": "uuid",
 *       "exerciseName": "Bench Press",
 *       "repRange": "5RM",
 *       "maxWeight": 275.0,
 *       "reps": 5,
 *       "rir": 1,
 *       "estimated1rm": 303.8,
 *       "date": "2026-01-10T10:30:00Z",
 *       "workoutId": "uuid",
 *       "workoutName": "Volume Push Day"
 *     }
 *   ]
 * }
 */
export default requireAuth(async (req, res) => {
  const userId = req.user.userId;
  const { exerciseId } = req.query;

  try {
    // Define rep ranges we want to track
    const repRanges = [
      { name: '1RM', min: 1, max: 1 },
      { name: '3RM', min: 2, max: 3 },
      { name: '5RM', min: 4, max: 6 },
      { name: '10RM', min: 8, max: 12 }
    ];

    // Query to get max weight for each rep range per exercise
    // We'll do this by getting all working sets and processing them
    const allSets = exerciseId
      ? await sql`
          SELECT
            e.id as exercise_id,
            e.name as exercise_name,
            w.id as workout_id,
            w.name as workout_name,
            w.completed_at as date,
            s.weight,
            s.reps,
            s.rir,
            -- Calculate estimated 1RM using Brzycki formula
            CASE
              WHEN s.reps > 0 AND s.weight IS NOT NULL THEN
                ROUND(s.weight / (1.0278 - 0.0278 * s.reps), 2)
              ELSE NULL
            END as estimated_1rm
          FROM "set" s
          INNER JOIN workout_exercise we ON s.workout_exercise_id = we.id
          INNER JOIN workout w ON we.workout_id = w.id
          INNER JOIN exercise e ON we.exercise_id = e.id
          WHERE w.user_id = ${userId}
          AND we.exercise_id = ${exerciseId}
          AND s.is_warmup = false
          AND s.is_completed = true
          AND s.weight IS NOT NULL
          AND s.reps IS NOT NULL
          AND s.reps > 0
          ORDER BY e.id, s.weight DESC, w.completed_at DESC
        `
      : await sql`
          SELECT
            e.id as exercise_id,
            e.name as exercise_name,
            w.id as workout_id,
            w.name as workout_name,
            w.completed_at as date,
            s.weight,
            s.reps,
            s.rir,
            -- Calculate estimated 1RM using Brzycki formula
            CASE
              WHEN s.reps > 0 AND s.weight IS NOT NULL THEN
                ROUND(s.weight / (1.0278 - 0.0278 * s.reps), 2)
              ELSE NULL
            END as estimated_1rm
          FROM "set" s
          INNER JOIN workout_exercise we ON s.workout_exercise_id = we.id
          INNER JOIN workout w ON we.workout_id = w.id
          INNER JOIN exercise e ON we.exercise_id = e.id
          WHERE w.user_id = ${userId}
          AND s.is_warmup = false
          AND s.is_completed = true
          AND s.weight IS NOT NULL
          AND s.reps IS NOT NULL
          AND s.reps > 0
          ORDER BY e.id, s.weight DESC, w.completed_at DESC
        `;

    // Group PRs by exercise and rep range
    const prsByExercise = {};

    for (const set of allSets) {
      const exerciseKey = set.exercise_id;

      if (!prsByExercise[exerciseKey]) {
        prsByExercise[exerciseKey] = {
          exerciseId: set.exercise_id,
          exerciseName: set.exercise_name,
          repRanges: {}
        };
      }

      // Check which rep range this set falls into
      for (const range of repRanges) {
        if (set.reps >= range.min && set.reps <= range.max) {
          const currentPR = prsByExercise[exerciseKey].repRanges[range.name];

          // Update PR if this is heavier weight (or first record for this range)
          if (!currentPR || set.weight > currentPR.maxWeight) {
            prsByExercise[exerciseKey].repRanges[range.name] = {
              repRange: range.name,
              maxWeight: parseFloat(set.weight),
              reps: set.reps,
              rir: set.rir,
              estimated1rm: set.estimated_1rm ? parseFloat(set.estimated_1rm) : null,
              date: set.date,
              workoutId: set.workout_id,
              workoutName: set.workout_name
            };
          }
        }
      }
    }

    // Flatten the results into an array
    const prs = [];
    for (const exerciseKey in prsByExercise) {
      const exercise = prsByExercise[exerciseKey];
      for (const rangeName in exercise.repRanges) {
        prs.push({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          ...exercise.repRanges[rangeName]
        });
      }
    }

    // Sort by exercise name, then by rep range
    const repRangeOrder = { '1RM': 1, '3RM': 2, '5RM': 3, '10RM': 4 };
    prs.sort((a, b) => {
      if (a.exerciseName !== b.exerciseName) {
        return a.exerciseName.localeCompare(b.exerciseName);
      }
      return repRangeOrder[a.repRange] - repRangeOrder[b.repRange];
    });

    return res.status(200).json({
      prs,
      total: prs.length
    });

  } catch (error) {
    console.error('Error fetching PRs:', error);
    return res.status(500).json({
      error: 'Failed to fetch PRs',
      message: error.message
    });
  }
});
