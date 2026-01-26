/**
 * useDraftAutoSave Hook
 *
 * Auto-saves workout draft every 30s (when online)
 * Saves to IndexedDB immediately and syncs to server when online
 */

import { useEffect, useRef, useCallback } from 'react';
import { workoutAPI } from '../lib/api';
import { useIndexedDB } from './useIndexedDB';
import { useNetworkStatus } from './useNetworkStatus';
import { DRAFT_CONFIG } from '../lib/constants';
import { generateUUID } from '../lib/formatters';

export const useDraftAutoSave = (workoutData, enabled = true) => {
  const { isOnline } = useNetworkStatus();
  const { drafts } = useIndexedDB();
  const intervalRef = useRef(null);
  const lastSaveRef = useRef(null);

  /**
   * Save draft to IndexedDB and sync to server
   */
  const saveDraft = useCallback(async () => {
    if (!workoutData || !enabled) return;

    try {
      // Prepare draft data
      const draftId = workoutData.id || generateUUID();
      const draft = {
        id: draftId,
        user_id: workoutData.user_id,
        data: workoutData,
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + DRAFT_CONFIG.expiryHours * 60 * 60 * 1000).toISOString(),
      };

      // Always save to IndexedDB first (works offline)
      await drafts.save(draft);
      lastSaveRef.current = Date.now();

      // If online, sync to server
      if (isOnline) {
        try {
          await workoutAPI.saveDraft({
            data: workoutData,
          });
        } catch (serverError) {
          // Server save failed but local save succeeded
          console.error('Failed to sync draft to server:', serverError);
          // Draft is still saved locally, will sync when connection restored
        }
      }

      return { success: true, draftId };
    } catch (error) {
      console.error('Failed to save draft:', error);
      return { success: false, error: error.message };
    }
  }, [workoutData, enabled, isOnline, drafts]);

  /**
   * Delete draft from both IndexedDB and server
   */
  const deleteDraft = useCallback(async (draftId) => {
    try {
      // Delete from IndexedDB
      if (draftId) {
        await drafts.delete(draftId);
      }

      // Delete from server if online
      if (isOnline) {
        try {
          await workoutAPI.deleteDraft();
        } catch (serverError) {
          console.error('Failed to delete draft from server:', serverError);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete draft:', error);
      return { success: false, error: error.message };
    }
  }, [isOnline, drafts]);

  /**
   * Load draft from server or IndexedDB
   */
  const loadDraft = useCallback(async () => {
    try {
      // Try server first if online
      if (isOnline) {
        try {
          const serverDraft = await workoutAPI.getDraft();
          if (serverDraft && serverDraft.data) {
            // Save to IndexedDB for offline access
            await drafts.save({
              id: serverDraft.id,
              user_id: serverDraft.user_id,
              data: serverDraft.data,
              updated_at: serverDraft.updated_at,
              expires_at: serverDraft.expires_at,
            });
            return serverDraft.data;
          }
        } catch (serverError) {
          console.error('Failed to load draft from server:', serverError);
          // Fall through to IndexedDB
        }
      }

      // Load from IndexedDB
      const localDrafts = await drafts.getAll();
      if (localDrafts && localDrafts.length > 0) {
        // Get most recent draft
        const sortedDrafts = localDrafts.sort(
          (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
        );
        const recentDraft = sortedDrafts[0];

        // Check if expired
        if (recentDraft.expires_at && new Date(recentDraft.expires_at) < new Date()) {
          await drafts.delete(recentDraft.id);
          return null;
        }

        return recentDraft.data;
      }

      return null;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  }, [isOnline, drafts]);

  /**
   * Set up auto-save interval
   */
  useEffect(() => {
    if (!enabled || !workoutData) {
      // Clear interval if disabled or no data
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Set up auto-save interval (30 seconds)
    intervalRef.current = setInterval(() => {
      saveDraft();
    }, DRAFT_CONFIG.autoSaveIntervalMs);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, workoutData, saveDraft]);

  /**
   * Save immediately when coming back online
   */
  useEffect(() => {
    if (isOnline && enabled && workoutData && lastSaveRef.current) {
      // Check if we have unsaved changes (last save was more than 5 seconds ago)
      const timeSinceLastSave = Date.now() - lastSaveRef.current;
      if (timeSinceLastSave > 5000) {
        saveDraft();
      }
    }
  }, [isOnline, enabled, workoutData, saveDraft]);

  return {
    saveDraft,
    deleteDraft,
    loadDraft,
    lastSaved: lastSaveRef.current,
  };
};

export default useDraftAutoSave;
