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
