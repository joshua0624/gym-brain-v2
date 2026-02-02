/**
 * Exercise Service
 *
 * Business logic for exercise library management
 */

import { sql } from '../db.js';
import { checkForDuplicates } from '../fuzzyMatch.js';

/**
 * Get exercise library (all non-archived exercises)
 * Includes library exercises + user's custom exercises (if authenticated)
 *
 * @param {string} userId - User UUID (optional, null for unauthenticated users)
 * @param {Object} filters - Filter options
 * @param {string} filters.muscle - Filter by muscle group
 * @param {string} filters.equipment - Filter by equipment
 * @param {string} filters.type - Filter by exercise type
 * @returns {Promise<Object>} { exercises }
 */
export async function getExercises(userId = null, filters = {}) {
  const { muscle, equipment, type } = filters;

  // Fetch all non-archived exercises accessible to user
  let allExercises;

  if (userId) {
    // Include library exercises + user's custom exercises
    allExercises = await sql`
      SELECT
        id, name, type, equipment, primary_muscles, secondary_muscles,
        is_custom, is_archived, created_by
      FROM exercise
      WHERE is_archived = false
        AND (created_by IS NULL OR created_by = ${userId})
      ORDER BY
        CASE WHEN created_by IS NULL THEN 0 ELSE 1 END,
        name ASC
    `;
  } else {
    // Only library exercises for unauthenticated users
    allExercises = await sql`
      SELECT
        id, name, type, equipment, primary_muscles, secondary_muscles,
        is_custom, is_archived, created_by
      FROM exercise
      WHERE is_archived = false
        AND created_by IS NULL
      ORDER BY name ASC
    `;
  }

  // Apply filters
  let exercises = allExercises;

  if (muscle) {
    const muscleLower = muscle.toLowerCase();
    exercises = exercises.filter(ex =>
      ex.primary_muscles?.includes(muscleLower) ||
      ex.secondary_muscles?.includes(muscleLower)
    );
  }

  if (equipment) {
    const equipmentLower = equipment.toLowerCase();
    exercises = exercises.filter(ex => ex.equipment === equipmentLower);
  }

  if (type) {
    const typeLower = type.toLowerCase();
    exercises = exercises.filter(ex => ex.type === typeLower);
  }

  // Transform to camelCase
  const formattedExercises = exercises.map(ex => ({
    id: ex.id,
    name: ex.name,
    type: ex.type,
    equipment: ex.equipment,
    primaryMuscles: ex.primary_muscles || [],
    secondaryMuscles: ex.secondary_muscles || [],
    isCustom: ex.is_custom,
    isArchived: ex.is_archived,
    createdBy: ex.created_by
  }));

  return {
    exercises: formattedExercises
  };
}

/**
 * Create a custom exercise
 *
 * @param {Object} exerciseData - Exercise data
 * @param {string} exerciseData.name - Exercise name (1-100 chars)
 * @param {string} exerciseData.type - Exercise type (weighted, bodyweight, cardio, timed)
 * @param {string} exerciseData.equipment - Equipment type
 * @param {Array<string>} exerciseData.primaryMuscles - Primary muscle groups
 * @param {Array<string>} exerciseData.secondaryMuscles - Secondary muscle groups
 * @param {boolean} exerciseData.skipDuplicateCheck - Skip duplicate check
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} { proceed: true, exercise } or { proceed: false, suggestions }
 */
export async function createExercise(exerciseData, userId) {
  const {
    name,
    type,
    equipment,
    primaryMuscles = [],
    secondaryMuscles = [],
    skipDuplicateCheck = false
  } = exerciseData;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.length < 1 || name.length > 100) {
    throw new Error('Exercise name must be 1-100 characters');
  }

  const validTypes = ['weighted', 'bodyweight', 'cardio', 'timed'];
  if (!type || !validTypes.includes(type)) {
    throw new Error(`Type must be one of: ${validTypes.join(', ')}`);
  }

  const validEquipment = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'other'];
  if (!equipment || !validEquipment.includes(equipment)) {
    throw new Error(`Equipment must be one of: ${validEquipment.join(', ')}`);
  }

  if (!Array.isArray(primaryMuscles) || primaryMuscles.length === 0) {
    throw new Error('At least one primary muscle group is required');
  }

  if (!Array.isArray(secondaryMuscles)) {
    throw new Error('Secondary muscles must be an array');
  }

  // Check for duplicates unless user explicitly confirmed
  if (!skipDuplicateCheck) {
    // Fetch all non-archived exercises
    const allExercises = await sql`
      SELECT id, name, type, equipment, primary_muscles, secondary_muscles
      FROM exercise
      WHERE is_archived = false
    `;

    const duplicateCheck = checkForDuplicates(name, allExercises, 70);

    if (duplicateCheck.isDuplicate) {
      return {
        proceed: false,
        suggestions: duplicateCheck.suggestions
      };
    }
  }

  // Create custom exercise
  const result = await sql`
    INSERT INTO exercise (
      name,
      type,
      equipment,
      primary_muscles,
      secondary_muscles,
      is_custom,
      is_archived,
      created_by
    )
    VALUES (
      ${name},
      ${type},
      ${equipment},
      ${primaryMuscles},
      ${secondaryMuscles},
      true,
      false,
      ${userId}
    )
    RETURNING *
  `;

  const exercise = result[0];

  return {
    proceed: true,
    exercise: {
      id: exercise.id,
      name: exercise.name,
      type: exercise.type,
      equipment: exercise.equipment,
      primaryMuscles: exercise.primary_muscles,
      secondaryMuscles: exercise.secondary_muscles,
      isCustom: exercise.is_custom,
      isArchived: exercise.is_archived,
      createdBy: exercise.created_by
    }
  };
}

/**
 * Archive a custom exercise (soft delete)
 * Only the user who created the exercise can archive it
 *
 * @param {string} exerciseId - Exercise UUID
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} { success: true, exercise }
 * @throws {Error} If exercise not found, unauthorized, or already archived
 */
export async function archiveExercise(exerciseId, userId) {
  if (!exerciseId) {
    throw new Error('Exercise ID is required');
  }

  // Check if exercise exists and user owns it
  const exercise = await sql`
    SELECT id, name, is_custom, created_by, is_archived
    FROM exercise
    WHERE id = ${exerciseId}
  `;

  if (exercise.length === 0) {
    throw new Error('Exercise not found');
  }

  const ex = exercise[0];

  // Verify user owns this exercise
  if (!ex.is_custom || ex.created_by !== userId) {
    throw new Error('You can only archive exercises you created');
  }

  // Check if already archived
  if (ex.is_archived) {
    throw new Error('Exercise is already archived');
  }

  // Archive the exercise (soft delete)
  const result = await sql`
    UPDATE exercise
    SET is_archived = true
    WHERE id = ${exerciseId}
    RETURNING id, name, is_archived
  `;

  const updated = result[0];

  return {
    success: true,
    exercise: {
      id: updated.id,
      name: updated.name,
      isArchived: updated.is_archived
    }
  };
}

/**
 * Unarchive a custom exercise
 * Only the user who created the exercise can unarchive it
 *
 * @param {string} exerciseId - Exercise UUID
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} { success: true, exercise }
 * @throws {Error} If exercise not found, unauthorized, or not archived
 */
export async function unarchiveExercise(exerciseId, userId) {
  if (!exerciseId) {
    throw new Error('Exercise ID is required');
  }

  // Check if exercise exists and user owns it
  const exercise = await sql`
    SELECT id, name, is_custom, created_by, is_archived
    FROM exercise
    WHERE id = ${exerciseId}
  `;

  if (exercise.length === 0) {
    throw new Error('Exercise not found');
  }

  const ex = exercise[0];

  // Verify user owns this exercise
  if (!ex.is_custom || ex.created_by !== userId) {
    throw new Error('You can only unarchive exercises you created');
  }

  // Check if not archived
  if (!ex.is_archived) {
    throw new Error('Exercise is not archived');
  }

  // Unarchive the exercise
  const result = await sql`
    UPDATE exercise
    SET is_archived = false
    WHERE id = ${exerciseId}
    RETURNING id, name, is_archived
  `;

  const updated = result[0];

  return {
    success: true,
    exercise: {
      id: updated.id,
      name: updated.name,
      isArchived: updated.is_archived
    }
  };
}

/**
 * Get exercise by ID
 *
 * @param {string} exerciseId - Exercise UUID
 * @param {string} userId - User UUID (optional)
 * @returns {Promise<Object>} Exercise object
 * @throws {Error} If exercise not found
 */
export async function getExerciseById(exerciseId, userId = null) {
  if (!exerciseId) {
    throw new Error('Exercise ID is required');
  }

  const exercise = await sql`
    SELECT id, name, type, equipment, primary_muscles, secondary_muscles,
           is_custom, is_archived, created_by
    FROM exercise
    WHERE id = ${exerciseId}
    AND (created_by IS NULL OR created_by = ${userId})
  `;

  if (exercise.length === 0) {
    throw new Error('Exercise not found');
  }

  const ex = exercise[0];

  return {
    id: ex.id,
    name: ex.name,
    type: ex.type,
    equipment: ex.equipment,
    primaryMuscles: ex.primary_muscles || [],
    secondaryMuscles: ex.secondary_muscles || [],
    isCustom: ex.is_custom,
    isArchived: ex.is_archived,
    createdBy: ex.created_by
  };
}
