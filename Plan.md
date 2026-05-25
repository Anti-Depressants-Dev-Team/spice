# Spice - Backend-First Music Source Plan

## Decision

As of May 25, 2026, Spice will validate YouTube Music through an existing
provider rather than expanding its own scraper. The initial provider is
**YouTube.js (`youtubei.js`)** inside the Next.js backend.

The first proof is a deliberately small browser app hosted by `apps/backend`:
a search bar, a results list, and a YouTube embedded player. It exercises the
search contract while direct audio playback is investigated separately.

## Goals

- Prove YouTube Music search and supported embedded playback end to end in the browser.
- Keep YouTube response parsing and stream URL resolution in one backend module.
- Retain the `MusicSource` and `sourceId` model so other providers can be
  introduced without rewriting library or queue data.
- Defer account linking and multi-source aggregation until anonymous playback
  is dependable.

## Current Spike Architecture

```text
Browser test page
  -> GET /api/yt/search?q=...
  -> select a returned video id
  -> YouTube embedded player

Next.js backend
  -> youtubei.js (YouTube Music search and exploratory format resolution)
  -> explicit PO-token-required response for direct audio proxy playback
```

### Web Test Harness

The backend home page is the first integration client. It must remain simple:

- Search YouTube Music.
- Select one returned track.
- Render YouTube's embedded player for the selected search result.
- Surface backend errors rather than concealing provider failures.

### Backend Provider

`apps/backend/lib/youtube.ts` owns the YouTube Music adapter using
`youtubei.js`. The spike now pins `youtubei.js` at `^17.0.1`; v17 requires the
backend to provide the JavaScript evaluator used to execute the stream URL
transformation extracted from YouTube's player. Routes expose Spice DTOs rather
than raw provider responses:

| Route | Purpose |
| --- | --- |
| `GET /api/yt/search?q=...&limit=...` | Returns track search results. |
| `GET /api/yt/track/[id]` | Returns track details and signed stream URLs mapped to the stream proxy. |
| `GET /api/yt/stream/[id]` | Stream proxy that forwards range requests to upstream YouTube audio with iOS User-Agent. |

During initial testing on May 25, 2026, direct anonymous media resolved via WEB clients stopped after its initial buffer (1-2 MB) with a `403` error due to YouTube's PO (Proof of Origin) token enforcement.

To resolve this, the backend stream resolver was rewritten to query mobile/alternative InnerTube clients (`IOS` → `YTMUSIC_ANDROID` → `ANDROID`) which serve pre-decoded URLs without PO token enforcement. Combined with a backend proxy that validates stream signatures, seeks via `Range` header forwarding, and mimics iOS user-agents, sustained direct audio playback is now fully verified and operational without any PO token cutoff.

## Why This Replaces the Hybrid Scraper Plan

The earlier plan started with a Dart-side custom InnerTube parser for native
platforms and a separate backend provider for web. That creates two breakage
surfaces for a private, frequently changing API before the basic product has
been proven.

The backend-first approach:

- uses an already maintained provider;
- makes browser testing immediate;
- isolates YouTube breakages to one integration;
- gives web, desktop, and Android the option of sharing one API contract.

The tradeoff is that an embed proves discovery and web playback, not access to
raw audio bytes for native clients. Raw playback now requires a deliberate
technical and product decision rather than an implicit proxy assumption.

## Provider Decisions

| Provider | Role | Decision |
| --- | --- | --- |
| `youtubei.js` | YouTube Music search and playback resolution in Node | Use first. |
| `ytmusicapi` | Rich YouTube Music metadata and library operations in Python | Revisit only for account/library work. |
| `yt-dlp` | Extraction from multiple media sites | Evaluate later for a second source or worker service. |
| Custom Dart InnerTube parsing | Native direct YouTube Music access | Do not expand during the initial proof. |

`yt-dlp` is not a direct replacement for this first backend: it introduces a
Python/runtime deployment boundary and is better considered once there is a
specific second source such as SoundCloud or Bandcamp to validate.

## Authentication Constraint

Do not assume ordinary Google OAuth will provide YouTube Music web-library
access. Current YouTube.js guidance recommends cookies for normal web client
authentication and limits OAuth2 support to its TV client path.

Therefore:

- anonymous search and playback are the MVP;
- Spice account sync is independent of YouTube account linking;
- mirrored YouTube Music likes/playlists require a separate authentication and
  product-risk spike before implementation.

## Client Strategy

The existing Dart `MusicSource` abstraction remains the app-facing boundary:

```dart
abstract interface class MusicSource {
  String get id;
  String get displayName;
  Set<SourceCapability> get capabilities;
  Future<SearchResults> search(String query, {SearchKind kind, int limit});
  Future<TrackDetails> getTrack(String trackId);
  Future<List<Track>> getPlaylist(String playlistId);
}
```

Near-term client choices:

1. Browser harness searches through the backend and plays selections with a
   YouTube embed.
2. Evaluate a PO-token integration or a different supported provider before
   connecting Flutter playback to direct audio.
3. Keep Flutter search/source contracts independent of the eventual playback
   transport.

## Delivery Phases

### Phase 0 - Browser Proof (Now)

- Minimal Next.js search and player page.
- Backend `youtubei.js@^17.0.1` search and track endpoints.
- Explicit player-script evaluator required by YouTube.js v17.
- Direct audio playback option using signed mobile client stream URLs and a proxy with `Range` header forwarding.
- YouTube embed as a fallback option.
- Verification test page supporting both direct and embedded modes.

Exit condition: a known track searches and plays back past the 2MB / 30-second mark under the direct audio proxy player without interruption, as well as via the embedded player.

### Phase 1 - Provider Hardening

- Monitor supported `youtubei.js` releases and update deliberately when the
  YouTube player contract changes.
- Add request validation, useful provider error mapping, and rate limiting.
- Decide whether to implement PO-token minting, use an official playback
  surface only, or evaluate a different media provider for raw playback.
- Add backend tests for search and blocked-stream route contract shape.

### Phase 2 - Flutter Connection

- Route Flutter web search and playback through the proven backend contract.
- Choose backend-only versus native-direct source resolution for Android,
  Windows, and Linux based on failure rate and bandwidth cost.
- Keep feature UI independent of concrete source implementations.

### Phase 3 - Local Music App Features

- Queue and playback controls.
- Drift-backed likes, playlists, and history.
- Desktop and Android playback integration.

### Phase 4 - Accounts and Sync

- Spice authentication and server-side sync for Spice-owned data.
- Separate research result and decision for YouTube Music account/library
  linkage.

### Phase 5 - Second Source

- Select one source with a concrete use case, likely SoundCloud or Bandcamp.
- Evaluate `yt-dlp` in an isolated worker-backed adapter or use a dedicated
  source library.
- Validate that `sourceId` routing and mixed library data work without feature
  rewrites.

## Verification Checklist

For the browser proof:

1. Start `apps/backend` locally.
2. Open the backend home page (http://localhost:3000).
3. Search for a known song.
4. Select "Direct audio (proxy)" and play the loaded song.
5. Confirm sustained playback continues past 30 seconds / the 2MB mark.
6. Skip forward to verify seeking works (handles range requests correctly).
7. Toggle to "YouTube embed (fallback)" to verify embedded playback also works.

For every provider change:

- Run backend typechecking and linting.
- Exercise the browser proof before connecting additional clients.
- Record any provider-specific authentication, token, or deployment
  requirement before treating it as supported.

## Known Risks

- YouTube can change InnerTube and streaming requirements without notice,
  including PO token enforcement and player-script evaluation requirements.
- Direct audio from the currently tested anonymous stream URLs is blocked by
  PO-token enforcement after an initial buffer.
- The evaluator executes transformation code extracted from YouTube's player
  inside the backend process; keep it confined to the provider boundary.
- Proxy playback consumes backend bandwidth and needs rate limiting before
  public use.
- Account-linked YouTube Music functionality may require cookies and carries
  user-account risk.
- Store distribution rules may restrict an app based on unofficial music
  playback sources.

## Out Of Scope For The First Proof

- Offline downloads.
- YouTube Music user-library mirroring.
- Multi-provider search aggregation.
- Lyrics, recommendations, and account sync.
