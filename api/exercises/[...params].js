/**
 * Exercises Catch-All Route Handler
 * Consolidates 2 routes into a single serverless function
 *
 * Routes:
 * - GET /api/exercises => List exercises
 * - POST /api/exercises => Create exercise
 * - POST /api/exercises/[id]/archive => Archive exercise
 * - DELETE /api/exercises/[id]/archive => Unarchive exercise
 */

import { optionalAuth, requireAuth } from '../_lib/middleware/auth.js';
import {
  getExercises,
  createExercise,
  archiveExercise,
  unarchiveExercise
} from '../_lib/services/exerciseService.js';

/**
 * Route handlers
 */
const handlers = {
  GET: {
    // GET /api/exercises - List exercises
    '': async (req, res) => {
      try {
        const userId = req.user?.userId || null;
        const { muscle, equipment, type } = req.query;

        const result = await getExercises(userId, { muscle, equipment, type });

        return res.status(200).json(result);
      } catch (error) {
        console.error('Get exercises error:', error);
        return res.status(500).json({
          error: 'Failed to fetch exercises',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    }
  },

  POST: {
    // POST /api/exercises - Create exercise
    '': async (req, res) => {
      try {
        const userId = req.user.userId;
        const { name, type, equipment, primaryMuscles, secondaryMuscles, skipDuplicateCheck } = req.body;

        const result = await createExercise(
          { name, type, equipment, primaryMuscles, secondaryMuscles, skipDuplicateCheck },
          userId
        );

        if (result.proceed) {
          return res.status(201).json({ exercise: result.exercise });
        } else {
          // Duplicates found
          return res.status(200).json({
            proceed: false,
            suggestions: result.suggestions
          });
        }
      } catch (error) {
        console.error('Create exercise error:', error);
        const statusCode = error.message.includes('must be') || error.message.includes('required') ? 400 : 500;
        return res.status(statusCode).json({
          error: error.message || 'Failed to create exercise',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    },

    // POST /api/exercises/[id]/archive - Archive exercise
    '[id]/archive': async (req, res) => {
      try {
        const userId = req.user.userId;
        const exerciseId = req.params.id;

        const result = await archiveExercise(exerciseId, userId);

        return res.status(200).json(result);
      } catch (error) {
        console.error('Archive exercise error:', error);

        if (error.message === 'Exercise not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('permission') || error.message.includes('only archive')) {
          return res.status(403).json({ error: error.message });
        }
        if (error.message.includes('already archived')) {
          return res.status(400).json({ error: error.message });
        }

        return res.status(500).json({
          error: 'Failed to archive exercise',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    }
  },

  DELETE: {
    // DELETE /api/exercises/[id]/archive - Unarchive exercise
    '[id]/archive': async (req, res) => {
      try {
        const userId = req.user.userId;
        const exerciseId = req.params.id;

        const result = await unarchiveExercise(exerciseId, userId);

        return res.status(200).json(result);
      } catch (error) {
        console.error('Unarchive exercise error:', error);

        if (error.message === 'Exercise not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('permission') || error.message.includes('only unarchive')) {
          return res.status(403).json({ error: error.message });
        }
        if (error.message.includes('not archived')) {
          return res.status(400).json({ error: error.message });
        }

        return res.status(500).json({
          error: 'Failed to unarchive exercise',
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
  const slug = req.url.split('?')[0].replace(/^\/api\/exercises\/?/, '').split('/').filter(Boolean);
  const { method } = req;

  // Build route key from slug
  let routeKey, params = {};

  if (slug.length === 0) {
    // Root route: /api/exercises
    routeKey = '';
  } else if (slug.length === 2 && slug[1] === 'archive') {
    // Nested route: /api/exercises/[id]/archive
    routeKey = '[id]/archive';
    params.id = slug[0];
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

  // Apply authentication middleware
  if (routeKey === '' && method === 'GET') {
    // GET /api/exercises is optionally authenticated
    return optionalAuth(routeHandler)(req, res);
  } else {
    // All other routes require authentication
    return requireAuth(routeHandler)(req, res);
  }
}
