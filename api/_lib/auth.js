import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Bcrypt salt rounds
const SALT_ROUNDS = 10;

// JWT expiry times
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY_SHORT = '7d'; // 7 days (default)
const REFRESH_TOKEN_EXPIRY_LONG = '30d'; // 30 days (remember me)

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate a JWT access token
 * @param {string} userId - User UUID
 * @returns {string} JWT access token
 */
export function generateJWT(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign(
    { userId, type: 'access' },
    secret,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate a JWT refresh token
 * @param {string} userId - User UUID
 * @param {boolean} rememberMe - If true, use 30-day expiry, else 7-day
 * @returns {string} JWT refresh token
 */
export function generateRefreshToken(userId, rememberMe = false) {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
  }

  const expiry = rememberMe ? REFRESH_TOKEN_EXPIRY_LONG : REFRESH_TOKEN_EXPIRY_SHORT;

  return jwt.sign(
    { userId, type: 'refresh' },
    secret,
    { expiresIn: expiry }
  );
}

/**
 * Verify and decode a JWT access token
 * @param {string} token - JWT access token
 * @returns {object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyJWT(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  try {
    const decoded = jwt.verify(token, secret);

    // Verify token type
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    throw new Error(`Invalid access token: ${error.message}`);
  }
}

/**
 * Verify and decode a JWT refresh token
 * @param {string} token - JWT refresh token
 * @returns {object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyRefreshToken(token) {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
  }

  try {
    const decoded = jwt.verify(token, secret);

    // Verify token type
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    throw new Error(`Invalid refresh token: ${error.message}`);
  }
}

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {object} { valid: boolean, error: string | null }
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  if (username.length < 3 || username.length > 30) {
    return { valid: false, error: 'Username must be between 3 and 30 characters' };
  }

  // Alphanumeric and underscore only
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  return { valid: true, error: null };
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {object} { valid: boolean, error: string | null }
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true, error: null };
}

/**
 * Validate password format
 * @param {string} password - Password to validate
 * @returns {object} { valid: boolean, error: string | null }
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  return { valid: true, error: null };
}
