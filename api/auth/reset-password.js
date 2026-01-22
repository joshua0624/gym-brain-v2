import crypto from 'crypto';
import { sql } from '../_lib/db.js';
import { hashPassword, validatePassword } from '../_lib/auth.js';

/**
 * POST /api/auth/reset-password
 *
 * Reset user password using a valid reset token
 *
 * Request body:
 * {
 *   "token": "string (reset token from email)",
 *   "newPassword": "string (min 8 chars)"
 * }
 *
 * Response:
 * {
 *   "message": "Password reset successfully"
 * }
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, newPassword } = req.body;

    // Validate inputs
    if (!token) {
      return res.status(400).json({ error: 'Reset token is required' });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find the reset token in database
    const tokenResult = await sql`
      SELECT user_id, expires_at, used_at
      FROM password_reset_token
      WHERE token_hash = ${tokenHash}
    `;

    // Token not found
    if (tokenResult.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const resetToken = tokenResult[0];

    // Check if token has already been used
    if (resetToken.used_at !== null) {
      return res.status(400).json({ error: 'This reset token has already been used' });
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(resetToken.expires_at);

    if (now > expiresAt) {
      return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    // Hash the new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update user's password
    await sql`
      UPDATE "user"
      SET password_hash = ${newPasswordHash}
      WHERE id = ${resetToken.user_id}
    `;

    // Mark token as used
    await sql`
      UPDATE password_reset_token
      SET used_at = NOW()
      WHERE token_hash = ${tokenHash}
    `;

    // Return success
    return res.status(200).json({
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({
      error: 'Password reset failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
