import crypto from 'crypto';
import { sql } from '../_lib/db.js';
import { Resend } from 'resend';
import { validateEmail } from '../_lib/auth.js';

// Initialize Resend client (only if API key is configured)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * POST /api/auth/forgot-password
 *
 * Initiate password reset flow by sending reset token via email
 *
 * Request body:
 * {
 *   "email": "string (valid email format)"
 * }
 *
 * Response:
 * {
 *   "message": "If that email is registered, you will receive a password reset link"
 * }
 *
 * Note: Always returns success to prevent email enumeration attacks
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    // Check if user exists with this email
    const userResult = await sql`
      SELECT id, username, email
      FROM "user"
      WHERE email = ${email}
    `;

    // Always return the same message to prevent email enumeration
    const successMessage = 'If that email is registered, you will receive a password reset link';

    // If user doesn't exist, return success message (security: don't reveal if email exists)
    if (userResult.length === 0) {
      return res.status(200).json({ message: successMessage });
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

    // Build reset URL
    // In production, this should be your actual frontend URL
    const resetUrl = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
      : `http://localhost:5173/reset-password?token=${resetToken}`;

    // Send email via Resend (if configured)
    if (!resend) {
      console.error('RESEND_API_KEY not configured - skipping password reset email');
      return res.status(503).json({ error: 'Email service not configured' });
    }

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'GymBrAIn <noreply@gymbrain.app>',
        to: email,
        subject: 'Password Reset Request - GymBrAIn',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #6B8E6B;">Password Reset Request</h2>
              <p>Hi ${user.username},</p>
              <p>We received a request to reset your password for your GymBrAIn account.</p>
              <p>Click the button below to reset your password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #6B8E6B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 14px;">${resetUrl}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px;">GymBrAIn - Your AI-Powered Workout Tracker</p>
            </body>
          </html>
        `
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Log error but still return success to user (security: don't reveal email sending issues)
      // In production, you might want to alert admins about email failures
    }

    // Return success message
    return res.status(200).json({ message: successMessage });

  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      error: 'Password reset request failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
