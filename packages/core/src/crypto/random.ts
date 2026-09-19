interface WebCryptoLike {
  getRandomValues<T extends Uint8Array>(array: T): T;
}

/**
 * The single platform capability the core requires. `globalThis.crypto` is a standard global in
 * both browsers and Node 19+, so no host-specific adapter is needed.
 */
function webCrypto(): WebCryptoLike {
  const candidate = (globalThis as { crypto?: WebCryptoLike }).crypto;
  if (!candidate || typeof candidate.getRandomValues !== 'function') {
    throw new Error('A Web Crypto implementation (globalThis.crypto.getRandomValues) is required');
  }
  return candidate;
}

export function randomBytes(length: number): Uint8Array {
  return webCrypto().getRandomValues(new Uint8Array(length));
}

/** RFC 4122 version 4 UUID derived from platform randomness. */
export function randomUuid(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
