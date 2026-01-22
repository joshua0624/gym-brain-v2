import { sql } from '../../_lib/db.js';
import { requireAuth } from '../../_lib/middleware/auth.js';

/**
 * GET /api/templates/[id]/exercises
 *
 * Get all exercises for a specific template with full exercise details
 * Ordered by order_index
 *
 * Response:
 * {
 *   "exercises": [
 *     {
 *       "id": "uuid",
 *       "exerciseId": "uuid",
 *       "exerciseName": "Bench Press",
 *       "exerciseType": "weighted",
 *       "exerciseEquipment": "barbell",
 *       "primaryMuscles": ["chest", "shoulders"],
 *       "secondaryMuscles": ["triceps"],
 *       "orderIndex": 0,
 *       "targetSets": 4,
 *       "targetRepsMin": 8,
 *       "targetRepsMax": 12,
 *       "notes": "Focus on form"
 *     }
 *   ]
 * }
 */
async function handleGet(req, res) {
  try {
    const userId = req.user.userId;
    const templateId = req.query.id;

    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    // Verify template exists and user owns it
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
      return res.status(403).json({ error: 'You do not have permission to access this template' });
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

    return res.status(200).json({
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
    });

  } catch (error) {
    console.error('Get template exercises error:', error);
    return res.status(500).json({
      error: 'Failed to fetch template exercises',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * Main handler - only GET method allowed
 */
export default function handler(req, res) {
  if (req.method === 'GET') {
    return requireAuth(handleGet)(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
