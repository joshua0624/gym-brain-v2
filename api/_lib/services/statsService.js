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
        exercise_id: set.exercise_id,
        exercise_name: set.exercise_name,
        repRanges: {}
      };
    }

    // Check which rep range this set falls into
    for (const range of REP_RANGES) {
      if (set.reps >= range.min && set.reps <= range.max) {
        const currentPR = prsByExercise[exerciseKey].repRanges[range.name];

        // Update PR if this is heavier weight (or first record for this range)
        if (!currentPR || set.weight > currentPR.max_weight) {
          prsByExercise[exerciseKey].repRanges[range.name] = {
            rep_range: range.name,
            max_weight: parseFloat(set.weight),
            reps: set.reps,
            rir: set.rir,
            estimated_1rm: set.estimated_1rm ? parseFloat(set.estimated_1rm) : null,
            date: set.date,
            workout_id: set.workout_id,
            workout_name: set.workout_name
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
        exercise_id: exercise.exercise_id,
        exercise_name: exercise.exercise_name,
        ...exercise.repRanges[rangeName]
      });
    }
  }

  // Sort by exercise name, then by rep range
  prs.sort((a, b) => {
    if (a.exercise_name !== b.exercise_name) {
      return a.exercise_name.localeCompare(b.exercise_name);
    }
    return REP_RANGE_ORDER[a.rep_range] - REP_RANGE_ORDER[b.rep_range];
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
      w.duration_seconds,
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

  // Format volume by muscle (keep as object for frontend compatibility)
  const volumeByMuscleFormatted = {};
  for (const [muscle, volume] of Object.entries(volumeByMuscle)) {
    volumeByMuscleFormatted[muscle] = parseFloat(volume.toFixed(2));
  }

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

  // Calculate sets by muscle group (same attribution as volume)
  const setsByMuscle = {};

  for (const row of workouts) {
    if (row.is_warmup) continue;

    // Add to primary muscles (1.0 set)
    if (row.primary_muscles && Array.isArray(row.primary_muscles)) {
      for (const muscle of row.primary_muscles) {
        if (!setsByMuscle[muscle]) setsByMuscle[muscle] = 0;
        setsByMuscle[muscle] += 1;
      }
    }

    // Add to secondary muscles (0.5 set)
    if (row.secondary_muscles && Array.isArray(row.secondary_muscles)) {
      for (const muscle of row.secondary_muscles) {
        if (!setsByMuscle[muscle]) setsByMuscle[muscle] = 0;
        setsByMuscle[muscle] += 0.5;
      }
    }
  }

  // Format sets by muscle
  const setsByMuscleFormatted = {};
  for (const [muscle, sets] of Object.entries(setsByMuscle)) {
    setsByMuscleFormatted[muscle] = parseFloat(sets.toFixed(1));
  }

  // Count unique workouts
  const totalWorkouts = new Set(workouts.map(w => w.workout_id)).size;

  // Calculate total sets (count non-warmup sets)
  const totalSets = workouts.filter(row => !row.is_warmup).length;

  // Calculate average duration
  const workoutIds = [...new Set(workouts.map(w => w.workout_id))];
  const totalDuration = workouts
    .filter((row, idx, arr) =>
      arr.findIndex(r => r.workout_id === row.workout_id) === idx
    )
    .reduce((sum, row) => sum + (row.duration_seconds || 0), 0);
  const avgDurationMinutes = workoutIds.length > 0
    ? Math.round(totalDuration / workoutIds.length / 60)
    : null;

  return {
    week: {
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0]
    },
    total_volume: parseFloat(totalVolume.toFixed(2)),
    total_workouts: totalWorkouts,
    total_sets: totalSets,
    avg_duration_minutes: avgDurationMinutes,
    volume_by_muscle: volumeByMuscleFormatted,
    sets_by_muscle: setsByMuscleFormatted,
    frequency_heatmap: frequencyHeatmap
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

  // Query aggregated data by date (one entry per date)
  const progressData = await sql`
    SELECT
      DATE(w.completed_at) as date,
      MAX(s.weight) as max_weight,
      SUM(s.weight * s.reps) as total_volume,
      MAX(ROUND(s.weight / (1.0278 - 0.0278 * s.reps), 2)) as estimated_1rm
    FROM "set" s
    INNER JOIN workout_exercise we ON s.workout_exercise_id = we.id
    INNER JOIN workout w ON we.workout_id = w.id
    WHERE we.exercise_id = ${exerciseId}
    AND w.user_id = ${userId}
    AND s.is_warmup = false
    AND s.is_completed = true
    AND s.weight IS NOT NULL
    AND s.reps IS NOT NULL
    GROUP BY DATE(w.completed_at)
    ORDER BY DATE(w.completed_at) ASC
  `;

  // Transform the results to snake_case
  const formattedData = progressData.map(row => ({
    date: row.date,
    max_weight: parseFloat(row.max_weight),
    total_volume: parseFloat(row.total_volume),
    estimated_1rm: row.estimated_1rm ? parseFloat(row.estimated_1rm) : null
  }));

  return {
    exercise_id: exercise.id,
    exercise_name: exercise.name,
    progress: formattedData,
    total_entries: formattedData.length
  };
}
