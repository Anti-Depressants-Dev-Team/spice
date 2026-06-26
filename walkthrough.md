## v1.0.75
- [Spice.Marketing main] Fix layout clipping in the top navigation bar by restructuring the CSS grid and adjusting element widths.
- [Spice.Marketing main] Synchronize the "account info" state on the home screen to match `spice_cloud_user` and `spice_profiles_list` from localStorage.

## v1.0.74

- [Spice.Music main] Added a notification bell to the top bar for checking release notes and shared playlist invites.
- [Spice.Music main] Shared playlist invites now display as pending requests inside the new notification tray, allowing users to Accept or Reject them safely.
- [Spice.Music main] Update the SPICE Home screen topbar to include the new notification bell and pending invite synchronization.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.74`.

## v1.0.73



- [Spice.Music main] Optimized the `/api/remote/commands` polling endpoint to use a single SQL query, significantly reducing fluid compute consumption on Neon DB.

- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.73`.

- [Spice.Home] Refactor the Home screen to focus purely on being a service hub, removing unnecessary marketing fluff and syncing its theme tokens with Spice Music. Also added an independent local Profile tab to the Home screen.
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

# SPICE Walkthrough

## v1.0.65

- Fixed a security vulnerability where a hardcoded default string was used for JWT and profile connection secrets if environment variables were missing.
- The application now throws an error if JWT_SECRET or PROFILE_CONNECTION_SECRET is not configured properly, preventing the use of weak fallback keys.
## v1.0.65

- [Spice.Music main] Fixed N+1 query issue when fetching members and profiles of shared playlists. Replaced iterative SQL queries with bulk fetches using `inArray` for better performance.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.65`.

- [Spice.Music main] Throw an error in production if the stream HMAC secret is missing, removing the hardcoded fallback secret to prevent unauthorized stream URL generation.
- [Spice.Music main] Bump the visible diagnostics version to `Spice Media Core v1.0.65`.
- [Spice.Admin main] Added unit tests for CORS utilities (`optionsResponse` and `jsonResponse`) in `apps/backend/test/cors.test.mjs` to improve backend test coverage and reliability.
- [Spice.Admin main] Removed hardcoded fallback secrets for JWT signing and profile connections. The application will now refuse to start and throw an error if the required `JWT_SECRET` environment variable is not explicitly set, fixing a critical security vulnerability.
- [Spice.Admin main] Bump the visible diagnostics version to `Spice Media Core v1.0.65`.

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

## v1.0.29

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

## v1.0.65

- Remove unused `SearchCacheEntry` type import from `spice-app.tsx` to improve code maintainability and readability.

### Fixed Vercel Build Errors
- [Spice.Music main] Fixed a Vercel build error caused by Next.js pre-rendering pages that require `.env` variables at build time, by providing a fallback string when not in production.
* [Spice Music Backend] Optimized shared playlist snapshot generation by replacing N+1 queries with batched user profile lookups, reducing DB overhead.

## v1.0.72

- Add auto-update polling mechanism in the background that checks for new builds via a `/api/version` endpoint and automatically reloads the client when a new version is detected.
- Added `GET /api/version` endpoint which outputs the current `VERCEL_GIT_COMMIT_SHA` or `VERCEL_URL`.

## v1.0.71

- Replaced sequential database operations with `db.batch()` across all sync endpoints (`profiles`, `likes`, `history`, `playlists`) for improved performance using the `neon-http` driver.
- Fixed TypeScript errors related to `db.batch()` typing in Next.js `POST` handlers.
- Updated SPICE_MEDIA_CORE_VERSION to v1.0.71 in `spice-app.tsx`.
### v1.0.36
* [Spice.Music main] UI changes to the volume lever control now include a percentage readout, and max out at 200%. Added a Boost button to optionally enable volume boosting up to 1000% maximum.
* [Spice.Music main] Fixed the placement of the volume booster disclaimer to render in the center of the viewport.
- **Version:** 1.0.43
- **Changes:** Fixed a `QuotaExceededError` issue on `spice_profiles_list` by catching and shrinking massive track items (omitting artwork URLs and keeping only IDs/Names) before saving to local storage.
- **Affected Lane:** [Spice.Music main]

## Optimization & Containerization Update
- [Spice.Music main] Added multi-stage Dockerfile for Next.js to enable VPS deployments and set Next config output to `standalone`.
- [Spice.Music main] Optimized Vercel Fluid Compute costs on media proxy streams by introducing a 2MB chunking strategy for Range requests in the YouTube and SoundCloud APIs.
