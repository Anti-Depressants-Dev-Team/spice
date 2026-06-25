import assert from 'node:assert/strict';
import test from 'node:test';

import { hashPassword, verifyPassword } from '../lib/hash.ts';
import { pbkdf2Sync, randomBytes } from 'crypto';

test('hashPassword generates valid hash structure', () => {
  const hash = hashPassword('password123');
  const parts = hash.split(':');
  assert.equal(parts.length, 3);
  assert.equal(parts[0].length, 32); // 16 bytes hex string
  assert.equal(parts[1], '600000'); // 600k iterations
  assert.equal(parts[2].length, 128); // 64 bytes hex string
});

test('verifyPassword correctly matches password (new format)', () => {
  const password = 'my-super-secret-password';
  const hash = hashPassword(password);

  assert.equal(verifyPassword(password, hash), true);
  assert.equal(verifyPassword('wrong-password', hash), false);
});

test('verifyPassword correctly matches password (legacy format)', () => {
  const password = 'legacy-password';
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  const storedLegacyHash = `${salt}:${hash}`;

  assert.equal(verifyPassword(password, storedLegacyHash), true);
  assert.equal(verifyPassword('wrong-password', storedLegacyHash), false);
});

test('verifyPassword handles malformed hashes', () => {
  assert.equal(verifyPassword('password', 'malformed'), false);
  assert.equal(verifyPassword('password', 'salt:'), false);
  assert.equal(verifyPassword('password', ':hash'), false);
  assert.equal(verifyPassword('password', 'salt:not-a-number:hash'), false);
  assert.equal(verifyPassword('password', 'salt:600000:'), false);
  assert.equal(verifyPassword('password', 'part1:part2:part3:part4'), false);
});

test('hashPassword creates a properly formatted hash string', () => {
  const result = hashPassword('my-secret-password');

  // It should contain exactly one colon
  const parts = result.split(':');
  assert.equal(parts.length, 3);

  // Both salt and hash should be non-empty hex strings
  const [salt, _, hash] = parts;
  const [salt, iterations, hash] = parts;
  assert.ok(salt.length > 0);
  assert.ok(iterations.length > 0);
  assert.ok(hash.length > 0);
  assert.match(salt, /^[0-9a-f]+$/i);
  assert.match(iterations, /^[0-9]+$/);
  assert.match(hash, /^[0-9a-f]+$/i);
});

test('hashPassword produces different results for the same password', () => {
  const password = 'same-password';
  const result1 = hashPassword(password);
  const result2 = hashPassword(password);

  assert.notEqual(result1, result2);
});

test('verifyPassword correctly validates a valid password', () => {
  const password = 'correct-horse-battery-staple';
  const storedHash = hashPassword(password);

  assert.equal(verifyPassword(password, storedHash), true);
});

test('verifyPassword rejects an invalid password', () => {
  const password = 'correct-horse-battery-staple';
  const storedHash = hashPassword(password);

  assert.equal(verifyPassword('wrong-password', storedHash), false);
});

test('verifyPassword rejects incorrectly formatted hashes', () => {
  const password = 'my-password';

  // Missing colon
  assert.equal(verifyPassword(password, 'invalidhashstring'), false);

  // Empty salt
  assert.equal(verifyPassword(password, ':hashpart'), false);

  // Empty hash
  assert.equal(verifyPassword(password, 'saltpart:'), false);

  // Too many colons
  assert.equal(verifyPassword(password, 'salt:hash:extra'), false);
});
