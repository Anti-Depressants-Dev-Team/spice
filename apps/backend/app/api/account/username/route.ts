import type { NextRequest } from 'next/server';

import { verifySession } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/cors';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

const usernamePattern = /^[a-zA-Z0-9_]{3,20}$/;

export function OPTIONS() {
  return optionsResponse();
}

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

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    return jsonResponse({ username: user?.username || null });
  } catch (error) {
    return jsonResponse(
      {
        error: 'username_get_failed',
        message: error instanceof Error ? error.message : 'Failed to get username.',
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const username = typeof body.username === 'string' ? body.username.trim() : '';

    if (!usernamePattern.test(username)) {
      return jsonResponse(
        {
          error: 'invalid_username',
          message: 'Username must be 3–20 characters, letters, numbers, and underscores only.',
        },
        { status: 400 },
      );
    }

    // Fetch current username to check if the base name changed
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    let fullUsername = '';
    let isUnique = false;
    let attempts = 0;

    if (currentUser?.username) {
      const parts = currentUser.username.split('#');
      if (parts[0] === username.toLowerCase()) {
        fullUsername = currentUser.username;
        isUnique = true;
      }
    }

    while (!isUnique && attempts < 10) {
      const digits = Math.floor(10000000 + Math.random() * 90000000).toString();
      fullUsername = `${username.toLowerCase()}#${digits}`;

      const existing = await db.query.users.findFirst({
        where: eq(users.username, fullUsername),
      });

      if (!existing || existing.id === session.userId) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return jsonResponse(
        { error: 'username_generation_failed', message: 'Failed to generate a unique username tag. Please try again.' },
        { status: 500 }
      );
    }

    await db.update(users).set({ username: fullUsername }).where(eq(users.id, session.userId));

    return jsonResponse({ success: true, username: fullUsername });
  } catch (error) {
    return jsonResponse(
      {
        error: 'username_update_failed',
        message: error instanceof Error ? error.message : 'Failed to update username.',
      },
      { status: 500 },
    );
  }
}
