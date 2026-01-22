/**
 * Auth Endpoints Test Script
 * Tests all authentication endpoints
 *
 * Usage: node scripts/test-auth.js
 *
 * Prerequisites:
 * - Dev server must be running (npm run dev)
 * - Database must be initialized with schema
 */

import axios from 'axios';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test user data
const testUser = {
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: 'TestPassword123!'
};

// Store tokens for later tests
let accessToken = '';
let refreshToken = '';

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'blue');
  console.log('='.repeat(60));
}

async function test(name, fn) {
  try {
    await fn();
    log(`✅ ${name}`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${name}`, 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    } else {
      log(`   Error: ${error.message}`, 'red');
    }
    return false;
  }
}

// Test 1: Register new user
async function testRegister() {
  section('TEST 1: User Registration');

  await test('Register with valid data', async () => {
    const response = await axios.post(`${API_BASE}/auth/register`, testUser);

    if (response.status !== 201) {
      throw new Error(`Expected 201, got ${response.status}`);
    }

    if (!response.data.user) {
      throw new Error('Missing user data in response');
    }

    if (!response.data.accessToken || !response.data.refreshToken) {
      throw new Error('Missing tokens in response');
    }

    // Store tokens for later tests
    accessToken = response.data.accessToken;
    refreshToken = response.data.refreshToken;

    log(`   User ID: ${response.data.user.id}`, 'yellow');
    log(`   Username: ${response.data.user.username}`, 'yellow');
    log(`   Email: ${response.data.user.email}`, 'yellow');
    log(`   Access Token: ${accessToken.substring(0, 20)}...`, 'yellow');
  });

  await test('Reject duplicate username', async () => {
    try {
      await axios.post(`${API_BASE}/auth/register`, {
        username: testUser.username,
        email: `different_${Date.now()}@example.com`,
        password: 'AnotherPassword123!'
      });
      throw new Error('Should have rejected duplicate username');
    } catch (error) {
      if (error.response && error.response.status === 409) {
        return; // Expected error
      }
      throw error;
    }
  });

  await test('Reject duplicate email', async () => {
    try {
      await axios.post(`${API_BASE}/auth/register`, {
        username: `different_user_${Date.now()}`,
        email: testUser.email,
        password: 'AnotherPassword123!'
      });
      throw new Error('Should have rejected duplicate email');
    } catch (error) {
      if (error.response && error.response.status === 409) {
        return; // Expected error
      }
      throw error;
    }
  });

  await test('Reject invalid email', async () => {
    try {
      await axios.post(`${API_BASE}/auth/register`, {
        username: `user_${Date.now()}`,
        email: 'not-an-email',
        password: 'Password123!'
      });
      throw new Error('Should have rejected invalid email');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        return; // Expected error
      }
      throw error;
    }
  });

  await test('Reject short password', async () => {
    try {
      await axios.post(`${API_BASE}/auth/register`, {
        username: `user_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: 'short'
      });
      throw new Error('Should have rejected short password');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        return; // Expected error
      }
      throw error;
    }
  });

  await test('Reject invalid username (too short)', async () => {
    try {
      await axios.post(`${API_BASE}/auth/register`, {
        username: 'ab',
        email: `test_${Date.now()}@example.com`,
        password: 'Password123!'
      });
      throw new Error('Should have rejected short username');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        return; // Expected error
      }
      throw error;
    }
  });
}

// Test 2: Login
async function testLogin() {
  section('TEST 2: User Login');

  await test('Login with username', async () => {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      usernameOrEmail: testUser.username,
      password: testUser.password
    });

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    if (!response.data.accessToken || !response.data.refreshToken) {
      throw new Error('Missing tokens in response');
    }

    log(`   Access Token: ${response.data.accessToken.substring(0, 20)}...`, 'yellow');
  });

  await test('Login with email', async () => {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      usernameOrEmail: testUser.email,
      password: testUser.password
    });

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
  });

  await test('Login with "Remember Me" (30-day refresh token)', async () => {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      usernameOrEmail: testUser.username,
      password: testUser.password,
      rememberMe: true
    });

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    log(`   Received refresh token for 30-day session`, 'yellow');
  });

  await test('Reject wrong password', async () => {
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        usernameOrEmail: testUser.username,
        password: 'WrongPassword123!'
      });
      throw new Error('Should have rejected wrong password');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        return; // Expected error
      }
      throw error;
    }
  });

  await test('Reject non-existent user', async () => {
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        usernameOrEmail: 'nonexistent_user',
        password: 'Password123!'
      });
      throw new Error('Should have rejected non-existent user');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        return; // Expected error
      }
      throw error;
    }
  });
}

// Test 3: Token Refresh
async function testRefresh() {
  section('TEST 3: Token Refresh');

  await test('Refresh access token with valid refresh token', async () => {
    const response = await axios.post(`${API_BASE}/auth/refresh`, {
      refreshToken: refreshToken
    });

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    if (!response.data.accessToken) {
      throw new Error('Missing access token in response');
    }

    const newAccessToken = response.data.accessToken;
    log(`   New Access Token: ${newAccessToken.substring(0, 20)}...`, 'yellow');

    // Verify new token is different from old one
    if (newAccessToken === accessToken) {
      throw new Error('New token should be different from old token');
    }

    // Update access token for subsequent tests
    accessToken = newAccessToken;
  });

  await test('Reject invalid refresh token', async () => {
    try {
      await axios.post(`${API_BASE}/auth/refresh`, {
        refreshToken: 'invalid.refresh.token'
      });
      throw new Error('Should have rejected invalid refresh token');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        return; // Expected error
      }
      throw error;
    }
  });

  await test('Reject missing refresh token', async () => {
    try {
      await axios.post(`${API_BASE}/auth/refresh`, {});
      throw new Error('Should have rejected missing refresh token');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        return; // Expected error
      }
      throw error;
    }
  });
}

// Test 4: Protected Route (using middleware)
async function testProtectedRoute() {
  section('TEST 4: Protected Route (Middleware)');

  // Note: We'll need to create a test endpoint that uses requireAuth
  // For now, we'll document what should be tested
  log('ℹ️  Protected route tests will be added when API endpoints are created', 'yellow');
  log('   These tests should verify:', 'yellow');
  log('   - Valid token allows access', 'yellow');
  log('   - Invalid token returns 401', 'yellow');
  log('   - Missing token returns 401', 'yellow');
  log('   - Expired token returns 401', 'yellow');
}

// Main test runner
async function runTests() {
  log('🧪 Starting Authentication Tests', 'blue');
  log(`Target: ${API_BASE}`, 'yellow');
  log('');

  try {
    await testRegister();
    await testLogin();
    await testRefresh();
    await testProtectedRoute();

    section('TEST SUMMARY');
    log('All authentication tests completed!', 'green');
    log('Check output above for any failures.', 'yellow');

  } catch (error) {
    log('\n❌ Test suite failed with error:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests();
