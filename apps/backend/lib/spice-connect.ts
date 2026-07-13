export type SpiceConnectCommandType =
  | 'play'
  | 'pause'
  | 'toggle'
  | 'next'
  | 'previous'
  | 'seek'
  | 'volume'
  | 'shuffle'
  | 'repeat'
  | 'play_track';

export type SpiceConnectRepeatMode = 'none' | 'all' | 'one';

export const SPICE_CONNECT_COMMAND_TTL_MS = 240000;
export const SPICE_CONNECT_COMMAND_ACTIVE_POLL_INTERVAL_MS = 1500;
export const SPICE_CONNECT_COMMAND_IDLE_POLL_INTERVAL_MS = 3000;
export const SPICE_CONNECT_COMMAND_HIDDEN_POLL_INTERVAL_MS = 5000;
export const SPICE_CONNECT_COMMAND_IDLE_BACKOFF_POLLS = 3;
export const SPICE_CONNECT_CONTROLLER_REFRESH_INTERVAL_MS = 2000;
export const SPICE_CONNECT_DEVICE_SYNC_INTERVAL_MS = 30000;
export const SPICE_CONNECT_POST_COMMAND_SYNC_DELAY_MS = 300;
export const SPICE_CONNECT_STATE_REPORT_DEBOUNCE_MS = 250;
export const SPICE_CONNECT_OPTIMISTIC_STATE_WINDOW_MS = 6000;
export const SPICE_CONNECT_STALE_DEVICE_SECONDS = 90;

export function spiceConnectCommandPollDelay({
  visible,
  emptyPolls,
}: {
  visible: boolean;
  emptyPolls: number;
}) {
  if (!visible) return SPICE_CONNECT_COMMAND_HIDDEN_POLL_INTERVAL_MS;
  return emptyPolls >= SPICE_CONNECT_COMMAND_IDLE_BACKOFF_POLLS
    ? SPICE_CONNECT_COMMAND_IDLE_POLL_INTERVAL_MS
    : SPICE_CONNECT_COMMAND_ACTIVE_POLL_INTERVAL_MS;
}

export interface SpiceConnectDeviceInput {
  deviceId: string;
  displayName: string;
  currentTrack: unknown;
  queue: unknown[];
  queueIndex: number;
  isPlaying: boolean;
  shuffleEnabled: boolean;
  repeatMode: SpiceConnectRepeatMode;
  progressMs: number;
  durationMs: number;
  volume: number;
}

export interface SpiceConnectCommandInput {
  targetDeviceId: string;
  sourceDeviceId: string;
  command: SpiceConnectCommandType;
  payloadJson: string;
}

const allowedCommands = new Set<SpiceConnectCommandType>([
  'play',
  'pause',
  'toggle',
  'next',
  'previous',
  'seek',
  'volume',
  'shuffle',
  'repeat',
  'play_track',
]);

export function normalizeSpiceConnectRepeatMode(
  value: unknown,
  fallback: SpiceConnectRepeatMode = 'none',
): SpiceConnectRepeatMode {
  return value === 'none' || value === 'all' || value === 'one' ? value : fallback;
}

export function safeJsonStringify(value: unknown, fallback: string) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return fallback;
  }
}

export function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function boundedInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

export function normalizeSpiceConnectDeviceInput(body: Record<string, unknown>): SpiceConnectDeviceInput | null {
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.slice(0, 120) : '';
  if (!deviceId) return null;

  const displayName = typeof body.displayName === 'string' && body.displayName.trim()
    ? body.displayName.trim().slice(0, 80)
    : 'Spice Connect Device';
  const queue = Array.isArray(body.queue) ? body.queue.slice(0, 80) : [];
  const currentTrack = body.currentTrack && typeof body.currentTrack === 'object' ? body.currentTrack : null;

  return {
    deviceId,
    displayName,
    currentTrack,
    queue,
    queueIndex: boundedInteger(body.queueIndex, 0, 0, Math.max(queue.length - 1, 0)),
    isPlaying: Boolean(body.isPlaying),
    shuffleEnabled: body.shuffleEnabled === true,
    repeatMode: normalizeSpiceConnectRepeatMode(body.repeatMode),
    progressMs: boundedInteger(Number(body.progress ?? 0) * 1000, 0, 0, 24 * 60 * 60 * 1000),
    durationMs: boundedInteger(Number(body.duration ?? 0) * 1000, 0, 0, 24 * 60 * 60 * 1000),
    volume: boundedInteger(body.volume, 70, 0, 100),
  };
}

export function normalizeSpiceConnectCommandInput(body: Record<string, unknown>): SpiceConnectCommandInput | {
  error: 'invalid_device' | 'same_device' | 'invalid_command';
  message: string;
} {
  const targetDeviceId = typeof body.targetDeviceId === 'string' ? body.targetDeviceId.slice(0, 120) : '';
  const sourceDeviceId = typeof body.sourceDeviceId === 'string' ? body.sourceDeviceId.slice(0, 120) : '';
  const command = typeof body.command === 'string' ? body.command : '';

  if (!targetDeviceId || !sourceDeviceId) {
    return { error: 'invalid_device', message: 'Source and target device ids are required.' };
  }
  if (targetDeviceId === sourceDeviceId) {
    return { error: 'same_device', message: 'Choose another device to control.' };
  }
  if (!allowedCommands.has(command as SpiceConnectCommandType)) {
    return { error: 'invalid_command', message: 'Unsupported Spice Connect command.' };
  }

  return {
    targetDeviceId,
    sourceDeviceId,
    command: command as SpiceConnectCommandType,
    payloadJson: safeRemotePayload(body.payload),
  };
}

export function safeRemotePayload(value: unknown) {
  try {
    return JSON.stringify(value && typeof value === 'object' ? value : {});
  } catch {
    return '{}';
  }
}

export function parseRemotePayload(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function isSpiceConnectCommandFresh(
  createdAt: Date | string | number,
  now: Date | number = Date.now(),
  maxAgeMs = SPICE_CONNECT_COMMAND_TTL_MS,
) {
  const createdTime = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  const nowTime = now instanceof Date ? now.getTime() : now;

  if (!Number.isFinite(createdTime) || !Number.isFinite(nowTime)) return false;
  return nowTime - createdTime <= maxAgeMs;
}
