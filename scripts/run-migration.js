import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function runMigration() {
  try {
    // Check if column already exists
    const check = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'set' AND column_name = 'is_completed'
    `;

    if (check.length > 0) {
      console.log('✓ is_completed column already exists');
      return;
    }

    console.log('Running migration 003...');

    // Create schema_version table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS schema_version (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL,
        description TEXT,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Add is_completed to workout_exercise
    await sql`
      ALTER TABLE workout_exercise
      ADD COLUMN is_completed BOOLEAN DEFAULT FALSE NOT NULL
    `;

    // Add is_completed to set table
    await sql`
      ALTER TABLE "set"
      ADD COLUMN is_completed BOOLEAN DEFAULT TRUE NOT NULL
    `;

    // Record migration
    await sql`
      INSERT INTO schema_version (version, description)
      VALUES ('1.0.1', 'Add is_completed columns to workout_exercise and set tables')
    `;

    console.log('✓ Migration 003 applied successfully');

  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
