import { jsonResponse } from '@/lib/cors';
import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { playlistMembers, playlists, users, profiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 });
    }

    const token = auth.substring(7);
    const session = await verifySession(token);

    // Fetch pending invites for the current user
    const pendingInvites = await db
      .select({
        playlistId: playlistMembers.playlistId,
        playlistTitle: playlists.title,
        ownerUserId: playlists.userId,
        ownerUsername: users.username,
        ownerDisplayName: profiles.displayName,
      })
      .from(playlistMembers)
      .innerJoin(playlists, eq(playlistMembers.playlistId, playlists.id))
      .innerJoin(users, eq(playlists.userId, users.id))
      .leftJoin(profiles, eq(users.id, profiles.userId))
      .where(and(eq(playlistMembers.userId, session.userId), eq(playlistMembers.status, 'pending')));

    const inviteMap = new Map<string, (typeof pendingInvites)[number]>();
    for (const row of pendingInvites) {
      if (!inviteMap.has(row.playlistId)) {
        inviteMap.set(row.playlistId, row);
      }
    }
    const deduplicatedInvites = Array.from(inviteMap.values());

    return jsonResponse({
      invites: deduplicatedInvites.map((invite) => ({
        playlistId: invite.playlistId,
        playlistTitle: invite.playlistTitle,
        ownerId: invite.ownerUserId,
        ownerUsername: invite.ownerUsername,
        ownerDisplayName: invite.ownerDisplayName || invite.ownerUsername || 'Unknown',
      })),
    });
  } catch (error) {
    return jsonResponse(
      {
        error: 'fetch_invites_failed',
        message: error instanceof Error ? error.message : 'Failed to fetch pending invites.',
      },
      { status: 500 },
    );
  }
}
