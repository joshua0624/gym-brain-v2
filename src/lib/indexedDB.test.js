import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  openDB,
  getFromStore,
  getAllFromStore,
  addToStore,
  putInStore,
  deleteFromStore,
  clearStore,
  getByIndex,
  workoutDB,
  draftDB,
  exerciseDB,
  syncQueueDB,
} from './indexedDB';

// Clear all stores between tests instead of deleting DB (avoids connection blocking)
beforeEach(async () => {
  try {
    await clearStore('workouts');
    await clearStore('drafts');
    await clearStore('exercises');
    await clearStore('syncQueue');
  } catch {
    // First run - stores don't exist yet, that's fine
  }
});

describe('openDB', () => {
  it('opens database and creates all stores', async () => {
    const db = await openDB();
    expect(db.name).toBe('gymbrainDB');
    expect(db.version).toBe(1);
    expect(db.objectStoreNames.contains('workouts')).toBe(true);
    expect(db.objectStoreNames.contains('drafts')).toBe(true);
    expect(db.objectStoreNames.contains('exercises')).toBe(true);
    expect(db.objectStoreNames.contains('syncQueue')).toBe(true);
  });

  it('creates workout store with correct indexes', async () => {
    const db = await openDB();
    const tx = db.transaction('workouts', 'readonly');
    const store = tx.objectStore('workouts');
    expect(store.indexNames.contains('user_id')).toBe(true);
    expect(store.indexNames.contains('sync_status')).toBe(true);
    expect(store.indexNames.contains('started_at')).toBe(true);
  });

  it('creates syncQueue store with auto-increment', async () => {
    const db = await openDB();
    const tx = db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    expect(store.autoIncrement).toBe(true);
  });
});

describe('Generic CRUD operations', () => {
  it('putInStore and getFromStore roundtrip', async () => {
    const data = { id: 'w1', name: 'Push Day', sync_status: 'synced' };
    await putInStore('workouts', data);
    const result = await getFromStore('workouts', 'w1');
    expect(result).toEqual(data);
  });

  it('getAllFromStore returns all items', async () => {
    await putInStore('workouts', { id: 'w1', name: 'Push Day' });
    await putInStore('workouts', { id: 'w2', name: 'Pull Day' });
    const all = await getAllFromStore('workouts');
    expect(all).toHaveLength(2);
  });

  it('deleteFromStore removes item', async () => {
    await putInStore('workouts', { id: 'w1', name: 'Push Day' });
    await deleteFromStore('workouts', 'w1');
    const result = await getFromStore('workouts', 'w1');
    expect(result).toBeUndefined();
  });

  it('clearStore removes all items', async () => {
    await putInStore('workouts', { id: 'w1', name: 'Push' });
    await putInStore('workouts', { id: 'w2', name: 'Pull' });
    await clearStore('workouts');
    const all = await getAllFromStore('workouts');
    expect(all).toHaveLength(0);
  });

  it('putInStore updates existing item', async () => {
    await putInStore('workouts', { id: 'w1', name: 'Push Day' });
    await putInStore('workouts', { id: 'w1', name: 'Push Day V2' });
    const result = await getFromStore('workouts', 'w1');
    expect(result.name).toBe('Push Day V2');
  });

  it('getFromStore returns undefined for non-existent key', async () => {
    const result = await getFromStore('workouts', 'nonexistent');
    expect(result).toBeUndefined();
  });
});

describe('getByIndex', () => {
  it('finds items by sync_status index', async () => {
    await putInStore('workouts', { id: 'w1', sync_status: 'synced' });
    await putInStore('workouts', { id: 'w2', sync_status: 'local' });
    await putInStore('workouts', { id: 'w3', sync_status: 'synced' });

    const synced = await getByIndex('workouts', 'sync_status', 'synced');
    expect(synced).toHaveLength(2);

    const local = await getByIndex('workouts', 'sync_status', 'local');
    expect(local).toHaveLength(1);
  });
});

describe('syncQueueDB', () => {
  it('add returns auto-incremented ID', async () => {
    const id1 = await syncQueueDB.add({ operation: 'CREATE', payload: {}, timestamp: '2026-01-01' });
    const id2 = await syncQueueDB.add({ operation: 'UPDATE', payload: {}, timestamp: '2026-01-02' });
    expect(id1).toBeDefined();
    expect(id2).toBeGreaterThan(id1);
  });

  it('getAll returns all queue items', async () => {
    await syncQueueDB.add({ operation: 'CREATE', payload: {} });
    await syncQueueDB.add({ operation: 'UPDATE', payload: {} });
    const all = await syncQueueDB.getAll();
    expect(all).toHaveLength(2);
  });

  it('delete removes queue item', async () => {
    const id = await syncQueueDB.add({ operation: 'CREATE', payload: {} });
    await syncQueueDB.delete(id);
    const all = await syncQueueDB.getAll();
    expect(all).toHaveLength(0);
  });

  it('update merges fields into existing item', async () => {
    const id = await syncQueueDB.add({ operation: 'CREATE', payload: {}, retry_count: 0 });
    await syncQueueDB.update(id, { retry_count: 1, last_error: 'timeout' });
    const item = await getFromStore('syncQueue', id);
    expect(item.retry_count).toBe(1);
    expect(item.last_error).toBe('timeout');
    expect(item.operation).toBe('CREATE');
  });

  it('clear removes all items', async () => {
    await syncQueueDB.add({ operation: 'A', payload: {} });
    await syncQueueDB.add({ operation: 'B', payload: {} });
    await syncQueueDB.clear();
    const all = await syncQueueDB.getAll();
    expect(all).toHaveLength(0);
  });
});

describe('workoutDB', () => {
  it('save and get workout', async () => {
    await workoutDB.save({ id: 'w1', name: 'Leg Day', sync_status: 'local' });
    const result = await workoutDB.get('w1');
    expect(result.name).toBe('Leg Day');
  });

  it('getByStatus filters correctly', async () => {
    await workoutDB.save({ id: 'w1', sync_status: 'synced' });
    await workoutDB.save({ id: 'w2', sync_status: 'failed' });
    await workoutDB.save({ id: 'w3', sync_status: 'synced' });

    const failed = await workoutDB.getByStatus('failed');
    expect(failed).toHaveLength(1);
    expect(failed[0].id).toBe('w2');
  });

  it('delete removes workout', async () => {
    await workoutDB.save({ id: 'w1', name: 'Test' });
    await workoutDB.delete('w1');
    const result = await workoutDB.get('w1');
    expect(result).toBeUndefined();
  });
});

describe('draftDB', () => {
  it('CRUD operations work', async () => {
    await draftDB.save({ id: 'd1', name: 'Draft' });
    const draft = await draftDB.get('d1');
    expect(draft.name).toBe('Draft');

    await draftDB.delete('d1');
    expect(await draftDB.get('d1')).toBeUndefined();
  });

  it('clear removes all drafts', async () => {
    await draftDB.save({ id: 'd1' });
    await draftDB.save({ id: 'd2' });
    await draftDB.clear();
    const all = await draftDB.getAll();
    expect(all).toHaveLength(0);
  });
});

describe('exerciseDB', () => {
  it('saveAll stores multiple exercises', async () => {
    const exercises = [
      { id: 'e1', name: 'Bench Press', type: 'weighted' },
      { id: 'e2', name: 'Squat', type: 'weighted' },
    ];
    await exerciseDB.saveAll(exercises);
    const all = await exerciseDB.getAll();
    expect(all).toHaveLength(2);
  });

  it('clear removes all exercises', async () => {
    await exerciseDB.save({ id: 'e1', name: 'Test' });
    await exerciseDB.clear();
    const all = await exerciseDB.getAll();
    expect(all).toHaveLength(0);
  });
});
