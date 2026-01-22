import { sql } from '../_lib/db.js';
import {
  hashPassword,
  generateJWT,
  generateRefreshToken,
  validateUsername,
  validateEmail,
  validatePassword
} from '../_lib/auth.js';

/**
 * POST /api/auth/register
 *
 * Register a new user account
 *
 * Request body:
 * {
 *   "username": "string (3-30 chars, alphanumeric + underscore)",
 *   "email": "string (required, valid email format)",
 *   "password": "string (min 8 chars)",
 *   "rememberMe": "boolean (optional, default false)"
 * }
 *
 * Response:
 * {
 *   "user": {
 *     "id": "uuid",
 *     "username": "string",
 *     "email": "string"
 *   },
 *   "accessToken": "jwt",
 *   "refreshToken": "jwt"
 * }
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, email, password, rememberMe = false } = req.body;

    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return res.status(400).json({ error: usernameValidation.error });
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Check if username already exists
    const existingUsername = await sql`
      SELECT id FROM "user" WHERE username = ${username}
    `;

    if (existingUsername.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Check if email already exists
    const existingEmail = await sql`
      SELECT id FROM "user" WHERE email = ${email}
    `;

    if (existingEmail.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert new user
    const result = await sql`
      INSERT INTO "user" (username, email, password_hash, created_at)
      VALUES (
        ${username},
        ${email},
        ${passwordHash},
        NOW()
      )
      RETURNING id, username, email, created_at
    `;

    const user = result[0];

    // Generate tokens
    const accessToken = generateJWT(user.id);
    const refreshToken = generateRefreshToken(user.id, rememberMe);

    // Return user data and tokens
    return res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      error: 'Registration failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
