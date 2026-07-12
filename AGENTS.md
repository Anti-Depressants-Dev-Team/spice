# Repository Guidelines

## Project overview

Spice is a unified repository for an Electron desktop client, the SPICE Next.js backend/local runtime, and an Android preview client. The root desktop app is CommonJS-based and starts from `main.js`. The root npm workspace and `package-lock.json` are authoritative for desktop and backend dependencies.

## Repository layout

- `main.js`, `preload.js`, `preload-view.js`, `index.html`, and `styles.css`: primary Electron shell and UI.
- `lyrics-core.js`, `lyrics.js`, and `lyrics.html`: lyrics fetching and lyrics-window behavior.
- `discord-rpc.js`, `scrobbler.js`, and `spice-local-runtime-manager.js`: desktop integrations and local runtime management.
- `scripts/`: desktop helpers, including in-repository native runtime preparation.
- `test/`: Node tests for root desktop logic.
- `apps/backend/`: Next.js backend plus Windows/Linux local-runtime builders and tests.
- `apps/mobile/`: native Android app and npm command wrappers.
- `native-runtime/`: generated prepared runtime content; do not assume it is checked in or current.
- `src/extensions/`: bundled browser-extension assets; keep changes narrow and intentional.

## Commands

Run commands from the repository root unless noted.

### Unified install

- `npm ci`: install the desktop and backend workspace from the root lockfile.
- `npm install`: use only when intentionally updating dependencies and `package-lock.json`.

Do not add pnpm workspace files or a separate backend lockfile.

### Desktop

- `npm start`: run the standard Electron app.
- `npm run start:native`: run the SPICE-only native-mode shell.
- `npm test`: run root Node tests.
- `npm run dist`: build the standard desktop package.
- `npm run dist:native`, `npm run dist:native:windows`, or `npm run dist:native:linux`: prepare the in-repo backend runtime once and build the native package.

### Backend

- `npm run backend:dev`: run the backend in local development mode.
- `npm run backend:test`: run backend tests.
- `npm run backend:typecheck`: run TypeScript checks.
- `npm run backend:lint`: run ESLint.
- `npm run backend:build:local`: build the local runtime.
- `npm run backend:build:vercel`: build the Vercel runtime.
- `npm run backend:package:local:windows` or `npm run backend:package:local:linux`: assemble a platform runtime under `apps/backend/dist/`.

### Mobile

- `npm run mobile:test`: run the Android check pipeline through `apps/mobile`.
- `npm run mobile:build` or `npm run mobile:android:debug`: build a debug APK.
- `npm run mobile:android:check`: run Android lint, JVM tests, and debug APK assembly.
- `npm run mobile:android:release`: build the release APK path.

## Development notes

- Preserve CommonJS style in root desktop code and the existing TypeScript/ES module style in `apps/backend`.
- Keep desktop, backend, and mobile changes scoped separately when practical.
- Treat existing uncommitted changes as user work. Do not revert or reformat unrelated files.
- Do not commit generated logs, debug dumps, build output, `.next`, `dist`, APKs, or prepared `native-runtime` content.
- Prefer small tests near changed behavior. Desktop tests use Node's built-in test runner.
- The Vercel project root is `apps/backend` within this repository.

## Native runtime notes

- Native preparation uses `apps/backend` in this repository by default.
- `SPICE_BACKEND_REPO` may point to an intentional external checkout for testing.
- If that checkout is unavailable, preparation falls back to platform assets on the dedicated `spice-local-runtime` release.
- `dist:native:*` already performs runtime preparation; do not add a second explicit preparation step in packaging workflows.

## Mobile notes

- The mobile app expects JDK 21 and Android SDK compile SDK 36.
- The debug APK is emitted under `apps/mobile/android/app/build/outputs/apk/debug/`.
- Native background playback depends on direct HTTPS audio URLs. Do not add WebView or iframe playback paths without confirming product direction.

## Verification

- Desktop logic: `npm test`.
- Backend logic: `npm run backend:test`, `npm run backend:typecheck`, and `npm run backend:lint`.
- Backend runtime changes: also run `npm run backend:build:local` and `npm run backend:build:vercel`.
- Electron behavior: smoke-test with `npm start` when practical.
- Native packaging/runtime: run `npm run start:native` or the relevant `npm run dist:native:*` path.
- Mobile changes: run `npm run mobile:android:check`.

## Migration note

The former separate SPICE backend repository now lives at `apps/backend`. Do not restore the legacy sibling-checkout assumption or copy backend sources between repositories. The root npm workspace, CI, native runtime preparation, and release workflows must continue to operate from this single repository.
