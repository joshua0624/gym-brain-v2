/**
 * Stats Service
 *
 * Business logic for workout statistics and performance tracking
 */

import { sql } from '../db.js';
import { REP_RANGES, REP_RANGE_ORDER } from '../calculations/prCalculator.js';

/**
 * Get all Personal Records (PRs) for the user
 * Calculates PRs by exercise and rep range (1RM, 3RM, 5RM, 10RM)
 *
 * @param {string} userId - User UUID
 * @param {string} exerciseId - Optional exercise ID to filter PRs
 * @returns {Promise<Object>} { prs, total }
 */
export async function getPRs(userId, exerciseId = null) {
  // Query to get all working sets with estimated 1RM
  const allSets = exerciseId
    ? await sql`
        SELECT
          e.id as exercise_id,
          e.name as exercise_name,
          w.id as workout_id,
          w.name as workout_name,
          w.completed_at as date,
          s.weight,
          s.reps,
          s.rir,
          -- Calculate estimated 1RM using Brzycki formula
          CASE
            WHEN s.reps > 0 AND s.weight IS NOT NULL THEN
              ROUND(s.weight / (1.0278 - 0.0278 * s.reps), 2)
            ELSE NULL
          END as estimated_1rm
        FROM "set" s
        INNER JOIN workout_exercise we ON s.workout_exercise_id = we.id
        INNER JOIN workout w ON we.workout_id = w.id
        INNER JOIN exercise e ON we.exercise_id = e.id
        WHERE w.user_id = ${userId}
        AND we.exercise_id = ${exerciseId}
        AND s.is_warmup = false
        AND s.is_completed = true
        AND s.weight IS NOT NULL
        AND s.reps IS NOT NULL
        AND s.reps > 0
        ORDER BY e.id, s.weight DESC, w.completed_at DESC
      `
    : await sql`
        SELECT
          e.id as exercise_id,
          e.name as exercise_name,
          w.id as workout_id,
          w.name as workout_name,
          w.completed_at as date,
          s.weight,
          s.reps,
          s.rir,
          -- Calculate estimated 1RM using Brzycki formula
          CASE
            WHEN s.reps > 0 AND s.weight IS NOT NULL THEN
              ROUND(s.weight / (1.0278 - 0.0278 * s.reps), 2)
            ELSE NULL
          END as estimated_1rm
        FROM "set" s
        INNER JOIN workout_exercise we ON s.workout_exercise_id = we.id
        INNER JOIN workout w ON we.workout_id = w.id
        INNER JOIN exercise e ON we.exercise_id = e.id
        WHERE w.user_id = ${userId}
        AND s.is_warmup = false
        AND s.is_completed = true
        AND s.weight IS NOT NULL
        AND s.reps IS NOT NULL
        AND s.reps > 0
        ORDER BY e.id, s.weight DESC, w.completed_at DESC
      `;

  // Group PRs by exercise and rep range
  const prsByExercise = {};

  for (const set of allSets) {
    const exerciseKey = set.exercise_id;

    if (!prsByExercise[exerciseKey]) {
      prsByExercise[exerciseKey] = {
        exerciseId: set.exercise_id,
        exerciseName: set.exercise_name,
        repRanges: {}
      };
    }

    // Check which rep range this set falls into
    for (const range of REP_RANGES) {
      if (set.reps >= range.min && set.reps <= range.max) {
        const currentPR = prsByExercise[exerciseKey].repRanges[range.name];

        // Update PR if this is heavier weight (or first record for this range)
        if (!currentPR || set.weight > currentPR.maxWeight) {
          prsByExercise[exerciseKey].repRanges[range.name] = {
            repRange: range.name,
            maxWeight: parseFloat(set.weight),
            reps: set.reps,
            rir: set.rir,
            estimated1rm: set.estimated_1rm ? parseFloat(set.estimated_1rm) : null,
            date: set.date,
            workoutId: set.workout_id,
            workoutName: set.workout_name
          };
        }
      }
    }
  }

  // Flatten the results into an array
  const prs = [];
  for (const exerciseKey in prsByExercise) {
    const exercise = prsByExercise[exerciseKey];
    for (const rangeName in exercise.repRanges) {
      prs.push({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        ...exercise.repRanges[rangeName]
      });
    }
  }

  // Sort by exercise name, then by rep range
  prs.sort((a, b) => {
    if (a.exerciseName !== b.exerciseName) {
      return a.exerciseName.localeCompare(b.exerciseName);
    }
    return REP_RANGE_ORDER[a.repRange] - REP_RANGE_ORDER[b.repRange];
  });

  return {
    prs,
    total: prs.length
  };
}

/**
 * Get weekly workout statistics including volume by muscle group and frequency heatmap
 *
 * @param {string} userId - User UUID
 * @param {string} weekDate - Monday date of the week in YYYY-MM-DD format (optional)
 * @returns {Promise<Object>} { week, totalVolume, totalWorkouts, volumeByMuscle, frequencyHeatmap }
 */
export async function getWeeklyStats(userId, weekDate = null) {
  // Parse the week date or use current week's Monday
  let weekStart;
  if (weekDate) {
    weekStart = new Date(weekDate);
    // Validate date format
    if (isNaN(weekStart.getTime())) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }
  } else {
    // Get current week's Monday
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days
    weekStart = new Date(now);
    weekStart.setDate(now.getDate() + daysToMonday);
  }

  // Set to start of day (midnight)
  weekStart.setHours(0, 0, 0, 0);

  // Calculate week end (Sunday at 23:59:59)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Convert to ISO strings for database query (UTC)
  const weekStartISO = weekStart.toISOString();
  const weekEndISO = weekEnd.toISOString();

  // Query workouts for the week with exercises and sets
  const workouts = await sql`
    SELECT
      w.id as workout_id,
      w.name as workout_name,
      w.completed_at,
      DATE(w.completed_at) as workout_date,
      e.id as exercise_id,
      e.name as exercise_name,
      e.primary_muscles,
      e.secondary_muscles,
      e.type as exercise_type,
      s.weight,
      s.reps,
      s.is_warmup
    FROM workout w
    INNER JOIN workout_exercise we ON w.id = we.workout_id
    INNER JOIN exercise e ON we.exercise_id = e.id
    INNER JOIN "set" s ON we.id = s.workout_exercise_id
    WHERE w.user_id = ${userId}
    AND w.completed_at >= ${weekStartISO}
    AND w.completed_at <= ${weekEndISO}
    AND s.is_completed = true
    ORDER BY w.completed_at, we.order_index, s.set_number
  `;

  // Calculate total volume and volume by muscle group
  const volumeByMuscle = {};
  let totalVolume = 0;
  const workoutsByDate = {};
  const musclesByDate = {};

  for (const row of workouts) {
    // Track workouts by date for frequency heatmap
    const dateKey = row.workout_date;
    if (!workoutsByDate[dateKey]) {
      workoutsByDate[dateKey] = new Set();
      musclesByDate[dateKey] = new Set();
    }
    workoutsByDate[dateKey].add(row.workout_id);

    // Skip warm-up sets for volume calculation
    if (row.is_warmup) continue;

    // Calculate volume for weighted and bodyweight exercises only
    // NOTE: This uses JavaScript calculation for bodyweight (150 lbs estimate)
    // which differs from the SQL-only calculation in volumeCalculator
    let setVolume = 0;
    if (row.exercise_type === 'weighted' && row.weight && row.reps) {
      setVolume = parseFloat(row.weight) * row.reps;
    } else if (row.exercise_type === 'bodyweight' && row.reps) {
      // Use 150 lbs estimate for bodyweight exercises
      setVolume = 150 * row.reps;
    }

    if (setVolume > 0) {
      totalVolume += setVolume;

      // Add volume to primary muscles
      if (row.primary_muscles && Array.isArray(row.primary_muscles)) {
        for (const muscle of row.primary_muscles) {
          if (!volumeByMuscle[muscle]) {
            volumeByMuscle[muscle] = 0;
          }
          volumeByMuscle[muscle] += setVolume;
          musclesByDate[dateKey].add(muscle);
        }
      }

      // Add half volume to secondary muscles
      if (row.secondary_muscles && Array.isArray(row.secondary_muscles)) {
        for (const muscle of row.secondary_muscles) {
          if (!volumeByMuscle[muscle]) {
            volumeByMuscle[muscle] = 0;
          }
          volumeByMuscle[muscle] += setVolume * 0.5; // 50% attribution to secondary muscles
          musclesByDate[dateKey].add(muscle);
        }
      }
    }
  }

  // Format volume by muscle with percentages
  const volumeByMuscleArray = Object.entries(volumeByMuscle)
    .map(([muscle, volume]) => ({
      muscle,
      volume: parseFloat(volume.toFixed(2)),
      percentage: totalVolume > 0 ? parseFloat(((volume / totalVolume) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.volume - a.volume); // Sort by volume descending

  // Build frequency heatmap (all 7 days of the week)
  const frequencyHeatmap = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateKey = date.toISOString().split('T')[0];

    frequencyHeatmap.push({
      date: dateKey,
      muscles: musclesByDate[dateKey] ? Array.from(musclesByDate[dateKey]) : [],
      workoutCount: workoutsByDate[dateKey] ? workoutsByDate[dateKey].size : 0
    });
  }

  // Count unique workouts
  const totalWorkouts = new Set(workouts.map(w => w.workout_id)).size;

  return {
    week: {
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0]
    },
    totalVolume: parseFloat(totalVolume.toFixed(2)),
    totalWorkouts,
    volumeByMuscle: volumeByMuscleArray,
    frequencyHeatmap
  };
}

/**
 * Get exercise progress data for a specific exercise
 * Returns time-series data of all sets across all user's workouts
 *
 * @param {string} exerciseId - Exercise UUID
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} { exerciseId, exerciseName, data, totalSets }
 */
export async function getExerciseProgress(exerciseId, userId) {
  if (!exerciseId) {
    throw new Error('Exercise ID is required');
  }

  // First, verify the exercise exists
  const exerciseResult = await sql`
    SELECT id, name
    FROM exercise
    WHERE id = ${exerciseId}
    AND (created_by IS NULL OR created_by = ${userId})
    AND is_archived = false
  `;

  if (exerciseResult.length === 0) {
    throw new Error('Exercise not found');
  }

  const exercise = exerciseResult[0];

  // Query all sets for this exercise across all user's workouts
  const progressData = await sql`
    SELECT
      w.id as workout_id,
      w.name as workout_name,
      w.completed_at as date,
      s.set_number,
      s.weight,
      s.reps,
      s.rir,
      s.notes,
      -- Calculate estimated 1RM using Brzycki formula
      CASE
        WHEN s.reps > 0 AND s.weight IS NOT NULL THEN
          ROUND(s.weight / (1.0278 - 0.0278 * s.reps), 2)
        ELSE NULL
      END as estimated_1rm
    FROM "set" s
    INNER JOIN workout_exercise we ON s.workout_exercise_id = we.id
    INNER JOIN workout w ON we.workout_id = w.id
    WHERE we.exercise_id = ${exerciseId}
    AND w.user_id = ${userId}
    AND s.is_warmup = false
    AND s.is_completed = true
    AND s.weight IS NOT NULL
    AND s.reps IS NOT NULL
    ORDER BY w.completed_at DESC, s.set_number ASC
  `;

  // Transform the results to camelCase
  const formattedData = progressData.map(row => ({
    date: row.date,
    workoutId: row.workout_id,
    workoutName: row.workout_name,
    weight: parseFloat(row.weight),
    reps: row.reps,
    rir: row.rir,
    estimated1rm: row.estimated_1rm ? parseFloat(row.estimated_1rm) : null,
    setNumber: row.set_number,
    notes: row.notes
  }));

  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    data: formattedData,
    totalSets: formattedData.length
  };
}
