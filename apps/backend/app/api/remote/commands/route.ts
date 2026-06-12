import { jsonResponse, optionsResponse } from '@/lib/cors';
import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { remoteCommands } from '@/db/schema';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

export const runtime = 'nodejs';

const allowedCommands = new Set(['play', 'pause', 'toggle', 'next', 'previous', 'seek', 'volume']);

function safePayload(value: unknown) {
  try {
    return JSON.stringify(value && typeof value === 'object' ? value : {});
  } catch {
    return '{}';
  }
}

function parsePayload(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId')?.slice(0, 120) || '';
    if (!deviceId) {
      return jsonResponse({ error: 'invalid_device', message: 'A deviceId query parameter is required.' }, { status: 400 });
    }

    const commands = await db.query.remoteCommands.findMany({
      where: and(
        eq(remoteCommands.userId, session.userId),
        eq(remoteCommands.targetDeviceId, deviceId),
        isNull(remoteCommands.consumedAt),
      ),
      orderBy: asc(remoteCommands.createdAt),
      limit: 20,
    });

    if (commands.length > 0) {
      await db
        .update(remoteCommands)
        .set({ consumedAt: new Date() })
        .where(inArray(remoteCommands.id, commands.map((command) => command.id)));
    }

    return jsonResponse({
      commands: commands.map((command) => ({
        id: command.id,
        sourceDeviceId: command.sourceDeviceId,
        targetDeviceId: command.targetDeviceId,
        command: command.command,
        payload: parsePayload(command.payloadJson),
        createdAt: command.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return jsonResponse(
      {
        error: 'remote_commands_failed',
        message: error instanceof Error ? error.message : 'Failed to load remote commands.',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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
    const targetDeviceId = typeof body.targetDeviceId === 'string' ? body.targetDeviceId.slice(0, 120) : '';
    const sourceDeviceId = typeof body.sourceDeviceId === 'string' ? body.sourceDeviceId.slice(0, 120) : '';
    const command = typeof body.command === 'string' ? body.command : '';

    if (!targetDeviceId || !sourceDeviceId) {
      return jsonResponse({ error: 'invalid_device', message: 'Source and target device ids are required.' }, { status: 400 });
    }
    if (targetDeviceId === sourceDeviceId) {
      return jsonResponse({ error: 'same_device', message: 'Choose another device to control.' }, { status: 400 });
    }
    if (!allowedCommands.has(command)) {
      return jsonResponse({ error: 'invalid_command', message: 'Unsupported remote command.' }, { status: 400 });
    }

    const [created] = await db
      .insert(remoteCommands)
      .values({
        userId: session.userId,
        targetDeviceId,
        sourceDeviceId,
        command,
        payloadJson: safePayload(body.payload),
      })
      .returning();

    return jsonResponse({
      success: true,
      command: {
        id: created.id,
        targetDeviceId: created.targetDeviceId,
        command: created.command,
        createdAt: created.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return jsonResponse(
      {
        error: 'remote_command_send_failed',
        message: error instanceof Error ? error.message : 'Failed to send remote command.',
      },
      { status: 500 },
    );
  }
}
