export const SPICE_CONNECT_REALTIME_CHANNEL = 'spice_connect_commands';
export const SPICE_CONNECT_REALTIME_HEARTBEAT_MS = 12_000;
export const SPICE_CONNECT_REALTIME_STREAM_LIFETIME_MS = 50_000;
export const SPICE_CONNECT_REALTIME_PROBE_TIMEOUT_MS = 1_500;
export const SPICE_CONNECT_REALTIME_RECONNECT_MIN_MS = 250;
export const SPICE_CONNECT_REALTIME_RECONNECT_MAX_MS = 5_000;

type SpiceConnectCommandSignal = {
  kind: 'command';
  userId: string;
  deviceId: string;
};

type SpiceConnectProbeSignal = {
  kind: 'probe';
  nonce: string;
};

export type SpiceConnectRealtimeSignal = SpiceConnectCommandSignal | SpiceConnectProbeSignal;

export type SpiceConnectSseParserState = {
  pending: string;
  eventName: string;
};

export function createSpiceConnectCommandSignal(userId: string, deviceId: string) {
  return JSON.stringify({
    kind: 'command',
    userId: userId.slice(0, 120),
    deviceId: deviceId.slice(0, 120),
  } satisfies SpiceConnectCommandSignal);
}

export function createSpiceConnectProbeSignal(nonce: string) {
  return JSON.stringify({
    kind: 'probe',
    nonce: nonce.slice(0, 120),
  } satisfies SpiceConnectProbeSignal);
}

export function parseSpiceConnectRealtimeSignal(payload: string | null | undefined): SpiceConnectRealtimeSignal | null {
  if (!payload) return null;
  try {
    const value = JSON.parse(payload) as Record<string, unknown>;
    if (
      value.kind === 'command'
      && typeof value.userId === 'string'
      && value.userId.length > 0
      && value.userId.length <= 120
      && typeof value.deviceId === 'string'
      && value.deviceId.length > 0
      && value.deviceId.length <= 120
    ) {
      return { kind: 'command', userId: value.userId, deviceId: value.deviceId };
    }
    if (
      value.kind === 'probe'
      && typeof value.nonce === 'string'
      && value.nonce.length > 0
      && value.nonce.length <= 120
    ) {
      return { kind: 'probe', nonce: value.nonce };
    }
  } catch {
    // Notifications are hints only. Invalid payloads are ignored and the
    // durable command poll remains the source of truth.
  }
  return null;
}

export function isSpiceConnectCommandSignalFor(
  signal: SpiceConnectRealtimeSignal | null,
  userId: string,
  deviceId: string,
): signal is SpiceConnectCommandSignal {
  return signal?.kind === 'command'
    && signal.userId === userId
    && signal.deviceId === deviceId;
}

export function spiceConnectRealtimeDatabaseUrl(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl);
    if (
      url.hostname.endsWith('.neon.tech')
      && /-pooler(?=\.)/.test(url.hostname)
    ) {
      url.hostname = url.hostname.replace(/-pooler(?=\.)/, '');
      return url.toString();
    }
  } catch {
    // Let the database client report malformed or unsupported URLs. Keeping
    // the original value also preserves non-Neon connection configurations.
  }
  return databaseUrl;
}

export function encodeSpiceConnectSseEvent(eventName: 'ready' | 'command') {
  return `event: ${eventName}\ndata: {}\n\n`;
}

export function initialSpiceConnectSseParserState(): SpiceConnectSseParserState {
  return { pending: '', eventName: '' };
}

export function parseSpiceConnectSseChunk(
  state: SpiceConnectSseParserState,
  chunk: string,
): { state: SpiceConnectSseParserState; events: string[] } {
  const lines = `${state.pending}${chunk}`.split('\n');
  const pending = lines.pop() ?? '';
  let eventName = state.eventName;
  const events: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (line === '') {
      if (eventName) events.push(eventName);
      eventName = '';
    } else if (line.startsWith('event:')) {
      eventName = line.slice('event:'.length).trim();
    }
  }

  return {
    state: { pending, eventName },
    events,
  };
}
