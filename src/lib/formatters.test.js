import { describe, it, expect } from 'vitest';
import {
  roundToHalf,
  formatWeight,
  formatWeightValue,
  formatReps,
  formatRIR,
  formatSet,
  formatDuration,
  formatVolume,
  calculateVolume,
  calculateEstimated1RM,
  formatEstimated1RM,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatTime,
  formatWorkoutName,
  formatExerciseCount,
  formatSetCount,
  formatMuscleGroups,
  formatEquipment,
  formatExerciseType,
  formatRestTimer,
  parseWeight,
  parseReps,
  parseRIR,
  isValidEmail,
  isValidUsername,
  isValidPassword,
  formatError,
  generateUUID,
  formatPRAchievement,
} from './formatters';

// ──── Weight Functions ────

describe('roundToHalf', () => {
  it('rounds 2.3 to 2.5', () => expect(roundToHalf(2.3)).toBe(2.5));
  it('rounds 2.7 to 2.5', () => expect(roundToHalf(2.7)).toBe(2.5));
  it('keeps 3.0 as 3.0', () => expect(roundToHalf(3.0)).toBe(3.0));
  it('rounds 2.25 to 2.5', () => expect(roundToHalf(2.25)).toBe(2.5));
  it('rounds 2.24 to 2.0', () => expect(roundToHalf(2.24)).toBe(2.0));
  it('handles 0', () => expect(roundToHalf(0)).toBe(0));
  it('rounds 225.3 to 225.5', () => expect(roundToHalf(225.3)).toBe(225.5));
});

describe('formatWeight', () => {
  it('formats weight with rounding', () => expect(formatWeight(225.3)).toBe('225.5 lbs'));
  it('returns dash for null', () => expect(formatWeight(null)).toBe('-'));
  it('returns dash for undefined', () => expect(formatWeight(undefined)).toBe('-'));
  it('formats zero weight', () => expect(formatWeight(0)).toBe('0 lbs'));
});

describe('formatWeightValue', () => {
  it('formats for input fields', () => expect(formatWeightValue(225.3)).toBe('225.5'));
  it('returns empty for null', () => expect(formatWeightValue(null)).toBe(''));
  it('returns empty for undefined', () => expect(formatWeightValue(undefined)).toBe(''));
});

describe('parseWeight', () => {
  it('parses valid weight', () => expect(parseWeight('225')).toBe(225));
  it('rounds to 0.5', () => expect(parseWeight('225.3')).toBe(225.5));
  it('returns null for non-numeric', () => expect(parseWeight('abc')).toBeNull());
  it('returns null for negative', () => expect(parseWeight('-5')).toBeNull());
  it('returns null for over 1500', () => expect(parseWeight('1501')).toBeNull());
  it('accepts max weight 1500', () => expect(parseWeight('1500')).toBe(1500));
  it('accepts 0', () => expect(parseWeight('0')).toBe(0));
  it('handles decimal input', () => expect(parseWeight('132.5')).toBe(132.5));
});

// ──── Reps/RIR Functions ────

describe('formatReps', () => {
  it('formats reps', () => expect(formatReps(5)).toBe('5'));
  it('returns dash for null', () => expect(formatReps(null)).toBe('-'));
  it('returns dash for undefined', () => expect(formatReps(undefined)).toBe('-'));
});

describe('formatRIR', () => {
  it('formats RIR', () => expect(formatRIR(2)).toBe('RIR 2'));
  it('returns dash for null', () => expect(formatRIR(null)).toBe('-'));
  it('formats 0 RIR', () => expect(formatRIR(0)).toBe('RIR 0'));
});

describe('parseReps', () => {
  it('parses valid reps', () => expect(parseReps('5')).toBe(5));
  it('returns null for 0', () => expect(parseReps('0')).toBeNull());
  it('returns null for over 100', () => expect(parseReps('101')).toBeNull());
  it('accepts max 100', () => expect(parseReps('100')).toBe(100));
  it('returns null for non-numeric', () => expect(parseReps('abc')).toBeNull());
  it('returns null for negative', () => expect(parseReps('-1')).toBeNull());
  it('truncates decimal', () => expect(parseReps('5.7')).toBe(5));
});

describe('parseRIR', () => {
  it('parses valid RIR', () => expect(parseRIR('2')).toBe(2));
  it('accepts 0', () => expect(parseRIR('0')).toBe(0));
  it('accepts max 10', () => expect(parseRIR('10')).toBe(10));
  it('returns null for over 10', () => expect(parseRIR('11')).toBeNull());
  it('returns null for negative', () => expect(parseRIR('-1')).toBeNull());
  it('returns null for non-numeric', () => expect(parseRIR('abc')).toBeNull());
});

// ──── Set/Volume Functions ────

describe('formatSet', () => {
  it('formats weight x reps', () => {
    expect(formatSet(225, 5)).toBe('225 lbs × 5');
  });

  it('includes RIR when provided', () => {
    expect(formatSet(225, 5, 2)).toBe('225 lbs × 5 @ 2');
  });

  it('excludes RIR when null', () => {
    expect(formatSet(225, 5, null)).toBe('225 lbs × 5');
  });
});

describe('formatVolume', () => {
  it('formats with commas', () => expect(formatVolume(12500)).toBe('12,500 lbs'));
  it('returns dash for null', () => expect(formatVolume(null)).toBe('-'));
  it('returns dash for 0', () => expect(formatVolume(0)).toBe('-'));
  it('rounds to integer', () => expect(formatVolume(12500.7)).toBe('12,501 lbs'));
});

describe('calculateVolume', () => {
  it('calculates total volume excluding warmups', () => {
    const exercises = [{
      sets: [
        { weight: 225, reps: 5, is_warmup: false },
        { weight: 135, reps: 10, is_warmup: true },
        { weight: 225, reps: 5, is_warmup: false },
      ],
    }];
    expect(calculateVolume(exercises)).toBe(2250);
  });

  it('returns 0 for empty exercises', () => {
    expect(calculateVolume([])).toBe(0);
  });

  it('returns 0 for null input', () => {
    expect(calculateVolume(null)).toBe(0);
  });

  it('handles exercises without sets', () => {
    expect(calculateVolume([{ sets: null }])).toBe(0);
  });

  it('handles null weight/reps in sets', () => {
    const exercises = [{
      sets: [{ weight: null, reps: 5, is_warmup: false }],
    }];
    expect(calculateVolume(exercises)).toBe(0);
  });
});

// ──── 1RM Calculation ────

describe('calculateEstimated1RM (frontend)', () => {
  it('calculates for valid inputs', () => {
    const result = calculateEstimated1RM(225, 5);
    expect(result).toBeGreaterThan(225);
    expect(result).toBeCloseTo(253, 0);
  });

  it('returns null for reps > 10', () => {
    expect(calculateEstimated1RM(225, 11)).toBeNull();
  });

  it('returns null for reps < 1', () => {
    expect(calculateEstimated1RM(225, 0)).toBeNull();
  });

  it('returns null for null weight', () => {
    expect(calculateEstimated1RM(null, 5)).toBeNull();
  });

  it('rounds to nearest 0.5', () => {
    const result = calculateEstimated1RM(225, 5);
    expect(result % 0.5).toBe(0);
  });
});

describe('formatEstimated1RM', () => {
  it('formats valid 1RM', () => {
    const formatted = formatEstimated1RM(225, 5);
    expect(formatted).toContain('lbs');
    expect(formatted).not.toBe('-');
  });

  it('returns dash for invalid inputs', () => {
    expect(formatEstimated1RM(null, 5)).toBe('-');
  });
});

// ──── Duration/Time Functions ────

describe('formatDuration', () => {
  it('formats 0 seconds', () => expect(formatDuration(0)).toBe('0m'));
  it('formats seconds only', () => expect(formatDuration(45)).toBe('45s'));
  it('formats minutes only', () => expect(formatDuration(60)).toBe('1m'));
  it('formats minutes and seconds', () => expect(formatDuration(90)).toBe('1m 30s'));
  it('formats hours and minutes', () => expect(formatDuration(3660)).toBe('1h 1m'));
  it('formats hours only', () => expect(formatDuration(3600)).toBe('1h'));
  it('formats 1h 1m for 3661', () => expect(formatDuration(3661)).toBe('1h 1m'));
  it('returns 0m for negative', () => expect(formatDuration(-5)).toBe('0m'));
  it('returns 0m for null', () => expect(formatDuration(null)).toBe('0m'));
});

describe('formatRestTimer', () => {
  it('formats 90 seconds as 1:30', () => expect(formatRestTimer(90)).toBe('1:30'));
  it('formats 5 seconds as 0:05', () => expect(formatRestTimer(5)).toBe('0:05'));
  it('formats 0 as 0:00', () => expect(formatRestTimer(0)).toBe('0:00'));
  it('formats 300 as 5:00', () => expect(formatRestTimer(300)).toBe('5:00'));
  it('formats 60 as 1:00', () => expect(formatRestTimer(60)).toBe('1:00'));
});

// ──── Date Functions ────

describe('formatDate', () => {
  it('formats ISO string', () => {
    const result = formatDate('2026-01-17T00:00:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('17');
    expect(result).toContain('2026');
  });

  it('formats Date object', () => {
    const result = formatDate(new Date('2026-01-17'));
    expect(result).toContain('Jan');
  });

  it('returns dash for null', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('returns dash for undefined', () => {
    expect(formatDate(undefined)).toBe('-');
  });
});

describe('formatDateTime', () => {
  it('includes time', () => {
    const result = formatDateTime('2026-01-17T14:30:00Z');
    expect(result).toContain('at');
  });

  it('returns dash for null', () => {
    expect(formatDateTime(null)).toBe('-');
  });
});

describe('formatTime', () => {
  it('formats time portion', () => {
    const result = formatTime('2026-01-17T14:30:00Z');
    expect(result).not.toBe('-');
  });

  it('returns dash for null', () => {
    expect(formatTime(null)).toBe('-');
  });
});

describe('formatRelativeTime', () => {
  it('returns relative string', () => {
    const recent = new Date(Date.now() - 60 * 1000).toISOString();
    const result = formatRelativeTime(recent);
    expect(result).toContain('ago');
  });

  it('returns dash for null', () => {
    expect(formatRelativeTime(null)).toBe('-');
  });
});

// ──── Misc Formatters ────

describe('formatWorkoutName', () => {
  it('returns name if present', () => {
    expect(formatWorkoutName({ name: 'Push Day' })).toBe('Push Day');
  });

  it('falls back to date when no name', () => {
    const result = formatWorkoutName({ started_at: '2026-01-17T00:00:00Z' });
    expect(result).toContain('Workout');
  });

  it('returns Unnamed Workout as last resort', () => {
    expect(formatWorkoutName({})).toBe('Unnamed Workout');
  });
});

describe('formatExerciseCount', () => {
  it('pluralizes correctly', () => {
    expect(formatExerciseCount(1)).toBe('1 exercise');
    expect(formatExerciseCount(3)).toBe('3 exercises');
  });
});

describe('formatSetCount', () => {
  it('pluralizes correctly', () => {
    expect(formatSetCount(1)).toBe('1 set');
    expect(formatSetCount(5)).toBe('5 sets');
  });
});

describe('formatMuscleGroups', () => {
  it('capitalizes and joins', () => {
    expect(formatMuscleGroups(['chest', 'triceps'])).toBe('Chest, Triceps');
  });

  it('returns dash for empty', () => {
    expect(formatMuscleGroups([])).toBe('-');
    expect(formatMuscleGroups(null)).toBe('-');
  });
});

describe('formatEquipment', () => {
  it('maps known equipment', () => {
    expect(formatEquipment('barbell')).toBe('Barbell');
    expect(formatEquipment('dumbbell')).toBe('Dumbbell');
    expect(formatEquipment('cable')).toBe('Cable');
    expect(formatEquipment('machine')).toBe('Machine');
    expect(formatEquipment('bodyweight')).toBe('Bodyweight');
  });

  it('returns dash for null', () => {
    expect(formatEquipment(null)).toBe('-');
  });

  it('returns raw value for unknown type', () => {
    expect(formatEquipment('kettlebell')).toBe('kettlebell');
  });
});

describe('formatExerciseType', () => {
  it('maps known types', () => {
    expect(formatExerciseType('weighted')).toBe('Weighted');
    expect(formatExerciseType('bodyweight')).toBe('Bodyweight');
    expect(formatExerciseType('cardio')).toBe('Cardio');
    expect(formatExerciseType('timed')).toBe('Timed');
  });

  it('returns dash for null', () => {
    expect(formatExerciseType(null)).toBe('-');
  });
});

// ──── Validation ────

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('name.last@domain.co')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('not-email')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidUsername', () => {
  it('accepts valid usernames', () => {
    expect(isValidUsername('john_doe')).toBe(true);
    expect(isValidUsername('abc')).toBe(true);
    expect(isValidUsername('a'.repeat(30))).toBe(true);
  });

  it('rejects invalid usernames', () => {
    expect(isValidUsername('ab')).toBe(false);
    expect(isValidUsername('a'.repeat(31))).toBe(false);
    expect(isValidUsername('user@name')).toBe(false);
    expect(isValidUsername('')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('accepts 8+ chars', () => {
    expect(isValidPassword('password123')).toBe(true);
    expect(isValidPassword('12345678')).toBe(true);
  });

  it('rejects short passwords', () => {
    expect(isValidPassword('1234567')).toBeFalsy();
    expect(isValidPassword('')).toBeFalsy();
    expect(isValidPassword(null)).toBeFalsy();
  });
});

// ──── Error/UUID ────

describe('formatError', () => {
  it('returns string errors directly', () => {
    expect(formatError('Something failed')).toBe('Something failed');
  });

  it('extracts axios error message', () => {
    const axiosError = { response: { data: { error: 'Bad Request' } } };
    expect(formatError(axiosError)).toBe('Bad Request');
  });

  it('extracts generic error message', () => {
    expect(formatError(new Error('Test error'))).toBe('Test error');
  });

  it('returns fallback for unknown types', () => {
    expect(formatError({})).toBe('An unexpected error occurred');
    expect(formatError(42)).toBe('An unexpected error occurred');
  });
});

describe('generateUUID', () => {
  it('returns a string', () => {
    expect(typeof generateUUID()).toBe('string');
  });

  it('returns different values each time', () => {
    const a = generateUUID();
    const b = generateUUID();
    expect(a).not.toBe(b);
  });
});

describe('formatPRAchievement', () => {
  it('formats PR message', () => {
    const result = formatPRAchievement('Bench Press', 225, 5, '5RM');
    expect(result).toContain('5RM');
    expect(result).toContain('Bench Press');
    expect(result).toContain('225');
    expect(result).toContain('PR');
  });
});
