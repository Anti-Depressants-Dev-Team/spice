import type { NextRequest } from 'next/server';

import { verifySession } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/cors';
import { db } from '@/db';
import { playlists, playlistItems, playlistMembers, users, profiles } from '@/db/schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { trackSnapshotColumns, trackSnapshotFromRow } from '@/lib/track-snapshot';
import type { TrackSnapshotInput } from '@/lib/track-snapshot';

export const runtime = 'nodejs';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function OPTIONS() {
  return optionsResponse();
}

/**
 * Verify the caller is the owner or an editor member of the playlist.
 * Returns { playlist, isOwner, role } or null.
 */
async function verifyPlaylistAccess(playlistId: string, userId: string) {
  const playlist = await db.query.playlists.findFirst({
    where: and(eq(playlists.id, playlistId), isNull(playlists.deletedAt)),
  });
  if (!playlist) return null;

  if (playlist.userId === userId) {
    return { playlist, isOwner: true, role: 'owner' as const };
  }

  const membership = await db.query.playlistMembers.findFirst({
    where: and(eq(playlistMembers.playlistId, playlistId), eq(playlistMembers.userId, userId)),
  });
  if (!membership) return null;

  return { playlist, isOwner: false, role: membership.role as 'editor' | 'listener' };
}

/**
 * GET — Fetch current tracks in a shared playlist (members and owner).
 */
export async function GET(
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

    const access = await verifyPlaylistAccess(playlistId, session.userId);
    if (!access) {
      return jsonResponse(
        { error: 'forbidden', message: 'You do not have access to this playlist.' },
        { status: 403 },
      );
    }

    const items = await db.query.playlistItems.findMany({
      where: eq(playlistItems.playlistId, playlistId),
      orderBy: playlistItems.position,
    });

    // Build addedBy map
    const addedByUserIds = new Set(
      items.map((item) => item.addedByUserId).filter((id): id is string => !!id),
    );
    const addedByMap: Record<string, { username: string | null; displayName: string }> = {};
    const uidsArray = Array.from(addedByUserIds);
    if (uidsArray.length > 0) {
      const [fetchedUsers, fetchedProfiles] = await Promise.all([
        db.query.users.findMany({ where: inArray(users.id, uidsArray) }),
        db.query.profiles.findMany({
          where: and(inArray(profiles.userId, uidsArray), eq(profiles.id, 'default')),
        }),
      ]);

      const userMap = new Map(fetchedUsers.map(u => [u.id, u]));
      const profileMap = new Map(fetchedProfiles.map(p => [p.userId, p]));

      for (const uid of uidsArray) {
        const user = userMap.get(uid);
        const profile = profileMap.get(uid);
        addedByMap[uid] = {
          username: user?.username || null,
          displayName: profile?.displayName || user?.email || 'Unknown',
        };
      }
    }

    const tracks = items.map((item) => {
      const base = trackSnapshotFromRow(item);
      const addedBy = item.addedByUserId && addedByMap[item.addedByUserId]
        ? { userId: item.addedByUserId, ...addedByMap[item.addedByUserId] }
        : undefined;
      return {
        ...base,
        position: item.position,
        ...(addedBy ? { addedBy } : {}),
      };
    });

    return jsonResponse({ tracks, playlistId, role: access.role });
  } catch (error) {
    return jsonResponse(
      {
        error: 'tracks_fetch_failed',
        message: error instanceof Error ? error.message : 'Failed to fetch playlist tracks.',
      },
      { status: 500 },
    );
  }
}



/**
 * POST — Add a track to a shared playlist.
 * Body: { track: TrackSnapshotInput }
 */
export async function POST(
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

    const access = await verifyPlaylistAccess(playlistId, session.userId);
    if (!access || (access.role !== 'editor' && !access.isOwner)) {
      return jsonResponse(
        { error: 'forbidden', message: 'You do not have editor access to this playlist.' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const track = body.track as TrackSnapshotInput | undefined;
    if (!track || typeof track.id !== 'string' || !track.id) {
      return jsonResponse({ error: 'invalid_track', message: 'A track with an id is required.' }, { status: 400 });
    }

    // Determine next position
    const existingItems = await db.query.playlistItems.findMany({
      where: eq(playlistItems.playlistId, playlistId),
      orderBy: playlistItems.position,
    });
    const nextPosition = existingItems.length > 0
      ? Math.max(...existingItems.map((item) => item.position)) + 1
      : 0;

    await db.insert(playlistItems).values({
      playlistId,
      position: nextPosition,
      sourceId: track.sourceId || 'youtube_music',
      trackId: track.id,
      ...trackSnapshotColumns(track, track.id),
      addedByUserId: session.userId,
    });

    return jsonResponse({ success: true, position: nextPosition });
  } catch (error) {
    return jsonResponse(
      {
        error: 'track_add_failed',
        message: error instanceof Error ? error.message : 'Failed to add track to shared playlist.',
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE — Remove a track from a shared playlist.
 * Body: { position: number }
 * Members can only remove tracks they added. Owner can remove any.
 */
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

    const access = await verifyPlaylistAccess(playlistId, session.userId);
    if (!access || (access.role !== 'editor' && !access.isOwner)) {
      return jsonResponse(
        { error: 'forbidden', message: 'You do not have editor access to this playlist.' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const position = typeof body.position === 'number' ? body.position : -1;
    if (position < 0) {
      return jsonResponse({ error: 'invalid_position', message: 'A valid track position is required.' }, { status: 400 });
    }

    // Check the track exists and verify permission
    const item = await db.query.playlistItems.findFirst({
      where: and(
        eq(playlistItems.playlistId, playlistId),
        eq(playlistItems.position, position),
      ),
    });

    if (!item) {
      return jsonResponse({ error: 'track_not_found', message: 'Track not found at that position.' }, { status: 404 });
    }

    // Members can only remove their own tracks; owner can remove any
    if (!access.isOwner && item.addedByUserId !== session.userId) {
      return jsonResponse(
        { error: 'forbidden', message: 'You can only remove tracks you added.' },
        { status: 403 },
      );
    }

    await db.delete(playlistItems).where(
      and(
        eq(playlistItems.playlistId, playlistId),
        eq(playlistItems.position, position),
      ),
    );

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse(
      {
        error: 'track_remove_failed',
        message: error instanceof Error ? error.message : 'Failed to remove track from shared playlist.',
      },
      { status: 500 },
    );
  }
}
