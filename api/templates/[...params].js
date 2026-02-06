/**
 * Templates Catch-All Route Handler
 * Consolidates 4 routes into a single serverless function
 *
 * Routes:
 * - GET /api/templates => List templates
 * - POST /api/templates => Create template
 * - GET /api/templates/[id] => Get template by ID
 * - PUT /api/templates/[id] => Update template
 * - DELETE /api/templates/[id] => Delete template
 * - GET /api/templates/[id]/exercises => Get template exercises
 */

import { requireAuth } from '../_lib/middleware/auth.js';
import {
  getTemplates,
  getTemplateById,
  getTemplateExercises,
  createTemplate,
  updateTemplate,
  deleteTemplate
} from '../_lib/services/templateService.js';

/**
 * Route handlers
 */
const handlers = {
  GET: {
    // GET /api/templates - List templates
    '': async (req, res) => {
      try {
        const userId = req.user.userId;

        const result = await getTemplates(userId);

        return res.status(200).json(result);
      } catch (error) {
        console.error('Get templates error:', error);
        return res.status(500).json({
          error: 'Failed to fetch templates',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    },

    // GET /api/templates/[id] - Get template by ID
    '[id]': async (req, res) => {
      try {
        const userId = req.user.userId;
        const templateId = req.params.id;

        const template = await getTemplateById(templateId, userId);

        return res.status(200).json({ template });
      } catch (error) {
        console.error('Get template error:', error);

        if (error.message === 'Template not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('permission')) {
          return res.status(403).json({ error: error.message });
        }

        return res.status(500).json({
          error: 'Failed to fetch template',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    },

    // GET /api/templates/[id]/exercises - Get template exercises
    '[id]/exercises': async (req, res) => {
      try {
        const userId = req.user.userId;
        const templateId = req.params.id;

        const result = await getTemplateExercises(templateId, userId);

        return res.status(200).json(result);
      } catch (error) {
        console.error('Get template exercises error:', error);

        if (error.message === 'Template not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('permission')) {
          return res.status(403).json({ error: error.message });
        }

        return res.status(500).json({
          error: 'Failed to fetch template exercises',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    }
  },

  POST: {
    // POST /api/templates - Create template
    '': async (req, res) => {
      try {
        const userId = req.user.userId;
        const { name, description, exercises } = req.body;

        const template = await createTemplate({ name, description, exercises }, userId);

        return res.status(201).json({ template });
      } catch (error) {
        console.error('Create template error:', error);

        const statusCode = error.message.includes('must') ||
                          error.message.includes('required') ||
                          error.message.includes('already exists') ? 400 : 500;

        return res.status(statusCode).json({
          error: error.message || 'Failed to create template',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    }
  },

  PUT: {
    // PUT /api/templates/[id] - Update template
    '[id]': async (req, res) => {
      try {
        const userId = req.user.userId;
        const templateId = req.params.id;
        const { name, description, exercises } = req.body;

        const template = await updateTemplate(templateId, { name, description, exercises }, userId);

        return res.status(200).json({ template });
      } catch (error) {
        console.error('Update template error:', error);

        if (error.message === 'Template not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('permission')) {
          return res.status(403).json({ error: error.message });
        }

        const statusCode = error.message.includes('must') ||
                          error.message.includes('required') ||
                          error.message.includes('already exists') ? 400 : 500;

        return res.status(statusCode).json({
          error: error.message || 'Failed to update template',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    }
  },

  DELETE: {
    // DELETE /api/templates/[id] - Delete template
    '[id]': async (req, res) => {
      try {
        const userId = req.user.userId;
        const templateId = req.params.id;

        const result = await deleteTemplate(templateId, userId);

        return res.status(200).json(result);
      } catch (error) {
        console.error('Delete template error:', error);

        if (error.message === 'Template not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('permission')) {
          return res.status(403).json({ error: error.message });
        }

        return res.status(500).json({
          error: 'Failed to delete template',
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
  const slug = req.query.params || [];
  const { method } = req;

  // Build route key from slug
  let routeKey, params = {};

  if (slug.length === 0) {
    // Root route: /api/templates
    routeKey = '';
  } else if (slug.length === 1) {
    // Single ID route: /api/templates/[id]
    routeKey = '[id]';
    params.id = slug[0];
  } else if (slug.length === 2 && slug[1] === 'exercises') {
    // Nested route: /api/templates/[id]/exercises
    routeKey = '[id]/exercises';
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

  // All template routes require authentication
  return requireAuth(routeHandler)(req, res);
}
