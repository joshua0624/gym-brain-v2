/**
 * Draft Service
 *
 * Business logic for workout draft operations with atomic CTE patterns
 */

import { sql } from '../db.js';
import { createWorkoutWithDraftDeletion } from '../utils/queryBuilder.js';

/**
 * Get user's active workout draft
 * Automatically deletes expired drafts
 *
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>} Draft object or null if no active draft
 */
export async function getDraft(userId) {
  // Get latest draft for user
  const drafts = await sql`
    SELECT id, user_id, name, data, last_synced_at, created_at, expires_at
    FROM workout_draft
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (drafts.length === 0) {
    return null;
  }

  const draft = drafts[0];

  // Check if expired
  if (draft.expires_at && new Date(draft.expires_at) < new Date()) {
    // Delete expired draft
    await sql`
      DELETE FROM workout_draft
      WHERE id = ${draft.id}
    `;

    return null;
  }

  return {
    id: draft.id,
    name: draft.name,
    data: draft.data,
    lastSyncedAt: draft.last_synced_at,
    createdAt: draft.created_at,
    expiresAt: draft.expires_at
  };
}

/**
 * Create or update workout draft (upsert)
 * Auto-sets expires_at to 24 hours from now
 *
 * @param {Object} draftData - Draft data
 * @param {string} draftData.name - Draft name (1-100 characters)
 * @param {Object} draftData.data - Draft JSON data
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Created/updated draft
 */
export async function saveDraft(draftData, userId) {
  const { name, data } = draftData;

  // Validate inputs
  if (!name || typeof name !== 'string' || name.length < 1 || name.length > 100) {
    throw new Error('Draft name must be 1-100 characters');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Draft data is required and must be an object');
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

  return {
    id: draft.id,
    name: draft.name,
    lastSyncedAt: draft.last_synced_at,
    expiresAt: draft.expires_at
  };
}

/**
 * Delete workout draft(s)
 *
 * @param {string} userId - User UUID
 * @param {string} draftId - Draft ID to delete (optional, if not provided deletes all user's drafts)
 * @returns {Promise<Object>} { success: true, deletedCount }
 */
export async function deleteDraft(userId, draftId = null) {
  let result;

  if (draftId) {
    // Delete specific draft (verify ownership)
    const existing = await sql`
      SELECT id, user_id
      FROM workout_draft
      WHERE id = ${draftId}
    `;

    if (existing.length === 0) {
      throw new Error('Draft not found');
    }

    if (existing[0].user_id !== userId) {
      throw new Error('Unauthorized');
    }

    result = await sql`
      DELETE FROM workout_draft
      WHERE id = ${draftId}
    `;
  } else {
    // Delete all user's drafts
    result = await sql`
      DELETE FROM workout_draft
      WHERE user_id = ${userId}
    `;
  }

  return {
    success: true,
    deletedCount: result.count || 0
  };
}

/**
 * Create workout from draft with atomic draft deletion
 * Uses CTE to ensure draft is only deleted if workout creation succeeds
 *
 * @param {Object} workoutData - Workout data
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Created workout with deleted draft IDs
 */
export async function createWorkoutFromDraft(workoutData, userId) {
  // Validate workout data
  if (!workoutData.name || typeof workoutData.name !== 'string') {
    throw new Error('Workout name is required');
  }

  // Use atomic CTE pattern to delete draft and create workout in single transaction
  const result = await createWorkoutWithDraftDeletion(sql, workoutData, userId);

  return {
    workout: {
      id: result.id,
      userId: result.user_id,
      name: result.name,
      startedAt: result.started_at,
      completedAt: result.completed_at,
      durationSeconds: result.duration_seconds,
      totalVolume: result.total_volume ? parseFloat(result.total_volume) : 0,
      notes: result.notes,
      templateId: result.template_id
    },
    deletedDraftIds: result.deleted_draft_ids
  };
}

/**
 * Delete specific draft by ID with ownership verification
 *
 * @param {string} draftId - Draft UUID
 * @param {string} userId - User UUID
 * @returns {Promise<boolean>} True if deleted, false if not found or unauthorized
 */
export async function deleteDraftById(draftId, userId) {
  try {
    // Verify ownership before deleting
    const draftCheck = await sql`
      SELECT id, user_id
      FROM workout_draft
      WHERE id = ${draftId}
    `;

    if (draftCheck.length === 0) {
      return false;
    }

    if (draftCheck[0].user_id !== userId) {
      throw new Error('Unauthorized');
    }

    await sql`
      DELETE FROM workout_draft
      WHERE id = ${draftId}
    `;

    return true;
  } catch (error) {
    if (error.message === 'Unauthorized') {
      throw error;
    }
    console.error('Error deleting draft:', error);
    return false;
  }
}

/**
 * Bulk delete drafts with ownership verification
 * Used by sync endpoint to clean up multiple drafts at once
 *
 * @param {Array<string>} draftIds - Array of draft UUIDs
 * @param {string} userId - User UUID
 * @returns {Promise<number>} Number of drafts deleted
 */
export async function bulkDeleteDrafts(draftIds, userId) {
  if (!draftIds || draftIds.length === 0) {
    return 0;
  }

  let deletedCount = 0;

  for (const draftId of draftIds) {
    try {
      const deleted = await deleteDraftById(draftId, userId);
      if (deleted) {
        deletedCount++;
      }
    } catch (error) {
      console.error('Error in bulk delete:', error);
      // Continue with other drafts
    }
  }

  return deletedCount;
}

/**
 * Clean up expired drafts for a user
 *
 * @param {string} userId - User UUID
 * @returns {Promise<number>} Number of drafts deleted
 */
export async function cleanupExpiredDrafts(userId) {
  const result = await sql`
    DELETE FROM workout_draft
    WHERE user_id = ${userId}
    AND expires_at < NOW()
  `;

  return result.count || 0;
}

/**
 * Get all drafts for a user (including expired ones)
 * Useful for admin/debugging purposes
 *
 * @param {string} userId - User UUID
 * @returns {Promise<Array<Object>>} Array of drafts
 */
export async function getAllDrafts(userId) {
  const drafts = await sql`
    SELECT id, user_id, name, data, last_synced_at, created_at, expires_at
    FROM workout_draft
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;

  return drafts.map(draft => ({
    id: draft.id,
    name: draft.name,
    data: draft.data,
    lastSyncedAt: draft.last_synced_at,
    createdAt: draft.created_at,
    expiresAt: draft.expires_at,
    isExpired: draft.expires_at && new Date(draft.expires_at) < new Date()
  }));
}
