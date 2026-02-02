/**
 * Ownership Validation Middleware
 *
 * Reusable functions for verifying user ownership of resources
 */

import { sql } from '../db.js';

/**
 * Validate that a resource belongs to the specified user
 *
 * @param {string} resourceType - Type of resource ('workout', 'template', 'exercise')
 * @param {string} resourceId - UUID of the resource
 * @param {string} userId - UUID of the user
 * @returns {Promise<boolean>} True if user owns the resource
 * @throws {Error} If resource not found or unauthorized
 */
export async function validateOwnership(resourceType, resourceId, userId) {
  const tableMap = {
    workout: 'workout',
    template: 'template',
    exercise: 'exercise'
  };

  const table = tableMap[resourceType];
  if (!table) {
    throw new Error(`Invalid resource type: ${resourceType}`);
  }

  // Use sql.unsafe to dynamically specify the table name
  // Note: This is safe because we validate the table name against a whitelist above
  const result = await sql`
    SELECT user_id FROM ${sql(table)} WHERE id = ${resourceId}
  `;

  if (result.length === 0) {
    throw new Error(`${resourceType} not found`);
  }

  if (result[0].user_id !== userId) {
    throw new Error('Unauthorized');
  }

  return true;
}

/**
 * Middleware wrapper for ownership validation
 * Use this to protect routes that operate on user-owned resources
 *
 * @param {string} resourceType - Type of resource ('workout', 'template', 'exercise')
 * @param {string} paramName - Name of the req.query parameter containing the resource ID (default: 'id')
 * @returns {Function} Express middleware function
 *
 * @example
 * // Protect a workout route
 * export default requireAuth(requireOwnership('workout'), async (req, res) => {
 *   // At this point, ownership is verified
 *   const { id } = req.query;
 *   // ... your logic
 * });
 */
export function requireOwnership(resourceType, paramName = 'id') {
  return async (req, res, next) => {
    try {
      const resourceId = req.query[paramName];
      const userId = req.user?.userId;

      if (!resourceId) {
        return res.status(400).json({ error: `${paramName} is required` });
      }

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      await validateOwnership(resourceType, resourceId, userId);
      next();
    } catch (error) {
      if (error.message === 'Unauthorized') {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      console.error('Ownership validation error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Verify workout ownership (convenience function)
 *
 * @param {string} workoutId - Workout UUID
 * @param {string} userId - User UUID
 * @returns {Promise<boolean>} True if user owns the workout
 */
export async function verifyWorkoutOwnership(workoutId, userId) {
  return validateOwnership('workout', workoutId, userId);
}

/**
 * Verify template ownership (convenience function)
 *
 * @param {string} templateId - Template UUID
 * @param {string} userId - User UUID
 * @returns {Promise<boolean>} True if user owns the template
 */
export async function verifyTemplateOwnership(templateId, userId) {
  return validateOwnership('template', templateId, userId);
}

/**
 * Verify exercise ownership (convenience function)
 *
 * @param {string} exerciseId - Exercise UUID
 * @param {string} userId - User UUID
 * @returns {Promise<boolean>} True if user owns the exercise
 */
export async function verifyExerciseOwnership(exerciseId, userId) {
  return validateOwnership('exercise', exerciseId, userId);
}
