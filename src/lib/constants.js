/**
 * Application Constants
 *
 * CLIENT-SIDE ONLY - Configuration and constants
 */

/**
 * Muscle group options for filtering and exercise creation
 */
export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'traps',
  'lats',
];

/**
 * Equipment types
 */
export const EQUIPMENT_TYPES = [
  { value: 'barbell', label: 'Barbell' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'cable', label: 'Cable' },
  { value: 'machine', label: 'Machine' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'other', label: 'Other' },
];

/**
 * Exercise types
 */
export const EXERCISE_TYPES = [
  { value: 'weighted', label: 'Weighted' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'timed', label: 'Timed' },
];

/**
 * Rep ranges for PR tracking
 */
export const REP_RANGES = [
  { value: '1RM', label: '1RM', min: 1, max: 1 },
  { value: '3RM', label: '3RM', min: 2, max: 4 },
  { value: '5RM', label: '5RM', min: 4, max: 6 },
  { value: '10RM', label: '10RM', min: 8, max: 12 },
];

/**
 * Rest timer presets (in seconds)
 */
export const REST_TIMER_PRESETS = [
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '1:30', value: 90 },
  { label: '2m', value: 120 },
  { label: '3m', value: 180 },
  { label: '5m', value: 300 },
];

/**
 * Input validation limits
 */
export const VALIDATION_LIMITS = {
  weight: { min: 0, max: 1500, step: 0.5 },
  reps: { min: 1, max: 100 },
  rir: { min: 0, max: 10 },
  username: { min: 3, max: 30 },
  password: { min: 8, max: 128 },
  workoutName: { max: 100 },
  exerciseName: { max: 100 },
  templateName: { max: 100 },
  notes: { max: 500 },
};

/**
 * AI Assistant configuration
 */
export const AI_CONFIG = {
  maxMessageLength: 500,
  maxRequestsPerWorkout: 20,
  maxRequestsPerDay: 100,
  timeoutSeconds: 5,
  contextWindow: {
    recentSets: 3,
    conversationHistory: 3,
  },
};

/**
 * Draft auto-save configuration
 */
export const DRAFT_CONFIG = {
  autoSaveIntervalMs: 30000, // 30 seconds
  expiryHours: 24,
};

/**
 * Sync configuration
 */
export const SYNC_CONFIG = {
  maxRetries: 5, // Max retry attempts before marking as failed
  throttleMs: 100, // Throttle between queue items (prevents Neon pool exhaustion)
  intervalMs: 30000, // Background sync polling interval (30 seconds)
  backoffBaseMs: 1000, // Exponential backoff: 1s, 2s, 4s, 8s, 16s
};

/**
 * Offline storage configuration
 */
export const STORAGE_CONFIG = {
  dbName: 'gymbrainDB',
  version: 1,
  stores: {
    workouts: 'workouts',
    drafts: 'drafts',
    exercises: 'exercises',
    syncQueue: 'syncQueue',
  },
};

/**
 * Pagination defaults
 */
export const PAGINATION = {
  workoutsPerPage: 20,
  exercisesPerPage: 50,
};

/**
 * Chart colors for progress visualization
 * Using warm, organic palette matching the design system
 */
export const CHART_COLORS = {
  primary: '#6b7c3f',    // Accent (olive green)
  secondary: '#8b7355',  // Secondary (brown)
  weight: '#5a7c40',     // Success (darker green)
  volume: '#6b7c3f',     // Accent (olive green)
  estimated1RM: '#5a7c40', // Success (darker green) - matches weight
  reps: '#b8860b',       // Warning (gold)
};

/**
 * Toast notification durations (in milliseconds)
 */
export const TOAST_DURATION = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
  pr: 6000, // Longer for PR achievements
};

/**
 * Responsive breakpoints (matching Tailwind defaults)
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * Navigation routes
 */
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  workout: '/workout',
  history: '/history',
  progress: '/progress',
  library: '/library',
  profile: '/profile',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
};

/**
 * Sync status types
 */
export const SYNC_STATUS = {
  local: 'local', // Exists only in IndexedDB
  syncing: 'syncing', // Currently syncing to server
  synced: 'synced', // Successfully synced
  failed: 'failed', // Sync failed
  conflict: 'conflict', // Conflict detected
};

/**
 * Theme colors (dark mode default)
 */
export const THEME = {
  colors: {
    primary: {
      light: '#6B8E6B',
      dark: '#4A6B4A',
    },
    secondary: {
      light: '#C76B4B',
      dark: '#8B4A3A',
    },
    background: {
      light: '#F8F6F1',
      dark: '#2A2A2A',
    },
    surface: {
      light: '#FFFEF9',
      dark: '#3A3A3A',
    },
    text: {
      light: '#3E2723',
      dark: '#F5F5DC',
    },
  },
};

/**
 * Feature flags (V1 scope)
 */
export const FEATURES = {
  aiAssistant: true,
  offline: true,
  templates: true,
  progressCharts: true,
  prTracking: true,
  dataExport: true,
  // V2 features (disabled)
  aiPlanDesigner: false,
  workoutSharing: false,
  frequencyCalendar: false,
  supersets: false,
};

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  network: 'Network error. Please check your connection.',
  unauthorized: 'Please log in to continue.',
  notFound: 'Resource not found.',
  serverError: 'Server error. Please try again later.',
  validation: 'Please check your input and try again.',
  aiUnavailable: 'AI assistant is temporarily unavailable. Continue logging normally.',
  syncFailed: 'Sync failed. Your data is saved locally and will sync when connection is restored.',
};

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  workoutCompleted: 'Workout completed!',
  exerciseCreated: 'Exercise created successfully.',
  templateCreated: 'Template created successfully.',
  dataSynced: 'Data synced successfully.',
  passwordReset: 'Password reset email sent. Check your inbox.',
};
