/**
 * Test Data Factories
 * Generate consistent test data for all test suites
 */

let counter = 0;
const nextId = () => `test-uuid-${++counter}`;

export const resetFactories = () => { counter = 0; };

export const buildUser = (overrides = {}) => ({
  id: nextId(),
  username: 'testuser',
  email: 'test@example.com',
  display_name: 'Test User',
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const buildWorkout = (overrides = {}) => ({
  id: nextId(),
  user_id: 'user-1',
  name: 'Test Workout',
  started_at: '2026-02-01T10:00:00Z',
  completed_at: '2026-02-01T11:00:00Z',
  duration_seconds: 3600,
  total_volume: 5000,
  notes: null,
  template_id: null,
  created_at: '2026-02-01T10:00:00Z',
  ...overrides,
});

export const buildExercise = (overrides = {}) => ({
  id: nextId(),
  name: 'Bench Press',
  type: 'weighted',
  equipment: 'barbell',
  primary_muscles: ['chest'],
  secondary_muscles: ['triceps', 'shoulders'],
  is_custom: false,
  is_archived: false,
  created_by: null,
  ...overrides,
});

export const buildSet = (overrides = {}) => ({
  id: nextId(),
  workout_exercise_id: 'we-1',
  set_number: 1,
  weight: 225,
  reps: 5,
  rir: 2,
  duration_seconds: null,
  distance: null,
  is_warmup: false,
  is_completed: true,
  notes: null,
  completed_at: '2026-02-01T10:15:00Z',
  ...overrides,
});

export const buildTemplate = (overrides = {}) => ({
  id: nextId(),
  user_id: 'user-1',
  name: 'Push Day',
  description: 'Chest, shoulders, triceps',
  created_at: '2026-01-15T00:00:00Z',
  ...overrides,
});

export const buildDraft = (overrides = {}) => ({
  id: nextId(),
  user_id: 'user-1',
  name: 'In Progress Workout',
  data: { exercises: [], startedAt: '2026-02-01T10:00:00Z' },
  last_synced_at: '2026-02-01T10:30:00Z',
  created_at: '2026-02-01T10:00:00Z',
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

export const buildSyncQueueItem = (overrides = {}) => ({
  id: nextId(),
  operation: 'CREATE_WORKOUT',
  payload: buildWorkout(),
  timestamp: new Date().toISOString(),
  retry_count: 0,
  last_error: null,
  last_retry_at: null,
  ...overrides,
});

export const buildSyncWorkoutPayload = (overrides = {}) => ({
  id: nextId(),
  name: 'Synced Workout',
  startedAt: '2026-02-01T10:00:00Z',
  completedAt: '2026-02-01T11:00:00Z',
  notes: null,
  templateId: null,
  exercises: [
    {
      id: nextId(),
      exerciseId: 'exercise-1',
      orderIndex: 0,
      isCompleted: true,
      sets: [
        {
          id: nextId(),
          setNumber: 1,
          weight: 225,
          reps: 5,
          rir: 2,
          isWarmup: false,
          isCompleted: true,
        },
      ],
    },
  ],
  ...overrides,
});
