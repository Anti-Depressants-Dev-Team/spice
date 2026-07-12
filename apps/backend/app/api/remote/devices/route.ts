import { jsonResponse, optionsResponse } from '@/lib/cors';
import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { remoteDevices } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { normalizeSpiceConnectDeviceInput, parseJson, safeJsonStringify } from '@/lib/spice-connect';

export const runtime = 'nodejs';

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 });
    }

    const session = await verifySession(auth.substring(7));
    if (!process.env.DATABASE_URL) {
      return jsonResponse(
        { error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' },
        { status: 500 },
      );
    }

    const devices = await db.query.remoteDevices.findMany({
      where: eq(remoteDevices.userId, session.userId),
      orderBy: desc(remoteDevices.updatedAt),
    });

    return jsonResponse({
      devices: devices.map((device) => ({
        deviceId: device.deviceId,
        displayName: device.displayName,
        currentTrack: parseJson(device.currentTrackJson, null),
        queue: parseJson(device.queueJson, []),
        queueIndex: device.queueIndex,
        isPlaying: device.isPlaying,
        shuffleEnabled: device.shuffleEnabled,
        repeatMode: device.repeatMode,
        progress: device.progressMs / 1000,
        duration: device.durationMs / 1000,
        volume: device.volume,
        updatedAt: device.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return jsonResponse(
      {
        error: 'remote_devices_failed',
        message: error instanceof Error ? error.message : 'Failed to load Spice Connect devices.',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 });
    }

    const session = await verifySession(auth.substring(7));
    if (!process.env.DATABASE_URL) {
      return jsonResponse(
        { error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const input = normalizeSpiceConnectDeviceInput(body);
    if (!input) {
      return jsonResponse({ error: 'invalid_device', message: 'A deviceId is required.' }, { status: 400 });
    }

    const updatedAt = new Date();

    await db
      .insert(remoteDevices)
      .values({
        userId: session.userId,
        deviceId: input.deviceId,
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

    return jsonResponse({ success: true, updatedAt: updatedAt.toISOString() });
  } catch (error) {
    return jsonResponse(
      {
        error: 'remote_device_update_failed',
        message: error instanceof Error ? error.message : 'Failed to update Spice Connect device.',
      },
      { status: 500 },
    );
  }
}
