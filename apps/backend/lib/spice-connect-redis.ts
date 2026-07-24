import { Redis } from '@upstash/redis';

import {
  SPICE_CONNECT_DEVICE_RETENTION_MS,
  isSpiceConnectCommandDeliverable,
  isSpiceConnectCommandFresh,
  type SpiceConnectCommandType,
  type SpiceConnectRepeatMode,
} from '@/lib/spice-connect';

/**
 * Redis deliberately holds only the fast, disposable side of Spice Connect.
 * PostgreSQL remains the durable fallback for pairing, devices, and commands.
 *
 * Every public helper fails closed to `null`/`false` when Redis is not
 * configured or temporarily unavailable. This makes local/native installs and
 * first Vercel deployments safe before Upstash credentials exist.
 */

const REDIS_NAMESPACE = 'spice:connect:v1';
const DEVICE_META_FIELD = '__spice_connect_meta__';
const DEVICE_CHECKPOINT_SECONDS = 15 * 60;
const AUTH_CACHE_MAX_SECONDS = 60;

let redisClient: Redis | null | undefined;

export type SpiceConnectCachedDeviceState = {
  deviceId: string;
  displayName: string;
  pairedAuthorizationHash: string | null;
  currentTrack: unknown;
  queue: unknown[];
  queueIndex: number;
  isPlaying: boolean;
  shuffleEnabled: boolean;
  repeatMode: SpiceConnectRepeatMode;
  progressMs: number;
  durationMs: number;
  volume: number;
  updatedAt: string;
};

export type SpiceConnectCachedCommand = {
  id: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  command: SpiceConnectCommandType;
  payloadJson: string;
  createdAt: string;
  consumedAt: string | null;
  deliveryAttempts: number;
};

export type SpiceConnectCachedPairedAuthorization = {
  authorizationId: string;
  userId: string;
  deviceId: string;
  authorizationHash: string;
  expiresAt: string;
};

export type SpiceConnectCachedAccount = {
  userId: string;
  active: boolean;
};

function keyPart(value: string) {
  return encodeURIComponent(value);
}

function deviceField(deviceId: string) {
  return `device:${keyPart(deviceId)}`;
}

function deviceStatesKey(userId: string) {
  return `${REDIS_NAMESPACE}:devices:${keyPart(userId)}`;
}

function commandQueueKey(userId: string, deviceId: string) {
  return `${REDIS_NAMESPACE}:commands:${keyPart(userId)}:${keyPart(deviceId)}`;
}

function commandQueueInitializedKey(userId: string, deviceId: string) {
  return `${REDIS_NAMESPACE}:commands-initialized:${keyPart(userId)}:${keyPart(deviceId)}`;
}

function deviceCheckpointKey(userId: string, deviceId: string, pairedAuthorizationHash: string | null) {
  return `${REDIS_NAMESPACE}:checkpoint:${keyPart(userId)}:${keyPart(deviceId)}:${keyPart(pairedAuthorizationHash ?? 'account')}`;
}

function pairedAuthorizationKey(authorizationHash: string) {
  return `${REDIS_NAMESPACE}:paired-auth:${keyPart(authorizationHash)}`;
}

function pairedDeviceAuthorizationKey(userId: string, deviceId: string) {
  return `${REDIS_NAMESPACE}:paired-device-auth:${keyPart(userId)}:${keyPart(deviceId)}`;
}

function accountAuthorizationKey(userId: string) {
  return `${REDIS_NAMESPACE}:account-auth:${keyPart(userId)}`;
}

export function spiceConnectRedisRealtimeChannel(userId: string) {
  return `${REDIS_NAMESPACE}:events:${keyPart(userId)}`;
}

export function isSpiceConnectRedisConfigured() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL
    && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

export function getSpiceConnectRedis() {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  try {
    redisClient = new Redis({ url, token, enableTelemetry: false });
  } catch (error) {
    console.warn('[Spice Connect] Upstash Redis configuration is invalid; using PostgreSQL fallback.', error);
    redisClient = null;
  }
  return redisClient;
}

function parseStored<T>(value: unknown): T | null {
  if (value && typeof value === 'object') return value as T;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function validDate(value: string | null | undefined) {
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(time) ? time : null;
}

function validCachedDevice(value: unknown): value is SpiceConnectCachedDeviceState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SpiceConnectCachedDeviceState>;
  return typeof candidate.deviceId === 'string'
    && typeof candidate.displayName === 'string'
    && (candidate.pairedAuthorizationHash === null || typeof candidate.pairedAuthorizationHash === 'string')
    && Array.isArray(candidate.queue)
    && typeof candidate.queueIndex === 'number'
    && typeof candidate.isPlaying === 'boolean'
    && typeof candidate.shuffleEnabled === 'boolean'
    && (candidate.repeatMode === 'none' || candidate.repeatMode === 'all' || candidate.repeatMode === 'one')
    && typeof candidate.progressMs === 'number'
    && typeof candidate.durationMs === 'number'
    && typeof candidate.volume === 'number'
    && validDate(candidate.updatedAt) !== null;
}

function validCachedCommand(value: unknown): value is SpiceConnectCachedCommand {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SpiceConnectCachedCommand>;
  return typeof candidate.id === 'string'
    && typeof candidate.sourceDeviceId === 'string'
    && typeof candidate.targetDeviceId === 'string'
    && typeof candidate.command === 'string'
    && typeof candidate.payloadJson === 'string'
    && typeof candidate.createdAt === 'string'
    && (candidate.consumedAt === null || typeof candidate.consumedAt === 'string')
    && Number.isInteger(candidate.deliveryAttempts);
}

function commandField(id: string) {
  return `command:${keyPart(id)}`;
}

/**
 * Returns null only when Redis cannot be used. An empty array means the
 * caller's Redis snapshot is initialized but there are no retained devices.
 */
export async function readSpiceConnectDeviceStates(userId: string): Promise<SpiceConnectCachedDeviceState[] | null> {
  const redis = getSpiceConnectRedis();
  if (!redis) return null;

  try {
    const stored = await redis.hgetall<Record<string, string>>(deviceStatesKey(userId));
    if (!stored || !stored[DEVICE_META_FIELD]) return null;

    const now = Date.now();
    const staleFields: string[] = [];
    const states: SpiceConnectCachedDeviceState[] = [];
    for (const [field, raw] of Object.entries(stored)) {
      if (field === DEVICE_META_FIELD) continue;
      const state = parseStored<SpiceConnectCachedDeviceState>(raw);
      const updatedAt = state ? validDate(state.updatedAt) : null;
      if (!state || !validCachedDevice(state) || !updatedAt || now - updatedAt >= SPICE_CONNECT_DEVICE_RETENTION_MS) {
        staleFields.push(field);
        continue;
      }
      states.push(state);
    }
    if (staleFields.length > 0) {
      await redis.hdel(deviceStatesKey(userId), ...staleFields).catch(() => undefined);
    }
    return states.sort((left, right) => (
      validDate(right.updatedAt)! - validDate(left.updatedAt)!
    ));
  } catch (error) {
    console.warn('[Spice Connect] Redis device-state read failed; using PostgreSQL fallback.', error);
    return null;
  }
}

export async function writeSpiceConnectDeviceState(
  userId: string,
  state: SpiceConnectCachedDeviceState,
) {
  const redis = getSpiceConnectRedis();
  if (!redis) return false;

  try {
    await redis.hset(deviceStatesKey(userId), {
      [DEVICE_META_FIELD]: '1',
      [deviceField(state.deviceId)]: JSON.stringify(state),
    });
    return true;
  } catch (error) {
    console.warn('[Spice Connect] Redis device-state write failed; keeping PostgreSQL fallback current.', error);
    return false;
  }
}

export async function hydrateSpiceConnectDeviceStates(
  userId: string,
  states: SpiceConnectCachedDeviceState[],
) {
  const redis = getSpiceConnectRedis();
  if (!redis) return false;
  try {
    const entries: Record<string, string> = { [DEVICE_META_FIELD]: '1' };
    for (const state of states) {
      entries[deviceField(state.deviceId)] = JSON.stringify(state);
    }
    await redis.hset(deviceStatesKey(userId), entries);
    return true;
  } catch (error) {
    console.warn('[Spice Connect] Redis device-state hydration failed.', error);
    return false;
  }
}

export async function deleteSpiceConnectDeviceState(userId: string, deviceId: string) {
  const redis = getSpiceConnectRedis();
  if (!redis) return false;
  try {
    await redis.hdel(deviceStatesKey(userId), deviceField(deviceId));
    return true;
  } catch (error) {
    console.warn('[Spice Connect] Redis device-state cleanup failed.', error);
    return false;
  }
}

/**
 * A checkpoint prevents an active receiver from rewriting its full playback
 * snapshot to Neon every heartbeat, while still keeping a durable fallback
 * fresh. A changed paired-token generation receives a new checkpoint key and
 * is persisted immediately.
 */
export async function reserveSpiceConnectDeviceCheckpoint(
  userId: string,
  deviceId: string,
  pairedAuthorizationHash: string | null,
) {
  const redis = getSpiceConnectRedis();
  if (!redis) return true;
  try {
    const result = await redis.set(
      deviceCheckpointKey(userId, deviceId, pairedAuthorizationHash),
      '1',
      { nx: true, ex: DEVICE_CHECKPOINT_SECONDS },
    );
    return result === 'OK';
  } catch (error) {
    console.warn('[Spice Connect] Redis checkpoint reservation failed; keeping PostgreSQL fallback current.', error);
    return true;
  }
}

export async function cacheSpiceConnectPairedAuthorization(value: SpiceConnectCachedPairedAuthorization) {
  const redis = getSpiceConnectRedis();
  if (!redis) return false;

  const expiresAt = validDate(value.expiresAt);
  if (!expiresAt) return false;
  const ttl = Math.max(1, Math.min(AUTH_CACHE_MAX_SECONDS, Math.floor((expiresAt - Date.now()) / 1000)));
  try {
    await redis.mset({
      [pairedAuthorizationKey(value.authorizationHash)]: JSON.stringify(value),
      [pairedDeviceAuthorizationKey(value.userId, value.deviceId)]: value.authorizationHash,
    });
    await Promise.all([
      redis.expire(pairedAuthorizationKey(value.authorizationHash), ttl),
      redis.expire(pairedDeviceAuthorizationKey(value.userId, value.deviceId), ttl),
    ]);
    return true;
  } catch (error) {
    console.warn('[Spice Connect] Redis paired-authorization cache write failed.', error);
    return false;
  }
}

export async function readSpiceConnectPairedAuthorization(authorizationHash: string) {
  const redis = getSpiceConnectRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<string>(pairedAuthorizationKey(authorizationHash));
    const cached = parseStored<SpiceConnectCachedPairedAuthorization>(raw);
    if (!cached || cached.authorizationHash !== authorizationHash || !validDate(cached.expiresAt) || validDate(cached.expiresAt)! <= Date.now()) {
      return null;
    }
    const currentHash = await redis.get<string>(pairedDeviceAuthorizationKey(cached.userId, cached.deviceId));
    return currentHash === authorizationHash ? cached : null;
  } catch (error) {
    console.warn('[Spice Connect] Redis paired-authorization cache read failed.', error);
    return null;
  }
}

export async function invalidateSpiceConnectPairedAuthorization(
  userId: string,
  deviceId: string,
  authorizationHash: string,
) {
  const redis = getSpiceConnectRedis();
  if (!redis) return false;
  try {
    const currentHash = await redis.get<string>(pairedDeviceAuthorizationKey(userId, deviceId));
    await redis.del(pairedAuthorizationKey(authorizationHash));
    if (currentHash === authorizationHash) {
      await redis.del(pairedDeviceAuthorizationKey(userId, deviceId));
    }
    return true;
  } catch (error) {
    console.warn('[Spice Connect] Redis paired-authorization invalidation failed.', error);
    return false;
  }
}

export async function cacheSpiceConnectAccount(value: SpiceConnectCachedAccount) {
  const redis = getSpiceConnectRedis();
  if (!redis) return false;
  try {
    await redis.set(accountAuthorizationKey(value.userId), JSON.stringify(value), { ex: AUTH_CACHE_MAX_SECONDS });
    return true;
  } catch (error) {
    console.warn('[Spice Connect] Redis account-authorization cache write failed.', error);
    return false;
  }
}

export async function readSpiceConnectAccount(userId: string) {
  const redis = getSpiceConnectRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<string>(accountAuthorizationKey(userId));
    const cached = parseStored<SpiceConnectCachedAccount>(raw);
    return cached?.userId === userId && typeof cached.active === 'boolean' ? cached : null;
  } catch (error) {
    console.warn('[Spice Connect] Redis account-authorization cache read failed.', error);
    return null;
  }
}

export async function invalidateSpiceConnectAccount(userId: string) {
  const redis = getSpiceConnectRedis();
  if (!redis) return false;
  try {
    await redis.del(accountAuthorizationKey(userId));
    return true;
  } catch (error) {
    console.warn('[Spice Connect] Redis account-authorization invalidation failed.', error);
    return false;
  }
}

export async function enqueueSpiceConnectCommand(userId: string, command: SpiceConnectCachedCommand) {
  const redis = getSpiceConnectRedis();
  if (!redis) return false;
  try {
    await redis.hset(commandQueueKey(userId, command.targetDeviceId), {
      [commandField(command.id)]: JSON.stringify(command),
    });
    await redis.set(commandQueueInitializedKey(userId, command.targetDeviceId), '1', { ex: 60 });
    return true;
  } catch (error) {
    console.warn('[Spice Connect] Redis command enqueue failed; PostgreSQL remains authoritative.', error);
    return false;
  }
}

/**
 * Return null when the queue has not been populated by Redis yet, prompting a
 * one-time PostgreSQL fallback/migration. Once initialized, empty polling is a
 * single Redis HGETALL instead of an expensive Neon query.
 */
export async function claimSpiceConnectCommands(
  userId: string,
  deviceId: string,
  now: Date,
): Promise<SpiceConnectCachedCommand[] | null> {
  const redis = getSpiceConnectRedis();
  if (!redis) return null;

  try {
    const queueKey = commandQueueKey(userId, deviceId);
    const rawEntries = await redis.hgetall<Record<string, string>>(queueKey);
    if (!rawEntries) {
      const initialized = await redis.get(commandQueueInitializedKey(userId, deviceId));
      if (!initialized) return null;
      return [];
    }

    const nowTime = now.getTime();
    const deleteFields: string[] = [];
    const updates: Record<string, string> = {};
    const deliverable: SpiceConnectCachedCommand[] = [];

    for (const [field, raw] of Object.entries(rawEntries)) {
      const command = parseStored<SpiceConnectCachedCommand>(raw);
      if (!command || !validCachedCommand(command)) {
        deleteFields.push(field);
        continue;
      }
      if (!isSpiceConnectCommandFresh(command.createdAt, nowTime)) {
        deleteFields.push(field);
        continue;
      }
      if (!isSpiceConnectCommandDeliverable(command, nowTime)) continue;

      const next = {
        ...command,
        consumedAt: now.toISOString(),
        deliveryAttempts: command.deliveryAttempts + 1,
      };
      updates[field] = JSON.stringify(next);
      deliverable.push(next);
    }

    deliverable.sort((left, right) => (
      validDate(left.createdAt)! - validDate(right.createdAt)!
    ));
    const capped = deliverable.slice(0, 20);
    for (const command of deliverable.slice(20)) {
      // Keep later commands available for the next receiver request.
      delete updates[commandField(command.id)];
    }
    if (deleteFields.length > 0 || Object.keys(updates).length > 0) {
      const pipeline = redis.pipeline();
      if (deleteFields.length > 0) pipeline.hdel(queueKey, ...deleteFields);
      if (Object.keys(updates).length > 0) pipeline.hset(queueKey, updates);
      pipeline.set(commandQueueInitializedKey(userId, deviceId), '1', { ex: 60 });
      await pipeline.exec();
    } else {
      await redis.set(commandQueueInitializedKey(userId, deviceId), '1', { ex: 60 });
    }
    return capped;
  } catch (error) {
    console.warn('[Spice Connect] Redis command claim failed; PostgreSQL fallback will be used.', error);
    return null;
  }
}

export async function hydrateSpiceConnectCommandQueue(
  userId: string,
  deviceId: string,
  commands: SpiceConnectCachedCommand[],
) {
  const redis = getSpiceConnectRedis();
  if (!redis) return false;
  try {
    const entries: Record<string, string> = {};
    for (const command of commands) {
      entries[commandField(command.id)] = JSON.stringify(command);
    }
    const pipeline = redis.pipeline();
    if (Object.keys(entries).length > 0) pipeline.hset(commandQueueKey(userId, deviceId), entries);
    pipeline.set(commandQueueInitializedKey(userId, deviceId), '1', { ex: 60 });
    await pipeline.exec();
    return true;
  } catch (error) {
    console.warn('[Spice Connect] Redis command queue hydration failed.', error);
    return false;
  }
}

export async function removeSpiceConnectCommandsForDevice(userId: string, deviceId: string) {
  const redis = getSpiceConnectRedis();
  if (!redis) return false;
  try {
    await redis.del(
      commandQueueKey(userId, deviceId),
      commandQueueInitializedKey(userId, deviceId),
    );
    return true;
  } catch (error) {
    console.warn('[Spice Connect] Redis command cleanup failed.', error);
    return false;
  }
}

export async function publishSpiceConnectRedisSignal(userId: string, signal: string) {
  const redis = getSpiceConnectRedis();
  if (!redis) return false;
  try {
    await redis.publish(spiceConnectRedisRealtimeChannel(userId), signal);
    return true;
  } catch (error) {
    console.warn('[Spice Connect] Redis realtime publish failed.', error);
    return false;
  }
}

export function subscribeSpiceConnectRedisSignals<TSignal>(userId: string) {
  const redis = getSpiceConnectRedis();
  return redis?.subscribe<TSignal>(spiceConnectRedisRealtimeChannel(userId)) ?? null;
}
