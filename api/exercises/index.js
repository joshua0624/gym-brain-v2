// Root route handler for /api/exercises
// Re-exports the catch-all handler which parses paths from req.url
export { default } from './[...params].js';
