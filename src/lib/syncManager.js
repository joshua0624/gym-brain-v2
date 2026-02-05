/**
 * Sync Manager - Core reconciliation logic for offline operations
 *
 * CLIENT-SIDE ONLY - Handles sync queue processing, retry logic, and data reconciliation
 */

import { syncQueueDB, workoutDB, draftDB } from './indexedDB';
import { SYNC_CONFIG } from './constants';
import apiClient from './api';

/**
 * Process all items in the sync queue
 * Returns summary of sync results
 */
export const processSyncQueue = async () => {
  const queue = await syncQueueDB.getAll();

  if (!queue || queue.length === 0) {
    console.log('[SyncManager] Queue is empty');
    return { success: 0, failed: 0, errors: [] };
  }

  console.log(`[SyncManager] Processing ${queue.length} items`);

  // Sort by timestamp (FIFO)
  const sortedQueue = queue.sort((a, b) =>
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  let successCount = 0;
  let failedCount = 0;
  const errors = [];

  for (const item of sortedQueue) {
    console.log(`[SyncManager] Processing item ${item.id}: ${item.operation} for workout ${item.payload.id}`);

    // Skip items that have exceeded max retries
    if (item.retry_count >= SYNC_CONFIG.maxRetries) {
      console.warn(`[SyncManager] Item ${item.id} exceeded max retries`);
      await handlePermanentFailure(item);
      failedCount++;
      errors.push({
        operation: item.operation,
        error: 'Max retries exceeded',
      });
      continue;
    }

    try {
      await processQueueItem(item);
      console.log(`[SyncManager] Item ${item.id} synced successfully`);
      successCount++;

      // Throttle between requests to prevent pool exhaustion
      await new Promise(resolve => setTimeout(resolve, SYNC_CONFIG.throttleMs));
    } catch (error) {
      console.error(`[SyncManager] Item ${item.id} failed:`, error.message);
      const isTransient = isTransientError(error);

      if (isTransient) {
        // Retry later - update retry metadata
        console.log(`[SyncManager] Transient error - will retry (attempt ${item.retry_count + 1}/${SYNC_CONFIG.maxRetries})`);
        await syncQueueDB.update(item.id, {
          retry_count: item.retry_count + 1,
          last_error: error.message,
          last_retry_at: new Date().toISOString(),
        });
      } else {
        // Permanent failure - mark and remove from queue
        console.error(`[SyncManager] Permanent error - marking as failed`);
        await handlePermanentFailure(item, error);
        failedCount++;
      }

      errors.push({
        operation: item.operation,
        error: error.message,
        isTransient,
      });
    }
  }

  console.log(`[SyncManager] Sync complete: ${successCount} success, ${failedCount} failed`);
  return { success: successCount, failed: failedCount, errors };
};

/**
 * Process a single queue item based on operation type
 */
const processQueueItem = async (item) => {
  switch (item.operation) {
    case 'CREATE_WORKOUT':
      await syncCreateWorkout(item);
      break;
    case 'UPDATE_WORKOUT':
      await syncUpdateWorkout(item);
      break;
    case 'DELETE_WORKOUT':
      await syncDeleteWorkout(item);
      break;
    case 'SYNC_WORKOUTS':
      await syncWorkoutsOperation(item);
      break;
    default:
      throw new Error(`Unknown operation: ${item.operation}`);
  }

  // Remove from queue on success
  await syncQueueDB.delete(item.id);
};

/**
 * Sync workout creation to server
 */
const syncCreateWorkout = async (item) => {
  const { payload } = item;

  try {
    // Attempt to create on server (direct API call, no queuing!)
    const response = await apiClient.post('/workouts', payload);

    // Extract workout from response (server returns { workout: {...} })
    const serverWorkout = response.data.workout || response.data;

    console.log('[SyncManager] Server returned workout:', serverWorkout.id);

    // CRITICAL: Reconcile IndexedDB with server response
    await workoutDB.save({
      ...serverWorkout,
      sync_status: 'synced',
    });

    // Atomic draft deletion (prevents zombie drafts)
    if (payload.draft_id) {
      await draftDB.delete(payload.draft_id);
      console.log('[SyncManager] Deleted draft:', payload.draft_id);
    }
  } catch (error) {
    // Handle 409 Conflict (server has newer version)
    if (error.response?.status === 409) {
      const serverVersion = error.response.data.server_version;

      // Auto-accept server version
      await workoutDB.save({
        ...serverVersion,
        sync_status: 'synced',
      });

      // CRITICAL: Delete draft even on conflict
      if (payload.draft_id) {
        await draftDB.delete(payload.draft_id);
      }

      // Don't re-throw - conflict resolved successfully
      return;
    }

    throw error;
  }
};

/**
 * Sync workout update to server
 */
const syncUpdateWorkout = async (item) => {
  const { payload } = item;

  try {
    // Direct API call, no queuing!
    const response = await apiClient.put(`/workouts/${payload.id}`, payload);

    // Extract workout from response
    const serverWorkout = response.data.workout || response.data;

    // Reconcile IndexedDB with server response
    await workoutDB.save({
      ...serverWorkout,
      sync_status: 'synced',
    });
  } catch (error) {
    // Handle 409 Conflict
    if (error.response?.status === 409) {
      const serverVersion = error.response.data.server_version;

      // Auto-accept server version
      await workoutDB.save({
        ...serverVersion,
        sync_status: 'synced',
      });

      return;
    }

    // Handle 404 (workout deleted on server)
    if (error.response?.status === 404) {
      // Delete from local IndexedDB
      await workoutDB.delete(payload.id);
      return;
    }

    throw error;
  }
};

/**
 * Sync workout deletion to server
 */
const syncDeleteWorkout = async (item) => {
  const { payload } = item;

  try {
    // Direct API call, no queuing!
    await apiClient.delete(`/workouts/${payload.id}`);

    // Ensure deleted from IndexedDB
    await workoutDB.delete(payload.id);
  } catch (error) {
    // 404 is acceptable - workout already gone
    if (error.response?.status === 404) {
      await workoutDB.delete(payload.id);
      return;
    }

    throw error;
  }
};

/**
 * Sync completed workouts using the sync endpoint
 */
const syncWorkoutsOperation = async (item) => {
  const { payload } = item;
  const { completedWorkouts, deleteDraftIds } = payload;

  try {
    console.log('[SyncManager] Syncing workouts via /workouts/sync');

    // Call sync endpoint
    const response = await apiClient.post('/workouts/sync', payload);

    console.log('[SyncManager] Sync response:', response.data);

    // Update each workout in IndexedDB
    for (const workout of completedWorkouts) {
      const syncedWorkout = response.data.syncedWorkouts?.find(
        sw => sw.clientId === workout.id
      );

      if (syncedWorkout) {
        // Fetch full workout data
        const fullWorkout = await apiClient.get(`/workouts/${syncedWorkout.serverId}`);

        await workoutDB.save({
          ...fullWorkout.data.workout,
          sync_status: 'synced',
        });

        console.log('[SyncManager] Updated workout:', syncedWorkout.serverId);
      }
    }

    // Delete drafts
    if (deleteDraftIds) {
      for (const draftId of deleteDraftIds) {
        await draftDB.delete(draftId);
        console.log('[SyncManager] Deleted draft:', draftId);
      }
    }
  } catch (error) {
    console.error('[SyncManager] Sync workouts failed:', error);
    throw error;
  }
};

/**
 * Determine if error is transient (should retry) or permanent
 */
const isTransientError = (error) => {
  // Network offline
  if (!navigator.onLine) {
    return true;
  }

  // 5xx server errors (transient)
  if (error.response?.status >= 500) {
    return true;
  }

  // Connection timeout/abort
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // Network error with no response
  if (!error.response) {
    return true;
  }

  // 4xx errors are permanent (validation, auth, not found)
  return false;
};

/**
 * Handle permanent sync failure
 */
const handlePermanentFailure = async (item, error = null) => {
  const { payload } = item;

  // Mark in IndexedDB as failed
  if (item.operation.includes('WORKOUT')) {
    const existingWorkout = await workoutDB.get(payload.id);
    if (existingWorkout) {
      await workoutDB.save({
        ...existingWorkout,
        sync_status: 'failed',
        sync_error: error?.message || 'Max retries exceeded',
      });
    }
  }

  // Remove from sync queue
  await syncQueueDB.delete(item.id);
};

/**
 * Queue an operation for sync
 * Returns the queue item ID
 */
export const queueOperation = async (operation, payload) => {
  const queueItemId = await syncQueueDB.add({
    operation,
    payload: {
      ...payload,
      updated_at: new Date().toISOString(), // Client timestamp for conflict resolution
    },
    timestamp: new Date().toISOString(),
    retry_count: 0,
    last_error: null,
    last_retry_at: null,
  });

  console.log(`[SyncManager] Queued ${operation} (ID: ${queueItemId})`);
  return queueItemId;
};

/**
 * Get count of pending sync operations
 */
export const getPendingSyncCount = async () => {
  const queue = await syncQueueDB.getAll();
  const count = queue ? queue.length : 0;
  if (count > 0) {
    console.log(`[SyncManager] ${count} items in queue:`, queue.map(q => ({ id: q.id, operation: q.operation, workoutId: q.payload.id })));
  }
  return count;
};

/**
 * Remove a specific queue item by ID
 */
export const removeQueueItem = async (queueItemId) => {
  console.log(`[SyncManager] Removing queue item ${queueItemId}`);
  await syncQueueDB.delete(queueItemId);
};

/**
 * Clear all failed operations from IndexedDB
 */
export const clearFailedOperations = async () => {
  const failedWorkouts = await workoutDB.getByStatus('failed');

  for (const workout of failedWorkouts) {
    await workoutDB.delete(workout.id);
  }

  return failedWorkouts.length;
};

/**
 * Manually retry a failed operation
 */
export const retryFailedOperation = async (workoutId) => {
  const workout = await workoutDB.get(workoutId);

  if (!workout || workout.sync_status !== 'failed') {
    throw new Error('Workout not found or not in failed state');
  }

  // Reset sync status and queue for retry
  await workoutDB.save({
    ...workout,
    sync_status: 'local',
    sync_error: null,
  });

  await queueOperation('UPDATE_WORKOUT', workout);

  // Attempt immediate sync if online
  if (navigator.onLine) {
    await processSyncQueue();
  }
};

/**
 * Generate UUID for client-side IDs
 */
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
