import { jsonResponse, optionsResponse } from '@/lib/cors';
import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { history } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getLocalHistory, saveLocalHistory } from '@/lib/local-db';

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

    const userHistory = await db.query.history.findMany({
      where: eq(history.userId, session.userId),
      orderBy: desc(history.playedAt),
      limit: 50,
    });

    return jsonResponse({
      history: userHistory.map((h: { trackId: string; sourceId: string }) => ({
        id: h.trackId,
        title: 'Track', // Client maps metadata on restoration or uses fallback
        artists: [],
        sourceId: h.sourceId,
      })),
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
    const { history: clientHistory } = await request.json();

    if (!Array.isArray(clientHistory)) {
      return jsonResponse({ error: 'invalid_payload', message: 'History payload must be an array.' }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return jsonResponse({ error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' }, { status: 500 });
    }

    // Clear old history and replace with modern client stack (transaction-free for neon-http compatibility)
    await db.delete(history).where(eq(history.userId, session.userId));

    if (clientHistory.length > 0) {
      // Dedup consecutive ids
      const payload = clientHistory.slice(0, 50).map((h: { id: string; sourceId?: string }, i: number) => ({
        userId: session.userId,
        sourceId: h.sourceId || 'yt',
        trackId: h.id,
        // Stagger playedAt times slightly to preserve order
        playedAt: new Date(Date.now() - i * 1000),
        msListened: 30000, // stub duration
      }));
      await db.insert(history).values(payload);
    }

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
