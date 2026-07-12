# SPICE Backend

This workspace contains the unified repository's Next.js cloud backend and the standalone local web runtime. Run commands from the repository root with Node.js 24 or newer; the root `package-lock.json` is the dependency source of truth.

## Development

```bash
npm ci
npm run dev --workspace @spice/backend
```

`dev` starts the local-runtime target. Use `dev:vercel` for the hosted cloud target.

```bash
npm run dev:vercel --workspace @spice/backend
npm test --workspace @spice/backend
npm run typecheck --workspace @spice/backend
npm run lint --workspace @spice/backend
```

Database integration tests are disabled by default. Set `SPICE_TEST_DATABASE_URL` explicitly to opt in; the tests map it to `DATABASE_URL` and never load a `.env` file.

## Builds

```bash
npm run build --workspace @spice/backend
npm run build:local --workspace @spice/backend
npm run package:local:windows:full --workspace @spice/backend
npm run package:local:linux:full --workspace @spice/backend
```

The hosted build keeps account and sync APIs. The local build aliases database modules out and packages the playback/media runtime without cloud credentials.

## Reference

- [Release walkthrough](./public/WALKTHROUGH.md)
- [Account system](./docs/account-system.md)
- [Local/cloud runtime split](./docs/neon-runtime-split.md)
- [Local feature ledger](./docs/local-mode-feature-ledger.md)
