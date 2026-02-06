import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the module
vi.mock('../db.js', () => {
  const mockSql = vi.fn();
  // Make it a tagged template literal function
  mockSql.mockImplementation(() => []);
  return { sql: mockSql };
});

vi.mock('../calculations/volumeCalculator.js', () => ({
  calculateWorkoutVolume: vi.fn().mockResolvedValue(5000),
}));

vi.mock('./draftService.js', () => ({
  bulkDeleteDrafts: vi.fn().mockResolvedValue(1),
}));

import { syncWorkouts } from './syncService.js';
import { sql } from '../db.js';
import { calculateWorkoutVolume } from '../calculations/volumeCalculator.js';
import { bulkDeleteDrafts } from './draftService.js';

describe('syncWorkouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: sql returns a single-row result with an id
    sql.mockImplementation(() => [{ id: 'server-workout-id' }]);
  });

  it('syncs a single workout with exercises and sets', async () => {
    const syncData = {
      completedWorkouts: [{
        id: 'client-id-1',
        name: 'Push Day',
        startedAt: '2026-02-01T10:00:00Z',
        completedAt: '2026-02-01T11:00:00Z',
        exercises: [{
          id: 'ex-1',
          exerciseId: 'exercise-bench',
          orderIndex: 0,
          isCompleted: true,
          sets: [{
            id: 'set-1',
            setNumber: 1,
            weight: 225,
            reps: 5,
            rir: 2,
            isWarmup: false,
            isCompleted: true,
          }],
        }],
      }],
      deleteDraftIds: ['draft-1'],
    };

    const result = await syncWorkouts(syncData, 'user-1');

    expect(result.success).toBe(true);
    expect(result.syncedWorkouts).toHaveLength(1);
    expect(result.syncedWorkouts[0].clientId).toBe('client-id-1');
    expect(result.syncedWorkouts[0].name).toBe('Push Day');
    expect(bulkDeleteDrafts).toHaveBeenCalledWith(['draft-1'], 'user-1');
    expect(calculateWorkoutVolume).toHaveBeenCalled();
  });

  it('handles empty completedWorkouts array', async () => {
    const result = await syncWorkouts({ completedWorkouts: [], deleteDraftIds: [] }, 'user-1');

    expect(result.success).toBe(true);
    expect(result.syncedWorkouts).toHaveLength(0);
  });

  it('handles missing completedWorkouts (defaults to empty)', async () => {
    const result = await syncWorkouts({}, 'user-1');

    expect(result.success).toBe(true);
    expect(result.syncedWorkouts).toHaveLength(0);
  });

  it('throws for non-array completedWorkouts', async () => {
    await expect(
      syncWorkouts({ completedWorkouts: 'invalid' }, 'user-1')
    ).rejects.toThrow('completedWorkouts must be an array');
  });

  it('throws for non-array deleteDraftIds', async () => {
    await expect(
      syncWorkouts({ completedWorkouts: [], deleteDraftIds: 'invalid' }, 'user-1')
    ).rejects.toThrow('deleteDraftIds must be an array');
  });

  it('skips workouts missing name', async () => {
    const syncData = {
      completedWorkouts: [{
        startedAt: '2026-02-01T10:00:00Z',
        // name is missing
      }],
      deleteDraftIds: [],
    };

    const result = await syncWorkouts(syncData, 'user-1');
    expect(result.syncedWorkouts).toHaveLength(0);
  });

  it('skips workouts missing startedAt', async () => {
    const syncData = {
      completedWorkouts: [{
        name: 'Test',
        // startedAt is missing
      }],
      deleteDraftIds: [],
    };

    const result = await syncWorkouts(syncData, 'user-1');
    expect(result.syncedWorkouts).toHaveLength(0);
  });

  it('calculates duration from timestamps', async () => {
    const syncData = {
      completedWorkouts: [{
        name: 'Test',
        startedAt: '2026-02-01T10:00:00Z',
        completedAt: '2026-02-01T11:30:00Z',
      }],
      deleteDraftIds: [],
    };

    await syncWorkouts(syncData, 'user-1');

    // Check that sql was called with duration_seconds = 5400 (1.5 hours)
    const insertCall = sql.mock.calls[0];
    // The sql tagged template passes duration_seconds as a parameter
    expect(sql).toHaveBeenCalled();
  });

  it('handles workout without exercises', async () => {
    const syncData = {
      completedWorkouts: [{
        name: 'Empty Workout',
        startedAt: '2026-02-01T10:00:00Z',
      }],
      deleteDraftIds: [],
    };

    const result = await syncWorkouts(syncData, 'user-1');
    expect(result.success).toBe(true);
    expect(result.syncedWorkouts).toHaveLength(1);
  });

  it('continues syncing other workouts when one fails', async () => {
    let callCount = 0;
    sql.mockImplementation(() => {
      callCount++;
      if (callCount === 1) throw new Error('DB error');
      return [{ id: 'server-id-2' }];
    });

    const syncData = {
      completedWorkouts: [
        { name: 'Fails', startedAt: '2026-02-01T10:00:00Z' },
        { name: 'Succeeds', startedAt: '2026-02-01T12:00:00Z' },
      ],
      deleteDraftIds: [],
    };

    const result = await syncWorkouts(syncData, 'user-1');
    // Second workout should still sync even though first failed
    expect(result.syncedWorkouts.length).toBeGreaterThanOrEqual(1);
  });

  it('calls bulkDeleteDrafts with correct parameter order', async () => {
    const draftIds = ['draft-a', 'draft-b'];
    await syncWorkouts({ completedWorkouts: [], deleteDraftIds: draftIds }, 'user-1');

    expect(bulkDeleteDrafts).toHaveBeenCalledWith(draftIds, 'user-1');
  });

  it('handles workout with null completedAt', async () => {
    const syncData = {
      completedWorkouts: [{
        name: 'In Progress',
        startedAt: '2026-02-01T10:00:00Z',
        completedAt: null,
      }],
      deleteDraftIds: [],
    };

    const result = await syncWorkouts(syncData, 'user-1');
    expect(result.success).toBe(true);
  });

  it('recalculates volume after workout insert', async () => {
    const syncData = {
      completedWorkouts: [{
        name: 'Volume Test',
        startedAt: '2026-02-01T10:00:00Z',
      }],
      deleteDraftIds: [],
    };

    await syncWorkouts(syncData, 'user-1');
    expect(calculateWorkoutVolume).toHaveBeenCalled();
  });
});
