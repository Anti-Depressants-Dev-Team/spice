import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/cors';
import { db } from '@/db';
import { users, listenTogetherSessions, profiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';

export function OPTIONS() {
  return optionsResponse();
}

// Host updates session playback state
export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 });
    }

    const session = await verifySession(auth.substring(7));
    if (!process.env.DATABASE_URL) {
      return jsonResponse({ error: 'database_not_configured', message: 'DATABASE_URL is not configured.' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    const currentTrack = body.currentTrack;
    const queue = body.queue;
    const queueIndex = typeof body.queueIndex === 'number' ? body.queueIndex : 0;
    const isPlaying = typeof body.isPlaying === 'boolean' ? body.isPlaying : false;
    const progressMs = typeof body.progressMs === 'number' ? body.progressMs : 0;
    const durationMs = typeof body.durationMs === 'number' ? body.durationMs : 0;

    if (!sessionId) {
      return jsonResponse({ error: 'invalid_request', message: 'Session ID is required.' }, { status: 400 });
    }

    // Verify session belongs to host
    const userSession = await db.query.listenTogetherSessions.findFirst({
      where: and(
        eq(listenTogetherSessions.id, sessionId),
        eq(listenTogetherSessions.hostUserId, session.userId)
      ),
    });

    if (!userSession) {
      return jsonResponse({ error: 'unauthorized_session', message: 'You are not the host of this session.' }, { status: 403 });
    }

    // Update session state
    await db.update(listenTogetherSessions)
      .set({
        currentTrackJson: currentTrack ? JSON.stringify(currentTrack) : null,
        queueJson: queue ? JSON.stringify(queue) : '[]',
        queueIndex,
        isPlaying,
        progressMs,
        durationMs,
        updatedAt: new Date(),
      })
      .where(eq(listenTogetherSessions.id, sessionId));

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: 'sync_failed', message: error instanceof Error ? error.message : 'Failed to update sync state.' }, { status: 500 });
  }
}

// Listener fetches session playback state
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) {
      return jsonResponse({ error: 'missing_session_id', message: 'Session ID is required.' }, { status: 400 });
    }

    const session = await db
      .select({
        sessionId: listenTogetherSessions.id,
        currentTrackJson: listenTogetherSessions.currentTrackJson,
        queueJson: listenTogetherSessions.queueJson,
        queueIndex: listenTogetherSessions.queueIndex,
        isPlaying: listenTogetherSessions.isPlaying,
        progressMs: listenTogetherSessions.progressMs,
        durationMs: listenTogetherSessions.durationMs,
        updatedAt: listenTogetherSessions.updatedAt,
        hostUserId: users.id,
        hostUserUsername: users.username,
        hostProfileUsername: profiles.username,
        hostDisplayName: profiles.displayName,
      })
      .from(listenTogetherSessions)
      .innerJoin(users, eq(listenTogetherSessions.hostUserId, users.id))
      .leftJoin(
        profiles,
        and(
          eq(profiles.userId, users.id),
          eq(profiles.id, listenTogetherSessions.hostProfileId)
        )
      )
      .where(eq(listenTogetherSessions.id, sessionId))
      .then(rows => rows[0]);

    if (!session) {
      return jsonResponse({ error: 'session_not_found', message: 'Session not found.' }, { status: 404 });
    }

    // Check if the session is active (updated in the last 120 seconds)
    const lastActiveSeconds = Math.round((Date.now() - new Date(session.updatedAt).getTime()) / 1000);
    const isActive = lastActiveSeconds <= 120;

    return jsonResponse({
      isActive,
      sessionId: session.sessionId,
      hostName: session.hostDisplayName || session.hostProfileUsername || session.hostUserUsername || 'Host',
      isPlaying: session.isPlaying,
      progressMs: session.progressMs,
      durationMs: session.durationMs,
      currentTrack: session.currentTrackJson ? JSON.parse(session.currentTrackJson) : null,
      queue: session.queueJson ? JSON.parse(session.queueJson) : [],
      queueIndex: session.queueIndex,
    });
  } catch (error) {
    return jsonResponse({ error: 'sync_fetch_failed', message: error instanceof Error ? error.message : 'Failed to fetch sync state.' }, { status: 500 });
  }
}
