/**
 * One-off script to add is_completed columns
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    console.log('🚀 Adding is_completed columns...\n');

    // Add is_completed to workout_exercise table
    console.log('1. Adding is_completed to workout_exercise table...');
    await sql`
      ALTER TABLE workout_exercise
      ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE NOT NULL
    `;
    console.log('   ✅ Done\n');

    // Add is_completed to set table
    console.log('2. Adding is_completed to set table...');
    await sql`
      ALTER TABLE "set"
      ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT TRUE NOT NULL
    `;
    console.log('   ✅ Done\n');

    // Update schema version
    console.log('3. Updating schema version...');
    await sql`
      INSERT INTO schema_version (version, description)
      VALUES ('1.0.1', 'Add is_completed columns to workout_exercise and set tables')
      ON CONFLICT (version) DO NOTHING
    `;
    console.log('   ✅ Done\n');

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

run();
