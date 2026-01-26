/**
 * Apply AI Request Log Migration
 * Applies migration 004 only
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function applyMigration() {
  console.log('🚀 Applying AI request log migration...\n');

  try {
    const filePath = join(__dirname, '..', 'migrations', '004_add_ai_request_log.sql');
    const migrationSQL = readFileSync(filePath, 'utf-8');

    // Remove comments and split into statements
    const lines = migrationSQL.split('\n');
    const cleanedLines = lines
      .map(line => {
        // Remove inline comments
        const commentIndex = line.indexOf('--');
        if (commentIndex !== -1) {
          return line.substring(0, commentIndex);
        }
        return line;
      })
      .filter(line => line.trim().length > 0);

    const cleanSQL = cleanedLines.join('\n');
    const statements = cleanSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} SQL statements\n`);

    // Execute each statement separately
    for (let i = 0; i < statements.length; i++) {
      try {
        await sql([statements[i]]);
        console.log(`✅ Statement ${i + 1} executed`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ Migration 004 applied successfully!\n');

    // Verify the table was created
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'ai_request_log'
    `;

    if (tables.length > 0) {
      console.log('✅ ai_request_log table created');

      // Check indexes
      const indexes = await sql`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'ai_request_log'
      `;

      console.log(`✅ Created ${indexes.length} indexes:`);
      indexes.forEach(idx => console.log(`   - ${idx.indexname}`));
    } else {
      console.log('⚠️  Warning: ai_request_log table not found');
    }

    console.log('\n🎉 AI rate limiting infrastructure ready!');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Migration already applied (table exists)');
      console.log('✅ AI rate limiting infrastructure ready!');
    } else {
      console.error('❌ Error applying migration:', error.message);
      process.exit(1);
    }
  }
}

applyMigration().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
