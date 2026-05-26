import { pbkdf2Sync, randomBytes } from 'crypto';

/**
 * Hash a password using PBKDF2 sync.
 * Returns the salt and hash combined with a colon separator.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a candidate password against the stored colon-separated salt/hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  if (!salt || !hash) return false;
  const newHash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === newHash;
}
