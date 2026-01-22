import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/middleware/auth.js';

/**
 * GET /api/stats/weekly
 *
 * Get weekly workout statistics including volume by muscle group and frequency heatmap
 *
 * Query params:
 * - week: Monday date of the week in YYYY-MM-DD format (optional, defaults to current week)
 *
 * Response:
 * {
 *   "week": {
 *     "start": "2026-01-13",
 *     "end": "2026-01-19"
 *   },
 *   "totalVolume": 45000.0,
 *   "totalWorkouts": 4,
 *   "volumeByMuscle": [
 *     {
 *       "muscle": "Chest",
 *       "volume": 12500.0,
 *       "percentage": 27.8
 *     },
 *     {
 *       "muscle": "Back",
 *       "volume": 10000.0,
 *       "percentage": 22.2
 *     }
 *   ],
 *   "frequencyHeatmap": [
 *     {
 *       "date": "2026-01-13",
 *       "muscles": ["Chest", "Triceps", "Shoulders"],
 *       "workoutCount": 1
 *     },
 *     {
 *       "date": "2026-01-15",
 *       "muscles": ["Back", "Biceps"],
 *       "workoutCount": 1
 *     }
 *   ]
 * }
 */
export default requireAuth(async (req, res) => {
  const userId = req.user.userId;
  let { week } = req.query;

  try {
    // Parse the week date or use current week's Monday
    let weekStart;
    if (week) {
      weekStart = new Date(week);
      // Validate date format
      if (isNaN(weekStart.getTime())) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
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

        // Add half volume to secondary muscles (optional - can be adjusted)
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

    return res.status(200).json({
      week: {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0]
      },
      totalVolume: parseFloat(totalVolume.toFixed(2)),
      totalWorkouts,
      volumeByMuscle: volumeByMuscleArray,
      frequencyHeatmap
    });

  } catch (error) {
    console.error('Error fetching weekly stats:', error);
    return res.status(500).json({
      error: 'Failed to fetch weekly stats',
      message: error.message
    });
  }
});
