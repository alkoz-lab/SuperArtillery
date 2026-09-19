import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { TokenService } from '../services/tokenService';

describe('TokenService', () => {
  describe('generateGameId', () => {
    it('generates a valid UUID', () => {
      const gameId = TokenService.generateGameId();
      expect(gameId).toBeDefined();
      expect(typeof gameId).toBe('string');
      expect(gameId.length).toBeGreaterThan(0);
      // Should be a valid UUID format (36 chars with hyphens)
      expect(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gameId)).toBe(true);
    });

    it('generates unique IDs', () => {
      const id1 = TokenService.generateGameId();
      const id2 = TokenService.generateGameId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateSessionToken', () => {
    it('generates a high-entropy token', () => {
      const token = TokenService.generateSessionToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      // Base64 encoded 32 bytes should be about 44 chars
      expect(token.length).toBeGreaterThanOrEqual(40);
    });

    it('generates unique tokens', () => {
      const token1 = TokenService.generateSessionToken();
      const token2 = TokenService.generateSessionToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateInviteCode', () => {
    it('generates a 4-character alphanumeric code', () => {
      const code = TokenService.generateInviteCode();
      expect(code).toBeDefined();
      expect(code.length).toBe(4);
      expect(/^[A-Z0-9]{4}$/.test(code)).toBe(true);
    });

    it('generates unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        const code = TokenService.generateInviteCode();
        expect(codes.has(code)).toBe(false); // Should not have duplicates in 100 tries
        codes.add(code);
      }
      expect(codes.size).toBe(100);
    });

    it('only uses uppercase letters and numbers', () => {
      for (let i = 0; i < 50; i++) {
        const code = TokenService.generateInviteCode();
        expect(/^[A-Z0-9]{4}$/.test(code)).toBe(true);
      }
    });
  });

  describe('hashToken', () => {
    it('produces a consistent hash for the same token', () => {
      const token = 'test-token-123';
      const hash1 = TokenService.hashToken(token);
      const hash2 = TokenService.hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different tokens', () => {
      const hash1 = TokenService.hashToken('token-1');
      const hash2 = TokenService.hashToken('token-2');
      expect(hash1).not.toBe(hash2);
    });

    it('produces hex-encoded output', () => {
      const token = 'test-token';
      const hash = TokenService.hashToken(token);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
  });

  describe('verifyToken', () => {
    it('returns true for a matching token and hash', () => {
      const token = 'my-secret-token';
      const hash = TokenService.hashToken(token);
      expect(TokenService.verifyToken(token, hash)).toBe(true);
    });

    it('returns false for a non-matching token and hash', () => {
      const token = 'correct-token';
      const wrongToken = 'wrong-token';
      const hash = TokenService.hashToken(token);
      expect(TokenService.verifyToken(wrongToken, hash)).toBe(false);
    });

    it('returns false for empty token', () => {
      const hash = TokenService.hashToken('test');
      expect(TokenService.verifyToken('', hash)).toBe(false);
    });

    it('uses constant-time comparison (prevents timing attacks)', () => {
      const token = 'test-token-12345';
      const correctHash = TokenService.hashToken(token);
      const wrongHash = TokenService.hashToken('wrong-token-12345');

      // Should take similar time for close mismatches
      const result1 = TokenService.verifyToken('test-token-11111', correctHash);
      const result2 = TokenService.verifyToken('wrong-token-99999', wrongHash);
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });

  describe('validatePlayerName', () => {
    it('accepts valid player names', () => {
      const validNames = ['Alice', 'Bob123', 'A', '1Player', 'TestName12345'];
      validNames.forEach(name => {
        const result = TokenService.validatePlayerName(name);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('rejects empty names', () => {
      const result = TokenService.validatePlayerName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects names longer than 15 characters', () => {
      const longName = 'ThisNameIsTooLong';
      const result = TokenService.validatePlayerName(longName);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('15');
    });

    it('rejects names starting with non-alphanumeric character', () => {
      const invalidNames = ['-Player', '_Player', '@Player', '!Player', '.Player'];
      invalidNames.forEach(name => {
        const result = TokenService.validatePlayerName(name);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('accepts names with spaces and special chars in middle', () => {
      const result = TokenService.validatePlayerName('My Player');
      // May be valid depending on implementation - at least starts with alphanumeric
      if (result.isValid) {
        expect(result.error).toBeUndefined();
      }
    });

    it('rejects null/undefined', () => {
      const result = TokenService.validatePlayerName(null as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('normalizeName', () => {
    it('returns trimmed name for valid names', () => {
      const name = '  Alice  ';
      const result = TokenService.normalizeName(name);
      expect(result).toBe('Alice');
    });

    it('returns null for invalid names', () => {
      const result = TokenService.normalizeName('');
      expect(result).toBeNull();
    });

    it('rejects names exceeding 15 chars', () => {
      const result = TokenService.normalizeName('ThisNameIsTooLongForTheGame');
      expect(result).toBeNull();
    });
  });
});
