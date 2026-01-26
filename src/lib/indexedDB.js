/**
 * IndexedDB Setup and Operations
 *
 * CLIENT-SIDE ONLY - Offline storage for workouts, drafts, and sync queue
 */

import { STORAGE_CONFIG } from './constants';

const { dbName, version, stores } = STORAGE_CONFIG;

/**
 * Open IndexedDB connection
 */
export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create workouts store
      if (!db.objectStoreNames.contains(stores.workouts)) {
        const workoutStore = db.createObjectStore(stores.workouts, { keyPath: 'id' });
        workoutStore.createIndex('user_id', 'user_id', { unique: false });
        workoutStore.createIndex('sync_status', 'sync_status', { unique: false });
        workoutStore.createIndex('started_at', 'started_at', { unique: false });
      }

      // Create drafts store
      if (!db.objectStoreNames.contains(stores.drafts)) {
        const draftStore = db.createObjectStore(stores.drafts, { keyPath: 'id' });
        draftStore.createIndex('user_id', 'user_id', { unique: false });
        draftStore.createIndex('updated_at', 'updated_at', { unique: false });
      }

      // Create exercises store (cache)
      if (!db.objectStoreNames.contains(stores.exercises)) {
        const exerciseStore = db.createObjectStore(stores.exercises, { keyPath: 'id' });
        exerciseStore.createIndex('name', 'name', { unique: false });
        exerciseStore.createIndex('type', 'type', { unique: false });
        exerciseStore.createIndex('primary_muscles', 'primary_muscles', { unique: false, multiEntry: true });
      }

      // Create sync queue store
      if (!db.objectStoreNames.contains(stores.syncQueue)) {
        const syncStore = db.createObjectStore(stores.syncQueue, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('retry_count', 'retry_count', { unique: false });
      }
    };
  });
};

/**
 * Generic get operation
 */
export const getFromStore = async (storeName, key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Generic get all operation
 */
export const getAllFromStore = async (storeName) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Generic add operation
 */
export const addToStore = async (storeName, data) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(data);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Generic put operation (add or update)
 */
export const putInStore = async (storeName, data) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Generic delete operation
 */
export const deleteFromStore = async (storeName, key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Generic clear operation
 */
export const clearStore = async (storeName) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get items by index
 */
export const getByIndex = async (storeName, indexName, value) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Workout-specific operations
 */
export const workoutDB = {
  getAll: () => getAllFromStore(stores.workouts),
  get: (id) => getFromStore(stores.workouts, id),
  save: (workout) => putInStore(stores.workouts, workout),
  delete: (id) => deleteFromStore(stores.workouts, id),
  getByStatus: (status) => getByIndex(stores.workouts, 'sync_status', status),
};

/**
 * Draft-specific operations
 */
export const draftDB = {
  getAll: () => getAllFromStore(stores.drafts),
  get: (id) => getFromStore(stores.drafts, id),
  save: (draft) => putInStore(stores.drafts, draft),
  delete: (id) => deleteFromStore(stores.drafts, id),
  clear: () => clearStore(stores.drafts),
};

/**
 * Exercise cache operations
 */
export const exerciseDB = {
  getAll: () => getAllFromStore(stores.exercises),
  get: (id) => getFromStore(stores.exercises, id),
  save: (exercise) => putInStore(stores.exercises, exercise),
  saveAll: async (exercises) => {
    const db = await openDB();
    const transaction = db.transaction(stores.exercises, 'readwrite');
    const store = transaction.objectStore(stores.exercises);

    exercises.forEach(exercise => store.put(exercise));

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },
  clear: () => clearStore(stores.exercises),
};

/**
 * Sync queue operations
 */
export const syncQueueDB = {
  getAll: () => getAllFromStore(stores.syncQueue),
  add: (operation) => addToStore(stores.syncQueue, operation),
  delete: (id) => deleteFromStore(stores.syncQueue, id),
  clear: () => clearStore(stores.syncQueue),
  update: async (id, updates) => {
    const item = await getFromStore(stores.syncQueue, id);
    if (item) {
      return putInStore(stores.syncQueue, { ...item, ...updates });
    }
  },
};
