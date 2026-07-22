import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  isSpiceConnectCommandDeliverable,
  isSpiceConnectCommandFresh,
  isSpiceConnectDeviceStale,
  isSpiceConnectDeviceRemembered,
  isSpiceConnectRemoteDeviceVisible,
  normalizeSpiceConnectCommandInput,
  normalizeSpiceConnectDeviceInput,
  parseRemotePayload,
  projectSpiceConnectProgressMs,
  safeRemotePayload,
  spiceConnectCommandPollDelay,
  SPICE_CONNECT_COMMAND_ACTIVE_POLL_INTERVAL_MS,
  SPICE_CONNECT_COMMAND_HIDDEN_POLL_INTERVAL_MS,
  SPICE_CONNECT_COMMAND_IDLE_POLL_INTERVAL_MS,
  SPICE_CONNECT_CONTROLLER_REFRESH_INTERVAL_MS,
  SPICE_CONNECT_DEVICE_SYNC_INTERVAL_MS,
  SPICE_CONNECT_DEVICE_RETENTION_MS,
  SPICE_CONNECT_COMMAND_TTL_MS,
  SPICE_CONNECT_MAX_COMMAND_DELIVERY_ATTEMPTS,
  SPICE_CONNECT_COMMAND_REDELIVERY_MS,
  SPICE_CONNECT_OPTIMISTIC_STATE_WINDOW_MS,
  SPICE_CONNECT_STALE_DEVICE_SECONDS,
} from '../lib/spice-connect.ts';

test('Spice Connect device normalization bounds client-reported playback state', () => {
  const queue = Array.from({ length: 100 }, (_, index) => ({ id: `track-${index}` }));
  const input = normalizeSpiceConnectDeviceInput({
    deviceId: 'device-1',
    displayName: '  Living room laptop  ',
    currentTrack: { id: 'track-current' },
    queue,
    queueIndex: 120,
    isPlaying: 1,
    shuffleEnabled: true,
    repeatMode: 'one',
    progress: 42.4,
    duration: 1000000,
    volume: 140,
  });

  assert.ok(input);
  assert.equal(input.deviceId, 'device-1');
  assert.equal(input.displayName, 'Living room laptop');
  assert.equal(input.queue.length, 80);
  assert.equal(input.queueIndex, 79);
  assert.equal(input.isPlaying, true);
  assert.equal(input.shuffleEnabled, true);
  assert.equal(input.repeatMode, 'one');
  assert.equal(input.progressMs, 42400);
  assert.equal(input.durationMs, 86400000);
  assert.equal(input.volume, 100);
});

test('Spice Connect device normalization rejects missing device ids', () => {
  assert.equal(normalizeSpiceConnectDeviceInput({ displayName: 'No id' }), null);
});

test('Spice Connect command normalization accepts supported cross-device commands', () => {
  const input = normalizeSpiceConnectCommandInput({
    sourceDeviceId: 'phone',
    targetDeviceId: 'desktop',
    command: 'seek',
    payload: { progress: 91.5 },
  });

  assert.ok(!('error' in input));
  assert.equal(input.sourceDeviceId, 'phone');
  assert.equal(input.targetDeviceId, 'desktop');
  assert.equal(input.command, 'seek');
  assert.deepEqual(JSON.parse(input.payloadJson), { progress: 91.5 });
});

test('Spice Connect command normalization accepts remote track handoff payloads', () => {
  const input = normalizeSpiceConnectCommandInput({
    sourceDeviceId: 'phone',
    targetDeviceId: 'desktop',
    command: 'play_track',
    payload: {
      track: { id: 'yt-1', title: 'Remote Start' },
      queue: [{ id: 'yt-1', title: 'Remote Start' }],
      queueIndex: 0,
    },
  });

  assert.ok(!('error' in input));
  assert.equal(input.command, 'play_track');
  assert.deepEqual(JSON.parse(input.payloadJson), {
    track: { id: 'yt-1', title: 'Remote Start' },
    queue: [{ id: 'yt-1', title: 'Remote Start' }],
    queueIndex: 0,
  });
});

test('Spice Connect accepts an atomic playback handoff snapshot', () => {
  const input = normalizeSpiceConnectCommandInput({
    sourceDeviceId: 'desktop',
    targetDeviceId: 'phone',
    command: 'handoff',
    payload: {
      track: { id: 'yt-1' },
      queue: [{ id: 'yt-1' }],
      queueIndex: 0,
      progress: 42.5,
      isPlaying: true,
      volume: 67,
      shuffleEnabled: true,
      repeatMode: 'all',
    },
  });

  assert.ok(!('error' in input));
  assert.equal(input.command, 'handoff');
  assert.equal(JSON.parse(input.payloadJson).progress, 42.5);
});

test('Spice Connect command normalization accepts idempotent shuffle and repeat payloads', () => {
  const shuffle = normalizeSpiceConnectCommandInput({
    sourceDeviceId: 'phone',
    targetDeviceId: 'desktop',
    command: 'shuffle',
    payload: { enabled: true },
  });
  const repeat = normalizeSpiceConnectCommandInput({
    sourceDeviceId: 'desktop',
    targetDeviceId: 'phone',
    command: 'repeat',
    payload: { mode: 'one' },
  });

  assert.ok(!('error' in shuffle));
  assert.ok(!('error' in repeat));
  assert.deepEqual(JSON.parse(shuffle.payloadJson), { enabled: true });
  assert.deepEqual(JSON.parse(repeat.payloadJson), { mode: 'one' });
});

test('Spice Connect command normalization rejects same-device and unsupported commands', () => {
  assert.deepEqual(
    normalizeSpiceConnectCommandInput({
      sourceDeviceId: 'desktop',
      targetDeviceId: 'desktop',
      command: 'play',
    }),
    { error: 'same_device', message: 'Choose another device to control.' },
  );

  assert.deepEqual(
    normalizeSpiceConnectCommandInput({
      sourceDeviceId: 'phone',
      targetDeviceId: 'desktop',
      command: 'delete-everything',
    }),
    { error: 'invalid_command', message: 'Unsupported Spice Connect command.' },
  );
});

test('Spice Connect payload helpers tolerate invalid or circular payloads', () => {
  const circular = {};
  circular.self = circular;

  assert.equal(safeRemotePayload(circular), '{}');
  assert.deepEqual(parseRemotePayload('not json'), {});
  assert.deepEqual(parseRemotePayload('{"volume":44}'), { volume: 44 });
});

test('Spice Connect command freshness rejects stale or invalid timestamps', () => {
  const now = new Date('2026-06-13T12:00:00.000Z');
  const fresh = new Date(now.getTime() - SPICE_CONNECT_COMMAND_TTL_MS + 250);
  const stale = new Date(now.getTime() - SPICE_CONNECT_COMMAND_TTL_MS - 1);

  assert.equal(isSpiceConnectCommandFresh(fresh, now), true);
  assert.equal(isSpiceConnectCommandFresh(stale, now), false);
  assert.equal(isSpiceConnectCommandFresh('not-a-date', now), false);
});

test('Spice Connect retries command delivery briefly without retrying forever', () => {
  const now = new Date('2026-07-14T12:00:00.000Z');
  const createdAt = new Date(now.getTime() - 20_000);

  assert.equal(isSpiceConnectCommandDeliverable({
    createdAt,
    deliveryAttempts: 0,
  }, now), true);
  assert.equal(isSpiceConnectCommandDeliverable({
    createdAt,
    consumedAt: new Date(now.getTime() - SPICE_CONNECT_COMMAND_REDELIVERY_MS + 1),
    deliveryAttempts: 1,
  }, now), false);
  assert.equal(isSpiceConnectCommandDeliverable({
    createdAt,
    consumedAt: new Date(now.getTime() - SPICE_CONNECT_COMMAND_REDELIVERY_MS),
    deliveryAttempts: 1,
  }, now), true);
  assert.equal(isSpiceConnectCommandDeliverable({
    createdAt,
    consumedAt: new Date(now.getTime() - SPICE_CONNECT_COMMAND_REDELIVERY_MS),
    deliveryAttempts: SPICE_CONNECT_MAX_COMMAND_DELIVERY_ATTEMPTS,
  }, now), false);
});

test('Spice Connect visibility follows the exact paired credential generation', () => {
  const now = new Date('2026-07-14T12:00:00.000Z');
  const revokedAt = new Date(now.getTime() - 30_000);
  const expiresAt = new Date(now.getTime() + 60_000);

  assert.equal(isSpiceConnectRemoteDeviceVisible(null, [], now), true);
  assert.equal(isSpiceConnectRemoteDeviceVisible(
    'active-generation',
    [{ tokenHash: 'active-generation', expiresAt }],
    now,
  ), true);
  assert.equal(isSpiceConnectRemoteDeviceVisible(
    'old-generation',
    [{ tokenHash: 'new-generation', expiresAt }],
    now,
  ), false);
  assert.equal(isSpiceConnectRemoteDeviceVisible(
    'revoked-generation',
    [{ tokenHash: 'revoked-generation', expiresAt, revokedAt }],
    now,
  ), false);
});

test('Spice Connect projects recent playing progress and clamps it to duration', () => {
  const now = new Date('2026-07-14T12:00:10.000Z');
  const state = {
    progressMs: 40_000,
    durationMs: 45_000,
    isPlaying: true,
    updatedAt: new Date(now.getTime() - 2_000),
  };

  assert.equal(projectSpiceConnectProgressMs(state, now), 42_000);
  assert.equal(projectSpiceConnectProgressMs({ ...state, progressMs: 44_000 }, now), 45_000);
  assert.equal(projectSpiceConnectProgressMs({ ...state, isPlaying: false }, now), 40_000);
});

test('Spice Connect progress stays monotonic at the stale-device cutoff', () => {
  const updatedAt = new Date('2026-07-14T12:00:00.000Z');
  const state = {
    progressMs: 10_000,
    durationMs: 200_000,
    isPlaying: true,
    updatedAt,
  };
  const atCutoff = new Date(updatedAt.getTime() + SPICE_CONNECT_STALE_DEVICE_SECONDS * 1000);
  const afterCutoff = new Date(atCutoff.getTime() + 30_000);

  const expectedCutoffProgress = 10_000 + SPICE_CONNECT_STALE_DEVICE_SECONDS * 1000;
  assert.equal(projectSpiceConnectProgressMs(state, atCutoff), expectedCutoffProgress);
  assert.equal(projectSpiceConnectProgressMs(state, afterCutoff), expectedCutoffProgress);
  assert.equal(isSpiceConnectDeviceStale(updatedAt, new Date(atCutoff.getTime() - 1)), false);
  assert.equal(isSpiceConnectDeviceStale(updatedAt, atCutoff), true);
});

test('Spice Connect remembers offline devices for one month', () => {
  const now = new Date('2026-07-22T12:00:00.000Z');
  assert.equal(isSpiceConnectDeviceRemembered(
    new Date(now.getTime() - SPICE_CONNECT_DEVICE_RETENTION_MS + 1),
    now,
  ), true);
  assert.equal(isSpiceConnectDeviceRemembered(
    new Date(now.getTime() - SPICE_CONNECT_DEVICE_RETENTION_MS),
    now,
  ), false);
  assert.equal(isSpiceConnectDeviceRemembered('not-a-date', now), false);
});

test('Spice Connect keeps active and background receivers responsive', () => {
  assert.ok(SPICE_CONNECT_COMMAND_ACTIVE_POLL_INTERVAL_MS <= 500);
  assert.ok(SPICE_CONNECT_COMMAND_IDLE_POLL_INTERVAL_MS <= 1_500);
  assert.ok(SPICE_CONNECT_COMMAND_HIDDEN_POLL_INTERVAL_MS <= 3_000);
  assert.ok(SPICE_CONNECT_CONTROLLER_REFRESH_INTERVAL_MS <= 750);
  assert.ok(SPICE_CONNECT_OPTIMISTIC_STATE_WINDOW_MS > SPICE_CONNECT_COMMAND_HIDDEN_POLL_INTERVAL_MS);
  assert.ok(SPICE_CONNECT_STALE_DEVICE_SECONDS * 1000 >= SPICE_CONNECT_DEVICE_SYNC_INTERVAL_MS * 2);

  assert.equal(spiceConnectCommandPollDelay({ visible: true, emptyPolls: 0 }), SPICE_CONNECT_COMMAND_ACTIVE_POLL_INTERVAL_MS);
  assert.equal(spiceConnectCommandPollDelay({ visible: true, emptyPolls: 3 }), SPICE_CONNECT_COMMAND_IDLE_POLL_INTERVAL_MS);
  assert.equal(spiceConnectCommandPollDelay({ visible: false, emptyPolls: 0 }), SPICE_CONNECT_COMMAND_HIDDEN_POLL_INTERVAL_MS);
});

test('Spice Connect command redelivery migration bounds the delivery index', async () => {
  const [migration, journalJson] = await Promise.all([
    readFile(new URL('../db/migrations/0013_blue_shooting_star.sql', import.meta.url), 'utf8'),
    readFile(new URL('../db/migrations/meta/_journal.json', import.meta.url), 'utf8'),
  ]);
  const journal = JSON.parse(journalJson);
  assert.match(migration, /ADD COLUMN "delivery_attempts" integer DEFAULT 0 NOT NULL/i);
  assert.match(migration, /SET "delivery_attempts" = 3 WHERE "consumed_at" IS NOT NULL/i);
  assert.match(migration, /FROM "remote_device_authorizations" AS paired_auth/i);
  assert.match(migration, /WHERE "remote_commands"\."delivery_attempts" < 3/i);
  assert.match(migration, /ADD COLUMN "paired_authorization_hash" text/i);
  assert.match(migration, /SET "paired_authorization_hash" = paired_auth\."token_hash"/i);
  assert.ok(journal.entries.some((entry) => entry.tag === '0013_blue_shooting_star'));
});
