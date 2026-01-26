/**
 * Single AI Request Test
 * Makes one AI request and shows detailed response
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3001';

async function test() {
  console.log('🔐 Step 1: Login...');

  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usernameOrEmail: 'testuser',
      password: 'testpass123',
    }),
  });

  const loginData = await loginRes.json();
  const token = loginData.accessToken;

  if (!token) {
    console.error('❌ Login failed:', loginData);
    return;
  }

  console.log('✅ Login successful\n');

  console.log('🤖 Step 2: Making AI request...');
  console.log('Request payload:');
  const payload = {
    message: 'Should I increase the weight for my next set?',
    context: {
      workout_name: 'Push Day',
      current_exercise: 'Bench Press',
      recent_sets: [
        { weight: 185, reps: 8, rir: 2 },
        { weight: 185, reps: 7, rir: 3 },
      ],
    },
  };
  console.log(JSON.stringify(payload, null, 2));
  console.log('');

  const aiRes = await fetch(`${BASE_URL}/api/ai/workout-assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const aiData = await aiRes.json();

  console.log('Response status:', aiRes.status);
  console.log('Response data:');
  console.log(JSON.stringify(aiData, null, 2));

  if (aiData.error || aiData.timeout) {
    console.log('\n⚠️  Got fallback response instead of AI');
  } else if (aiData.response && aiData.model) {
    console.log('\n✅ Got real AI response!');
    console.log('AI says:', aiData.response);
  }
}

test().catch(err => console.error('Error:', err.message));
