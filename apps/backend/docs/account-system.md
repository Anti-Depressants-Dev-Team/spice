# Account System

SPICE accounts now have an account-level role and a subscription snapshot. Playlist collaboration roles still live on playlist membership records and should not be reused for account authorization.

## Account Roles

The `users.account_role` column is the source of truth.

| Value | Meaning |
| --- | --- |
| `user` | Standard account. This is the default for every signup. |
| `admin` | Trusted operator account for future admin-only tools and maintenance endpoints. |

Use the helpers in `lib/account.ts` instead of comparing raw strings in route handlers:

```ts
import { isAdminAccount } from '@/lib/account';
import { getAccountSnapshotForSession } from '@/lib/accounts';
import { verifySession } from '@/lib/auth';

const session = await verifySession(token);
const account = await getAccountSnapshotForSession(session);

if (!account || !isAdminAccount(account)) {
  return jsonResponse({ error: 'admin_required' }, { status: 403 });
}
```

For new admin-only endpoints, prefer `requireAdminAccount(session)` from `lib/accounts.ts`. It reloads the current database role, so authorization is not based only on a JWT claim that may be stale.

## Admin Bootstrap

New signups are created as `user` unless their normalized email appears in `SPICE_ADMIN_EMAILS`.

```env
SPICE_ADMIN_EMAILS=owner@example.com,ops@example.com
```

That environment variable only affects account creation. Promote or demote existing accounts with SQL:

```sql
update users
set account_role = 'admin'
where email = 'owner@example.com';

update users
set account_role = 'user'
where email = 'owner@example.com';
```

## Auth Response Contract

`POST /api/cloud/auth/spice/signup`, `POST /api/cloud/auth/spice/signin`, and `GET /api/cloud/account/me` return an account snapshot as both `user` and `account` for backward compatibility. The auth endpoints also return a `token`; `GET /api/cloud/account/me` does not issue a new token.

```json
{
  "token": "jwt",
  "user": {
    "id": "uuid",
    "email": "person@example.com",
    "accountRole": "user",
    "isAdmin": false,
    "subscription": {
      "tier": "free",
      "status": "inactive",
      "provider": null,
      "currentPeriodEnd": null,
      "cancelAtPeriodEnd": false,
      "isActive": false
    }
  },
  "account": {
    "id": "uuid",
    "email": "person@example.com",
    "accountRole": "user",
    "isAdmin": false,
    "subscription": {
      "tier": "free",
      "status": "inactive",
      "provider": null,
      "currentPeriodEnd": null,
      "cancelAtPeriodEnd": false,
      "isActive": false
    }
  }
}
```

JWTs also include `accountRole` for UI hints. Protected APIs should still reload the account snapshot from the database before enforcing admin access.

## Subscription Foundation

The `account_subscriptions` table is intentionally billing-provider neutral. It is ready for Stripe, Vercel Marketplace billing, or a manual entitlement system.

| Column | Purpose |
| --- | --- |
| `user_id` | One subscription snapshot per account. |
| `tier` | Plan code, defaulting to `free`. Future codes can be added without a schema change. |
| `status` | One of `inactive`, `trialing`, `active`, `past_due`, or `canceled`. |
| `provider` | Optional billing source such as `stripe`. |
| `provider_customer_id` | External customer identifier. |
| `provider_subscription_id` | External subscription identifier. |
| `current_period_start` / `current_period_end` | Billing period window. |
| `cancel_at_period_end` | Whether access should stop after the current period. |

If no subscription row exists, API helpers serialize the account as `free` and `inactive`. A subscription is considered active when its status is `active` or `trialing` and `current_period_end` is absent or in the future.

## Migration

After deploying this change, run:

```bash
npm run db:migrate --workspace @spice/backend
```

For local database prototyping without migration files, `npm run db:push --workspace @spice/backend` can also apply the schema.
