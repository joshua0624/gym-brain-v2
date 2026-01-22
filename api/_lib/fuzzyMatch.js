import levenshtein from 'fast-levenshtein';

/**
 * Calculate similarity percentage between two strings
 * Uses Levenshtein distance normalized to 0-100 scale
 *
 * @param {string} str1 - First string to compare
 * @param {string} str2 - Second string to compare
 * @returns {number} Similarity percentage (0-100)
 *
 * @example
 * calculateSimilarity('Bench Press', 'Bench Press') // 100
 * calculateSimilarity('Bench Press', 'Bench Pres') // ~92
 * calculateSimilarity('Bench Press', 'Squat') // ~20
 */
export function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;

  // Normalize strings for comparison (lowercase, trim)
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return 100;

  // Calculate Levenshtein distance
  const distance = levenshtein.get(s1, s2);

  // Normalize to similarity percentage
  // Similarity = 1 - (distance / max_length)
  const maxLength = Math.max(s1.length, s2.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;

  return Math.round(similarity);
}

/**
 * Find exercises that are similar to the given name
 *
 * @param {string} searchName - Exercise name to search for
 * @param {Array} exercises - Array of exercise objects with 'name' field
 * @param {number} threshold - Minimum similarity percentage (default: 70)
 * @returns {Array} Array of { exercise, similarity } objects sorted by similarity
 *
 * @example
 * const suggestions = findSimilarExercises(
 *   'Bench Press',
 *   exercises,
 *   70
 * );
 * // Returns: [
 * //   { exercise: { id: '...', name: 'Bench Press', ... }, similarity: 100 },
 * //   { exercise: { id: '...', name: 'Incline Bench Press', ... }, similarity: 78 }
 * // ]
 */
export function findSimilarExercises(searchName, exercises, threshold = 70) {
  if (!searchName || !exercises || !Array.isArray(exercises)) {
    return [];
  }

  const matches = exercises
    .map(exercise => ({
      exercise,
      similarity: calculateSimilarity(searchName, exercise.name)
    }))
    .filter(match => match.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity); // Sort by similarity descending

  return matches;
}

/**
 * Check if an exercise name is too similar to existing exercises
 * Returns top 3 matches if similarity > threshold
 *
 * @param {string} newExerciseName - Name of exercise being created
 * @param {Array} existingExercises - Array of existing exercise objects
 * @param {number} threshold - Minimum similarity to trigger deduplication (default: 70)
 * @returns {object} { isDuplicate: boolean, suggestions: Array }
 *
 * @example
 * const result = checkForDuplicates('Bench Press', exercises);
 * if (result.isDuplicate) {
 *   console.log('Did you mean:', result.suggestions);
 * }
 */
export function checkForDuplicates(newExerciseName, existingExercises, threshold = 70) {
  const similar = findSimilarExercises(newExerciseName, existingExercises, threshold);

  // Take top 3 matches
  const suggestions = similar.slice(0, 3);

  return {
    isDuplicate: suggestions.length > 0,
    suggestions: suggestions.map(match => ({
      id: match.exercise.id,
      name: match.exercise.name,
      similarity: match.similarity,
      type: match.exercise.type,
      equipment: match.exercise.equipment,
      primaryMuscles: match.exercise.primary_muscles || match.exercise.primaryMuscles
    }))
  };
}
