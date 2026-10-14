/**
 * MedTrust Cryptographic Services
 *
 * Implements client-side AES-256-GCM encryption, decryption,
 * and SHA-256 hashing for off-chain medical documents.
 * Ensures zero plaintext medical data is exposed on-chain or over untrusted networks.
 */

export interface EncryptedEnvelope {
  algorithm: "AES-256-GCM";
  iv: string; // Base64
  ciphertext: string; // Base64
  sha256Hash: string; // Raw plaintext SHA-256 hex digest for Solana anchor
}

/**
 * Computes the SHA-256 hash of arbitrary string or binary data.
 * Returns a 64-character hex string conforming to on-chain [u8; 32] representation.
 */
export async function computeSha256(data: string | Uint8Array): Promise<string> {
  const bytes =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : data;

  const arrayBuffer = new Uint8Array(bytes).buffer as ArrayBuffer;
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generates a cryptographically random 256-bit AES-GCM symmetric key.
 */
export async function generateSymmetricKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Exports a CryptoKey to a Base64 string for storage or exchange.
 */
export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  return bufferToBase64(new Uint8Array(exported));
}

/**
 * Imports a CryptoKey from a Base64 string.
 */
export async function importKeyFromBase64(base64: string): Promise<CryptoKey> {
  const buffer = base64ToBuffer(base64);
  const arrayBuffer = new Uint8Array(buffer).buffer as ArrayBuffer;
  return crypto.subtle.importKey(
    "raw",
    arrayBuffer,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext document using AES-256-GCM with a random 12-byte IV.
 * Also calculates the raw document's SHA-256 digest for anchoring to Solana.
 */
export async function encryptDocument(
  plaintext: string,
  key: CryptoKey
): Promise<EncryptedEnvelope> {
  const encodedText = new TextEncoder().encode(plaintext);
  const sha256Hash = await computeSha256(encodedText);

  // 12-byte IV standard for AES-GCM
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const ivBuffer = new Uint8Array(ivBytes).buffer as ArrayBuffer;
  const dataBuffer = new Uint8Array(encodedText).buffer as ArrayBuffer;

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: ivBuffer,
    },
    key,
    dataBuffer
  );

  return {
    algorithm: "AES-256-GCM",
    iv: bufferToBase64(ivBytes),
    ciphertext: bufferToBase64(new Uint8Array(encryptedBuffer)),
    sha256Hash,
  };
}

/**
 * Decrypts an encrypted document envelope using the provided AES key.
 * Validates that the decrypted content matches the expected SHA-256 hash.
 */
export async function decryptDocument(
  envelope: EncryptedEnvelope,
  key: CryptoKey
): Promise<{ plaintext: string; isHashValid: boolean }> {
  const ivBytes = base64ToBuffer(envelope.iv);
  const ciphertextBytes = base64ToBuffer(envelope.ciphertext);

  const ivBuffer = new Uint8Array(ivBytes).buffer as ArrayBuffer;
  const ciphertextBuffer = new Uint8Array(ciphertextBytes).buffer as ArrayBuffer;

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBuffer,
    },
    key,
    ciphertextBuffer
  );

  const plaintext = new TextDecoder().decode(decryptedBuffer);
  const calculatedHash = await computeSha256(plaintext);
  const isHashValid = calculatedHash.toLowerCase() === envelope.sha256Hash.toLowerCase();

  return {
    plaintext,
    isHashValid,
  };
}

/**
 * Derives a deterministic patient storage key from wallet signature or master seed.
 */
export async function deriveKeyFromSecret(secret: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const secretBuffer = new Uint8Array(enc.encode(secret)).buffer as ArrayBuffer;
  const saltBuffer = new Uint8Array(enc.encode(salt)).buffer as ArrayBuffer;

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    secretBuffer,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// Helpers
function bufferToBase64(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

