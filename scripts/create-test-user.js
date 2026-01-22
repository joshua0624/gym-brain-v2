/**
 * Create a simple test user for endpoint testing
 *
 * Usage: node scripts/create-test-user.js
 */

import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

// Load environment variables BEFORE importing db
dotenv.config({ path: '.env.local' });

// Dynamic import to ensure dotenv runs first
const { sql } = await import('../api/_lib/db.js');

const TEST_USER = {
  username: 'testuser',
  email: 'testuser@example.com',
  password: 'testpass123'
};

async function createTestUser() {
  try {
    // Check if user already exists
    const existing = await sql`
      SELECT id, username, email
      FROM "user"
      WHERE username = ${TEST_USER.username} OR email = ${TEST_USER.email}
    `;

    if (existing.length > 0) {
      console.log('✅ Test user already exists:');
      console.log(JSON.stringify(existing[0], null, 2));
      console.log('\nYou can now run: node scripts/test-progress-requests.js');
      process.exit(0);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(TEST_USER.password, 10);

    // Create user
    const result = await sql`
      INSERT INTO "user" (username, email, password_hash)
      VALUES (${TEST_USER.username}, ${TEST_USER.email}, ${passwordHash})
      RETURNING id, username, email, created_at
    `;

    console.log('✅ Test user created successfully:');
    console.log(JSON.stringify(result[0], null, 2));
    console.log('\nCredentials:');
    console.log(`  Username: ${TEST_USER.username}`);
    console.log(`  Password: ${TEST_USER.password}`);
    console.log('\nYou can now run: node scripts/test-progress-requests.js');

  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

createTestUser();
