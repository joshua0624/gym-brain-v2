import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/middleware/auth.js';

/**
 * GET /api/workouts/draft
 *
 * Get user's current active workout draft
 * If draft has expired, delete it and return null
 *
 * Response:
 * {
 *   "draft": {
 *     "id": "uuid",
 *     "name": "Push Day",
 *     "data": {
 *       "workoutName": "Push Day",
 *       "startedAt": "2026-01-17T14:30:00Z",
 *       "exercises": [...],
 *       "notes": "..."
 *     },
 *     "lastSyncedAt": "2026-01-17T15:00:00Z",
 *     "createdAt": "2026-01-17T14:30:00Z",
 *     "expiresAt": "2026-01-18T14:30:00Z"
 *   }
 * }
 *
 * Or if no draft:
 * {
 *   "draft": null
 * }
 */
async function handleGet(req, res) {
  try {
    const userId = req.user.userId;

    // Get latest draft for user
    const drafts = await sql`
      SELECT id, user_id, name, data, last_synced_at, created_at, expires_at
      FROM workout_draft
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (drafts.length === 0) {
      return res.status(200).json({ draft: null });
    }

    const draft = drafts[0];

    // Check if expired
    if (draft.expires_at && new Date(draft.expires_at) < new Date()) {
      // Delete expired draft
      await sql`
        DELETE FROM workout_draft
        WHERE id = ${draft.id}
      `;

      return res.status(200).json({ draft: null });
    }

    return res.status(200).json({
      draft: {
        id: draft.id,
        name: draft.name,
        data: draft.data,
        lastSyncedAt: draft.last_synced_at,
        createdAt: draft.created_at,
        expiresAt: draft.expires_at
      }
    });

  } catch (error) {
    console.error('Get draft error:', error);
    return res.status(500).json({
      error: 'Failed to fetch draft',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * POST /api/workouts/draft
 *
 * Create or update workout draft (upsert)
 * Auto-sets expires_at to 24 hours from now
 *
 * Request body:
 * {
 *   "name": "Push Day",
 *   "data": {
 *     "workoutName": "Push Day",
 *     "startedAt": "2026-01-17T14:30:00Z",
 *     "exercises": [
 *       {
 *         "exerciseId": "uuid",
 *         "orderIndex": 0,
 *         "sets": [
 *           {
 *             "setNumber": 1,
 *             "weight": 225,
 *             "reps": 8,
 *             "rir": 2,
 *             "isWarmup": false,
 *             "isCompleted": true
 *           }
 *         ]
 *       }
 *     ],
 *     "notes": "Felt strong today"
 *   }
 * }
 *
 * Response:
 * {
 *   "draft": {
 *     "id": "uuid",
 *     "name": "Push Day",
 *     "lastSyncedAt": "2026-01-17T15:00:00Z",
 *     "expiresAt": "2026-01-18T15:00:00Z"
 *   }
 * }
 */
async function handlePost(req, res) {
  try {
    const userId = req.user.userId;
    const { name, data } = req.body;

    // Validate inputs
    if (!name || typeof name !== 'string' || name.length < 1 || name.length > 100) {
      return res.status(400).json({ error: 'Draft name must be 1-100 characters' });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Draft data is required and must be an object' });
    }

    // Set expiry to 24 hours from now
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Check if user has existing draft
    const existing = await sql`
      SELECT id
      FROM workout_draft
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    let result;

    if (existing.length > 0) {
      // Update existing draft
      result = await sql`
        UPDATE workout_draft
        SET
          name = ${name},
          data = ${JSON.stringify(data)},
          last_synced_at = NOW(),
          expires_at = ${expiresAt.toISOString()}
        WHERE id = ${existing[0].id}
        RETURNING id, name, last_synced_at, expires_at
      `;
    } else {
      // Create new draft
      result = await sql`
        INSERT INTO workout_draft (user_id, name, data, last_synced_at, created_at, expires_at)
        VALUES (
          ${userId},
          ${name},
          ${JSON.stringify(data)},
          NOW(),
          NOW(),
          ${expiresAt.toISOString()}
        )
        RETURNING id, name, last_synced_at, expires_at
      `;
    }

    const draft = result[0];

    return res.status(200).json({
      draft: {
        id: draft.id,
        name: draft.name,
        lastSyncedAt: draft.last_synced_at,
        expiresAt: draft.expires_at
      }
    });

  } catch (error) {
    console.error('Save draft error:', error);
    return res.status(500).json({
      error: 'Failed to save draft',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * DELETE /api/workouts/draft
 *
 * Delete user's workout draft
 * Can delete by draft ID or delete all user's drafts
 *
 * Query params:
 * - id: Draft ID to delete (optional, if not provided deletes all user's drafts)
 *
 * Response:
 * {
 *   "success": true,
 *   "deletedCount": 1
 * }
 */
async function handleDelete(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.query;

    let result;

    if (id) {
      // Delete specific draft (verify ownership)
      const existing = await sql`
        SELECT id, user_id
        FROM workout_draft
        WHERE id = ${id}
      `;

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Draft not found' });
      }

      if (existing[0].user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      result = await sql`
        DELETE FROM workout_draft
        WHERE id = ${id}
      `;
    } else {
      // Delete all user's drafts
      result = await sql`
        DELETE FROM workout_draft
        WHERE user_id = ${userId}
      `;
    }

    return res.status(200).json({
      success: true,
      deletedCount: result.count || 0
    });

  } catch (error) {
    console.error('Delete draft error:', error);
    return res.status(500).json({
      error: 'Failed to delete draft',
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
  } else if (req.method === 'DELETE') {
    return requireAuth(handleDelete)(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
