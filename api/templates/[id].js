import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/middleware/auth.js';

/**
 * GET /api/templates/[id]
 *
 * Get a specific template with all its exercises
 *
 * Response:
 * {
 *   "template": {
 *     "id": "uuid",
 *     "name": "Push Day",
 *     "description": "Chest, shoulders, triceps",
 *     "createdAt": "2026-01-17T14:30:00Z",
 *     "updatedAt": "2026-01-17T14:30:00Z",
 *     "exercises": [
 *       {
 *         "id": "uuid",
 *         "exerciseId": "uuid",
 *         "exerciseName": "Bench Press",
 *         "exerciseType": "weighted",
 *         "orderIndex": 0,
 *         "targetSets": 4,
 *         "targetRepsMin": 8,
 *         "targetRepsMax": 12,
 *         "notes": "Focus on form"
 *       }
 *     ]
 *   }
 * }
 */
async function handleGet(req, res) {
  try {
    const userId = req.user.userId;
    const templateId = req.query.id;

    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    // Get template and verify ownership
    const templates = await sql`
      SELECT id, user_id, name, description, created_at, updated_at
      FROM template
      WHERE id = ${templateId}
    `;

    if (templates.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templates[0];

    // Verify user owns this template
    if (template.user_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to access this template' });
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

    return res.status(200).json({
      template: {
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
      }
    });

  } catch (error) {
    console.error('Get template error:', error);
    return res.status(500).json({
      error: 'Failed to fetch template',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * PUT /api/templates/[id]
 *
 * Update a template (name, description, and/or exercises)
 *
 * Request body:
 * {
 *   "name": "Updated Push Day" (optional),
 *   "description": "Updated description" (optional),
 *   "exercises": [  (optional - if provided, replaces all exercises)
 *     {
 *       "exerciseId": "uuid",
 *       "targetSets": 4,
 *       "targetRepsMin": 8,
 *       "targetRepsMax": 12,
 *       "notes": "Focus on form"
 *     }
 *   ]
 * }
 *
 * Response:
 * {
 *   "template": {
 *     "id": "uuid",
 *     "name": "Updated Push Day",
 *     "description": "Updated description",
 *     "exerciseCount": 6,
 *     "updatedAt": "2026-01-17T15:30:00Z"
 *   }
 * }
 */
async function handlePut(req, res) {
  try {
    const userId = req.user.userId;
    const templateId = req.query.id;
    const { name, description, exercises } = req.body;

    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    // Get template and verify ownership
    const templates = await sql`
      SELECT id, user_id, name
      FROM template
      WHERE id = ${templateId}
    `;

    if (templates.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templates[0];

    // Verify user owns this template
    if (template.user_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to modify this template' });
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.length < 1 || name.length > 100) {
        return res.status(400).json({ error: 'Template name must be 1-100 characters' });
      }

      // Check if another template with same name exists
      if (name !== template.name) {
        const existingTemplate = await sql`
          SELECT id FROM template
          WHERE user_id = ${userId} AND name = ${name} AND id != ${templateId}
        `;

        if (existingTemplate.length > 0) {
          return res.status(400).json({ error: 'A template with this name already exists' });
        }
      }
    }

    // Validate description if provided
    if (description !== undefined && description !== null && typeof description !== 'string') {
      return res.status(400).json({ error: 'Description must be a string' });
    }

    // Validate exercises if provided
    if (exercises !== undefined) {
      if (!Array.isArray(exercises)) {
        return res.status(400).json({ error: 'Exercises must be an array' });
      }

      if (exercises.length === 0) {
        return res.status(400).json({ error: 'Template must have at least one exercise' });
      }

      // Validate each exercise
      for (let i = 0; i < exercises.length; i++) {
        const exercise = exercises[i];

        if (!exercise.exerciseId || typeof exercise.exerciseId !== 'string') {
          return res.status(400).json({ error: `Exercise ${i + 1}: exerciseId is required` });
        }

        // Validate optional fields
        if (exercise.targetSets !== undefined && (!Number.isInteger(exercise.targetSets) || exercise.targetSets < 1)) {
          return res.status(400).json({ error: `Exercise ${i + 1}: targetSets must be a positive integer` });
        }

        if (exercise.targetRepsMin !== undefined && (!Number.isInteger(exercise.targetRepsMin) || exercise.targetRepsMin < 1)) {
          return res.status(400).json({ error: `Exercise ${i + 1}: targetRepsMin must be a positive integer` });
        }

        if (exercise.targetRepsMax !== undefined && (!Number.isInteger(exercise.targetRepsMax) || exercise.targetRepsMax < 1)) {
          return res.status(400).json({ error: `Exercise ${i + 1}: targetRepsMax must be a positive integer` });
        }

        if (exercise.targetRepsMin !== undefined && exercise.targetRepsMax !== undefined && exercise.targetRepsMin > exercise.targetRepsMax) {
          return res.status(400).json({ error: `Exercise ${i + 1}: targetRepsMin cannot be greater than targetRepsMax` });
        }

        if (exercise.notes !== undefined && exercise.notes !== null && typeof exercise.notes !== 'string') {
          return res.status(400).json({ error: `Exercise ${i + 1}: notes must be a string` });
        }
      }

      // Verify all exercises exist
      const exerciseIds = exercises.map(e => e.exerciseId);
      const existingExercises = await sql`
        SELECT id FROM exercise
        WHERE id = ANY(${exerciseIds})
      `;

      if (existingExercises.length !== exerciseIds.length) {
        return res.status(400).json({ error: 'One or more exercises do not exist' });
      }
    }

    // Update template basic info (only if provided)
    if (name !== undefined || description !== undefined) {
      const updateFields = [];
      const updateValues = [];

      if (name !== undefined) {
        updateFields.push('name');
        updateValues.push(name);
      }

      if (description !== undefined) {
        updateFields.push('description');
        updateValues.push(description);
      }

      // Build dynamic update query
      const setClauses = updateFields.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
      await sql`
        UPDATE template
        SET name = ${name !== undefined ? name : template.name},
            description = ${description !== undefined ? description : sql`description`}
        WHERE id = ${templateId}
      `;
    }

    // Update exercises if provided
    if (exercises !== undefined) {
      // Delete existing template exercises
      await sql`
        DELETE FROM template_exercise
        WHERE template_id = ${templateId}
      `;

      // Insert new template exercises with normalized order_index (0, 1, 2, ...)
      for (let i = 0; i < exercises.length; i++) {
        const exercise = exercises[i];
        await sql`
          INSERT INTO template_exercise (
            template_id, exercise_id, order_index,
            target_sets, target_reps_min, target_reps_max, notes
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
    }

    // Get updated template info
    const updatedTemplate = await sql`
      SELECT
        t.id, t.name, t.description, t.updated_at,
        COUNT(te.id) as exercise_count
      FROM template t
      LEFT JOIN template_exercise te ON t.id = te.template_id
      WHERE t.id = ${templateId}
      GROUP BY t.id
    `;

    return res.status(200).json({
      template: {
        id: updatedTemplate[0].id,
        name: updatedTemplate[0].name,
        description: updatedTemplate[0].description,
        exerciseCount: parseInt(updatedTemplate[0].exercise_count),
        updatedAt: updatedTemplate[0].updated_at
      }
    });

  } catch (error) {
    console.error('Update template error:', error);
    return res.status(500).json({
      error: 'Failed to update template',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * DELETE /api/templates/[id]
 *
 * Delete a template and all its template exercises
 *
 * Response:
 * {
 *   "message": "Template deleted successfully"
 * }
 */
async function handleDelete(req, res) {
  try {
    const userId = req.user.userId;
    const templateId = req.query.id;

    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    // Get template and verify ownership
    const templates = await sql`
      SELECT id, user_id
      FROM template
      WHERE id = ${templateId}
    `;

    if (templates.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templates[0];

    // Verify user owns this template
    if (template.user_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this template' });
    }

    // Delete template (template_exercise records will cascade delete)
    await sql`
      DELETE FROM template
      WHERE id = ${templateId}
    `;

    return res.status(200).json({
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Delete template error:', error);
    return res.status(500).json({
      error: 'Failed to delete template',
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
