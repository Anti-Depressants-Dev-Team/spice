# Spice Mobile

Native Android preview for Spice Music, built with Jetpack Compose and Media3.

## Current Features

- Native Home, Search, Library, and Settings screens
- Standalone SoundCloud discovery and playback resolved directly on the phone
- Phone-native YouTube search and audio resolution through NewPipe Extractor
- yt-dlp download backend wrapper for explicit audio downloads
- QuickJS resolver bridge for experiments with shared JavaScript resolver logic
- Optional SPICE local media runtime fallback for local-provider coverage
- Full-length SoundCloud sources are prioritized, with automatic SoundCloud fallback when a selected YouTube direct stream is unavailable
- Room-backed local liked tracks and listening history, plus a local quality preference
- Spice account sign-in/sign-up with Android Keystore-backed session storage
- Account-aware round profile avatar that opens the profile-only sheet with cloud profile name, avatar, and listener stats
- Phone-side profile editing for display name, username, profile picture URL, bio, and privacy
- Round notifications button for invites and active download state
- Global accent color themes matching the desktop accent set
- Local playlists with manual cloud sync for playlists, liked tracks, and recent history through the hosted Spice API
- Hosted playlist invite links from Android's share sheet for account-owned playlists
- Native playlist invite acceptance for hosted `?playlistInvite=` links and account-level pending invites
- Shared playlist member management for owner invites/removal and member leave actions
- Shared playlist track editing for owner/editor add-current and permitted track removal
- Downloads library tab with completed download history, open/share/remove actions, and active download cancellation
- Compact full-player download action with progress and cancellation for explicit audio downloads
- Lyrics sheet using LRCLIB-style lookup for the current track
- Compact Spice Connect receiver menus in both players, with local/remote track, shuffle, repeat, and transport routing
- Settings Terms and Licenses tabs for native resolver and download dependencies
- Media3/ExoPlayer playback service with Android media session and notification
- Lock-screen controls, audio focus, headset/Bluetooth commands, noisy-output pause, and background playback
- Keyboard-safe player surfaces that stay above the Android IME
- Stable expanded full player sheet with seek, play/pause, like, download, lyrics, shuffle, previous/next, repeat, and stop controls
- Compact mini player with duration, receiver selection, shuffle/repeat/play controls, and a full-width seekbar above the navigation bar
- Debug-only local audio test for validating the native media stack without the network

The app intentionally does not embed the website or use its YouTube iframe fallback. Native background playback requires a direct HTTPS audio URL.

## Local-First Foundation

The Android app treats the phone as the source of truth for listener state. Track metadata, liked tracks, and recent history are persisted in a local Room database under `spice_mobile.db`, and the UI observes that database through the repository layer. The hosted Spice API remains the broker for authentication and snapshot sync, while SoundCloud and YouTube discovery/stream resolution can run directly on the device.

## Account Sync

Settings includes Spice account sign-in and account creation against `music.spice-app.xyz`. The app stores the bearer session in an Android Keystore-encrypted local blob, then merges local and cloud liked tracks/history through the existing Vercel/Neon sync endpoints:

~~~text
POST /api/auth/spice/signin
POST /api/auth/spice/signup
POST /api/auth/spice/verify-email
POST /api/auth/spice/resend-verification
GET/POST /api/sync/likes
GET/POST /api/sync/history
GET/POST /api/sync/playlists
POST /api/playlists/invites
GET/POST /api/playlists/invites/{token}
GET /api/account/invites
POST /api/account/invites/{playlistId}/accept
POST /api/account/invites/{playlistId}/reject
GET/POST/DELETE /api/playlists/shared/members
GET/POST/DELETE /api/playlists/shared/{playlistId}/tracks
~~~

Playlist sync covers Android-owned private playlists and displays shared playlist metadata from the hosted API. Share uses the existing hosted invite route, so Android syncs the local playlist first, then opens the system share sheet with the web-compatible `?playlistInvite=` link. Tapping that hosted link can open the native app, preview the playlist, and accept it into the signed-in account. Direct username invites appear in Settings under the account section. Playlist cards expose member controls for owners and joined members. Owner/editor shared playlists can add the current track through the hosted shared-track route, while the management sheet lists live shared tracks and offers removal where the backend grants permission.

## Secure Spice Connect pairing

Settings can claim the eight-character phone code created on an already signed-in Spice device:

~~~text
POST /api/remote/pairing/claim
~~~

The returned `spice_pair_...` credential is restricted to this Android device and Spice Connect remote APIs. It is stored in its own Android Keystore AES-GCM blob, separate from the cloud account JWT, and is preferred for remote-device and command requests. The app tracks the owner user ID, authorization ID, expiry, and device ID; it removes the credential locally when it expires or when the backend returns `401` after revocation. Pairing credentials expire after 30 days and do not grant account, sync, playlist, or profile access.

## Commands

Run from the repository root:

~~~powershell
npm run mobile:build
npm run mobile:test
npm run mobile:android:debug
npm run mobile:android:check
npm run mobile:android:release
npm run mobile:android:release:check
~~~

The debug APK is written to:

~~~text
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
~~~

The unsigned release APK is written to:

~~~text
apps/mobile/android/app/build/outputs/apk/release/app-release-unsigned.apk
~~~

When a release signing key is configured, Gradle writes the signed APK to:

~~~text
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
~~~

mobile:android:check runs Android lint, JVM unit tests, and a debug APK assembly.
mobile:android:release:check runs release lint, release JVM unit tests, and unsigned release APK assembly.

The tag-driven `Release Spice` GitHub Actions workflow builds the Android release APK on Ubuntu alongside the desktop release matrix, uploads it as a workflow artifact, and attaches it to the same GitHub Release as `Spice-Android-v{desktop-version}-release-{signed|unsigned}.apk`. Signed CI builds use these repository secrets when present: `SPICE_ANDROID_KEYSTORE_BASE64`, `SPICE_ANDROID_KEYSTORE_PASSWORD`, `SPICE_ANDROID_KEY_ALIAS`, and `SPICE_ANDROID_KEY_PASSWORD`.

## Prerequisites

- JDK 21
- Android SDK with compile SDK 36
- An Android 7.0 or newer device

The build script detects common Windows JDK and Android SDK locations. The Android application ID is xyz.spiceapp.mobile.

## Playback

Standalone playback now uses phone-side resolvers:

- SoundCloud direct resolver discovers SoundCloud's web client id, searches public streamable tracks, resolves available transcodings on-device, probes the resulting stream URL, and then hands it to Media3.
- YouTube direct resolver uses NewPipe Extractor on-device for YouTube search and audio-only stream resolution before the same Media3 probe/playback path. The Android downloader sends desktop YouTube headers and a consent cookie so the extractor receives the desktop `ytInitialData` shape it expects instead of the mobile search page.
- Local runtime fallback remains available for local-provider coverage and for comparison with the Windows native runtime behavior.

The optional local runtime path still uses the same namespace as the native Windows runtime:

~~~text
GET http://127.0.0.1:3939/api/local/yt/search?q={query}&limit={limit}
GET http://127.0.0.1:3939/api/local/sc/search?q={query}&limit={limit}
~~~

A track is playable only when one of these endpoints returns at least one stream Android can open:

~~~text
GET /api/local/yt/track/{trackId}
GET /api/local/sc/track/{trackId}?quality={high|standard|low}
~~~

For local development on a device or emulator, start the SPICE local runtime on the desktop and run:

~~~powershell
adb reverse tcp:3939 tcp:3939
~~~

The Android resolver accepts direct HTTPS streams plus loopback HTTP signed streams from the local runtime, then probes candidates with a range request before handing one to Media3. HLS is enabled for stream fallback, and transient source/network failures receive one automatic Media3 retry. The hosted legacy `/api/yt/*` and `/api/sc/*` routes are intentionally frozen.

YouTube direct resolution can still fail when YouTube changes its web/player internals or refuses a stream for account, region, age, or bot-check reasons. The Android client therefore keeps SoundCloud fallback and local-runtime fallback. Tracks exposed only as 30-second previews are excluded. The hosted website's YouTube iframe remains excluded because Android cannot reliably keep iframe playback alive in a foreground media service.

## Downloads And Resolver Experiments

`MediaDownloadClient` wraps `yt-dlp` for explicit user-triggered downloads. The wrapper initializes the embedded yt-dlp, FFmpeg, and aria2 runtimes, uses collision-safe output names, and downloads audio with metadata to app-local music storage. If a bundled yt-dlp build fails on YouTube, Android attempts one stable runtime refresh before retrying. The compact full-player action reports progress, allows cancellation, and stores completed download records in the Library Downloads tab for open/share/remove actions.

For direct SoundCloud/local streams, Android saves the resolved audio URL itself instead of forcing signed stream URLs back through yt-dlp. YouTube downloads still use yt-dlp with the provider page URL.

`JsResolverBridge` embeds QuickJS for resolver parity experiments. It can execute small shared JavaScript resolver snippets, but it is not a Node.js environment and does not provide network, filesystem, or npm module loading by itself. Treat it as a compatibility lab for shared parsing code, not as a drop-in replacement for the backend's `youtubei.js` runtime.

## Licensing And Terms

Settings includes Terms and Licenses tabs for the private sideload build. `TERMS.md` covers user-facing provider/download expectations, and `THIRD_PARTY_NOTICES.md` records the resolver/download source and license trail.

NewPipe Extractor and youtubedl-android are GPL-3.0-family dependencies, with FFmpeg/aria2 license obligations carried by the download modules. Anyone redistributing an APK should keep the notices with the build and provide matching app-side source availability for the GPL-covered integration.

## Release Status

Version 1.0.8 is a private sideload release target. No public store release is planned. The APK is installable and the native media stack is wired for direct SoundCloud, NewPipe-resolved YouTube, queue playback with next/previous, shuffle and repeat-all auto-advance, explicit downloads, account sync, profile stats, notifications, invite acceptance, member management, shared playlist editing, lyrics, player-integrated Spice Connect playback modes, and local-runtime fallback streams.

Remaining QA is device-side: playback, downloads, share intents, invite links, member management, shared editing, lyrics, Spice Connect command flow, and resolver stability on the target phones.
