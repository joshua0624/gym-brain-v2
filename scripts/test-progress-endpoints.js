/**
 * Test Server for Progress & PR Endpoints
 * Tests Phase 7 implementation
 *
 * Usage: node scripts/test-progress-endpoints.js
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

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

// Import and mount progress endpoints
async function setupProgressRoutes() {
  console.log('Setting up progress routes...');

  const progressByExercise = await import('../api/progress/[exerciseId].js');
  const prs = await import('../api/prs.js');
  const weeklyStats = await import('../api/stats/weekly.js');

  console.log('Modules imported successfully');

  // Progress endpoint - handle query params
  // Middleware to merge params into query (simulating Vercel behavior)
  const mergeParamsToQuery = (req, res, next) => {
    // Vercel passes dynamic route segments via req.query
    // We need to merge Express params into query
    Object.defineProperty(req, 'query', {
      value: { ...req.query, ...req.params },
      writable: true,
      configurable: true
    });
    next();
  };

  app.get('/api/progress/:exerciseId', mergeParamsToQuery, wrapHandler(progressByExercise.default));

  app.get('/api/prs', wrapHandler(prs.default));
  app.get('/api/stats/weekly', wrapHandler(weeklyStats.default));

  console.log('Routes registered');
}

// Import auth routes for testing (need JWT tokens)
async function setupAuthRoutes() {
  console.log('Setting up auth routes...');

  const login = await import('../api/auth/login.js');
  app.post('/api/auth/login', wrapHandler(login.default));

  console.log('Auth route registered');
}

// Import AI routes for Phase 8 testing
async function setupAIRoutes() {
  console.log('Setting up AI routes...');

  try {
    const workoutAssistant = await import('../api/ai/workout-assistant.js');
    console.log('AI module imported:', typeof workoutAssistant.default);

    // Register route directly
    const aiHandler = async (req, res) => {
      console.log('[TEST SERVER] AI endpoint hit! Method:', req.method, 'Path:', req.path);
      try {
        await workoutAssistant.default(req, res);
      } catch (error) {
        console.error('[TEST SERVER] AI endpoint error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    };

    app.post('/api/ai/workout-assistant', aiHandler);

    console.log('AI route registered successfully');
  } catch (error) {
    console.error('Error setting up AI routes:', error.message);
    throw error;
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function start() {
  try {
    console.log('Starting server setup...');
    await setupAuthRoutes();
    await setupProgressRoutes();
    await setupAIRoutes();
    console.log('All routes setup complete');

    // 404 handler - MUST be last
    app.use((req, res) => {
      res.status(404).json({ error: 'Not found', path: req.path });
    });

    app.listen(PORT, () => {
      console.log('');
      console.log('='.repeat(60));
      console.log('🚀 Test Server Running (Phases 7-8)');
      console.log('='.repeat(60));
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log('');
      console.log('Available endpoints:');
      console.log('  POST /api/auth/login');
      console.log('  GET  /api/progress/:exerciseId');
      console.log('  GET  /api/prs');
      console.log('  GET  /api/prs?exerciseId=<uuid>');
      console.log('  GET  /api/stats/weekly');
      console.log('  GET  /api/stats/weekly?week=YYYY-MM-DD');
      console.log('  POST /api/ai/workout-assistant     [NEW - Phase 8]');
      console.log('');
      console.log('Testing workflow:');
      console.log('  1. Login to get JWT token: POST /api/auth/login');
      console.log('  2. Use token in header: Authorization: Bearer <token>');
      console.log('  3. Test endpoints with your token');
      console.log('  4. Run AI tests: node scripts/test-ai-endpoint.js');
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
