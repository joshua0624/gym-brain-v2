import { describe, it, expect } from 'vitest';
import {
  MUSCLE_GROUPS,
  EQUIPMENT_TYPES,
  EXERCISE_TYPES,
  VALIDATION_LIMITS,
  SYNC_CONFIG,
  STORAGE_CONFIG,
  REST_TIMER_PRESETS,
  ROUTES,
  SYNC_STATUS,
  TOAST_DURATION,
  DRAFT_CONFIG,
  FEATURES,
  ERROR_MESSAGES,
} from './constants';

describe('Constants', () => {
  describe('MUSCLE_GROUPS', () => {
    it('contains all major muscle groups', () => {
      expect(MUSCLE_GROUPS).toContain('chest');
      expect(MUSCLE_GROUPS).toContain('back');
      expect(MUSCLE_GROUPS).toContain('quads');
      expect(MUSCLE_GROUPS).toContain('hamstrings');
      expect(MUSCLE_GROUPS).toContain('glutes');
      expect(MUSCLE_GROUPS).toContain('shoulders');
      expect(MUSCLE_GROUPS.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('EQUIPMENT_TYPES', () => {
    it('has value and label for each type', () => {
      EQUIPMENT_TYPES.forEach(type => {
        expect(type).toHaveProperty('value');
        expect(type).toHaveProperty('label');
        expect(typeof type.value).toBe('string');
        expect(typeof type.label).toBe('string');
      });
    });

    it('includes core equipment', () => {
      const values = EQUIPMENT_TYPES.map(t => t.value);
      expect(values).toContain('barbell');
      expect(values).toContain('dumbbell');
      expect(values).toContain('bodyweight');
    });
  });

  describe('EXERCISE_TYPES', () => {
    it('includes weighted, bodyweight, cardio, timed', () => {
      const values = EXERCISE_TYPES.map(t => t.value);
      expect(values).toContain('weighted');
      expect(values).toContain('bodyweight');
      expect(values).toContain('cardio');
      expect(values).toContain('timed');
    });
  });

  describe('VALIDATION_LIMITS', () => {
    it('has sensible weight limits', () => {
      expect(VALIDATION_LIMITS.weight.min).toBe(0);
      expect(VALIDATION_LIMITS.weight.max).toBe(1500);
      expect(VALIDATION_LIMITS.weight.step).toBe(0.5);
    });

    it('has sensible reps limits', () => {
      expect(VALIDATION_LIMITS.reps.min).toBe(1);
      expect(VALIDATION_LIMITS.reps.max).toBe(100);
    });

    it('has sensible RIR limits', () => {
      expect(VALIDATION_LIMITS.rir.min).toBe(0);
      expect(VALIDATION_LIMITS.rir.max).toBe(10);
    });

    it('has all required field limits', () => {
      expect(VALIDATION_LIMITS).toHaveProperty('username');
      expect(VALIDATION_LIMITS).toHaveProperty('password');
      expect(VALIDATION_LIMITS).toHaveProperty('workoutName');
      expect(VALIDATION_LIMITS).toHaveProperty('notes');
    });
  });

  describe('SYNC_CONFIG', () => {
    it('has reasonable sync values', () => {
      expect(SYNC_CONFIG.maxRetries).toBeGreaterThan(0);
      expect(SYNC_CONFIG.throttleMs).toBeGreaterThan(0);
      expect(SYNC_CONFIG.intervalMs).toBeGreaterThanOrEqual(10000);
      expect(SYNC_CONFIG.backoffBaseMs).toBeGreaterThan(0);
    });
  });

  describe('STORAGE_CONFIG', () => {
    it('defines all required IndexedDB stores', () => {
      expect(STORAGE_CONFIG.stores).toHaveProperty('workouts');
      expect(STORAGE_CONFIG.stores).toHaveProperty('drafts');
      expect(STORAGE_CONFIG.stores).toHaveProperty('exercises');
      expect(STORAGE_CONFIG.stores).toHaveProperty('syncQueue');
    });

    it('has a version number', () => {
      expect(STORAGE_CONFIG.version).toBeGreaterThanOrEqual(1);
    });
  });

  describe('REST_TIMER_PRESETS', () => {
    it('has ascending values', () => {
      for (let i = 1; i < REST_TIMER_PRESETS.length; i++) {
        expect(REST_TIMER_PRESETS[i].value).toBeGreaterThan(REST_TIMER_PRESETS[i - 1].value);
      }
    });
  });

  describe('ROUTES', () => {
    it('defines core routes', () => {
      expect(ROUTES.home).toBe('/');
      expect(ROUTES.login).toBe('/login');
      expect(ROUTES.workout).toBe('/workout');
      expect(ROUTES.history).toBe('/history');
      expect(ROUTES.progress).toBe('/progress');
    });
  });

  describe('SYNC_STATUS', () => {
    it('defines all sync states', () => {
      expect(SYNC_STATUS.local).toBe('local');
      expect(SYNC_STATUS.syncing).toBe('syncing');
      expect(SYNC_STATUS.synced).toBe('synced');
      expect(SYNC_STATUS.failed).toBe('failed');
      expect(SYNC_STATUS.conflict).toBe('conflict');
    });
  });

  describe('TOAST_DURATION', () => {
    it('error toasts last longer than success', () => {
      expect(TOAST_DURATION.error).toBeGreaterThan(TOAST_DURATION.success);
    });

    it('PR toasts have longest duration', () => {
      expect(TOAST_DURATION.pr).toBeGreaterThanOrEqual(TOAST_DURATION.error);
    });
  });

  describe('FEATURES', () => {
    it('has V1 features enabled', () => {
      expect(FEATURES.aiAssistant).toBe(true);
      expect(FEATURES.offline).toBe(true);
      expect(FEATURES.templates).toBe(true);
      expect(FEATURES.progressCharts).toBe(true);
      expect(FEATURES.prTracking).toBe(true);
    });

    it('has V2 features disabled', () => {
      expect(FEATURES.aiPlanDesigner).toBe(false);
      expect(FEATURES.workoutSharing).toBe(false);
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('defines messages for common error types', () => {
      expect(typeof ERROR_MESSAGES.network).toBe('string');
      expect(typeof ERROR_MESSAGES.unauthorized).toBe('string');
      expect(typeof ERROR_MESSAGES.serverError).toBe('string');
    });
  });
});
