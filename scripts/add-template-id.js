import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function addTemplateId() {
  try {
    // Check if column already exists
    const check = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'workout' AND column_name = 'template_id'
    `;

    if (check.length > 0) {
      console.log('✓ template_id column already exists');
      return;
    }

    console.log('Adding template_id column to workout table...');

    // Add template_id column
    await sql`
      ALTER TABLE workout
      ADD COLUMN template_id UUID NULL REFERENCES template(id) ON DELETE SET NULL
    `;

    console.log('✓ template_id column added successfully');

  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

addTemplateId();
