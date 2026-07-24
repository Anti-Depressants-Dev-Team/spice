import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { tsImport } from 'tsx/esm/api';

const tsconfig = fileURLToPath(new URL('../tsconfig.json', import.meta.url));
const importRoute = (path) => tsImport(path, {
  parentURL: import.meta.url,
  tsconfig,
});

const [commandsRoute, eventsRoute, devicesRoute, authorizationsRoute, revokeRoute] = await Promise.all([
  importRoute('../app/api/remote/commands/route.ts'),
  importRoute('../app/api/remote/events/route.ts'),
  importRoute('../app/api/remote/devices/route.ts'),
  importRoute('../app/api/remote/pairing/authorizations/route.ts'),
  importRoute('../app/api/remote/pairing/authorizations/[authorizationId]/route.ts'),
]);

test('Spice Connect state and command routes require a live credential', async () => {
  const devices = await devicesRoute.GET(new Request('https://music.spice-app.xyz/api/remote/devices'));
  const forget = await devicesRoute.DELETE(new Request(
    'https://music.spice-app.xyz/api/remote/devices?sourceDeviceId=phone&deviceId=desktop',
    { method: 'DELETE' },
  ));
  const commands = await commandsRoute.GET(new Request(
    'https://music.spice-app.xyz/api/remote/commands?deviceId=desktop',
  ));
  const events = await eventsRoute.GET(new Request(
    'https://music.spice-app.xyz/api/remote/events?deviceId=desktop',
  ));
  assert.equal(devices.status, 401);
  assert.equal(forget.status, 401);
  assert.equal(commands.status, 401);
  assert.equal(events.status, 401);
});

test('Spice Connect authorization list and revoke routes require an account credential', async () => {
  const request = new Request('https://music.spice-app.xyz/api/remote/pairing/authorizations');
  const authorizations = await authorizationsRoute.GET(request);
  const revoke = await revokeRoute.DELETE(request, {
    params: Promise.resolve({ authorizationId: '3c4703df-00f7-4cb8-82b7-0fa6ea4a15b2' }),
  });
  assert.equal(authorizations.status, 401);
  assert.equal(revoke.status, 401);
});

test('Spice Connect preflights reflect allowed cross-origin clients', () => {
  const request = new Request('https://music.spice-app.xyz/api/remote/devices', {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:3939' },
  });
  const devices = devicesRoute.OPTIONS(request);
  const commands = commandsRoute.OPTIONS(request);
  const events = eventsRoute.OPTIONS(request);
  assert.equal(devices.headers.get('Access-Control-Allow-Origin'), 'http://localhost:3939');
  assert.equal(commands.headers.get('Access-Control-Allow-Origin'), 'http://localhost:3939');
  assert.equal(events.headers.get('Access-Control-Allow-Origin'), 'http://localhost:3939');
});

test('idempotent revoke targets only the credential generation it revoked', async () => {
  const source = await readFile(
    new URL('../app/api/remote/pairing/authorizations/[authorizationId]/route.ts', import.meta.url),
    'utf8',
  );
  assert.match(source, /resolveRemoteAuthorizationRevoke/);
  assert.match(source, /eq\(remoteDevices\.pairedAuthorizationHash, revoked\.tokenHash\)/);
  assert.match(source, /alreadyRevoked: resolution\.alreadyRevoked/);
});

test('remote command polling deletes terminal commands after their delivery TTL', async () => {
  const source = await readFile(
    new URL('../app/api/remote/commands/route.ts', import.meta.url),
    'utf8',
  );
  assert.match(source, /WITH stale_commands AS \(\s*DELETE FROM/s);
  assert.match(source, /createdAt\} < \$\{staleCutoff\}/);
  assert.doesNotMatch(source, /WITH stale_commands AS \(\s*UPDATE/s);
});

test('remote commands and device state use Redis wakeups with a durable fallback', async () => {
  const [commandsSource, eventsSource, devicesSource] = await Promise.all([
    readFile(new URL('../app/api/remote/commands/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/api/remote/events/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/api/remote/devices/route.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(commandsSource, /enqueueSpiceConnectCommand/);
  assert.match(commandsSource, /publishSpiceConnectRedisSignal/);
  assert.match(commandsSource, /SELECT pg_notify/);
  assert.match(commandsSource, /polling remains authoritative/);
  assert.match(eventsSource, /subscribeSpiceConnectRedisSignals/);
  assert.match(eventsSource, /X-Spice-Connect-Realtime': 'redis'/);
  assert.match(eventsSource, /text\/event-stream/);
  assert.match(eventsSource, /SPICE_CONNECT_REALTIME_STREAM_LIFETIME_MS/);
  assert.match(eventsSource, /status: 503/);
  assert.match(devicesSource, /writeSpiceConnectDeviceState/);
  assert.match(devicesSource, /reserveSpiceConnectDeviceCheckpoint/);
});

test('remote device discovery prunes snapshots after the one-month retention window', async () => {
  const source = await readFile(
    new URL('../app/api/remote/devices/route.ts', import.meta.url),
    'utf8',
  );
  assert.match(source, /delete\(remoteDevices\)/);
  assert.match(source, /SPICE_CONNECT_DEVICE_RETENTION_MS/);
  assert.match(source, /lt\(remoteDevices\.updatedAt/);
});
