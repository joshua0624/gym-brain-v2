import { describe, it, expect } from 'vitest';
import {
  calculateVolumeSQL,
  calculateSetVolume,
  calculateSetsVolume,
} from './volumeCalculator.js';

describe('calculateSetVolume', () => {
  it('calculates volume for a weighted exercise set', () => {
    const set = { weight: 225, reps: 5, isWarmup: false };
    expect(calculateSetVolume(set, 'weighted')).toBe(1125);
  });

  it('calculates volume for a bodyweight exercise set', () => {
    const set = { weight: 0, reps: 10, isWarmup: false };
    expect(calculateSetVolume(set, 'bodyweight')).toBe(0);
  });

  it('returns 0 for warmup sets', () => {
    const set = { weight: 135, reps: 10, isWarmup: true };
    expect(calculateSetVolume(set, 'weighted')).toBe(0);
  });

  it('returns 0 for cardio exercises', () => {
    const set = { weight: 0, reps: 0, isWarmup: false };
    expect(calculateSetVolume(set, 'cardio')).toBe(0);
  });

  it('returns 0 for timed exercises', () => {
    const set = { weight: 0, reps: 0, isWarmup: false };
    expect(calculateSetVolume(set, 'timed')).toBe(0);
  });

  it('handles string weight values (parses to float)', () => {
    const set = { weight: '225.5', reps: '5', isWarmup: false };
    expect(calculateSetVolume(set, 'weighted')).toBe(1127.5);
  });

  it('handles zero weight', () => {
    const set = { weight: 0, reps: 5, isWarmup: false };
    expect(calculateSetVolume(set, 'weighted')).toBe(0);
  });

  it('handles zero reps', () => {
    const set = { weight: 225, reps: 0, isWarmup: false };
    expect(calculateSetVolume(set, 'weighted')).toBe(0);
  });

  it('handles null/undefined weight', () => {
    const set = { weight: null, reps: 5, isWarmup: false };
    expect(calculateSetVolume(set, 'weighted')).toBe(0);
  });

  it('handles null/undefined reps', () => {
    const set = { weight: 225, reps: null, isWarmup: false };
    expect(calculateSetVolume(set, 'weighted')).toBe(0);
  });
});

describe('calculateSetsVolume', () => {
  it('sums volume across multiple sets', () => {
    const sets = [
      { weight: 225, reps: 5, isWarmup: false },
      { weight: 225, reps: 5, isWarmup: false },
      { weight: 225, reps: 4, isWarmup: false },
    ];
    // 1125 + 1125 + 900 = 3150
    expect(calculateSetsVolume(sets, 'weighted')).toBe(3150);
  });

  it('excludes warmup sets from total', () => {
    const sets = [
      { weight: 135, reps: 10, isWarmup: true },
      { weight: 225, reps: 5, isWarmup: false },
    ];
    expect(calculateSetsVolume(sets, 'weighted')).toBe(1125);
  });

  it('returns 0 for empty array', () => {
    expect(calculateSetsVolume([], 'weighted')).toBe(0);
  });

  it('returns 0 when all sets are warmups', () => {
    const sets = [
      { weight: 135, reps: 10, isWarmup: true },
      { weight: 185, reps: 5, isWarmup: true },
    ];
    expect(calculateSetsVolume(sets, 'weighted')).toBe(0);
  });
});

describe('calculateVolumeSQL', () => {
  it('returns a valid SQL CASE expression', () => {
    const sql = calculateVolumeSQL();
    expect(typeof sql).toBe('string');
    expect(sql).toContain('CASE');
    expect(sql).toContain('weighted');
    expect(sql).toContain('bodyweight');
    expect(sql).toContain('is_warmup');
    expect(sql).toContain('COALESCE');
  });

  it('excludes warmup sets in SQL', () => {
    const sql = calculateVolumeSQL();
    expect(sql).toContain('s.is_warmup = false');
  });
});
