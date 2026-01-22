-- Add is_completed columns to workout_exercise and set tables
-- Required by spec v1.2.2, was missing from initial schema

-- Add is_completed to workout_exercise table
ALTER TABLE workout_exercise
ADD COLUMN is_completed BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN workout_exercise.is_completed IS 'All sets completed for this exercise';

-- Add is_completed to set table
ALTER TABLE "set"
ADD COLUMN is_completed BOOLEAN DEFAULT TRUE NOT NULL;

COMMENT ON COLUMN "set".is_completed IS 'Set has been logged (true if exists in DB)';

-- Update schema version
INSERT INTO schema_version (version, description)
VALUES ('1.0.1', 'Add is_completed columns to workout_exercise and set tables');
