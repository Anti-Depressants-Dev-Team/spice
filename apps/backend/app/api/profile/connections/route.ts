import type { NextRequest } from 'next/server';

import { verifySession } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/cors';
import {
  deleteListenBrainzConnection,
  getLastFmConnection,
  getListenBrainzConnection,
  saveListenBrainzConnection,
} from '@/lib/profile-connections';

export const runtime = 'nodejs';

interface ProfileConnectionsPutRequest {
  listenbrainz?: {
    token?: string | null;
  };
}

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 });
    }

    const session = await verifySession(auth.substring(7));
    if (!process.env.DATABASE_URL) {
      return jsonResponse({
        lastfm: { linked: false },
        listenbrainz: { linked: false },
        message: 'Backend DATABASE_URL environment variable is not configured.',
      });
    }

    const [lastfm, listenbrainz] = await Promise.all([
      getLastFmConnection(session.userId),
      getListenBrainzConnection(session.userId),
    ]);

    return jsonResponse({
      lastfm: lastfm
        ? {
            linked: true,
            name: lastfm.linkedUser,
            linkedAt: lastfm.linkedAt.toISOString(),
          }
        : { linked: false },
      listenbrainz: listenbrainz
        ? {
            linked: true,
            linkedAt: listenbrainz.linkedAt.toISOString(),
          }
        : { linked: false },
    });
  } catch (error) {
    return jsonResponse(
      {
        error: 'profile_connections_failed',
        message: error instanceof Error ? error.message : 'Failed to load profile connections.',
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 });
    }

    if (!process.env.DATABASE_URL) {
      return jsonResponse({
        error: 'database_not_configured',
        message: 'Backend DATABASE_URL environment variable is not configured.',
      }, { status: 503 });
    }

    let body: ProfileConnectionsPutRequest;
    try {
      body = await request.json() as ProfileConnectionsPutRequest;
    } catch {
      return jsonResponse({ error: 'invalid_json' }, { status: 400 });
    }

    const session = await verifySession(auth.substring(7));

    if (body.listenbrainz !== undefined) {
      const token = body.listenbrainz.token?.trim();
      if (!token) {
        await deleteListenBrainzConnection(session.userId);
        return jsonResponse({
          listenbrainz: { linked: false },
        });
      }

      await saveListenBrainzConnection({
        userId: session.userId,
        token,
      });

      const saved = await getListenBrainzConnection(session.userId);
      return jsonResponse({
        listenbrainz: saved
          ? {
              linked: true,
              linkedAt: saved.linkedAt.toISOString(),
            }
          : { linked: false },
      });
    }

    return jsonResponse({ error: 'invalid_request', message: 'No supported profile connection update was provided.' }, { status: 400 });
  } catch (error) {
    return jsonResponse(
      {
        error: 'profile_connections_update_failed',
        message: error instanceof Error ? error.message : 'Failed to update profile connections.',
      },
      { status: 500 },
    );
  }
}
