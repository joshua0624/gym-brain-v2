/**
 * Direct Endpoint Function Test
 * Tests the AI endpoint logic directly without HTTP
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Mock request and response
const mockReq = {
  method: 'POST',
  headers: {
    authorization: 'Bearer mock-token',
  },
  user: { userId: 'test-user-id' },
  body: {
    message: 'Should I increase the weight?',
    context: {
      workout_name: 'Push Day',
      current_exercise: 'Bench Press',
      recent_sets: [
        { weight: 185, reps: 8, rir: 2 },
        { weight: 185, reps: 7, rir: 3 },
      ],
    },
  },
};

let responseData = null;
const mockRes = {
  status: (code) => ({
    json: (data) => {
      console.log('Response status:', code);
      console.log('Response data:', JSON.stringify(data, null, 2));
      responseData = data;
      return mockRes;
    },
  }),
};

// Import the handler
console.log('🔧 Importing AI endpoint handler...');
const { default: handler } = await import('../api/ai/workout-assistant.js');

console.log('🧪 Testing handler directly...\n');

// Call the handler
await handler(mockReq, mockRes);

console.log('\n✅ Test complete');
if (responseData?.response && responseData.model) {
  console.log('✅ Got real AI response!');
  console.log('Response:', responseData.response);
} else if (responseData?.error || responseData?.timeout) {
  console.log('⚠️  Got fallback response');
}
