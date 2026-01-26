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

// Import and mount all API endpoints
async function setupRoutes() {
  console.log('Setting up API routes...');

  // Auth endpoints
  const register = await import('../api/auth/register.js');
  const login = await import('../api/auth/login.js');
  const refresh = await import('../api/auth/refresh.js');
  const forgotPassword = await import('../api/auth/forgot-password.js');
  const resetPassword = await import('../api/auth/reset-password.js');

  // Exercise endpoints
  const exercises = await import('../api/exercises.js');
  const archiveExercise = await import('../api/exercises/[id]/archive.js');

  // Workout endpoints
  const workouts = await import('../api/workouts.js');
  const workoutById = await import('../api/workouts/[id].js');
  const workoutDraft = await import('../api/workouts/draft.js');
  const workoutSync = await import('../api/workouts/sync.js');

  // Template endpoints
  const templates = await import('../api/templates.js');
  const templateById = await import('../api/templates/[id].js');
  const templateExercises = await import('../api/templates/[id]/exercises.js');

  // Progress/Stats endpoints
  const progress = await import('../api/progress/[exerciseId].js');
  const prs = await import('../api/prs.js');
  const weeklyStats = await import('../api/stats/weekly.js');

  // AI endpoint
  const aiAssistant = await import('../api/ai/workout-assistant.js');

  console.log('Modules imported successfully');

  // Mount auth routes
  app.post('/api/auth/register', wrapHandler(register.default));
  app.post('/api/auth/login', wrapHandler(login.default));
  app.post('/api/auth/refresh', wrapHandler(refresh.default));
  app.post('/api/auth/forgot-password', wrapHandler(forgotPassword.default));
  app.post('/api/auth/reset-password', wrapHandler(resetPassword.default));

  // Mount exercise routes
  app.all('/api/exercises', wrapHandler(exercises.default));
  app.all('/api/exercises/:id/archive', (req, res) => {
    req.query = { id: req.params.id };
    wrapHandler(archiveExercise.default)(req, res);
  });

  // Mount workout routes
  app.all('/api/workouts', wrapHandler(workouts.default));
  app.all('/api/workouts/draft', wrapHandler(workoutDraft.default));
  app.all('/api/workouts/sync', wrapHandler(workoutSync.default));
  app.all('/api/workouts/:id', (req, res) => {
    req.query = { id: req.params.id };
    wrapHandler(workoutById.default)(req, res);
  });

  // Mount template routes
  app.all('/api/templates', wrapHandler(templates.default));
  app.all('/api/templates/:id/exercises', (req, res) => {
    req.query = { id: req.params.id };
    wrapHandler(templateExercises.default)(req, res);
  });
  app.all('/api/templates/:id', (req, res) => {
    req.query = { id: req.params.id };
    wrapHandler(templateById.default)(req, res);
  });

  // Mount progress/stats routes
  app.all('/api/progress/:exerciseId', (req, res) => {
    req.query = { exerciseId: req.params.exerciseId };
    wrapHandler(progress.default)(req, res);
  });
  app.all('/api/prs', wrapHandler(prs.default));
  app.all('/api/stats/weekly', wrapHandler(weeklyStats.default));

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
