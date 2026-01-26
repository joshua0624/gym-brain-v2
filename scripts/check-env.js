/**
 * Check if all required environment variables are set
 *
 * Usage: node scripts/check-env.js
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const REQUIRED_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'OPENAI_API_KEY',
  'RESEND_API_KEY'
];

console.log('\n🔍 Checking environment variables...\n');

let allPresent = true;
let warnings = [];

REQUIRED_VARS.forEach(varName => {
  const value = process.env[varName];
  const isSet = value && value.trim() !== '';

  if (isSet) {
    // Mask the value for security
    const masked = value.length > 10
      ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
      : '***';
    console.log(`✅ ${varName}: ${masked}`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    allPresent = false;
  }
});

// Check for Vercel OIDC token (shouldn't be needed for local dev)
if (process.env.VERCEL_OIDC_TOKEN) {
  warnings.push('⚠️  VERCEL_OIDC_TOKEN is set - this is not needed for local development');
}

console.log('\n' + '='.repeat(60));

if (allPresent) {
  console.log('✅ All required environment variables are set!');
} else {
  console.log('❌ Some environment variables are missing!');
  console.log('\nPlease add them to your .env.local file:');
  console.log('\nDATABASE_URL=postgresql://...');
  console.log('JWT_SECRET=your-secret-key');
  console.log('JWT_REFRESH_SECRET=your-refresh-secret');
  console.log('OPENAI_API_KEY=sk-proj-...');
  console.log('RESEND_API_KEY=re_...');
}

if (warnings.length > 0) {
  console.log('\n' + '='.repeat(60));
  warnings.forEach(w => console.log(w));
}

console.log('');

process.exit(allPresent ? 0 : 1);
