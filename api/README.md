# API Routes

This directory contains Vercel serverless function endpoints.

## Structure

- `/auth` - Authentication endpoints (register, login, refresh, password reset)
- `/workouts` - Workout CRUD and sync endpoints
- `/exercises` - Exercise library management
- `/templates` - Template management
- `/ai` - AI workout assistant proxy
- `/user` - User data export

## Important

All API routes must use the `@neondatabase/serverless` driver for database connections to prevent connection pool exhaustion on Vercel serverless functions.

See `CLAUDE.md` for detailed technical constraints and implementation guidelines.
