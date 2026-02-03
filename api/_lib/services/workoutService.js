/**
 * Workout Service
 *
 * Business logic for workout operations with optimized queries
 */

import { sql } from '../db.js';
import { calculateWorkoutVolume } from '../calculations/volumeCalculator.js';

/**
 * Get workouts with exercises and sets (OPTIMIZED - single query with JSON aggregation)
 *
 * @param {string} userId - User UUID
 * @param {Object} options - Query options
 * @param {number} options.limit - Max workouts to return (1-100, default: 50)
 * @param {number} options.offset - Pagination offset (default: 0)
 * @returns {Promise<Object>} { workouts, total, hasMore }
 */
export async function getWorkouts(userId, { limit = 50, offset = 0 } = {}) {
  // Validate pagination params
  if (limit < 1 || limit > 100) {
    throw new Error('Limit must be between 1 and 100');
  }
  if (offset < 0) {
    throw new Error('Offset must be non-negative');
  }

  // Get total count
  const countResult = await sql`
    SELECT COUNT(*) as total
    FROM workout
    WHERE user_id = ${userId}
  `;
  const total = parseInt(countResult[0].total);

  // Optimized query: Single query with JSON aggregation to avoid N+1 problem
  // This replaces: 1 workout query + N exercise queries + M set queries
  // With: 1 single query using json_agg
  const workouts = await sql`
    SELECT
      w.id,
      w.name,
      w.started_at,
      w.completed_at,
      w.duration_seconds,
      w.total_volume,
      w.notes,
      w.template_id,
      COALESCE(
        json_agg(
          json_build_object(
            'id', we.id,
            'exerciseId', we.exercise_id,
            'exerciseName', e.name,
            'exerciseType', e.type,
            'orderIndex', we.order_index,
            'isCompleted', we.is_completed,
            'sets', (
              SELECT COALESCE(json_agg(
                json_build_object(
                  'id', s.id,
                  'setNumber', s.set_number,
                  'weight', s.weight,
                  'reps', s.reps,
                  'rir', s.rir,
                  'durationSeconds', s.duration_seconds,
                  'distance', s.distance,
                  'notes', s.notes,
                  'isWarmup', s.is_warmup,
                  'isCompleted', s.is_completed
                ) ORDER BY s.set_number
              ), '[]'::json)
              FROM "set" s
              WHERE s.workout_exercise_id = we.id
            )
          ) ORDER BY we.order_index
        ) FILTER (WHERE we.id IS NOT NULL),
        '[]'::json
      ) as exercises
    FROM workout w
    LEFT JOIN workout_exercise we ON w.id = we.workout_id
    LEFT JOIN exercise e ON we.exercise_id = e.id
    WHERE w.user_id = ${userId}
    GROUP BY w.id
    ORDER BY w.started_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  // Transform to match expected response format (snake_case for frontend compatibility)
  const workoutsWithDetails = workouts.map(workout => ({
    id: workout.id,
    name: workout.name,
    started_at: workout.started_at,
    completed_at: workout.completed_at,
    duration_seconds: workout.duration_seconds,
    total_volume: workout.total_volume ? parseFloat(workout.total_volume) : 0,
    notes: workout.notes,
    template_id: workout.template_id,
    exercises: workout.exercises.map(ex => ({
      id: ex.id,
      exercise_id: ex.exerciseId,
      name: ex.exerciseName,
      exercise_name: ex.exerciseName,
      type: ex.exerciseType,
      exercise_type: ex.exerciseType,
      order_index: ex.orderIndex,
      is_completed: ex.isCompleted,
      sets: ex.sets.map(set => ({
        id: set.id,
        set_number: set.setNumber,
        weight: set.weight ? parseFloat(set.weight) : null,
        reps: set.reps,
        rir: set.rir,
        duration_seconds: set.durationSeconds,
        distance: set.distance ? parseFloat(set.distance) : null,
        notes: set.notes,
        is_warmup: set.isWarmup,
        is_completed: set.isCompleted
      }))
    }))
  }));

  return {
    workouts: workoutsWithDetails,
    total,
    hasMore: offset + limit < total
  };
}

/**
 * Get a single workout by ID with exercises and sets
 *
 * @param {string} workoutId - Workout UUID
 * @param {string} userId - User UUID (for ownership verification)
 * @returns {Promise<Object>} Workout object
 * @throws {Error} If workout not found or unauthorized
 */
export async function getWorkoutById(workoutId, userId) {
  const workouts = await sql`
    SELECT
      w.id,
      w.name,
      w.started_at,
      w.completed_at,
      w.duration_seconds,
      w.total_volume,
      w.notes,
      w.template_id,
      w.user_id,
      COALESCE(
        json_agg(
          json_build_object(
            'id', we.id,
            'exerciseId', we.exercise_id,
            'exerciseName', e.name,
            'exerciseType', e.type,
            'orderIndex', we.order_index,
            'isCompleted', we.is_completed,
            'sets', (
              SELECT COALESCE(json_agg(
                json_build_object(
                  'id', s.id,
                  'setNumber', s.set_number,
                  'weight', s.weight,
                  'reps', s.reps,
                  'rir', s.rir,
                  'durationSeconds', s.duration_seconds,
                  'distance', s.distance,
                  'notes', s.notes,
                  'isWarmup', s.is_warmup,
                  'isCompleted', s.is_completed
                ) ORDER BY s.set_number
              ), '[]'::json)
              FROM "set" s
              WHERE s.workout_exercise_id = we.id
            )
          ) ORDER BY we.order_index
        ) FILTER (WHERE we.id IS NOT NULL),
        '[]'::json
      ) as exercises
    FROM workout w
    LEFT JOIN workout_exercise we ON w.id = we.workout_id
    LEFT JOIN exercise e ON we.exercise_id = e.id
    WHERE w.id = ${workoutId}
    GROUP BY w.id
  `;

  if (workouts.length === 0) {
    throw new Error('Workout not found');
  }

  const workout = workouts[0];

  // Verify ownership
  if (workout.user_id !== userId) {
    throw new Error('Unauthorized');
  }

  return {
    id: workout.id,
    name: workout.name,
    started_at: workout.started_at,
    completed_at: workout.completed_at,
    duration_seconds: workout.duration_seconds,
    total_volume: workout.total_volume ? parseFloat(workout.total_volume) : 0,
    notes: workout.notes,
    template_id: workout.template_id,
    exercises: workout.exercises.map(ex => ({
      id: ex.id,
      exercise_id: ex.exerciseId,
      name: ex.exerciseName,
      exercise_name: ex.exerciseName,
      type: ex.exerciseType,
      exercise_type: ex.exerciseType,
      order_index: ex.orderIndex,
      is_completed: ex.isCompleted,
      sets: ex.sets.map(set => ({
        id: set.id,
        set_number: set.setNumber,
        weight: set.weight ? parseFloat(set.weight) : null,
        reps: set.reps,
        rir: set.rir,
        duration_seconds: set.durationSeconds,
        distance: set.distance ? parseFloat(set.distance) : null,
        notes: set.notes,
        is_warmup: set.isWarmup,
        is_completed: set.isCompleted
      }))
    }))
  };
}

/**
 * Create a new workout
 *
 * @param {Object} workoutData - Workout data
 * @param {string} workoutData.name - Workout name (1-100 characters)
 * @param {string} workoutData.startedAt - ISO timestamp (optional, defaults to now)
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Created workout
 */
export async function createWorkout(workoutData, userId) {
  const { name, startedAt } = workoutData;

  // Validate name
  if (!name || typeof name !== 'string' || name.length < 1 || name.length > 100) {
    throw new Error('Workout name must be 1-100 characters');
  }

  // Use provided startedAt or current time
  const workoutStartedAt = startedAt ? new Date(startedAt) : new Date();

  // Validate startedAt is a valid date
  if (isNaN(workoutStartedAt.getTime())) {
    throw new Error('Invalid startedAt date');
  }

  // Create workout
  const result = await sql`
    INSERT INTO workout (user_id, name, started_at)
    VALUES (${userId}, ${name}, ${workoutStartedAt.toISOString()})
    RETURNING id, user_id, name, started_at
  `;

  const workout = result[0];

  return {
    id: workout.id,
    userId: workout.user_id,
    name: workout.name,
    startedAt: workout.started_at
  };
}

/**
 * Update a workout
 *
 * @param {string} workoutId - Workout UUID
 * @param {Object} updates - Fields to update
 * @param {string} updates.name - Workout name (optional)
 * @param {string} updates.notes - Workout notes (optional)
 * @param {string} updates.completedAt - Completion timestamp (optional)
 * @param {string} userId - User UUID (for ownership verification)
 * @returns {Promise<Object>} Updated workout
 */
export async function updateWorkout(workoutId, updates, userId) {
  const { name, notes, completedAt } = updates;

  // Verify workout exists and belongs to user
  const existing = await sql`
    SELECT id, user_id, started_at
    FROM workout
    WHERE id = ${workoutId}
  `;

  if (existing.length === 0) {
    throw new Error('Workout not found');
  }

  if (existing[0].user_id !== userId) {
    throw new Error('Unauthorized');
  }

  // Build update fields
  const updateFields = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.length < 1 || name.length > 100) {
      throw new Error('Workout name must be 1-100 characters');
    }
    updateFields.name = name;
  }

  if (notes !== undefined) {
    updateFields.notes = notes;
  }

  if (completedAt !== undefined) {
    const completedDate = new Date(completedAt);
    if (isNaN(completedDate.getTime())) {
      throw new Error('Invalid completedAt date');
    }
    updateFields.completed_at = completedDate.toISOString();

    // Calculate duration if completed
    const startedAt = new Date(existing[0].started_at);
    updateFields.duration_seconds = Math.floor((completedDate - startedAt) / 1000);
  }

  // Always recalculate total volume from sets
  updateFields.total_volume = await calculateWorkoutVolume(sql, workoutId);

  if (Object.keys(updateFields).length === 0) {
    throw new Error('No fields to update');
  }

  // Perform update using separate queries for each field (simpler with Neon)
  if (updateFields.name !== undefined) {
    await sql`UPDATE workout SET name = ${updateFields.name} WHERE id = ${workoutId}`;
  }
  if (updateFields.notes !== undefined) {
    await sql`UPDATE workout SET notes = ${updateFields.notes} WHERE id = ${workoutId}`;
  }
  if (updateFields.completed_at !== undefined) {
    await sql`UPDATE workout SET completed_at = ${updateFields.completed_at} WHERE id = ${workoutId}`;
  }
  if (updateFields.duration_seconds !== undefined) {
    await sql`UPDATE workout SET duration_seconds = ${updateFields.duration_seconds} WHERE id = ${workoutId}`;
  }
  if (updateFields.total_volume !== undefined) {
    await sql`UPDATE workout SET total_volume = ${updateFields.total_volume} WHERE id = ${workoutId}`;
  }

  // Fetch and return updated workout
  return getWorkoutById(workoutId, userId);
}

/**
 * Delete a workout (cascade deletes exercises and sets)
 *
 * @param {string} workoutId - Workout UUID
 * @param {string} userId - User UUID (for ownership verification)
 * @returns {Promise<Object>} { success: true, workoutId }
 */
export async function deleteWorkout(workoutId, userId) {
  // Verify workout exists and belongs to user
  const existing = await sql`
    SELECT id, user_id
    FROM workout
    WHERE id = ${workoutId}
  `;

  if (existing.length === 0) {
    throw new Error('Workout not found');
  }

  if (existing[0].user_id !== userId) {
    throw new Error('Unauthorized');
  }

  // Delete sets first
  await sql`
    DELETE FROM set
    WHERE workout_exercise_id IN (
      SELECT id FROM workout_exercise WHERE workout_id = ${workoutId}
    )
  `;

  // Delete workout exercises
  await sql`
    DELETE FROM workout_exercise
    WHERE workout_id = ${workoutId}
  `;

  // Delete workout
  await sql`
    DELETE FROM workout
    WHERE id = ${workoutId}
  `;

  return {
    success: true,
    workoutId
  };
}
