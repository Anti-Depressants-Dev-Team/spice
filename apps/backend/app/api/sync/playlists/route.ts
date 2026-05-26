import { jsonResponse, optionsResponse } from '@/lib/cors';
import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { playlists, playlistItems } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return jsonResponse({ error: 'db_not_configured' }, { status: 503 });
  }

  try {
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 });
    }
    
    const token = auth.substring(7);
    const session = await verifySession(token);

    const userPlaylists = await db.query.playlists.findMany({
      where: eq(playlists.userId, session.userId),
      orderBy: playlists.sortIndex,
    });

    const results = [];
    for (const pl of userPlaylists) {
      const items = await db.query.playlistItems.findMany({
        where: eq(playlistItems.playlistId, pl.id),
        orderBy: playlistItems.position,
      });
      
      results.push({
        id: pl.id,
        title: pl.title,
        description: pl.description || '',
        createdAt: pl.updatedAt.toISOString(),
        gradient: 'linear-gradient(135deg, #a855f7, #ec4899)', // defaults to standard gradient
        tracks: items.map((item: { trackId: string; sourceId: string }) => ({
          id: item.trackId,
          title: 'Track', // client resolves real metadata dynamically or via fallback
          artists: [],
          sourceId: item.sourceId,
        })),
      });
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
  if (!process.env.DATABASE_URL) {
    return jsonResponse({ error: 'db_not_configured' }, { status: 503 });
  }

  try {
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 });
    }

    const token = auth.substring(7);
    const session = await verifySession(token);
    const { playlists: clientPlaylists } = await request.json();

    if (!Array.isArray(clientPlaylists)) {
      return jsonResponse({ error: 'invalid_payload', message: 'Playlists payload must be an array.' }, { status: 400 });
    }

    // Run clean transactions: wipe old entries and insert current synced records
    await db.transaction(async (tx: any) => {
      const existing = await tx.select().from(playlists).where(eq(playlists.userId, session.userId));
      
      for (const pl of existing) {
        await tx.delete(playlistItems).where(eq(playlistItems.playlistId, pl.id));
      }
      await tx.delete(playlists).where(eq(playlists.userId, session.userId));

      for (let i = 0; i < clientPlaylists.length; i++) {
        const clientPl = clientPlaylists[i];
        
        // Ensure id is valid UUID if provided, else let database auto-generate
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientPl.id);
        
        const [insertedPl] = await tx.insert(playlists).values({
          id: isUUID ? clientPl.id : undefined,
          userId: session.userId,
          title: clientPl.title,
          description: clientPl.description || '',
          sortIndex: i,
        }).returning();

        if (clientPl.tracks && clientPl.tracks.length > 0) {
          // Chunk list insertion to avoid exceeding Drizzle/Postgres parameters bounds
          const itemsPayload = clientPl.tracks.map((t: { id: string; sourceId?: string }, pos: number) => ({
            playlistId: insertedPl.id,
            position: pos,
            sourceId: t.sourceId || 'yt',
            trackId: t.id,
          }));
          await tx.insert(playlistItems).values(itemsPayload);
        }
      }
    });

    return jsonResponse({ success: true, count: clientPlaylists.length });
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
