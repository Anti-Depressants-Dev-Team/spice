import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';

import { submitLastFmNowPlaying, submitLastFmScrobble } from '../lib/lastfm.ts';

function expectedSignature(params, sharedSecret) {
  const signatureBase = Object.entries(params)
    .filter(([key]) => key !== 'format' && key !== 'callback' && key !== 'api_sig')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}${value}`)
    .join('');

  return createHash('md5').update(`${signatureBase}${sharedSecret}`, 'utf8').digest('hex');
}

test('Last.fm now-playing submits signed track metadata from backend credentials', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.LASTFM_API_KEY;
  const originalSharedSecret = process.env.LASTFM_SHARED_SECRET;
  let captured;

  process.env.LASTFM_API_KEY = 'api-key';
  process.env.LASTFM_SHARED_SECRET = 'shared-secret';
  globalThis.fetch = async (url, init) => {
    captured = { url, init };
    return new Response(JSON.stringify({ accepted: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.LASTFM_API_KEY;
    } else {
      process.env.LASTFM_API_KEY = originalApiKey;
    }
    if (originalSharedSecret === undefined) {
      delete process.env.LASTFM_SHARED_SECRET;
    } else {
      process.env.LASTFM_SHARED_SECRET = originalSharedSecret;
    }
  });

  await submitLastFmNowPlaying({
    sessionKey: 'session-key',
    track: {
      title: 'Digital Love',
      artist: 'Daft Punk',
      album: 'Discovery',
      durationMs: 214900,
    },
  });

  assert.equal(captured.url, 'https://ws.audioscrobbler.com/2.0/');
  assert.equal(captured.init.method, 'POST');
  assert.equal(captured.init.headers['Content-Type'], 'application/x-www-form-urlencoded');

  const params = Object.fromEntries(new URLSearchParams(captured.init.body));
  assert.equal(params.method, 'track.updateNowPlaying');
  assert.equal(params.artist, 'Daft Punk');
  assert.equal(params.track, 'Digital Love');
  assert.equal(params.album, 'Discovery');
  assert.equal(params.duration, '215');
  assert.equal(params.api_key, 'api-key');
  assert.equal(params.sk, 'session-key');
  assert.equal(params.api_sig, expectedSignature(params, 'shared-secret'));
});

test('Last.fm scrobble requires an explicit playback start timestamp', async () => {
  await assert.rejects(
    submitLastFmScrobble({
      sessionKey: 'session-key',
      track: {
        title: 'Digital Love',
        artist: 'Daft Punk',
      },
    }),
    /playback start timestamp/,
  );
});
