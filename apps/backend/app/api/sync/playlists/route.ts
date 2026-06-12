import { jsonResponse, optionsResponse } from '@/lib/cors';
import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { playlists, playlistItems, playlistMembers } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { trackSnapshotColumns } from '@/lib/track-snapshot';
import type { TrackSnapshotInput } from '@/lib/track-snapshot';
import { getPlaylistSnapshot } from '@/lib/shared-playlists';

export const runtime = 'nodejs';

interface ClientPlaylistPayload {
  id?: string;
  title?: string;
  description?: string;
  gradient?: string;
  tracks?: TrackSnapshotInput[];
  shared?: boolean;
}

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 });
    }
    
    const token = auth.substring(7);
    const session = await verifySession(token);

    if (!process.env.DATABASE_URL) {
      return jsonResponse({ error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId') || 'default';

    const userPlaylists = await db.query.playlists.findMany({
      where: and(
        eq(playlists.userId, session.userId),
        eq(playlists.profileId, profileId),
        isNull(playlists.deletedAt)
      ),
      orderBy: playlists.sortIndex,
    });

    const results = [];
    for (const pl of userPlaylists) {
      const snapshot = await getPlaylistSnapshot(pl.id);
      if (snapshot) results.push(snapshot);
    }

    const memberRows = await db.select().from(playlistMembers).where(eq(playlistMembers.userId, session.userId));
    for (const membership of memberRows) {
      const snapshot = await getPlaylistSnapshot(membership.playlistId, {
        shared: true,
        shareRole: membership.role,
      });
      if (snapshot && snapshot.ownerId !== session.userId) {
        results.push(snapshot);
      }
    }

    return jsonResponse({ playlists: results });
  } catch (error) {
    return jsonResponse(
      {
        error: 'sync_get_playlists_failed',
        message: error instanceof Error ? error.message : 'Failed to retrieve cloud playlists.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 });
    }

    const token = auth.substring(7);
    const session = await verifySession(token);
    const { playlists: clientPlaylists, profileId: payloadProfileId } = await request.json();
    const profileId = payloadProfileId || 'default';

    if (!Array.isArray(clientPlaylists)) {
      return jsonResponse({ error: 'invalid_payload', message: 'Playlists payload must be an array.' }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return jsonResponse({ error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' }, { status: 500 });
    }

    const ownedClientPlaylists = (clientPlaylists as ClientPlaylistPayload[]).filter((clientPl) => (
      clientPl && !clientPl.shared
    ));

    // Run clean operations sequentially without transactions for neon-http driver compatibility
    const existing = await db.select().from(playlists).where(
      and(
        eq(playlists.userId, session.userId),
        eq(playlists.profileId, profileId)
      )
    );
    
    for (const pl of existing) {
      await db.delete(playlistItems).where(eq(playlistItems.playlistId, pl.id));
    }
    await db.delete(playlists).where(
      and(
        eq(playlists.userId, session.userId),
        eq(playlists.profileId, profileId)
      )
    );

    for (let i = 0; i < ownedClientPlaylists.length; i++) {
      const clientPl = ownedClientPlaylists[i];
      
      // Ensure id is valid UUID if provided, else let database auto-generate
      const isUUID = typeof clientPl.id === 'string'
        && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientPl.id);
      
      const [insertedPl] = await db.insert(playlists).values({
        id: isUUID ? clientPl.id : undefined,
        userId: session.userId,
        profileId,
        title: clientPl.title || 'Untitled Playlist',
        description: clientPl.description || '',
        gradient: clientPl.gradient || 'linear-gradient(135deg, #a855f7, #ec4899)',
        sortIndex: i,
      }).returning();

      if (Array.isArray(clientPl.tracks) && clientPl.tracks.length > 0) {
        // Chunk list insertion to avoid exceeding Drizzle/Postgres parameters bounds
        const itemsPayload = clientPl.tracks.map((t, pos: number) => ({
          playlistId: insertedPl.id,
          position: pos,
          sourceId: t.sourceId || 'youtube_music',
          trackId: t.id,
          ...trackSnapshotColumns(t, t.id),
        }));
        await db.insert(playlistItems).values(itemsPayload);
      }
    }

    return jsonResponse({ success: true, count: ownedClientPlaylists.length });
  } catch (error) {
    return jsonResponse(
      {
        error: 'sync_post_playlists_failed',
        message: error instanceof Error ? error.message : 'Failed to synchronize playlists.',
      },
      { status: 500 }
    );
  }
}
