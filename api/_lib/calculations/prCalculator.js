/**
 * Personal Record (PR) Calculation Utilities
 *
 * Uses Brzycki formula for 1RM estimation
 */

/**
 * Calculate estimated 1RM using Brzycki formula
 *
 * Formula: 1RM = weight / (1.0278 - 0.0278 × reps)
 *
 * @param {number} weight - Weight lifted in lbs
 * @param {number} reps - Number of repetitions
 * @returns {number|null} Estimated 1RM, rounded to 2 decimal places, or null if invalid input
 *
 * @example
 * const oneRM = calculateEstimated1RM(225, 5); // ~248.63 lbs
 */
export function calculateEstimated1RM(weight, reps) {
  if (!weight || !reps || reps <= 0) {
    return null;
  }

  const estimated = weight / (1.0278 - 0.0278 * reps);
  return Math.round(estimated * 100) / 100; // Round to 2 decimal places
}

/**
 * Returns SQL expression for calculating estimated 1RM
 * Use this in SELECT clauses
 *
 * @returns {string} SQL CASE expression for Brzycki formula
 *
 * @example
 * const query = sql`
 *   SELECT
 *     s.weight,
 *     s.reps,
 *     ${sql.raw(calculateEstimated1RMSQL())} as estimated_1rm
 *   FROM "set" s
 * `;
 */
export function calculateEstimated1RMSQL() {
  return `
    CASE
      WHEN s.reps > 0 AND s.weight IS NOT NULL THEN
        ROUND(s.weight / (1.0278 - 0.0278 * s.reps), 2)
      ELSE NULL
    END
  `;
}

/**
 * Standard rep ranges for PR tracking
 */
export const REP_RANGES = [
  { name: '1RM', min: 1, max: 1 },
  { name: '3RM', min: 2, max: 3 },
  { name: '5RM', min: 4, max: 6 },
  { name: '10RM', min: 8, max: 12 }
];

/**
 * Order for sorting rep ranges
 */
export const REP_RANGE_ORDER = { '1RM': 1, '3RM': 2, '5RM': 3, '10RM': 4 };

/**
 * Find which rep range a given rep count falls into
 *
 * @param {number} reps - Number of repetitions
 * @returns {string|null} Rep range name ('1RM', '3RM', '5RM', '10RM') or null if outside all ranges
 */
export function findRepRange(reps) {
  for (const range of REP_RANGES) {
    if (reps >= range.min && reps <= range.max) {
      return range.name;
    }
  }
  return null;
}
