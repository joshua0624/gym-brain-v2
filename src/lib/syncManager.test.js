import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('./indexedDB', () => ({
  syncQueueDB: {
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(1),
    delete: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
  },
  workoutDB: {
    get: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    getByStatus: vi.fn().mockResolvedValue([]),
  },
  draftDB: {
    delete: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('./api', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: { workout: { id: 'server-1' } } }),
    put: vi.fn().mockResolvedValue({ data: { workout: { id: 'server-1' } } }),
    delete: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({ data: { workout: { id: 'server-1' } } }),
  },
}));

vi.mock('./constants', () => ({
  SYNC_CONFIG: {
    maxRetries: 5,
    throttleMs: 0, // No throttle in tests
    pollIntervalMs: 30000,
  },
}));

import {
  processSyncQueue,
  queueOperation,
  getPendingSyncCount,
  removeQueueItem,
  clearFailedOperations,
  retryFailedOperation,
} from './syncManager';
import { syncQueueDB, workoutDB, draftDB } from './indexedDB';
import apiClient from './api';

beforeEach(() => {
  vi.clearAllMocks();
  // Default empty queue
  syncQueueDB.getAll.mockResolvedValue([]);
});

describe('processSyncQueue', () => {
  it('returns zeros for empty queue', async () => {
    const result = await processSyncQueue();
    expect(result).toEqual({ success: 0, failed: 0, errors: [] });
  });

  it('processes items in FIFO order by timestamp', async () => {
    const processOrder = [];

    syncQueueDB.getAll.mockResolvedValue([
      { id: 2, operation: 'CREATE_WORKOUT', payload: { id: 'w2' }, timestamp: '2026-02-02', retry_count: 0 },
      { id: 1, operation: 'CREATE_WORKOUT', payload: { id: 'w1' }, timestamp: '2026-02-01', retry_count: 0 },
    ]);

    apiClient.post.mockImplementation((url, payload) => {
      processOrder.push(payload?.id || payload?.payload?.id);
      return Promise.resolve({ data: { workout: { id: 'server-1' } } });
    });

    await processSyncQueue();

    // Should process w1 before w2 (earlier timestamp)
    expect(syncQueueDB.delete).toHaveBeenCalledTimes(2);
  });

  it('skips items exceeding max retries', async () => {
    syncQueueDB.getAll.mockResolvedValue([
      { id: 1, operation: 'CREATE_WORKOUT', payload: { id: 'w1' }, timestamp: '2026-02-01', retry_count: 5 },
    ]);

    const result = await processSyncQueue();
    expect(result.failed).toBe(1);
    expect(result.errors[0].error).toBe('Max retries exceeded');
  });

  it('increments retry_count for transient errors', async () => {
    syncQueueDB.getAll.mockResolvedValue([
      { id: 1, operation: 'CREATE_WORKOUT', payload: { id: 'w1' }, timestamp: '2026-02-01', retry_count: 0 },
    ]);

    apiClient.post.mockRejectedValue({ response: { status: 500 }, message: 'Server error' });

    await processSyncQueue();

    expect(syncQueueDB.update).toHaveBeenCalledWith(1, expect.objectContaining({
      retry_count: 1,
      last_error: 'Server error',
    }));
  });

  it('removes permanent errors from queue', async () => {
    syncQueueDB.getAll.mockResolvedValue([
      { id: 1, operation: 'CREATE_WORKOUT', payload: { id: 'w1' }, timestamp: '2026-02-01', retry_count: 0 },
    ]);

    workoutDB.get.mockResolvedValue({ id: 'w1', sync_status: 'local' });
    apiClient.post.mockRejectedValue({ response: { status: 400, data: {} }, message: 'Bad request' });

    const result = await processSyncQueue();
    expect(result.failed).toBe(1);
    // Permanent failure handler removes from queue
    expect(syncQueueDB.delete).toHaveBeenCalledWith(1);
  });

  it('handles CREATE_WORKOUT success - saves to workoutDB as synced', async () => {
    syncQueueDB.getAll.mockResolvedValue([
      { id: 1, operation: 'CREATE_WORKOUT', payload: { id: 'w1' }, timestamp: '2026-02-01', retry_count: 0 },
    ]);

    apiClient.post.mockResolvedValue({
      data: { workout: { id: 'server-1', name: 'Push Day' } },
    });

    await processSyncQueue();

    expect(workoutDB.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'server-1',
      sync_status: 'synced',
    }));
    expect(syncQueueDB.delete).toHaveBeenCalledWith(1);
  });

  it('handles 409 conflict - accepts server version', async () => {
    syncQueueDB.getAll.mockResolvedValue([
      { id: 1, operation: 'CREATE_WORKOUT', payload: { id: 'w1' }, timestamp: '2026-02-01', retry_count: 0 },
    ]);

    apiClient.post.mockRejectedValue({
      response: { status: 409, data: { server_version: { id: 'server-1', name: 'Server Version' } } },
    });

    await processSyncQueue();

    expect(workoutDB.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'server-1',
      sync_status: 'synced',
    }));
  });

  it('handles DELETE_WORKOUT - 404 is acceptable', async () => {
    syncQueueDB.getAll.mockResolvedValue([
      { id: 1, operation: 'DELETE_WORKOUT', payload: { id: 'w1' }, timestamp: '2026-02-01', retry_count: 0 },
    ]);

    apiClient.delete.mockRejectedValue({ response: { status: 404 } });

    const result = await processSyncQueue();

    // 404 on delete is acceptable - workout already gone
    expect(workoutDB.delete).toHaveBeenCalledWith('w1');
    expect(syncQueueDB.delete).toHaveBeenCalledWith(1);
  });

  it('handles unknown operation type', async () => {
    syncQueueDB.getAll.mockResolvedValue([
      { id: 1, operation: 'UNKNOWN_OP', payload: { id: 'x' }, timestamp: '2026-02-01', retry_count: 0 },
    ]);

    const result = await processSyncQueue();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('deletes draft after successful CREATE_WORKOUT sync', async () => {
    syncQueueDB.getAll.mockResolvedValue([
      { id: 1, operation: 'CREATE_WORKOUT', payload: { id: 'w1', draft_id: 'draft-1' }, timestamp: '2026-02-01', retry_count: 0 },
    ]);

    apiClient.post.mockResolvedValue({
      data: { workout: { id: 'server-1' } },
    });

    await processSyncQueue();

    expect(draftDB.delete).toHaveBeenCalledWith('draft-1');
  });
});

describe('queueOperation', () => {
  it('creates queue item with correct shape', async () => {
    const id = await queueOperation('CREATE_WORKOUT', { id: 'w1', name: 'Push Day' });

    expect(syncQueueDB.add).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'CREATE_WORKOUT',
      retry_count: 0,
      last_error: null,
      last_retry_at: null,
    }));
    expect(syncQueueDB.add).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        id: 'w1',
        name: 'Push Day',
        updated_at: expect.any(String),
      }),
    }));
  });

  it('returns queue item ID', async () => {
    syncQueueDB.add.mockResolvedValue(42);
    const id = await queueOperation('UPDATE_WORKOUT', { id: 'w1' });
    expect(id).toBe(42);
  });
});

describe('getPendingSyncCount', () => {
  it('returns count of queue items', async () => {
    syncQueueDB.getAll.mockResolvedValue([
      { id: 1, operation: 'CREATE', payload: { id: 'w1' } },
      { id: 2, operation: 'UPDATE', payload: { id: 'w2' } },
      { id: 3, operation: 'DELETE', payload: { id: 'w3' } },
    ]);
    const count = await getPendingSyncCount();
    expect(count).toBe(3);
  });

  it('returns 0 for empty queue', async () => {
    syncQueueDB.getAll.mockResolvedValue([]);
    const count = await getPendingSyncCount();
    expect(count).toBe(0);
  });

  it('returns 0 for null queue', async () => {
    syncQueueDB.getAll.mockResolvedValue(null);
    const count = await getPendingSyncCount();
    expect(count).toBe(0);
  });
});

describe('removeQueueItem', () => {
  it('deletes item by ID', async () => {
    await removeQueueItem(42);
    expect(syncQueueDB.delete).toHaveBeenCalledWith(42);
  });
});

describe('clearFailedOperations', () => {
  it('deletes all failed workouts from IndexedDB', async () => {
    workoutDB.getByStatus.mockResolvedValue([
      { id: 'w1', sync_status: 'failed' },
      { id: 'w2', sync_status: 'failed' },
    ]);

    const count = await clearFailedOperations();
    expect(count).toBe(2);
    expect(workoutDB.delete).toHaveBeenCalledTimes(2);
  });

  it('returns 0 when no failed operations', async () => {
    workoutDB.getByStatus.mockResolvedValue([]);
    const count = await clearFailedOperations();
    expect(count).toBe(0);
  });
});

describe('retryFailedOperation', () => {
  it('resets sync status and re-queues', async () => {
    workoutDB.get.mockResolvedValue({
      id: 'w1',
      name: 'Failed Workout',
      sync_status: 'failed',
      sync_error: 'timeout',
    });

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

    await retryFailedOperation('w1');

    expect(workoutDB.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'w1',
      sync_status: 'local',
      sync_error: null,
    }));
    expect(syncQueueDB.add).toHaveBeenCalled();
  });

  it('throws for non-existent workout', async () => {
    workoutDB.get.mockResolvedValue(null);
    await expect(retryFailedOperation('nonexistent')).rejects.toThrow('not found');
  });

  it('throws for workout not in failed state', async () => {
    workoutDB.get.mockResolvedValue({ id: 'w1', sync_status: 'synced' });
    await expect(retryFailedOperation('w1')).rejects.toThrow('not in failed state');
  });
});
