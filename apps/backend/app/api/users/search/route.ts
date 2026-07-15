import { jsonResponse, optionsResponse } from '@/lib/cors';
import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { users, profiles } from '@/db/schema';
import { and, or, ilike, eq, isNotNull } from 'drizzle-orm';

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
    await verifySession(token);

    if (!process.env.DATABASE_URL) {
      return jsonResponse({ error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    let query = (searchParams.get('q') || '').trim();
    if (query.startsWith('@')) {
      query = query.substring(1);
    }

    if (!query) {
      return jsonResponse({ users: [] });
    }

    // A cloud username is the durable signal that this local profile was
    // explicitly connected to an account. Local-only profiles must never be
    // discoverable through the listener directory.
    const results = await db
      .select({
        id: users.id,
        profileUsername: profiles.username,
        displayName: profiles.displayName,
        bio: profiles.bio,
        avatarUrl: profiles.avatarUrl,
        gradient: profiles.gradient,
        isPrivate: profiles.isPrivate,
        songsPlayed: profiles.songsPlayed,
        joinedAt: profiles.joinedAt,
        profileId: profiles.id,
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          isNotNull(profiles.username),
          or(
            ilike(profiles.username, `%${query}%`),
            ilike(profiles.displayName, `%${query}%`)
          )
        )
      )
      .limit(100);

    const profileMap = new Map<string, (typeof results)[number]>();
    for (const row of results) {
      if (row.profileId) {
        const key = `${row.id}:${row.profileId}`;
        if (!profileMap.has(key)) {
          profileMap.set(key, row);
        }
      }
    }
    const deduplicated = Array.from(profileMap.values()).slice(0, 30);

    const formattedUsers = deduplicated.map(u => ({
      id: u.id,
      profileId: u.profileId,
      username: u.profileUsername || 'unknown',
      displayName: u.displayName || u.profileUsername || 'Spice Listener',
      bio: u.bio || 'A fresh Spice listener.',
      avatarUrl: u.avatarUrl || null,
      gradient: u.gradient || 'linear-gradient(135deg, #a855f7, #ec4899)',
      isPrivate: u.isPrivate === true,
      songsPlayed: u.songsPlayed ?? 0,
      joinedAt: u.joinedAt || 'June 2026',
    }));

    return jsonResponse({ users: formattedUsers });
  } catch (error) {
    return jsonResponse(
      {
        error: 'users_search_failed',
        message: error instanceof Error ? error.message : 'Failed to search users.',
      },
      { status: 500 }
    );
  }
}
