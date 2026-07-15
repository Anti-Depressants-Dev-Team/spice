import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/cors';
import { db } from '@/db';
import { listenTogetherSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isListenTogetherSessionActive } from '@/app/listen-together-core';
import { classifyListenTogetherSessionFailure } from '@/lib/listen-together-session-errors';

export const runtime = 'nodejs';

export function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 }, request);
    }

    const session = await verifySession(auth.substring(7));
    if (!process.env.DATABASE_URL) {
      return jsonResponse({ error: 'database_not_configured', message: 'DATABASE_URL is not configured.' }, { status: 500 }, request);
    }

    const body = await request.json().catch(() => ({}));
    const requestedProfileId = typeof body.profileId === 'string' ? body.profileId.trim() : '';
    const profileId = requestedProfileId || 'default';

    const [hostSession] = await db.insert(listenTogetherSessions).values({
      hostUserId: session.userId,
      hostProfileId: profileId,
    })
      .onConflictDoUpdate({
        target: listenTogetherSessions.hostUserId,
        set: { hostProfileId: profileId, updatedAt: new Date() },
      })
      .returning();

    return jsonResponse({ success: true, session: hostSession }, {}, request);
  } catch (error) {
    const failure = classifyListenTogetherSessionFailure(error);
    console.error('[listen-together/session] Session creation failed.', {
      category: failure.error,
      databaseCode: failure.databaseCode,
      errorName: error instanceof Error ? error.name : typeof error,
      requestId: request.headers.get('x-vercel-id') || undefined,
    });
    return jsonResponse(
      { error: failure.error, message: failure.message },
      {
        status: failure.status,
        headers: failure.status === 503 ? { 'Retry-After': '30' } : undefined,
      },
      request,
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    if (!process.env.DATABASE_URL) {
      return jsonResponse({ error: 'database_not_configured', message: 'DATABASE_URL is not configured.' }, { status: 500 }, request);
    }

    let hostUserId: string | null = null;
    if (!sessionId) {
      const auth = request.headers.get('Authorization');
      if (!auth?.startsWith('Bearer ')) {
        return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 }, request);
      }
      hostUserId = (await verifySession(auth.substring(7))).userId;
    }

    const hostedSession = await db.query.listenTogetherSessions.findFirst({
      where: sessionId
        ? eq(listenTogetherSessions.id, sessionId)
        : eq(listenTogetherSessions.hostUserId, hostUserId!),
    });

    if (!hostedSession) {
      return jsonResponse({ error: 'session_not_found', message: 'Session not found.' }, { status: 404 }, request);
    }

    return jsonResponse(
      {
        session: hostedSession,
        isActive: isListenTogetherSessionActive(hostedSession.updatedAt),
      },
      {},
      request,
    );
  } catch (error) {
    return jsonResponse({ error: 'fetch_session_failed', message: error instanceof Error ? error.message : 'Failed to fetch session.' }, { status: 500 }, request);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 }, request);
    }

    const session = await verifySession(auth.substring(7));
    if (!process.env.DATABASE_URL) {
      return jsonResponse({ error: 'database_not_configured', message: 'DATABASE_URL is not configured.' }, { status: 500 }, request);
    }

    await db.delete(listenTogetherSessions)
      .where(eq(listenTogetherSessions.hostUserId, session.userId));

    return jsonResponse({ success: true, message: 'Session ended.' }, {}, request);
  } catch (error) {
    return jsonResponse({ error: 'end_session_failed', message: error instanceof Error ? error.message : 'Failed to end session.' }, { status: 500 }, request);
  }
}
