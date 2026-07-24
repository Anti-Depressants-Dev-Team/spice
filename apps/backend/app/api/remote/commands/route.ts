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
  type SpiceConnectCommandType,
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
import {
  claimSpiceConnectCommands,
  enqueueSpiceConnectCommand,
  hydrateSpiceConnectCommandQueue,
  publishSpiceConnectRedisSignal,
  readSpiceConnectPairedAuthorization,
  readSpiceConnectDeviceStates,
} from '@/lib/spice-connect-redis';

export const runtime = 'nodejs';

type ClaimedRemoteCommand = {
  id: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  command: string;
  payloadJson: string;
  createdAt: Date | string;
  consumedAt: Date | string | null;
  deliveryAttempts: number;
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

async function hasCachedAvailableRemoteDevice(
  principal: Awaited<ReturnType<typeof authorizeSpiceConnectRequest>>,
  deviceId: string,
) {
  const states = await readSpiceConnectDeviceStates(principal.userId);
  if (states === null) return null;
  const state = states.find((candidate) => candidate.deviceId === deviceId);
  // A Redis snapshot can be populated incrementally as receivers check in.
  // Its absence is not proof that an older durable device was removed.
  if (!state) return null;
  // Account-owned device states are always visible. Paired-device state is
  // visible while its exact authorization generation remains active. A cache
  // miss intentionally falls back to PostgreSQL rather than trusting it.
  if (!state.pairedAuthorizationHash) return true;
  const authorization = await readSpiceConnectPairedAuthorization(state.pairedAuthorizationHash);
  if (!authorization) return null;
  return authorization.userId === principal.userId
    && authorization.deviceId === deviceId
    && authorization.authorizationHash === state.pairedAuthorizationHash;
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
    const cachedAvailability = await hasCachedAvailableRemoteDevice(principal, deviceId);
    if (cachedAvailability === true) {
      const redisCommands = await claimSpiceConnectCommands(principal.userId, deviceId, now);
      if (redisCommands !== null) {
        return jsonResponse({
          commands: redisCommands.map((command) => ({
            id: command.id,
            sourceDeviceId: command.sourceDeviceId,
            targetDeviceId: command.targetDeviceId,
            command: command.command,
            payload: parseRemotePayload(command.payloadJson),
            createdAt: command.createdAt,
          })),
        }, { headers: { 'Cache-Control': 'no-store, max-age=0' } }, request);
      }
    }
    if (cachedAvailability === false) {
      return jsonResponse(
        { error: 'device_not_found', message: 'This Spice Connect receiver is not registered or authorized.' },
        { status: 404 },
        request,
      );
    }

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
          ${remoteCommands.createdAt} AS "createdAt",
          ${remoteCommands.consumedAt} AS "consumedAt",
          ${remoteCommands.deliveryAttempts} AS "deliveryAttempts"
      )
      SELECT * FROM claimed_commands ORDER BY "createdAt"
    `);

    const commands = claimedCommands.rows.map((command) => ({
        id: command.id,
        sourceDeviceId: command.sourceDeviceId,
        targetDeviceId: command.targetDeviceId,
        command: command.command,
        payload: parseRemotePayload(command.payloadJson),
        createdAt: new Date(command.createdAt).toISOString(),
      }));
    void hydrateSpiceConnectCommandQueue(principal.userId, deviceId, claimedCommands.rows.map((command) => ({
      id: command.id,
      sourceDeviceId: command.sourceDeviceId,
      targetDeviceId: command.targetDeviceId,
      command: command.command as SpiceConnectCommandType,
      payloadJson: command.payloadJson,
      createdAt: new Date(command.createdAt).toISOString(),
      consumedAt: command.consumedAt ? new Date(command.consumedAt).toISOString() : null,
      deliveryAttempts: command.deliveryAttempts,
    })));
    return jsonResponse({ commands }, { headers: { 'Cache-Control': 'no-store, max-age=0' } }, request);
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
    const [cachedSource, cachedTarget] = await Promise.all([
      principal.kind === 'paired_device'
        ? hasCachedAvailableRemoteDevice(principal, input.sourceDeviceId)
        : Promise.resolve(true),
      hasCachedAvailableRemoteDevice(principal, input.targetDeviceId),
    ]);
    const [source, target] = await Promise.all([
      cachedSource === null
        ? loadAvailableRemoteDevice(principal.userId, input.sourceDeviceId, now)
        : Promise.resolve(cachedSource),
      cachedTarget === null
        ? loadAvailableRemoteDevice(principal.userId, input.targetDeviceId, now)
        : Promise.resolve(cachedTarget),
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
    const cachedTargetState = (await readSpiceConnectDeviceStates(principal.userId))
      ?.find((state) => state.deviceId === input.targetDeviceId) ?? null;
    const targetUpdatedAt = cachedTargetState
      ? new Date(cachedTargetState.updatedAt)
      : target === true
        ? new Date(0)
        : target.updatedAt;
    const staleTargetCutoff = now.getTime() - SPICE_CONNECT_STALE_DEVICE_SECONDS * 1000;
    if (!Number.isFinite(targetUpdatedAt.getTime()) || targetUpdatedAt.getTime() < staleTargetCutoff) {
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

    const redisQueued = await enqueueSpiceConnectCommand(principal.userId, {
      id: created.id,
      sourceDeviceId: created.sourceDeviceId,
      targetDeviceId: created.targetDeviceId,
      command: created.command as SpiceConnectCommandType,
      payloadJson: input.payloadJson,
      createdAt: created.createdAt.toISOString(),
      consumedAt: null,
      deliveryAttempts: 0,
    });
    if (redisQueued) {
      // Redis Pub/Sub is a latency hint. The PostgreSQL command row is still
      // durable, and the receiver's periodic fallback catches missed wakes.
      void publishSpiceConnectRedisSignal(
        principal.userId,
        createSpiceConnectCommandSignal(principal.userId, input.targetDeviceId),
      );
    } else {
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
