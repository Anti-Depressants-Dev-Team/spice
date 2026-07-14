import { desc } from 'drizzle-orm';

import { db } from '@/db';
import { feedbackSubmissions } from '@/db/schema';
import { requireAdminAccount } from '@/lib/accounts';
import { verifySession } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/cors';

export const runtime = 'nodejs';

const ADMIN_FEEDBACK_LIMIT = 200;

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return jsonResponse(
      { error: 'unauthorized', message: 'A bearer token is required to load feedback.' },
      { status: 401 },
      request,
    );
  }

  if (!process.env.DATABASE_URL) {
    return jsonResponse(
      { error: 'database_not_configured', message: 'DATABASE_URL is not set.' },
      { status: 500 },
      request,
    );
  }

  try {
    const session = await verifySession(auth.substring(7));
    await requireAdminAccount(session);

    const feedback = await db
      .select({
        id: feedbackSubmissions.id,
        userId: feedbackSubmissions.userId,
        email: feedbackSubmissions.email,
        category: feedbackSubmissions.category,
        content: feedbackSubmissions.content,
        rating: feedbackSubmissions.rating,
        createdAt: feedbackSubmissions.createdAt,
      })
      .from(feedbackSubmissions)
      .orderBy(desc(feedbackSubmissions.createdAt))
      .limit(ADMIN_FEEDBACK_LIMIT);

    return jsonResponse(
      {
        feedback: feedback.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      },
      request,
    );
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.name : 'error',
        message: error instanceof Error ? error.message : 'Feedback could not be loaded.',
      },
      { status: error instanceof Error && error.name === 'AccountAuthorizationError' ? 403 : 500 },
      request,
    );
  }
}
