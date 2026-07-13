import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isSpiceConnectCommandFresh,
  normalizeSpiceConnectCommandInput,
  normalizeSpiceConnectDeviceInput,
  parseRemotePayload,
  safeRemotePayload,
  spiceConnectCommandPollDelay,
  SPICE_CONNECT_COMMAND_ACTIVE_POLL_INTERVAL_MS,
  SPICE_CONNECT_COMMAND_HIDDEN_POLL_INTERVAL_MS,
  SPICE_CONNECT_COMMAND_IDLE_POLL_INTERVAL_MS,
  SPICE_CONNECT_CONTROLLER_REFRESH_INTERVAL_MS,
  SPICE_CONNECT_DEVICE_SYNC_INTERVAL_MS,
  SPICE_CONNECT_COMMAND_TTL_MS,
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

test('Spice Connect keeps active and background receivers responsive', () => {
  assert.ok(SPICE_CONNECT_COMMAND_ACTIVE_POLL_INTERVAL_MS <= 2_000);
  assert.ok(SPICE_CONNECT_COMMAND_IDLE_POLL_INTERVAL_MS <= 3_000);
  assert.ok(SPICE_CONNECT_COMMAND_HIDDEN_POLL_INTERVAL_MS <= 5_000);
  assert.ok(SPICE_CONNECT_CONTROLLER_REFRESH_INTERVAL_MS <= 2_000);
  assert.ok(SPICE_CONNECT_OPTIMISTIC_STATE_WINDOW_MS > SPICE_CONNECT_COMMAND_HIDDEN_POLL_INTERVAL_MS);
  assert.ok(SPICE_CONNECT_STALE_DEVICE_SECONDS * 1000 >= SPICE_CONNECT_DEVICE_SYNC_INTERVAL_MS * 2);

  assert.equal(spiceConnectCommandPollDelay({ visible: true, emptyPolls: 0 }), SPICE_CONNECT_COMMAND_ACTIVE_POLL_INTERVAL_MS);
  assert.equal(spiceConnectCommandPollDelay({ visible: true, emptyPolls: 3 }), SPICE_CONNECT_COMMAND_IDLE_POLL_INTERVAL_MS);
  assert.equal(spiceConnectCommandPollDelay({ visible: false, emptyPolls: 0 }), SPICE_CONNECT_COMMAND_HIDDEN_POLL_INTERVAL_MS);
});
