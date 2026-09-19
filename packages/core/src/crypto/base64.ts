const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64 without Buffer or btoa, neither of which is part of the core's platform contract. */
export function encodeBase64(bytes: Uint8Array): string {
  let encoded = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const remaining = bytes.length - index;
    const chunk = (bytes[index] << 16) | ((remaining > 1 ? bytes[index + 1] : 0) << 8) | (remaining > 2 ? bytes[index + 2] : 0);

    encoded += BASE64_ALPHABET[(chunk >> 18) & 0x3f];
    encoded += BASE64_ALPHABET[(chunk >> 12) & 0x3f];
    encoded += remaining > 1 ? BASE64_ALPHABET[(chunk >> 6) & 0x3f] : '=';
    encoded += remaining > 2 ? BASE64_ALPHABET[chunk & 0x3f] : '=';
  }

  return encoded;
}
