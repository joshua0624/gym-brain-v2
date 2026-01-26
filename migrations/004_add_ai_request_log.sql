-- Migration 004: Add AI Request Log Table
-- Purpose: Track AI assistant requests for rate limiting
-- Date: 2026-01-21

-- Create ai_request_log table for rate limiting
CREATE TABLE IF NOT EXISTS ai_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES workout(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for efficient rate limit queries
CREATE INDEX idx_ai_request_user_time ON ai_request_log(user_id, created_at DESC);
CREATE INDEX idx_ai_request_workout_time ON ai_request_log(workout_id, created_at DESC) WHERE workout_id IS NOT NULL;

-- Cleanup old records automatically (optional: keep last 30 days for analytics)
-- Note: In production, consider a scheduled job to purge records older than 30 days
COMMENT ON TABLE ai_request_log IS 'Tracks AI assistant requests for rate limiting (20/workout, 100/day per user)';
