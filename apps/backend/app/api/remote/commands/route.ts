import { jsonResponse, optionsResponse } from '@/lib/cors';
import { db } from '@/db';
import { remoteCommands, remoteDeviceAuthorizations, remoteDevices } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import {
  isSpiceConnectRemoteDeviceVisible,
  normalizeSpiceConnectCommandInput,
  parseRemotePayload,
  SPICE_CONNECT_COMMAND_REDELIVERY_MS,
  SPICE_CONNECT_COMMAND_TTL_MS,
  SPICE_CONNECT_MAX_COMMAND_DELIVERY_ATTEMPTS,
  SPICE_CONNECT_STALE_DEVICE_SECONDS,
} from '@/lib/spice-connect';
import {
  authorizeSpiceConnectRequest,
  requirePrincipalDevice,
  SpiceConnectAuthorizationError,
} from '@/lib/spice-connect-authorization';
import {
  createSpiceConnectCommandSignal,
  SPICE_CONNECT_REALTIME_CHANNEL,
} from '@/lib/spice-connect-realtime';

export const runtime = 'nodejs';

type ClaimedRemoteCommand = {
  id: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  command: string;
  payloadJson: string;
  createdAt: Date | string;
};

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

async function loadAvailableRemoteDevice(userId: string, deviceId: string, now: Date) {
  const device = await db.query.remoteDevices.findFirst({
    where: and(
      eq(remoteDevices.userId, userId),
      eq(remoteDevices.deviceId, deviceId),
    ),
  });
  if (!device) return null;

  const authorizations = await db.query.remoteDeviceAuthorizations.findMany({
    columns: { tokenHash: true, expiresAt: true, revokedAt: true },
    where: and(
      eq(remoteDeviceAuthorizations.userId, userId),
      eq(remoteDeviceAuthorizations.deviceId, deviceId),
    ),
  });
  return isSpiceConnectRemoteDeviceVisible(device.pairedAuthorizationHash, authorizations, now) ? device : null;
}

export async function GET(request: Request) {
  try {
    const principal = await authorizeSpiceConnectRequest(request);
    if (!process.env.DATABASE_URL) {
      return jsonResponse(
        { error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' },
        { status: 500 },
        request,
      );
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId')?.slice(0, 120) || '';
    if (!deviceId) {
      return jsonResponse(
        { error: 'invalid_device', message: 'A deviceId query parameter is required.' },
        { status: 400 },
        request,
      );
    }
    requirePrincipalDevice(principal, deviceId);

    const now = new Date();
    const receivingDevice = await loadAvailableRemoteDevice(principal.userId, deviceId, now);
    if (!receivingDevice) {
      return jsonResponse(
        { error: 'device_not_found', message: 'This Spice Connect receiver is not registered or authorized.' },
        { status: 404 },
        request,
      );
    }
    const staleCutoff = new Date(now.getTime() - SPICE_CONNECT_COMMAND_TTL_MS);
    const retryCutoff = new Date(now.getTime() - SPICE_CONNECT_COMMAND_REDELIVERY_MS);

    const claimedCommands = await db.execute<ClaimedRemoteCommand>(sql`
      WITH stale_commands AS (
        DELETE FROM ${remoteCommands}
        WHERE ${remoteCommands.userId} = ${principal.userId}
          AND ${remoteCommands.targetDeviceId} = ${deviceId}
          AND ${remoteCommands.createdAt} < ${staleCutoff}
        RETURNING ${remoteCommands.id}
      ), deliverable_commands AS (
        SELECT ${remoteCommands.id}
        FROM ${remoteCommands}
        WHERE ${remoteCommands.userId} = ${principal.userId}
          AND ${remoteCommands.targetDeviceId} = ${deviceId}
          AND ${remoteCommands.createdAt} >= ${staleCutoff}
          AND ${remoteCommands.deliveryAttempts} < ${SPICE_CONNECT_MAX_COMMAND_DELIVERY_ATTEMPTS}
          AND (
            ${remoteCommands.consumedAt} IS NULL
            OR ${remoteCommands.consumedAt} <= ${retryCutoff}
          )
        ORDER BY
          CASE WHEN ${remoteCommands.consumedAt} IS NULL THEN 0 ELSE 1 END,
          ${remoteCommands.createdAt}
        LIMIT 20
        FOR UPDATE SKIP LOCKED
      ), claimed_commands AS (
        UPDATE ${remoteCommands}
        SET
          "consumed_at" = ${now},
          "delivery_attempts" = ${remoteCommands.deliveryAttempts} + 1
        FROM deliverable_commands
        WHERE ${remoteCommands.id} = deliverable_commands.id
        RETURNING
          ${remoteCommands.id} AS "id",
          ${remoteCommands.sourceDeviceId} AS "sourceDeviceId",
          ${remoteCommands.targetDeviceId} AS "targetDeviceId",
          ${remoteCommands.command} AS "command",
          ${remoteCommands.payloadJson} AS "payloadJson",
          ${remoteCommands.createdAt} AS "createdAt"
      )
      SELECT * FROM claimed_commands ORDER BY "createdAt"
    `);

    return jsonResponse({
      commands: claimedCommands.rows.map((command) => ({
        id: command.id,
        sourceDeviceId: command.sourceDeviceId,
        targetDeviceId: command.targetDeviceId,
        command: command.command,
        payload: parseRemotePayload(command.payloadJson),
        createdAt: new Date(command.createdAt).toISOString(),
      })),
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } }, request);
  } catch (error) {
    if (error instanceof SpiceConnectAuthorizationError) {
      return jsonResponse({ error: error.code, message: error.message }, { status: error.status }, request);
    }
    return jsonResponse(
      {
        error: 'remote_commands_failed',
        message: error instanceof Error ? error.message : 'Failed to load Spice Connect commands.',
      },
      { status: 500 },
      request,
    );
  }
}

export async function POST(request: Request) {
  try {
    const principal = await authorizeSpiceConnectRequest(request);
    if (!process.env.DATABASE_URL) {
      return jsonResponse(
        { error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' },
        { status: 500 },
        request,
      );
    }

    const body = await request.json().catch(() => ({}));
    const input = normalizeSpiceConnectCommandInput(body);

    if ('error' in input) {
      return jsonResponse({ error: input.error, message: input.message }, { status: 400 }, request);
    }
    requirePrincipalDevice(principal, input.sourceDeviceId);

    const now = new Date();
    const [source, target] = await Promise.all([
      principal.kind === 'paired_device'
        ? loadAvailableRemoteDevice(principal.userId, input.sourceDeviceId, now)
        : Promise.resolve(true),
      loadAvailableRemoteDevice(principal.userId, input.targetDeviceId, now),
    ]);
    if (!source) {
      return jsonResponse(
        { error: 'source_not_found', message: 'Register this Spice Connect controller before sending commands.' },
        { status: 404 },
        request,
      );
    }
    if (!target) {
      return jsonResponse(
        { error: 'target_not_found', message: 'The target Spice Connect device is not registered or authorized.' },
        { status: 404 },
        request,
      );
    }
    const staleTargetCutoff = now.getTime() - SPICE_CONNECT_STALE_DEVICE_SECONDS * 1000;
    if (target.updatedAt.getTime() < staleTargetCutoff) {
      return jsonResponse(
        { error: 'target_offline', message: 'The target Spice Connect device is offline or has stopped syncing.' },
        { status: 409 },
        request,
      );
    }

    const [created] = await db
      .insert(remoteCommands)
      .values({
        userId: principal.userId,
        targetDeviceId: input.targetDeviceId,
        sourceDeviceId: input.sourceDeviceId,
        command: input.command,
        payloadJson: input.payloadJson,
      })
      .returning();

    try {
      await db.execute(sql`SELECT pg_notify(
        ${SPICE_CONNECT_REALTIME_CHANNEL},
        ${createSpiceConnectCommandSignal(principal.userId, input.targetDeviceId)}
      )`);
    } catch (notificationError) {
      // The command row is durable and polling remains authoritative. A wake
      // notification must never turn a successfully queued command into an
      // apparent failure for the controller.
      console.warn(
        `[Spice Connect] realtime wake notification failed for ${input.targetDeviceId}:`,
        notificationError instanceof Error ? notificationError.message : 'unknown notification error',
      );
    }

    return jsonResponse({
      success: true,
      command: {
        id: created.id,
        targetDeviceId: created.targetDeviceId,
        command: created.command,
        createdAt: created.createdAt.toISOString(),
      },
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } }, request);
  } catch (error) {
    if (error instanceof SpiceConnectAuthorizationError) {
      return jsonResponse({ error: error.code, message: error.message }, { status: error.status }, request);
    }
    return jsonResponse(
      {
        error: 'remote_command_send_failed',
        message: error instanceof Error ? error.message : 'Failed to send Spice Connect command.',
      },
      { status: 500 },
      request,
    );
  }
}
