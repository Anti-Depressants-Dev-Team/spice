import { jsonResponse, optionsResponse } from '@/lib/cors';
import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { users, profiles } from '@/db/schema';
import { or, ilike, eq } from 'drizzle-orm';

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

    // Search users by username or profile display name
    const results = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: profiles.displayName,
        bio: profiles.bio,
        avatarUrl: profiles.avatarUrl,
        gradient: profiles.gradient,
        isPrivate: profiles.isPrivate,
        songsPlayed: profiles.songsPlayed,
        joinedAt: profiles.joinedAt,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(
        or(
          ilike(users.username, `%${query}%`),
          ilike(profiles.displayName, `%${query}%`)
        )
      )
      .limit(100);

    const userMap = new Map<string, (typeof results)[number]>();
    for (const row of results) {
      if (!userMap.has(row.id)) {
        userMap.set(row.id, row);
      }
    }
    const deduplicated = Array.from(userMap.values()).slice(0, 30);

    const formattedUsers = deduplicated.map(u => ({
      id: u.id,
      username: u.username || 'unknown',
      displayName: u.displayName || u.username || 'Spice Listener',
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
