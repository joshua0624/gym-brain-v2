// Root route handler for /api/workouts
// Re-exports the catch-all handler which parses paths from req.url
export { default } from './[...params].js';
