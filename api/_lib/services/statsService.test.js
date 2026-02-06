import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('../db.js', () => {
  const mockSql = vi.fn();
  mockSql.mockImplementation(() => []);
  return { sql: mockSql };
});

import { getPRs, getWeeklyStats, getExerciseProgress } from './statsService.js';
import { sql } from '../db.js';

describe('Stats Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPRs', () => {
    it('returns empty prs for user with no data', async () => {
      sql.mockResolvedValueOnce([]);

      const result = await getPRs('user-A');
      expect(result.prs).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('groups PRs by exercise and rep range', async () => {
      sql.mockResolvedValueOnce([
        {
          exercise_id: 'ex1',
          exercise_name: 'Bench Press',
          workout_id: 'w1',
          workout_name: 'Push Day',
          date: '2024-06-01',
          weight: '225',
          reps: 5,
          rir: 2,
          estimated_1rm: '253.16',
        },
        {
          exercise_id: 'ex1',
          exercise_name: 'Bench Press',
          workout_id: 'w2',
          workout_name: 'Push Day 2',
          date: '2024-06-08',
          weight: '200',
          reps: 10,
          rir: 1,
          estimated_1rm: '266.67',
        },
      ]);

      const result = await getPRs('user-A');
      expect(result.prs.length).toBe(2);
      // Both should be for Bench Press but different rep ranges
      expect(result.prs.every(pr => pr.exercise_name === 'Bench Press')).toBe(true);
    });

    it('filters by exerciseId when provided', async () => {
      sql.mockResolvedValueOnce([]);

      await getPRs('user-A', 'exercise-123');

      // The first sql call should be the exerciseId-filtered query
      expect(sql).toHaveBeenCalledTimes(1);
    });

    it('picks heavier weight as PR for same rep range', async () => {
      sql.mockResolvedValueOnce([
        {
          exercise_id: 'ex1',
          exercise_name: 'Squat',
          workout_id: 'w1',
          workout_name: 'Leg Day',
          date: '2024-06-01',
          weight: '315',
          reps: 1,
          rir: 0,
          estimated_1rm: '315',
        },
        {
          exercise_id: 'ex1',
          exercise_name: 'Squat',
          workout_id: 'w2',
          workout_name: 'Leg Day 2',
          date: '2024-06-08',
          weight: '300',
          reps: 1,
          rir: 0,
          estimated_1rm: '300',
        },
      ]);

      const result = await getPRs('user-A');
      expect(result.prs.length).toBe(1);
      expect(result.prs[0].max_weight).toBe(315);
    });

    it('sorts PRs by exercise name then rep range', async () => {
      sql.mockResolvedValueOnce([
        {
          exercise_id: 'ex2',
          exercise_name: 'Squat',
          workout_id: 'w1',
          workout_name: 'Leg Day',
          date: '2024-06-01',
          weight: '315',
          reps: 1,
          rir: 0,
          estimated_1rm: '315',
        },
        {
          exercise_id: 'ex1',
          exercise_name: 'Bench Press',
          workout_id: 'w1',
          workout_name: 'Push Day',
          date: '2024-06-01',
          weight: '225',
          reps: 1,
          rir: 0,
          estimated_1rm: '225',
        },
      ]);

      const result = await getPRs('user-A');
      expect(result.prs[0].exercise_name).toBe('Bench Press');
      expect(result.prs[1].exercise_name).toBe('Squat');
    });

    it('handles null estimated_1rm gracefully', async () => {
      sql.mockResolvedValueOnce([
        {
          exercise_id: 'ex1',
          exercise_name: 'Bench Press',
          workout_id: 'w1',
          workout_name: 'Push Day',
          date: '2024-06-01',
          weight: '225',
          reps: 1,
          rir: 0,
          estimated_1rm: null,
        },
      ]);

      const result = await getPRs('user-A');
      expect(result.prs[0].estimated_1rm).toBeNull();
    });
  });

  describe('getWeeklyStats', () => {
    it('returns empty stats for a week with no workouts', async () => {
      sql.mockResolvedValueOnce([]);

      const result = await getWeeklyStats('user-A', '2024-06-03');
      expect(result.total_workouts).toBe(0);
      expect(result.total_volume).toBe(0);
      expect(result.total_sets).toBe(0);
      expect(result.avg_duration_minutes).toBeNull();
      expect(result.frequency_heatmap).toHaveLength(7);
    });

    it('throws on invalid date format', async () => {
      await expect(getWeeklyStats('user-A', 'not-a-date')).rejects.toThrow('Invalid date format');
    });

    it('calculates volume correctly for weighted exercises', async () => {
      sql.mockResolvedValueOnce([
        {
          workout_id: 'w1',
          workout_name: 'Push Day',
          completed_at: '2024-06-03T10:00:00Z',
          duration_seconds: 3600,
          workout_date: '2024-06-03',
          exercise_id: 'ex1',
          exercise_name: 'Bench Press',
          primary_muscles: ['chest'],
          secondary_muscles: ['triceps'],
          exercise_type: 'weighted',
          weight: '225',
          reps: 10,
          is_warmup: false,
        },
      ]);

      const result = await getWeeklyStats('user-A', '2024-06-03');
      expect(result.total_volume).toBe(2250);
      expect(result.volume_by_muscle.chest).toBe(2250);
      // Secondary muscles get 50% attribution
      expect(result.volume_by_muscle.triceps).toBe(1125);
    });

    it('excludes warmup sets from volume calculation', async () => {
      sql.mockResolvedValueOnce([
        {
          workout_id: 'w1',
          workout_name: 'Push Day',
          completed_at: '2024-06-03T10:00:00Z',
          duration_seconds: 3600,
          workout_date: '2024-06-03',
          exercise_id: 'ex1',
          exercise_name: 'Bench Press',
          primary_muscles: ['chest'],
          secondary_muscles: [],
          exercise_type: 'weighted',
          weight: '135',
          reps: 10,
          is_warmup: true,
        },
      ]);

      const result = await getWeeklyStats('user-A', '2024-06-03');
      expect(result.total_volume).toBe(0);
    });

    it('uses 150 lbs estimate for bodyweight exercises', async () => {
      sql.mockResolvedValueOnce([
        {
          workout_id: 'w1',
          workout_name: 'Calisthenics',
          completed_at: '2024-06-03T10:00:00Z',
          duration_seconds: 1800,
          workout_date: '2024-06-03',
          exercise_id: 'ex1',
          exercise_name: 'Pull-ups',
          primary_muscles: ['lats'],
          secondary_muscles: ['biceps'],
          exercise_type: 'bodyweight',
          weight: null,
          reps: 10,
          is_warmup: false,
        },
      ]);

      const result = await getWeeklyStats('user-A', '2024-06-03');
      expect(result.total_volume).toBe(1500); // 150 * 10
    });

    it('builds frequency heatmap for all 7 days', async () => {
      sql.mockResolvedValueOnce([]);

      const result = await getWeeklyStats('user-A', '2024-06-03');
      expect(result.frequency_heatmap).toHaveLength(7);
      result.frequency_heatmap.forEach(day => {
        expect(day).toHaveProperty('date');
        expect(day).toHaveProperty('muscles');
        expect(day).toHaveProperty('workoutCount');
      });
    });

    it('defaults to current week when no weekDate provided', async () => {
      sql.mockResolvedValueOnce([]);

      const result = await getWeeklyStats('user-A');
      expect(result.week).toHaveProperty('start');
      expect(result.week).toHaveProperty('end');
    });
  });

  describe('getExerciseProgress', () => {
    it('throws when exerciseId is missing', async () => {
      await expect(getExerciseProgress(null, 'user-A')).rejects.toThrow('Exercise ID is required');
      await expect(getExerciseProgress('', 'user-A')).rejects.toThrow('Exercise ID is required');
    });

    it('throws when exercise not found', async () => {
      sql.mockResolvedValueOnce([]); // exercise lookup

      await expect(getExerciseProgress('ex-999', 'user-A')).rejects.toThrow('Exercise not found');
    });

    it('returns progress data for valid exercise', async () => {
      // Exercise exists
      sql.mockResolvedValueOnce([{ id: 'ex1', name: 'Bench Press' }]);
      // Progress data
      sql.mockResolvedValueOnce([
        { date: '2024-06-01', max_weight: '225', total_volume: '4500', estimated_1rm: '253.16' },
        { date: '2024-06-08', max_weight: '230', total_volume: '4600', estimated_1rm: '258.78' },
      ]);

      const result = await getExerciseProgress('ex1', 'user-A');
      expect(result.exercise_id).toBe('ex1');
      expect(result.exercise_name).toBe('Bench Press');
      expect(result.progress).toHaveLength(2);
      expect(result.total_entries).toBe(2);
      expect(result.progress[0].max_weight).toBe(225);
    });

    it('returns empty progress for exercise with no workout data', async () => {
      sql.mockResolvedValueOnce([{ id: 'ex1', name: 'New Exercise' }]);
      sql.mockResolvedValueOnce([]);

      const result = await getExerciseProgress('ex1', 'user-A');
      expect(result.progress).toEqual([]);
      expect(result.total_entries).toBe(0);
    });

    it('handles null estimated_1rm in progress data', async () => {
      sql.mockResolvedValueOnce([{ id: 'ex1', name: 'Bench Press' }]);
      sql.mockResolvedValueOnce([
        { date: '2024-06-01', max_weight: '225', total_volume: '4500', estimated_1rm: null },
      ]);

      const result = await getExerciseProgress('ex1', 'user-A');
      expect(result.progress[0].estimated_1rm).toBeNull();
    });
  });
});
