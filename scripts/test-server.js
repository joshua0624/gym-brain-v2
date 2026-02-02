/**
 * Test Server for Auth Endpoints
 * Simulates Vercel serverless environment locally
 *
 * Usage: node scripts/test-server.js
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Helper to wrap API handlers
function wrapHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('Handler error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error', message: error.message });
      }
    }
  };
}

// Import and mount all API endpoints (using new catch-all routes)
async function setupRoutes() {
  console.log('Setting up API routes...');

  // Import catch-all route handlers
  const authHandler = await import('../api/auth/[[...action]].js');
  const exercisesHandler = await import('../api/exercises/[[...params]].js');
  const workoutsHandler = await import('../api/workouts/[[...params]].js');
  const templatesHandler = await import('../api/templates/[[...params]].js');
  const statsHandler = await import('../api/stats/[[...params]].js');
  const aiAssistant = await import('../api/ai/workout-assistant.js');

  console.log('Modules imported successfully');

  // Helper to convert Express params to Next.js query format
  function catchAllWrapper(handler, paramName) {
    return (req, res) => {
      // Extract path segments after the base path
      const pathAfterBase = req.path.split('/').filter(Boolean).slice(2); // Skip 'api' and base

      // Use a Proxy to intercept query property access
      const wrappedReq = new Proxy(req, {
        get(target, prop) {
          if (prop === 'query') {
            return { ...target.query, [paramName]: pathAfterBase };
          }
          return target[prop];
        }
      });

      wrapHandler(handler.default)(wrappedReq, res);
    };
  }

  // Mount auth routes (POST only)
  app.post('/api/auth/:action', catchAllWrapper(authHandler, 'action'));

  // Mount exercise routes (all methods, catch-all at end)
  app.all('/api/exercises/:id/archive', catchAllWrapper(exercisesHandler, 'params'));
  app.all('/api/exercises', catchAllWrapper(exercisesHandler, 'params'));

  // Mount workout routes (all methods)
  app.all('/api/workouts/draft', catchAllWrapper(workoutsHandler, 'params'));
  app.all('/api/workouts/sync', catchAllWrapper(workoutsHandler, 'params'));
  app.all('/api/workouts/:id', catchAllWrapper(workoutsHandler, 'params'));
  app.all('/api/workouts', catchAllWrapper(workoutsHandler, 'params'));

  // Mount template routes (all methods)
  app.all('/api/templates/:id/exercises', catchAllWrapper(templatesHandler, 'params'));
  app.all('/api/templates/:id', catchAllWrapper(templatesHandler, 'params'));
  app.all('/api/templates', catchAllWrapper(templatesHandler, 'params'));

  // Mount stats routes (GET only)
  app.get('/api/stats/progress/:exerciseId', catchAllWrapper(statsHandler, 'params'));
  app.get('/api/stats/prs', catchAllWrapper(statsHandler, 'params'));
  app.get('/api/stats/weekly', catchAllWrapper(statsHandler, 'params'));
  app.get('/api/stats/:param', catchAllWrapper(statsHandler, 'params'));

  // Mount AI route
  app.post('/api/ai/workout-assistant', wrapHandler(aiAssistant.default));

  console.log('All routes registered successfully');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function start() {
  try {
    console.log('Starting server setup...');
    await setupRoutes();
    console.log('API routes setup complete');

    // 404 handler - MUST be last
    app.use((req, res) => {
      res.status(404).json({ error: 'Not found', path: req.path });
    });

    app.listen(PORT, () => {
      console.log('');
      console.log('='.repeat(60));
      console.log('🚀 Test Server Running');
      console.log('='.repeat(60));
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log('');
      console.log('Available endpoints:');
      console.log('  POST /api/auth/register');
      console.log('  POST /api/auth/login');
      console.log('  POST /api/auth/refresh');
      console.log('  POST /api/auth/forgot-password');
      console.log('  POST /api/auth/reset-password');
      console.log('');
      console.log('Press Ctrl+C to stop');
      console.log('='.repeat(60));
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
