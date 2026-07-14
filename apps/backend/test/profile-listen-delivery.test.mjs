import assert from 'node:assert/strict';
import test from 'node:test';

import {
  beginProfileListenDelivery,
  createProfileListenDeliveryState,
  finishProfileListenDelivery,
  profileListenRetryDelayMs,
} from '../lib/profile-listen-delivery.ts';

test('profile listen delivery is only marked sent after provider acknowledgement', () => {
  const state = createProfileListenDeliveryState('youtube:track-1', 1_700_000_000);

  assert.deepEqual(
    beginProfileListenDelivery(state, 'scrobble', ['lastfm'], 1_000),
    ['lastfm'],
  );
  assert.equal(state.scrobble.lastfm.pending, true);
  assert.equal(state.scrobble.lastfm.sent, false);

  finishProfileListenDelivery(state, 'scrobble', { lastfm: true }, 1_100);

  assert.equal(state.scrobble.lastfm.pending, false);
  assert.equal(state.scrobble.lastfm.sent, true);
  assert.deepEqual(
    beginProfileListenDelivery(state, 'scrobble', ['lastfm'], 20_000),
    [],
  );
});

test('failed profile listen delivery retries with a bounded backoff', () => {
  const state = createProfileListenDeliveryState('youtube:track-1', 1_700_000_000);

  beginProfileListenDelivery(state, 'playing_now', ['lastfm'], 1_000);
  finishProfileListenDelivery(state, 'playing_now', { lastfm: false }, 1_100);

  assert.equal(profileListenRetryDelayMs(state, 'playing_now', ['lastfm'], 1_100), 5_000);

  assert.deepEqual(
    beginProfileListenDelivery(state, 'playing_now', ['lastfm'], 6_099),
    [],
  );
  assert.deepEqual(
    beginProfileListenDelivery(state, 'playing_now', ['lastfm'], 6_100),
    ['lastfm'],
  );

  finishProfileListenDelivery(state, 'playing_now', { lastfm: false }, 6_200);
  assert.deepEqual(
    beginProfileListenDelivery(state, 'playing_now', ['lastfm'], 21_200),
    ['lastfm'],
  );

  finishProfileListenDelivery(state, 'playing_now', { lastfm: false }, 21_300);
  assert.equal(profileListenRetryDelayMs(state, 'playing_now', ['lastfm'], 21_300), null);
  assert.deepEqual(
    beginProfileListenDelivery(state, 'playing_now', ['lastfm'], 999_999),
    [],
  );
});

test('profile providers keep independent acknowledgement state', () => {
  const state = createProfileListenDeliveryState('youtube:track-1', 1_700_000_000);

  beginProfileListenDelivery(state, 'scrobble', ['lastfm', 'listenbrainz'], 1_000);
  finishProfileListenDelivery(state, 'scrobble', {
    lastfm: false,
    listenbrainz: true,
  }, 1_100);

  assert.equal(state.scrobble.lastfm.sent, false);
  assert.equal(state.scrobble.listenbrainz.sent, true);
  assert.deepEqual(
    beginProfileListenDelivery(state, 'scrobble', ['lastfm', 'listenbrainz'], 6_100),
    ['lastfm'],
  );
});
