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
  | 'play_track'
  | 'handoff';

export type SpiceConnectRepeatMode = 'none' | 'all' | 'one';

export const SPICE_CONNECT_COMMAND_TTL_MS = 240000;
export const SPICE_CONNECT_COMMAND_REDELIVERY_MS = 10_000;
export const SPICE_CONNECT_MAX_COMMAND_DELIVERY_ATTEMPTS = 3;
export const SPICE_CONNECT_COMMAND_ACTIVE_POLL_INTERVAL_MS = 350;
export const SPICE_CONNECT_COMMAND_IDLE_POLL_INTERVAL_MS = 750;
export const SPICE_CONNECT_COMMAND_HIDDEN_POLL_INTERVAL_MS = 750;
export const SPICE_CONNECT_COMMAND_IDLE_BACKOFF_POLLS = 3;
export const SPICE_CONNECT_CONTROLLER_REFRESH_INTERVAL_MS = 750;
export const SPICE_CONNECT_DEVICE_SYNC_INTERVAL_MS = 20000;
export const SPICE_CONNECT_POST_COMMAND_SYNC_DELAY_MS = 150;
export const SPICE_CONNECT_STATE_REPORT_DEBOUNCE_MS = 80;
export const SPICE_CONNECT_OPTIMISTIC_STATE_WINDOW_MS = 6000;
export const SPICE_CONNECT_STALE_DEVICE_SECONDS = 60;
export const SPICE_CONNECT_DEVICE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

type RemoteAuthorizationState = {
  tokenHash: string;
  expiresAt: Date | string;
  revokedAt?: Date | string | null;
};

type RemoteProgressState = {
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
  updatedAt: Date | string;
};

type RemoteCommandDeliveryState = {
  createdAt: Date | string;
  consumedAt?: Date | string | null;
  deliveryAttempts: number;
};

function dateTime(value: Date | string | null | undefined) {
  if (!value) return Number.NaN;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function isSpiceConnectRemoteDeviceVisible(
  pairedAuthorizationHash: string | null | undefined,
  authorizations: RemoteAuthorizationState[],
  now: Date | number = Date.now(),
) {
  // Account-owned heartbeats deliberately clear the paired marker. A paired
  // snapshot is visible only while the exact credential generation that wrote
  // it remains active; timestamps cannot safely establish ownership.
  if (!pairedAuthorizationHash) return true;

  const nowTime = now instanceof Date ? now.getTime() : now;
  if (!Number.isFinite(nowTime)) return false;
  return authorizations.some((authorization) => {
    const expiresAt = dateTime(authorization.expiresAt);
    return authorization.tokenHash === pairedAuthorizationHash
      && !authorization.revokedAt
      && Number.isFinite(expiresAt)
      && expiresAt > nowTime;
  });
}

export function projectSpiceConnectProgressMs(
  state: RemoteProgressState,
  now: Date | number = Date.now(),
) {
  const progressMs = boundedInteger(state.progressMs, 0, 0, 24 * 60 * 60 * 1000);
  const durationMs = boundedInteger(state.durationMs, 0, 0, 24 * 60 * 60 * 1000);
  if (!state.isPlaying) return Math.min(progressMs, durationMs || progressMs);

  const nowTime = now instanceof Date ? now.getTime() : now;
  const updatedAt = dateTime(state.updatedAt);
  const elapsedMs = nowTime - updatedAt;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return Math.min(progressMs, durationMs || progressMs);
  }

  // Keep progress monotonic until the same cutoff used to declare a receiver
  // stale, then hold the projection there instead of snapping backwards.
  const projectedElapsedMs = Math.min(elapsedMs, SPICE_CONNECT_STALE_DEVICE_SECONDS * 1000);
  const projected = progressMs + Math.round(projectedElapsedMs);
  return Math.min(projected, durationMs || projected);
}

export function isSpiceConnectDeviceStale(
  updatedAt: Date | string,
  now: Date | number = Date.now(),
) {
  const nowTime = now instanceof Date ? now.getTime() : now;
  const ageMs = nowTime - dateTime(updatedAt);
  return !Number.isFinite(ageMs) || ageMs >= SPICE_CONNECT_STALE_DEVICE_SECONDS * 1000;
}

export function isSpiceConnectDeviceRemembered(
  updatedAt: Date | string,
  now: Date | number = Date.now(),
) {
  const nowTime = now instanceof Date ? now.getTime() : now;
  const ageMs = nowTime - dateTime(updatedAt);
  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs < SPICE_CONNECT_DEVICE_RETENTION_MS;
}

export function spiceConnectDeviceRememberedUntil(updatedAt: Date | string) {
  const updatedTime = dateTime(updatedAt);
  return Number.isFinite(updatedTime)
    ? new Date(updatedTime + SPICE_CONNECT_DEVICE_RETENTION_MS)
    : null;
}

export function isSpiceConnectCommandDeliverable(
  state: RemoteCommandDeliveryState,
  now: Date | number = Date.now(),
) {
  const nowTime = now instanceof Date ? now.getTime() : now;
  if (
    !isSpiceConnectCommandFresh(state.createdAt, nowTime)
    || !Number.isInteger(state.deliveryAttempts)
    || state.deliveryAttempts < 0
    || state.deliveryAttempts >= SPICE_CONNECT_MAX_COMMAND_DELIVERY_ATTEMPTS
  ) return false;

  if (!state.consumedAt) return true;
  const lastDeliveredAt = dateTime(state.consumedAt);
  return Number.isFinite(lastDeliveredAt)
    && nowTime - lastDeliveredAt >= SPICE_CONNECT_COMMAND_REDELIVERY_MS;
}

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
  'handoff',
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
