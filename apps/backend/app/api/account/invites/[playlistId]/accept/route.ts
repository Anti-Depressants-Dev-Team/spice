import { jsonResponse } from '@/lib/cors';
import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { playlistMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ playlistId: string }> }) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 });
    }

    const token = auth.substring(7);
    const session = await verifySession(token);
    const { playlistId } = await params;

    const result = await db
      .update(playlistMembers)
      .set({ status: 'accepted', acceptedAt: new Date() })
      .where(and(eq(playlistMembers.userId, session.userId), eq(playlistMembers.playlistId, playlistId), eq(playlistMembers.status, 'pending')))
      .returning();

    if (result.length === 0) {
      return jsonResponse({ error: 'invite_not_found', message: 'Pending invite not found.' }, { status: 404 });
    }

    return jsonResponse({ success: true, message: 'Invite accepted.' });
  } catch (error) {
    return jsonResponse(
      {
        error: 'accept_invite_failed',
        message: error instanceof Error ? error.message : 'Failed to accept invite.',
      },
      { status: 500 },
    );
  }
}
