import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  isListenTogetherSessionActive,
  listenTogetherApiErrorMessage,
  listenTogetherNeedsSeek,
  listenTogetherTrackKey,
  normalizeListenTogetherHostState,
  parseListenTogetherQueueState,
  parseListenTogetherTrack,
  projectListenTogetherProgressMs,
  serializeListenTogetherQueueState,
} from '../app/listen-together-core.ts';

test('Listen Together host state keeps the provider-aware active queue index', () => {
  const state = normalizeListenTogetherHostState({
    currentTrack: { id: 'same-id', sourceId: 'soundcloud', title: 'Active' },
    queue: [
      { id: 'same-id', sourceId: 'youtube_music', title: 'Different song' },
      { id: 'same-id', sourceId: 'soundcloud', title: 'Active' },
    ],
    queueIndex: 0,
    isPlaying: true,
    progressMs: 12_345.4,
    durationMs: 60_000,
    shuffleEnabled: true,
    repeatMode: 'all',
  });

  assert.equal(state.queueIndex, 1);
  assert.equal(state.progressMs, 12_345);
  assert.equal(state.isPlaying, true);
  assert.equal(listenTogetherTrackKey(state.currentTrack), 'soundcloud:same-id');
});

test('Listen Together queue envelopes round-trip controls and accept legacy arrays', () => {
  const serialized = serializeListenTogetherQueueState({
    queue: [{ id: 'one', sourceId: 'soundcloud' }],
    shuffleEnabled: true,
    repeatMode: 'one',
  });
  assert.deepEqual(parseListenTogetherQueueState(serialized), {
    queue: [{ id: 'one', sourceId: 'soundcloud' }],
    shuffleEnabled: true,
    repeatMode: 'one',
  });
  assert.deepEqual(parseListenTogetherQueueState('[{"id":"legacy"}]'), {
    queue: [{ id: 'legacy' }],
    shuffleEnabled: false,
    repeatMode: 'none',
  });
  assert.deepEqual(parseListenTogetherQueueState('{bad'), {
    queue: [],
    shuffleEnabled: false,
    repeatMode: 'none',
  });
});

test('Listen Together safely rejects corrupt or placeholder track payloads', () => {
  assert.equal(parseListenTogetherTrack('{bad'), null);
  assert.equal(parseListenTogetherTrack('{"id":"placeholder"}'), null);
  assert.deepEqual(parseListenTogetherTrack('{"id":"valid","title":"Song"}'), {
    id: 'valid',
    title: 'Song',
  });
});

test('Listen Together projects playing progress using server time and clamps duration', () => {
  const projected = projectListenTogetherProgressMs({
    progressMs: 10_000,
    durationMs: 12_000,
    isPlaying: true,
    updatedAt: 1_000,
    now: 4_500,
  });
  assert.equal(projected, 12_000);
  assert.equal(projectListenTogetherProgressMs({
    progressMs: 10_000,
    durationMs: 12_000,
    isPlaying: false,
    updatedAt: 1_000,
    now: 4_500,
  }), 10_000);
});

test('Listen Together activity and drift thresholds are bounded', () => {
  assert.equal(isListenTogetherSessionActive(10_000, 129_999), true);
  assert.equal(isListenTogetherSessionActive(10_000, 130_001), false);
  assert.equal(listenTogetherNeedsSeek(10, 11_500), false);
  assert.equal(listenTogetherNeedsSeek(10, 11_501), true);
});

test('Listen Together API errors use a bounded server message with a safe fallback', () => {
  assert.equal(
    listenTogetherApiErrorMessage({ message: '  Database update is still finishing.  ' }, 'Fallback'),
    'Database update is still finishing.',
  );
  assert.equal(listenTogetherApiErrorMessage({ message: '   ' }, 'Fallback'), 'Fallback');
  assert.equal(listenTogetherApiErrorMessage(null, 'Fallback'), 'Fallback');
  assert.equal(
    listenTogetherApiErrorMessage({ message: 'x'.repeat(300) }, 'Fallback').length,
    240,
  );
});

test('Listen Together uniqueness migration removes legacy duplicates before adding indexes', async () => {
  const [migration, journal] = await Promise.all([
    readFile(new URL('../db/migrations/0014_lying_maddog.sql', import.meta.url), 'utf8'),
    readFile(new URL('../db/migrations/meta/_journal.json', import.meta.url), 'utf8'),
  ]);
  const sessionDelete = migration.indexOf('DELETE FROM "listen_together_sessions"');
  const sessionIndex = migration.indexOf('CREATE UNIQUE INDEX "listen_together_sessions_host_user_unique"');
  const inviteDelete = migration.indexOf('DELETE FROM "listen_together_invites"');
  const inviteIndex = migration.indexOf('CREATE UNIQUE INDEX "listen_together_invites_session_user_unique"');
  assert.ok(sessionDelete >= 0 && sessionDelete < sessionIndex);
  assert.ok(inviteDelete >= 0 && inviteDelete < inviteIndex);
  assert.match(journal, /"tag": "0014_lying_maddog"/);
});
