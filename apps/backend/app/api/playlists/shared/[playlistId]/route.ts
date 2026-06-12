import type { NextRequest } from 'next/server';

import { verifySession } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/cors';
import { db } from '@/db';
import { playlistMembers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export const runtime = 'nodejs';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function OPTIONS() {
  return optionsResponse();
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> },
) {
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

    const { playlistId } = await params;
    if (!uuidPattern.test(playlistId)) {
      return jsonResponse({ error: 'invalid_playlist_id', message: 'Playlist id must be a UUID.' }, { status: 400 });
    }

    await db.delete(playlistMembers).where(
      and(
        eq(playlistMembers.playlistId, playlistId),
        eq(playlistMembers.userId, session.userId),
      ),
    );

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse(
      {
        error: 'shared_playlist_leave_failed',
        message: error instanceof Error ? error.message : 'Failed to leave shared playlist.',
      },
      { status: 500 },
    );
  }
}
