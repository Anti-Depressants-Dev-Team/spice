import { db } from '@/db';
import { systemSettings } from '@/db/schema';
import { jsonResponse, optionsResponse } from '@/lib/cors';
import { verifySession } from '@/lib/auth';
import { requireAdminAccount } from '@/lib/accounts';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return jsonResponse(
      { error: 'unauthorized', message: 'A bearer token is required to load system settings.' },
      { status: 401 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return jsonResponse(
      { error: 'database_not_configured', message: 'DATABASE_URL is not set.' },
      { status: 500 },
    );
  }

  try {
    const session = await verifySession(auth.substring(7));
    await requireAdminAccount(session);

    let settings = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.id, 'default'),
    });

    if (!settings) {
      const inserted = await db.insert(systemSettings)
        .values({ id: 'default' })
        .returning();
      settings = inserted[0];
    }

    return jsonResponse({ settings });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.name : 'error',
        message: error instanceof Error ? error.message : 'An error occurred.',
      },
      { status: error instanceof Error && error.name === 'AccountAuthorizationError' ? 403 : 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return jsonResponse(
      { error: 'unauthorized', message: 'A bearer token is required to update system settings.' },
      { status: 401 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return jsonResponse(
      { error: 'database_not_configured', message: 'DATABASE_URL is not set.' },
      { status: 500 },
    );
  }

  try {
    const session = await verifySession(auth.substring(7));
    await requireAdminAccount(session);

    const body = await request.json();
    const { emergencyAusterity, austerityThrottleRate, disableSync, emergencyStop } = body;

    const updateData: Record<string, boolean | number | Date> = { updatedAt: new Date() };
    if (emergencyAusterity !== undefined) updateData.emergencyAusterity = emergencyAusterity;
    if (austerityThrottleRate !== undefined) updateData.austerityThrottleRate = austerityThrottleRate;
    if (disableSync !== undefined) updateData.disableSync = disableSync;
    if (emergencyStop !== undefined) updateData.emergencyStop = emergencyStop;

    const existing = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.id, 'default'),
    });

    let settings;
    if (existing) {
      const updated = await db.update(systemSettings)
        .set(updateData)
        .where(eq(systemSettings.id, 'default'))
        .returning();
      settings = updated[0];
    } else {
      const inserted = await db.insert(systemSettings)
        .values({
          id: 'default',
          ...updateData,
        })
        .returning();
      settings = inserted[0];
    }

    return jsonResponse({ success: true, settings });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.name : 'error',
        message: error instanceof Error ? error.message : 'An error occurred.',
      },
      { status: error instanceof Error && error.name === 'AccountAuthorizationError' ? 403 : 500 },
    );
  }
}
