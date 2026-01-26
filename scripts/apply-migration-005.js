import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function applyMigration() {
  console.log('🚀 Applying migration 005...\n');

  try {
    const migration = readFileSync('migrations/005_fix_ai_request_log_constraint.sql', 'utf-8');

    // Remove comments and split by semicolon
    const withoutComments = migration
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    const statements = withoutComments
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} SQL statements\n`);

    for (let i = 0; i < statements.length; i++) {
      await sql([statements[i]]);
      console.log(`✅ Statement ${i + 1} executed`);
    }

    console.log('\n✅ Migration 005 applied successfully!');
    console.log('✅ workout_id FK constraint removed - can now log requests for any workout ID\n');
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    process.exit(1);
  }
}

applyMigration();
