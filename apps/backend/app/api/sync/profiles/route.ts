import { jsonResponse, optionsResponse } from '@/lib/cors';
import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
    const session = await verifySession(token);

    if (!process.env.DATABASE_URL) {
      return jsonResponse({ error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' }, { status: 500 });
    }

    const userProfiles = await db.query.profiles.findMany({
      where: eq(profiles.userId, session.userId),
    });

    return jsonResponse({
      profiles: userProfiles,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: 'sync_get_profiles_failed',
        message: error instanceof Error ? error.message : 'Failed to retrieve cloud profiles.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', message: 'Missing auth header.' }, { status: 401 });
    }

    const token = auth.substring(7);
    const session = await verifySession(token);
    const { profiles: profilesPayload } = await request.json();

    if (!Array.isArray(profilesPayload)) {
      return jsonResponse({ error: 'invalid_payload', message: 'Payload must be an array of profiles.' }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return jsonResponse({ error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' }, { status: 500 });
    }

    const batch = [];
    batch.push(db.delete(profiles).where(eq(profiles.userId, session.userId)));

    if (profilesPayload.length > 0) {
      const payload = profilesPayload.map(p => ({
        id: p.id,
        userId: session.userId,
        displayName: p.displayName,
        bio: p.bio || '',
        gradient: p.gradient,
        songsPlayed: p.songsPlayed ?? 0,
        joinedAt: p.joinedAt,
        passcode: p.passcode || null,
        avatarUrl: p.avatarUrl || null,
        isPrivate: p.isPrivate === true,
      }));
      batch.push(db.insert(profiles).values(payload));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.batch(batch as any);

    return jsonResponse({ success: true, count: profilesPayload.length });
  } catch (error) {
    return jsonResponse(
      {
        error: 'sync_post_profiles_failed',
        message: error instanceof Error ? error.message : 'Failed to synchronize profiles.',
      },
      { status: 500 }
    );
  }
}
