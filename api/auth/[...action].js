/**
 * Auth Catch-All Route Handler
 * Consolidates 5 auth routes into a single serverless function
 *
 * Routes:
 * - POST /api/auth/login => Authenticate user
 * - POST /api/auth/register => Register new user
 * - POST /api/auth/refresh => Refresh access token
 * - POST /api/auth/forgot-password => Initiate password reset
 * - POST /api/auth/reset-password => Complete password reset
 */

import {
  login,
  register,
  refreshAccessToken,
  initiatePasswordReset,
  resetPassword
} from '../_lib/services/authService.js';
import { Resend } from 'resend';

// Initialize Resend client (only if API key is configured)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Route handlers
 */
const handlers = {
  POST: {
    // POST /api/auth/login - Authenticate user
    'login': async (req, res) => {
      try {
        const { usernameOrEmail, password, rememberMe } = req.body;

        const result = await login({ usernameOrEmail, password, rememberMe });

        return res.status(200).json(result);
      } catch (error) {
        console.error('Login error:', error);

        if (error.message === 'Invalid credentials') {
          return res.status(401).json({ error: error.message });
        }
        if (error.message.includes('required')) {
          return res.status(400).json({ error: error.message });
        }

        return res.status(500).json({
          error: 'Login failed',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    },

    // POST /api/auth/register - Register new user
    'register': async (req, res) => {
      try {
        const { username, email, password, rememberMe } = req.body;

        const result = await register({ username, email, password, rememberMe });

        return res.status(201).json(result);
      } catch (error) {
        console.error('Registration error:', error);

        if (error.message.includes('already taken') || error.message.includes('already registered')) {
          return res.status(409).json({ error: error.message });
        }
        if (error.message.includes('must') || error.message.includes('required')) {
          return res.status(400).json({ error: error.message });
        }

        return res.status(500).json({
          error: 'Registration failed',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    },

    // POST /api/auth/refresh - Refresh access token
    'refresh': async (req, res) => {
      try {
        const { refreshToken } = req.body;

        const result = await refreshAccessToken(refreshToken);

        return res.status(200).json(result);
      } catch (error) {
        console.error('Token refresh error:', error);

        if (error.message.includes('Invalid refresh token') || error.message.includes('expired') || error.message.includes('required')) {
          return res.status(401).json({
            error: 'Invalid or expired refresh token',
            message: 'Please log in again'
          });
        }

        return res.status(500).json({
          error: 'Token refresh failed',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    },

    // POST /api/auth/forgot-password - Initiate password reset
    'forgot-password': async (req, res) => {
      try {
        const { email } = req.body;

        const result = await initiatePasswordReset(email);

        // Always return success message to prevent email enumeration
        const successMessage = 'If that email is registered, you will receive a password reset link';

        if (!result.success) {
          return res.status(200).json({ message: successMessage });
        }

        // Send reset email if Resend is configured
        if (resend) {
          const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${result.resetToken}`;

          try {
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || 'noreply@gymbrainapp.com',
              to: result.user.email,
              subject: 'GymBrAIn - Password Reset Request',
              html: `
                <h2>Password Reset Request</h2>
                <p>Hi ${result.user.username},</p>
                <p>You requested to reset your password. Click the link below to reset it:</p>
                <p><a href="${resetURL}">Reset Password</a></p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, you can safely ignore this email.</p>
                <p>- The GymBrAIn Team</p>
              `
            });
          } catch (emailError) {
            console.error('Failed to send reset email:', emailError);
            // Still return success to prevent email enumeration
          }
        } else {
          console.warn('Resend API key not configured - password reset email not sent');
          console.log('Reset token (for development):', result.resetToken);
        }

        return res.status(200).json({ message: successMessage });
      } catch (error) {
        console.error('Forgot password error:', error);

        if (error.message.includes('Invalid email') || error.message.includes('required')) {
          return res.status(400).json({ error: error.message });
        }

        return res.status(500).json({
          error: 'Password reset request failed',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    },

    // POST /api/auth/reset-password - Complete password reset
    'reset-password': async (req, res) => {
      try {
        const { token, newPassword } = req.body;

        await resetPassword({ token, newPassword });

        return res.status(200).json({
          success: true,
          message: 'Password reset successful. You can now log in with your new password.'
        });
      } catch (error) {
        console.error('Reset password error:', error);

        if (error.message.includes('Invalid or expired')) {
          return res.status(400).json({ error: error.message });
        }
        if (error.message.includes('must') || error.message.includes('required')) {
          return res.status(400).json({ error: error.message });
        }

        return res.status(500).json({
          error: 'Password reset failed',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    }
  }
};

/**
 * Main handler - routes requests based on action and method
 */
export default async function handler(req, res) {
  // Parse path segments from URL (req.query may not populate for POST in Vercel)
  const segments = req.url.split('?')[0].replace(/^\/api\/auth\/?/, '').split('/').filter(Boolean);
  const { method } = req;

  // Only POST requests are allowed for auth routes
  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Build route key from path segments
  let routeKey;

  if (segments.length === 1) {
    // Single action: /api/auth/login, /api/auth/register, etc.
    routeKey = segments[0];
  } else {
    return res.status(404).json({ error: 'Not found' });
  }

  // Find handler
  const methodHandlers = handlers[method];
  if (!methodHandlers) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const routeHandler = methodHandlers[routeKey];
  if (!routeHandler) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Execute handler (no auth middleware needed for auth routes)
  return routeHandler(req, res);
}
