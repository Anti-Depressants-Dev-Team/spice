# SPICE Walkthrough

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
