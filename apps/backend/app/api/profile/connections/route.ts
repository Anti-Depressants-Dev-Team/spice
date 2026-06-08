import type { NextRequest } from 'next/server';

import { verifySession } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/cors';
import { getLastFmConnection } from '@/lib/profile-connections';

export const runtime = 'nodejs';

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
        message: 'Backend DATABASE_URL environment variable is not configured.',
      });
    }

    const lastfm = await getLastFmConnection(session.userId);

    return jsonResponse({
      lastfm: lastfm
        ? {
            linked: true,
            name: lastfm.linkedUser,
            linkedAt: lastfm.linkedAt.toISOString(),
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
