import { jsonResponse, optionsResponse } from '@/lib/cors';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/hash';
import { signSession } from '@/lib/auth';

export const runtime = 'nodejs';

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return jsonResponse(
      {
        error: 'db_not_configured',
        message: 'Postgres database connection is pending configuration in .env',
      },
      { status: 503 }
    );
  }

  try {
    const { email, password } = await request.json();
    if (!email || !password || password.length < 6) {
      return jsonResponse(
        {
          error: 'invalid_inputs',
          message: 'A valid email and password of at least 6 characters are required.',
        },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (existing) {
      return jsonResponse(
        {
          error: 'email_exists',
          message: 'An account with this email address already exists.',
        },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);
    const [newUser] = await db.insert(users).values({
      email: email.toLowerCase().trim(),
      passwordHash,
    }).returning();

    const token = await signSession({ userId: newUser.id, email: newUser.email });

    return jsonResponse({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
      },
    });
  } catch (error) {
    return jsonResponse(
      {
        error: 'signup_failed',
        message: error instanceof Error ? error.message : 'User registration failed.',
      },
      { status: 500 }
    );
  }
}
