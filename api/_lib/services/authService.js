/**
 * Authentication Service
 *
 * Business logic for user authentication and authorization
 */

import crypto from 'crypto';
import { sql } from '../db.js';
import {
  hashPassword,
  verifyPassword,
  generateJWT,
  generateRefreshToken,
  verifyRefreshToken,
  validateUsername,
  validateEmail,
  validatePassword
} from '../auth.js';

/**
 * Login user with username/email and password
 *
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.usernameOrEmail - Username or email
 * @param {string} credentials.password - Plain text password
 * @param {boolean} credentials.rememberMe - Whether to extend refresh token expiry
 * @returns {Promise<Object>} { user, accessToken, refreshToken }
 * @throws {Error} If credentials are invalid
 */
export async function login(credentials) {
  const { usernameOrEmail, password, rememberMe = false } = credentials;

  // Validate inputs
  if (!usernameOrEmail || !password) {
    throw new Error('Username/email and password are required');
  }

  // Find user by username or email
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
    throw new Error('Invalid credentials');
  }

  // Verify password
  const isPasswordValid = await verifyPassword(password, user.password_hash);

  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Generate tokens
  const accessToken = generateJWT(user.id);
  const refreshToken = generateRefreshToken(user.id, rememberMe);

  // Return user data and tokens (exclude password_hash)
  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.created_at
    },
    accessToken,
    refreshToken
  };
}

/**
 * Register a new user account
 *
 * @param {Object} userData - User registration data
 * @param {string} userData.username - Username (3-30 chars, alphanumeric + underscore)
 * @param {string} userData.email - Email address
 * @param {string} userData.password - Plain text password (min 8 chars)
 * @param {boolean} userData.rememberMe - Whether to extend refresh token expiry
 * @returns {Promise<Object>} { user, accessToken, refreshToken }
 * @throws {Error} If validation fails or user already exists
 */
export async function register(userData) {
  const { username, email, password, rememberMe = false } = userData;

  // Validate username
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    throw new Error(usernameValidation.error);
  }

  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    throw new Error(emailValidation.error);
  }

  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.error);
  }

  // Check if username already exists
  const existingUsername = await sql`
    SELECT id FROM "user" WHERE username = ${username}
  `;

  if (existingUsername.length > 0) {
    throw new Error('Username already taken');
  }

  // Check if email already exists
  const existingEmail = await sql`
    SELECT id FROM "user" WHERE email = ${email}
  `;

  if (existingEmail.length > 0) {
    throw new Error('Email already registered');
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
  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.created_at
    },
    accessToken,
    refreshToken
  };
}

/**
 * Refresh access token using refresh token
 *
 * @param {string} refreshToken - JWT refresh token
 * @returns {Promise<Object>} { accessToken }
 * @throws {Error} If refresh token is invalid or expired
 */
export async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    throw new Error('Refresh token is required');
  }

  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken);

  // Generate new access token
  const accessToken = generateJWT(decoded.userId);

  return {
    accessToken
  };
}

/**
 * Initiate password reset flow
 * Generates reset token and stores it (returns token for email sending)
 *
 * @param {string} email - User's email address
 * @returns {Promise<Object>} { success: true, resetToken, user } or { success: false } if user not found
 */
export async function initiatePasswordReset(email) {
  // Validate email format
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    throw new Error(emailValidation.error);
  }

  // Check if user exists with this email
  const userResult = await sql`
    SELECT id, username, email
    FROM "user"
    WHERE email = ${email}
  `;

  // If user doesn't exist, return false (caller should still return success message for security)
  if (userResult.length === 0) {
    return { success: false };
  }

  const user = userResult[0];

  // Generate random reset token (32 bytes = 64 hex characters)
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash the token before storing (security: don't store plain token)
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Set expiry to 1 hour from now
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Delete any existing tokens for this user (cleanup old tokens)
  await sql`
    DELETE FROM password_reset_token
    WHERE user_id = ${user.id}
  `;

  // Store hashed token in database
  await sql`
    INSERT INTO password_reset_token (user_id, token_hash, expires_at, created_at)
    VALUES (${user.id}, ${tokenHash}, ${expiresAt}, NOW())
  `;

  return {
    success: true,
    resetToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    }
  };
}

/**
 * Reset password using reset token
 *
 * @param {Object} resetData - Reset data
 * @param {string} resetData.token - Plain text reset token
 * @param {string} resetData.newPassword - New password
 * @returns {Promise<Object>} { success: true }
 * @throws {Error} If token is invalid, expired, or password validation fails
 */
export async function resetPassword(resetData) {
  const { token, newPassword } = resetData;

  if (!token || !newPassword) {
    throw new Error('Token and new password are required');
  }

  // Validate new password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.error);
  }

  // Hash the provided token to match against stored hash
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Find valid token
  const tokenResult = await sql`
    SELECT user_id, expires_at
    FROM password_reset_token
    WHERE token_hash = ${tokenHash}
    AND expires_at > NOW()
  `;

  if (tokenResult.length === 0) {
    throw new Error('Invalid or expired reset token');
  }

  const userId = tokenResult[0].user_id;

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update user's password
  await sql`
    UPDATE "user"
    SET password_hash = ${passwordHash}
    WHERE id = ${userId}
  `;

  // Delete the used token
  await sql`
    DELETE FROM password_reset_token
    WHERE token_hash = ${tokenHash}
  `;

  return {
    success: true
  };
}

/**
 * Get user by ID (for protected routes)
 *
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} User object
 * @throws {Error} If user not found
 */
export async function getUserById(userId) {
  const result = await sql`
    SELECT id, username, email, created_at
    FROM "user"
    WHERE id = ${userId}
  `;

  if (result.length === 0) {
    throw new Error('User not found');
  }

  return {
    id: result[0].id,
    username: result[0].username,
    email: result[0].email,
    createdAt: result[0].created_at
  };
}
