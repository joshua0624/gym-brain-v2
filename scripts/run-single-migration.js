/**
 * Run a single migration file as-is (no splitting)
 * Usage: node scripts/run-single-migration.js migrations/001_initial_schema.sql
 */

import { readFileSync } from 'fs';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const migrationFile = process.argv[2] || 'migrations/001_initial_schema.sql';

console.log(`🚀 Running migration: ${migrationFile}\n`);

try {
  const migrationSQL = readFileSync(migrationFile, 'utf-8');

  // Execute the entire file as-is
  await sql(migrationSQL);

  console.log('✅ Migration completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:');
  console.error(error.message);
  console.error('\nFull error:', error);
  process.exit(1);
}
