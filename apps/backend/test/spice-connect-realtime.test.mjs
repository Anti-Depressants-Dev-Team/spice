import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSpiceConnectCommandSignal,
  createSpiceConnectProbeSignal,
  encodeSpiceConnectSseEvent,
  initialSpiceConnectSseParserState,
  isSpiceConnectCommandSignalFor,
  parseSpiceConnectRealtimeSignal,
  parseSpiceConnectSseChunk,
  spiceConnectRealtimeDatabaseUrl,
  SPICE_CONNECT_REALTIME_HEARTBEAT_MS,
  SPICE_CONNECT_REALTIME_STREAM_LIFETIME_MS,
} from '../lib/spice-connect-realtime.ts';

test('Spice Connect realtime notifications are scoped to one user and receiver', () => {
  const signal = parseSpiceConnectRealtimeSignal(
    createSpiceConnectCommandSignal('user-1', 'desktop-1'),
  );
  assert.deepEqual(signal, {
    kind: 'command',
    userId: 'user-1',
    deviceId: 'desktop-1',
  });
  assert.equal(isSpiceConnectCommandSignalFor(signal, 'user-1', 'desktop-1'), true);
  assert.equal(isSpiceConnectCommandSignalFor(signal, 'user-2', 'desktop-1'), false);
  assert.equal(isSpiceConnectCommandSignalFor(signal, 'user-1', 'phone-1'), false);
  assert.equal(parseSpiceConnectRealtimeSignal('{broken'), null);
  assert.equal(parseSpiceConnectRealtimeSignal('{"kind":"command","userId":"","deviceId":"pc"}'), null);
});

test('Spice Connect readiness probes cannot be mistaken for commands', () => {
  const signal = parseSpiceConnectRealtimeSignal(createSpiceConnectProbeSignal('probe-1'));
  assert.deepEqual(signal, { kind: 'probe', nonce: 'probe-1' });
  assert.equal(isSpiceConnectCommandSignalFor(signal, 'probe-1', 'probe-1'), false);
});

test('realtime listener derives the direct Neon endpoint without changing other URLs', () => {
  assert.equal(
    spiceConnectRealtimeDatabaseUrl(
      'postgresql://spice:secret@ep-red-tree-123-pooler.eu-central-1.aws.neon.tech/spice?sslmode=require',
    ),
    'postgresql://spice:secret@ep-red-tree-123.eu-central-1.aws.neon.tech/spice?sslmode=require',
  );
  assert.equal(
    spiceConnectRealtimeDatabaseUrl('postgresql://spice:secret@db.example.com/spice'),
    'postgresql://spice:secret@db.example.com/spice',
  );
  assert.equal(spiceConnectRealtimeDatabaseUrl('not-a-url'), 'not-a-url');
});

test('desktop SSE parser handles split records, comments, and CRLF framing', () => {
  let state = initialSpiceConnectSseParserState();
  const first = parseSpiceConnectSseChunk(state, 'event: rea');
  state = first.state;
  assert.deepEqual(first.events, []);

  const second = parseSpiceConnectSseChunk(
    state,
    'dy\r\ndata: {}\r\n\r\n: keep-alive\n\nevent: command\ndata: {}\n\n',
  );
  assert.deepEqual(second.events, ['ready', 'command']);
  assert.deepEqual(second.state, initialSpiceConnectSseParserState());
  assert.equal(encodeSpiceConnectSseEvent('command'), 'event: command\ndata: {}\n\n');
});

test('realtime stream heartbeats precede the bounded reconnect window', () => {
  assert.ok(SPICE_CONNECT_REALTIME_HEARTBEAT_MS > 0);
  assert.ok(SPICE_CONNECT_REALTIME_STREAM_LIFETIME_MS >= SPICE_CONNECT_REALTIME_HEARTBEAT_MS * 3);
  assert.ok(SPICE_CONNECT_REALTIME_STREAM_LIFETIME_MS < 60_000);
});
