-- Migration 005: Fix AI Request Log Foreign Key Constraint
-- Purpose: Remove foreign key constraint on workout_id to allow logging for non-existent workouts
-- Reason: workout_id is used for rate limiting grouping, not referential integrity
-- Date: 2026-01-22

-- Drop the foreign key constraint on workout_id
ALTER TABLE ai_request_log
DROP CONSTRAINT IF EXISTS ai_request_log_workout_id_fkey;

-- workout_id is now just a grouping field for rate limiting
-- It doesn't need to reference an actual workout record
COMMENT ON COLUMN ai_request_log.workout_id IS 'Workout session ID for rate limiting (does not enforce FK - can be draft/temporary ID)';
