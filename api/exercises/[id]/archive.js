import { sql } from '../../_lib/db.js';
import { requireAuth } from '../../_lib/middleware/auth.js';

/**
 * PUT /api/exercises/[id]/archive
 *
 * Archive a custom exercise (soft delete)
 * Only the user who created the exercise can archive it
 * Library exercises (created_by IS NULL) cannot be archived by users
 *
 * Response:
 * {
 *   "success": true,
 *   "exercise": {
 *     "id": "uuid",
 *     "name": "Exercise Name",
 *     "isArchived": true
 *   }
 * }
 */
async function handleArchive(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Exercise ID is required' });
    }

    // Check if exercise exists and user owns it
    const exercise = await sql`
      SELECT id, name, is_custom, created_by, is_archived
      FROM exercise
      WHERE id = ${id}
    `;

    if (exercise.length === 0) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    const ex = exercise[0];

    // Verify user owns this exercise
    if (!ex.is_custom || ex.created_by !== userId) {
      return res.status(403).json({
        error: 'You can only archive exercises you created'
      });
    }

    // Check if already archived
    if (ex.is_archived) {
      return res.status(400).json({
        error: 'Exercise is already archived'
      });
    }

    // Archive the exercise (soft delete)
    const result = await sql`
      UPDATE exercise
      SET is_archived = true
      WHERE id = ${id}
      RETURNING id, name, is_archived
    `;

    const updated = result[0];

    return res.status(200).json({
      success: true,
      exercise: {
        id: updated.id,
        name: updated.name,
        isArchived: updated.is_archived
      }
    });

  } catch (error) {
    console.error('Archive exercise error:', error);
    return res.status(500).json({
      error: 'Failed to archive exercise',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * Main handler - only allows PUT requests
 */
export default function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return requireAuth(handleArchive)(req, res);
}
