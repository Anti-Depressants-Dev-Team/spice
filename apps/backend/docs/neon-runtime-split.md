# Neon Setup For The Runtime Split

SPICE local installs must not receive `DATABASE_URL`, Neon driver packages, or database migration state. Keep Neon connected only to the Vercel/cloud runtime.

For the complete feature status ledger, including what moved, froze, or was replaced for local mode, see `apps/backend/docs/local-mode-feature-ledger.md`.

## Public Install Page

Use `install.spice-app.xyz` for the public setup and download page. The app now renders the installer guide when the root route receives that host, and also exposes the same content at `/install` for previews.

Vercel domain setup:

1. Open the existing SPICE backend project in Vercel.
2. Go to **Settings -> Domains**.
3. Add `install.spice-app.xyz`.
4. Configure the DNS record Vercel asks for. For this subdomain, Vercel normally provides a CNAME target.
5. Wait until Vercel marks the domain as valid.

Do not upload secrets to the install page. The ZIP URL, SHA-256, and byte size are public artifact metadata only.

## Public ZIP URL

The GitHub Actions artifact URL is not the updater URL. Actions artifacts are for CI review and can expire or require GitHub access.

On main-branch pushes, the `SPICE local Windows package` job publishes the ZIP to a GitHub Release. Use this stable public URL in Vercel:

```text
https://github.com/Anti-Depressants-Dev-Team/spice/releases/download/spice-local-runtime/spice-local-windows.zip
```

The matching hash file is:

```text
https://github.com/Anti-Depressants-Dev-Team/spice/releases/download/spice-local-runtime/spice-local-windows.sha256
```

Set `SPICE_LOCAL_WINDOWS_DOWNLOAD_URL` to the ZIP URL. Leave `SPICE_LOCAL_WINDOWS_SHA256` and `SPICE_LOCAL_WINDOWS_SIZE_BYTES` empty unless you are also updating those values from the latest release notes or Actions summary every release; a stale SHA-256 will make the local updater reject a valid newer ZIP.

## Required Vercel Variables

- `DATABASE_URL`: Neon pooled connection string for the production branch.
- `JWT_SECRET`: account/session signing key.
- `PROFILE_CONNECTION_SECRET`: optional separate encryption key for linked provider tokens. If omitted, the app falls back to `JWT_SECRET`.
- `SPICE_INSTALL_ORIGIN`: public install page origin. Use `https://install.spice-app.xyz`.
- `SPICE_LOCAL_WINDOWS_DOWNLOAD_URL`: optional public URL for the latest local Windows ZIP.
- `SPICE_LOCAL_WINDOWS_SHA256`: optional SHA-256 for that ZIP.
- `SPICE_LOCAL_WINDOWS_SIZE_BYTES`: optional ZIP byte size.
- `SPICE_LOCAL_WINDOWS_RELEASE_NOTES_URL`: optional override. Leave empty to default update release notes to `SPICE_INSTALL_ORIGIN`.

Use a pooled Neon connection for Vercel/serverless workloads. The pooled host contains `-pooler`.

Spice Connect continues to use that pooled URL for durable command reads and writes. Its authenticated realtime wake route derives the matching direct Neon hostname only for the request-scoped PostgreSQL `LISTEN` session, because transaction-pooled connections do not preserve `LISTEN` state. If a direct listener cannot be established, desktop and Android automatically continue with bounded command polling.

## Feedback Migration In Neon SQL Editor

Apply this migration to the cloud database before relying on feedback persistence:

```sql
\i apps/backend/db/migrations/0006_spice_feedback_submissions.sql
```

That `\i` command is for local `psql`. If you are using the Neon SQL Editor, paste the SQL itself:

```sql
CREATE TABLE IF NOT EXISTS "feedback_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "email" text NOT NULL,
  "category" text NOT NULL,
  "content" text NOT NULL,
  "rating" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_submissions_user_idx" ON "feedback_submissions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_submissions_created_at_idx" ON "feedback_submissions" USING btree ("created_at");
```

SQL Editor steps:

1. Open the Neon Console.
2. Select the SPICE project.
3. Select **SQL Editor**.
4. Select the production branch and database.
5. Paste the SQL block above.
6. Click **Run**.

Then verify:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'feedback_submissions';
```

If this query returns one row, the feedback path can persist through Neon. If it returns no rows, confirm that the SQL Editor is pointed at the same branch/database used by Vercel's `DATABASE_URL`.

## Safety Checks

- Do not set `DATABASE_URL` in the local Windows package environment.
- Do not set `DATABASE_URL` in local install docs, local `.env` examples, or client-facing download metadata.
- Keep update artifact URLs public but non-secret. Use `SPICE_LOCAL_WINDOWS_SHA256` to let local installers verify downloads.
- For preview testing, use a Neon preview branch and point the Vercel preview environment at that branch's pooled connection string.
- When checking Vercel env vars, confirm the pooled Neon host contains `-pooler` for serverless traffic.

## Cost Controls

- The update manifest is cacheable at the Vercel edge for 15 minutes, with stale responses allowed while revalidation runs. Do not change it back to `no-store` unless the manifest starts carrying private data.
- The packaged Windows runtime checks for updates at most once every 12 hours by default. Set `SPICE_LOCAL_UPDATE_CHECK_MIN_HOURS` only if you need a different cadence.
- Keep media scraping, stream extraction, lyrics, and proxying on the local runtime. Vercel should only handle auth, sync, metadata, feedback, update manifests, and static install/setup pages.
- Use Neon `pg_stat_statements` when costs rise. Start with:

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT query, calls, rows AS total_rows, rows / calls AS avg_rows_per_call
FROM pg_stat_statements
WHERE calls > 0
ORDER BY rows DESC
LIMIT 10;
```

Look for high-row or high-frequency queries first. Prefer bounded result sets, selected columns, and server-side aggregation over fetching broad rows and trimming them in application code.

## References

- Neon SQL Editor: https://neon.com/docs/get-started/query-with-neon-sql-editor
- Neon connection pooling: https://neon.com/docs/connect/connection-pooling
- Neon cost optimization: https://neon.com/docs/introduction/cost-optimization
- Neon network transfer: https://neon.com/docs/introduction/network-transfer
- Vercel custom domains: https://vercel.com/docs/domains/working-with-domains/add-a-domain
