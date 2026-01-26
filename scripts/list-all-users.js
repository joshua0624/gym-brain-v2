import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { sql } = await import('../api/_lib/db.js');

try {
  const users = await sql`SELECT id, username, email, created_at FROM "user" ORDER BY created_at DESC`;

  console.log(`\n📋 All users in database (${users.length} total):\n`);
  users.forEach((u, i) => {
    console.log(`${i + 1}. ${u.username}`);
    console.log(`   Email: ${u.email}`);
    console.log(`   ID: ${u.id}`);
    console.log(`   Created: ${u.created_at}`);
    console.log('');
  });
} catch (error) {
  console.error('❌ Error:', error.message);
}

process.exit(0);
