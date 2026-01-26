/**
 * Direct OpenAI API Test
 * Tests if the API key is valid and working
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const apiKey = process.env.OPENAI_API_KEY;

console.log('🔑 Testing OpenAI API Key...');
console.log('Key format:', apiKey ? `${apiKey.substring(0, 15)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET');
console.log('Key length:', apiKey ? apiKey.length : 0);
console.log('');

if (!apiKey || apiKey === 'sk-your_openai_key_here') {
  console.error('❌ OpenAI API key not set or is placeholder');
  process.exit(1);
}

const openai = new OpenAI({ apiKey });

async function testAPI() {
  try {
    console.log('📡 Calling OpenAI API...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello! API is working." in one sentence.' }
      ],
      max_tokens: 50,
      temperature: 0.7,
    });

    console.log('✅ SUCCESS! OpenAI API is working.');
    console.log('');
    console.log('Response:');
    console.log(response.choices[0].message.content);
    console.log('');
    console.log('Model:', response.model);
    console.log('Tokens used:', response.usage.total_tokens);

  } catch (error) {
    console.error('❌ ERROR calling OpenAI API:');
    console.error('');
    console.error('Error type:', error.constructor.name);
    console.error('Status:', error.status);
    console.error('Message:', error.message);

    if (error.status === 401) {
      console.error('');
      console.error('⚠️  Authentication Error - Check your API key:');
      console.error('   1. Is it the correct key from https://platform.openai.com/api-keys?');
      console.error('   2. Has it been revoked or expired?');
      console.error('   3. Is it copied correctly (no extra spaces)?');
    } else if (error.status === 429) {
      console.error('');
      console.error('⚠️  Rate Limit Error:');
      console.error('   - You\'ve exceeded your API quota or rate limit');
      console.error('   - Check your usage at https://platform.openai.com/usage');
    }

    process.exit(1);
  }
}

testAPI();
