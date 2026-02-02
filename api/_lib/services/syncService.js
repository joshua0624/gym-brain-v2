/**
 * Sync Service
 *
 * Business logic for syncing offline workouts to server
 */

import { sql } from '../db.js';
import { calculateWorkoutVolume } from '../calculations/volumeCalculator.js';
import { bulkDeleteDrafts } from './draftService.js';

/**
 * Sync offline workouts to server
 * CRITICAL: Atomic transaction to insert workouts and delete drafts
 *
 * @param {Object} syncData - Sync data
 * @param {Array<Object>} syncData.completedWorkouts - Array of completed workouts
 * @param {Array<string>} syncData.deleteDraftIds - Array of draft IDs to delete
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} { success, syncedWorkouts, deletedDrafts }
 */
export async function syncWorkouts(syncData, userId) {
  const { completedWorkouts = [], deleteDraftIds = [] } = syncData;

  // Validate inputs
  if (!Array.isArray(completedWorkouts)) {
    throw new Error('completedWorkouts must be an array');
  }

  if (!Array.isArray(deleteDraftIds)) {
    throw new Error('deleteDraftIds must be an array');
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
                ${exercise.isCompleted !== false}
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
                ${exercise.isCompleted !== false}
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
                  INSERT INTO "set" (
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
                    ${set.isWarmup || false},
                    ${set.isCompleted !== false}
                  )
                `;
              } else {
                // Let database generate UUID
                await sql`
                  INSERT INTO "set" (
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
                    ${set.isWarmup || false},
                    ${set.isCompleted !== false}
                  )
                `;
              }
            }
          }
        }
      }

      // Recalculate total volume
      const totalVolume = await calculateWorkoutVolume(sql, insertedWorkoutId);

      // Update workout with calculated volume
      await sql`
        UPDATE workout
        SET total_volume = ${totalVolume}
        WHERE id = ${insertedWorkoutId}
      `;

      syncedWorkouts.push({
        clientId: workout.id || null,
        serverId: insertedWorkoutId,
        name: workout.name
      });

    } catch (workoutError) {
      console.error('Error syncing individual workout:', workoutError);
      // Continue with other workouts instead of failing entire batch
    }
  }

  // Delete drafts (CRITICAL for preventing zombie drafts)
  const deletedDraftsCount = await bulkDeleteDrafts(deleteDraftIds, userId);

  return {
    success: true,
    syncedWorkouts,
    deletedDrafts: deletedDraftsCount
  };
}
