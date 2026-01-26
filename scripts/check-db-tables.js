import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { sql } = await import('../api/_lib/db.js');

try {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;

  console.log(`\n✅ Connected to database!`);
  console.log(`\n📋 Tables found: ${tables.length}\n`);
  tables.forEach(t => console.log(`   - ${t.table_name}`));

  // Check for users
  const users = await sql`SELECT COUNT(*) as count FROM "user"`;
  console.log(`\n👥 Users in database: ${users[0].count}`);

  // Check for exercises
  const exercises = await sql`SELECT COUNT(*) as count FROM exercise`;
  console.log(`💪 Exercises in database: ${exercises[0].count}\n`);

} catch (error) {
  console.error('\n❌ Database error:', error.message);
}

process.exit(0);
