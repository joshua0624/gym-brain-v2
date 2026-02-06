/**
 * Workouts Catch-All Route Handler
 * Consolidates 5 workout routes into a single serverless function
 *
 * Routes:
 * - GET /api/workouts => List workouts
 * - POST /api/workouts => Create workout
 * - GET /api/workouts/[id] => Get workout by ID
 * - PUT /api/workouts/[id] => Update workout
 * - DELETE /api/workouts/[id] => Delete workout
 * - GET /api/workouts/draft => Get draft
 * - POST /api/workouts/draft => Save draft
 * - DELETE /api/workouts/draft => Delete draft
 * - POST /api/workouts/sync => Sync offline workouts
 */

import { requireAuth } from '../_lib/middleware/auth.js';
import {
  getWorkouts,
  getWorkoutById,
  createWorkout,
  updateWorkout,
  deleteWorkout
} from '../_lib/services/workoutService.js';
import {
  getDraft,
  saveDraft,
  deleteDraft
} from '../_lib/services/draftService.js';
import { syncWorkouts } from '../_lib/services/syncService.js';

/**
 * Route handlers
 */
const handlers = {
  GET: {
    // GET /api/workouts - List workouts
    '': async (req, res) => {
      try {
        const userId = req.user.userId;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const result = await getWorkouts(userId, { limit, offset });

        return res.status(200).json(result);
      } catch (error) {
        console.error('Get workouts error:', error);

        const statusCode = error.message.includes('must be') ? 400 : 500;

        return res.status(statusCode).json({
          error: error.message || 'Failed to fetch workouts',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    },

    // GET /api/workouts/[id] - Get workout by ID
    '[id]': async (req, res) => {
      try {
        const userId = req.user.userId;
        const workoutId = req.params.id;

        const workout = await getWorkoutById(workoutId, userId);

        return res.status(200).json({ workout });
      } catch (error) {
        console.error('Get workout error:', error);

        if (error.message === 'Workout not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Unauthorized') {
          return res.status(403).json({ error: 'Access denied' });
        }

        return res.status(500).json({
          error: 'Failed to fetch workout',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    },

    // GET /api/workouts/draft - Get draft
    'draft': async (req, res) => {
      try {
        const userId = req.user.userId;

        const draft = await getDraft(userId);

        return res.status(200).json({ draft });
      } catch (error) {
        console.error('Get draft error:', error);
        return res.status(500).json({
          error: 'Failed to fetch draft',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    }
  },

  POST: {
    // POST /api/workouts - Create workout
    '': async (req, res) => {
      try {
        const userId = req.user.userId;
        const { name, startedAt } = req.body;

        const workout = await createWorkout({ name, startedAt }, userId);

        return res.status(201).json({ workout });
      } catch (error) {
        console.error('Create workout error:', error);

        const statusCode = error.message.includes('must be') || error.message.includes('Invalid') ? 400 : 500;

        return res.status(statusCode).json({
          error: error.message || 'Failed to create workout',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    },

    // POST /api/workouts/draft - Save draft
    'draft': async (req, res) => {
      try {
        const userId = req.user.userId;
        const { name, data } = req.body;

        const draft = await saveDraft({ name, data }, userId);

        return res.status(200).json({ draft });
      } catch (error) {
        console.error('Save draft error:', error);

        const statusCode = error.message.includes('must be') || error.message.includes('required') ? 400 : 500;

        return res.status(statusCode).json({
          error: error.message || 'Failed to save draft',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    },

    // POST /api/workouts/sync - Sync offline workouts
    'sync': async (req, res) => {
      try {
        const userId = req.user.userId;
        const { completedWorkouts, deleteDraftIds } = req.body;

        const result = await syncWorkouts({ completedWorkouts, deleteDraftIds }, userId);

        return res.status(200).json(result);
      } catch (error) {
        console.error('Sync workouts error:', error);

        const statusCode = error.message.includes('must be') ? 400 : 500;

        return res.status(statusCode).json({
          error: error.message || 'Sync failed',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    }
  },

  PUT: {
    // PUT /api/workouts/[id] - Update workout
    '[id]': async (req, res) => {
      try {
        const userId = req.user.userId;
        const workoutId = req.params.id;
        const { name, notes, completedAt } = req.body;

        const workout = await updateWorkout(workoutId, { name, notes, completedAt }, userId);

        return res.status(200).json({ workout });
      } catch (error) {
        console.error('Update workout error:', error);

        if (error.message === 'Workout not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Unauthorized') {
          return res.status(403).json({ error: 'Access denied' });
        }

        const statusCode = error.message.includes('must be') || error.message.includes('Invalid') ? 400 : 500;

        return res.status(statusCode).json({
          error: error.message || 'Failed to update workout',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    }
  },

  DELETE: {
    // DELETE /api/workouts/[id] - Delete workout
    '[id]': async (req, res) => {
      try {
        const userId = req.user.userId;
        const workoutId = req.params.id;

        const result = await deleteWorkout(workoutId, userId);

        return res.status(200).json(result);
      } catch (error) {
        console.error('Delete workout error:', error);

        if (error.message === 'Workout not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Unauthorized') {
          return res.status(403).json({ error: 'Access denied' });
        }

        return res.status(500).json({
          error: 'Failed to delete workout',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    },

    // DELETE /api/workouts/draft - Delete draft
    'draft': async (req, res) => {
      try {
        const userId = req.user.userId;
        const { id } = req.query;

        const result = await deleteDraft(userId, id);

        return res.status(200).json(result);
      } catch (error) {
        console.error('Delete draft error:', error);

        if (error.message === 'Draft not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Unauthorized') {
          return res.status(403).json({ error: 'Access denied' });
        }

        return res.status(500).json({
          error: 'Failed to delete draft',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    }
  }
};

/**
 * Main handler - routes requests based on slug and method
 */
export default async function handler(req, res) {
  // Parse path segments from URL (req.query may not populate for POST in Vercel)
  const slug = req.url.split('?')[0].replace(/^\/api\/workouts\/?/, '').split('/').filter(Boolean);
  const { method } = req;

  // Build route key from slug
  let routeKey, params = {};

  if (slug.length === 0) {
    // Root route: /api/workouts
    routeKey = '';
  } else if (slug.length === 1) {
    const segment = slug[0];

    // Check if it's a named route (draft, sync) or ID route
    if (segment === 'draft' || segment === 'sync') {
      routeKey = segment;
    } else {
      // Assume it's an ID route: /api/workouts/[id]
      routeKey = '[id]';
      params.id = segment;
    }
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

  // Attach params to request
  req.params = params;

  // All workout routes require authentication
  return requireAuth(routeHandler)(req, res);
}
