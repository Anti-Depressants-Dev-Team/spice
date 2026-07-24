import { jsonResponse, optionsResponse } from '@/lib/cors';
import { db } from '@/db';
import { remoteDeviceAuthorizations, remoteDevices } from '@/db/schema';
import { and, desc, eq, lt } from 'drizzle-orm';
import {
  isSpiceConnectDeviceRemembered,
  isSpiceConnectRemoteDeviceVisible,
  isSpiceConnectDeviceStale,
  normalizeSpiceConnectDeviceInput,
  parseJson,
  projectSpiceConnectProgressMs,
  safeJsonStringify,
  spiceConnectDeviceRememberedUntil,
  SPICE_CONNECT_DEVICE_RETENTION_MS,
} from '@/lib/spice-connect';
import {
  cacheSpiceConnectPairedAuthorization,
  deleteSpiceConnectDeviceState,
  hydrateSpiceConnectDeviceStates,
  publishSpiceConnectRedisSignal,
  readSpiceConnectDeviceStates,
  removeSpiceConnectCommandsForDevice,
  readSpiceConnectPairedAuthorization,
  reserveSpiceConnectDeviceCheckpoint,
  writeSpiceConnectDeviceState,
  type SpiceConnectCachedDeviceState,
} from '@/lib/spice-connect-redis';
import { createSpiceConnectDeviceStateSignal } from '@/lib/spice-connect-realtime';
import {
  authorizeSpiceConnectRequest,
  requirePrincipalDevice,
  SpiceConnectAuthorizationError,
} from '@/lib/spice-connect-authorization';

export const runtime = 'nodejs';

type StoredRemoteDevice = typeof remoteDevices.$inferSelect;

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

function cachedStateFromStoredDevice(device: StoredRemoteDevice): SpiceConnectCachedDeviceState {
  return {
    deviceId: device.deviceId,
    displayName: device.displayName,
    pairedAuthorizationHash: device.pairedAuthorizationHash,
    currentTrack: parseJson(device.currentTrackJson, null),
    queue: parseJson(device.queueJson, []),
    queueIndex: device.queueIndex,
    isPlaying: device.isPlaying,
    shuffleEnabled: device.shuffleEnabled,
    repeatMode: device.repeatMode === 'all' || device.repeatMode === 'one' ? device.repeatMode : 'none',
    progressMs: device.progressMs,
    durationMs: device.durationMs,
    volume: device.volume,
    updatedAt: device.updatedAt.toISOString(),
  };
}

function devicePayload(device: SpiceConnectCachedDeviceState, now: Date) {
  return {
    deviceId: device.deviceId,
    displayName: device.displayName,
    currentTrack: device.currentTrack,
    queue: device.queue,
    queueIndex: device.queueIndex,
    isOnline: !isSpiceConnectDeviceStale(device.updatedAt, now),
    isPlaying: device.isPlaying && !isSpiceConnectDeviceStale(device.updatedAt, now),
    shuffleEnabled: device.shuffleEnabled,
    repeatMode: device.repeatMode,
    progress: projectSpiceConnectProgressMs(device, now) / 1000,
    duration: device.durationMs / 1000,
    volume: device.volume,
    updatedAt: device.updatedAt,
    rememberedUntil: spiceConnectDeviceRememberedUntil(device.updatedAt)?.toISOString() ?? null,
  };
}

async function visibleCachedDeviceStates(states: SpiceConnectCachedDeviceState[], now: Date) {
  const authorizations = new Map<string, { tokenHash: string; expiresAt: string; revokedAt: null }>();
  for (const state of states) {
    if (!state.pairedAuthorizationHash || authorizations.has(state.pairedAuthorizationHash)) continue;
    const authorization = await readSpiceConnectPairedAuthorization(state.pairedAuthorizationHash);
    // A cache miss deliberately falls back to Neon. It avoids showing a stale
    // paired snapshot after a revoke or token rotation.
    if (!authorization) return null;
    authorizations.set(state.pairedAuthorizationHash, {
      tokenHash: authorization.authorizationHash,
      expiresAt: authorization.expiresAt,
      revokedAt: null,
    });
  }

  return states.filter((state) => (
    isSpiceConnectDeviceRemembered(state.updatedAt, now)
    && isSpiceConnectRemoteDeviceVisible(
      state.pairedAuthorizationHash,
      state.pairedAuthorizationHash ? [authorizations.get(state.pairedAuthorizationHash)!] : [],
      now,
    )
  ));
}

async function persistRemoteDeviceState(
  userId: string,
  state: SpiceConnectCachedDeviceState,
) {
  await db
    .insert(remoteDevices)
    .values({
      userId,
      deviceId: state.deviceId,
      pairedAuthorizationHash: state.pairedAuthorizationHash,
      displayName: state.displayName,
      currentTrackJson: safeJsonStringify(state.currentTrack, 'null'),
      queueJson: safeJsonStringify(state.queue, '[]'),
      queueIndex: state.queueIndex,
      isPlaying: state.isPlaying,
      shuffleEnabled: state.shuffleEnabled,
      repeatMode: state.repeatMode,
      progressMs: state.progressMs,
      durationMs: state.durationMs,
      volume: state.volume,
      updatedAt: new Date(state.updatedAt),
    })
    .onConflictDoUpdate({
      target: [remoteDevices.userId, remoteDevices.deviceId],
      set: {
        displayName: state.displayName,
        pairedAuthorizationHash: state.pairedAuthorizationHash,
        currentTrackJson: safeJsonStringify(state.currentTrack, 'null'),
        queueJson: safeJsonStringify(state.queue, '[]'),
        queueIndex: state.queueIndex,
        isPlaying: state.isPlaying,
        shuffleEnabled: state.shuffleEnabled,
        repeatMode: state.repeatMode,
        progressMs: state.progressMs,
        durationMs: state.durationMs,
        volume: state.volume,
        updatedAt: new Date(state.updatedAt),
      },
    });
}

export async function GET(request: Request) {
  try {
    const principal = await authorizeSpiceConnectRequest(request);
    if (!process.env.DATABASE_URL) {
      return jsonResponse(
        { error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' },
        { status: 500 },
        request,
      );
    }

    const now = new Date();
    const cachedStates = await readSpiceConnectDeviceStates(principal.userId);
    if (cachedStates !== null) {
      const visibleCached = await visibleCachedDeviceStates(cachedStates, now);
      if (visibleCached !== null) {
        return jsonResponse({
          serverTime: now.toISOString(),
          devices: visibleCached.map((device) => devicePayload(device, now)),
        }, { headers: { 'Cache-Control': 'no-store, max-age=0' } }, request);
      }
    }

    const [devices, authorizations] = await Promise.all([
      db.query.remoteDevices.findMany({
        where: eq(remoteDevices.userId, principal.userId),
        orderBy: desc(remoteDevices.updatedAt),
      }),
      db.query.remoteDeviceAuthorizations.findMany({
        columns: {
          id: true,
          deviceId: true,
          tokenHash: true,
          expiresAt: true,
          revokedAt: true,
        },
        where: eq(remoteDeviceAuthorizations.userId, principal.userId),
      }),
    ]);
    const authorizationsByDevice = new Map<string, typeof authorizations>();
    for (const authorization of authorizations) {
      const current = authorizationsByDevice.get(authorization.deviceId) ?? [];
      current.push(authorization);
      authorizationsByDevice.set(authorization.deviceId, current);
      if (!authorization.revokedAt && authorization.expiresAt > now) {
        void cacheSpiceConnectPairedAuthorization({
          authorizationId: authorization.id,
          userId: principal.userId,
          deviceId: authorization.deviceId,
          authorizationHash: authorization.tokenHash,
          expiresAt: authorization.expiresAt.toISOString(),
        });
      }
    }
    const visibleDevices = devices.filter((device) => (
      isSpiceConnectDeviceRemembered(device.updatedAt, now)
      && isSpiceConnectRemoteDeviceVisible(
        device.pairedAuthorizationHash,
        authorizationsByDevice.get(device.deviceId) ?? [],
        now,
      )
    ));
    if (devices.some((device) => !isSpiceConnectDeviceRemembered(device.updatedAt, now))) {
      await db.delete(remoteDevices).where(and(
        eq(remoteDevices.userId, principal.userId),
        lt(remoteDevices.updatedAt, new Date(now.getTime() - SPICE_CONNECT_DEVICE_RETENTION_MS)),
      ));
    }

    const visibleStates = visibleDevices.map(cachedStateFromStoredDevice);
    void hydrateSpiceConnectDeviceStates(principal.userId, visibleStates);
    return jsonResponse({
      serverTime: now.toISOString(),
      devices: visibleStates.map((device) => devicePayload(device, now)),
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } }, request);
  } catch (error) {
    if (error instanceof SpiceConnectAuthorizationError) {
      return jsonResponse({ error: error.code, message: error.message }, { status: error.status }, request);
    }
    return jsonResponse(
      {
        error: 'remote_devices_failed',
        message: error instanceof Error ? error.message : 'Failed to load Spice Connect devices.',
      },
      { status: 500 },
      request,
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const principal = await authorizeSpiceConnectRequest(request);
    if (!process.env.DATABASE_URL) {
      return jsonResponse(
        { error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' },
        { status: 500 },
        request,
      );
    }

    const { searchParams } = new URL(request.url);
    const sourceDeviceId = searchParams.get('sourceDeviceId')?.slice(0, 120) || '';
    const deviceId = searchParams.get('deviceId')?.slice(0, 120) || '';
    if (!sourceDeviceId || !deviceId || sourceDeviceId === deviceId) {
      return jsonResponse(
        { error: 'invalid_device', message: 'Distinct source and target device ids are required.' },
        { status: 400 },
        request,
      );
    }
    requirePrincipalDevice(principal, sourceDeviceId);

    const forgotten = await db
      .delete(remoteDevices)
      .where(and(
        eq(remoteDevices.userId, principal.userId),
        eq(remoteDevices.deviceId, deviceId),
      ))
      .returning({ deviceId: remoteDevices.deviceId });

    void Promise.all([
      deleteSpiceConnectDeviceState(principal.userId, deviceId),
      removeSpiceConnectCommandsForDevice(principal.userId, deviceId),
    ]);
    return jsonResponse(
      { success: true, forgotten: forgotten.length > 0, deviceId },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
      request,
    );
  } catch (error) {
    if (error instanceof SpiceConnectAuthorizationError) {
      return jsonResponse({ error: error.code, message: error.message }, { status: error.status }, request);
    }
    return jsonResponse(
      {
        error: 'remote_device_forget_failed',
        message: error instanceof Error ? error.message : 'Failed to forget Spice Connect device.',
      },
      { status: 500 },
      request,
    );
  }
}

export async function POST(request: Request) {
  try {
    const principal = await authorizeSpiceConnectRequest(request);
    if (!process.env.DATABASE_URL) {
      return jsonResponse(
        { error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' },
        { status: 500 },
        request,
      );
    }

    const body = await request.json().catch(() => ({}));
    const input = normalizeSpiceConnectDeviceInput(body);
    if (!input) {
      return jsonResponse({ error: 'invalid_device', message: 'A deviceId is required.' }, { status: 400 }, request);
    }
    requirePrincipalDevice(principal, input.deviceId);

    const updatedAt = new Date();
    const pairedAuthorizationHash = principal.kind === 'paired_device'
      ? principal.authorizationHash
      : null;
    const state: SpiceConnectCachedDeviceState = {
      ...input,
      pairedAuthorizationHash,
      updatedAt: updatedAt.toISOString(),
    };
    const cached = await writeSpiceConnectDeviceState(principal.userId, state);
    const checkpointReserved = await reserveSpiceConnectDeviceCheckpoint(
      principal.userId,
      input.deviceId,
      pairedAuthorizationHash,
    );
    if (!cached || checkpointReserved) {
      await persistRemoteDeviceState(principal.userId, state);
    }
    if (cached) {
      void publishSpiceConnectRedisSignal(
        principal.userId,
        createSpiceConnectDeviceStateSignal(principal.userId, input.deviceId),
      );
    }

    return jsonResponse(
      { success: true, updatedAt: updatedAt.toISOString() },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
      request,
    );
  } catch (error) {
    if (error instanceof SpiceConnectAuthorizationError) {
      return jsonResponse({ error: error.code, message: error.message }, { status: error.status }, request);
    }
    return jsonResponse(
      {
        error: 'remote_device_update_failed',
        message: error instanceof Error ? error.message : 'Failed to update Spice Connect device.',
      },
      { status: 500 },
      request,
    );
  }
}
