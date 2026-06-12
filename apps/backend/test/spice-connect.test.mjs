import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeSpiceConnectCommandInput,
  normalizeSpiceConnectDeviceInput,
  parseRemotePayload,
  safeRemotePayload,
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
