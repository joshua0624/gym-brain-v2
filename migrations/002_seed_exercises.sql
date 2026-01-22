-- GymBrAIn V1 - Exercise Library Seed Data
-- Specification: v1.2.2 FINAL
-- Created: 2026-01-17
-- 50+ default exercises covering all major muscle groups

-- =============================================================================
-- CHEST EXERCISES
-- =============================================================================

INSERT INTO exercise (name, type, equipment, primary_muscles, secondary_muscles, is_custom, is_archived, created_by)
VALUES
  ('Barbell Bench Press', 'weighted', 'barbell', '{"chest"}', '{"shoulders", "triceps"}', FALSE, FALSE, NULL),
  ('Incline Barbell Bench Press', 'weighted', 'barbell', '{"chest"}', '{"shoulders", "triceps"}', FALSE, FALSE, NULL),
  ('Dumbbell Bench Press', 'weighted', 'dumbbell', '{"chest"}', '{"shoulders", "triceps"}', FALSE, FALSE, NULL),
  ('Incline Dumbbell Press', 'weighted', 'dumbbell', '{"chest"}', '{"shoulders", "triceps"}', FALSE, FALSE, NULL),
  ('Cable Fly', 'weighted', 'cable', '{"chest"}', '{"shoulders"}', FALSE, FALSE, NULL),
  ('Dumbbell Fly', 'weighted', 'dumbbell', '{"chest"}', '{"shoulders"}', FALSE, FALSE, NULL),
  ('Push-Up', 'bodyweight', 'bodyweight', '{"chest"}', '{"shoulders", "triceps", "core"}', FALSE, FALSE, NULL),
  ('Dip', 'bodyweight', 'bodyweight', '{"chest", "triceps"}', '{"shoulders"}', FALSE, FALSE, NULL),
  ('Pec Deck Machine', 'weighted', 'machine', '{"chest"}', '{}', FALSE, FALSE, NULL),
  ('Decline Barbell Press', 'weighted', 'barbell', '{"chest"}', '{"shoulders", "triceps"}', FALSE, FALSE, NULL);

-- =============================================================================
-- BACK EXERCISES
-- =============================================================================

INSERT INTO exercise (name, type, equipment, primary_muscles, secondary_muscles, is_custom, is_archived, created_by)
VALUES
  ('Conventional Deadlift', 'weighted', 'barbell', '{"back", "glutes", "hamstrings"}', '{"core", "traps"}', FALSE, FALSE, NULL),
  ('Barbell Row', 'weighted', 'barbell', '{"back"}', '{"biceps", "core"}', FALSE, FALSE, NULL),
  ('Lat Pulldown', 'weighted', 'cable', '{"back"}', '{"biceps"}', FALSE, FALSE, NULL),
  ('Pull-Up', 'bodyweight', 'bodyweight', '{"back"}', '{"biceps", "core"}', FALSE, FALSE, NULL),
  ('Seated Cable Row', 'weighted', 'cable', '{"back"}', '{"biceps"}', FALSE, FALSE, NULL),
  ('T-Bar Row', 'weighted', 'barbell', '{"back"}', '{"biceps", "core"}', FALSE, FALSE, NULL),
  ('Dumbbell Row', 'weighted', 'dumbbell', '{"back"}', '{"biceps"}', FALSE, FALSE, NULL),
  ('Chin-Up', 'bodyweight', 'bodyweight', '{"back"}', '{"biceps"}', FALSE, FALSE, NULL),
  ('Face Pull', 'weighted', 'cable', '{"back"}', '{"rear delts"}', FALSE, FALSE, NULL),
  ('Hyperextension', 'bodyweight', 'machine', '{"back", "glutes"}', '{"hamstrings"}', FALSE, FALSE, NULL),
  ('Assisted Pull-Up', 'weighted', 'machine', '{"back"}', '{"biceps"}', FALSE, FALSE, NULL);

-- =============================================================================
-- SHOULDER EXERCISES
-- =============================================================================

INSERT INTO exercise (name, type, equipment, primary_muscles, secondary_muscles, is_custom, is_archived, created_by)
VALUES
  ('Overhead Press', 'weighted', 'barbell', '{"shoulders"}', '{"triceps", "core"}', FALSE, FALSE, NULL),
  ('Dumbbell Shoulder Press', 'weighted', 'dumbbell', '{"shoulders"}', '{"triceps"}', FALSE, FALSE, NULL),
  ('Lateral Raise', 'weighted', 'dumbbell', '{"shoulders"}', '{}', FALSE, FALSE, NULL),
  ('Front Raise', 'weighted', 'dumbbell', '{"shoulders"}', '{}', FALSE, FALSE, NULL),
  ('Reverse Fly', 'weighted', 'dumbbell', '{"shoulders"}', '{"back"}', FALSE, FALSE, NULL),
  ('Arnold Press', 'weighted', 'dumbbell', '{"shoulders"}', '{"triceps"}', FALSE, FALSE, NULL),
  ('Cable Lateral Raise', 'weighted', 'cable', '{"shoulders"}', '{}', FALSE, FALSE, NULL),
  ('Upright Row', 'weighted', 'barbell', '{"shoulders"}', '{"traps"}', FALSE, FALSE, NULL),
  ('Shrugs', 'weighted', 'dumbbell', '{"traps"}', '{}', FALSE, FALSE, NULL);

-- =============================================================================
-- ARM EXERCISES (BICEPS & TRICEPS)
-- =============================================================================

INSERT INTO exercise (name, type, equipment, primary_muscles, secondary_muscles, is_custom, is_archived, created_by)
VALUES
  -- Biceps
  ('Barbell Curl', 'weighted', 'barbell', '{"biceps"}', '{"forearms"}', FALSE, FALSE, NULL),
  ('Dumbbell Curl', 'weighted', 'dumbbell', '{"biceps"}', '{"forearms"}', FALSE, FALSE, NULL),
  ('Hammer Curl', 'weighted', 'dumbbell', '{"biceps"}', '{"forearms"}', FALSE, FALSE, NULL),
  ('Preacher Curl', 'weighted', 'barbell', '{"biceps"}', '{}', FALSE, FALSE, NULL),
  ('Cable Curl', 'weighted', 'cable', '{"biceps"}', '{"forearms"}', FALSE, FALSE, NULL),
  ('Concentration Curl', 'weighted', 'dumbbell', '{"biceps"}', '{}', FALSE, FALSE, NULL),

  -- Triceps
  ('Tricep Pushdown', 'weighted', 'cable', '{"triceps"}', '{}', FALSE, FALSE, NULL),
  ('Skull Crusher', 'weighted', 'barbell', '{"triceps"}', '{}', FALSE, FALSE, NULL),
  ('Overhead Tricep Extension', 'weighted', 'dumbbell', '{"triceps"}', '{}', FALSE, FALSE, NULL),
  ('Close-Grip Bench Press', 'weighted', 'barbell', '{"triceps"}', '{"chest", "shoulders"}', FALSE, FALSE, NULL),
  ('Tricep Dip', 'bodyweight', 'bodyweight', '{"triceps"}', '{"chest", "shoulders"}', FALSE, FALSE, NULL);

-- =============================================================================
-- LEG EXERCISES
-- =============================================================================

INSERT INTO exercise (name, type, equipment, primary_muscles, secondary_muscles, is_custom, is_archived, created_by)
VALUES
  -- Quads
  ('Barbell Squat', 'weighted', 'barbell', '{"quads"}', '{"glutes", "hamstrings", "core"}', FALSE, FALSE, NULL),
  ('Front Squat', 'weighted', 'barbell', '{"quads"}', '{"glutes", "core"}', FALSE, FALSE, NULL),
  ('Leg Press', 'weighted', 'machine', '{"quads"}', '{"glutes", "hamstrings"}', FALSE, FALSE, NULL),
  ('Leg Extension', 'weighted', 'machine', '{"quads"}', '{}', FALSE, FALSE, NULL),
  ('Bulgarian Split Squat', 'weighted', 'dumbbell', '{"quads"}', '{"glutes"}', FALSE, FALSE, NULL),
  ('Goblet Squat', 'weighted', 'dumbbell', '{"quads"}', '{"glutes", "core"}', FALSE, FALSE, NULL),

  -- Hamstrings & Glutes
  ('Romanian Deadlift', 'weighted', 'barbell', '{"hamstrings", "glutes"}', '{"back"}', FALSE, FALSE, NULL),
  ('Leg Curl', 'weighted', 'machine', '{"hamstrings"}', '{}', FALSE, FALSE, NULL),
  ('Hip Thrust', 'weighted', 'barbell', '{"glutes"}', '{"hamstrings"}', FALSE, FALSE, NULL),
  ('Glute Bridge', 'bodyweight', 'bodyweight', '{"glutes"}', '{"hamstrings"}', FALSE, FALSE, NULL),
  ('Walking Lunge', 'weighted', 'dumbbell', '{"quads", "glutes"}', '{"hamstrings"}', FALSE, FALSE, NULL),
  ('Step-Up', 'weighted', 'dumbbell', '{"quads", "glutes"}', '{}', FALSE, FALSE, NULL),

  -- Calves
  ('Standing Calf Raise', 'weighted', 'machine', '{"calves"}', '{}', FALSE, FALSE, NULL),
  ('Seated Calf Raise', 'weighted', 'machine', '{"calves"}', '{}', FALSE, FALSE, NULL);

-- =============================================================================
-- CORE EXERCISES
-- =============================================================================

INSERT INTO exercise (name, type, equipment, primary_muscles, secondary_muscles, is_custom, is_archived, created_by)
VALUES
  ('Plank', 'timed', 'bodyweight', '{"core"}', '{}', FALSE, FALSE, NULL),
  ('Side Plank', 'timed', 'bodyweight', '{"core"}', '{}', FALSE, FALSE, NULL),
  ('Crunch', 'bodyweight', 'bodyweight', '{"core"}', '{}', FALSE, FALSE, NULL),
  ('Leg Raise', 'bodyweight', 'bodyweight', '{"core"}', '{}', FALSE, FALSE, NULL),
  ('Cable Woodchop', 'weighted', 'cable', '{"core"}', '{}', FALSE, FALSE, NULL),
  ('Ab Wheel Rollout', 'bodyweight', 'other', '{"core"}', '{}', FALSE, FALSE, NULL),
  ('Russian Twist', 'weighted', 'dumbbell', '{"core"}', '{}', FALSE, FALSE, NULL),
  ('Hanging Knee Raise', 'bodyweight', 'bodyweight', '{"core"}', '{}', FALSE, FALSE, NULL),
  ('Mountain Climber', 'timed', 'bodyweight', '{"core"}', '{}', FALSE, FALSE, NULL);

-- =============================================================================
-- CARDIO EXERCISES
-- =============================================================================

INSERT INTO exercise (name, type, equipment, primary_muscles, secondary_muscles, is_custom, is_archived, created_by)
VALUES
  ('Running', 'cardio', 'other', '{"cardio"}', '{}', FALSE, FALSE, NULL),
  ('Cycling', 'cardio', 'other', '{"cardio"}', '{}', FALSE, FALSE, NULL),
  ('Rowing Machine', 'cardio', 'machine', '{"cardio", "back"}', '{"legs"}', FALSE, FALSE, NULL),
  ('Elliptical', 'cardio', 'machine', '{"cardio"}', '{}', FALSE, FALSE, NULL),
  ('Jump Rope', 'cardio', 'other', '{"cardio"}', '{"calves"}', FALSE, FALSE, NULL),
  ('Burpee', 'cardio', 'bodyweight', '{"cardio"}', '{"chest", "legs", "core"}', FALSE, FALSE, NULL);

-- =============================================================================
-- SUMMARY
-- =============================================================================
-- Total exercises: 68 default library exercises
-- Coverage:
--   - Chest: 10 exercises
--   - Back: 11 exercises
--   - Shoulders: 9 exercises
--   - Arms (Biceps + Triceps): 11 exercises
--   - Legs (Quads + Hamstrings + Glutes + Calves): 14 exercises
--   - Core: 9 exercises
--   - Cardio: 6 exercises
--
-- All exercises have:
--   - type: weighted | bodyweight | cardio | timed
--   - equipment: barbell | dumbbell | cable | machine | bodyweight | other
--   - primary_muscles: array of muscle groups
--   - secondary_muscles: array of secondary muscles (can be empty)
--   - is_custom: FALSE (library exercises)
--   - is_archived: FALSE (default active state)
--   - created_by: NULL (library exercises not tied to any user)
-- =============================================================================

-- Update schema version
INSERT INTO schema_version (version, description)
VALUES ('1.0.1', 'Exercise library seed data - 68 default exercises');
