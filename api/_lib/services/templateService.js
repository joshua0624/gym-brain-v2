/**
 * Template Service
 *
 * Business logic for workout template management
 */

import { sql } from '../db.js';

/**
 * Get all templates for authenticated user
 *
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} { templates }
 */
export async function getTemplates(userId) {
  // Get all templates for user with exercise count
  const templates = await sql`
    SELECT
      t.id,
      t.name,
      t.description,
      t.created_at,
      t.updated_at,
      COUNT(te.id) as exercise_count
    FROM template t
    LEFT JOIN template_exercise te ON t.id = te.template_id
    WHERE t.user_id = ${userId}
    GROUP BY t.id
    ORDER BY t.updated_at DESC
  `;

  return {
    templates: templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      exerciseCount: parseInt(template.exercise_count),
      createdAt: template.created_at,
      updatedAt: template.updated_at
    }))
  };
}

/**
 * Get a specific template with all its exercises
 *
 * @param {string} templateId - Template UUID
 * @param {string} userId - User UUID (for ownership verification)
 * @returns {Promise<Object>} Template object with exercises
 * @throws {Error} If template not found or unauthorized
 */
export async function getTemplateById(templateId, userId) {
  if (!templateId) {
    throw new Error('Template ID is required');
  }

  // Get template and verify ownership
  const templates = await sql`
    SELECT id, user_id, name, description, created_at, updated_at
    FROM template
    WHERE id = ${templateId}
  `;

  if (templates.length === 0) {
    throw new Error('Template not found');
  }

  const template = templates[0];

  // Verify user owns this template
  if (template.user_id !== userId) {
    throw new Error('You do not have permission to access this template');
  }

  // Get template exercises with exercise details
  const exercises = await sql`
    SELECT
      te.id,
      te.exercise_id,
      te.order_index,
      te.target_sets,
      te.target_reps_min,
      te.target_reps_max,
      te.notes,
      e.name as exercise_name,
      e.type as exercise_type,
      e.equipment as exercise_equipment,
      e.primary_muscles,
      e.secondary_muscles
    FROM template_exercise te
    JOIN exercise e ON te.exercise_id = e.id
    WHERE te.template_id = ${templateId}
    ORDER BY te.order_index ASC
  `;

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    createdAt: template.created_at,
    updatedAt: template.updated_at,
    exercises: exercises.map(ex => ({
      id: ex.id,
      exerciseId: ex.exercise_id,
      exerciseName: ex.exercise_name,
      exerciseType: ex.exercise_type,
      exerciseEquipment: ex.exercise_equipment,
      primaryMuscles: ex.primary_muscles,
      secondaryMuscles: ex.secondary_muscles,
      orderIndex: ex.order_index,
      targetSets: ex.target_sets,
      targetRepsMin: ex.target_reps_min,
      targetRepsMax: ex.target_reps_max,
      notes: ex.notes
    }))
  };
}

/**
 * Get template exercises with full exercise details
 *
 * @param {string} templateId - Template UUID
 * @param {string} userId - User UUID (for ownership verification)
 * @returns {Promise<Object>} { exercises }
 * @throws {Error} If template not found or unauthorized
 */
export async function getTemplateExercises(templateId, userId) {
  if (!templateId) {
    throw new Error('Template ID is required');
  }

  // Verify template exists and user owns it
  const templates = await sql`
    SELECT id, user_id
    FROM template
    WHERE id = ${templateId}
  `;

  if (templates.length === 0) {
    throw new Error('Template not found');
  }

  const template = templates[0];

  // Verify user owns this template
  if (template.user_id !== userId) {
    throw new Error('You do not have permission to access this template');
  }

  // Get template exercises joined with exercise details
  const exercises = await sql`
    SELECT
      te.id,
      te.exercise_id,
      te.order_index,
      te.target_sets,
      te.target_reps_min,
      te.target_reps_max,
      te.notes,
      e.name as exercise_name,
      e.type as exercise_type,
      e.equipment as exercise_equipment,
      e.primary_muscles,
      e.secondary_muscles,
      e.is_custom,
      e.is_archived
    FROM template_exercise te
    JOIN exercise e ON te.exercise_id = e.id
    WHERE te.template_id = ${templateId}
    ORDER BY te.order_index ASC
  `;

  return {
    exercises: exercises.map(ex => ({
      id: ex.id,
      exerciseId: ex.exercise_id,
      exerciseName: ex.exercise_name,
      exerciseType: ex.exercise_type,
      exerciseEquipment: ex.exercise_equipment,
      primaryMuscles: ex.primary_muscles,
      secondaryMuscles: ex.secondary_muscles,
      isCustom: ex.is_custom,
      isArchived: ex.is_archived,
      orderIndex: ex.order_index,
      targetSets: ex.target_sets,
      targetRepsMin: ex.target_reps_min,
      targetRepsMax: ex.target_reps_max,
      notes: ex.notes
    }))
  };
}

/**
 * Create a new template with exercises
 *
 * @param {Object} templateData - Template data
 * @param {string} templateData.name - Template name (1-100 characters)
 * @param {string} templateData.description - Template description (optional)
 * @param {Array<Object>} templateData.exercises - Array of exercises
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Created template
 */
export async function createTemplate(templateData, userId) {
  const { name, description, exercises } = templateData;

  // Validate name
  if (!name || typeof name !== 'string' || name.length < 1 || name.length > 100) {
    throw new Error('Template name must be 1-100 characters');
  }

  // Validate description (optional)
  if (description !== undefined && description !== null && typeof description !== 'string') {
    throw new Error('Description must be a string');
  }

  // Validate exercises array
  if (!Array.isArray(exercises)) {
    throw new Error('Exercises must be an array');
  }

  if (exercises.length === 0) {
    throw new Error('Template must have at least one exercise');
  }

  // Validate each exercise
  for (let i = 0; i < exercises.length; i++) {
    const exercise = exercises[i];

    if (!exercise.exerciseId || typeof exercise.exerciseId !== 'string') {
      throw new Error(`Exercise ${i + 1}: exerciseId is required`);
    }

    // Validate optional fields
    if (exercise.targetSets !== undefined && (!Number.isInteger(exercise.targetSets) || exercise.targetSets < 1)) {
      throw new Error(`Exercise ${i + 1}: targetSets must be a positive integer`);
    }

    if (exercise.targetRepsMin !== undefined && (!Number.isInteger(exercise.targetRepsMin) || exercise.targetRepsMin < 1)) {
      throw new Error(`Exercise ${i + 1}: targetRepsMin must be a positive integer`);
    }

    if (exercise.targetRepsMax !== undefined && (!Number.isInteger(exercise.targetRepsMax) || exercise.targetRepsMax < 1)) {
      throw new Error(`Exercise ${i + 1}: targetRepsMax must be a positive integer`);
    }

    if (exercise.targetRepsMin !== undefined && exercise.targetRepsMax !== undefined && exercise.targetRepsMin > exercise.targetRepsMax) {
      throw new Error(`Exercise ${i + 1}: targetRepsMin cannot be greater than targetRepsMax`);
    }

    if (exercise.notes !== undefined && exercise.notes !== null && typeof exercise.notes !== 'string') {
      throw new Error(`Exercise ${i + 1}: notes must be a string`);
    }
  }

  // Check if template with same name already exists for this user
  const existingTemplate = await sql`
    SELECT id FROM template
    WHERE user_id = ${userId} AND name = ${name}
  `;

  if (existingTemplate.length > 0) {
    throw new Error('A template with this name already exists');
  }

  // Create template
  const templateResult = await sql`
    INSERT INTO template (user_id, name, description, created_at, updated_at)
    VALUES (${userId}, ${name}, ${description || null}, NOW(), NOW())
    RETURNING id, name, description, created_at, updated_at
  `;

  const template = templateResult[0];

  // Insert exercises
  for (let i = 0; i < exercises.length; i++) {
    const exercise = exercises[i];
    await sql`
      INSERT INTO template_exercise (
        template_id,
        exercise_id,
        order_index,
        target_sets,
        target_reps_min,
        target_reps_max,
        notes
      )
      VALUES (
        ${template.id},
        ${exercise.exerciseId},
        ${i},
        ${exercise.targetSets || null},
        ${exercise.targetRepsMin || null},
        ${exercise.targetRepsMax || null},
        ${exercise.notes || null}
      )
    `;
  }

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    exerciseCount: exercises.length,
    createdAt: template.created_at,
    updatedAt: template.updated_at
  };
}

/**
 * Update a template (name, description, and/or exercises)
 *
 * @param {string} templateId - Template UUID
 * @param {Object} updates - Fields to update
 * @param {string} updates.name - Template name (optional)
 * @param {string} updates.description - Template description (optional)
 * @param {Array<Object>} updates.exercises - Exercises array (optional, replaces all)
 * @param {string} userId - User UUID (for ownership verification)
 * @returns {Promise<Object>} Updated template
 */
export async function updateTemplate(templateId, updates, userId) {
  const { name, description, exercises } = updates;

  if (!templateId) {
    throw new Error('Template ID is required');
  }

  // Verify template exists and user owns it
  const existingTemplate = await sql`
    SELECT id, user_id, name
    FROM template
    WHERE id = ${templateId}
  `;

  if (existingTemplate.length === 0) {
    throw new Error('Template not found');
  }

  if (existingTemplate[0].user_id !== userId) {
    throw new Error('You do not have permission to update this template');
  }

  // Validate updates
  if (name !== undefined && (typeof name !== 'string' || name.length < 1 || name.length > 100)) {
    throw new Error('Template name must be 1-100 characters');
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    throw new Error('Description must be a string');
  }

  // Check if name is being changed and if it conflicts with another template
  if (name !== undefined && name !== existingTemplate[0].name) {
    const nameCheck = await sql`
      SELECT id FROM template
      WHERE user_id = ${userId} AND name = ${name} AND id != ${templateId}
    `;

    if (nameCheck.length > 0) {
      throw new Error('A template with this name already exists');
    }
  }

  // Update basic fields if provided
  if (name !== undefined || description !== undefined) {
    if (name !== undefined && description !== undefined) {
      await sql`
        UPDATE template
        SET name = ${name}, description = ${description}, updated_at = NOW()
        WHERE id = ${templateId}
      `;
    } else if (name !== undefined) {
      await sql`
        UPDATE template
        SET name = ${name}, updated_at = NOW()
        WHERE id = ${templateId}
      `;
    } else if (description !== undefined) {
      await sql`
        UPDATE template
        SET description = ${description}, updated_at = NOW()
        WHERE id = ${templateId}
      `;
    }
  }

  // Update exercises if provided
  if (exercises !== undefined) {
    if (!Array.isArray(exercises)) {
      throw new Error('Exercises must be an array');
    }

    if (exercises.length === 0) {
      throw new Error('Template must have at least one exercise');
    }

    // Validate exercises
    for (let i = 0; i < exercises.length; i++) {
      const exercise = exercises[i];

      if (!exercise.exerciseId || typeof exercise.exerciseId !== 'string') {
        throw new Error(`Exercise ${i + 1}: exerciseId is required`);
      }

      if (exercise.targetSets !== undefined && (!Number.isInteger(exercise.targetSets) || exercise.targetSets < 1)) {
        throw new Error(`Exercise ${i + 1}: targetSets must be a positive integer`);
      }

      if (exercise.targetRepsMin !== undefined && (!Number.isInteger(exercise.targetRepsMin) || exercise.targetRepsMin < 1)) {
        throw new Error(`Exercise ${i + 1}: targetRepsMin must be a positive integer`);
      }

      if (exercise.targetRepsMax !== undefined && (!Number.isInteger(exercise.targetRepsMax) || exercise.targetRepsMax < 1)) {
        throw new Error(`Exercise ${i + 1}: targetRepsMax must be a positive integer`);
      }

      if (exercise.targetRepsMin !== undefined && exercise.targetRepsMax !== undefined && exercise.targetRepsMin > exercise.targetRepsMax) {
        throw new Error(`Exercise ${i + 1}: targetRepsMin cannot be greater than targetRepsMax`);
      }

      if (exercise.notes !== undefined && exercise.notes !== null && typeof exercise.notes !== 'string') {
        throw new Error(`Exercise ${i + 1}: notes must be a string`);
      }
    }

    // Delete existing exercises
    await sql`
      DELETE FROM template_exercise
      WHERE template_id = ${templateId}
    `;

    // Insert new exercises
    for (let i = 0; i < exercises.length; i++) {
      const exercise = exercises[i];
      await sql`
        INSERT INTO template_exercise (
          template_id,
          exercise_id,
          order_index,
          target_sets,
          target_reps_min,
          target_reps_max,
          notes
        )
        VALUES (
          ${templateId},
          ${exercise.exerciseId},
          ${i},
          ${exercise.targetSets || null},
          ${exercise.targetRepsMin || null},
          ${exercise.targetRepsMax || null},
          ${exercise.notes || null}
        )
      `;
    }

    // Update timestamp
    await sql`
      UPDATE template
      SET updated_at = NOW()
      WHERE id = ${templateId}
    `;
  }

  // Return updated template
  return getTemplateById(templateId, userId);
}

/**
 * Delete a template
 *
 * @param {string} templateId - Template UUID
 * @param {string} userId - User UUID (for ownership verification)
 * @returns {Promise<Object>} { success: true, templateId }
 */
export async function deleteTemplate(templateId, userId) {
  if (!templateId) {
    throw new Error('Template ID is required');
  }

  // Verify template exists and user owns it
  const existingTemplate = await sql`
    SELECT id, user_id
    FROM template
    WHERE id = ${templateId}
  `;

  if (existingTemplate.length === 0) {
    throw new Error('Template not found');
  }

  if (existingTemplate[0].user_id !== userId) {
    throw new Error('You do not have permission to delete this template');
  }

  // Delete template exercises first
  await sql`
    DELETE FROM template_exercise
    WHERE template_id = ${templateId}
  `;

  // Delete template
  await sql`
    DELETE FROM template
    WHERE id = ${templateId}
  `;

  return {
    success: true,
    templateId
  };
}
