import type { NextRequest } from 'next/server';

import { verifySession } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/cors';
import { getPlaylistSnapshot } from '@/lib/shared-playlists';
import { db } from '@/db';
import { playlistInvites, playlistMembers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

function inviteIsInactive(invite: typeof playlistInvites.$inferSelect) {
  return Boolean(invite.revokedAt || (invite.expiresAt && invite.expiresAt.getTime() <= Date.now()));
}

async function getInvite(token: string) {
  if (!token) return null;
  return await db.query.playlistInvites.findFirst({
    where: eq(playlistInvites.token, token),
  });
}

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    if (!process.env.DATABASE_URL) {
      return jsonResponse(
        { error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' },
        { status: 500 },
      );
    }

    const { token } = await params;
    const invite = await getInvite(token);
    if (!invite) {
      return jsonResponse({ error: 'invite_not_found', message: 'This playlist invite does not exist.' }, { status: 404 });
    }
    if (inviteIsInactive(invite)) {
      return jsonResponse({ error: 'invite_inactive', message: 'This playlist invite has expired or was revoked.' }, { status: 410 });
    }

    const playlist = await getPlaylistSnapshot(invite.playlistId, { shared: true, shareRole: invite.role });
    if (!playlist) {
      return jsonResponse({ error: 'playlist_not_found', message: 'This shared playlist is no longer available.' }, { status: 404 });
    }

    return jsonResponse({
      invite: {
        token,
        role: invite.role,
        expiresAt: invite.expiresAt?.toISOString() || null,
      },
      playlist,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: 'playlist_invite_preview_failed',
        message: error instanceof Error ? error.message : 'Failed to preview playlist invite.',
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Sign in to accept shared playlist invites.' }, { status: 401 });
    }

    const session = await verifySession(auth.substring(7));
    if (!process.env.DATABASE_URL) {
      return jsonResponse(
        { error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' },
        { status: 500 },
      );
    }

    const { token } = await params;
    const invite = await getInvite(token);
    if (!invite) {
      return jsonResponse({ error: 'invite_not_found', message: 'This playlist invite does not exist.' }, { status: 404 });
    }
    if (inviteIsInactive(invite)) {
      return jsonResponse({ error: 'invite_inactive', message: 'This playlist invite has expired or was revoked.' }, { status: 410 });
    }

    const ownerPreview = await getPlaylistSnapshot(invite.playlistId);
    if (!ownerPreview) {
      return jsonResponse({ error: 'playlist_not_found', message: 'This shared playlist is no longer available.' }, { status: 404 });
    }

    if (ownerPreview.ownerId !== session.userId) {
      await db
        .insert(playlistMembers)
        .values({
          playlistId: invite.playlistId,
          userId: session.userId,
          role: invite.role,
          acceptedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [playlistMembers.playlistId, playlistMembers.userId],
          set: {
            role: invite.role,
            acceptedAt: new Date(),
          },
        });
    }

    const playlist = await getPlaylistSnapshot(invite.playlistId, {
      shared: ownerPreview.ownerId !== session.userId,
      shareRole: ownerPreview.ownerId !== session.userId ? invite.role : undefined,
    });

    return jsonResponse({ success: true, playlist });
  } catch (error) {
    return jsonResponse(
      {
        error: 'playlist_invite_accept_failed',
        message: error instanceof Error ? error.message : 'Failed to accept playlist invite.',
      },
      { status: 500 },
    );
  }
}
