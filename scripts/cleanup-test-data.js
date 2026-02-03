/**
 * Cleanup Test Data Script
 *
 * Removes the test user account and all associated data.
 * Run with: node scripts/cleanup-test-data.js
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const sql = neon(process.env.DATABASE_URL);

const TEST_USER_EMAIL = 'test@gymbrain.local';

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...\n');

  try {
    // Find test user
    const user = await sql`
      SELECT id FROM "user" WHERE email = ${TEST_USER_EMAIL}
    `;

    if (user.length === 0) {
      console.log('ℹ️  No test user found. Nothing to clean up.');
      return;
    }

    const userId = user[0].id;
    console.log(`👤 Found test user (ID: ${userId})`);

    // Delete all associated data (in correct order due to foreign keys)
    console.log('   Deleting sets...');
    const deletedSets = await sql`
      DELETE FROM "set" WHERE workout_exercise_id IN (
        SELECT we.id FROM workout_exercise we
        JOIN workout w ON we.workout_id = w.id
        WHERE w.user_id = ${userId}
      )
    `;

    console.log('   Deleting workout exercises...');
    const deletedExercises = await sql`
      DELETE FROM workout_exercise WHERE workout_id IN (
        SELECT id FROM workout WHERE user_id = ${userId}
      )
    `;

    console.log('   Deleting workouts...');
    const deletedWorkouts = await sql`
      DELETE FROM workout WHERE user_id = ${userId}
    `;

    console.log('   Deleting workout drafts...');
    const deletedDrafts = await sql`
      DELETE FROM workout_draft WHERE user_id = ${userId}
    `;

    console.log('   Deleting user...');
    await sql`
      DELETE FROM "user" WHERE id = ${userId}
    `;

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test data cleaned up successfully!\n');
    console.log('📊 Deleted:');
    console.log(`   ${deletedWorkouts.length} workouts`);
    console.log(`   ${deletedExercises.length} workout exercises`);
    console.log(`   ${deletedSets.length} sets`);
    console.log(`   ${deletedDrafts.length} drafts`);
    console.log('   1 user account');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error cleaning up test data:', error);
    process.exit(1);
  }
}

cleanupTestData();
