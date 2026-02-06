import { describe, it, expect } from 'vitest';
import {
  calculateEstimated1RM,
  calculateEstimated1RMSQL,
  REP_RANGES,
  REP_RANGE_ORDER,
  findRepRange,
} from './prCalculator.js';

describe('calculateEstimated1RM', () => {
  it('calculates correctly for standard inputs (225 lbs x 5 reps)', () => {
    const result = calculateEstimated1RM(225, 5);
    // Brzycki: 225 / (1.0278 - 0.0278 * 5) = 225 / 0.8888 ≈ 253.16
    expect(result).toBeCloseTo(253.16, 0);
  });

  it('returns weight itself for 1 rep', () => {
    const result = calculateEstimated1RM(225, 1);
    // 225 / (1.0278 - 0.0278 * 1) = 225 / 1.0 = 225
    expect(result).toBeCloseTo(225, 0);
  });

  it('calculates for 10 reps', () => {
    const result = calculateEstimated1RM(185, 10);
    // 185 / (1.0278 - 0.0278 * 10) = 185 / 0.7498 ≈ 246.73
    expect(result).toBeCloseTo(246.73, 0);
  });

  it('returns null for zero weight', () => {
    expect(calculateEstimated1RM(0, 5)).toBeNull();
  });

  it('returns null for null weight', () => {
    expect(calculateEstimated1RM(null, 5)).toBeNull();
  });

  it('returns null for undefined weight', () => {
    expect(calculateEstimated1RM(undefined, 5)).toBeNull();
  });

  it('returns null for zero reps', () => {
    expect(calculateEstimated1RM(225, 0)).toBeNull();
  });

  it('returns null for negative reps', () => {
    expect(calculateEstimated1RM(225, -1)).toBeNull();
  });

  it('returns null for null reps', () => {
    expect(calculateEstimated1RM(225, null)).toBeNull();
  });

  it('handles very high reps without division by zero', () => {
    // At reps ≈ 37, denominator = 1.0278 - 0.0278 * 37 ≈ 0.0
    // Should return null or a safe value, not Infinity/NaN
    const result = calculateEstimated1RM(225, 37);
    expect(result === null || Number.isFinite(result)).toBe(true);
  });

  it('handles reps above 37 (denominator goes negative)', () => {
    const result = calculateEstimated1RM(225, 40);
    // Denominator would be negative, resulting in negative 1RM
    // Should return null to prevent nonsensical values
    expect(result === null || result > 0).toBe(true);
  });

  it('rounds to 2 decimal places', () => {
    const result = calculateEstimated1RM(225, 5);
    const decimalPart = result.toString().split('.')[1] || '';
    expect(decimalPart.length).toBeLessThanOrEqual(2);
  });

  it('handles decimal weights', () => {
    const result = calculateEstimated1RM(132.5, 8);
    expect(result).toBeGreaterThan(132.5);
    expect(Number.isFinite(result)).toBe(true);
  });
});

describe('calculateEstimated1RMSQL', () => {
  it('returns a SQL string', () => {
    const sql = calculateEstimated1RMSQL();
    expect(typeof sql).toBe('string');
    expect(sql).toContain('CASE');
    expect(sql).toContain('1.0278');
    expect(sql).toContain('0.0278');
    expect(sql).toContain('ROUND');
  });

  it('handles null weight in SQL', () => {
    const sql = calculateEstimated1RMSQL();
    expect(sql).toContain('s.weight IS NOT NULL');
  });

  it('handles zero reps in SQL', () => {
    const sql = calculateEstimated1RMSQL();
    expect(sql).toContain('s.reps > 0');
  });
});

describe('REP_RANGES', () => {
  it('defines 4 rep ranges', () => {
    expect(REP_RANGES).toHaveLength(4);
  });

  it('has correct range definitions', () => {
    expect(REP_RANGES[0]).toEqual({ name: '1RM', min: 1, max: 1 });
    expect(REP_RANGES[1]).toEqual({ name: '3RM', min: 2, max: 3 });
    expect(REP_RANGES[2]).toEqual({ name: '5RM', min: 4, max: 7 });
    expect(REP_RANGES[3]).toEqual({ name: '10RM', min: 8, max: 12 });
  });
});

describe('REP_RANGE_ORDER', () => {
  it('has correct ordering', () => {
    expect(REP_RANGE_ORDER['1RM']).toBe(1);
    expect(REP_RANGE_ORDER['3RM']).toBe(2);
    expect(REP_RANGE_ORDER['5RM']).toBe(3);
    expect(REP_RANGE_ORDER['10RM']).toBe(4);
  });
});

describe('findRepRange', () => {
  it('returns 1RM for 1 rep', () => {
    expect(findRepRange(1)).toBe('1RM');
  });

  it('returns 3RM for 2 reps', () => {
    expect(findRepRange(2)).toBe('3RM');
  });

  it('returns 3RM for 3 reps', () => {
    expect(findRepRange(3)).toBe('3RM');
  });

  it('returns 5RM for 4-6 reps', () => {
    expect(findRepRange(4)).toBe('5RM');
    expect(findRepRange(5)).toBe('5RM');
    expect(findRepRange(6)).toBe('5RM');
  });

  it('returns 10RM for 8-12 reps', () => {
    expect(findRepRange(8)).toBe('10RM');
    expect(findRepRange(10)).toBe('10RM');
    expect(findRepRange(12)).toBe('10RM');
  });

  it('maps reps 7 to 5RM range', () => {
    expect(findRepRange(7)).toBe('5RM');
  });

  it('returns null for reps above 12', () => {
    expect(findRepRange(13)).toBeNull();
    expect(findRepRange(20)).toBeNull();
  });

  it('returns null for 0 reps', () => {
    expect(findRepRange(0)).toBeNull();
  });

  it('returns null for negative reps', () => {
    expect(findRepRange(-1)).toBeNull();
  });
});
