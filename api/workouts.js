import { sql } from './_lib/db.js';
import { requireAuth } from './_lib/middleware/auth.js';

/**
 * GET /api/workouts
 *
 * Get user's workouts with exercises and sets
 *
 * Query params:
 * - limit: Number of workouts to return (default: 50)
 * - offset: Pagination offset (default: 0)
 *
 * Response:
 * {
 *   "workouts": [
 *     {
 *       "id": "uuid",
 *       "name": "Push Day",
 *       "startedAt": "2026-01-17T14:30:00Z",
 *       "completedAt": "2026-01-17T15:45:00Z",
 *       "durationSeconds": 4500,
 *       "totalVolume": 12500.50,
 *       "notes": "Felt strong today",
 *       "templateId": "uuid or null",
 *       "exercises": [
 *         {
 *           "id": "uuid",
 *           "exerciseId": "uuid",
 *           "exerciseName": "Bench Press",
 *           "orderIndex": 0,
 *           "isCompleted": true,
 *           "sets": [
 *             {
 *               "id": "uuid",
 *               "setNumber": 1,
 *               "weight": 225,
 *               "reps": 8,
 *               "rir": 2,
 *               "isWarmup": false,
 *               "isCompleted": true,
 *               "notes": null
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ],
 *   "total": 125,
 *   "hasMore": true
 * }
 */
async function handleGet(req, res) {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Validate pagination params
    if (limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Limit must be between 1 and 100' });
    }

    if (offset < 0) {
      return res.status(400).json({ error: 'Offset must be non-negative' });
    }

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM workout
      WHERE user_id = ${userId}
    `;
    const total = parseInt(countResult[0].total);

    // Get workouts
    const workouts = await sql`
      SELECT
        id, name, started_at, completed_at, duration_seconds,
        total_volume, notes, template_id
      FROM workout
      WHERE user_id = ${userId}
      ORDER BY started_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // For each workout, fetch exercises and sets
    const workoutsWithDetails = await Promise.all(
      workouts.map(async (workout) => {
        // Get workout exercises
        const exercises = await sql`
          SELECT
            we.id, we.exercise_id, we.order_index, we.is_completed,
            e.name as exercise_name, e.type as exercise_type
          FROM workout_exercise we
          JOIN exercise e ON we.exercise_id = e.id
          WHERE we.workout_id = ${workout.id}
          ORDER BY we.order_index ASC
        `;

        // For each exercise, fetch sets
        const exercisesWithSets = await Promise.all(
          exercises.map(async (exercise) => {
            const sets = await sql`
              SELECT
                id, set_number, weight, reps, rir,
                duration_seconds, distance, notes,
                is_warmup, is_completed
              FROM set
              WHERE workout_exercise_id = ${exercise.id}
              ORDER BY set_number ASC
            `;

            return {
              id: exercise.id,
              exerciseId: exercise.exercise_id,
              exerciseName: exercise.exercise_name,
              exerciseType: exercise.exercise_type,
              orderIndex: exercise.order_index,
              isCompleted: exercise.is_completed,
              sets: sets.map(set => ({
                id: set.id,
                setNumber: set.set_number,
                weight: set.weight ? parseFloat(set.weight) : null,
                reps: set.reps,
                rir: set.rir,
                durationSeconds: set.duration_seconds,
                distance: set.distance ? parseFloat(set.distance) : null,
                notes: set.notes,
                isWarmup: set.is_warmup,
                isCompleted: set.is_completed
              }))
            };
          })
        );

        return {
          id: workout.id,
          name: workout.name,
          startedAt: workout.started_at,
          completedAt: workout.completed_at,
          durationSeconds: workout.duration_seconds,
          totalVolume: workout.total_volume ? parseFloat(workout.total_volume) : 0,
          notes: workout.notes,
          templateId: workout.template_id,
          exercises: exercisesWithSets
        };
      })
    );

    return res.status(200).json({
      workouts: workoutsWithDetails,
      total,
      hasMore: offset + limit < total
    });

  } catch (error) {
    console.error('Get workouts error:', error);
    return res.status(500).json({
      error: 'Failed to fetch workouts',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * POST /api/workouts
 *
 * Create a new workout
 *
 * Request body:
 * {
 *   "name": "Push Day",
 *   "startedAt": "2026-01-17T14:30:00Z" (optional, defaults to NOW())
 * }
 *
 * Response:
 * {
 *   "workout": {
 *     "id": "uuid",
 *     "name": "Push Day",
 *     "startedAt": "2026-01-17T14:30:00Z",
 *     "userId": "uuid"
 *   }
 * }
 */
async function handlePost(req, res) {
  try {
    const userId = req.user.userId;
    const { name, startedAt } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || name.length < 1 || name.length > 100) {
      return res.status(400).json({ error: 'Workout name must be 1-100 characters' });
    }

    // Use provided startedAt or current time
    const workoutStartedAt = startedAt ? new Date(startedAt) : new Date();

    // Validate startedAt is a valid date
    if (isNaN(workoutStartedAt.getTime())) {
      return res.status(400).json({ error: 'Invalid startedAt date' });
    }

    // Create workout
    const result = await sql`
      INSERT INTO workout (user_id, name, started_at)
      VALUES (${userId}, ${name}, ${workoutStartedAt.toISOString()})
      RETURNING id, user_id, name, started_at
    `;

    const workout = result[0];

    return res.status(201).json({
      workout: {
        id: workout.id,
        userId: workout.user_id,
        name: workout.name,
        startedAt: workout.started_at
      }
    });

  } catch (error) {
    console.error('Create workout error:', error);
    return res.status(500).json({
      error: 'Failed to create workout',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * Main handler - routes based on HTTP method
 */
export default function handler(req, res) {
  if (req.method === 'GET') {
    return requireAuth(handleGet)(req, res);
  } else if (req.method === 'POST') {
    return requireAuth(handlePost)(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
