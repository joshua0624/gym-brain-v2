/**
 * AI Workout Assistant Endpoint Test Script
 * Tests the /api/ai/workout-assistant endpoint with various scenarios
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
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

/**
 * Test runner
 */
async function runTests() {
  console.log('\n' + '='.repeat(60));
  log(colors.cyan, '🤖 AI Workout Assistant Endpoint Tests');
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: Login to get JWT token
    log(colors.blue, '📝 Step 1: Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernameOrEmail: 'testuser',
        password: 'testpass123',
      }),
    });

    if (!loginResponse.ok) {
      log(colors.red, '❌ Login failed');
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.accessToken;
    log(colors.green, '✅ Login successful\n');

    // Step 2: Test basic AI request
    log(colors.blue, '📝 Test 1: Basic AI request');
    const test1 = await fetch(`${BASE_URL}/api/ai/workout-assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: 'Should I increase the weight for my next set?',
        context: {
          workout_name: 'Push Day',
          current_exercise: 'Bench Press',
          recent_sets: [
            { weight: 185, reps: 8, rir: 2 },
            { weight: 185, reps: 7, rir: 3 },
            { weight: 185, reps: 6, rir: 3 },
          ],
        },
      }),
    });

    if (test1.ok) {
      const data = await test1.json();
      log(colors.green, '✅ Test 1 passed');
      log(colors.cyan, '   AI Response:', data.response);
      log(colors.cyan, '   Model:', data.model);
      log(colors.cyan, '   Timestamp:', data.timestamp);
    } else {
      const error = await test1.json();
      log(colors.red, '❌ Test 1 failed:', error);
    }
    console.log();

    // Step 3: Test with workout_id for rate limiting
    log(colors.blue, '📝 Test 2: Request with workout_id');
    const test2 = await fetch(`${BASE_URL}/api/ai/workout-assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: 'How long should I rest?',
        context: {
          workout_id: '123e4567-e89b-12d3-a456-426614174000', // Mock workout ID
          workout_name: 'Leg Day',
          current_exercise: 'Squat',
          recent_sets: [
            { weight: 315, reps: 5, rir: 1 },
            { weight: 315, reps: 4, rir: 2 },
          ],
        },
      }),
    });

    if (test2.ok) {
      const data = await test2.json();
      log(colors.green, '✅ Test 2 passed');
      log(colors.cyan, '   AI Response:', data.response);
    } else {
      const error = await test2.json();
      log(colors.red, '❌ Test 2 failed:', error);
    }
    console.log();

    // Step 4: Test with conversation history
    log(colors.blue, '📝 Test 3: Request with conversation history');
    const test3 = await fetch(`${BASE_URL}/api/ai/workout-assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: 'Should I add another set?',
        context: {
          current_exercise: 'Deadlift',
          recent_sets: [
            { weight: 405, reps: 3, rir: 1 },
            { weight: 405, reps: 2, rir: 2 },
          ],
          conversation_history: [
            { role: 'user', content: 'How am I doing on deadlifts?' },
            {
              role: 'assistant',
              content:
                'You\'re performing well! Your reps are consistent and you\'re leaving 1-2 reps in reserve, which suggests good fatigue management.',
            },
          ],
        },
      }),
    });

    if (test3.ok) {
      const data = await test3.json();
      log(colors.green, '✅ Test 3 passed');
      log(colors.cyan, '   AI Response:', data.response);
    } else {
      const error = await test3.json();
      log(colors.red, '❌ Test 3 failed:', error);
    }
    console.log();

    // Step 5: Test validation - empty message
    log(colors.blue, '📝 Test 4: Validation - empty message');
    const test4 = await fetch(`${BASE_URL}/api/ai/workout-assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: '',
        context: {},
      }),
    });

    if (test4.status === 400) {
      const error = await test4.json();
      log(colors.green, '✅ Test 4 passed (correctly rejected empty message)');
      log(colors.cyan, '   Error:', error.error);
    } else {
      log(colors.red, '❌ Test 4 failed (should reject empty message)');
    }
    console.log();

    // Step 6: Test validation - message too long
    log(colors.blue, '📝 Test 5: Validation - message too long');
    const longMessage = 'a'.repeat(501); // 501 characters
    const test5 = await fetch(`${BASE_URL}/api/ai/workout-assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: longMessage,
        context: {},
      }),
    });

    if (test5.status === 400) {
      const error = await test5.json();
      log(colors.green, '✅ Test 5 passed (correctly rejected long message)');
      log(colors.cyan, '   Error:', error.error);
    } else {
      log(colors.red, '❌ Test 5 failed (should reject long message)');
    }
    console.log();

    // Step 7: Test unauthorized access
    log(colors.blue, '📝 Test 6: Unauthorized access');
    const test6 = await fetch(`${BASE_URL}/api/ai/workout-assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Test without auth',
        context: {},
      }),
    });

    if (test6.status === 401) {
      log(colors.green, '✅ Test 6 passed (correctly rejected unauthorized request)');
    } else {
      log(colors.red, '❌ Test 6 failed (should reject unauthorized request)');
    }
    console.log();

    // Step 8: Test rate limiting (send 21 requests rapidly)
    log(colors.blue, '📝 Test 7: Rate limiting (20 requests/workout limit)');
    log(colors.yellow, '   Sending 21 rapid requests with same workout_id...');

    const workoutId = '123e4567-e89b-12d3-a456-426614174001';
    let rateLimitTriggered = false;

    for (let i = 1; i <= 21; i++) {
      const response = await fetch(`${BASE_URL}/api/ai/workout-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: `Test request ${i}`,
          context: {
            workout_id: workoutId,
            current_exercise: 'Test Exercise',
          },
        }),
      });

      if (response.status === 429) {
        const error = await response.json();
        log(colors.green, `✅ Rate limit triggered at request ${i}`);
        log(colors.cyan, '   Error:', error.error);
        rateLimitTriggered = true;
        break;
      }

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!rateLimitTriggered) {
      log(
        colors.yellow,
        '⚠️  Rate limit not triggered (might need to check OPENAI_API_KEY is set)'
      );
    }
    console.log();

    // Summary
    console.log('='.repeat(60));
    log(colors.cyan, '✨ AI Endpoint Testing Complete');
    console.log('='.repeat(60) + '\n');

    log(colors.green, 'IMPORTANT NOTES:');
    log(
      colors.cyan,
      '1. Ensure OPENAI_API_KEY is set in .env.local for full AI responses'
    );
    log(colors.cyan, '2. Without API key, responses will use mock/fallback mode');
    log(colors.cyan, '3. Rate limiting is tracked in ai_request_log table');
    log(colors.cyan, '4. AI timeout is set to 5 seconds');
    console.log();
  } catch (error) {
    log(colors.red, '💥 Test suite error:', error.message);
    console.error(error);
  }
}

// Check if server is ready
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail: 'test', password: 'test' }),
    });
    return true;
  } catch (error) {
    log(
      colors.red,
      '❌ Server not responding at',
      BASE_URL,
      '\n   Please start the server first:'
    );
    log(colors.cyan, '   node scripts/test-progress-endpoints.js');
    return false;
  }
}

// Run tests
(async () => {
  const serverReady = await checkServer();
  if (serverReady) {
    await runTests();
  }
})();
