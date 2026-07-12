import type { NextRequest } from 'next/server';

import { verifySession } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/cors';
import { db } from '@/db';
import { playlistMembers, playlists } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { getPlaylistSnapshot } from '@/lib/shared-playlists';

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

    const playlist = await db.query.playlists.findFirst({
      where: and(eq(playlists.id, playlistId), isNull(playlists.deletedAt)),
    });

    if (playlist && playlist.userId === session.userId) {
      // Owner deletes the playlist
      await db.update(playlists).set({ deletedAt: new Date() }).where(eq(playlists.id, playlistId));
    } else {
      // Collaborator leaves the playlist
      await db.delete(playlistMembers).where(
        and(
          eq(playlistMembers.playlistId, playlistId),
          eq(playlistMembers.userId, session.userId),
        ),
      );
    }

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

export async function PATCH(
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

    const playlist = await db.query.playlists.findFirst({
      where: and(eq(playlists.id, playlistId), isNull(playlists.deletedAt)),
    });

    if (!playlist) {
      return jsonResponse({ error: 'not_found', message: 'Playlist not found.' }, { status: 404 });
    }

    if (playlist.userId !== session.userId) {
      return jsonResponse({ error: 'forbidden', message: 'Only the playlist owner can update it.' }, { status: 403 });
    }

    const { title, description, gradient, coverUrl } = await request.json();

    const updateFields: {
      title?: string;
      description?: string;
      gradient?: string;
      coverUrl?: string | null;
      updatedAt?: Date;
    } = {};
    if (typeof title === 'string') updateFields.title = title;
    if (typeof description === 'string') updateFields.description = description;
    if (typeof gradient === 'string') updateFields.gradient = gradient;
    if (typeof coverUrl === 'string' || coverUrl === null) updateFields.coverUrl = coverUrl;
    updateFields.updatedAt = new Date();

    await db.update(playlists)
      .set(updateFields)
      .where(eq(playlists.id, playlistId));

    const snapshot = await getPlaylistSnapshot(playlistId, {
      shared: true,
      includeMembers: true,
      shareRole: 'owner',
    });

    return jsonResponse({ success: true, playlist: snapshot });
  } catch (error) {
    return jsonResponse(
      {
        error: 'shared_playlist_update_failed',
        message: error instanceof Error ? error.message : 'Failed to update shared playlist.',
      },
      { status: 500 },
    );
  }
}
