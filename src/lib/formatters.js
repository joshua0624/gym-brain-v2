/**
 * Data Formatting Utilities
 *
 * CLIENT-SIDE ONLY - Formatting and display helpers
 */

import { format, formatDistance, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Round weight to nearest 0.5 (per spec - weights displayed rounded to 0.5)
 */
export const roundToHalf = (num) => {
  return Math.round(num * 2) / 2;
};

/**
 * Format weight for display (rounds to 0.5)
 */
export const formatWeight = (weight) => {
  if (weight === null || weight === undefined) return '-';
  return `${roundToHalf(weight)} lbs`;
};

/**
 * Format weight without unit (for input fields)
 */
export const formatWeightValue = (weight) => {
  if (weight === null || weight === undefined) return '';
  return roundToHalf(weight).toString();
};

/**
 * Format reps for display
 */
export const formatReps = (reps) => {
  if (reps === null || reps === undefined) return '-';
  return reps.toString();
};

/**
 * Format RIR (Reps in Reserve) for display
 */
export const formatRIR = (rir) => {
  if (rir === null || rir === undefined) return '-';
  return `RIR ${rir}`;
};

/**
 * Format set summary (weight x reps)
 */
export const formatSet = (weight, reps, rir = null) => {
  const weightStr = formatWeightValue(weight);
  const repsStr = formatReps(reps);
  const rirStr = rir !== null && rir !== undefined ? ` @ ${rir}` : '';
  return `${weightStr} lbs × ${repsStr}${rirStr}`;
};

/**
 * Format duration in seconds to readable format (e.g., "1h 23m")
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0m';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  return `${secs}s`;
};

/**
 * Format volume (weight × reps total)
 */
export const formatVolume = (volume) => {
  if (volume === null || volume === undefined || volume === 0) return '-';

  // Format large numbers with commas
  return `${Math.round(volume).toLocaleString()} lbs`;
};

/**
 * Calculate total volume from exercises array
 * Volume = sum of (weight × reps) for all non-warmup sets
 */
export const calculateVolume = (exercises) => {
  if (!exercises || exercises.length === 0) return 0;

  return exercises.reduce((total, exercise) => {
    if (!exercise.sets) return total;

    const exerciseVolume = exercise.sets.reduce((exTotal, set) => {
      // Skip warm-up sets
      if (set.is_warmup) return exTotal;

      // Calculate set volume (weight × reps)
      const weight = set.weight || 0;
      const reps = set.reps || 0;
      return exTotal + (weight * reps);
    }, 0);

    return total + exerciseVolume;
  }, 0);
};

/**
 * Calculate and format estimated 1RM using Brzycki formula
 * Formula: weight / (1.0278 - 0.0278 × reps)
 */
export const calculateEstimated1RM = (weight, reps) => {
  if (!weight || !reps || reps < 1 || reps > 10) return null;

  const estimated1RM = weight / (1.0278 - 0.0278 * reps);
  return roundToHalf(estimated1RM);
};

/**
 * Format estimated 1RM for display
 */
export const formatEstimated1RM = (weight, reps) => {
  const e1RM = calculateEstimated1RM(weight, reps);
  return e1RM ? `${e1RM} lbs` : '-';
};

/**
 * Format date for display (e.g., "Jan 17, 2026")
 */
export const formatDate = (date) => {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM d, yyyy');
};

/**
 * Format date with time (e.g., "Jan 17, 2026 at 2:30 PM")
 */
export const formatDateTime = (date) => {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM d, yyyy \'at\' h:mm a');
};

/**
 * Format date as relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date) => {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
};

/**
 * Format time only (e.g., "2:30 PM")
 */
export const formatTime = (date) => {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'h:mm a');
};

/**
 * Format workout name with fallback
 */
export const formatWorkoutName = (workout) => {
  if (workout.name) return workout.name;

  // Fallback to date if no name
  const dateObj = workout.started_at || workout.completed_at;
  return dateObj ? `Workout - ${formatDate(dateObj)}` : 'Unnamed Workout';
};

/**
 * Format exercise count (e.g., "3 exercises" or "1 exercise")
 */
export const formatExerciseCount = (count) => {
  return `${count} ${count === 1 ? 'exercise' : 'exercises'}`;
};

/**
 * Format set count (e.g., "12 sets" or "1 set")
 */
export const formatSetCount = (count) => {
  return `${count} ${count === 1 ? 'set' : 'sets'}`;
};

/**
 * Format muscle groups as comma-separated list
 */
export const formatMuscleGroups = (muscles) => {
  if (!muscles || muscles.length === 0) return '-';

  return muscles
    .map(m => m.charAt(0).toUpperCase() + m.slice(1))
    .join(', ');
};

/**
 * Format equipment type for display
 */
export const formatEquipment = (equipment) => {
  if (!equipment) return '-';

  const equipmentMap = {
    barbell: 'Barbell',
    dumbbell: 'Dumbbell',
    cable: 'Cable',
    machine: 'Machine',
    bodyweight: 'Bodyweight',
    other: 'Other',
  };

  return equipmentMap[equipment] || equipment;
};

/**
 * Format exercise type for display
 */
export const formatExerciseType = (type) => {
  if (!type) return '-';

  const typeMap = {
    weighted: 'Weighted',
    bodyweight: 'Bodyweight',
    cardio: 'Cardio',
    timed: 'Timed',
  };

  return typeMap[type] || type;
};

/**
 * Format rest timer display (e.g., "1:23" or "0:05")
 */
export const formatRestTimer = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Parse weight input (handles decimal input, rounds to 0.5)
 */
export const parseWeight = (input) => {
  const num = parseFloat(input);
  if (isNaN(num)) return null;
  if (num < 0 || num > 1500) return null;
  return roundToHalf(num);
};

/**
 * Parse reps input (integer 1-100)
 */
export const parseReps = (input) => {
  const num = parseInt(input, 10);
  if (isNaN(num)) return null;
  if (num < 1 || num > 100) return null;
  return num;
};

/**
 * Parse RIR input (integer 0-10)
 */
export const parseRIR = (input) => {
  const num = parseInt(input, 10);
  if (isNaN(num)) return null;
  if (num < 0 || num > 10) return null;
  return num;
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate username (3-30 chars, alphanumeric + underscore)
 */
export const isValidUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
};

/**
 * Validate password (min 8 chars)
 */
export const isValidPassword = (password) => {
  return password && password.length >= 8;
};

/**
 * Format error message for display
 */
export const formatError = (error) => {
  if (typeof error === 'string') return error;
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.message) return error.message;
  return 'An unexpected error occurred';
};

/**
 * Generate UUID for offline records
 */
export const generateUUID = () => {
  return crypto.randomUUID();
};

/**
 * Format PR achievement message
 */
export const formatPRAchievement = (exercise, weight, reps, repRange) => {
  return `New ${repRange} PR on ${exercise}: ${formatSet(weight, reps)}!`;
};
