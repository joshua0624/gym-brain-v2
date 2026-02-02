/**
 * Stats Catch-All Route Handler
 * Consolidates 3 routes into a single serverless function
 *
 * Routes:
 * - GET /api/stats/prs => Get personal records
 * - GET /api/stats/weekly => Get weekly stats
 * - GET /api/stats/progress/[exerciseId] => Get exercise progress
 *
 * Note: Also consolidates /api/prs and /api/progress/[exerciseId] under stats
 */

import { requireAuth } from '../_lib/middleware/auth.js';
import {
  getPRs,
  getWeeklyStats,
  getExerciseProgress
} from '../_lib/services/statsService.js';

/**
 * Route handlers
 */
const handlers = {
  GET: {
    // GET /api/stats/prs - Get personal records
    'prs': async (req, res) => {
      try {
        const userId = req.user.userId;
        const { exerciseId } = req.query;

        const result = await getPRs(userId, exerciseId);

        return res.status(200).json(result);
      } catch (error) {
        console.error('Error fetching PRs:', error);
        return res.status(500).json({
          error: 'Failed to fetch PRs',
          message: error.message
        });
      }
    },

    // GET /api/stats/weekly - Get weekly stats
    'weekly': async (req, res) => {
      try {
        const userId = req.user.userId;
        const { week } = req.query;

        const result = await getWeeklyStats(userId, week);

        return res.status(200).json(result);
      } catch (error) {
        console.error('Error fetching weekly stats:', error);

        const statusCode = error.message.includes('Invalid date') ? 400 : 500;

        return res.status(statusCode).json({
          error: error.message || 'Failed to fetch weekly stats',
          message: error.message
        });
      }
    },

    // GET /api/stats/progress/[exerciseId] - Get exercise progress
    'progress/[exerciseId]': async (req, res) => {
      try {
        const userId = req.user.userId;
        const exerciseId = req.params.exerciseId;

        const result = await getExerciseProgress(exerciseId, userId);

        return res.status(200).json(result);
      } catch (error) {
        console.error('Error fetching progress data:', error);

        if (error.message === 'Exercise not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('required')) {
          return res.status(400).json({ error: error.message });
        }

        return res.status(500).json({
          error: 'Failed to fetch progress data',
          message: error.message
        });
      }
    }
  }
};

/**
 * Main handler - routes requests based on slug and method
 */
export default async function handler(req, res) {
  const slug = req.query.params || [];
  const { method } = req;

  // Build route key from slug
  let routeKey, params = {};

  if (slug.length === 0) {
    // No valid root route for /api/stats
    return res.status(404).json({ error: 'Not found' });
  } else if (slug.length === 1) {
    // Single segment routes: /api/stats/prs or /api/stats/weekly
    routeKey = slug[0];
  } else if (slug.length === 2 && slug[0] === 'progress') {
    // Nested route: /api/stats/progress/[exerciseId]
    routeKey = 'progress/[exerciseId]';
    params.exerciseId = slug[1];
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

  // All stats routes require authentication
  return requireAuth(routeHandler)(req, res);
}
