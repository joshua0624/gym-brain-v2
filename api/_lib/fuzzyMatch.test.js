import { describe, it, expect } from 'vitest';
import {
  calculateSimilarity,
  findSimilarExercises,
  checkForDuplicates,
} from './fuzzyMatch.js';

describe('calculateSimilarity', () => {
  it('returns 100 for exact match', () => {
    expect(calculateSimilarity('Bench Press', 'Bench Press')).toBe(100);
  });

  it('returns 100 for case-insensitive match', () => {
    expect(calculateSimilarity('bench press', 'BENCH PRESS')).toBe(100);
  });

  it('returns high similarity for close spelling', () => {
    const sim = calculateSimilarity('Bench Press', 'Bench Pres');
    expect(sim).toBeGreaterThan(80);
  });

  it('returns low similarity for completely different names', () => {
    const sim = calculateSimilarity('Bench Press', 'Squat');
    expect(sim).toBeLessThan(40);
  });

  it('returns 0 for null/empty inputs', () => {
    expect(calculateSimilarity(null, 'test')).toBe(0);
    expect(calculateSimilarity('test', null)).toBe(0);
    expect(calculateSimilarity('', 'test')).toBe(0);
    expect(calculateSimilarity('test', '')).toBe(0);
  });

  it('trims whitespace before comparing', () => {
    expect(calculateSimilarity('  Bench Press  ', 'Bench Press')).toBe(100);
  });
});

describe('findSimilarExercises', () => {
  const exercises = [
    { id: '1', name: 'Bench Press', type: 'weighted', equipment: 'barbell' },
    { id: '2', name: 'Incline Bench Press', type: 'weighted', equipment: 'barbell' },
    { id: '3', name: 'Squat', type: 'weighted', equipment: 'barbell' },
    { id: '4', name: 'Deadlift', type: 'weighted', equipment: 'barbell' },
  ];

  it('finds exact match at top', () => {
    const results = findSimilarExercises('Bench Press', exercises);
    expect(results[0].exercise.name).toBe('Bench Press');
    expect(results[0].similarity).toBe(100);
  });

  it('finds similar exercises above threshold', () => {
    const results = findSimilarExercises('Bench Press', exercises, 50);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for no matches above threshold', () => {
    const results = findSimilarExercises('Running', exercises, 90);
    expect(results).toEqual([]);
  });

  it('returns empty for null inputs', () => {
    expect(findSimilarExercises(null, exercises)).toEqual([]);
    expect(findSimilarExercises('test', null)).toEqual([]);
    expect(findSimilarExercises('test', 'not-array')).toEqual([]);
  });

  it('sorts by similarity descending', () => {
    const results = findSimilarExercises('Bench Press', exercises, 30);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].similarity).toBeLessThanOrEqual(results[i - 1].similarity);
    }
  });
});

describe('checkForDuplicates', () => {
  const exercises = [
    { id: '1', name: 'Bench Press', type: 'weighted', equipment: 'barbell', primary_muscles: ['chest'] },
    { id: '2', name: 'Incline Bench Press', type: 'weighted', equipment: 'barbell', primary_muscles: ['chest'] },
  ];

  it('detects duplicate for exact match', () => {
    const result = checkForDuplicates('Bench Press', exercises);
    expect(result.isDuplicate).toBe(true);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0].name).toBe('Bench Press');
  });

  it('returns top 3 suggestions max', () => {
    const manyExercises = Array.from({ length: 10 }, (_, i) => ({
      id: `${i}`, name: `Press Variant ${i}`, type: 'weighted', equipment: 'barbell', primary_muscles: ['chest'],
    }));
    const result = checkForDuplicates('Press Variant', manyExercises, 30);
    expect(result.suggestions.length).toBeLessThanOrEqual(3);
  });

  it('returns not duplicate for completely different name', () => {
    const result = checkForDuplicates('Plank', exercises, 70);
    expect(result.isDuplicate).toBe(false);
    expect(result.suggestions).toEqual([]);
  });

  it('includes exercise metadata in suggestions', () => {
    const result = checkForDuplicates('Bench Press', exercises);
    const suggestion = result.suggestions[0];
    expect(suggestion).toHaveProperty('id');
    expect(suggestion).toHaveProperty('name');
    expect(suggestion).toHaveProperty('similarity');
    expect(suggestion).toHaveProperty('type');
    expect(suggestion).toHaveProperty('equipment');
  });
});
