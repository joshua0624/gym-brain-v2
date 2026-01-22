import { sql } from './_lib/db.js';
import { requireAuth } from './_lib/middleware/auth.js';

/**
 * GET /api/templates
 *
 * Get all templates for authenticated user with their exercises
 *
 * Response:
 * {
 *   "templates": [
 *     {
 *       "id": "uuid",
 *       "name": "Push Day",
 *       "description": "Chest, shoulders, triceps",
 *       "exerciseCount": 6,
 *       "createdAt": "2026-01-17T14:30:00Z",
 *       "updatedAt": "2026-01-17T14:30:00Z"
 *     }
 *   ]
 * }
 */
async function handleGet(req, res) {
  try {
    const userId = req.user.userId;

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

    return res.status(200).json({
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        exerciseCount: parseInt(template.exercise_count),
        createdAt: template.created_at,
        updatedAt: template.updated_at
      }))
    });

  } catch (error) {
    console.error('Get templates error:', error);
    return res.status(500).json({
      error: 'Failed to fetch templates',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * POST /api/templates
 *
 * Create a new template with exercises
 *
 * Request body:
 * {
 *   "name": "Push Day",
 *   "description": "Chest, shoulders, triceps" (optional),
 *   "exercises": [
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
 *     "name": "Push Day",
 *     "description": "Chest, shoulders, triceps",
 *     "exerciseCount": 6
 *   }
 * }
 */
async function handlePost(req, res) {
  try {
    const userId = req.user.userId;
    const { name, description, exercises } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || name.length < 1 || name.length > 100) {
      return res.status(400).json({ error: 'Template name must be 1-100 characters' });
    }

    // Validate description (optional)
    if (description !== undefined && description !== null && typeof description !== 'string') {
      return res.status(400).json({ error: 'Description must be a string' });
    }

    // Validate exercises array
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

    // Check if template with same name already exists for this user
    const existingTemplate = await sql`
      SELECT id FROM template
      WHERE user_id = ${userId} AND name = ${name}
    `;

    if (existingTemplate.length > 0) {
      return res.status(400).json({ error: 'A template with this name already exists' });
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

    // Create template
    const templateResult = await sql`
      INSERT INTO template (user_id, name, description)
      VALUES (${userId}, ${name}, ${description || null})
      RETURNING id, name, description, created_at, updated_at
    `;

    const template = templateResult[0];

    // Insert template exercises with order_index
    for (let i = 0; i < exercises.length; i++) {
      const exercise = exercises[i];
      await sql`
        INSERT INTO template_exercise (
          template_id, exercise_id, order_index,
          target_sets, target_reps_min, target_reps_max, notes
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

    return res.status(201).json({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        exerciseCount: exercises.length,
        createdAt: template.created_at,
        updatedAt: template.updated_at
      }
    });

  } catch (error) {
    console.error('Create template error:', error);
    return res.status(500).json({
      error: 'Failed to create template',
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
