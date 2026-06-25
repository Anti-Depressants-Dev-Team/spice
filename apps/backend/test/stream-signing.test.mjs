import test from 'node:test';
import assert from 'node:assert';
import { buildSignedStreamUrl } from '../lib/stream-signing.ts';

test('STREAM_HMAC_SECRET required in production', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSpice = process.env.SPICE_STREAM_HMAC_SECRET;
  const originalStream = process.env.STREAM_HMAC_SECRET;
  const originalAuth = process.env.AUTH_SECRET;
  const originalNext = process.env.NEXTAUTH_SECRET;

  process.env.NODE_ENV = 'production';
  delete process.env.SPICE_STREAM_HMAC_SECRET;
  delete process.env.STREAM_HMAC_SECRET;
  delete process.env.AUTH_SECRET;
  delete process.env.NEXTAUTH_SECRET;

  try {
    buildSignedStreamUrl('https://example.com', { id: 'test', itag: 1, expiresAt: 0, upstreamUrl: 'test' });
    assert.fail('Should have thrown');
  } catch (err) {
    assert.match(err.message, /STREAM_HMAC_SECRET is required in production/);
  }

  process.env.NODE_ENV = originalEnv;
  if (originalSpice !== undefined) process.env.SPICE_STREAM_HMAC_SECRET = originalSpice;
  if (originalStream !== undefined) process.env.STREAM_HMAC_SECRET = originalStream;
  if (originalAuth !== undefined) process.env.AUTH_SECRET = originalAuth;
  if (originalNext !== undefined) process.env.NEXTAUTH_SECRET = originalNext;
});
// import assert from 'node:assert/strict';
import { verifySignedStream } from '../lib/stream-signing.ts';

test('stream signing builds a verifiable URL', () => {
  const origin = 'https://spice.example.com';
  const input = {
    id: 'dQw4w9WgXcQ',
    itag: 251,
    upstreamUrl: 'https://rr1---sn-ixx-ixxe.googlevideo.com/videoplayback?expire=1719356616&ei=CC17ZsfEBsKix_APzIeU2AQ&ip=2001:db8::1&id=o-AEW1...',
    expiresAt: Date.now() + 1000 * 60 * 60, // 1 hour
  };

  const signedUrlString = buildSignedStreamUrl(origin, input);
  const signedUrl = new URL(signedUrlString);

  assert.equal(signedUrl.origin, origin);
  assert.equal(signedUrl.pathname, `/api/yt/stream/${input.id}`);
  assert.equal(signedUrl.searchParams.get('itag'), String(input.itag));
  assert.equal(signedUrl.searchParams.get('expires'), String(input.expiresAt));
  assert.equal(Buffer.from(signedUrl.searchParams.get('u'), 'base64url').toString(), input.upstreamUrl);

  const sig = signedUrl.searchParams.get('sig');
  assert.ok(sig);

  const isValid = verifySignedStream(input, sig);
  assert.ok(isValid);
});

test('stream signing rejects tampered signatures', () => {
  const origin = 'https://spice.example.com';
  const input = {
    id: 'dQw4w9WgXcQ',
    itag: 251,
    upstreamUrl: 'https://rr1---sn-ixx-ixxe.googlevideo.com/videoplayback?...',
    expiresAt: Date.now() + 1000 * 60 * 60, // 1 hour
  };

  const signedUrlString = buildSignedStreamUrl(origin, input);
  const signedUrl = new URL(signedUrlString);
  const sig = signedUrl.searchParams.get('sig');

  // Tamper with the ID
  const tamperedInputId = { ...input, id: 'differentId' };
  assert.equal(verifySignedStream(tamperedInputId, sig), false);

  // Tamper with the upstream URL
  const tamperedInputUrl = { ...input, upstreamUrl: 'https://different-url.com' };
  assert.equal(verifySignedStream(tamperedInputUrl, sig), false);

  // Tamper with the signature itself
  assert.equal(verifySignedStream(input, sig + 'x'), false);
  assert.equal(verifySignedStream(input, sig.slice(0, -1)), false);
  assert.equal(verifySignedStream(input, 'invalid-signature-value-here'), false);

  // Missing signature
  assert.equal(verifySignedStream(input, null), false);
  assert.equal(verifySignedStream(input, ''), false);
});

test('stream signing rejects expired URLs', () => {
  const origin = 'https://spice.example.com';
  const input = {
    id: 'dQw4w9WgXcQ',
    itag: 251,
    upstreamUrl: 'https://rr1---sn-ixx-ixxe.googlevideo.com/videoplayback?...',
    expiresAt: Date.now() - 1000, // expired 1 second ago
  };

  const signedUrlString = buildSignedStreamUrl(origin, input);
  const signedUrl = new URL(signedUrlString);
  const sig = signedUrl.searchParams.get('sig');

  assert.equal(verifySignedStream(input, sig), false);
});
