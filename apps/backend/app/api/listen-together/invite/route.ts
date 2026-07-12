import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/cors';
import { db } from '@/db';
import { users, listenTogetherSessions, listenTogetherInvites, profiles } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const runtime = 'nodejs';

export function OPTIONS() {
  return optionsResponse();
}

// Get pending invites for current user OR check status of invites for host's session
export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 });
    }

    const session = await verifySession(auth.substring(7));
    if (!process.env.DATABASE_URL) {
      return jsonResponse({ error: 'database_not_configured', message: 'DATABASE_URL is not configured.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      // Host fetching invites status for their session
      // Verify session belongs to host
      const hostSession = await db.query.listenTogetherSessions.findFirst({
        where: and(
          eq(listenTogetherSessions.id, sessionId),
          eq(listenTogetherSessions.hostUserId, session.userId)
        ),
      });

      if (!hostSession) {
        return jsonResponse({ error: 'unauthorized', message: 'You are not the host of this session.' }, { status: 403 });
      }

      const sessionInvites = await db
        .select({
          inviteId: listenTogetherInvites.id,
          status: listenTogetherInvites.status,
          createdAt: listenTogetherInvites.createdAt,
          invitedUserId: users.id,
          invitedUsername: users.username,
          invitedDisplayName: profiles.displayName,
          invitedProfileUsername: profiles.username,
        })
        .from(listenTogetherInvites)
        .innerJoin(users, eq(listenTogetherInvites.invitedUserId, users.id))
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(eq(listenTogetherInvites.sessionId, sessionId))
        .orderBy(desc(listenTogetherInvites.createdAt));

      // Deduplicate by inviteId
      const seen = new Set();
      const uniqueSessionInvites = sessionInvites.filter(inv => !seen.has(inv.inviteId) && seen.add(inv.inviteId));

      return jsonResponse({ invites: uniqueSessionInvites });
    }

    // Get invites where invitedUserId = session.userId and status = 'pending'
    const invites = await db
      .select({
        inviteId: listenTogetherInvites.id,
        sessionId: listenTogetherInvites.sessionId,
        status: listenTogetherInvites.status,
        createdAt: listenTogetherInvites.createdAt,
        hostUserId: users.id,
        hostUserUsername: users.username,
        hostProfileUsername: profiles.username,
        hostDisplayName: profiles.displayName,
      })
      .from(listenTogetherInvites)
      .innerJoin(listenTogetherSessions, eq(listenTogetherInvites.sessionId, listenTogetherSessions.id))
      .innerJoin(users, eq(listenTogetherSessions.hostUserId, users.id))
      .leftJoin(
        profiles,
        and(
          eq(profiles.userId, users.id),
          eq(profiles.id, listenTogetherSessions.hostProfileId)
        )
      )
      .where(
        and(
          eq(listenTogetherInvites.invitedUserId, session.userId),
          eq(listenTogetherInvites.status, 'pending')
        )
      )
      .orderBy(desc(listenTogetherInvites.createdAt));

    const seenPending = new Set();
    const deduplicatedInvites = invites
      .filter(row => !seenPending.has(row.inviteId) && seenPending.add(row.inviteId))
      .map(row => ({
        inviteId: row.inviteId,
        sessionId: row.sessionId,
        status: row.status,
        createdAt: row.createdAt,
        hostUserId: row.hostUserId,
        hostUsername: row.hostProfileUsername || row.hostUserUsername || 'unknown',
        hostDisplayName: row.hostDisplayName || row.hostProfileUsername || row.hostUserUsername || 'Spice Listener',
      }));

    return jsonResponse({ invites: deduplicatedInvites });
  } catch (error) {
    return jsonResponse({ error: 'fetch_invites_failed', message: error instanceof Error ? error.message : 'Failed to fetch invites.' }, { status: 500 });
  }
}

// Send an invite to another user
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
    let targetUsername = typeof body.username === 'string' ? body.username.trim() : '';
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';

    if (!targetUsername || !sessionId) {
      return jsonResponse({ error: 'invalid_request', message: 'Username and sessionId are required.' }, { status: 400 });
    }

    if (targetUsername.startsWith('@')) {
      targetUsername = targetUsername.substring(1);
    }
    targetUsername = targetUsername.toLowerCase();

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

    // Find the target user via profiles username first, falling back to users table
    const targetProfileRecord = await db.query.profiles.findFirst({
      where: eq(profiles.username, targetUsername),
    });

    const targetUser = targetProfileRecord
      ? await db.query.users.findFirst({ where: eq(users.id, targetProfileRecord.userId) })
      : await db.query.users.findFirst({ where: eq(users.username, targetUsername) });

    if (!targetUser) {
      return jsonResponse({ error: 'user_not_found', message: `User with username "${targetUsername}" not found.` }, { status: 404 });
    }

    if (targetUser.id === session.userId) {
      return jsonResponse({ error: 'cannot_invite_self', message: 'You cannot invite yourself.' }, { status: 400 });
    }

    // Check if an invite already exists
    const existingInvite = await db.query.listenTogetherInvites.findFirst({
      where: and(
        eq(listenTogetherInvites.sessionId, sessionId),
        eq(listenTogetherInvites.invitedUserId, targetUser.id)
      ),
    });

    if (existingInvite) {
      if (existingInvite.status === 'pending') {
        return jsonResponse({ success: true, message: 'Invite already sent.', invite: existingInvite });
      }
      // Reactivate it if rejected/accepted previously
      const [updatedInvite] = await db.update(listenTogetherInvites)
        .set({ status: 'pending', createdAt: new Date() })
        .where(eq(listenTogetherInvites.id, existingInvite.id))
        .returning();
      return jsonResponse({ success: true, message: 'Invite sent.', invite: updatedInvite });
    }

    const [newInvite] = await db.insert(listenTogetherInvites).values({
      sessionId,
      invitedUserId: targetUser.id,
      invitedByUserId: session.userId,
      status: 'pending',
    }).returning();

    return jsonResponse({ success: true, message: 'Invite sent successfully.', invite: newInvite });
  } catch (error) {
    return jsonResponse({ error: 'send_invite_failed', message: error instanceof Error ? error.message : 'Failed to send invite.' }, { status: 500 });
  }
}

// Respond to an invite (Accept or Reject)
export async function PUT(request: NextRequest) {
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
    const inviteId = typeof body.inviteId === 'string' ? body.inviteId.trim() : '';
    const action = typeof body.action === 'string' ? body.action.trim() : ''; // 'accept' or 'reject'

    if (!inviteId || (action !== 'accept' && action !== 'reject')) {
      return jsonResponse({ error: 'invalid_request', message: 'Invite ID and valid action (accept/reject) are required.' }, { status: 400 });
    }

    const invite = await db.query.listenTogetherInvites.findFirst({
      where: and(
        eq(listenTogetherInvites.id, inviteId),
        eq(listenTogetherInvites.invitedUserId, session.userId)
      ),
    });

    if (!invite) {
      return jsonResponse({ error: 'invite_not_found', message: 'Invite not found.' }, { status: 404 });
    }

    if (action === 'accept') {
      await db.update(listenTogetherInvites)
        .set({ status: 'accepted' })
        .where(eq(listenTogetherInvites.id, inviteId));

      return jsonResponse({ success: true, message: 'Invite accepted.', sessionId: invite.sessionId });
    } else {
      await db.update(listenTogetherInvites)
        .set({ status: 'rejected' })
        .where(eq(listenTogetherInvites.id, inviteId));

      return jsonResponse({ success: true, message: 'Invite rejected.' });
    }
  } catch (error) {
    return jsonResponse({ error: 'respond_invite_failed', message: error instanceof Error ? error.message : 'Failed to respond to invite.' }, { status: 500 });
  }
}

// Listener leaves session (deletes the invite to remove them from list)
export async function DELETE(request: NextRequest) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 });
    }

    const session = await verifySession(auth.substring(7));
    if (!process.env.DATABASE_URL) {
      return jsonResponse({ error: 'database_not_configured', message: 'DATABASE_URL is not configured.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return jsonResponse({ error: 'invalid_request', message: 'Session ID is required.' }, { status: 400 });
    }

    // Delete the invite where sessionId = sessionId and invitedUserId = session.userId
    await db.delete(listenTogetherInvites)
      .where(
        and(
          eq(listenTogetherInvites.sessionId, sessionId),
          eq(listenTogetherInvites.invitedUserId, session.userId)
        )
      );

    return jsonResponse({ success: true, message: 'Left session successfully.' });
  } catch (error) {
    return jsonResponse({ error: 'leave_session_failed', message: error instanceof Error ? error.message : 'Failed to leave session.' }, { status: 500 });
  }
}
