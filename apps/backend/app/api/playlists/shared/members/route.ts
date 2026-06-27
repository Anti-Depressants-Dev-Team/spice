import type { NextRequest } from 'next/server';

import { verifySession } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/cors';
import { db } from '@/db';
import { playlists, playlistMembers, users, profiles } from '@/db/schema';
import { and, eq, isNull, inArray } from 'drizzle-orm';

export const runtime = 'nodejs';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MEMBERS = 4;

export function OPTIONS() {
  return optionsResponse();
}

/**
 * GET — List all members of a shared playlist.
 * Query: ?playlistId=UUID
 */
export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 });
    }

    const session = await verifySession(auth.substring(7));
    if (!process.env.DATABASE_URL) {
      return jsonResponse(
        { error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get('playlistId') || '';
    if (!uuidPattern.test(playlistId)) {
      return jsonResponse({ error: 'invalid_playlist_id', message: 'Playlist id must be a UUID.' }, { status: 400 });
    }

    // Check playlist exists
    const playlist = await db.query.playlists.findFirst({
      where: and(eq(playlists.id, playlistId), isNull(playlists.deletedAt)),
    });
    if (!playlist) {
      return jsonResponse({ error: 'playlist_not_found', message: 'Playlist not found.' }, { status: 404 });
    }

    // Only owner or members can see the member list
    const isMember = playlist.userId === session.userId
      || !!(await db.query.playlistMembers.findFirst({
        where: and(eq(playlistMembers.playlistId, playlistId), eq(playlistMembers.userId, session.userId)),
      }));

    if (!isMember) {
      return jsonResponse({ error: 'forbidden', message: 'You are not a member of this playlist.' }, { status: 403 });
    }

    // Get owner info
    const owner = await db.query.users.findFirst({ where: eq(users.id, playlist.userId) });
    const ownerProfile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, playlist.userId),
    });

    // Get members
    const memberRows = await db.select().from(playlistMembers).where(eq(playlistMembers.playlistId, playlistId));

    const otherMemberRows = memberRows.filter((row) => row.userId !== playlist.userId);
    const members = [];

    if (otherMemberRows.length > 0) {
      const userIds = otherMemberRows.map((row) => row.userId);

      const [fetchedUsers, fetchedProfiles] = await Promise.all([
        db.query.users.findMany({ where: inArray(users.id, userIds) }),
        db.query.profiles.findMany({
          where: inArray(profiles.userId, userIds),
        }),
      ]);

      const userMap = new Map(fetchedUsers.map((u) => [u.id, u]));
      const profileMap = new Map(fetchedProfiles.map((p) => [p.userId, p]));

      for (const row of otherMemberRows) {
        const user = userMap.get(row.userId);
        const profile = profileMap.get(row.userId);
        members.push({
          userId: row.userId,
          username: user?.username || null,
          displayName: profile?.displayName || user?.email || 'Unknown',
          avatarUrl: profile?.avatarUrl || null,
          role: row.role,
          status: row.status,
          acceptedAt: row.status === 'accepted' ? row.acceptedAt.toISOString() : null,
        });
      }
    }

    return jsonResponse({
      playlistId,
      owner: {
        userId: playlist.userId,
        username: owner?.username || null,
        displayName: ownerProfile?.displayName || owner?.email || 'Unknown',
        avatarUrl: ownerProfile?.avatarUrl || null,
        role: 'owner',
      },
      members,
      maxMembers: MAX_MEMBERS,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: 'members_list_failed',
        message: error instanceof Error ? error.message : 'Failed to list playlist members.',
      },
      { status: 500 },
    );
  }
}

/**
 * POST — Invite a user by username to a shared playlist.
 * Body: { playlistId, username }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 });
    }

    const session = await verifySession(auth.substring(7));
    if (!process.env.DATABASE_URL) {
      return jsonResponse(
        { error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const playlistId = typeof body.playlistId === 'string' ? body.playlistId : '';
    let username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    if (username.startsWith('@')) {
      username = username.substring(1);
    }

    if (!uuidPattern.test(playlistId)) {
      return jsonResponse({ error: 'invalid_playlist_id', message: 'Playlist id must be a UUID.' }, { status: 400 });
    }
    if (!username) {
      return jsonResponse({ error: 'missing_username', message: 'Username is required.' }, { status: 400 });
    }

    // Verify caller is the playlist owner
    const playlist = await db.query.playlists.findFirst({
      where: and(
        eq(playlists.id, playlistId),
        eq(playlists.userId, session.userId),
        isNull(playlists.deletedAt),
      ),
    });
    if (!playlist) {
      return jsonResponse(
        { error: 'not_owner', message: 'Only the playlist owner can invite members.' },
        { status: 403 },
      );
    }

    // Lookup target user by username
    const targetUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });
    if (!targetUser) {
      return jsonResponse({ error: 'user_not_found', message: `No user found with username "${username}".` }, { status: 404 });
    }

    // Can't invite yourself
    if (targetUser.id === session.userId) {
      return jsonResponse({ error: 'self_invite', message: 'You cannot invite yourself.' }, { status: 400 });
    }

    // Check member cap
    const existingMembers = await db.select().from(playlistMembers).where(eq(playlistMembers.playlistId, playlistId));
    if (existingMembers.length >= MAX_MEMBERS) {
      return jsonResponse(
        { error: 'member_limit', message: `This playlist already has the maximum of ${MAX_MEMBERS} members.` },
        { status: 400 },
      );
    }

    // Check if already a member
    const alreadyMember = existingMembers.find((m) => m.userId === targetUser.id);
    if (alreadyMember) {
      return jsonResponse(
        { error: 'already_member', message: `${username} is already a member of this playlist.` },
        { status: 409 },
      );
    }

    // Add member with pending status
    await db.insert(playlistMembers).values({
      playlistId,
      userId: targetUser.id,
      role: 'editor',
      status: 'pending',
      // acceptedAt is handled dynamically or ignored until accepted
    });

    // Fetch target profile for response
    const targetProfile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, targetUser.id),
    });

    return jsonResponse({
      success: true,
      member: {
        userId: targetUser.id,
        username: targetUser.username,
        displayName: targetProfile?.displayName || targetUser.email || 'Unknown',
        avatarUrl: targetProfile?.avatarUrl || null,
        role: 'editor',
        status: 'pending',
      },
    });
  } catch (error) {
    return jsonResponse(
      {
        error: 'member_invite_failed',
        message: error instanceof Error ? error.message : 'Failed to invite member.',
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE — Owner kicks a member, or a member leaves.
 * Body: { playlistId, userId? } — if userId is omitted, caller leaves.
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 });
    }

    const session = await verifySession(auth.substring(7));
    if (!process.env.DATABASE_URL) {
      return jsonResponse(
        { error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const playlistId = typeof body.playlistId === 'string' ? body.playlistId : '';
    const targetUserId = typeof body.userId === 'string' ? body.userId : session.userId;

    if (!uuidPattern.test(playlistId)) {
      return jsonResponse({ error: 'invalid_playlist_id', message: 'Playlist id must be a UUID.' }, { status: 400 });
    }

    const playlist = await db.query.playlists.findFirst({
      where: and(eq(playlists.id, playlistId), isNull(playlists.deletedAt)),
    });
    if (!playlist) {
      return jsonResponse({ error: 'playlist_not_found', message: 'Playlist not found.' }, { status: 404 });
    }

    // If removing someone else, must be owner
    if (targetUserId !== session.userId && playlist.userId !== session.userId) {
      return jsonResponse(
        { error: 'not_owner', message: 'Only the playlist owner can remove other members.' },
        { status: 403 },
      );
    }

    await db.delete(playlistMembers).where(
      and(
        eq(playlistMembers.playlistId, playlistId),
        eq(playlistMembers.userId, targetUserId),
      ),
    );

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse(
      {
        error: 'member_remove_failed',
        message: error instanceof Error ? error.message : 'Failed to remove member.',
      },
      { status: 500 },
    );
  }
}
