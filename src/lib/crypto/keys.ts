import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * API Key Encryption Utilities
 *
 * Uses AES-256-GCM for authenticated encryption of API keys.
 * Keys are stored as base64-encoded strings containing:
 * - IV (16 bytes)
 * - Auth tag (16 bytes)
 * - Encrypted data
 *
 * Requires ENCRYPTION_KEY environment variable (32 bytes = 64 hex chars).
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // AES block size
const TAG_LENGTH = 16; // GCM auth tag

/**
 * Get encryption key from environment.
 * Must be exactly 32 bytes (64 hex characters).
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. ' + 'Generate with: openssl rand -hex 32'
    );
  }

  if (key.length !== 64) {
    throw new Error(`ENCRYPTION_KEY must be 32 bytes (64 hex chars), got ${key.length} chars`);
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypt an API key for storage.
 *
 * @param plaintext - The API key to encrypt
 * @returns Base64-encoded encrypted string (IV + tag + ciphertext)
 *
 * @example
 * const encrypted = encryptApiKey('sk-abc123...');
 * // Store encrypted in database
 */
export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  const tag = cipher.getAuthTag();

  // Combine: IV (16) + tag (16) + encrypted data
  const combined = Buffer.concat([iv, tag, encrypted]);

  return combined.toString('base64');
}

/**
 * Decrypt a stored API key.
 *
 * @param ciphertext - Base64-encoded encrypted string from encryptApiKey
 * @returns The original plaintext API key
 * @throws Error if decryption fails (wrong key, tampered data)
 *
 * @example
 * const apiKey = decryptApiKey(stored.encryptedOpenaiKey);
 */
export function decryptApiKey(ciphertext: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(ciphertext, 'base64');

  if (data.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted data: too short');
  }

  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  try {
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    throw new Error('Decryption failed: invalid key or tampered data');
  }
}

/**
 * Check if encryption is properly configured.
 * Use this to validate setup during app initialization.
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Mask an API key for display (e.g., "sk-abc...xyz").
 * Shows first 6 and last 4 characters.
 */
export function maskApiKey(key: string): string {
  if (key.length <= 12) {
    return '***';
  }
  return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
}
