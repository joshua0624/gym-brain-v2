import dotenv from 'dotenv';

// CRITICAL: Load environment variables BEFORE importing db.js
// The db module checks for DATABASE_URL at import time
dotenv.config({ path: '.env.local' });

// Use dynamic import to ensure dotenv runs first
const { sql } = await import('../api/_lib/db.js');

async function checkUser() {
  const users = await sql`
    SELECT id, username, email, created_at
    FROM "user"
    WHERE username LIKE 'testuser%'
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (users.length > 0) {
    console.log('✅ Test user found in database:');
    console.log(JSON.stringify(users[0], null, 2));
  } else {
    console.log('❌ No test user found');
    console.log('\nSearching for ANY users...');

    const allUsers = await sql`
      SELECT id, username, email, created_at
      FROM "user"
      ORDER BY created_at DESC
      LIMIT 5
    `;

    if (allUsers.length > 0) {
      console.log(`\nFound ${allUsers.length} user(s) in database:`);
      allUsers.forEach(user => {
        console.log(`  - ${user.username} (${user.email})`);
      });
    } else {
      console.log('\n⚠️  No users found in database at all');
      console.log('You may need to run migrations or create a test user');
    }
  }

  process.exit(0);
}

checkUser().catch(error => {
  console.error('❌ Error checking users:', error.message);
  process.exit(1);
});
