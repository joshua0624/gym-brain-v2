/**
 * Seed Test Data Script
 *
 * Creates a test user account with sample workout data for testing Progress/History features.
 * Run with: node scripts/seed-test-data.js
 */

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const sql = neon(process.env.DATABASE_URL);

// Test user credentials
const TEST_USER = {
  email: 'test@gymbrain.local',
  username: 'testuser',
  password: 'TestPassword123!',
  displayName: 'Test User'
};

async function seedTestData() {
  console.log('🌱 Seeding test data...\n');

  try {
    // 1. Create or find test user
    console.log('👤 Creating test user...');
    const existingUser = await sql`
      SELECT id FROM "user" WHERE email = ${TEST_USER.email} OR username = ${TEST_USER.username}
    `;

    let userId;
    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      console.log(`   ℹ️  Test user already exists (ID: ${userId})`);

      // Delete existing test data
      console.log('   🧹 Cleaning up old test data...');
      await sql`DELETE FROM "set" WHERE workout_exercise_id IN (
        SELECT we.id FROM workout_exercise we
        JOIN workout w ON we.workout_id = w.id
        WHERE w.user_id = ${userId}
      )`;
      await sql`DELETE FROM workout_exercise WHERE workout_id IN (
        SELECT id FROM workout WHERE user_id = ${userId}
      )`;
      await sql`DELETE FROM workout WHERE user_id = ${userId}`;
    } else {
      const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);
      const newUser = await sql`
        INSERT INTO "user" (username, email, password_hash, display_name, created_at, updated_at)
        VALUES (${TEST_USER.username}, ${TEST_USER.email}, ${hashedPassword}, ${TEST_USER.displayName}, NOW(), NOW())
        RETURNING id
      `;
      userId = newUser[0].id;
      console.log(`   ✅ Test user created (ID: ${userId})`);
    }

    // 2. Get exercises (use existing exercises from database)
    console.log('\n💪 Finding exercises...');
    const exercises = await sql`
      SELECT id, name, type
      FROM exercise
      WHERE name IN ('Barbell Bench Press', 'Barbell Squat', 'Conventional Deadlift')
      AND created_by IS NULL
      ORDER BY name
      LIMIT 3
    `;
    console.log(`   ✅ Found ${exercises.length} exercises`);

    if (exercises.length === 0) {
      throw new Error('No exercises found! Run migrations first.');
    }

    // 3. Create workouts with progressive overload over the past 4 weeks
    console.log('\n🏋️  Creating workouts...');
    const workoutsData = [];
    const now = new Date();

    // Create 12 workouts over the past 4 weeks (3 per week)
    for (let week = 0; week < 4; week++) {
      for (let day = 0; day < 3; day++) {
        const daysAgo = (3 - week) * 7 + (2 - day) * 2; // Spread across the week
        const workoutDate = new Date(now);
        workoutDate.setDate(workoutDate.getDate() - daysAgo);
        workoutDate.setHours(10 + day * 2, 0, 0, 0); // Stagger times

        // Pick 2 exercises for this workout
        const workoutExercises = [
          exercises[day % exercises.length],
          exercises[(day + 1) % exercises.length]
        ];

        workoutsData.push({
          date: workoutDate,
          exercises: workoutExercises,
          weekNumber: week
        });
      }
    }

    let workoutCount = 0;
    let totalSets = 0;

    for (const workoutData of workoutsData) {
      const startedAt = new Date(workoutData.date);
      const completedAt = new Date(startedAt);
      completedAt.setMinutes(completedAt.getMinutes() + 45); // 45 min workout

      // Create workout
      const workout = await sql`
        INSERT INTO workout (
          user_id,
          name,
          started_at,
          completed_at,
          duration_seconds,
          created_at,
          updated_at
        )
        VALUES (
          ${userId},
          ${'Workout ' + workoutData.date.toLocaleDateString()},
          ${startedAt.toISOString()},
          ${completedAt.toISOString()},
          ${45 * 60},
          NOW(),
          NOW()
        )
        RETURNING id
      `;
      const workoutId = workout[0].id;

      let workoutVolume = 0;

      // Add exercises to workout
      for (let i = 0; i < workoutData.exercises.length; i++) {
        const exercise = workoutData.exercises[i];

        const workoutExercise = await sql`
          INSERT INTO workout_exercise (
            workout_id,
            exercise_id,
            order_index,
            is_completed,
            created_at
          )
          VALUES (
            ${workoutId},
            ${exercise.id},
            ${i},
            true,
            NOW()
          )
          RETURNING id
        `;
        const workoutExerciseId = workoutExercise[0].id;

        // Add sets with progressive overload (weight increases over weeks)
        const baseWeight = exercise.name.includes('Bench') ? 135 :
                          exercise.name.includes('Squat') ? 185 : 225;
        const weightIncrement = workoutData.weekNumber * 10; // Add 10 lbs per week

        const numSets = 3;
        for (let setNum = 1; setNum <= numSets; setNum++) {
          const weight = baseWeight + weightIncrement;
          const reps = 5;
          const rir = setNum === numSets ? 0 : 1;

          await sql`
            INSERT INTO "set" (
              workout_exercise_id,
              set_number,
              weight,
              reps,
              rir,
              is_warmup,
              is_completed,
              created_at,
              completed_at
            )
            VALUES (
              ${workoutExerciseId},
              ${setNum},
              ${weight},
              ${reps},
              ${rir},
              false,
              true,
              NOW(),
              NOW()
            )
          `;

          workoutVolume += weight * reps;
          totalSets++;
        }
      }

      // Update workout with total volume
      await sql`
        UPDATE workout
        SET total_volume = ${workoutVolume}
        WHERE id = ${workoutId}
      `;

      workoutCount++;
      process.stdout.write(`\r   Creating workouts... ${workoutCount}/${workoutsData.length}`);
    }

    console.log('\n   ✅ Created ' + workoutCount + ' workouts with ' + totalSets + ' sets');

    // 4. Show summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test data seeded successfully!\n');
    console.log('📋 Test Account Credentials:');
    console.log('   Email:    ' + TEST_USER.email);
    console.log('   Password: ' + TEST_USER.password);
    console.log('\n📊 Data Summary:');
    console.log('   Workouts: ' + workoutCount);
    console.log('   Exercises: ' + exercises.map(e => e.name).join(', '));
    console.log('   Total Sets: ' + totalSets);
    console.log('   Date Range: Past 4 weeks with progressive overload');
    console.log('='.repeat(60));
    console.log('\n🎯 You can now login with the test account to view:');
    console.log('   • Workout History');
    console.log('   • Progress Charts (with increasing weight over time)');
    console.log('   • Personal Records');
    console.log('   • Weekly Statistics\n');

  } catch (error) {
    console.error('\n❌ Error seeding test data:', error);
    process.exit(1);
  }
}

seedTestData();
