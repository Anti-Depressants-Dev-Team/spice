import { pbkdf2Sync, randomBytes } from 'crypto';

const ITERATIONS = 600000;
const LEGACY_ITERATIONS = 10000;

/**
 * Hash a password using PBKDF2 sync.
 * Returns the salt, iterations, and hash combined with a colon separator.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, ITERATIONS, 64, 'sha512').toString('hex');
  return `${salt}:${ITERATIONS}:${hash}`;
}

/**
 * Verify a candidate password against the stored colon-separated salt/hash or salt/iterations/hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');

  if (parts.length === 2) {
    // Legacy format: salt:hash
    const [salt, hash] = parts;
    if (!salt || !hash) return false;
    const newHash = pbkdf2Sync(password, salt, LEGACY_ITERATIONS, 64, 'sha512').toString('hex');
    return hash === newHash;
  } else if (parts.length === 3) {
    // New format: salt:iterations:hash
    const [salt, iterationsStr, hash] = parts;
    if (!salt || !iterationsStr || !hash) return false;
    const iterations = parseInt(iterationsStr, 10);
    if (isNaN(iterations)) return false;
    const newHash = pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
    return hash === newHash;
  }

  return false;
}
