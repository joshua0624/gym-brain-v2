import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('../db.js', () => {
  const mockSql = vi.fn();
  mockSql.mockImplementation(() => []);
  return { sql: mockSql };
});

vi.mock('../utils/queryBuilder.js', () => ({
  createWorkoutWithDraftDeletion: vi.fn(),
}));

import {
  getDraft,
  saveDraft,
  deleteDraft,
  bulkDeleteDrafts,
  deleteDraftById,
  cleanupExpiredDrafts,
} from './draftService.js';
import { sql } from '../db.js';

describe('getDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns draft when active draft exists', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    sql.mockResolvedValueOnce([{
      id: 'draft-1',
      name: 'My Workout',
      data: { exercises: [] },
      last_synced_at: '2026-02-01T10:00:00Z',
      created_at: '2026-02-01T10:00:00Z',
      expires_at: futureDate,
    }]);

    const result = await getDraft('user-1');
    expect(result).not.toBeNull();
    expect(result.id).toBe('draft-1');
    expect(result.name).toBe('My Workout');
  });

  it('returns null when no drafts exist', async () => {
    sql.mockResolvedValueOnce([]);
    const result = await getDraft('user-1');
    expect(result).toBeNull();
  });

  it('auto-deletes expired draft and returns null', async () => {
    const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    sql.mockResolvedValueOnce([{
      id: 'draft-expired',
      name: 'Old Workout',
      data: {},
      last_synced_at: null,
      created_at: '2026-02-01T10:00:00Z',
      expires_at: pastDate,
    }]);
    sql.mockResolvedValueOnce([]); // DELETE query

    const result = await getDraft('user-1');
    expect(result).toBeNull();
    expect(sql).toHaveBeenCalledTimes(2); // SELECT + DELETE
  });
});

describe('saveDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates new draft when none exists', async () => {
    sql.mockResolvedValueOnce([]); // No existing draft
    sql.mockResolvedValueOnce([{
      id: 'new-draft',
      name: 'New Workout',
      last_synced_at: '2026-02-01T10:00:00Z',
      expires_at: '2026-02-02T10:00:00Z',
    }]);

    const result = await saveDraft({ name: 'New Workout', data: { exercises: [] } }, 'user-1');
    expect(result.id).toBe('new-draft');
    expect(result.name).toBe('New Workout');
  });

  it('updates existing draft (upsert)', async () => {
    sql.mockResolvedValueOnce([{ id: 'existing-draft' }]); // Existing draft found
    sql.mockResolvedValueOnce([{
      id: 'existing-draft',
      name: 'Updated Workout',
      last_synced_at: '2026-02-01T11:00:00Z',
      expires_at: '2026-02-02T11:00:00Z',
    }]);

    const result = await saveDraft({ name: 'Updated Workout', data: { exercises: [] } }, 'user-1');
    expect(result.id).toBe('existing-draft');
  });

  it('throws for missing name', async () => {
    await expect(saveDraft({ data: {} }, 'user-1')).rejects.toThrow('Draft name must be');
  });

  it('throws for empty name', async () => {
    await expect(saveDraft({ name: '', data: {} }, 'user-1')).rejects.toThrow('Draft name must be');
  });

  it('throws for name exceeding 100 chars', async () => {
    await expect(
      saveDraft({ name: 'x'.repeat(101), data: {} }, 'user-1')
    ).rejects.toThrow('Draft name must be');
  });

  it('throws for missing data', async () => {
    await expect(saveDraft({ name: 'Test' }, 'user-1')).rejects.toThrow('Draft data is required');
  });

  it('throws for non-object data', async () => {
    await expect(
      saveDraft({ name: 'Test', data: 'string' }, 'user-1')
    ).rejects.toThrow('Draft data is required');
  });
});

describe('deleteDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes specific draft with ownership check', async () => {
    sql.mockResolvedValueOnce([{ id: 'draft-1', user_id: 'user-1' }]); // Ownership check
    sql.mockResolvedValueOnce({ count: 1 }); // DELETE

    const result = await deleteDraft('user-1', 'draft-1');
    expect(result.success).toBe(true);
  });

  it('throws for draft not found', async () => {
    sql.mockResolvedValueOnce([]); // No draft found

    await expect(deleteDraft('user-1', 'nonexistent')).rejects.toThrow('Draft not found');
  });

  it('throws for unauthorized (different user)', async () => {
    sql.mockResolvedValueOnce([{ id: 'draft-1', user_id: 'user-2' }]); // Wrong user

    await expect(deleteDraft('user-1', 'draft-1')).rejects.toThrow('Unauthorized');
  });

  it('deletes all user drafts when no draftId provided', async () => {
    sql.mockResolvedValueOnce({ count: 2 }); // DELETE all

    const result = await deleteDraft('user-1');
    expect(result.success).toBe(true);
  });
});

describe('deleteDraftById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true on successful delete', async () => {
    sql.mockResolvedValueOnce([{ id: 'draft-1', user_id: 'user-1' }]);
    sql.mockResolvedValueOnce([]); // DELETE

    const result = await deleteDraftById('draft-1', 'user-1');
    expect(result).toBe(true);
  });

  it('returns false for non-existent draft', async () => {
    sql.mockResolvedValueOnce([]);

    const result = await deleteDraftById('nonexistent', 'user-1');
    expect(result).toBe(false);
  });

  it('throws for unauthorized access', async () => {
    sql.mockResolvedValueOnce([{ id: 'draft-1', user_id: 'user-2' }]);

    await expect(deleteDraftById('draft-1', 'user-1')).rejects.toThrow('Unauthorized');
  });
});

describe('bulkDeleteDrafts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes multiple drafts', async () => {
    // Each call: check ownership then delete
    sql.mockResolvedValueOnce([{ id: 'd1', user_id: 'user-1' }]);
    sql.mockResolvedValueOnce([]); // DELETE d1
    sql.mockResolvedValueOnce([{ id: 'd2', user_id: 'user-1' }]);
    sql.mockResolvedValueOnce([]); // DELETE d2

    const count = await bulkDeleteDrafts(['d1', 'd2'], 'user-1');
    expect(count).toBe(2);
  });

  it('returns 0 for empty array', async () => {
    const count = await bulkDeleteDrafts([], 'user-1');
    expect(count).toBe(0);
  });

  it('returns 0 for null input', async () => {
    const count = await bulkDeleteDrafts(null, 'user-1');
    expect(count).toBe(0);
  });

  it('continues deleting when individual draft fails', async () => {
    sql.mockResolvedValueOnce([]); // d1 not found
    sql.mockResolvedValueOnce([{ id: 'd2', user_id: 'user-1' }]); // d2 found
    sql.mockResolvedValueOnce([]); // DELETE d2

    const count = await bulkDeleteDrafts(['d1', 'd2'], 'user-1');
    expect(count).toBe(1);
  });
});

describe('cleanupExpiredDrafts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns count of deleted expired drafts', async () => {
    sql.mockResolvedValueOnce({ count: 3 });

    const count = await cleanupExpiredDrafts('user-1');
    expect(count).toBe(3);
  });

  it('returns 0 when no expired drafts', async () => {
    sql.mockResolvedValueOnce({ count: 0 });

    const count = await cleanupExpiredDrafts('user-1');
    expect(count).toBe(0);
  });
});
