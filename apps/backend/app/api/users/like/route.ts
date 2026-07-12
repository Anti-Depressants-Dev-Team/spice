import { jsonResponse, optionsResponse } from '@/lib/cors';
import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { profileLikes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
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

    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return jsonResponse({ error: 'missing_target_user_id', message: 'Missing targetUserId.' }, { status: 400 });
    }

    if (targetUserId === session.userId) {
      return jsonResponse({ error: 'self_like_not_allowed', message: 'You cannot like your own profile.' }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(profileLikes)
      .where(
        and(
          eq(profileLikes.likerUserId, session.userId),
          eq(profileLikes.targetUserId, targetUserId)
        )
      )
      .limit(1);

    let isLiked = false;

    if (existing.length > 0) {
      await db
        .delete(profileLikes)
        .where(
          and(
            eq(profileLikes.likerUserId, session.userId),
            eq(profileLikes.targetUserId, targetUserId)
          )
        );
      isLiked = false;
    } else {
      await db.insert(profileLikes).values({
        likerUserId: session.userId,
        targetUserId: targetUserId,
      });
      isLiked = true;
    }

    const likesRows = await db
      .select()
      .from(profileLikes)
      .where(eq(profileLikes.targetUserId, targetUserId));

    return jsonResponse({
      success: true,
      isLiked,
      likesCount: likesRows.length,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: 'profile_like_failed',
        message: error instanceof Error ? error.message : 'Failed to toggle profile like.',
      },
      { status: 500 }
    );
  }
}
