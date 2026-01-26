// AI Workout Assistant Endpoint
// POST /api/ai/workout-assistant
// Provides AI-powered workout guidance with rate limiting and safety guardrails

import OpenAI from 'openai';
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/middleware/auth.js';

// Initialize OpenAI client
const apiKey = process.env.OPENAI_API_KEY;
console.log('[AI] OpenAI API Key loaded:', apiKey ? `${apiKey.substring(0, 15)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET');
console.log('[AI] API Key length:', apiKey?.length || 0);

const openai = new OpenAI({
  apiKey: apiKey,
});

// Rate limiting constants
const MAX_REQUESTS_PER_WORKOUT = 20;
const MAX_REQUESTS_PER_DAY = 100;
const AI_TIMEOUT_MS = 5000; // 5 seconds

// System prompt enforcing tentative language and safety
const SYSTEM_PROMPT = `You are an AI workout assistant for GymBrAIn, a workout tracking app. Your role is to provide helpful, supportive guidance to users during their workouts.

CRITICAL SAFETY RULES:
1. Always use tentative, suggestive language (e.g., "you might consider", "it could help", "some people find")
2. NEVER give prescriptive medical advice or diagnose injuries
3. NEVER tell users to push through pain or ignore warning signs
4. Always recommend consulting a healthcare professional for injuries or medical concerns
5. Emphasize that you're an AI assistant, not a certified trainer or medical professional

YOUR CAPABILITIES:
- Suggest rest times based on recent performance
- Provide form cues and technique tips (general knowledge only)
- Offer motivation and encouragement
- Help interpret RIR (Reps in Reserve) and fatigue levels
- Suggest exercise alternatives or progressions

CONTEXT YOU RECEIVE:
- Current exercise name
- Recent sets (weight, reps, RIR)
- Workout name
- Previous conversation history

Keep responses concise (2-3 sentences max). Be encouraging but realistic. If asked about pain, injuries, or medical issues, always recommend professional consultation.`;

/**
 * Check if user has exceeded rate limits
 */
async function checkRateLimit(userId, workoutId = null) {
  const now = new Date();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

  try {
    // Check daily user limit
    const dailyCount = await sql`
      SELECT COUNT(*) as count
      FROM ai_request_log
      WHERE user_id = ${userId}
        AND created_at > ${oneDayAgo.toISOString()}
    `;

    if (dailyCount[0]?.count >= MAX_REQUESTS_PER_DAY) {
      return {
        allowed: false,
        reason: `Daily limit of ${MAX_REQUESTS_PER_DAY} AI requests reached. Resets in 24 hours.`,
      };
    }

    // Check per-workout limit (if workout ID provided)
    if (workoutId) {
      const workoutCount = await sql`
        SELECT COUNT(*) as count
        FROM ai_request_log
        WHERE user_id = ${userId}
          AND workout_id = ${workoutId}
          AND created_at > ${oneDayAgo.toISOString()}
      `;

      if (workoutCount[0]?.count >= MAX_REQUESTS_PER_WORKOUT) {
        return {
          allowed: false,
          reason: `Workout limit of ${MAX_REQUESTS_PER_WORKOUT} AI requests reached for this session.`,
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // If rate limit check fails, allow request but log error
    // This prevents blocking users if the logging table has issues
    return { allowed: true };
  }
}

/**
 * Log AI request for rate limiting
 */
async function logAIRequest(userId, workoutId = null) {
  try {
    await sql`
      INSERT INTO ai_request_log (user_id, workout_id, created_at)
      VALUES (${userId}, ${workoutId}, ${new Date().toISOString()})
    `;
  } catch (error) {
    console.error('Failed to log AI request:', error);
    // Don't throw - logging failure shouldn't block the request
  }
}

/**
 * Build messages array for OpenAI API
 */
function buildMessages(userMessage, context) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  // Add conversation history if provided (limited to last 3 exchanges)
  if (context.conversation_history && Array.isArray(context.conversation_history)) {
    const recentHistory = context.conversation_history.slice(-6); // Last 3 exchanges (user + assistant)
    messages.push(...recentHistory);
  }

  // Build context-aware user message
  let contextualMessage = userMessage;

  if (context.current_exercise) {
    contextualMessage += `\n\nCurrent exercise: ${context.current_exercise}`;
  }

  if (context.recent_sets && context.recent_sets.length > 0) {
    const setsInfo = context.recent_sets
      .slice(-3) // Last 3 sets only
      .map((set, i) => {
        const parts = [];
        if (set.weight !== undefined && set.weight !== null) parts.push(`${set.weight} lbs`);
        if (set.reps) parts.push(`${set.reps} reps`);
        if (set.rir !== undefined && set.rir !== null) parts.push(`RIR ${set.rir}`);
        return `Set ${i + 1}: ${parts.join(', ')}`;
      })
      .join('\n');

    contextualMessage += `\n\nRecent sets:\n${setsInfo}`;
  }

  if (context.workout_name) {
    contextualMessage += `\n\nWorkout: ${context.workout_name}`;
  }

  messages.push({ role: 'user', content: contextualMessage });

  return messages;
}

/**
 * Call OpenAI API with timeout
 */
async function callOpenAI(messages) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 150, // Keep responses concise
        temperature: 0.7, // Balanced between consistency and variety
      },
      {
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    return response.choices[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('AI request timed out');
    }

    throw error;
  }
}

/**
 * Main handler
 */
async function handlePost(req, res) {
  console.log('[AI] handlePost called - user:', req.user?.userId);
  const userId = req.user.userId;

  try {
    // Validate request body
    const { message, context } = req.body;
    console.log('[AI] Message received:', message?.substring(0, 50));

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      console.log('[AI] Validation failed: empty message');
      return res.status(400).json({
        error: 'Message is required and must be a non-empty string',
      });
    }

    if (message.length > 500) {
      console.log('[AI] Validation failed: message too long');
      return res.status(400).json({
        error: 'Message must be 500 characters or less',
      });
    }

    // Extract workout ID from context (optional)
    const workoutId = context?.workout_id || null;
    console.log('[AI] Workout ID:', workoutId);

    // Check rate limits
    console.log('[AI] Checking rate limits...');
    const rateLimitCheck = await checkRateLimit(userId, workoutId);
    if (!rateLimitCheck.allowed) {
      console.log('[AI] Rate limit exceeded');
      return res.status(429).json({
        error: rateLimitCheck.reason,
        retryAfter: 86400, // 24 hours in seconds
      });
    }

    // Log request BEFORE calling OpenAI (for accurate rate limiting)
    console.log('[AI] Logging request...');
    await logAIRequest(userId, workoutId);

    // Build messages for OpenAI
    console.log('[AI] Building messages...');
    const messages = buildMessages(message, context || {});

    // Call OpenAI with timeout
    console.log('[AI] Calling OpenAI API...');
    let aiResponse;
    try {
      aiResponse = await callOpenAI(messages);
      console.log('[AI] OpenAI response received:', aiResponse?.substring(0, 50));
    } catch (error) {
      console.error('[AI] OpenAI API error type:', error.constructor.name);
      console.error('[AI] OpenAI API error message:', error.message);
      console.error('[AI] OpenAI API error:', error);

      if (error.message === 'AI request timed out') {
        return res.status(200).json({
          response: 'The AI assistant is taking longer than usual to respond. Please continue with your workout normally, and feel free to try again.',
          timeout: true,
        });
      }

      // Generic error fallback
      return res.status(200).json({
        response: 'The AI assistant is temporarily unavailable. Continue logging your workout normally.',
        error: true,
      });
    }

    // Return response
    return res.status(200).json({
      response: aiResponse,
      model: 'gpt-4o-mini',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AI assistant error:', error);
    return res.status(500).json({
      error: 'Failed to process AI request',
      message: error.message,
    });
  }
}

/**
 * Export handler with auth middleware
 */
export default function handler(req, res) {
  console.log('[AI] Handler called - method:', req.method, 'path:', req.path);

  if (req.method === 'POST') {
    return requireAuth(handlePost)(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
