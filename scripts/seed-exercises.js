/**
 * Quick script to seed preset exercises into the database
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

// Preset exercises data
const chestExercises = [
  ['Barbell Bench Press', 'weighted', 'barbell', ['chest'], ['shoulders', 'triceps']],
  ['Incline Barbell Bench Press', 'weighted', 'barbell', ['chest'], ['shoulders', 'triceps']],
  ['Dumbbell Bench Press', 'weighted', 'dumbbell', ['chest'], ['shoulders', 'triceps']],
  ['Incline Dumbbell Press', 'weighted', 'dumbbell', ['chest'], ['shoulders', 'triceps']],
  ['Cable Fly', 'weighted', 'cable', ['chest'], ['shoulders']],
  ['Dumbbell Fly', 'weighted', 'dumbbell', ['chest'], ['shoulders']],
  ['Push-Up', 'bodyweight', 'bodyweight', ['chest'], ['shoulders', 'triceps', 'core']],
  ['Dip', 'bodyweight', 'bodyweight', ['chest', 'triceps'], ['shoulders']],
  ['Pec Deck Machine', 'weighted', 'machine', ['chest'], []],
  ['Decline Barbell Press', 'weighted', 'barbell', ['chest'], ['shoulders', 'triceps']],
];

const backExercises = [
  ['Conventional Deadlift', 'weighted', 'barbell', ['back', 'glutes', 'hamstrings'], ['core', 'traps']],
  ['Barbell Row', 'weighted', 'barbell', ['back'], ['biceps', 'core']],
  ['Lat Pulldown', 'weighted', 'cable', ['back'], ['biceps']],
  ['Pull-Up', 'bodyweight', 'bodyweight', ['back'], ['biceps', 'core']],
  ['Seated Cable Row', 'weighted', 'cable', ['back'], ['biceps']],
  ['T-Bar Row', 'weighted', 'barbell', ['back'], ['biceps', 'core']],
  ['Dumbbell Row', 'weighted', 'dumbbell', ['back'], ['biceps']],
  ['Chin-Up', 'bodyweight', 'bodyweight', ['back'], ['biceps']],
  ['Face Pull', 'weighted', 'cable', ['back'], ['rear delts']],
  ['Hyperextension', 'bodyweight', 'machine', ['back', 'glutes'], ['hamstrings']],
  ['Assisted Pull-Up', 'weighted', 'machine', ['back'], ['biceps']],
];

const shoulderExercises = [
  ['Overhead Press', 'weighted', 'barbell', ['shoulders'], ['triceps', 'core']],
  ['Dumbbell Shoulder Press', 'weighted', 'dumbbell', ['shoulders'], ['triceps']],
  ['Lateral Raise', 'weighted', 'dumbbell', ['shoulders'], []],
  ['Front Raise', 'weighted', 'dumbbell', ['shoulders'], []],
  ['Arnold Press', 'weighted', 'dumbbell', ['shoulders'], ['triceps']],
  ['Cable Lateral Raise', 'weighted', 'cable', ['shoulders'], []],
  ['Reverse Fly', 'weighted', 'dumbbell', ['shoulders'], ['back']],
  ['Upright Row', 'weighted', 'barbell', ['shoulders'], ['traps']],
];

const allExercises = [...chestExercises, ...backExercises, ...shoulderExercises];

async function seedExercises() {
  console.log('🌱 Seeding preset exercises...');
  console.log(`📝 Preparing to insert ${allExercises.length} exercises`);

  let inserted = 0;
  let skipped = 0;

  for (const [name, type, equipment, primaryMuscles, secondaryMuscles] of allExercises) {
    try {
      await sql`
        INSERT INTO exercise (name, type, equipment, primary_muscles, secondary_muscles, is_custom, is_archived, created_by)
        VALUES (${name}, ${type}, ${equipment}, ${primaryMuscles}, ${secondaryMuscles}, false, false, NULL)
      `;
      inserted++;
      process.stdout.write('.');
    } catch (error) {
      if (error.message.includes('duplicate key')) {
        skipped++;
      } else {
        console.error(`\n❌ Error inserting ${name}:`, error.message);
      }
    }
  }

  console.log(`\n✅ Inserted ${inserted} exercises, skipped ${skipped} duplicates`);

  // Verify
  const count = await sql`SELECT COUNT(*) as count FROM exercise WHERE created_by IS NULL`;
  console.log(`📊 Total preset exercises in database: ${count[0].count}`);
}

seedExercises();
