import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function checkLogs() {
  try {
    const logs = await sql`
      SELECT COUNT(*) as count, user_id, workout_id
      FROM ai_request_log
      GROUP BY user_id, workout_id
      ORDER BY count DESC
      LIMIT 5
    `;

    console.log('AI Request Logs by User/Workout:');
    console.table(logs);

    const total = await sql`SELECT COUNT(*) as total FROM ai_request_log`;
    console.log('\nTotal AI requests logged:', total[0].total);

    const recent = await sql`
      SELECT id, user_id, workout_id, created_at
      FROM ai_request_log
      ORDER BY created_at DESC
      LIMIT 10
    `;

    console.log('\nMost Recent Requests:');
    console.table(recent);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkLogs();
