/**
 * E2E Test Helpers
 *
 * Shared mock data and API intercept setup for Playwright tests.
 * All API calls are intercepted at the network level so tests
 * don't need a running backend or database.
 */

export const TEST_USER = {
  id: 'e2e-user-001',
  username: 'e2etester',
  email: 'e2e@gymbrain.test',
  createdAt: '2026-01-01T00:00:00Z',
};

export const TEST_TOKENS = {
  accessToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.e2e-mock-access-token',
  refreshToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.e2e-mock-refresh-token',
};

export const TEST_EXERCISES = [
  {
    id: 'ex-bench',
    name: 'Barbell Bench Press',
    type: 'weighted',
    equipment: 'barbell',
    primary_muscles: ['chest'],
    secondary_muscles: ['shoulders', 'triceps'],
    is_custom: false,
  },
  {
    id: 'ex-squat',
    name: 'Barbell Squat',
    type: 'weighted',
    equipment: 'barbell',
    primary_muscles: ['quads'],
    secondary_muscles: ['glutes', 'hamstrings', 'core'],
    is_custom: false,
  },
  {
    id: 'ex-pullup',
    name: 'Pull-Up',
    type: 'bodyweight',
    equipment: 'bodyweight',
    primary_muscles: ['back'],
    secondary_muscles: ['biceps', 'core'],
    is_custom: false,
  },
];

export const TEST_WORKOUTS = [
  {
    id: 'w-completed-1',
    name: 'Push Day',
    started_at: '2026-02-05T10:00:00Z',
    completed_at: '2026-02-05T11:00:00Z',
    duration_seconds: 3600,
    total_volume: 4500,
    exercises: [
      {
        exercise_id: 'ex-bench',
        name: 'Barbell Bench Press',
        type: 'weighted',
        sets: [
          { set_number: 1, weight: 225, reps: 5, rir: 2, is_warmup: false, is_completed: true },
        ],
      },
    ],
  },
];

/**
 * Helper: check if a URL path matches a pattern (ignoring query params)
 */
function urlPathMatches(url, path) {
  try {
    const parsed = new URL(url);
    return parsed.pathname === path || parsed.pathname.endsWith(path);
  } catch {
    return url.includes(path);
  }
}

function urlPathStartsWith(url, prefix) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.startsWith(prefix) || parsed.pathname.includes(prefix);
  } catch {
    return url.includes(prefix);
  }
}

/**
 * Set up API mocks for all standard endpoints.
 * Uses function-based route matching to properly handle query params.
 */
export async function setupAPIMocks(page) {
  // Catch-all for /api/* - must be registered FIRST (Playwright matches last-registered first)
  // This prevents any unmatched API call from hitting the Vite proxy
  await page.route(url => urlPathStartsWith(url, '/api/'), async (route) => {
    console.log(`[E2E Mock] Unmatched API call: ${route.request().method()} ${route.request().url()}`);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Mock fallback' }),
    });
  });

  // Auth - login
  await page.route(url => urlPathMatches(url, '/api/auth/login'), async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: TEST_USER,
          accessToken: TEST_TOKENS.accessToken,
          refreshToken: TEST_TOKENS.refreshToken,
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Auth - register
  await page.route(url => urlPathMatches(url, '/api/auth/register'), async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          user: TEST_USER,
          accessToken: TEST_TOKENS.accessToken,
          refreshToken: TEST_TOKENS.refreshToken,
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Auth - refresh
  await page.route(url => urlPathMatches(url, '/api/auth/refresh'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: TEST_TOKENS.accessToken,
        refreshToken: TEST_TOKENS.refreshToken,
      }),
    });
  });

  // Exercises (GET /api/exercises with optional query params)
  await page.route(url => urlPathMatches(url, '/api/exercises'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ exercises: TEST_EXERCISES }),
    });
  });

  // Templates
  await page.route(url => urlPathMatches(url, '/api/templates'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ templates: [] }),
    });
  });

  // Template exercises (GET /api/templates/:id/exercises)
  await page.route(url => urlPathStartsWith(url, '/api/templates/'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ name: 'Template', exercises: [] }),
    });
  });

  // Workouts sync (POST /api/workouts/sync) - must be before general workouts
  await page.route(url => urlPathMatches(url, '/api/workouts/sync'), async (route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          synced: (body.completedWorkouts || []).map((w) => ({
            clientId: w.id,
            serverId: w.id,
            status: 'created',
          })),
          deletedDrafts: body.deleteDraftIds || [],
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Draft endpoints (GET/PUT/DELETE /api/workouts/draft)
  await page.route(url => urlPathMatches(url, '/api/workouts/draft'), async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ draft: null }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
  });

  // Workouts list (GET /api/workouts with query params)
  await page.route(url => urlPathMatches(url, '/api/workouts'), async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          workouts: TEST_WORKOUTS,
          total: TEST_WORKOUTS.length,
          limit: 20,
          offset: 0,
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Individual workout (GET /api/workouts/:id)
  await page.route(url => {
    try {
      const parsed = new URL(url);
      return /\/api\/workouts\/[^/]+$/.test(parsed.pathname);
    } catch { return false; }
  }, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TEST_WORKOUTS[0]),
    });
  });

  // Stats - PRs
  await page.route(url => urlPathStartsWith(url, '/api/stats/prs'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ prs: [], total: 0 }),
    });
  });

  // Stats - weekly
  await page.route(url => urlPathStartsWith(url, '/api/stats/weekly'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total_volume: 0,
        total_workouts: 0,
        total_sets: 0,
        avg_duration_minutes: null,
        volume_by_muscle: {},
        sets_by_muscle: {},
        frequency_heatmap: [],
      }),
    });
  });

  // Stats - exercise progress
  await page.route(url => urlPathStartsWith(url, '/api/stats/progress'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        exercise_id: 'ex-bench',
        exercise_name: 'Barbell Bench Press',
        progress: [],
        total_entries: 0,
      }),
    });
  });

  // User data export
  await page.route(url => urlPathMatches(url, '/api/user/export'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ workouts: [], exercises: [], templates: [] }),
    });
  });
}

/**
 * Log in via the UI and navigate to /workout.
 */
export async function loginAndNavigate(page) {
  await page.goto('/login');
  await page.fill('#usernameOrEmail', 'e2etester');
  await page.fill('#password', 'TestPassword1!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/workout');
}

/**
 * Set auth tokens directly in localStorage to skip the login UI.
 */
export async function setAuthTokens(page) {
  await page.evaluate(({ user, tokens }) => {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
  }, { user: TEST_USER, tokens: TEST_TOKENS });
}
