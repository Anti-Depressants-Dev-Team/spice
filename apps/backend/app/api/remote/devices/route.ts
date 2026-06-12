import { jsonResponse, optionsResponse } from '@/lib/cors';
import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { remoteDevices } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export const runtime = 'nodejs';

function safeJsonStringify(value: unknown, fallback: string) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return fallback;
  }
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

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
        message: error instanceof Error ? error.message : 'Failed to load remote devices.',
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
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.slice(0, 120) : '';
    if (!deviceId) {
      return jsonResponse({ error: 'invalid_device', message: 'A deviceId is required.' }, { status: 400 });
    }

    const displayName = typeof body.displayName === 'string' && body.displayName.trim()
      ? body.displayName.trim().slice(0, 80)
      : 'SPICE Device';
    const queue = Array.isArray(body.queue) ? body.queue.slice(0, 80) : [];
    const currentTrack = body.currentTrack && typeof body.currentTrack === 'object' ? body.currentTrack : null;
    const queueIndex = boundedInteger(body.queueIndex, 0, 0, Math.max(queue.length - 1, 0));
    const progressMs = boundedInteger((body.progress ?? 0) * 1000, 0, 0, 24 * 60 * 60 * 1000);
    const durationMs = boundedInteger((body.duration ?? 0) * 1000, 0, 0, 24 * 60 * 60 * 1000);
    const volume = boundedInteger(body.volume, 70, 0, 100);
    const isPlaying = Boolean(body.isPlaying);
    const updatedAt = new Date();

    await db
      .insert(remoteDevices)
      .values({
        userId: session.userId,
        deviceId,
        displayName,
        currentTrackJson: safeJsonStringify(currentTrack, 'null'),
        queueJson: safeJsonStringify(queue, '[]'),
        queueIndex,
        isPlaying,
        progressMs,
        durationMs,
        volume,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: [remoteDevices.userId, remoteDevices.deviceId],
        set: {
          displayName,
          currentTrackJson: safeJsonStringify(currentTrack, 'null'),
          queueJson: safeJsonStringify(queue, '[]'),
          queueIndex,
          isPlaying,
          progressMs,
          durationMs,
          volume,
          updatedAt,
        },
      });

    return jsonResponse({ success: true, updatedAt: updatedAt.toISOString() });
  } catch (error) {
    return jsonResponse(
      {
        error: 'remote_device_update_failed',
        message: error instanceof Error ? error.message : 'Failed to update remote device.',
      },
      { status: 500 },
    );
  }
}
