/**
 * Test requests for Progress & PR endpoints
 * Run after starting the dev server (npm run dev)
 *
 * Usage:
 * 1. In one terminal: npm run dev
 * 2. In another terminal: node scripts/test-progress-requests.js
 */

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3001';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, method, path, body = null, headers = {}) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`Testing: ${name}`, 'cyan');
  log(`${method} ${path}`, 'blue');
  log('='.repeat(60), 'cyan');

  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
      log(`Request body: ${JSON.stringify(body, null, 2)}`, 'yellow');
    }

    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json();

    if (response.ok) {
      log(`✓ Success (${response.status})`, 'green');
      log(`Response: ${JSON.stringify(data, null, 2)}`, 'green');
      return { success: true, data };
    } else {
      log(`✗ Failed (${response.status})`, 'red');
      log(`Error: ${JSON.stringify(data, null, 2)}`, 'red');
      return { success: false, error: data };
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('\n' + '🧪 Phase 7: Progress & PR Endpoint Tests', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');

  // Step 1: Login to get token
  log('Step 1: Logging in to get JWT token...', 'yellow');
  const loginResult = await testEndpoint(
    'Login',
    'POST',
    '/api/auth/login',
    {
      usernameOrEmail: 'testuser',
      password: 'testpass123'
    }
  );

  if (!loginResult.success) {
    log('\n❌ Login failed. Make sure test user exists.', 'red');
    log('Run: node scripts/create-test-user.js', 'yellow');
    return;
  }

  const token = loginResult.data.accessToken;
  const authHeaders = {
    'Authorization': `Bearer ${token}`
  };

  log('\n✅ Login successful! Token obtained.', 'green');

  // Step 2: Test PRs endpoint
  await testEndpoint(
    'Get All PRs',
    'GET',
    '/api/prs',
    null,
    authHeaders
  );

  // Step 3: Test PRs filtered by exercise (if you have an exercise ID)
  // Replace with an actual exercise ID from your database
  const sampleExerciseId = '00000000-0000-0000-0000-000000000001';
  await testEndpoint(
    'Get PRs for Specific Exercise',
    'GET',
    `/api/prs?exerciseId=${sampleExerciseId}`,
    null,
    authHeaders
  );

  // Step 4: Test progress endpoint
  await testEndpoint(
    'Get Exercise Progress',
    'GET',
    `/api/progress/${sampleExerciseId}`,
    null,
    authHeaders
  );

  // Step 5: Test weekly stats (current week)
  await testEndpoint(
    'Get Current Week Stats',
    'GET',
    '/api/stats/weekly',
    null,
    authHeaders
  );

  // Step 6: Test weekly stats with specific week
  const mondayDate = '2026-01-13';
  await testEndpoint(
    'Get Specific Week Stats',
    'GET',
    `/api/stats/weekly?week=${mondayDate}`,
    null,
    authHeaders
  );

  // Step 7: Test unauthorized access (no token)
  await testEndpoint(
    'Test Unauthorized Access',
    'GET',
    '/api/prs',
    null,
    {} // No auth header
  );

  log('\n' + '='.repeat(60), 'cyan');
  log('✅ All tests completed!', 'green');
  log('='.repeat(60) + '\n', 'cyan');
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});
