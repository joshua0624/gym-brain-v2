import {
  verifyRefreshToken,
  generateJWT
} from '../_lib/auth.js';

/**
 * POST /api/auth/refresh
 *
 * Generate a new access token using a valid refresh token
 *
 * Request body:
 * {
 *   "refreshToken": "jwt"
 * }
 *
 * Response:
 * {
 *   "accessToken": "jwt"
 * }
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { refreshToken } = req.body;

    // Validate input
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Generate new access token
    const accessToken = generateJWT(decoded.userId);

    // Return new access token
    return res.status(200).json({
      accessToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);

    // Handle specific error cases
    if (error.message.includes('Invalid refresh token') || error.message.includes('expired')) {
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
}
