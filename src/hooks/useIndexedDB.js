/**
 * useIndexedDB Hook
 *
 * Provides IndexedDB operations with React state management
 */

import { useState, useCallback } from 'react';
import { workoutDB, draftDB, exerciseDB, syncQueueDB } from '../lib/indexedDB';

export const useIndexedDB = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Workouts operations
   */
  const workouts = {
    getAll: useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await workoutDB.getAll();
        return data;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    get: useCallback(async (id) => {
      setLoading(true);
      setError(null);
      try {
        const data = await workoutDB.get(id);
        return data;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    save: useCallback(async (workout) => {
      setLoading(true);
      setError(null);
      try {
        await workoutDB.save(workout);
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    delete: useCallback(async (id) => {
      setLoading(true);
      setError(null);
      try {
        await workoutDB.delete(id);
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    getByStatus: useCallback(async (status) => {
      setLoading(true);
      setError(null);
      try {
        const data = await workoutDB.getByStatus(status);
        return data;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),
  };

  /**
   * Drafts operations
   */
  const drafts = {
    getAll: useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await draftDB.getAll();
        return data;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    get: useCallback(async (id) => {
      setLoading(true);
      setError(null);
      try {
        const data = await draftDB.get(id);
        return data;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    save: useCallback(async (draft) => {
      setLoading(true);
      setError(null);
      try {
        await draftDB.save(draft);
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    delete: useCallback(async (id) => {
      setLoading(true);
      setError(null);
      try {
        await draftDB.delete(id);
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    clear: useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        await draftDB.clear();
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),
  };

  /**
   * Exercises cache operations
   */
  const exercises = {
    getAll: useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await exerciseDB.getAll();
        return data;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    save: useCallback(async (exercise) => {
      setLoading(true);
      setError(null);
      try {
        await exerciseDB.save(exercise);
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    saveAll: useCallback(async (exerciseList) => {
      setLoading(true);
      setError(null);
      try {
        await exerciseDB.saveAll(exerciseList);
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    clear: useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        await exerciseDB.clear();
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),
  };

  /**
   * Sync queue operations
   */
  const syncQueue = {
    getAll: useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await syncQueueDB.getAll();
        return data;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    add: useCallback(async (operation) => {
      setLoading(true);
      setError(null);
      try {
        await syncQueueDB.add(operation);
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    delete: useCallback(async (id) => {
      setLoading(true);
      setError(null);
      try {
        await syncQueueDB.delete(id);
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    update: useCallback(async (id, updates) => {
      setLoading(true);
      setError(null);
      try {
        await syncQueueDB.update(id, updates);
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),

    clear: useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        await syncQueueDB.clear();
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []),
  };

  return {
    loading,
    error,
    workouts,
    drafts,
    exercises,
    syncQueue,
  };
};

export default useIndexedDB;
