import { verifyJWT } from '../auth.js';

/**
 * Middleware to require authentication for API routes
 * Wraps handler function and validates JWT token from Authorization header
 *
 * Usage:
 *   export default requireAuth(async (req, res) => {
 *     // req.user contains decoded token payload { userId, type }
 *     const userId = req.user.userId;
 *     // ... handle authenticated request
 *   });
 *
 * @param {Function} handler - API route handler function
 * @returns {Function} Wrapped handler with authentication
 */
export function requireAuth(handler) {
  return async (req, res) => {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    // Check for Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <token>' });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      // Verify JWT token
      const decoded = verifyJWT(token);

      // Attach user info to request object
      req.user = decoded;

      // Call the original handler
      return handler(req, res);
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        message: error.message
      });
    }
  };
}

/**
 * Optional authentication middleware - doesn't reject if no token
 * Useful for endpoints that work differently for authenticated vs anonymous users
 *
 * @param {Function} handler - API route handler function
 * @returns {Function} Wrapped handler with optional authentication
 */
export function optionalAuth(handler) {
  return async (req, res) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');

      try {
        const decoded = verifyJWT(token);
        req.user = decoded;
      } catch (error) {
        // Token invalid, but don't reject - continue as unauthenticated
        req.user = null;
      }
    } else {
      req.user = null;
    }

    return handler(req, res);
  };
}
