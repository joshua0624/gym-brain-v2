import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function checkWorkouts() {
  try {
    // Check for workouts
    const workouts = await sql`
      SELECT id, completed_at, created_at
      FROM workout
      ORDER BY completed_at DESC NULLS LAST
      LIMIT 5
    `;

    console.log(`\nFound ${workouts.length} recent workouts`);
    for (const w of workouts) {
      console.log(`  ${w.id}: completed_at=${w.completed_at || 'NULL'}`);
    }

    // Check sets without is_completed
    const incompleteSets = await sql`
      SELECT COUNT(*) as count
      FROM "set"
      WHERE is_completed = false
    `;

    console.log(`\nSets with is_completed=false: ${incompleteSets[0].count}`);

    // Fix: Set all existing sets to is_completed=true
    if (incompleteSets[0].count > 0) {
      console.log('Updating sets to is_completed=true...');
      await sql`
        UPDATE "set"
        SET is_completed = true
        WHERE is_completed = false
      `;
      console.log('✓ Updated all sets to is_completed=true');
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkWorkouts();
