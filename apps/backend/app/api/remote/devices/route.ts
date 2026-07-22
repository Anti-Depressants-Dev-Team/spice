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
  authorizeSpiceConnectRequest,
  requirePrincipalDevice,
  SpiceConnectAuthorizationError,
} from '@/lib/spice-connect-authorization';

export const runtime = 'nodejs';

export function OPTIONS(request: Request) {
  return optionsResponse(request);
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

    const [devices, authorizations] = await Promise.all([
      db.query.remoteDevices.findMany({
        where: eq(remoteDevices.userId, principal.userId),
        orderBy: desc(remoteDevices.updatedAt),
      }),
      db.query.remoteDeviceAuthorizations.findMany({
        columns: {
          deviceId: true,
          tokenHash: true,
          expiresAt: true,
          revokedAt: true,
        },
        where: eq(remoteDeviceAuthorizations.userId, principal.userId),
      }),
    ]);
    const now = new Date();
    const authorizationsByDevice = new Map<string, typeof authorizations>();
    for (const authorization of authorizations) {
      const current = authorizationsByDevice.get(authorization.deviceId) ?? [];
      current.push(authorization);
      authorizationsByDevice.set(authorization.deviceId, current);
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

    return jsonResponse({
      serverTime: now.toISOString(),
      devices: visibleDevices.map((device) => ({
        deviceId: device.deviceId,
        displayName: device.displayName,
        currentTrack: parseJson(device.currentTrackJson, null),
        queue: parseJson(device.queueJson, []),
        queueIndex: device.queueIndex,
        isOnline: !isSpiceConnectDeviceStale(device.updatedAt, now),
        isPlaying: device.isPlaying && !isSpiceConnectDeviceStale(device.updatedAt, now),
        shuffleEnabled: device.shuffleEnabled,
        repeatMode: device.repeatMode,
        progress: projectSpiceConnectProgressMs(device, now) / 1000,
        duration: device.durationMs / 1000,
        volume: device.volume,
        updatedAt: device.updatedAt.toISOString(),
        rememberedUntil: spiceConnectDeviceRememberedUntil(device.updatedAt)?.toISOString() ?? null,
      })),
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

    await db
      .insert(remoteDevices)
      .values({
        userId: principal.userId,
        deviceId: input.deviceId,
        pairedAuthorizationHash,
        displayName: input.displayName,
        currentTrackJson: safeJsonStringify(input.currentTrack, 'null'),
        queueJson: safeJsonStringify(input.queue, '[]'),
        queueIndex: input.queueIndex,
        isPlaying: input.isPlaying,
        shuffleEnabled: input.shuffleEnabled,
        repeatMode: input.repeatMode,
        progressMs: input.progressMs,
        durationMs: input.durationMs,
        volume: input.volume,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: [remoteDevices.userId, remoteDevices.deviceId],
        set: {
          displayName: input.displayName,
          pairedAuthorizationHash,
          currentTrackJson: safeJsonStringify(input.currentTrack, 'null'),
          queueJson: safeJsonStringify(input.queue, '[]'),
          queueIndex: input.queueIndex,
          isPlaying: input.isPlaying,
          shuffleEnabled: input.shuffleEnabled,
          repeatMode: input.repeatMode,
          progressMs: input.progressMs,
          durationMs: input.durationMs,
          volume: input.volume,
          updatedAt,
        },
      });

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
