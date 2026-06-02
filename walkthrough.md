# SPICE Walkthrough

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
