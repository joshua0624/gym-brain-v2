import { sql } from '../_lib/db.js';
import {
  verifyPassword,
  generateJWT,
  generateRefreshToken
} from '../_lib/auth.js';

/**
 * POST /api/auth/login
 *
 * Authenticate user and return JWT tokens
 *
 * Request body:
 * {
 *   "usernameOrEmail": "string (username or email)",
 *   "password": "string",
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
    const { usernameOrEmail, password, rememberMe = false } = req.body;

    // Validate inputs
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    // Find user by username or email
    // Check if input looks like an email (contains @)
    const isEmail = usernameOrEmail.includes('@');

    let user;
    if (isEmail) {
      const result = await sql`
        SELECT id, username, email, password_hash, created_at
        FROM "user"
        WHERE email = ${usernameOrEmail}
      `;
      user = result[0];
    } else {
      const result = await sql`
        SELECT id, username, email, password_hash, created_at
        FROM "user"
        WHERE username = ${usernameOrEmail}
      `;
      user = result[0];
    }

    // User not found
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateJWT(user.id);
    const refreshToken = generateRefreshToken(user.id, rememberMe);

    // Return user data and tokens (exclude password_hash)
    return res.status(200).json({
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
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Login failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
