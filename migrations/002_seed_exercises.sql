-- GymBrAIn V1 - Exercise Library Seed Data
-- Specification: v1.2.2 FINAL
-- Created: 2026-01-17
-- Updated: 2026-02-06 - Expanded to 150+ exercises
-- Comprehensive library covering barbell, dumbbell, cable, machine, and bodyweight variants

-- =============================================================================
-- CHEST EXERCISES
-- =============================================================================

INSERT INTO exercise (name, type, equipment, primary_muscles, secondary_muscles, is_custom, is_archived, created_by)
VALUES
  ('Barbell Bench Press', 'weighted', 'barbell', '{"chest"}', '{"shoulders", "triceps"}', FALSE, FALSE, NULL),
  ('Incline Barbell Bench Press', 'weighted', 'barbell', '{"chest"}', '{"shoulders", "triceps"}', FALSE, FALSE, NULL),
  ('Decline Barbell Press', 'weighted', 'barbell', '{"chest"}', '{"shoulders", "triceps"}', FALSE, FALSE, NULL),
  ('Dumbbell Bench Press', 'weighted', 'dumbbell', '{"chest"}', '{"shoulders", "triceps"}', FALSE, FALSE, NULL),
  ('Incline Dumbbell Press', 'weighted', 'dumbbell', '{"chest"}', '{"shoulders", "triceps"}', FALSE, FALSE, NULL),
  ('Decline Dumbbell Press', 'weighted', 'dumbbell', '{"chest"}', '{"shoulders", "triceps"}', FALSE, FALSE, NULL),
  ('Cable Fly', 'weighted', 'cable', '{"chest"}', '{"shoulders"}', FALSE, FALSE, NULL),
  ('Cable Crossover (High-to-Low)', 'weighted', 'cable', '{"chest"}', '{"shoulders"}', FALSE, FALSE, NULL),
  ('Cable Crossover (Low-to-High)', 'weighted', 'cable', '{"chest"}', '{"shoulders"}', FALSE, FALSE, NULL),
  ('Dumbbell Fly', 'weighted', 'dumbbell', '{"chest"}', '{"shoulders"}', FALSE, FALSE, NULL),
  ('Machine Chest Press', 'weighted', 'machine', '{"chest"}', '{"triceps", "shoulders"}', FALSE, FALSE, NULL),
  ('Smith Machine Bench Press', 'weighted', 'machine', '{"chest"}', '{"triceps", "shoulders"}', FALSE, FALSE, NULL),
  ('Pec Deck Machine', 'weighted', 'machine', '{"chest"}', '{}', FALSE, FALSE, NULL),
  ('Push-Up', 'bodyweight', 'bodyweight', '{"chest"}', '{"shoulders", "triceps", "core"}', FALSE, FALSE, NULL),
  ('Incline Push-Up', 'bodyweight', 'bodyweight', '{"chest"}', '{"triceps", "shoulders"}', FALSE, FALSE, NULL),
  ('Dip', 'bodyweight', 'bodyweight', '{"chest", "triceps"}', '{"shoulders"}', FALSE, FALSE, NULL),
  ('Svend Press', 'weighted', 'dumbbell', '{"chest"}', '{"triceps"}', FALSE, FALSE, NULL);

-- =============================================================================
-- BACK EXERCISES
-- =============================================================================

INSERT INTO exercise (name, type, equipment, primary_muscles, secondary_muscles, is_custom, is_archived, created_by)
VALUES
  ('Conventional Deadlift', 'weighted', 'barbell', '{"back", "glutes", "hamstrings"}', '{"core", "traps"}', FALSE, FALSE, NULL),
  ('Deficit Deadlift', 'weighted', 'barbell', '{"hamstrings", "glutes", "back"}', '{"quads", "forearms"}', FALSE, FALSE, NULL),
  ('Rack Pull', 'weighted', 'barbell', '{"back"}', '{"hamstrings", "glutes", "forearms", "traps"}', FALSE, FALSE, NULL),
  ('Trap Bar Deadlift', 'weighted', 'other', '{"hamstrings", "glutes", "quads"}', '{"back", "forearms"}', FALSE, FALSE, NULL),
  ('Barbell Row', 'weighted', 'barbell', '{"back"}', '{"biceps", "core"}', FALSE, FALSE, NULL),
  ('T-Bar Row', 'weighted', 'barbell', '{"back"}', '{"biceps", "core"}', FALSE, FALSE, NULL),
  ('Landmine Row', 'weighted', 'barbell', '{"back"}', '{"biceps", "forearms"}', FALSE, FALSE, NULL),
  ('Seal Row', 'weighted', 'barbell', '{"back"}', '{"biceps", "forearms"}', FALSE, FALSE, NULL),
  ('Dumbbell Row', 'weighted', 'dumbbell', '{"back"}', '{"biceps"}', FALSE, FALSE, NULL),
  ('Chest-Supported Dumbbell Row', 'weighted', 'dumbbell', '{"back"}', '{"biceps", "forearms"}', FALSE, FALSE, NULL),
  ('Kroc Row', 'weighted', 'dumbbell', '{"back"}', '{"biceps", "forearms"}', FALSE, FALSE, NULL),
  ('Dumbbell Pullover', 'weighted', 'dumbbell', '{"lats"}', '{"chest", "triceps"}', FALSE, FALSE, NULL),
  ('Lat Pulldown', 'weighted', 'cable', '{"lats"}', '{"biceps"}', FALSE, FALSE, NULL),
  ('Reverse-Grip Lat Pulldown', 'weighted', 'cable', '{"lats"}', '{"biceps"}', FALSE, FALSE, NULL),
  ('Single-Arm Lat Pulldown', 'weighted', 'cable', '{"lats"}', '{"biceps"}', FALSE, FALSE, NULL),
  ('Seated Cable Row', 'weighted', 'cable', '{"back"}', '{"biceps"}', FALSE, FALSE, NULL),
  ('One-Arm Cable Row', 'weighted', 'cable', '{"back"}', '{"biceps", "forearms"}', FALSE, FALSE, NULL),
  ('Straight-Arm Pulldown', 'weighted', 'cable', '{"lats"}', '{"triceps"}', FALSE, FALSE, NULL),
  ('Cable Pullover', 'weighted', 'cable', '{"lats"}', '{"triceps"}', FALSE, FALSE, NULL),
  ('Face Pull', 'weighted', 'cable', '{"back", "shoulders"}', '{"traps"}', FALSE, FALSE, NULL),
  ('Assisted Pull-Up', 'weighted', 'machine', '{"back"}', '{"biceps"}', FALSE, FALSE, NULL),
  ('Hyperextension', 'bodyweight', 'machine', '{"back", "glutes"}', '{"hamstrings"}', FALSE, FALSE, NULL),
  ('Reverse Hyperextension', 'bodyweight', 'machine', '{"glutes"}', '{"hamstrings", "back"}', FALSE, FALSE, NULL),
  ('Pull-Up', 'bodyweight', 'bodyweight', '{"back"}', '{"biceps", "core"}', FALSE, FALSE, NULL),
  ('Chin-Up', 'bodyweight', 'bodyweight', '{"back"}', '{"biceps"}', FALSE, FALSE, NULL),
  ('Inverted Row', 'bodyweight', 'bodyweight', '{"back"}', '{"biceps", "forearms"}', FALSE, FALSE, NULL);

-- =============================================================================
-- SHOULDER EXERCISES
-- =============================================================================

INSERT INTO exercise (name, type, equipment, primary_muscles, secondary_muscles, is_custom, is_archived, created_by)
VALUES
  ('Overhead Press', 'weighted', 'barbell', '{"shoulders"}', '{"triceps", "core"}', FALSE, FALSE, NULL),
  ('Push Press', 'weighted', 'barbell', '{"shoulders"}', '{"triceps", "quads"}', FALSE, FALSE, NULL),
  ('Upright Row', 'weighted', 'barbell', '{"shoulders"}', '{"traps"}', FALSE, FALSE, NULL),
  ('Dumbbell Shoulder Press', 'weighted', 'dumbbell', '{"shoulders"}', '{"triceps"}', FALSE, FALSE, NULL),
  ('Seated Dumbbell Shoulder Press', 'weighted', 'dumbbell', '{"shoulders"}', '{"triceps"}', FALSE, FALSE, NULL),
  ('Single-Arm Dumbbell Overhead Press', 'weighted', 'dumbbell', '{"shoulders"}', '{"triceps", "core"}', FALSE, FALSE, NULL),
  ('Arnold Press', 'weighted', 'dumbbell', '{"shoulders"}', '{"triceps"}', FALSE, FALSE, NULL),
  ('Lateral Raise', 'weighted', 'dumbbell', '{"shoulders"}', '{}', FALSE, FALSE, NULL),
  ('Front Raise', 'weighted', 'dumbbell', '{"shoulders"}', '{}', FALSE, FALSE, NULL),
  ('Reverse Fly', 'weighted', 'dumbbell', '{"shoulders"}', '{"back"}', FALSE, FALSE, NULL),
  ('Bent-Over Dumbbell Lateral Raise', 'weighted', 'dumbbell', '{"shoulders"}', '{"back"}', FALSE, FALSE, NULL),
  ('Cable Lateral Raise', 'weighted', 'cable', '{"shoulders"}', '{}', FALSE, FALSE, NULL),
  ('Cable Front Raise', 'weighted', 'cable', '{"shoulders"}', '{"traps"}', FALSE, FALSE, NULL),
  ('Cable Rear Delt Fly', 'weighted', 'cable', '{"shoulders"}', '{"back"}', FALSE, FALSE, NULL),
  ('Smith Machine Shoulder Press', 'weighted', 'machine', '{"shoulders"}', '{"triceps"}', FALSE, FALSE, NULL),
  ('Shrugs', 'weighted', 'dumbbell', '{"traps"}', '{}', FALSE, FALSE, NULL),
  ('Barbell Shrugs', 'weighted', 'barbell', '{"traps"}', '{"shoulders"}', FALSE, FALSE, NULL),
  ('Farmer''s Walk', 'weighted', 'dumbbell', '{"traps", "forearms"}', '{"core"}', FALSE, FALSE, NULL),
  ('Plate Front Raise', 'weighted', 'other', '{"shoulders"}', '{"traps"}', FALSE, FALSE, NULL),
  ('Handstand Push-Up', 'bodyweight', 'bodyweight', '{"shoulders"}', '{"triceps", "core"}', FALSE, FALSE, NULL),
  ('Pike Push-Up', 'bodyweight', 'bodyweight', '{"shoulders"}', '{"triceps"}', FALSE, FALSE, NULL);

-- =============================================================================
-- ARM EXERCISES (BICEPS & TRICEPS & FOREARMS)
-- =============================================================================

INSERT INTO exercise (name, type, equipment, primary_muscles, secondary_muscles, is_custom, is_archived, created_by)
VALUES
  -- Biceps
  ('Barbell Curl', 'weighted', 'barbell', '{"biceps"}', '{"forearms"}', FALSE, FALSE, NULL),
  ('Preacher Curl', 'weighted', 'barbell', '{"biceps"}', '{}', FALSE, FALSE, NULL),
  ('Spider Curl', 'weighted', 'barbell', '{"biceps"}', '{"forearms"}', FALSE, FALSE, NULL),
  ('Drag Curl', 'weighted', 'barbell', '{"biceps"}', '{"forearms"}', FALSE, FALSE, NULL),
  ('Dumbbell Curl', 'weighted', 'dumbbell', '{"biceps"}', '{"forearms"}', FALSE, FALSE, NULL),
  ('Hammer Curl', 'weighted', 'dumbbell', '{"biceps"}', '{"forearms"}', FALSE, FALSE, NULL),
  ('Incline Dumbbell Curl', 'weighted', 'dumbbell', '{"biceps"}', '{"forearms"}', FALSE, FALSE, NULL),
  ('Concentration Curl', 'weighted', 'dumbbell', '{"biceps"}', '{}', FALSE, FALSE, NULL),
  ('Zottman Curl', 'weighted', 'dumbbell', '{"biceps"}', '{"forearms"}', FALSE, FALSE, NULL),
  ('Cable Curl', 'weighted', 'cable', '{"biceps"}', '{"forearms"}', FALSE, FALSE, NULL),
  ('High Cable Curl', 'weighted', 'cable', '{"biceps"}', '{"shoulders"}', FALSE, FALSE, NULL),
  ('Machine Bicep Curl', 'weighted', 'machine', '{"biceps"}', '{"forearms"}', FALSE, FALSE, NULL),

  -- Triceps
  ('Tricep Pushdown', 'weighted', 'cable', '{"triceps"}', '{}', FALSE, FALSE, NULL),
  ('Single-Arm Tricep Pushdown', 'weighted', 'cable', '{"triceps"}', '{"forearms"}', FALSE, FALSE, NULL),
  ('Reverse-Grip Tricep Pushdown', 'weighted', 'cable', '{"triceps"}', '{"forearms"}', FALSE, FALSE, NULL),
  ('Skull Crusher', 'weighted', 'barbell', '{"triceps"}', '{}', FALSE, FALSE, NULL),
  ('Close-Grip Bench Press', 'weighted', 'barbell', '{"triceps"}', '{"chest", "shoulders"}', FALSE, FALSE, NULL),
  ('Floor Press', 'weighted', 'barbell', '{"triceps"}', '{"chest", "shoulders"}', FALSE, FALSE, NULL),
  ('JM Press', 'weighted', 'barbell', '{"triceps"}', '{"chest"}', FALSE, FALSE, NULL),
  ('Overhead Tricep Extension', 'weighted', 'dumbbell', '{"triceps"}', '{}', FALSE, FALSE, NULL),
  ('Single-Arm Overhead Tricep Extension', 'weighted', 'dumbbell', '{"triceps"}', '{"shoulders"}', FALSE, FALSE, NULL),
  ('Dumbbell Kickback', 'weighted', 'dumbbell', '{"triceps"}', '{"shoulders"}', FALSE, FALSE, NULL),
  ('Machine Tricep Extension', 'weighted', 'machine', '{"triceps"}', '{}', FALSE, FALSE, NULL),
  ('Tricep Dip', 'bodyweight', 'bodyweight', '{"triceps"}', '{"chest", "shoulders"}', FALSE, FALSE, NULL),

  -- Forearms
  ('Barbell Wrist Curl', 'weighted', 'barbell', '{"forearms"}', '{}', FALSE, FALSE, NULL),
  ('Reverse Barbell Wrist Curl', 'weighted', 'barbell', '{"forearms"}', '{}', FALSE, FALSE, NULL),
  ('Reverse Curl', 'weighted', 'barbell', '{"forearms"}', '{"biceps"}', FALSE, FALSE, NULL),
  ('Dumbbell Wrist Curl', 'weighted', 'dumbbell', '{"forearms"}', '{}', FALSE, FALSE, NULL);

-- =============================================================================
-- LEG EXERCISES
-- =============================================================================

INSERT INTO exercise (name, type, equipment, primary_muscles, secondary_muscles, is_custom, is_archived, created_by)
VALUES
  -- Quads
  ('Barbell Squat', 'weighted', 'barbell', '{"quads"}', '{"glutes", "hamstrings", "core"}', FALSE, FALSE, NULL),
  ('Front Squat', 'weighted', 'barbell', '{"quads"}', '{"glutes", "core"}', FALSE, FALSE, NULL),
  ('Zercher Squat', 'weighted', 'barbell', '{"quads"}', '{"glutes", "hamstrings", "core"}', FALSE, FALSE, NULL),
  ('Goblet Squat', 'weighted', 'dumbbell', '{"quads"}', '{"glutes", "core"}', FALSE, FALSE, NULL),
  ('Bulgarian Split Squat', 'weighted', 'dumbbell', '{"quads"}', '{"glutes"}', FALSE, FALSE, NULL),
  ('Dumbbell Split Squat', 'weighted', 'dumbbell', '{"quads"}', '{"glutes", "hamstrings"}', FALSE, FALSE, NULL),
  ('Walking Lunge', 'weighted', 'dumbbell', '{"quads", "glutes"}', '{"hamstrings"}', FALSE, FALSE, NULL),
  ('Reverse Lunge', 'weighted', 'dumbbell', '{"quads"}', '{"glutes", "hamstrings"}', FALSE, FALSE, NULL),
  ('Lateral Lunge', 'weighted', 'dumbbell', '{"quads"}', '{"glutes", "hamstrings"}', FALSE, FALSE, NULL),
  ('Step-Up', 'weighted', 'dumbbell', '{"quads", "glutes"}', '{}', FALSE, FALSE, NULL),
  ('Leg Press', 'weighted', 'machine', '{"quads"}', '{"glutes", "hamstrings"}', FALSE, FALSE, NULL),
  ('Hack Squat', 'weighted', 'machine', '{"quads"}', '{"glutes", "hamstrings"}', FALSE, FALSE, NULL),
  ('Smith Machine Squat', 'weighted', 'machine', '{"quads"}', '{"glutes", "hamstrings"}', FALSE, FALSE, NULL),
  ('Belt Squat', 'weighted', 'machine', '{"quads"}', '{"glutes", "hamstrings"}', FALSE, FALSE, NULL),
  ('Leg Extension', 'weighted', 'machine', '{"quads"}', '{}', FALSE, FALSE, NULL),
  ('Adductor Machine', 'weighted', 'machine', '{"quads"}', '{"glutes"}', FALSE, FALSE, NULL),
  ('Abductor Machine', 'weighted', 'machine', '{"glutes"}', '{"quads"}', FALSE, FALSE, NULL),
  ('Pistol Squat', 'bodyweight', 'bodyweight', '{"quads"}', '{"glutes", "hamstrings", "core"}', FALSE, FALSE, NULL),
  ('Sissy Squat', 'bodyweight', 'bodyweight', '{"quads"}', '{"glutes"}', FALSE, FALSE, NULL),
  ('Box Jump', 'bodyweight', 'bodyweight', '{"quads"}', '{"glutes", "hamstrings"}', FALSE, FALSE, NULL),
  ('Jump Squat', 'bodyweight', 'bodyweight', '{"quads"}', '{"glutes", "hamstrings"}', FALSE, FALSE, NULL),

  -- Hamstrings & Glutes
  ('Romanian Deadlift', 'weighted', 'barbell', '{"hamstrings", "glutes"}', '{"back"}', FALSE, FALSE, NULL),
  ('Good Morning', 'weighted', 'barbell', '{"hamstrings"}', '{"glutes", "back"}', FALSE, FALSE, NULL),
  ('Hip Thrust', 'weighted', 'barbell', '{"glutes"}', '{"hamstrings"}', FALSE, FALSE, NULL),
  ('Single-Leg Romanian Deadlift', 'weighted', 'dumbbell', '{"hamstrings"}', '{"glutes", "core"}', FALSE, FALSE, NULL),
  ('Leg Curl', 'weighted', 'machine', '{"hamstrings"}', '{}', FALSE, FALSE, NULL),
  ('Standing Leg Curl', 'weighted', 'machine', '{"hamstrings"}', '{"glutes"}', FALSE, FALSE, NULL),
  ('Cable Pull-Through', 'weighted', 'cable', '{"glutes"}', '{"hamstrings"}', FALSE, FALSE, NULL),
  ('Glute Bridge', 'bodyweight', 'bodyweight', '{"glutes"}', '{"hamstrings"}', FALSE, FALSE, NULL),
  ('Glute Ham Raise', 'bodyweight', 'machine', '{"hamstrings"}', '{"glutes", "back"}', FALSE, FALSE, NULL),
  ('Nordic Hamstring Curl', 'bodyweight', 'bodyweight', '{"hamstrings"}', '{"glutes"}', FALSE, FALSE, NULL),
  ('Kettlebell Swing', 'weighted', 'other', '{"glutes"}', '{"hamstrings", "back", "core"}', FALSE, FALSE, NULL),

  -- Calves
  ('Standing Calf Raise', 'weighted', 'machine', '{"calves"}', '{}', FALSE, FALSE, NULL),
  ('Seated Calf Raise', 'weighted', 'machine', '{"calves"}', '{}', FALSE, FALSE, NULL),
  ('Calf Press on Leg Press', 'weighted', 'machine', '{"calves"}', '{}', FALSE, FALSE, NULL),
  ('Donkey Calf Raise', 'weighted', 'machine', '{"calves"}', '{}', FALSE, FALSE, NULL);

-- =============================================================================
-- CORE EXERCISES
-- =============================================================================

INSERT INTO exercise (name, type, equipment, primary_muscles, secondary_muscles, is_custom, is_archived, created_by)
VALUES
  ('Plank', 'timed', 'bodyweight', '{"abs"}', '{"core"}', FALSE, FALSE, NULL),
  ('Side Plank', 'timed', 'bodyweight', '{"obliques"}', '{"core"}', FALSE, FALSE, NULL),
  ('Mountain Climber', 'timed', 'bodyweight', '{"abs"}', '{"core"}', FALSE, FALSE, NULL),
  ('Crunch', 'bodyweight', 'bodyweight', '{"abs"}', '{}', FALSE, FALSE, NULL),
  ('Reverse Crunch', 'bodyweight', 'bodyweight', '{"abs"}', '{"obliques"}', FALSE, FALSE, NULL),
  ('Decline Sit-Up', 'bodyweight', 'bodyweight', '{"abs"}', '{"obliques"}', FALSE, FALSE, NULL),
  ('Leg Raise', 'bodyweight', 'bodyweight', '{"abs"}', '{}', FALSE, FALSE, NULL),
  ('Hanging Knee Raise', 'bodyweight', 'bodyweight', '{"abs"}', '{}', FALSE, FALSE, NULL),
  ('Hanging Leg Raise', 'bodyweight', 'bodyweight', '{"abs"}', '{"obliques"}', FALSE, FALSE, NULL),
  ('Ab Wheel Rollout', 'bodyweight', 'other', '{"abs"}', '{"core"}', FALSE, FALSE, NULL),
  ('Russian Twist', 'weighted', 'dumbbell', '{"obliques"}', '{"abs"}', FALSE, FALSE, NULL),
  ('Cable Woodchop', 'weighted', 'cable', '{"obliques"}', '{"abs"}', FALSE, FALSE, NULL),
  ('Cable Crunch', 'weighted', 'cable', '{"abs"}', '{"obliques"}', FALSE, FALSE, NULL),
  ('Pallof Press', 'weighted', 'cable', '{"obliques"}', '{"abs"}', FALSE, FALSE, NULL),
  ('Machine Crunch', 'weighted', 'machine', '{"abs"}', '{"obliques"}', FALSE, FALSE, NULL),
  ('Dead Bug', 'bodyweight', 'bodyweight', '{"abs"}', '{"obliques"}', FALSE, FALSE, NULL),
  ('Bird Dog', 'bodyweight', 'bodyweight', '{"abs"}', '{"back"}', FALSE, FALSE, NULL),
  ('Flutter Kicks', 'bodyweight', 'bodyweight', '{"abs"}', '{"quads"}', FALSE, FALSE, NULL);

-- =============================================================================
-- CARDIO EXERCISES
-- =============================================================================

INSERT INTO exercise (name, type, equipment, primary_muscles, secondary_muscles, is_custom, is_archived, created_by)
VALUES
  ('Running', 'cardio', 'other', '{"quads", "hamstrings"}', '{"calves", "glutes"}', FALSE, FALSE, NULL),
  ('Sprinting', 'cardio', 'bodyweight', '{"quads"}', '{"glutes", "hamstrings", "calves"}', FALSE, FALSE, NULL),
  ('Cycling', 'cardio', 'machine', '{"quads"}', '{"hamstrings", "calves"}', FALSE, FALSE, NULL),
  ('Rowing Machine', 'cardio', 'machine', '{"back", "quads"}', '{"biceps", "shoulders"}', FALSE, FALSE, NULL),
  ('Elliptical', 'cardio', 'machine', '{"quads"}', '{"glutes"}', FALSE, FALSE, NULL),
  ('Stair Climber', 'cardio', 'machine', '{"quads"}', '{"glutes", "hamstrings", "calves"}', FALSE, FALSE, NULL),
  ('Ski Erg', 'cardio', 'machine', '{"back", "shoulders"}', '{"triceps", "abs"}', FALSE, FALSE, NULL),
  ('Jump Rope', 'cardio', 'other', '{"calves"}', '{"quads"}', FALSE, FALSE, NULL),
  ('Burpee', 'cardio', 'bodyweight', '{"quads"}', '{"chest", "shoulders", "core"}', FALSE, FALSE, NULL),
  ('Battle Ropes', 'timed', 'other', '{"shoulders"}', '{"abs", "forearms", "back"}', FALSE, FALSE, NULL),
  ('High Knees', 'timed', 'bodyweight', '{"quads"}', '{"glutes", "abs"}', FALSE, FALSE, NULL);

-- =============================================================================
-- SUMMARY
-- =============================================================================
-- Total exercises: 158 default library exercises
-- Coverage:
--   - Chest: 17 exercises (barbell, dumbbell, cable, machine, bodyweight)
--   - Back: 26 exercises (barbell, dumbbell, cable, machine, bodyweight)
--   - Shoulders: 21 exercises (barbell, dumbbell, cable, machine, bodyweight)
--   - Arms (Biceps + Triceps + Forearms): 28 exercises
--   - Legs (Quads + Hamstrings + Glutes + Calves): 36 exercises
--   - Core: 18 exercises (bodyweight, cable, machine)
--   - Cardio: 11 exercises
--
-- Equipment distribution:
--   - Barbell: ~25 exercises
--   - Dumbbell: ~35 exercises
--   - Cable: ~20 exercises
--   - Machine: ~30 exercises
--   - Bodyweight: ~30 exercises
--   - Other: ~8 exercises
-- =============================================================================

-- Update schema version
INSERT INTO schema_version (version, description)
VALUES ('1.0.2', 'Expanded exercise library - 158 default exercises');
