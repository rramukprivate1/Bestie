// crypto.js
//
// What this file does, in plain terms:
// Your PIN never gets stored anywhere. Instead, we use it to mathematically
// derive an encryption key (via PBKDF2), and use that key to lock (encrypt)
// and unlock (decrypt) everything you write in the app before it touches
// the device's storage. Type the wrong PIN, and decryption fails loudly —
// that's how we check your PIN is correct, without ever saving it.

const PBKDF2_ITERATIONS = 100_000;

function bufToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuf(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export function generateSaltBase64() {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return bufToBase64(salt);
}

/** Derives an AES-GCM key from a PIN + salt. Same PIN + salt always gives the same key. */
export async function deriveKey(pin, saltBase64) {
  if (!crypto.subtle) {
    // crypto.subtle only exists in "secure contexts": https pages, or
    // http://localhost specifically. A plain http address - including a
    // LAN IP like http://192.168.x.x, which is how phone-on-same-WiFi
    // testing works - does not qualify, so the browser hides the whole
    // API rather than a normal feature being missing. See README for
    // how to test on a phone with this working (a real https:// URL).
    throw new Error(
      'ENCRYPTION_UNAVAILABLE: This page needs to be loaded over HTTPS or from localhost for encryption to work - see the frontend README for how to test on your phone.'
    );
  }

  const enc = new TextEncoder();
  const salt = base64ToBuf(saltBase64);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Encrypts a plain string. Returns a base64 string safe to store in IndexedDB. */
export async function encryptText(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return bufToBase64(combined);
}

/**
 * Decrypts a base64 string produced by encryptText.
 * Throws an error if the key is wrong — this is intentional, it's how we
 * verify a PIN without ever storing the PIN itself.
 */
export async function decryptText(key, encoded) {
  const combined = base64ToBuf(encoded);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const dec = new TextDecoder();
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return dec.decode(plaintext);
}
