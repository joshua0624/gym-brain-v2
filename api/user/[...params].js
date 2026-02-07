/**
 * User Data Route Handler
 *
 * Routes:
 * - GET /api/user/export => Export all user data
 * - DELETE /api/user/delete => Delete user account permanently
 */

import { requireAuth } from '../_lib/middleware/auth.js';
import { sql } from '../_lib/db.js';
import { deleteAccount } from '../_lib/services/userService.js';

/**
 * Export all user data (workouts, templates, custom exercises)
 *
 * @param {Object} req - Request object with authenticated user
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
async function handleExport(req, res) {
  try {
    const userId = req.user.userId;

    // 1. Get all workouts with exercises and sets
    const workouts = await sql`
      SELECT
        w.id,
        w.name,
        w.started_at,
        w.completed_at,
        w.duration_seconds,
        w.total_volume,
        w.notes,
        w.template_id,
        COALESCE(
          json_agg(
            json_build_object(
              'id', we.id,
              'exerciseId', we.exercise_id,
              'exerciseName', e.name,
              'exerciseType', e.type,
              'orderIndex', we.order_index,
              'isCompleted', we.is_completed,
              'sets', (
                SELECT COALESCE(json_agg(
                  json_build_object(
                    'id', s.id,
                    'setNumber', s.set_number,
                    'weight', s.weight,
                    'reps', s.reps,
                    'rir', s.rir,
                    'durationSeconds', s.duration_seconds,
                    'distance', s.distance,
                    'notes', s.notes,
                    'isWarmup', s.is_warmup,
                    'isCompleted', s.is_completed
                  ) ORDER BY s.set_number
                ), '[]'::json)
                FROM "set" s
                WHERE s.workout_exercise_id = we.id
              )
            ) ORDER BY we.order_index
          ) FILTER (WHERE we.id IS NOT NULL),
          '[]'::json
        ) as exercises
      FROM workout w
      LEFT JOIN workout_exercise we ON w.id = we.workout_id
      LEFT JOIN exercise e ON we.exercise_id = e.id
      WHERE w.user_id = ${userId}
      GROUP BY w.id
      ORDER BY w.started_at DESC
    `;

    // 2. Get all custom exercises
    const customExercises = await sql`
      SELECT
        id,
        name,
        type,
        equipment,
        primary_muscles,
        secondary_muscles,
        created_at
      FROM exercise
      WHERE created_by = ${userId}
        AND is_archived = false
      ORDER BY name ASC
    `;

    // 3. Get all templates with exercises
    const templates = await sql`
      SELECT
        t.id,
        t.name,
        t.description,
        t.created_at,
        t.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', te.id,
              'exerciseId', te.exercise_id,
              'exerciseName', e.name,
              'exerciseType', e.type,
              'orderIndex', te.order_index,
              'targetSets', te.target_sets,
              'targetRepsMin', te.target_reps_min,
              'targetRepsMax', te.target_reps_max,
              'notes', te.notes
            ) ORDER BY te.order_index
          ) FILTER (WHERE te.id IS NOT NULL),
          '[]'::json
        ) as exercises
      FROM template t
      LEFT JOIN template_exercise te ON t.id = te.template_id
      LEFT JOIN exercise e ON te.exercise_id = e.id
      WHERE t.user_id = ${userId}
      GROUP BY t.id
      ORDER BY t.updated_at DESC
    `;

    // 4. Format response
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: userId,
      },
      workouts: workouts.map(w => ({
        id: w.id,
        name: w.name,
        startedAt: w.started_at,
        completedAt: w.completed_at,
        durationSeconds: w.duration_seconds,
        totalVolume: w.total_volume ? parseFloat(w.total_volume) : 0,
        notes: w.notes,
        templateId: w.template_id,
        exercises: w.exercises
      })),
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        exercises: t.exercises
      })),
      customExercises: customExercises.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        equipment: e.equipment,
        primaryMuscles: e.primary_muscles || [],
        secondaryMuscles: e.secondary_muscles || [],
        createdAt: e.created_at
      })),
      stats: {
        totalWorkouts: workouts.length,
        totalTemplates: templates.length,
        totalCustomExercises: customExercises.length
      }
    };

    return res.status(200).json(exportData);
  } catch (error) {
    console.error('Export data error:', error);

    return res.status(500).json({
      error: 'Failed to export data',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * Delete user account permanently
 *
 * @param {Object} req - Request object with authenticated user and password in body
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
async function handleDelete(req, res) {
  try {
    const userId = req.user.userId;
    const { password } = req.body;

    // Validate password provided
    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    // Delete account with password verification
    await deleteAccount(userId, password);

    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);

    // Handle specific errors
    if (error.message === 'Invalid password') {
      return res.status(400).json({ error: 'Invalid password' });
    }

    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(500).json({
      error: 'Failed to delete account',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * Route handlers
 */
const handlers = {
  GET: {
    // GET /api/user/export - Export all user data
    'export': handleExport
  },
  DELETE: {
    // DELETE /api/user/delete - Delete user account
    'delete': handleDelete
  }
};

/**
 * Main handler - routes requests based on slug and method
 */
export default async function handler(req, res) {
  // Parse path segments from URL (req.query may not populate for POST in Vercel)
  const slug = req.url.split('?')[0].replace(/^\/api\/user\/?/, '').split('/').filter(Boolean);
  const { method } = req;

  // Build route key from slug
  let routeKey;

  if (slug.length === 1 && (slug[0] === 'export' || slug[0] === 'delete')) {
    routeKey = slug[0];
  } else {
    return res.status(404).json({ error: 'Not found' });
  }

  // Find handler
  const methodHandlers = handlers[method];
  if (!methodHandlers) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const routeHandler = methodHandlers[routeKey];
  if (!routeHandler) {
    return res.status(404).json({ error: 'Not found' });
  }

  // All user routes require authentication
  return requireAuth(routeHandler)(req, res);
}
