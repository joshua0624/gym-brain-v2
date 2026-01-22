import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/middleware/auth.js';

/**
 * GET /api/workouts/[id]
 *
 * Get a specific workout with all exercises and sets
 *
 * Response: Same format as GET /api/workouts but for single workout
 */
async function handleGet(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Workout ID is required' });
    }

    // Get workout
    const workouts = await sql`
      SELECT
        id, name, started_at, completed_at, duration_seconds,
        total_volume, notes, template_id, user_id
      FROM workout
      WHERE id = ${id}
    `;

    if (workouts.length === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    const workout = workouts[0];

    // Verify ownership
    if (workout.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

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

    return res.status(200).json({
      workout: {
        id: workout.id,
        name: workout.name,
        startedAt: workout.started_at,
        completedAt: workout.completed_at,
        durationSeconds: workout.duration_seconds,
        totalVolume: workout.total_volume ? parseFloat(workout.total_volume) : 0,
        notes: workout.notes,
        templateId: workout.template_id,
        exercises: exercisesWithSets
      }
    });

  } catch (error) {
    console.error('Get workout error:', error);
    return res.status(500).json({
      error: 'Failed to fetch workout',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * PUT /api/workouts/[id]
 *
 * Update a workout
 * Recalculates total_volume and duration_seconds based on exercises/sets
 *
 * Request body:
 * {
 *   "name": "Updated Push Day" (optional),
 *   "notes": "Great workout" (optional),
 *   "completedAt": "2026-01-17T15:45:00Z" (optional)
 * }
 *
 * Response:
 * {
 *   "workout": { ... }
 * }
 */
async function handlePut(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.query;
    const { name, notes, completedAt } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Workout ID is required' });
    }

    // Verify workout exists and belongs to user
    const existing = await sql`
      SELECT id, user_id, started_at
      FROM workout
      WHERE id = ${id}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    if (existing[0].user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build update fields
    const updates = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.length < 1 || name.length > 100) {
        return res.status(400).json({ error: 'Workout name must be 1-100 characters' });
      }
      updates.name = name;
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    if (completedAt !== undefined) {
      const completedDate = new Date(completedAt);
      if (isNaN(completedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid completedAt date' });
      }
      updates.completed_at = completedDate.toISOString();

      // Calculate duration if completed
      const startedAt = new Date(existing[0].started_at);
      updates.duration_seconds = Math.floor((completedDate - startedAt) / 1000);
    }

    // Recalculate total volume from sets
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
      WHERE we.workout_id = ${id}
    `;

    updates.total_volume = parseFloat(volumeResult[0].total_volume);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Perform update using separate queries for each field (simpler with Neon)
    if (updates.name !== undefined) {
      await sql`UPDATE workout SET name = ${updates.name} WHERE id = ${id}`;
    }
    if (updates.notes !== undefined) {
      await sql`UPDATE workout SET notes = ${updates.notes} WHERE id = ${id}`;
    }
    if (updates.completed_at !== undefined) {
      await sql`UPDATE workout SET completed_at = ${updates.completed_at} WHERE id = ${id}`;
    }
    if (updates.duration_seconds !== undefined) {
      await sql`UPDATE workout SET duration_seconds = ${updates.duration_seconds} WHERE id = ${id}`;
    }
    if (updates.total_volume !== undefined) {
      await sql`UPDATE workout SET total_volume = ${updates.total_volume} WHERE id = ${id}`;
    }

    // Fetch full workout details
    return handleGet(req, res);

  } catch (error) {
    console.error('Update workout error:', error);
    return res.status(500).json({
      error: 'Failed to update workout',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * DELETE /api/workouts/[id]
 *
 * Delete a workout (cascade deletes exercises and sets)
 *
 * Response:
 * {
 *   "success": true,
 *   "workoutId": "uuid"
 * }
 */
async function handleDelete(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Workout ID is required' });
    }

    // Verify workout exists and belongs to user
    const existing = await sql`
      SELECT id, user_id
      FROM workout
      WHERE id = ${id}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    if (existing[0].user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete sets first
    await sql`
      DELETE FROM set
      WHERE workout_exercise_id IN (
        SELECT id FROM workout_exercise WHERE workout_id = ${id}
      )
    `;

    // Delete workout exercises
    await sql`
      DELETE FROM workout_exercise
      WHERE workout_id = ${id}
    `;

    // Delete workout
    await sql`
      DELETE FROM workout
      WHERE id = ${id}
    `;

    return res.status(200).json({
      success: true,
      workoutId: id
    });

  } catch (error) {
    console.error('Delete workout error:', error);
    return res.status(500).json({
      error: 'Failed to delete workout',
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
  } else if (req.method === 'PUT') {
    return requireAuth(handlePut)(req, res);
  } else if (req.method === 'DELETE') {
    return requireAuth(handleDelete)(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
