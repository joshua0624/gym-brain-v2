-- GymBrAIn V1 - Initial Database Schema
-- Specification: v1.2.2 FINAL
-- Created: 2026-01-17

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. USER TABLE
-- =============================================================================
CREATE TABLE "user" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,  -- REQUIRED for password reset
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$'),
  CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- =============================================================================
-- 2. PASSWORD RESET TOKEN TABLE
-- =============================================================================
CREATE TABLE password_reset_token (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,  -- Hashed token
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- 1 hour from creation
  used_at TIMESTAMP WITH TIME ZONE,  -- NULL if not used yet
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- 3. EXERCISE TABLE
-- =============================================================================
CREATE TABLE exercise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,  -- 'weighted' | 'bodyweight' | 'cardio' | 'timed'
  equipment VARCHAR(50),  -- 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'other'
  primary_muscles TEXT[] NOT NULL,  -- Array of muscle groups (e.g., ['chest', 'shoulders'])
  secondary_muscles TEXT[] DEFAULT '{}',  -- Optional secondary muscles
  is_custom BOOLEAN DEFAULT FALSE NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by UUID REFERENCES "user"(id) ON DELETE SET NULL,  -- NULL for library exercises
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT exercise_type_check CHECK (type IN ('weighted', 'bodyweight', 'cardio', 'timed')),
  CONSTRAINT exercise_equipment_check CHECK (
    equipment IS NULL OR
    equipment IN ('barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'other')
  ),
  CONSTRAINT exercise_name_unique_per_user UNIQUE (name, created_by)
);

-- =============================================================================
-- 4. TEMPLATE TABLE
-- =============================================================================
CREATE TABLE template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  CONSTRAINT template_name_unique_per_user UNIQUE (user_id, name)
);

-- =============================================================================
-- 5. TEMPLATE EXERCISE TABLE
-- =============================================================================
CREATE TABLE template_exercise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES template(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,  -- 0-based ordering within template
  target_sets INTEGER,  -- Optional target number of sets
  target_reps_min INTEGER,  -- Optional rep range minimum
  target_reps_max INTEGER,  -- Optional rep range maximum
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT template_exercise_order_unique UNIQUE (template_id, order_index),
  CONSTRAINT order_index_non_negative CHECK (order_index >= 0)
);

-- =============================================================================
-- 6. WORKOUT TABLE
-- =============================================================================
-- CRITICAL: No is_draft field (drafts use separate WorkoutDraft table)
-- CRITICAL: No sync_status field (client-side only, not in server DB)
CREATE TABLE workout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name VARCHAR(100),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- When workout began
  completed_at TIMESTAMP WITH TIME ZONE,  -- When workout was completed (can be NULL for in-progress)
  duration_seconds INTEGER,  -- Total duration in seconds
  total_volume DECIMAL(10, 2),  -- Sum of (weight * reps) for all sets
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT duration_non_negative CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  CONSTRAINT volume_non_negative CHECK (total_volume IS NULL OR total_volume >= 0)
);

-- =============================================================================
-- 7. WORKOUT EXERCISE TABLE
-- =============================================================================
CREATE TABLE workout_exercise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workout(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,  -- 0-based ordering within workout
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT workout_exercise_order_unique UNIQUE (workout_id, order_index),
  CONSTRAINT workout_exercise_order_non_negative CHECK (order_index >= 0)
);

-- =============================================================================
-- 8. SET TABLE
-- =============================================================================
CREATE TABLE "set" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID NOT NULL REFERENCES workout_exercise(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,  -- 1-based set number within exercise
  weight DECIMAL(6, 2),  -- Weight in pounds (lbs only), displayed rounded to 0.5
  reps INTEGER,  -- Number of repetitions (1-100)
  rir INTEGER,  -- Reps in reserve (0-10)
  duration_seconds INTEGER,  -- For timed exercises (e.g., plank)
  distance_meters DECIMAL(8, 2),  -- For cardio exercises
  is_warmup BOOLEAN DEFAULT FALSE NOT NULL,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT set_number_positive CHECK (set_number > 0),
  CONSTRAINT weight_range CHECK (weight IS NULL OR (weight >= 0 AND weight <= 1500)),
  CONSTRAINT reps_range CHECK (reps IS NULL OR (reps >= 1 AND reps <= 100)),
  CONSTRAINT rir_range CHECK (rir IS NULL OR (rir >= 0 AND rir <= 10)),
  CONSTRAINT duration_non_negative CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  CONSTRAINT distance_non_negative CHECK (distance_meters IS NULL OR distance_meters > 0),
  CONSTRAINT set_unique_per_exercise UNIQUE (workout_exercise_id, set_number)
);

-- =============================================================================
-- 9. WORKOUT DRAFT TABLE
-- =============================================================================
-- Separate table for active workout drafts (not stored in Workout table)
-- Syncs every 30s when online, deleted atomically on workout completion
CREATE TABLE workout_draft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  data JSONB NOT NULL,  -- Complete workout state (exercises, sets, etc.)
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,  -- 24 hours from last update
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Only one active draft per user
  CONSTRAINT one_draft_per_user UNIQUE (user_id)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- User indexes
CREATE INDEX idx_user_username ON "user"(username);
CREATE INDEX idx_user_email ON "user"(email);

-- Password reset token indexes
CREATE INDEX idx_password_reset_token ON password_reset_token(token);
CREATE INDEX idx_password_reset_user ON password_reset_token(user_id);
CREATE INDEX idx_password_reset_expires ON password_reset_token(expires_at);

-- Exercise indexes
CREATE INDEX idx_exercise_type ON exercise(type);
CREATE INDEX idx_exercise_primary_muscles ON exercise USING GIN(primary_muscles);
CREATE INDEX idx_exercise_creator ON exercise(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_exercise_archived ON exercise(is_archived);
CREATE INDEX idx_exercise_name ON exercise(name);

-- Template indexes
CREATE INDEX idx_template_user ON template(user_id);
CREATE INDEX idx_template_name ON template(name);

-- Template exercise indexes
CREATE INDEX idx_template_exercise_template ON template_exercise(template_id);
CREATE INDEX idx_template_exercise_exercise ON template_exercise(exercise_id);
CREATE INDEX idx_template_exercise_order ON template_exercise(template_id, order_index);

-- Workout indexes (CRITICAL: user_id + started_at DESC for history queries)
CREATE INDEX idx_workout_user_started ON workout(user_id, started_at DESC);
CREATE INDEX idx_workout_completed ON workout(completed_at) WHERE completed_at IS NOT NULL;

-- Workout exercise indexes
CREATE INDEX idx_workout_exercise_workout ON workout_exercise(workout_id);
CREATE INDEX idx_workout_exercise_exercise ON workout_exercise(exercise_id);
CREATE INDEX idx_workout_exercise_order ON workout_exercise(workout_id, order_index);

-- Set indexes
CREATE INDEX idx_set_workout_exercise ON "set"(workout_exercise_id);
CREATE INDEX idx_set_number ON "set"(workout_exercise_id, set_number);
CREATE INDEX idx_set_completed ON "set"(completed_at);

-- Workout draft indexes
CREATE INDEX idx_workout_draft_user ON workout_draft(user_id);
CREATE INDEX idx_workout_draft_expires ON workout_draft(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_workout_draft_updated ON workout_draft(updated_at);

-- =============================================================================
-- TRIGGER FUNCTIONS FOR UPDATED_AT
-- =============================================================================

-- Generic function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercise_updated_at BEFORE UPDATE ON exercise
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_updated_at BEFORE UPDATE ON template
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_updated_at BEFORE UPDATE ON workout
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_draft_updated_at BEFORE UPDATE ON workout_draft
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE "user" IS 'User accounts - email is REQUIRED for password reset';
COMMENT ON TABLE password_reset_token IS 'Password reset tokens - expire after 1 hour';
COMMENT ON TABLE exercise IS 'Exercise library - includes default library and custom user exercises';
COMMENT ON TABLE template IS 'Workout templates created by users';
COMMENT ON TABLE template_exercise IS 'Exercises within templates with ordering';
COMMENT ON TABLE workout IS 'Completed workouts - NO is_draft field (use WorkoutDraft table)';
COMMENT ON TABLE workout_exercise IS 'Exercises within workouts with ordering';
COMMENT ON TABLE "set" IS 'Individual sets - weights in lbs as DECIMAL(6,2), displayed rounded to 0.5';
COMMENT ON TABLE workout_draft IS 'Active workout drafts - deleted atomically on workout completion';

COMMENT ON COLUMN workout.total_volume IS 'Calculated as SUM(weight * reps) excluding warm-up sets';
COMMENT ON COLUMN "set".weight IS 'Weight in pounds only - stored as DECIMAL(6,2), displayed rounded to 0.5';
COMMENT ON COLUMN "set".is_warmup IS 'Warm-up sets excluded from PRs, volume calculations, and charts';
COMMENT ON COLUMN workout_draft.data IS 'JSONB blob containing complete workout state for offline sync';
COMMENT ON COLUMN workout_draft.expires_at IS 'Auto-set to 24 hours from last update';

-- =============================================================================
-- SCHEMA VERSION
-- =============================================================================

CREATE TABLE schema_version (
  version VARCHAR(20) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  description TEXT
);

INSERT INTO schema_version (version, description)
VALUES ('1.0.0', 'Initial schema - GymBrAIn V1.2.2 FINAL');
