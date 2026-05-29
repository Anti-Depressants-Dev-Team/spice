import { jsonResponse, optionsResponse } from '@/lib/cors';
import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { likes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getLocalLikes, saveLocalLikes } from '@/lib/local-db';

export const runtime = 'nodejs';

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

    const userLikes = await db.query.likes.findMany({
      where: eq(likes.userId, session.userId),
    });

    return jsonResponse({
      likedTracks: userLikes.map((like: { trackId: string }) => like.trackId),
    });
  } catch (error) {
    return jsonResponse(
      {
        error: 'sync_get_likes_failed',
        message: error instanceof Error ? error.message : 'Failed to retrieve cloud favorites.',
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
    const { likedTracks } = await request.json();

    if (!Array.isArray(likedTracks)) {
      return jsonResponse({ error: 'invalid_payload', message: 'Payload must be an array of track IDs.' }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return jsonResponse({ error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' }, { status: 500 });
    }

    // Clear old likes and push modern favorites (transaction-free for neon-http compatibility)
    await db.delete(likes).where(eq(likes.userId, session.userId));

    if (likedTracks.length > 0) {
      // Insert chunks of unique tracks
      const uniqueTracks = Array.from(new Set(likedTracks));
      const payload = uniqueTracks.map(id => ({
        userId: session.userId,
        sourceId: 'yt',
        trackId: id as string,
      }));
      await db.insert(likes).values(payload);
    }

    return jsonResponse({ success: true, count: likedTracks.length });
  } catch (error) {
    return jsonResponse(
      {
        error: 'sync_post_likes_failed',
        message: error instanceof Error ? error.message : 'Failed to synchronize favorites.',
      },
      { status: 500 }
    );
  }
}
