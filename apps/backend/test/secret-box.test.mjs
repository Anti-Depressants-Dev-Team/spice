import test from 'node:test';
import assert from 'node:assert';
import { encryptSecret, decryptSecret } from '../lib/secret-box.ts';

test('secret-box uses JWT_SECRET or PROFILE_CONNECTION_SECRET', () => {
  process.env.JWT_SECRET = 'test_jwt_secret';
  const encrypted = encryptSecret('my_secret_data');
  const decrypted = decryptSecret(encrypted);
  assert.strictEqual(decrypted, 'my_secret_data');

  delete process.env.JWT_SECRET;
  process.env.PROFILE_CONNECTION_SECRET = 'test_profile_secret';
  const encrypted2 = encryptSecret('another_secret');
  const decrypted2 = decryptSecret(encrypted2);
  assert.strictEqual(decrypted2, 'another_secret');

  delete process.env.PROFILE_CONNECTION_SECRET;
});

test('secret-box throws error when no secret is configured', () => {
  delete process.env.JWT_SECRET;
  delete process.env.PROFILE_CONNECTION_SECRET;
  assert.throws(() => encryptSecret('data'), /Missing encryption key/);
  assert.throws(() => decryptSecret('v1:iv:tag:data'), /Missing encryption key/);
process.env.JWT_SECRET = 'test-secret-key-123';
import assert from 'node:assert/strict';
import test from 'node:test';

import { encryptSecret, decryptSecret } from '../lib/secret-box.ts';

test('encryptSecret generates correctly formatted v1 string', () => {
  const encrypted = encryptSecret('test-secret');

  assert.equal(encrypted.startsWith('v1:'), true);

  const parts = encrypted.split(':');
  assert.equal(parts.length, 4); // prefix, iv, tag, ciphertext
  assert.equal(parts[0], 'v1');
  assert.ok(parts[1].length > 0);
  assert.ok(parts[2].length > 0);
  assert.ok(parts[3].length > 0);
});

test('decryptSecret recovers original text from encryptSecret output', () => {
  const original = 'super-secret-value-123!@#';
  const encrypted = encryptSecret(original);
  const decrypted = decryptSecret(encrypted);

  assert.equal(decrypted, original);
});

test('encryptSecret uses random IVs (different output for same input)', () => {
  const input = 'same-secret-value';
  const encrypted1 = encryptSecret(input);
  const encrypted2 = encryptSecret(input);

  assert.notEqual(encrypted1, encrypted2);

  // Both should still decrypt to the same value
  assert.equal(decryptSecret(encrypted1), input);
  assert.equal(decryptSecret(encrypted2), input);
});

test('decryptSecret returns raw input unmodified if lacking v1: prefix', () => {
  const legacySecret = 'legacy-unencrypted-secret';
  assert.equal(decryptSecret(legacySecret), legacySecret);
});

test('decryptSecret throws error when given malformed v1 strings', () => {
  assert.throws(() => decryptSecret('v1:only-two-parts'), {
    message: 'Invalid encrypted secret format.'
  });

  assert.throws(() => decryptSecret('v1:part1:part2'), {
    message: 'Invalid encrypted secret format.'
  });
});

test('decryptSecret throws error when decrypting tampered data', () => {
  const original = 'secret-to-tamper';
  const encrypted = encryptSecret(original);
  const [prefix, iv, tag, ciphertext] = encrypted.split(':');

  // Tamper with ciphertext
  const tamperedCiphertext = Buffer.from(ciphertext, 'base64url');
  tamperedCiphertext[0] = tamperedCiphertext[0] ^ 1; // Flip a bit
  const tamperedData = [prefix, iv, tag, tamperedCiphertext.toString('base64url')].join(':');

  assert.throws(() => decryptSecret(tamperedData), (err) => {
    return err instanceof Error; // Should fail auth tag check
  });

  // Tamper with tag
  const tamperedTag = Buffer.from(tag, 'base64url');
  tamperedTag[0] = tamperedTag[0] ^ 1; // Flip a bit
  const tamperedTagData = [prefix, iv, tamperedTag.toString('base64url'), ciphertext].join(':');

  assert.throws(() => decryptSecret(tamperedTagData), (err) => {
    return err instanceof Error; // Should fail auth tag check
  });
});
