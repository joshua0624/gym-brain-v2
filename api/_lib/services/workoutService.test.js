import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('../db.js', () => {
  const mockSql = vi.fn();
  mockSql.mockImplementation(() => []);
  return { sql: mockSql };
});

vi.mock('../calculations/volumeCalculator.js', () => ({
  calculateWorkoutVolume: vi.fn().mockResolvedValue(0),
}));

import { getWorkouts, getWorkoutById, updateWorkout, deleteWorkout } from './workoutService.js';
import { sql } from '../db.js';

describe('Ownership / Authorization Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWorkouts', () => {
    it('only returns workouts for the given userId', async () => {
      sql.mockResolvedValueOnce([{ total: '0' }]); // count query
      sql.mockResolvedValueOnce([]); // workouts query

      await getWorkouts('user-A');

      // Verify the SQL was called with user-A's ID (parameterized)
      expect(sql).toHaveBeenCalledTimes(2);
    });

    it('validates pagination limit bounds (1-100)', async () => {
      await expect(getWorkouts('user-A', { limit: 0 })).rejects.toThrow('Limit must be between');
      await expect(getWorkouts('user-A', { limit: 101 })).rejects.toThrow('Limit must be between');
    });

    it('validates offset is non-negative', async () => {
      await expect(getWorkouts('user-A', { offset: -1 })).rejects.toThrow('Offset must be non-negative');
    });
  });

  describe('getWorkoutById', () => {
    it('throws "Workout not found" when workout does not exist', async () => {
      sql.mockResolvedValueOnce([]);

      await expect(getWorkoutById('nonexistent', 'user-A')).rejects.toThrow('Workout not found');
    });

    it('throws "Unauthorized" when workout belongs to different user', async () => {
      sql.mockResolvedValueOnce([{
        id: 'workout-1',
        name: 'Test',
        user_id: 'user-B',
        exercises: [],
      }]);

      await expect(getWorkoutById('workout-1', 'user-A')).rejects.toThrow('Unauthorized');
    });

    it('returns workout when user owns it', async () => {
      sql.mockResolvedValueOnce([{
        id: 'workout-1',
        name: 'Test',
        user_id: 'user-A',
        started_at: '2024-01-01T00:00:00Z',
        completed_at: '2024-01-01T01:00:00Z',
        duration_seconds: 3600,
        total_volume: '1000',
        notes: null,
        template_id: null,
        exercises: [],
      }]);

      const result = await getWorkoutById('workout-1', 'user-A');
      expect(result).not.toBeNull();
      expect(result.id).toBe('workout-1');
    });
  });

  describe('updateWorkout', () => {
    it('throws "Workout not found" when workout does not exist', async () => {
      sql.mockResolvedValueOnce([]);

      await expect(updateWorkout('nonexistent', { name: 'Test' }, 'user-A')).rejects.toThrow('Workout not found');
    });

    it('throws "Unauthorized" when trying to update another users workout', async () => {
      sql.mockResolvedValueOnce([{ id: 'workout-1', user_id: 'user-B', started_at: '2024-01-01' }]);

      await expect(updateWorkout('workout-1', { name: 'Hacked' }, 'user-A')).rejects.toThrow('Unauthorized');
    });
  });

  describe('deleteWorkout', () => {
    it('throws "Workout not found" when workout does not exist', async () => {
      sql.mockResolvedValueOnce([]);

      await expect(deleteWorkout('nonexistent', 'user-A')).rejects.toThrow('Workout not found');
    });

    it('throws "Unauthorized" when trying to delete another users workout', async () => {
      sql.mockResolvedValueOnce([{ id: 'workout-1', user_id: 'user-B' }]);

      await expect(deleteWorkout('workout-1', 'user-A')).rejects.toThrow('Unauthorized');
    });
  });
});
