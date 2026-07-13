import { pbkdf2, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

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
 * Asynchronously hash a password using libuv's worker pool so an auth
 * request does not block the Node.js event loop during PBKDF2.
 */
export async function hashPasswordAsync(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    pbkdf2(password, salt, ITERATIONS, 64, 'sha512', (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(`${salt}:${ITERATIONS}:${derivedKey.toString('hex')}`);
    });
  });
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

/**
 * Asynchronously verify a password using libuv's worker pool so an auth
 * request does not block the Node.js event loop during PBKDF2.
 */
export async function verifyPasswordAsync(password: string, storedHash: string): Promise<boolean> {
  const parsed = parseStoredPasswordHash(storedHash);
  if (!parsed) return false;

  return new Promise((resolve) => {
    pbkdf2(password, parsed.salt, parsed.iterations, 64, 'sha512', (error, derivedKey) => {
      if (error) {
        resolve(false);
        return;
      }
      const expected = Buffer.from(parsed.hash, 'hex');
      resolve(expected.length === derivedKey.length && timingSafeEqual(expected, derivedKey));
    });
  });
}

function parseStoredPasswordHash(storedHash: string) {
  const parts = storedHash.split(':');
  let salt: string;
  let iterations: number;
  let hash: string;
  if (parts.length === 2) {
    [salt, hash] = parts;
    iterations = LEGACY_ITERATIONS;
  } else if (parts.length === 3) {
    const [parsedSalt, iterationsString, parsedHash] = parts;
    salt = parsedSalt;
    hash = parsedHash;
    iterations = Number(iterationsString);
  } else {
    return null;
  }

  if (!salt || !hash || !Number.isSafeInteger(iterations) || iterations <= 0
    || hash.length % 2 !== 0 || !/^[a-f0-9]+$/i.test(hash)) {
    return null;
  }
  return { salt, iterations, hash };
}
