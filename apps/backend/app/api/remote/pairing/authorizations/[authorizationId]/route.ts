import { and, eq, isNull, lte, or } from 'drizzle-orm';

import { db } from '@/db';
import { remoteCommands, remoteDeviceAuthorizations, remoteDevices } from '@/db/schema';
import { jsonResponse, optionsResponse } from '@/lib/cors';
import { SPICE_CONNECT_MAX_COMMAND_DELIVERY_ATTEMPTS } from '@/lib/spice-connect';
import { resolveRemoteAuthorizationRevoke } from '@/lib/spice-connect-pairing';
import {
  authorizeSpiceConnectAccountRequest,
  SpiceConnectAuthorizationError,
} from '@/lib/spice-connect-authorization';
import {
  deleteSpiceConnectDeviceState,
  invalidateSpiceConnectPairedAuthorization,
  removeSpiceConnectCommandsForDevice,
} from '@/lib/spice-connect-redis';

export const runtime = 'nodejs';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ authorizationId: string }> },
) {
  let principal;
  try {
    principal = await authorizeSpiceConnectAccountRequest(request);
  } catch (error) {
    const status = error instanceof SpiceConnectAuthorizationError ? error.status : 401;
    return jsonResponse({ error: 'unauthorized', message: 'Invalid or expired credential.' }, { status }, request);
  }

  if (!process.env.DATABASE_URL) {
    return jsonResponse(
      { error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' },
      { status: 500 },
      request,
    );
  }

  const { authorizationId } = await params;
  if (!uuidPattern.test(authorizationId)) {
    return jsonResponse(
      { error: 'invalid_authorization_id', message: 'Authorization id must be a UUID.' },
      { status: 400 },
      request,
    );
  }
  const now = new Date();
  const resolution = await resolveRemoteAuthorizationRevoke({
    tryRevoke: async () => {
      const [revoked] = await db
        .update(remoteDeviceAuthorizations)
        .set({ revokedAt: now })
        .where(and(
          eq(remoteDeviceAuthorizations.id, authorizationId),
          eq(remoteDeviceAuthorizations.userId, principal.userId),
          isNull(remoteDeviceAuthorizations.revokedAt),
        ))
        .returning({
          id: remoteDeviceAuthorizations.id,
          deviceId: remoteDeviceAuthorizations.deviceId,
          tokenHash: remoteDeviceAuthorizations.tokenHash,
          revokedAt: remoteDeviceAuthorizations.revokedAt,
        });
      return revoked;
    },
    loadAuthorization: () => db.query.remoteDeviceAuthorizations.findFirst({
      columns: { id: true, deviceId: true, tokenHash: true, revokedAt: true },
      where: and(
        eq(remoteDeviceAuthorizations.id, authorizationId),
        eq(remoteDeviceAuthorizations.userId, principal.userId),
      ),
    }),
  });

  if (resolution.status === 'missing') {
    return jsonResponse(
      { error: 'authorization_not_found', message: 'Paired device authorization was not found.' },
      { status: 404 },
      request,
    );
  }
  if (resolution.status === 'conflict') {
    return jsonResponse(
      {
        error: 'authorization_changed',
        message: 'The paired authorization changed while it was being revoked. Refresh and try again.',
      },
      { status: 409, headers: { 'Cache-Control': 'no-store, max-age=0' } },
      request,
    );
  }
  const revoked = resolution.authorization;

  await db
    .update(remoteCommands)
    .set({
      consumedAt: now,
      deliveryAttempts: SPICE_CONNECT_MAX_COMMAND_DELIVERY_ATTEMPTS,
    })
    .where(and(
      eq(remoteCommands.userId, principal.userId),
      lte(remoteCommands.createdAt, now),
      or(
        eq(remoteCommands.sourceDeviceId, revoked.deviceId),
        eq(remoteCommands.targetDeviceId, revoked.deviceId),
      ),
    ));

  const revokedAt = new Date(revoked.revokedAt as Date | string);

  // The credential hash identifies the exact paired generation that wrote the
  // snapshot. A late old heartbeat or a newer re-pair cannot be confused with
  // an account-owned or newly paired device state.
  await db
    .delete(remoteDevices)
    .where(and(
      eq(remoteDevices.userId, principal.userId),
      eq(remoteDevices.deviceId, revoked.deviceId),
      eq(remoteDevices.pairedAuthorizationHash, revoked.tokenHash),
    ));

  void Promise.all([
    invalidateSpiceConnectPairedAuthorization(principal.userId, revoked.deviceId, revoked.tokenHash),
    deleteSpiceConnectDeviceState(principal.userId, revoked.deviceId),
    removeSpiceConnectCommandsForDevice(principal.userId, revoked.deviceId),
  ]);

  return jsonResponse({
    success: true,
    authorizationId: revoked.id,
    deviceId: revoked.deviceId,
    revokedAt: revokedAt.toISOString(),
    alreadyRevoked: resolution.alreadyRevoked,
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } }, request);
}
