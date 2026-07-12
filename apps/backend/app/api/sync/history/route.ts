import { jsonResponse, optionsResponse } from '@/lib/cors';
import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { history } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
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

    const userHistory = await db.query.history.findMany({
      where: and(
        eq(history.userId, session.userId),
        eq(history.profileId, profileId)
      ),
      orderBy: desc(history.playedAt),
      limit: 50,
    });

    return jsonResponse({
      history: userHistory.map(trackSnapshotFromRow),
    });
  } catch (error) {
    return jsonResponse(
      {
        error: 'sync_get_history_failed',
        message: error instanceof Error ? error.message : 'Failed to retrieve listening history.',
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
    const { history: clientHistory, profileId: payloadProfileId } = await request.json();
    const profileId = payloadProfileId || 'default';

    if (!Array.isArray(clientHistory)) {
      return jsonResponse({ error: 'invalid_payload', message: 'History payload must be an array.' }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return jsonResponse({ error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' }, { status: 500 });
    }

    const batch = [];
    batch.push(db.delete(history).where(
      and(
        eq(history.userId, session.userId),
        eq(history.profileId, profileId)
      )
    ));

    if (clientHistory.length > 0) {
      const payload = clientHistory.slice(0, 50).map((h: { id: string; sourceId?: string }, i: number) => ({
        userId: session.userId,
        profileId,
        sourceId: h.sourceId || 'youtube_music',
        trackId: h.id,
        ...trackSnapshotColumns(h, h.id),
        playedAt: new Date(Date.now() - i * 1000),
        msListened: 30000,
      }));
      batch.push(db.insert(history).values(payload));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.batch(batch as any);

    return jsonResponse({ success: true, count: clientHistory.length });
  } catch (error) {
    return jsonResponse(
      {
        error: 'sync_post_history_failed',
        message: error instanceof Error ? error.message : 'Failed to synchronize listening history.',
      },
      { status: 500 }
    );
  }
}
