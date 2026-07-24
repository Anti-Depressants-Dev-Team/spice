import { sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  remoteDeviceAuthorizations,
  remoteDevices,
  remotePairingCodes,
} from '@/db/schema';
import { jsonResponse, optionsResponse } from '@/lib/cors';
import {
  createRemoteDeviceToken,
  hashPairingCode,
  hashRemoteDeviceToken,
  normalizePairingCode,
  normalizePairingDeviceInput,
  SPICE_CONNECT_DEVICE_AUTH_TTL_MS,
} from '@/lib/spice-connect-pairing';
import { reserveDurableRateLimits } from '@/lib/durable-rate-limit';
import {
  hashRateLimitRequestIp,
  hashScopedRateLimitKey,
  normalizeRateLimitValue,
  PAIRING_CLAIM_RATE_LIMIT_WINDOW_MS,
  PAIRING_CODE_ATTEMPTS_PER_WINDOW,
  PAIRING_IP_ATTEMPTS_PER_WINDOW,
} from '@/lib/rate-limit-policy';
import {
  cacheSpiceConnectPairedAuthorization,
  deleteSpiceConnectDeviceState,
} from '@/lib/spice-connect-redis';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store, max-age=0' };

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

type PairingClaimResult = {
  authorizationId: string;
  userId: string;
  issuerDeviceId: string;
};

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return jsonResponse(
      { error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured.' },
      { status: 500 },
      request,
    );
  }

  const body = await request.json().catch(() => ({}));
  const normalizedCode = normalizePairingCode(body.code);
  const codeRateValue = normalizedCode ?? normalizeRateLimitValue(body.code, 32);
  const claimQuota = await reserveDurableRateLimits({
    windowMs: PAIRING_CLAIM_RATE_LIMIT_WINDOW_MS,
    reservations: [
      {
        scope: 'remote_pair_claim_code',
        keyHash: hashScopedRateLimitKey('remote_pair_claim_code', codeRateValue),
        limit: PAIRING_CODE_ATTEMPTS_PER_WINDOW,
      },
      {
        scope: 'remote_pair_claim_ip',
        keyHash: hashRateLimitRequestIp(request, 'remote_pair_claim_ip'),
        limit: PAIRING_IP_ATTEMPTS_PER_WINDOW,
      },
    ],
  });
  if (claimQuota.limited) {
    return jsonResponse(
      { error: 'pairing_rate_limited', message: 'Too many pairing attempts. Try again later.' },
      {
        status: 429,
        headers: {
          ...noStore,
          'Retry-After': String(claimQuota.retryAfterSeconds),
        },
      },
      request,
    );
  }

  const device = normalizePairingDeviceInput(body);
  const codeHash = normalizedCode ? hashPairingCode(normalizedCode) : null;
  if (!device || !codeHash) {
    return jsonResponse(
      { error: 'invalid_pairing', message: 'The pairing code or device details are invalid.' },
      { status: 400, headers: noStore },
      request,
    );
  }

  const token = createRemoteDeviceToken();
  const tokenHash = hashRemoteDeviceToken(token);
  if (!tokenHash) {
    return jsonResponse({ error: 'pairing_failed', message: 'Could not authorize this device.' }, { status: 500 }, request);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SPICE_CONNECT_DEVICE_AUTH_TTL_MS);

  // One SQL statement keeps one-time-code consumption, credential issuance,
  // and device registration atomic. A database failure can no longer burn a
  // valid code before the caller receives a usable credential.
  const claimed = await db.execute<PairingClaimResult>(sql`
    WITH consumed_code AS (
      UPDATE ${remotePairingCodes}
      SET
        "consumed_at" = ${now},
        "consumed_by_device_id" = ${device.deviceId}
      WHERE "code_hash" = ${codeHash}
        AND "consumed_at" IS NULL
        AND "revoked_at" IS NULL
        AND "expires_at" > ${now}
        AND "issuer_device_id" <> ${device.deviceId}
      RETURNING
        "user_id" AS "userId",
        "issuer_device_id" AS "issuerDeviceId"
    ), authorized_device AS (
      INSERT INTO ${remoteDeviceAuthorizations} (
        "user_id",
        "issuer_device_id",
        "device_id",
        "display_name",
        "token_hash",
        "created_at",
        "expires_at",
        "last_used_at",
        "revoked_at"
      )
      SELECT
        "userId",
        "issuerDeviceId",
        ${device.deviceId},
        ${device.displayName},
        ${tokenHash},
        ${now},
        ${expiresAt},
        NULL,
        NULL
      FROM consumed_code
      ON CONFLICT ("user_id", "device_id") DO UPDATE SET
        "issuer_device_id" = EXCLUDED."issuer_device_id",
        "display_name" = EXCLUDED."display_name",
        "token_hash" = EXCLUDED."token_hash",
        "created_at" = EXCLUDED."created_at",
        "expires_at" = EXCLUDED."expires_at",
        "last_used_at" = NULL,
        "revoked_at" = NULL
      RETURNING
        "id" AS "authorizationId",
        "user_id" AS "userId",
        "issuer_device_id" AS "issuerDeviceId"
    ), registered_device AS (
      INSERT INTO ${remoteDevices} (
        "user_id",
        "device_id",
        "paired_authorization_hash",
        "display_name",
        "updated_at"
      )
      SELECT "userId", ${device.deviceId}, ${tokenHash}, ${device.displayName}, ${now}
      FROM authorized_device
      ON CONFLICT ("user_id", "device_id") DO UPDATE SET
        "paired_authorization_hash" = EXCLUDED."paired_authorization_hash",
        "display_name" = EXCLUDED."display_name",
        "updated_at" = EXCLUDED."updated_at"
    )
    SELECT "authorizationId", "userId", "issuerDeviceId"
    FROM authorized_device
  `);
  const authorization = claimed.rows[0];

  if (!authorization) {
    return jsonResponse(
      { error: 'invalid_pairing', message: 'The pairing code is invalid, expired, consumed, or revoked.' },
      { status: 400, headers: noStore },
      request,
    );
  }

  // Rotate the cached credential generation before the newly paired client
  // begins its heartbeat. That immediately invalidates any older Redis auth
  // cache for this user/device pair.
  void Promise.all([
    cacheSpiceConnectPairedAuthorization({
      authorizationId: authorization.authorizationId,
      userId: authorization.userId,
      deviceId: device.deviceId,
      authorizationHash: tokenHash,
      expiresAt: expiresAt.toISOString(),
    }),
    deleteSpiceConnectDeviceState(authorization.userId, device.deviceId),
  ]);

  return jsonResponse({
    authorizationId: authorization.authorizationId,
    userId: authorization.userId,
    accessToken: token,
    tokenType: 'Bearer',
    scope: 'spice_connect',
    expiresAt: expiresAt.toISOString(),
    device,
  }, { status: 201, headers: noStore }, request);
}
