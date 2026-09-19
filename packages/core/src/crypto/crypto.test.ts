import { createHash, randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sha256Hex } from './sha256';
import { encodeBase64 } from './base64';
import { randomBytes, randomUuid } from './random';

describe('sha256Hex', () => {
  it('matches the FIPS 180-4 vector for an empty input', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('matches the FIPS 180-4 vector for "abc"', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('agrees with node crypto across lengths that straddle the block and padding boundaries', () => {
    for (const length of [0, 1, 54, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 200]) {
      const input = 'a'.repeat(length);
      expect(sha256Hex(input)).toBe(createHash('sha256').update(input).digest('hex'));
    }
  });

  it('agrees with node crypto for multi-byte and astral characters', () => {
    for (const input of ['pläyer', 'Ω≈ç√', '🏰🏯 castle', 'Ольга', 'a🏰b']) {
      expect(sha256Hex(input)).toBe(createHash('sha256').update(input, 'utf8').digest('hex'));
    }
  });

  it('agrees with node crypto for random base64 tokens', () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const token = encodeBase64(randomBytes(32));
      expect(sha256Hex(token)).toBe(createHash('sha256').update(token).digest('hex'));
    }
  });
});

describe('encodeBase64', () => {
  it('agrees with node Buffer for every padding case', () => {
    for (let length = 0; length <= 32; length += 1) {
      const bytes = randomBytes(length);
      expect(encodeBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
    }
  });
});

describe('randomUuid', () => {
  it('produces the version 4 UUID shape that node randomUUID also produces', () => {
    const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(randomUUID()).toMatch(pattern);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      expect(randomUuid()).toMatch(pattern);
    }
  });

  it('does not repeat', () => {
    const generated = new Set(Array.from({ length: 1000 }, () => randomUuid()));
    expect(generated.size).toBe(1000);
  });
});

describe('randomBytes', () => {
  it('returns the requested length and varies between calls', () => {
    expect(randomBytes(32)).toHaveLength(32);
    expect(encodeBase64(randomBytes(32))).not.toBe(encodeBase64(randomBytes(32)));
  });
});
