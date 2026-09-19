import { randomBytes, randomUUID, createHash } from 'crypto';

/**
 * TokenService: Cryptographically secure token generation and hashing
 * 
 * Security notes:
 * - All tokens generated with crypto.randomBytes
 * - Tokens are hashed before storage in memory
 * - Token values are never logged or exposed to clients in error messages
 * - Short codes (4 chars) use alphanumeric subset for user typing
 */
export class TokenService {
  public static readonly INVITE_CODE_LENGTH = 4;

  /**
   * Generate an opaque game ID using UUID
   * @returns Cryptographically random UUID string
   */
  static generateGameId(): string {
    return randomUUID();
  }

  /**
   * Generate a high-entropy session token for a player
   * Should be cryptographically random and difficult to guess
   * @returns Base64-encoded random bytes (32 bytes = 256 bits)
   */
  static generateSessionToken(): string {
    return randomBytes(32).toString('base64');
  }

  /**
   * Generate a short, user-typeable 4-character alphanumeric code
   * Characters: A-Z, 0-9 (no lowercase to reduce confusion)
   * Entropy: ~20.7 bits (36^4 possibilities)
   * @returns 4-character uppercase alphanumeric string
   */
  static generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789'; // don't use zero to avoid confusion with 'O'
    const codeLength = TokenService.INVITE_CODE_LENGTH;
    const charBytes = randomBytes(codeLength);

    let code = '';
    for (let i = 0; i < codeLength; i++) {
      code += chars[charBytes[i] % chars.length];
    }
    return code;
  }

  /**
   * Hash a token for secure storage
   * Uses SHA-256 which is appropriate for token verification
   * @param token Plain text token to hash
   * @returns Hex-encoded hash
   */
  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verify a plain token against its stored hash
   * @param plainToken The token to verify
   * @param storedHash The stored hash to compare against
   * @returns true if token matches hash, false otherwise
   */
  static verifyToken(plainToken: string, storedHash: string): boolean {
    const plainHash = TokenService.hashToken(plainToken);
    // Use constant-time comparison to prevent timing attacks
    return TokenService.constantTimeCompare(plainHash, storedHash);
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * @param a First string
   * @param b Second string
   * @returns true if strings are equal, false otherwise
   */
  private static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Validate a player name
   * Rules: max 15 characters, first character must be alphanumeric, non-empty
   * @param name The player name to validate
   * @returns Object with isValid flag and optional error message
   */
  static validatePlayerName(
    name: string
  ): { isValid: boolean; error?: string } {
    if (!name || typeof name !== 'string') {
      return { isValid: false, error: 'Player name is required' };
    }

    const trimmed = name.trim();
    
    if (trimmed.length === 0) {
      return { isValid: false, error: 'Player name cannot be empty' };
    }

    if (trimmed.length > 15) {
      return { isValid: false, error: 'Player name must be 15 characters or less' };
    }

    const firstChar = trimmed[0];
    const isAlphanumeric = /^[a-zA-Z0-9]$/.test(firstChar);
    if (!isAlphanumeric) {
      return {
        isValid: false,
        error: 'Player name must start with a letter or number'
      };
    }

    return { isValid: true };
  }

  /**
   * Normalize a player name (trim whitespace)
   * @param name The raw player name
   * @returns Normalized name or null if invalid
   */
  static normalizeName(name: string): string | null {
    const validation = TokenService.validatePlayerName(name);
    if (!validation.isValid) {
      return null;
    }
    return name.trim();
  }
}
