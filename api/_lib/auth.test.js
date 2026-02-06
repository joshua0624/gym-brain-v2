import { describe, it, expect, beforeAll } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateJWT,
  verifyJWT,
  generateRefreshToken,
  verifyRefreshToken,
  validateUsername,
  validateEmail,
  validatePassword,
} from './auth.js';

// Set test JWT secrets
beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';
});

describe('hashPassword / verifyPassword', () => {
  it('hashes and verifies a password correctly', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(await verifyPassword(password, hash)).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await hashPassword('correctPassword');
    expect(await verifyPassword('wrongPassword', hash)).toBe(false);
  });

  it('generates different hashes for same password', async () => {
    const password = 'testPassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2); // Different salts
  });
});

describe('generateJWT / verifyJWT', () => {
  it('generates and verifies an access token roundtrip', () => {
    const token = generateJWT('user-123');
    const decoded = verifyJWT(token);
    expect(decoded.userId).toBe('user-123');
    expect(decoded.type).toBe('access');
  });

  it('rejects a refresh token used as access token', () => {
    const refreshToken = generateRefreshToken('user-123');
    expect(() => verifyJWT(refreshToken)).toThrow('Invalid access token');
  });

  it('rejects tampered tokens', () => {
    const token = generateJWT('user-123');
    const tampered = token.slice(0, -5) + 'xxxxx';
    expect(() => verifyJWT(tampered)).toThrow();
  });

  it('rejects completely invalid strings', () => {
    expect(() => verifyJWT('not-a-token')).toThrow();
  });

  it('includes userId in payload', () => {
    const token = generateJWT('user-456');
    const decoded = verifyJWT(token);
    expect(decoded.userId).toBe('user-456');
  });
});

describe('generateRefreshToken / verifyRefreshToken', () => {
  it('generates and verifies a refresh token roundtrip', () => {
    const token = generateRefreshToken('user-123');
    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe('user-123');
    expect(decoded.type).toBe('refresh');
  });

  it('rejects an access token used as refresh token', () => {
    const accessToken = generateJWT('user-123');
    expect(() => verifyRefreshToken(accessToken)).toThrow('Invalid refresh token');
  });

  it('generates token with default expiry (7d)', () => {
    const token = generateRefreshToken('user-123', false);
    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe('user-123');
  });

  it('generates token with remember-me expiry (30d)', () => {
    const token = generateRefreshToken('user-123', true);
    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe('user-123');
  });
});

describe('validateUsername', () => {
  it('accepts valid username', () => {
    expect(validateUsername('john_doe')).toEqual({ valid: true, error: null });
  });

  it('accepts 3-char minimum', () => {
    expect(validateUsername('abc')).toEqual({ valid: true, error: null });
  });

  it('accepts 30-char maximum', () => {
    expect(validateUsername('a'.repeat(30))).toEqual({ valid: true, error: null });
  });

  it('rejects too short (2 chars)', () => {
    const result = validateUsername('ab');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between 3 and 30');
  });

  it('rejects too long (31 chars)', () => {
    const result = validateUsername('a'.repeat(31));
    expect(result.valid).toBe(false);
  });

  it('rejects special characters', () => {
    const result = validateUsername('user@name');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('letters, numbers, and underscores');
  });

  it('rejects spaces', () => {
    const result = validateUsername('user name');
    expect(result.valid).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(validateUsername(null).valid).toBe(false);
    expect(validateUsername(undefined).valid).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateUsername('').valid).toBe(false);
  });

  it('allows underscores', () => {
    expect(validateUsername('user_name_123').valid).toBe(true);
  });
});

describe('validateEmail', () => {
  it('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toEqual({ valid: true, error: null });
  });

  it('rejects missing @', () => {
    expect(validateEmail('userexample.com').valid).toBe(false);
  });

  it('rejects missing domain', () => {
    expect(validateEmail('user@').valid).toBe(false);
  });

  it('rejects missing TLD', () => {
    expect(validateEmail('user@example').valid).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(validateEmail(null).valid).toBe(false);
    expect(validateEmail(undefined).valid).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateEmail('').valid).toBe(false);
  });

  it('rejects spaces in email', () => {
    expect(validateEmail('user @example.com').valid).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepts 8+ character password', () => {
    expect(validatePassword('password123')).toEqual({ valid: true, error: null });
  });

  it('accepts exactly 8 characters', () => {
    expect(validatePassword('12345678')).toEqual({ valid: true, error: null });
  });

  it('rejects 7 characters', () => {
    const result = validatePassword('1234567');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 8');
  });

  it('rejects empty string', () => {
    expect(validatePassword('').valid).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(validatePassword(null).valid).toBe(false);
    expect(validatePassword(undefined).valid).toBe(false);
  });
});
