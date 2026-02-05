/**
 * useSyncManager Hook - Background sync orchestration
 *
 * CLIENT-SIDE ONLY - Handles automatic syncing and status tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { processSyncQueue, getPendingSyncCount } from '../lib/syncManager';
import { SYNC_CONFIG } from '../lib/constants';

export const useSyncManager = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const intervalRef = useRef(null);
  const isSyncingRef = useRef(false);

  /**
   * Update pending count from IndexedDB
   */
  const updatePendingCount = useCallback(async () => {
    const count = await getPendingSyncCount();
    setPendingCount(count);
  }, []);

  /**
   * Perform sync operation
   */
  const sync = useCallback(async () => {
    // Prevent concurrent syncs
    if (isSyncingRef.current) {
      return;
    }

    // Skip if offline
    if (!navigator.onLine) {
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const result = await processSyncQueue();
      setLastSyncResult(result);

      // Update pending count after sync
      await updatePendingCount();

      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      setLastSyncResult({
        success: 0,
        failed: 1,
        errors: [{ error: error.message }],
      });
      throw error;
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [updatePendingCount]);

  /**
   * Handle online/offline events
   */
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Immediate sync when connection restored
      sync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sync]);

  /**
   * Background polling (30-second interval when app open + online)
   */
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Only poll when online
    if (!isOnline) {
      return;
    }

    // Initial sync
    sync();

    // Set up polling
    intervalRef.current = setInterval(() => {
      if (isOnline && !isSyncingRef.current) {
        sync();
      }
    }, SYNC_CONFIG.intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOnline, sync]);

  /**
   * Update pending count on mount and when syncing changes
   */
  useEffect(() => {
    updatePendingCount();
  }, [isSyncing, updatePendingCount]);

  return {
    pendingCount,
    isSyncing,
    lastSyncResult,
    isOnline,
    sync,
    updatePendingCount,
  };
};
