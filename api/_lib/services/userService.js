/**
 * User Service
 * Handles user account operations including deletion
 */

import { sql } from '../db.js';
import { verifyPassword } from '../auth.js';

/**
 * Delete user account permanently
 * @param {string} userId - User ID to delete
 * @param {string} password - Password confirmation
 * @returns {Promise<{success: boolean}>}
 * @throws {Error} If password is invalid or user not found
 */
export async function deleteAccount(userId, password) {
  // First, verify the password
  const userResult = await sql`
    SELECT password_hash FROM "user" WHERE id = ${userId}
  `;

  if (userResult.length === 0) {
    throw new Error('User not found');
  }

  const isValid = await verifyPassword(password, userResult[0].password_hash);
  if (!isValid) {
    throw new Error('Invalid password');
  }

  // Delete user - CASCADE will automatically handle:
  // - Templates (template.user_id)
  // - Workouts (workout.user_id)
  // - Drafts (workout_draft.user_id)
  // - Password reset tokens (password_reset_token.user_id)
  // - Custom exercises: created_by will be set to NULL (preserved in library)
  await sql`DELETE FROM "user" WHERE id = ${userId}`;

  return { success: true };
}
