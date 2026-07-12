import { jsonResponse, optionsResponse } from '@/lib/cors';
import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { likes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { trackSnapshotColumns, trackSnapshotFromRow } from '@/lib/track-snapshot';

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

    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId') || 'default';

    const userLikes = await db.query.likes.findMany({
      where: and(
        eq(likes.userId, session.userId),
        eq(likes.profileId, profileId)
      ),
    });

    return jsonResponse({
      likedTracks: userLikes.map((like: typeof likes.$inferSelect) => like.trackId),
      likedTrackDetails: Object.fromEntries(
        userLikes.map((like: typeof likes.$inferSelect) => [like.trackId, trackSnapshotFromRow(like)]),
      ),
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
    const { likedTracks, likedTrackDetails = {}, profileId: payloadProfileId } = await request.json();
    const profileId = payloadProfileId || 'default';

    if (!Array.isArray(likedTracks)) {
      return jsonResponse({ error: 'invalid_payload', message: 'Payload must be an array of track IDs.' }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return jsonResponse({ error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' }, { status: 500 });
    }

    const batch = [];
    batch.push(db.delete(likes).where(
      and(
        eq(likes.userId, session.userId),
        eq(likes.profileId, profileId)
      )
    ));

    if (likedTracks.length > 0) {
      const uniqueTracks = Array.from(new Set(likedTracks));
      const payload = uniqueTracks.map(id => ({
        userId: session.userId,
        profileId,
        sourceId: likedTrackDetails[id as string]?.sourceId || 'youtube_music',
        trackId: id as string,
        ...trackSnapshotColumns(likedTrackDetails[id as string], id as string),
      }));
      batch.push(db.insert(likes).values(payload));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.batch(batch as any);

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
