import { describe, it, expect, beforeAll } from 'vitest';
import { requireAuth, optionalAuth } from './auth.js';
import { generateJWT, generateRefreshToken } from '../auth.js';

// Set test JWT secrets
beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';
});

// Helper to create mock req/res
const createMockReq = (headers = {}) => ({
  headers: { ...headers },
});

const createMockRes = () => {
  const res = {
    statusCode: null,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
  };
  return res;
};

describe('requireAuth', () => {
  it('sets req.user for valid access token', async () => {
    const token = generateJWT('user-123');
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();
    let handlerCalled = false;

    const handler = requireAuth(async (req, res) => {
      handlerCalled = true;
      expect(req.user.userId).toBe('user-123');
      expect(req.user.type).toBe('access');
      res.status(200).json({ ok: true });
    });

    await handler(req, res);
    expect(handlerCalled).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('returns 401 for missing Authorization header', async () => {
    const req = createMockReq({});
    const res = createMockRes();

    const handler = requireAuth(async () => {});
    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toContain('No authorization token');
  });

  it('returns 401 for non-Bearer format', async () => {
    const req = createMockReq({ authorization: 'Basic abc123' });
    const res = createMockRes();

    const handler = requireAuth(async () => {});
    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toContain('Invalid authorization format');
  });

  it('returns 401 for empty Bearer token', async () => {
    const req = createMockReq({ authorization: 'Bearer ' });
    const res = createMockRes();

    const handler = requireAuth(async () => {});
    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toContain('No token provided');
  });

  it('returns 401 for invalid/tampered token', async () => {
    const req = createMockReq({ authorization: 'Bearer invalid.token.here' });
    const res = createMockRes();

    const handler = requireAuth(async () => {});
    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toContain('Invalid or expired token');
  });

  it('returns 401 for refresh token used as access', async () => {
    const refreshToken = generateRefreshToken('user-123');
    const req = createMockReq({ authorization: `Bearer ${refreshToken}` });
    const res = createMockRes();

    const handler = requireAuth(async () => {});
    await handler(req, res);

    expect(res.statusCode).toBe(401);
  });
});

describe('optionalAuth', () => {
  it('sets req.user for valid token', async () => {
    const token = generateJWT('user-456');
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();

    const handler = optionalAuth(async (req, res) => {
      expect(req.user.userId).toBe('user-456');
      res.status(200).json({ ok: true });
    });

    await handler(req, res);
    expect(res.statusCode).toBe(200);
  });

  it('sets req.user to null for missing header (no 401)', async () => {
    const req = createMockReq({});
    const res = createMockRes();

    const handler = optionalAuth(async (req, res) => {
      expect(req.user).toBeNull();
      res.status(200).json({ ok: true });
    });

    await handler(req, res);
    expect(res.statusCode).toBe(200);
  });

  it('sets req.user to null for invalid token (no 401)', async () => {
    const req = createMockReq({ authorization: 'Bearer invalid.token' });
    const res = createMockRes();

    const handler = optionalAuth(async (req, res) => {
      expect(req.user).toBeNull();
      res.status(200).json({ ok: true });
    });

    await handler(req, res);
    expect(res.statusCode).toBe(200);
  });

  it('sets req.user to null for non-Bearer header', async () => {
    const req = createMockReq({ authorization: 'Basic abc123' });
    const res = createMockRes();

    const handler = optionalAuth(async (req, res) => {
      expect(req.user).toBeNull();
      res.status(200).json({ ok: true });
    });

    await handler(req, res);
    expect(res.statusCode).toBe(200);
  });
});
