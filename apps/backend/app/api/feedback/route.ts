import { jsonResponse, optionsResponse } from '@/lib/cors';
import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { feedbackSubmissions } from '@/db/schema';

export const runtime = 'nodejs';

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return jsonResponse(
      {
        error: 'unauthorized',
        message: 'A bearer token is required to submit feedback.',
      },
      { status: 401 },
      request,
    );
  }

  let session: Awaited<ReturnType<typeof verifySession>>;
  try {
    session = await verifySession(auth.substring(7));
  } catch (error) {
    return jsonResponse(
      {
        error: 'invalid_session',
        message: error instanceof Error ? error.message : 'The session token is invalid.',
      },
      { status: 401 },
      request,
    );
  }

  try {
    const { category, content, rating } = await request.json();

    if (!category || !content) {
      return jsonResponse(
        {
          error: 'invalid_inputs',
          message: 'Both category and content are required to submit feedback.',
        },
        { status: 400 },
        request,
      );
    }

    const normalizedRating = typeof rating === 'number' && Number.isFinite(rating)
      ? Math.max(1, Math.min(5, Math.trunc(rating)))
      : null;
    const feedbackItem = {
      id: crypto.randomUUID(),
      userId: session.userId,
      email: session.email,
      category: String(category).slice(0, 80),
      content: String(content).slice(0, 4000),
      rating: normalizedRating,
      createdAt: new Date().toISOString(),
    };

    let stored = false;
    if (process.env.DATABASE_URL) {
      await db.insert(feedbackSubmissions).values({
        id: feedbackItem.id,
        userId: feedbackItem.userId,
        email: feedbackItem.email,
        category: feedbackItem.category,
        content: feedbackItem.content,
        rating: feedbackItem.rating,
        createdAt: new Date(feedbackItem.createdAt),
      });
      stored = true;
    } else {
      console.log('[SPICE_FEEDBACK_LOG_ONLY]', JSON.stringify(feedbackItem));
    }

    return jsonResponse({
      success: true,
      stored,
      message: 'Feedback submitted successfully. Thank you for your support!',
      feedback: feedbackItem,
    }, {}, request);
  } catch (error) {
    return jsonResponse(
      {
        error: 'feedback_submit_failed',
        message: error instanceof Error ? error.message : 'Feedback could not be submitted.',
      },
      { status: 500 },
      request,
    );
  }
}
