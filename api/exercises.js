import { sql } from './_lib/db.js';
import { optionalAuth, requireAuth } from './_lib/middleware/auth.js';
import { checkForDuplicates } from './_lib/fuzzyMatch.js';

/**
 * GET /api/exercises
 *
 * Get exercise library (all non-archived exercises)
 * Includes library exercises (created_by IS NULL) and user's custom exercises
 *
 * Query params:
 * - muscle: Filter by muscle group (e.g., ?muscle=chest)
 * - equipment: Filter by equipment (e.g., ?equipment=barbell)
 * - type: Filter by type (e.g., ?type=weighted)
 *
 * Response:
 * {
 *   "exercises": [
 *     {
 *       "id": "uuid",
 *       "name": "Bench Press",
 *       "type": "weighted",
 *       "equipment": "barbell",
 *       "primaryMuscles": ["chest"],
 *       "secondaryMuscles": ["triceps", "shoulders"],
 *       "isCustom": false,
 *       "isArchived": false,
 *       "createdBy": null
 *     }
 *   ]
 * }
 */
async function handleGet(req, res) {
  try {
    const { muscle, equipment, type } = req.query;
    const userId = req.user?.userId || null;

    // Fetch all non-archived exercises accessible to user
    let allExercises;

    if (userId) {
      // Include library exercises + user's custom exercises
      allExercises = await sql`
        SELECT
          id, name, type, equipment, primary_muscles, secondary_muscles,
          is_custom, is_archived, created_by
        FROM exercise
        WHERE is_archived = false
          AND (created_by IS NULL OR created_by = ${userId})
        ORDER BY
          CASE WHEN created_by IS NULL THEN 0 ELSE 1 END,
          name ASC
      `;
    } else {
      // Only library exercises for unauthenticated users
      allExercises = await sql`
        SELECT
          id, name, type, equipment, primary_muscles, secondary_muscles,
          is_custom, is_archived, created_by
        FROM exercise
        WHERE is_archived = false
          AND created_by IS NULL
        ORDER BY name ASC
      `;
    }

    // Apply client-side filters (simpler than complex SQL)
    let exercises = allExercises;

    if (muscle) {
      const muscleLower = muscle.toLowerCase();
      exercises = exercises.filter(ex =>
        ex.primary_muscles?.includes(muscleLower) ||
        ex.secondary_muscles?.includes(muscleLower)
      );
    }

    if (equipment) {
      const equipmentLower = equipment.toLowerCase();
      exercises = exercises.filter(ex => ex.equipment === equipmentLower);
    }

    if (type) {
      const typeLower = type.toLowerCase();
      exercises = exercises.filter(ex => ex.type === typeLower);
    }

    // Transform to camelCase for frontend
    const formattedExercises = exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      type: ex.type,
      equipment: ex.equipment,
      primaryMuscles: ex.primary_muscles || [],
      secondaryMuscles: ex.secondary_muscles || [],
      isCustom: ex.is_custom,
      isArchived: ex.is_archived,
      createdBy: ex.created_by
    }));

    return res.status(200).json({
      exercises: formattedExercises
    });

  } catch (error) {
    console.error('Get exercises error:', error);
    return res.status(500).json({
      error: 'Failed to fetch exercises',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * POST /api/exercises
 *
 * Create a custom exercise (requires authentication)
 *
 * Request body:
 * {
 *   "name": "string (1-100 chars)",
 *   "type": "weighted | bodyweight | cardio | timed",
 *   "equipment": "barbell | dumbbell | cable | machine | bodyweight | other",
 *   "primaryMuscles": ["chest", "triceps"],
 *   "secondaryMuscles": ["shoulders"],
 *   "skipDuplicateCheck": false (optional, if user confirmed creation despite duplicates)
 * }
 *
 * Response (if duplicates found and skipDuplicateCheck=false):
 * {
 *   "proceed": false,
 *   "suggestions": [
 *     {
 *       "id": "uuid",
 *       "name": "Bench Press",
 *       "similarity": 85,
 *       "type": "weighted",
 *       "equipment": "barbell"
 *     }
 *   ]
 * }
 *
 * Response (if created successfully):
 * {
 *   "exercise": {
 *     "id": "uuid",
 *     "name": "Custom Exercise",
 *     ...
 *   }
 * }
 */
async function handlePost(req, res) {
  try {
    const userId = req.user.userId;
    const {
      name,
      type,
      equipment,
      primaryMuscles = [],
      secondaryMuscles = [],
      skipDuplicateCheck = false
    } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.length < 1 || name.length > 100) {
      return res.status(400).json({ error: 'Exercise name must be 1-100 characters' });
    }

    const validTypes = ['weighted', 'bodyweight', 'cardio', 'timed'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({
        error: `Type must be one of: ${validTypes.join(', ')}`
      });
    }

    const validEquipment = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'other'];
    if (!equipment || !validEquipment.includes(equipment)) {
      return res.status(400).json({
        error: `Equipment must be one of: ${validEquipment.join(', ')}`
      });
    }

    if (!Array.isArray(primaryMuscles) || primaryMuscles.length === 0) {
      return res.status(400).json({ error: 'At least one primary muscle group is required' });
    }

    if (!Array.isArray(secondaryMuscles)) {
      return res.status(400).json({ error: 'Secondary muscles must be an array' });
    }

    // Check for duplicates unless user explicitly confirmed
    if (!skipDuplicateCheck) {
      // Fetch all non-archived exercises
      const allExercises = await sql`
        SELECT id, name, type, equipment, primary_muscles, secondary_muscles
        FROM exercise
        WHERE is_archived = false
      `;

      const duplicateCheck = checkForDuplicates(name, allExercises, 70);

      if (duplicateCheck.isDuplicate) {
        return res.status(200).json({
          proceed: false,
          suggestions: duplicateCheck.suggestions
        });
      }
    }

    // Create custom exercise
    const result = await sql`
      INSERT INTO exercise (
        name,
        type,
        equipment,
        primary_muscles,
        secondary_muscles,
        is_custom,
        is_archived,
        created_by
      )
      VALUES (
        ${name},
        ${type},
        ${equipment},
        ${primaryMuscles},
        ${secondaryMuscles},
        true,
        false,
        ${userId}
      )
      RETURNING *
    `;

    const exercise = result[0];

    return res.status(201).json({
      exercise: {
        id: exercise.id,
        name: exercise.name,
        type: exercise.type,
        equipment: exercise.equipment,
        primaryMuscles: exercise.primary_muscles,
        secondaryMuscles: exercise.secondary_muscles,
        isCustom: exercise.is_custom,
        isArchived: exercise.is_archived,
        createdBy: exercise.created_by
      }
    });

  } catch (error) {
    console.error('Create exercise error:', error);
    return res.status(500).json({
      error: 'Failed to create exercise',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * Main handler - routes based on HTTP method
 */
export default async function handler(req, res) {
  if (req.method === 'GET') {
    // GET is optionally authenticated (works for both logged in and anonymous)
    return optionalAuth(handleGet)(req, res);
  } else if (req.method === 'POST') {
    // POST requires authentication
    return requireAuth(handlePost)(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
