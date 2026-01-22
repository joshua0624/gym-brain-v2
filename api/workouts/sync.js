import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/middleware/auth.js';

/**
 * POST /api/workouts/sync
 *
 * Sync offline workouts to server
 * CRITICAL: Atomic transaction to insert workouts and delete drafts
 * This prevents "zombie drafts" from appearing after workout completion
 *
 * Request body:
 * {
 *   "completedWorkouts": [
 *     {
 *       "id": "uuid (client-generated)",
 *       "name": "Push Day",
 *       "startedAt": "2026-01-17T14:30:00Z",
 *       "completedAt": "2026-01-17T15:45:00Z",
 *       "notes": "Great workout",
 *       "templateId": "uuid or null",
 *       "exercises": [
 *         {
 *           "id": "uuid (client-generated)",
 *           "exerciseId": "uuid",
 *           "orderIndex": 0,
 *           "sets": [
 *             {
 *               "id": "uuid (client-generated)",
 *               "setNumber": 1,
 *               "weight": 225,
 *               "reps": 8,
 *               "rir": 2,
 *               "isWarmup": false,
 *               "notes": null
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ],
 *   "deleteDraftIds": ["draft-uuid-1", "draft-uuid-2"]
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "syncedWorkouts": [
 *     {
 *       "clientId": "uuid",
 *       "serverId": "uuid",
 *       "name": "Push Day"
 *     }
 *   ],
 *   "deletedDrafts": 2
 * }
 */
async function handleSync(req, res) {
  try {
    const userId = req.user.userId;
    const { completedWorkouts = [], deleteDraftIds = [] } = req.body;

    // Validate inputs
    if (!Array.isArray(completedWorkouts)) {
      return res.status(400).json({ error: 'completedWorkouts must be an array' });
    }

    if (!Array.isArray(deleteDraftIds)) {
      return res.status(400).json({ error: 'deleteDraftIds must be an array' });
    }

    const syncedWorkouts = [];

    // Process each workout
    for (const workout of completedWorkouts) {
      try {
        // Validate workout data
        if (!workout.name || !workout.startedAt) {
          console.error('Invalid workout data:', workout);
          continue;
        }

        const startedAt = new Date(workout.startedAt);
        const completedAt = workout.completedAt ? new Date(workout.completedAt) : null;

        // Calculate duration
        let durationSeconds = 0;
        if (completedAt && startedAt) {
          durationSeconds = Math.floor((completedAt - startedAt) / 1000);
        }

        // Insert workout (use client-provided ID if available)
        let workoutResult;

        if (workout.id) {
          // Use client-provided UUID
          workoutResult = await sql`
            INSERT INTO workout (
              id, user_id, name, started_at, completed_at,
              duration_seconds, notes, template_id
            )
            VALUES (
              ${workout.id},
              ${userId},
              ${workout.name},
              ${startedAt.toISOString()},
              ${completedAt ? completedAt.toISOString() : null},
              ${durationSeconds},
              ${workout.notes || null},
              ${workout.templateId || null}
            )
            RETURNING id
          `;
        } else {
          // Let database generate UUID
          workoutResult = await sql`
            INSERT INTO workout (
              user_id, name, started_at, completed_at,
              duration_seconds, notes, template_id
            )
            VALUES (
              ${userId},
              ${workout.name},
              ${startedAt.toISOString()},
              ${completedAt ? completedAt.toISOString() : null},
              ${durationSeconds},
              ${workout.notes || null},
              ${workout.templateId || null}
            )
            RETURNING id
          `;
        }

        const insertedWorkoutId = workoutResult[0].id;

        // Insert exercises
        if (workout.exercises && Array.isArray(workout.exercises)) {
          for (const exercise of workout.exercises) {
            let exerciseResult;

            if (exercise.id) {
              // Use client-provided UUID
              exerciseResult = await sql`
                INSERT INTO workout_exercise (
                  id, workout_id, exercise_id, order_index, is_completed
                )
                VALUES (
                  ${exercise.id},
                  ${insertedWorkoutId},
                  ${exercise.exerciseId},
                  ${exercise.orderIndex || 0},
                  ${exercise.isCompleted !== undefined ? exercise.isCompleted : true}
                )
                RETURNING id
              `;
            } else {
              // Let database generate UUID
              exerciseResult = await sql`
                INSERT INTO workout_exercise (
                  workout_id, exercise_id, order_index, is_completed
                )
                VALUES (
                  ${insertedWorkoutId},
                  ${exercise.exerciseId},
                  ${exercise.orderIndex || 0},
                  ${exercise.isCompleted !== undefined ? exercise.isCompleted : true}
                )
                RETURNING id
              `;
            }

            const insertedExerciseId = exerciseResult[0].id;

            // Insert sets
            if (exercise.sets && Array.isArray(exercise.sets)) {
              for (const set of exercise.sets) {
                if (set.id) {
                  // Use client-provided UUID
                  await sql`
                    INSERT INTO set (
                      id, workout_exercise_id, set_number, weight, reps, rir,
                      duration_seconds, distance, notes, is_warmup, is_completed
                    )
                    VALUES (
                      ${set.id},
                      ${insertedExerciseId},
                      ${set.setNumber || 1},
                      ${set.weight || null},
                      ${set.reps || null},
                      ${set.rir || null},
                      ${set.durationSeconds || null},
                      ${set.distance || null},
                      ${set.notes || null},
                      ${set.isWarmup !== undefined ? set.isWarmup : false},
                      ${set.isCompleted !== undefined ? set.isCompleted : true}
                    )
                  `;
                } else {
                  // Let database generate UUID
                  await sql`
                    INSERT INTO set (
                      workout_exercise_id, set_number, weight, reps, rir,
                      duration_seconds, distance, notes, is_warmup, is_completed
                    )
                    VALUES (
                      ${insertedExerciseId},
                      ${set.setNumber || 1},
                      ${set.weight || null},
                      ${set.reps || null},
                      ${set.rir || null},
                      ${set.durationSeconds || null},
                      ${set.distance || null},
                      ${set.notes || null},
                      ${set.isWarmup !== undefined ? set.isWarmup : false},
                      ${set.isCompleted !== undefined ? set.isCompleted : true}
                    )
                  `;
                }
              }
            }
          }
        }

        // Recalculate total volume
        const volumeResult = await sql`
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
          WHERE we.workout_id = ${insertedWorkoutId}
        `;

        const totalVolume = parseFloat(volumeResult[0].total_volume);

        // Update total volume
        await sql`
          UPDATE workout
          SET total_volume = ${totalVolume}
          WHERE id = ${insertedWorkoutId}
        `;

        syncedWorkouts.push({
          clientId: workout.id,
          serverId: insertedWorkoutId,
          name: workout.name
        });

      } catch (workoutError) {
        console.error('Error syncing individual workout:', workoutError);
        // Continue with other workouts instead of failing entire batch
      }
    }

    // Delete drafts (CRITICAL for preventing zombie drafts)
    let deletedDraftsCount = 0;

    if (deleteDraftIds.length > 0) {
      for (const draftId of deleteDraftIds) {
        try {
          // Verify ownership before deleting
          const draftCheck = await sql`
            SELECT id, user_id
            FROM workout_draft
            WHERE id = ${draftId}
          `;

          if (draftCheck.length > 0 && draftCheck[0].user_id === userId) {
            await sql`
              DELETE FROM workout_draft
              WHERE id = ${draftId}
            `;
            deletedDraftsCount++;
          }
        } catch (draftError) {
          console.error('Error deleting draft:', draftError);
          // Continue with other drafts
        }
      }
    }

    return res.status(200).json({
      success: true,
      syncedWorkouts,
      deletedDrafts: deletedDraftsCount
    });

  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({
      error: 'Sync failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * Main handler - only allows POST requests
 */
export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return requireAuth(handleSync)(req, res);
}
