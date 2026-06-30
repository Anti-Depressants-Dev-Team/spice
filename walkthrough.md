# SPICE Walkthrough

## v1.0.106

- [Spice.Music main] Preserve the real audio container when downloading shared songs so streams saved as `m4a`, `webm`, or `mp3` match the upstream content instead of forcing a misleading `.mp3` filename.
- [Spice.Music main] Add mouse-wheel volume adjustment to the main player, expanded player, mini player, and connected-device volume sliders.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.106`.

## v1.0.105

- [Spice.Music main] Accept the Last.fm popup completion message from the trusted callback origin returned by `/api/cloud/lastfm/auth` so local-runtime account linking can finish after the cloud callback redirects back from Last.fm.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.105`.

## v1.0.104

- [Spice.Music main] Strip decoded-body-unsafe upstream headers from `/api/cloud/*` proxy responses so local runtime account sign-in can relay hosted Vercel auth JSON without `incorrect header check` fetch failures.
- [Spice.Music main] Keep local media range response payload headers intact while limiting decoded-body header cleanup to cloud proxy responses.
- [Spice.Music main] Restore the actual SPICE icon in the Music sidebar brand mark by using the packaged `/icon.svg` asset instead of the temporary text-only badge.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.104`.

## v1.0.103

- [Spice.Music main] Route local-mode cloud requests through the same-origin `/api/cloud/*` namespace so login, sync, and account calls proxy through the local runtime to Vercel instead of relying on fragile browser cross-origin fetches.
- [Spice.Music main] Keep the `/api/cloud/*` proxy inside the Windows local runtime package while continuing to prune direct DB-backed cloud routes from the client-installable zip.
- [Spice.Music main] Generate a process-local stream signing secret for packaged local runtimes so playback works without asking normal users to configure `STREAM_HMAC_SECRET`.
- [Spice.Music main] Keep auth sign-in and sign-up responses CORS-aware on every success and error path so direct cloud requests return readable JSON instead of browser-level fetch failures.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.103`.

## v1.0.102

- [Spice.Home main] Copy local runtime static assets and public files into `apps/backend/.next/static` and `apps/backend/public` inside the Windows package so the standalone server can load the styled SPICE UI from localhost.
- [Spice.Home main] Add a package-time asset assertion so the local Windows release fails before upload if the standalone static asset folder is missing or empty.
- [Spice.Home main] Bump the visible diagnostics version to `Spice Media Core v1.0.102`.

## v1.0.101

- [Spice.Home main] Validate the local Windows runtime download URL before publishing the update manifest so a typo like `ttps://` falls back to the latest public GitHub release instead of breaking installers.
- [Spice.Home main] Harden the Windows local manager, install script, and portable script to recover from invalid manifest download URLs before calling `Invoke-WebRequest`.
- [Spice.Home main] Bump the visible diagnostics version to `Spice Media Core v1.0.101`.

## v1.0.100

- [Spice.Home main] Add a Desktop app button to the install page that points users to the latest `Anti-Depressants-Dev-Team/spice` release next to the local manager, scripts, ZIP, and account portal.
- [Spice.Home main] Bump the visible diagnostics version to `Spice Media Core v1.0.100`.

## v1.0.99

- [Spice.Home main] Harden the Windows local manager so manifest and localhost URLs are normalized before update checks, runtime checks, or browser launch actions run.
- [Spice.Home main] Fix hosted account sign-in resilience by routing account calls through the cloud API helper and accepting compatible account snapshot response shapes after auth.
- [Spice.Home main] Remove the hosted setup checklist and duplicate portal tab row so normal users see one clear set of local-mode actions.
- [Spice.Home main] Add compact copy buttons for the install-page PowerShell commands.
- [Spice.Home main] Document how the Electron `spice` wrapper can house the local runtime as an install/update/start manager without merging backend source into the desktop UI.
- [Spice.Home main] Bump the visible diagnostics version to `Spice Media Core v1.0.99`.

## v1.0.98

- [Spice.Home main] Clean up the hosted cloud portal so normal users see install, open-local, account, and changelog actions first while runtime maps and feature ledgers move behind a collapsed technical details section.
- [Spice.Home main] Add a lightweight `spice-local-manager.ps1` Windows manager for install, update, start, open-local, and runtime status checks without adding an Electron bundle yet.
- [Spice.Home main] Route the runtime ZIP button through `/api/downloads/local-windows` and default update metadata to the latest public GitHub release URL so the hosted download path is not dependent on a manually configured Vercel URL.
- [Spice.Home main] Add `docs/local-mode-roadmap.md` with ranked local-move candidates and expected performance tradeoffs for the current split, local manager, sync batching, Electron, and more drastic desktop-first options.
- [Spice.Home main] Bump the visible diagnostics version to `Spice Media Core v1.0.98`.

## v1.0.97

- [Spice.Music main] Fix packaged Windows local runtime launchers to start the standalone Next server from `apps/backend/server.js` instead of looking for `server.js` at the ZIP root.
- [Spice.Music main] Materialize the standalone Next/pnpm links and flatten traced runtime dependencies during Windows package creation so extracted ZIPs do not depend on symlinks back to the repo checkout.
- [Spice.Music main] Split the DB-backed proxy settings check behind a local-build stub so the local runtime middleware keeps working without bundling Neon code.
- [Spice.Music main] Let packaged launcher scripts respect an existing `PORT` or `HOSTNAME` override so local smoke tests can run away from the default `127.0.0.1:3939` port.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.97`.

## v1.0.96

- [Spice.Home main] Add hosted portal tabs for Account, Changelog, Install, and Runtime so the walkthrough changelog is reachable again from the Vercel-hosted local-mode page.
- [Spice.Home main] Add a hosted account management panel for cloud sign-in, registration, account status, subscription status, username updates, local runtime launch, changelog access, and admin dashboard entry.
- [Spice.Music main] Add public Windows install and portable PowerShell scripts, expose them from the install page, and keep the manual ZIP fallback available.
- [Spice.Music main] Add a one-command package automation script for building and packaging the local Windows runtime.
- [Spice.Home main] Remove operator-only feedback database setup details from public install and local-mode ledger copy, keeping normal-user setup focused on install, portable mode, runtime launch, and updates.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.96`.

## v1.0.95

- [Spice.Home main] Add a local-mode QoL and integrations ledger to clarify which convenience features stay local-first, opt-in, cost-gated, or removed.
- [Spice.Admin main] Surface the same QoL and integrations posture in the operations dashboard so Last.fm, ListenBrainz, Spice Connect, shared playlists, Listen Together, and Discord RPC have explicit operating rules.
- [Spice.Music main] Document that Last.fm and ListenBrainz remain opt-in profile sync integrations rather than playable search providers.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.95`.

## v1.0.94

- [Spice.Home main] Revamp the Vercel-hosted homepage into a local runtime portal that points users to install, localhost launch, runtime status, update metadata, and the cloud/local/Neon split.
- [Spice.Admin main] Revamp the admin dashboard around local-mode operations, Vercel free-tier guardrails, Neon cloud-only posture, and shelved service visibility.
- [Spice.Admin main] Add a local mode feature ledger documenting the features that moved, froze, or were replaced for the architecture split.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.94`.

## v1.0.93

- [Spice.Music main] Cache the local Windows update manifest at Vercel's edge and remove client-side no-cache headers so update checks do not create unnecessary function invocations.
- [Spice.Music main] Add a 12-hour packaged runtime update-check throttle via `SPICE_LOCAL_UPDATE_CHECK_MIN_HOURS`, keeping repeated launches from repeatedly hitting Vercel.
- [Spice.Admin main] Document low-cost Vercel/Neon operating guidance, including `pg_stat_statements` queries for diagnosing Neon egress.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.93`.

## v1.0.92

- [Spice.Music main] Added the `install.spice-app.xyz` installer surface plus `/install` preview route for local Windows runtime setup, download metadata, and update manifest access.
- [Spice.Admin main] Expanded Neon setup guidance with SQL Editor copy/paste steps for the feedback migration and Vercel-only database environment notes.
- [Shared routing] Allowlisted `https://install.spice-app.xyz` for CORS and linked the cloud portal plus update release notes to the install page.
- [Shared CI] Publish the main-branch Windows local runtime ZIP and SHA-256 file to GitHub Releases so `SPICE_LOCAL_WINDOWS_DOWNLOAD_URL` can use a stable public URL.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.92`.

## v1.0.91

- [Spice.Music main] Added a cloud-hosted local Windows update manifest at `/api/updates/local-windows` plus `/api/local/update` status checks for local installs.
- [Spice.Music main] Included startup update checks and a `check-spice-local-update.ps1 -Download` helper in the Windows local runtime package.
- [Spice.Admin main] Added Neon runtime-split setup notes for Vercel-only database credentials, feedback migration verification, and local package DB isolation.
- [Shared CI] Added SHA-256 output for the Windows local package artifact so published update manifests can advertise a verifiable ZIP.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.91`.

## v1.0.90

- [Spice.Music main] Split runtime targeting with `SPICE_RUNTIME_TARGET=local|vercel`, routing local media search, lyrics, stream extraction, and proxying through `/api/local/*` on `127.0.0.1:3939` while keeping cloud account, sync, metadata, and feedback traffic behind `/api/cloud/*`.
- [Spice.Music main] Move `spice-app.tsx` API access behind one client helper, default the local app to Search, and hide Home, Anime, Movie, and Watch navigation while leaving the shelved source history intact.
- [Spice.Admin main] Replace local feedback file writes with a serverless-safe cloud feedback path backed by Neon when configured, with log-only fallback for non-database environments.
- [Spice.Admin main] Lock CORS to SPICE domains plus localhost and 127.0.0.1, add local runtime package leak scanning, and automate local packaging plus gated Vercel deployment checks in GitHub Actions.
- [Shared CI] Let `pnpm/action-setup` read `pnpm@11.0.9` from the root package manager pin so pull request checks do not fail on duplicate pnpm version declarations.
- [Shared CI] Allow `build:local` and `build:vercel` lifecycle imports to use the existing build-only JWT dummy secret while keeping runtime `JWT_SECRET` enforcement intact.
- [Shared CI] Use `tar.exe` for the Windows local package artifact so the zipped runtime handles the packaged `node_modules` layout reliably.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.90`.

## v1.0.89

- [Spice.Music main] Fixed the profile username merging and sync issue, ensuring unique usernames are preserved correctly when profile syncs run.
- [Spice.Music main] Enabled credential sharing and fallback on profile switching to ensure local profiles stay logged in.
- [Spice.Music main] Made the bottom player bar "Listen Together" and "Device Selector" buttons interactive when logged out, displaying a friendly prompt or notice instead of being disabled.
- [Spice.Music main] Added user/listener search to the topbar quick search tray, complete with a beautiful tab switcher (Songs / Listeners).
- [Spice.Music main] Cleaned up the device button container by removing the duplicate borders and backgrounds in the player bar.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.89`.

## v1.0.88

- [Spice.Music main] Masked cloud account email in Settings panel with a toggleable show/hide eye icon to safeguard privacy.
- [Spice.Music main] Added dynamic theme-based SVG favicon generator in React that automatically updates browser tab icon with the selected accent theme.
- [Spice.Music main] Added a "Cancel" button to passcode lock screen overlay that reverts the profile switch to the last successfully unlocked profile.
- [Spice.Music main] Stopped playback completely before switching profiles (clearing active audio states).
- [Spice.Music main] Enhanced the floating mini player: expanded width to 360px, added range-based custom volume slider, added collapsible mini queue panel, and optimized lyrics wrapping.
- [Spice.Music main] Rephrased welcome greeting subtitle to remove closed-source player reference.
- [Spice.Music main] Added sidebar sliding open/close transition animations using CSS transforms and grid column transitions.
- [Spice.Music main] Reduced size of the playback device selection button inside the player bar.
- [Spice.Music main] Added individual search history query deletion and clear-all capabilities to search suggestions tray.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.88`.

## v1.0.87

- [Spice.Music main] Fixed duplicate Listen Together invites by matching on the host's active profile in the database and deduplicating session invites on the backend.
- [Spice.Music main] Locked down playback controls for Listen Together listeners, styling buttons as grayed out with a `not-allowed` cursor and disabling manual seek, play/pause, prev, next, shuffle, and repeat actions.
- [Spice.Music main] Fixed listener inactivity kick bugs by extending the host inactive threshold to 120 seconds and rewriting the listener sync loop to call playback functions via stable Refs to prevent interval restarts.
- [Spice.Music main] Cleaned up listeners leaving sessions by implementing a DELETE invite endpoint, removing them from the host's invited listeners list.
- [Spice.Music main] Bump the visible diagnostics version to `PWA v1.0.87`.

## v1.0.86

- [Spice.Music main] Fixed duplicate `@username` rendering in settings profile header by removing the duplicate fallback block under the settings account tab page.
- [Spice.Music main] Fixed duplicate Listen Together invites by deduplicating session invites and pending invites lists in JavaScript by invite ID.
- [Spice.Music main] Updated the target user invite lookup to query by `profiles.username` first to find target users when using profile-specific usernames.
- [Spice.Music main] Bump the visible diagnostics version to `PWA v1.0.86`.

## v1.0.85

- [Spice.Music main] Moved Spicer username logic from user account level to profile level, allowing independent unique spicer usernames for different local profiles under the same account.
- [Spice.Music main] Added `username` column to `profiles` table and backfilled existing default profile usernames.
- [Spice.Music main] Updated user profile details, user search, profile sync, and username endpoints to fetch and update `profiles.username` instead of `users.username`.
- [Spice.Music main] Fixed the stale double username string from localStorage profiles by saving the registered username during client auth success payload initialization.
- [Spice.Music main] Bump the visible diagnostics version to `PWA v1.0.85`.

## v1.0.84

- [Spice.Music main] Fixed duplicate `@username` rendering in settings profile header by removing legacy tag-splitting fallback code.
- [Spice.Music main] Fixed greetings banner text-clipping bug where title display could render as solid redacted blocks on theme/gradient transitions by wrapping the header in `display: inline-block` and setting correct fallback styles.
- [Spice.Music main] Fixed profile likes count sync issue on settings page by adding the active profile ID as a dependency to the likes fetch effect.
- [Spice.Music main] Restructured playlist ownership verification (`isPlaylistOwner`) to prevent users from seeing edit and action buttons when viewing other users' public playlists.
- [Spice.Music main] Fixed the description display to exclude unparsed `[object Object]` strings.
- [Spice.Music main] Bump the visible diagnostics version to `PWA v1.0.84`.

## v1.0.83

- [Spice.Music main] Removed username tag-suffixes (e.g. `#12345678`) and random numbers, transitioning Spicer usernames to clean globally unique handles.
- [Spice.Music main] Required users to choose a unique Spicer username during new account signup.
- [Spice.Music main] Integrated Spicer username updates directly into the Edit Profile settings card with backend uniqueness validation.
- [Spice.Music main] Added automatic backward-compatible migration of legacy tag usernames to display-name-based handles (e.g. replacing `#` with `_` or appending incremental `_index` suffixes on name collisions) upon account load/synchronization.
- [Spice.Music main] Updated UI header and profile views to directly render clean handles without splits, and changed Spicer invite placeholder to `e.g. @sound_lover`.
- [Spice.Music main] Updated integration test cases for suffix-free handles and legacy tag migrations.
- [Spice.Music main] Bump the visible diagnostics version to `PWA v1.0.83`.

## v1.0.82

- [Spice.Music main] Fixed stream downloads failing on main (production Vercel deployments) by bypassing the 2MB streaming chunking logic when `download=true` is requested in the YouTube and SoundCloud stream proxy endpoints.
- [Spice.Music main] Bypassed automatic fallback redirects to IP-locked YouTube URLs for downloads, ensuring stream proxying directly downloads the entire song.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.82`.


## v1.0.81

- [Spice.Music main] Fixed ESLint errors and warnings across the backend app and tests (resolved React Compiler memoization dependency mismatches, unescaped characters in JSX, unused imports/variables, and explicit `any` usages).
- [Spice.Music main] Cleaned up unused username input states and manual username save logic from `spice-app.tsx`.
- [Spice.Music main] Fixed the Listen Together active session banner displacement on the desktop layout by shifting its position from relative grid placement to a fixed glassmorphic floating bottom-right widget.
- [Spice.Music main] Moved the Listen Together trigger button in the main desktop player bar between the Share button and the progress bar timestamp.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.81`.


## v1.0.80

- [Spice.Music main] Added support for real-time collaborative listening sessions ("Listen Together") via a shareable link or direct username-tag invite (`@username#00000`).
- [Spice.Music main] Added database tables `listen_together_sessions` and `listen_together_invites` with fully integrated backend API endpoints under `/api/listen-together`.
- [Spice.Music main] Integrated the "Listen Together" action trigger button in the expanded player controls, mini-player control bar, and user profile page.
- [Spice.Music main] Added real-time Listen Together invitation lists inside the topbar notification tray with support for accepting or rejecting invitations.
- [Spice.Music main] Built a beautiful floating glassmorphic session banner to display active hosting/listening states and control session termination.
- [Spice.Music main] Created integration tests in `listen-together.test.mjs` verifying session creation, invitation routing, and playback state sync.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.80`.


## v1.0.79

- [Spice.Music main] Removed the manual unique username creation/save section from Settings since usernames are now globally handled with display names and unique tag-suffixes.
- [Spice.Music main] Renamed "Collaborator" references to "Spicer" across the shared playlists UI (panel, loading indicators, header title, invite button).
- [Spice.Music main] Updated Spicer invites to support usernames starting with `@` (e.g. `@username#000000`) by automatically stripping the leading `@` on the backend invite endpoint.
- [Spice.Music main] Fixed a major bug where public playlists and profile details failed to display on searched user profiles when the user was active on a custom profile ID (e.g. `profile_...`). Removed the hardcoded `profiles.id === 'default'` filter constraint in profile, search, invites, tracks, and shared playlist helper queries to fetch and join profile data dynamically by user ID.
- [Spice.Music main] Added integration test case `Spicer invite username leading @ strip verification`.
- [Spice.Music main] Bump the visible diagnostics version to `PWA v1.0.79`.


## v1.0.78

- [Spice.Music main] Fixed view resetting on page transitions and custom searches (sidebar brand click, empty playlist redirection, home view all button, recommendation open search, shared playlist invite login, create playlist login) to correctly clear the selected user profile overlay.
- [Spice.Music main] Fixed a test execution issue in the user search integration test suite by destructuring `ilike` from `drizzleOrm`.
- [Spice.Music main] Bump the visible diagnostics version to `PWA v1.0.78`.


## v1.0.77

- [Spice.Music main] Added ability to search for users and view their profiles and playlists.
- [Spice.Music main] Added option to set a playlist to public or private during creation or editing.
- [Spice.Music main] Added setting to make user profiles private, hiding bios, statistics, and playlists from other users.
- [Spice.Music main] Added side-by-side statistics cards for Songs Streamed, Liked Songs, and Playlists in user profiles.
- [Spice.Music main] Added a glassmorphic profile likes toggle button showing like counts in user profiles.
- [Spice.Music main] Allowed shared profile display names, removing display name uniqueness constraints.
- [Spice.Music main] Added auto-generation of unique tag-suffix usernames (e.g. name#12345678) derived from the profile display name (converting spaces to underscores) instead of email prefixes.
- [Spice.Music main] Added automatic backfilling of unique tag-suffix usernames for older accounts that do not have one set, executed dynamically during account snapshot queries.
- [Spice.Music main] Styled the username with a fainted, semi-transparent tag suffix in settings and profile details views.
- [Spice.Music main] Created and updated integration tests in `users.test.mjs` to verify profile display name sharing, privacy controls, liking mechanics, older account username backfilling, and unique username tag-suffix generation.
- [Spice.Music main] Bump the visible diagnostics version to `PWA v1.0.77`.

- [Spice.Music main] Added an Emergency Switch to the Admin Dashboard for operators to activate emergency austerity mode and emergency stop globally across all services, targeting all Vercel fluid compute and most neon database sync.
- [Spice.Music main] Designed `systemSettings` table in PostgreSQL to handle operations and state for global emergency halting and throttling.
- [Spice.Music main] Created Next.js `proxy.ts` Edge Middleware to conditionally halt API requests using `503 Service Unavailable` or drop them via `429 Too Many Requests` at various configurable rates based on system settings.

## v1.0.76

- [Spice.Music main] Fixed a Vercel build failure caused by an implicit `any` type error on the `device` parameter within the remote devices mapping logic in `spice-app.tsx`.
- [Spice.Music main] Bump the visible diagnostics version to `v1.0.76`.

- [Spice.Music main] Fixed volume booster to have an explicit BOOST toggle button and an exact percentage UI, capped max normal volume to 200%, capped max boosted volume to 1000%, and fixed the song downloader failing to start properly when popup blockers were triggered.
- [Spice.Music main] Fixed the Profile tab in the Home screen to offer a native profile creation form when no local profile is found instead of redirecting the user to SPICE Music account setup.
- [Spice.Music main] Fixed the Release Notification dialog CSS classes in the marketing home topbar so the popup matches the layout and styling found in the main application.


## v1.0.75

- [Spice.Music main] Fixed an issue where the ListenBrainz user token input field appeared empty after a browser refresh by populating it directly from the database profile connections endpoint, avoiding any dependency on browser cookies or local storage.
- [Spice.Music main] Bump the visible diagnostics version to `PWA v1.0.75`.
- [Spice.Marketing main] Fix layout clipping in the top navigation bar by restructuring the CSS grid and adjusting element widths.
- [Spice.Marketing main] Synchronize the "account info" state on the home screen to match `spice_cloud_user` and `spice_profiles_list` from localStorage.
- [Spice.Music main] Sync notification center release updates dynamically with `walkthrough.md` content via a new `/api/notifications/release` endpoint.


## v1.0.74

- [Spice.Music main] Added a notification bell to the top bar for checking release notes and shared playlist invites.
- [Spice.Music main] Shared playlist invites now display as pending requests inside the new notification tray, allowing users to Accept or Reject them safely.
- [Spice.Music main] Update the SPICE Home screen topbar to include the new notification bell and pending invite synchronization.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.74`.


## v1.0.73

- [Spice.Music main] Optimized the `/api/remote/commands` polling endpoint to use a single SQL query, significantly reducing fluid compute consumption on Neon DB.

- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.73`.

- [Spice.Home] Refactor the Home screen to focus purely on being a service hub, removing unnecessary marketing fluff and syncing its theme tokens with Spice Music. Also added an independent local Profile tab to the Home screen.

## v1.0.72

- Add auto-update polling mechanism in the background that checks for new builds via a `/api/version` endpoint and automatically reloads the client when a new version is detected.
- Added `GET /api/version` endpoint which outputs the current `VERCEL_GIT_COMMIT_SHA` or `VERCEL_URL`.


### Optimization & Containerization Update
- [Spice.Music main] Added multi-stage Dockerfile for Next.js to enable VPS deployments and set Next config output to `standalone`.
- [Spice.Music main] Optimized Vercel Fluid Compute costs on media proxy streams by introducing a 2MB chunking strategy for Range requests in the YouTube and SoundCloud APIs.

## v1.0.71

- Replaced sequential database operations with `db.batch()` across all sync endpoints (`profiles`, `likes`, `history`, `playlists`) for improved performance using the `neon-http` driver.
- Fixed TypeScript errors related to `db.batch()` typing in Next.js `POST` handlers.
- Updated SPICE_MEDIA_CORE_VERSION to v1.0.71 in `spice-app.tsx`.
- [Spice.Music main] UI changes to the volume lever control now include a percentage readout, and max out at 200%. Added a Boost button to optionally enable volume boosting up to 1000% maximum.
- [Spice.Music main] Fixed the placement of the volume booster disclaimer to render in the center of the viewport.

## v1.0.70

- [Spice.Music main] Added a topbar notification bell to the right of the profile control, with a lower-right badge showing unread release updates plus pending shared playlist requests.
- [Spice.Music main] Added version-change notifications with a large detail dialog for reading the current Spice Media Core release notes.
- [Spice.Music main] Surfaced shared playlist collaborator requests in notifications with Accept and Reject actions, while pending requests stay out of the library until accepted.
- [Spice.Music main] Updated collaborator lists to show pending join request status instead of presenting requested users as fully active collaborators.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.70`.


## v1.0.69

- [Spice.Music main] Removed the external loader.to fallback from song downloads so the share dialog Download action stays inside SPICE.
- [Spice.Music main] Updated stream downloads to trigger the browser download manager directly with an MP3 filename by default.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.69`.


## v1.0.68

- [Spice.Music main] Fixed local profile deletion so removing an inactive profile no longer forces a switch away from the current profile, while active profile deletion switches cleanly to the next remaining profile.
- [Spice.Music main] Added a six-profile cap to local profile creation, including disabled create controls and a warning when the cap is reached.


### Added Volume Booster Feature
- [Spice.Music main] Added a volume booster feature to the player bar (up to 1000% volume via Web Audio API) with a disclaimer modal that must be accepted at least once.

- [Spice.Music main] Fixed JWT secret initialization bug that failed production builds.
- [Spice.Music main] Cleaned up unused discord-ipc imports and route handler.
- [Spice.Music main] Updated AGENTS.md with rules for asynchronous agent workflow coordination.
- [Spice.Music main] Fixed walkthrough and version string conflicts from concurrent merges.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.68`.

## v1.0.67

- [Spice.Music main] ListenBrainz user tokens are now encrypted and saved on the signed-in SPICE account instead of browser local storage, with restore on login and account-backed resolution during profile sync submissions.
- [Spice.Music main] Added `PUT /api/profile/connections` for saving or clearing the ListenBrainz token, and extended profile connection restore to include ListenBrainz alongside Last.fm.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.67`.


## v1.0.66

- [Spice] Removed Flutter client and Dart packages from the monorepo.

- [Spice.Music main] Fixed code health issue in `apps/backend/lib/lrclib.ts` by suppressing hardcoded `console.error` for expected LRCLIB lookup failures.
- [Spice.Music main] Removed the scrapped Discord Rich Presence integration, including the `/api/discord/presence` route, `discord-ipc` server helper, client playback hooks, and `DISCORD_CLIENT_ID` environment variable documentation.
- [Spice.Music main] Added a setting in the settings tab to allow users to customize their global theme color.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.66`.


## v1.0.65

- [Spice.Music main] Fixed a code health warning in `spice-app.tsx` by commenting out the unused `RecommendationSeed` import and using an inline type import at the usage site to satisfy TypeScript requirements.
- [Spice.Music main] Cleaned up unused error parameters in catch blocks and renamed an unused function to start with an underscore to appease ESLint warnings.
- [Spice.Music main] Added unit tests for hash functions `hashPassword` and `verifyPassword`.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.65`.

- Fixed a security vulnerability where a hardcoded default string was used for JWT and profile connection secrets if environment variables were missing.
- The application now throws an error if JWT_SECRET or PROFILE_CONNECTION_SECRET is not configured properly, preventing the use of weak fallback keys.
- [Spice.Music main] Fixed N+1 query issue when fetching members and profiles of shared playlists. Replaced iterative SQL queries with bulk fetches using `inArray` for better performance.
- [Spice.Music main] Throw an error in production if the stream HMAC secret is missing, removing the hardcoded fallback secret to prevent unauthorized stream URL generation.
- [Spice.Admin main] Added unit tests for CORS utilities (`optionsResponse` and `jsonResponse`) in `apps/backend/test/cors.test.mjs` to improve backend test coverage and reliability.
- [Spice.Admin main] Removed hardcoded fallback secrets for JWT signing and profile connections. The application will now refuse to start and throw an error if the required `JWT_SECRET` environment variable is not explicitly set, fixing a critical security vulnerability.
- [Spice.Admin main] Bump the visible diagnostics version to `Spice Media Core v1.0.65`.

- Remove unused `SearchCacheEntry` type import from `spice-app.tsx` to improve code maintainability and readability.


### Fixed Vercel Build Errors
- [Spice.Music main] Fixed a Vercel build error caused by Next.js pre-rendering pages that require `.env` variables at build time, by providing a fallback string when not in production.
* [Spice Music Backend] Optimized shared playlist snapshot generation by replacing N+1 queries with batched user profile lookups, reducing DB overhead.

## v1.0.64

- [Spice.Music main] Added zero-dependency Discord Rich Presence (DRP) integration, allowing the SPICE player to show track details, artists, live elapsed/remaining ticking time progress, custom logo cover assets, and a button link back to the song.
- [Spice.Music main] Added automatic Windows named-pipe and Linux/macOS Unix domain socket discovery scanner for communicating with the local Discord client from Next.js server runtime.
- [Spice.Music main] Wired state tracking hooks in `spice-app.tsx` to handle heartbeat ticks, unmount cleanups, and instant notifications on track play, pause, and seek actions.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.64 (Discord RPC)`.


## v1.0.63

- [Spice.Music main] Fixed share dialog and other modals (confirmations, locks) appearing behind the expanded full-screen player by setting their z-index layer styles to stack correctly above it.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.63`.


## v1.0.62

- [Spice.Music main] Implemented a client-side download fallback that opens an external converter popup (loader.to) if the backend's direct MP3 audio stream resolution fails (e.g. because the hosting environment's IP is blocked by YouTube).
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.62`.


## v1.0.61

- [Spice.Music main] Shortened generated song share links by encoding track data into a minimal array tuple instead of a verbose JSON object. Old share links remain fully supported via backward compatibility.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.61`.


## v1.0.60

- [Spice.Music main] Enabled downloading any provider stream as an MP3 file directly from the share dialog. The download button is no longer restricted to direct licensed audio.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.60`.


## v1.0.59

- [Spice.Music main] Added a "Pending Playlist Invites" section to Settings.
- [Spice.Music main] When inviting a user via Collaborative Username, they are now sent a pending invite instead of being instantly added.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.59`.


## v1.0.58

- [Spice.Music main] Display an informative "Song already in playlist." notice instead of a success notice when adding a song that is already present in the target playlist.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.58`.


## v1.0.57

- [Spice.Music main] Dismiss the oldest active notice automatically when a 3rd notice occurs to prevent UI clutter.
- [Spice.Music main] Add mobile-responsive support so notices pile up from the bottom above the playback controls on mobile devices.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.57`.


## v1.0.56

- [Spice.Music main] Add song share buttons across search results, playlists, liked songs, history, the topbar search tray, and all now-playing player surfaces.
- [Spice.Music main] Add share-song links that open the selected track in SPICE Music through a `song` launch parameter.
- [Spice.Music main] Add a share sheet with copy-link, source-open, and safe direct-audio download actions; provider streams remain share/source-only unless the track already exposes a direct audio file URL.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.56`.


## v1.0.55

- [Spice.Music main] Replace native browser alerts and confirmations with themed in-app Spice notices and confirmation dialogs that use the active accent color variables.
- [Spice.Music main] Retheme playlist share/status notifications so they match the selected Spice accent theme instead of using fixed purple styling.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.55`.


## v1.0.54

- [Spice.Music main] Fix multi-profile account isolation so each local profile restores its own SPICE account token, account snapshot, and collaborative username when switching profiles instead of falling back to or overwriting another profile's session.
- [Spice.Music main] Guard profile cloud sync and username fetches against profile-switch races so late network responses update only the profile they started from and cannot erase another saved profile account.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.54`.


## v1.0.53

- [Spice.Music main] Fix duplicate key value unique constraint error on `playlists_pkey` during playlist synchronization by checking if the playlist UUID already exists in the database and performing an update instead of an insert.
- [Spice.Music main] Fix profile switching auto-login session synchronization lag by loading the latest profile properties directly from `localStorage` within `switchProfile` to bypass React asynchronous state rendering updates.


## v1.0.52

- [Spice.Music main] Fix missing collaborators panel button on shared playlists for guest/logged-out users by checking only for playlist share status and a valid UUID, and fall back to rendering the member list from local cached metadata (`ownerDisplayName`, `members`) when `cloudToken` is not present.
- [Spice.Music main] Fix cloud account session persistence when switching profiles by ensuring that `cloudToken`, `cloudUser`, and `cloudUsername` are explicitly carried over from local profiles during cloud synchronization.
- [Spice.Admin main] Wire up the developer/admin dashboard at `/admin-dashboard` to allow managing account roles and subscription states.
- [Spice.Admin main] Create backend admin API endpoints (`/api/admin/accounts`) to securely query all registered accounts and save inline role, tier, and status changes.
- [Spice.Admin main] Add an interactive Account Governance panel on the client with dropdown selectors, loading states, success checks, and real-time database sync.
- [Spice.Admin main] Bump the application version in the diagnostics panel inside `apps/backend/app/spice-app.tsx` to align with the release.


## v1.0.51

- [Spice.Music main] Add playlist details customization: users can edit name, description, gradient accent banner presets (including matching neon red and dark purple gradients), and cover art image (by image URL or uploading local files converted to Base64).
- [Spice.Music main] Relocate the "Delete" button from the main actions bar into the customization modal, and replace the browser confirm dialog with a premium React overlay confirmation popup.
- [Spice.Music main] Add the "Crimson Moon" (neon red) and "Midnight Velvet" (dark purple) dynamic themes to Application Settings, painting highlights, buttons, and glow effects.
- [Spice.Music main] Connect the sidebar "S" logo background gradient to the active application theme dynamically instead of hardcoding the active profile's gradient.
- [Spice.Music main] Extend the database schema with a `cover_url` column on the `playlists` table, support it in synchronization, and add a `PATCH` endpoint to support remote updates on shared collaborative playlists.


## v1.0.50

- [Spice.Music main] Update the volume slider styling with a thematic linear gradient that represents the filled volume level in purple (`var(--accent-pink)`), and make the volume icon and slider thumb use the purple accent theme on hover.
- [Spice.Music main] Fix collaborator identity leakage across local profiles by storing and restoring the `cloudToken`, `cloudUser`, and `cloudUsername` fields dynamically on a per-profile basis when switching profiles.
- [Spice.Music main] Decouple the topbar quick search input query state (`topbarSearchQuery`) from the search page input query state (`searchQuery`) so that typing in one search bar does not overwrite or sync text with the other.
- [Spice.Music main] Add a "Shuffle Play" action button to the playlist actions bar, allowing users to start playing a playlist shuffled immediately.


## v1.0.49

- [Spice.Music main] Fix collaborators panel remaining open when selecting a different playlist in SPICE Music by resetting `showMembersPanel` to false whenever `selectedPlaylist` changes.
- [Spice.Music main] Fix empty shared playlist UI to display "Search and add your favorite tracks" and the "Search Tracks" button so collaborators/owners can search and add tracks directly, matching the behavior of normal playlists.


## v1.0.48

- Fix shared playlists disappearing on page refresh by returning the updated playlists list (with server-assigned UUIDs) from the `POST /api/sync/playlists` handler. This allows the client to successfully retrieve and resolve the server-assigned UUIDs when inserting new shared playlists (previously, the POST response did not return playlists, leading the client to keep non-UUID local IDs which skipped the `/api/playlists/invites` call).
- Fix `createPlaylistId` fallback in `spice-app.tsx` to generate a valid RFC 4122 version 4 UUID when `crypto.randomUUID` is unavailable (e.g., in non-secure HTTP contexts). This ensures that generated playlist IDs are valid UUIDs from the start, preventing database insertion mismatches.
- Fix collaborator list rendering by filtering out the playlist owner from the members list returned by `getPlaylistSnapshot` and `GET /api/playlists/shared/members` to prevent double-rendering in the UI.


## v1.0.47

- Fix `createSharedPlaylist` in `spice-app.tsx` to send the new playlist with `shared: false` temporarily during the initial bulk sync POST payload. This ensures that the playlist row gets created in the backend database, allowing subsequent invite link generation and collaborator invitations to locate the playlist on the server and succeed (previously, it was completely filtered out of sync and never reached the database).
- Fix `GET /api/sync/playlists` backend route to inspect both `playlistMembers` and `playlistInvites` tables to determine if a playlist is shared, preventing new shared playlists from reverting to private when synced by the owner before anyone has joined.
- Fix `sharePlaylist` in `spice-app.tsx` to mark the playlist as shared locally (`shared: true`, `shareRole: 'owner'`) once the invite link is successfully created.
- Fix backend track editing permissions in `POST /api/playlists/shared/[playlistId]/tracks` and `DELETE /api/playlists/shared/[playlistId]/tracks` to strictly block members with the `listener` role from adding or deleting tracks, aligning the database security check with the error message and client UI.
- Fix UI button visibility in `spice-app.tsx` so the "Collaborators" panel button is only displayed for shared playlists with a valid server-synced UUID, hiding it on private playlists.
- Add a new integration test file `apps/backend/test/shared-playlists.test.mjs` to verify user signup, username configuration, database collaboration queries, invite links, and role checks.


## v1.0.46

- Fix `createSharedPlaylist` to sync the new playlist to the backend and auto-generate a shareable invite link so the owner can immediately invite collaborators.
- Fix `sharePlaylist` to allow the owner of an existing shared playlist to regenerate a new invite link via a "New Invite Link" button (previously blocked for all shared playlists).
- Add `GET /api/playlists/shared/[playlistId]/tracks` route so authenticated members and owners can fetch the latest track list with attribution data.
- Add live playlist refresh on open: when a user opens a shared UUID-backed playlist the client silently fetches fresh tracks from the new GET endpoint so collaborator additions appear without a manual reload.
- Fix `normalizePlaylistSnapshot` to carry through `ownerDisplayName`, `ownerUsername`, and `members` from the server response so the collaborators panel shows correct owner info after accepting an invite.


## v1.0.45

- Add support for collaborative editing on shared playlists in SPICE Music, including database migrations and API routes.
- Add Username management in the Account panel, enabling users to claim unique usernames.
- Add playlist member/collaborator management (invite by username, list members, remove members).
- Allow collaborators with editor access to add or remove tracks in shared playlists via dedicated API routes.
- Render attribution badges on tracks in collaborative playlists and allow the creator and the track uploader to delete tracks from the playlist.


## v1.0.44

- Link the Spice Movie screening panel to VIDSrc through validated TMDB movie IDs, host-compatible watch routes, and a sandboxed full-screen player shell.
- Add a configurable `SPICE_MOVIE_PROVIDER_BASE_URL`, focused provider URL tests, and Movie-lane release documentation so provider domain changes stay isolated from the UI.


## v1.0.43

- Add a host-specific Spice Movie starter frontend for `movie.spice-app.xyz` plus a local `/movie` preview route with cinematic hero playback, continue-watching cards, premiere rows, showtimes, and original project hero artwork.
- Add Spice Movie to the public `spice-app.xyz` service hub with a direct launch card, hero action, route-map entry, and host-aware page metadata.
- Register Movie in the service changelog, admin launch-status prototype, focused changelog test, and repo service-lane guidance so future Movie work stays scoped.

- [Spice.Music main] Fixed a `QuotaExceededError` issue on `spice_profiles_list` by catching and shrinking massive track items (omitting artwork URLs and keeping only IDs/Names) before saving to local storage.

## v1.0.42

- Add the SPICE Music topbar pattern to the public Home screen at `spice-app.xyz` with integrated search, provider selection, and profile/account controls.
- Wire Home search submissions into `music.spice-app.xyz` launch intents so the Music app opens Search and runs the query with the selected provider.
- Wire Home account prompts into the existing Music account manager, including register-mode handoff and admin-dashboard access for verified admin accounts.


## v1.0.41

- Replace the native Spice Connect receiver selector in the Music player with a custom dark popover so the dropdown no longer falls back to the browser's blue menu styling.
- Add clearer selected-device, local playback, remote status, and last-seen labels inside the player receiver picker.
- Tune the receiver picker layout for the compact bar, expanded player, and mini-player variants.


## v1.0.40

- Add a root `AGENTS.md` with repo-wide agent basics, walkthrough/versioning requirements, and service-lane worktree rules.
- Document the `Spice.Home`, `Spice.Music`, `Spice.Admin`, and `Spice.Anime` scope boundaries so future work stays in the matching host or feature lane.
- Define the naming pattern for future `Spice.<Service> main`, numbered sections, and named minor branches such as `Spice.Music Algorithm`.


## v1.0.39

- Remove the YouTube video player button from the compact, expanded, and mini player controls while keeping hidden embed fallback available for playback recovery.
- Add an unfolding topbar search tray with playable song results, local-cache status, and previous search query chips.
- Keep topbar searches on the current page instead of forcing navigation to the full Search tab.


## v1.0.38

- Add a hideable SPICE Music sidebar with a floating restore control for desktop and tablet layouts.
- Add Settings toggles for showing or hiding the Search and Profile tabs in the sidebar.
- Keep topbar search and profile access available even when their sidebar tabs are disabled.


## v1.0.37

- Split `/changelog` into service-specific release histories for SPICE Home, Music, Anime, Connect, and Accounts.
- Add account-dependent changelog loading so normal users keep the public service history while admin accounts unlock Admin Ops entries.
- Add `/api/changelog` and focused tests for user/admin changelog payload filtering.
- Add a sticky SPICE Music topbar with global search beside the provider chip and profile/account button.


## v1.0.36

- Add account-level roles with `user` and `admin` support, admin bootstrap via `SPICE_ADMIN_EMAILS`, and role-aware auth/session responses.
- Add a future-ready `account_subscriptions` table and account snapshot helpers that expose free/inactive defaults until billing is connected.
- Add `/api/account/me`, backend account-system documentation, and helper tests for role and subscription normalization.


## v1.0.35

- Add a host-specific Spice Anime starter frontend for `anime.spice-app.xyz` plus a local `/anime` preview route with featured playback, continue-watching cards, trending rows, release schedule, and original generated hero artwork.
- Add Spice Anime to the public `spice-app.xyz` service hub with a direct launch card and route-map entry.
- Return host-aware page metadata so the Anime, Music, and root service surfaces describe themselves correctly.


## v1.0.34

- Restore document scrolling on the public `spice-app.xyz` home and `/changelog` pages by removing the global body scroll lock.
- Recover stuck YouTube playback by migrating persisted `embed` transport back to the direct proxy path on load.
- Retry blocked YouTube embeds through the direct proxy and retry direct audio failures through the embed before self-healing skip logic runs.


## v1.0.33

- Add a public `/changelog` page for `spice-app.xyz/changelog`.
- Generate changelog entries from `walkthrough.md` so the public release history updates with the existing version notes.
- Link the changelog from the SPICE home navigation.


## v1.0.32

- Reduce Spice Connect command polling latency while preventing overlapping receiver polls.
- Expire stale pending Spice Connect commands so reconnecting devices do not replay old play or skip actions.
- Add receiver freshness guards and post-command sync refreshes to avoid controlling stale devices with outdated track state.


## v1.0.31

- Promote Spice Connect into the player with a receiver selector for this device or another signed-in account device.
- Route normal player controls through the selected receiver, including play/pause, previous/next, seek, volume, and track handoff.
- Add a `play_track` Spice Connect command payload so selecting a song can start it on the chosen receiver instead of only local playback.


## v1.0.30

- Split pause and resume into explicit player control paths so pausing a loading or fallback stream cannot restart the current track.
- Add a playback intent guard for pending stream requests, preventing late audio/embed resolutions from auto-playing after the user has paused.
- Tighten Spice Connect command polling and add a Player Bar Density setting with a slimmer now-playing bar option.


## v1.0.29

- Add backend tests for Last.fm request signing, scrobble timestamp validation, and account-backed Last.fm session fallback.
- Add Spice Connect tests for device-state normalization, command validation, and resilient remote payload parsing.
- Extract small profile-listen and Spice Connect helper modules so API route behavior is covered without mocking the full Next.js runtime.

- [Spice.Music main] Throw an error in production if the stream HMAC secret is missing, removing the hardcoded fallback secret to prevent unauthorized stream URL generation.


## v1.0.28

- Add a private on-device recommendation profile that scores artists and language hints from local history, likes, and playlists.
- Populate Home with a personalized recommendation row and Search with suggested picks when the query is empty.
- Keep recommendation inputs local; only coarse source searches such as artist or language seeds are sent through existing search endpoints.


## v1.0.27

- Rename the account-backed remote-control feature to Spice Connect across Settings, status messages, diagnostics logs, API fallback messages, and public service copy.
- Keep the internal `/api/remote/*` endpoints and database table names stable while presenting the feature as a branded cross-device control layer.
- Update default connected-device names and Settings copy so users understand Spice Connect requires the same SPICE account on both devices.


## v1.0.26

- Polish the phone layout with a compact home greeting card, cleaner content scrolling, tighter carousel cards, and safer bottom spacing.
- Rework mobile Quick Picks into readable full-width rows and replace flat loading blocks with structured shimmer skeleton cards.
- Refine the mobile now-playing bar and bottom navigation into rounded, touch-friendly controls that keep the active content visible.


## v1.0.25

- Rework `spice-app.xyz` from a single SPICE Music ad into a root service home screen for the wider SPICE ecosystem.
- Keep `music.spice-app.xyz` as the active Music service entry while adding planned launcher cards for Rooms, Recap, and Cloud.
- Update the apex landing route map to explain the root home screen, the live music subdomain, and the future `*.spice-app.xyz` service structure.


## v1.0.24

- Improve phone layouts with safer viewport sizing, fixed mobile Library navigation, tighter cards/lists, stacked settings forms, bottom safe-area spacing, and bounded mini/expanded players.
- Add account-backed Spice Connect tables for signed-in device state and queued playback commands.
- Add `/api/remote/devices` and `/api/remote/commands` so devices on the same SPICE account can discover each other and send play/pause/next/previous/seek/volume commands.
- Add a Settings Spice Connect panel for naming this device, enabling/disabling cross-device access, selecting another account device, and sending transport/volume controls.


## v1.0.23

- Add account-backed shared playlist invites with database tables for invite links and accepted playlist memberships.
- Add playlist invite APIs for creating owner-only share links, previewing invites, accepting shared playlists, and leaving shared playlists.
- Update cloud playlist sync so owned playlists continue to save normally while accepted shared playlists are pulled into the library as read-only items and protected from overwrite.
- Add UI support for sharing owned playlists, accepting invite links, showing shared badges, and hiding edit/remove controls on shared playlists.


## v1.0.22

- Persist signed-in Last.fm links to the backend account through the existing `oauth_links` table, storing the Last.fm username and an encrypted session key for restore after browser storage loss.
- Add a short-lived signed Last.fm callback state so the popup callback can safely associate the approved Last.fm session with the SPICE account.
- Restore account-backed Last.fm connections after sign-in/reload and allow profile listen writes to resolve the saved server-side Last.fm session when the browser has no local session key.


## v1.0.21

- Split the root page by request host so `spice-app.xyz` and `www.spice-app.xyz` render a standalone marketing landing page while `music.spice-app.xyz`, localhost, and preview hosts keep serving the full SPICE music app.
- Add a high-impact SPICE landing page with service CTAs, SVG branding, feature callouts, and a clear handoff to `music.spice-app.xyz`.
- Document the domain split as the public site structure: apex domain for the ad/home page, music subdomain for the player service.


## v1.0.20

- Replace the Settings Last.fm API-key, shared-secret, session-key, and manual-complete controls with one `Set up Last.fm` button.
- Generate a web auth URL from backend `LASTFM_API_KEY` / `LASTFM_SHARED_SECRET`, include `/api/lastfm/callback` as the callback, and open it in a popup.
- Exchange Last.fm callback tokens server-side, store the approved session locally, enable profile sync automatically, and clear old browser-stored Last.fm API credentials.


## v1.0.19

- Add `/api/lastfm/callback` so Last.fm's configured callback URL resolves locally, captures returned auth tokens into browser storage, and sends the user back to SPICE.
- Document the local Last.fm callback URL in Settings next to the API key/shared secret fields.
- Configure the local ignored backend `.env` with the provided Last.fm API credentials; the secret is not committed.


## v1.0.18

- Add Last.fm API key and shared-secret controls to Settings, with local storage for private/local installs and backend environment variables still available as fallback.
- Add a `Link Last.fm` Settings flow that requests a Last.fm desktop auth token, opens the Last.fm authorization page, then exchanges the approved token for a session key with `Complete Link`.
- Pass Settings-provided Last.fm credentials through profile sync so now-playing and scrobble writes no longer require editing `.env` when running locally.


## v1.0.17

- Remove Last.fm and ListenBrainz from Search and Hybrid results so search only returns playable YouTube Music, YouTube Video, and SoundCloud tracks.
- Replace the mistaken metadata-search adapters with profile update clients for Last.fm `track.updateNowPlaying` / `track.scrobble` and ListenBrainz `playing_now` / `single` submissions.
- Add `/api/profile/listens` as a server-side profile write endpoint with per-provider results, Last.fm API signing, ListenBrainz token auth, and non-blocking provider failures.
- Add Settings controls for enabling listening profile sync, storing the user's Last.fm session key and ListenBrainz token locally, and showing the latest profile-sync status while playback runs.


## v1.0.16

- Add Last.fm as a metadata discovery search provider through the official `track.search` API, gated by `LASTFM_API_KEY`.
- Add ListenBrainz-flavored metadata discovery through ListenBrainz Labs recording search, exposing MusicBrainz recording IDs as ListenBrainz-compatible matches.
- Extend Hybrid search to include YouTube Music, YouTube Videos, SoundCloud, Last.fm, and ListenBrainz batches while keeping provider-specific local search caching.
- Resolve Last.fm and ListenBrainz metadata-only results through YouTube Music before playback so the app does not send non-streaming provider IDs into YouTube or SoundCloud stream routes.


## v1.0.15

- Fix lyrics lookups by passing the active track title, artists, and duration from the UI into the YouTube and SoundCloud lyrics routes instead of relying only on provider re-fetch metadata.
- Make LRCLIB caching metadata-aware so a failed lookup from stale or dirty provider metadata does not block a later lookup with cleaner track details.
- Add persisted visual customization settings for surface style, artwork shape, motion level, and interface density, with instant CSS-variable updates and a live preview.
- Document the current TIDAL path: official catalogue search is possible with TIDAL client credentials, but full web playback must go through TIDAL's Player SDK rather than a private stream-bypass endpoint.


## v1.0.14

- Remove the June-only Pride/rainbow UI branch from the sidebar logo, docked play button, and player styling so the normal profile/accent theme stays active year-round.
- Add Hybrid search with YouTube Music, YouTube Videos, and SoundCloud result batches, plus a dedicated YouTube Videos provider mode and provider-specific badges.
- Hide SoundCloud preview-only snippets from search/playback, expose YouTube video playback through the existing iframe transport, and add video controls across docked, expanded, and mini player layouts.
- Improve LRCLIB lookups for YouTube video metadata by stripping channel suffixes and deriving `Artist - Song` search terms before matching.


## v1.0.13

- Add SoundCloud as an optional search provider with namespaced track IDs, provider-specific local search caching, neutral source badges, and progressive audio playback.
- Resolve SoundCloud's public web-client API server-side with an optional `SOUNDCLOUD_CLIENT_ID` override and a refreshable frontend-asset discovery fallback.
- Share truthful LRCLIB matching between YouTube Music and SoundCloud tracks, run direct and ranked lyrics reads in parallel, and keep SoundCloud selections out of the YouTube iframe fallback path.


## v1.0.12

- Replace the bare sidebar playlist `+` glyph with a centered compact SVG action button, neutral resting state, violet hover treatment, and an accessible label.
- Make the docked player fluid across desktop and tablet widths, preserving track metadata longer while progressively hiding secondary controls before they can overflow.


## v1.0.11

- Replace emoji-based UI decoration and text-glyph controls with a consistent inline SVG icon set across navigation, category cards, settings, status messages, lyrics, and all player layouts.
- Convert diagnostic sync marks to readable ASCII status tags and refresh the PWA service-worker cache.


## v1.0.10

- Persist complete track snapshots for Neon likes, history, and playlist items so restored library entries retain titles, artists, durations, and thumbnails.
- Scope automatic likes, history, and playlist saves to the active profile.
- Add bounded local track snapshots, saved search results, and per-profile playback save states.
- Restore the most recent cached search after reload and use exact-query cached results while the network refreshes.
- Replace generated placeholder lyrics with ranked LRCLIB matching, timeout-safe search fallback, a short server cache, real plain-lyrics fallback, and an unsynced UI state.


