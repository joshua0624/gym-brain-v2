/**
 * Database Migration Runner
 *
 * Runs SQL migration files against Neon Postgres database
 * Usage: node scripts/run-migrations.js
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

// Validate DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  console.error('Please add it to your .env.local file');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Migration files in order
const migrations = [
  '001_initial_schema.sql',
  '002_seed_exercises.sql',
  '003_add_is_completed_columns.sql',
  '004_add_ai_request_log.sql'
];

/**
 * Split SQL file into individual statements
 * Handles multi-line statements, dollar-quoted strings, and filters out comments
 */
function splitSQLStatements(sqlContent) {
  const statements = [];
  let currentStatement = '';
  let inDollarQuote = false;
  let dollarQuoteTag = '';
  let inBlockComment = false;

  const lines = sqlContent.split('\n');

  for (let line of lines) {
    // Skip single-line comments (unless in dollar quote)
    if (!inDollarQuote && !inBlockComment && line.trim().startsWith('--')) {
      continue;
    }

    // Handle block comments
    if (!inDollarQuote) {
      if (line.includes('/*')) {
        inBlockComment = true;
      }
      if (inBlockComment && line.includes('*/')) {
        inBlockComment = false;
        continue;
      }
      if (inBlockComment) {
        continue;
      }
    }

    // Remove inline comments (unless in dollar quote)
    if (!inDollarQuote) {
      const commentIndex = line.indexOf('--');
      if (commentIndex !== -1) {
        line = line.substring(0, commentIndex);
      }
    }

    // Check for dollar quotes ($$)
    const dollarMatches = line.match(/\$\$|\$[a-zA-Z_][a-zA-Z0-9_]*\$/g);
    if (dollarMatches) {
      for (const match of dollarMatches) {
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarQuoteTag = match;
        } else if (match === dollarQuoteTag) {
          inDollarQuote = false;
          dollarQuoteTag = '';
        }
      }
    }

    currentStatement += line + '\n';

    // Check for statement end (semicolon not in dollar quote)
    if (!inDollarQuote && line.includes(';')) {
      const parts = currentStatement.split(';');
      for (let i = 0; i < parts.length - 1; i++) {
        const stmt = parts[i].trim();
        if (stmt.length > 0) {
          statements.push(stmt);
        }
      }
      currentStatement = parts[parts.length - 1];
    }
  }

  // Add any remaining statement
  if (currentStatement.trim().length > 0) {
    statements.push(currentStatement.trim());
  }

  return statements.filter(stmt => stmt.length > 0);
}

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  for (const migrationFile of migrations) {
    try {
      const filePath = join(__dirname, '..', 'migrations', migrationFile);
      console.log(`📄 Running migration: ${migrationFile}`);

      // Read the SQL file
      const migrationSQL = readFileSync(filePath, 'utf-8');

      // Split into individual statements
      const statements = splitSQLStatements(migrationSQL);
      console.log(`   Found ${statements.length} SQL statements`);

      // Execute each statement
      for (let i = 0; i < statements.length; i++) {
        try {
          await sql([statements[i]]);
        } catch (error) {
          // Check if it's a benign "already exists" error
          if (error.message.includes('already exists')) {
            console.log(`   ⚠️  Skipping statement ${i + 1} (object already exists)`);
            continue;
          }
          throw error;
        }
      }

      console.log(`✅ ${migrationFile} completed successfully\n`);
    } catch (error) {
      console.error(`❌ Error running ${migrationFile}:`);
      console.error(error.message);

      console.error('\n🛑 Migration failed. Please fix the error and try again.');
      process.exit(1);
    }
  }

  console.log('✨ All migrations completed successfully!');

  // Verify the setup
  console.log('\n📊 Verifying database setup...');
  try {
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log(`\n✅ Found ${tables.length} tables:`);
    tables.forEach(t => console.log(`   - ${t.table_name}`));

    const exerciseCount = await sql`SELECT COUNT(*) as count FROM exercise`;
    console.log(`\n✅ Exercise library: ${exerciseCount[0].count} exercises loaded`);

    const schemaVersion = await sql`SELECT * FROM schema_version ORDER BY applied_at DESC LIMIT 1`;
    console.log(`✅ Schema version: ${schemaVersion[0].version} - ${schemaVersion[0].description}`);

  } catch (error) {
    console.error('⚠️  Could not verify setup:', error.message);
  }

  console.log('\n🎉 Database is ready to use!');
}

// Run migrations
runMigrations().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
