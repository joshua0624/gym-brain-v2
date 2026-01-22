/**
 * Database Verification Script
 *
 * Checks that all migrations ran successfully
 * Usage: node scripts/verify-db.js
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function verify() {
  console.log('🔍 Verifying database setup...\n');

  let allPassed = true;

  // 1. Check all required tables exist
  console.log('📋 Checking tables...');
  const expectedTables = [
    'user',
    'password_reset_token',
    'exercise',
    'template',
    'template_exercise',
    'workout',
    'workout_exercise',
    'set',
    'workout_draft'
  ];

  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;

  const tableNames = tables.map(t => t.table_name);

  for (const expectedTable of expectedTables) {
    if (tableNames.includes(expectedTable)) {
      console.log(`   ✅ ${expectedTable}`);
    } else {
      console.log(`   ❌ ${expectedTable} (MISSING)`);
      allPassed = false;
    }
  }

  // 2. Check exercise library seeded
  console.log('\n📚 Checking exercise library...');
  const exerciseCount = await sql`SELECT COUNT(*) as count FROM exercise`;
  const count = parseInt(exerciseCount[0].count);

  if (count >= 50) {
    console.log(`   ✅ ${count} exercises loaded`);
  } else {
    console.log(`   ⚠️  Only ${count} exercises (expected 50+)`);
    allPassed = false;
  }

  // Check exercise types
  const exerciseTypes = await sql`
    SELECT type, COUNT(*) as count
    FROM exercise
    GROUP BY type
    ORDER BY type
  `;

  console.log('   Exercise types:');
  exerciseTypes.forEach(t => {
    console.log(`     - ${t.type}: ${t.count}`);
  });

  // 3. Check critical columns exist (no sync_status, no is_draft in workout)
  console.log('\n🔍 Checking schema compliance...');

  const workoutColumns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'workout'
  `;

  const workoutColNames = workoutColumns.map(c => c.column_name);

  // Should NOT have these fields
  if (!workoutColNames.includes('sync_status')) {
    console.log('   ✅ workout table does NOT have sync_status (correct)');
  } else {
    console.log('   ❌ workout table has sync_status field (should be client-side only)');
    allPassed = false;
  }

  if (!workoutColNames.includes('is_draft')) {
    console.log('   ✅ workout table does NOT have is_draft (correct)');
  } else {
    console.log('   ❌ workout table has is_draft field (should use workout_draft table)');
    allPassed = false;
  }

  // Should HAVE these fields
  if (workoutColNames.includes('user_id')) {
    console.log('   ✅ workout table has user_id');
  } else {
    console.log('   ❌ workout table missing user_id');
    allPassed = false;
  }

  // Check user table has email as NOT NULL
  const userEmailCol = await sql`
    SELECT is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user'
    AND column_name = 'email'
  `;

  if (userEmailCol[0] && userEmailCol[0].is_nullable === 'NO') {
    console.log('   ✅ user.email is NOT NULL (required for password reset)');
  } else {
    console.log('   ❌ user.email should be NOT NULL');
    allPassed = false;
  }

  // 4. Check indexes exist
  console.log('\n🗂️  Checking critical indexes...');
  const indexes = await sql`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY indexname
  `;

  const criticalIndexes = [
    'idx_workout_user_started',
    'idx_workout_exercise_workout',
    'idx_set_workout_exercise',
    'idx_exercise_type',
    'idx_template_user'
  ];

  const indexNames = indexes.map(i => i.indexname);

  for (const idx of criticalIndexes) {
    if (indexNames.includes(idx)) {
      console.log(`   ✅ ${idx}`);
    } else {
      console.log(`   ⚠️  ${idx} (missing)`);
    }
  }

  console.log(`   Total indexes: ${indexNames.length}`);

  // 5. Check schema version
  console.log('\n📊 Checking schema version...');
  try {
    const schemaVersion = await sql`
      SELECT version, description, applied_at
      FROM schema_version
      ORDER BY applied_at DESC
    `;

    if (schemaVersion.length > 0) {
      console.log('   Schema versions:');
      schemaVersion.forEach(v => {
        console.log(`     - v${v.version}: ${v.description}`);
      });
    } else {
      console.log('   ⚠️  No schema version records found');
    }
  } catch (error) {
    if (error.code === '42P01') {
      console.log('   ℹ️  schema_version table not found (optional tracking table)');
    } else {
      throw error;
    }
  }

  // 6. Test basic queries
  console.log('\n🧪 Running test queries...');

  try {
    // Test exercise query
    const chestExercises = await sql`
      SELECT name
      FROM exercise
      WHERE 'chest' = ANY(primary_muscles)
      LIMIT 5
    `;
    console.log(`   ✅ Exercise query works (found ${chestExercises.length} chest exercises)`);

    // Test constraint
    const constraints = await sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
      AND table_name = 'user'
      AND constraint_type = 'CHECK'
    `;
    console.log(`   ✅ Constraints in place (${constraints.length} CHECK constraints on user table)`);

  } catch (error) {
    console.log(`   ❌ Test query failed: ${error.message}`);
    allPassed = false;
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✨ All checks passed! Database is ready to use.');
  } else {
    console.log('⚠️  Some checks failed. Please review the issues above.');
  }
  console.log('='.repeat(60) + '\n');
}

verify().catch(error => {
  console.error('💥 Verification failed:', error);
  process.exit(1);
});
